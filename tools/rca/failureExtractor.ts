import { TestCase, TestResult } from '@playwright/test/reporter';
import { FailureInfo, FailureArtifacts, FailureLocation } from '../../src/rca/types';

/**
 * Utility to extract structured FailureInfo from Playwright test results.
 *
 * Distinguishes test source location from stack failure location,
 * isolates worker stderr as secondary diagnostics, and reliably discovers
 * screenshots, traces, and videos without inventing evidence.
 */
export class FailureExtractor {
  /**
   * Extract supported diagnostic information from a failed Playwright TestCase and TestResult.
   */
  public static extract(test: TestCase, result: TestResult): FailureInfo {
    const testId = this.extractTestId(test);

    // Primary error extraction
    const primaryError = (result.errors && result.errors.length > 0) ? result.errors[0] : result.error;
    const errorMessage = primaryError?.message || primaryError?.value || (result.status === 'timedOut' ? 'Test timed out' : 'Test failed with no explicit error message');
    const stackTrace = primaryError?.stack || undefined;

    // Failure location: extracted from stack trace (relevant failing line in test/source code)
    // Avoids assuming test.location (the declaration site) is the exact failure site.
    const failureLocation = this.extractFailureLocation(stackTrace);

    // Failing action: extracted if explicitly reported in Playwright action signature
    const failingAction = this.extractFailingAction(errorMessage);

    // Extract reliable HTTP status and request URL only when explicitly present in error text
    const { httpStatus, requestUrl } = this.extractReliableNetworkData(errorMessage);

    // Extract attachments (screenshot, trace, video)
    const artifactPaths = this.extractArtifacts(result);

    // Extract worker process stderr as secondary diagnostics (not browser console)
    const consoleErrors = this.extractWorkerStderr(result);

    return {
      testId,
      testTitle: test.title,
      errorMessage,
      stackTrace,
      failureLocation,
      failingAction,
      httpStatus,
      requestUrl,
      consoleErrors,
      artifactPaths,
    };
  }

  /**
   * Extract stable test ID from test title or convention.
   * Matches TC-AE-..., TC-VAL-..., or prefix before colon.
   */
  public static extractTestId(test: TestCase): string {
    const title = test.title || '';
    const match = title.match(/\b(TC-[A-Z0-9_-]+)\b/i);
    if (match) {
      return match[1];
    }

    const colonIndex = title.indexOf(':');
    if (colonIndex > 0) {
      const candidate = title.slice(0, colonIndex).trim();
      if (candidate.length > 0 && !candidate.includes(' ')) {
        return candidate;
      }
    }

    return test.id || 'UNKNOWN_TEST_ID';
  }

  /**
   * Extract the test definition/declaration source location from test metadata.
   */
  public static extractTestSourceLocation(test: TestCase): FailureLocation | undefined {
    if (!test.location) {
      return undefined;
    }
    return {
      file: test.location.file.replace(/\\/g, '/'),
      line: test.location.line,
      column: test.location.column,
    };
  }

  /**
   * Extract the exact failure location from the first relevant user-code stack frame.
   * Excludes internal node, playwright, and node_modules frames.
   * Handles Windows absolute paths, POSIX paths, and relative paths with line and optional column.
   * Does not invent line numbers if no user frame is extractable.
   */
  public static extractFailureLocation(stackTrace?: string): FailureLocation | undefined {
    if (!stackTrace) {
      return undefined;
    }

    const lines = stackTrace.split('\n');
    for (const line of lines) {
      // Exclude runtime internals and third-party modules
      if (
        line.includes('node_modules') ||
        line.includes('node:') ||
        line.includes('internal/') ||
        line.includes('@playwright')
      ) {
        continue;
      }

      // Match stack frame path and line number
      // Handles:
      // - at Object.<anonymous> (D:\Playwright\qa-ai-level3\tests\ui\auth.spec.ts:18:3)
      // - at D:\Playwright\qa-ai-level3\tests\ui\auth.spec.ts:18:3
      // - at tests/ui/auth.spec.ts:15:16
      // - at tests/ui/auth.spec.ts:15
      const match = line.match(/^\s*at\s+(?:async\s+)?(?:.*?\((.+?):(\d+)(?::(\d+))?\)|(.+?):(\d+)(?::(\d+))?)\s*$/);
      if (match) {
        const rawFile = (match[1] || match[4])?.trim();
        const lineStr = match[2] || match[5];
        const colStr = match[3] || match[6];

        if (rawFile && lineStr) {
          const file = rawFile.replace(/\\/g, '/');
          const lineNum = parseInt(lineStr, 10);
          const colNum = colStr ? parseInt(colStr, 10) : undefined;
          if (!isNaN(lineNum)) {
            return { file, line: lineNum, column: colNum };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Extract failing action name if explicitly stated in Playwright error
   * Matches locator.click, page.goto, expect(...), request.post, etc.
   */
  private static extractFailingAction(errorMessage: string): string | undefined {
    const actionMatch = errorMessage.match(/\b(locator(?:\([^)]*\))?\.[a-zA-Z0-9_]+|page(?:\([^)]*\))?\.[a-zA-Z0-9_]+|expect\([^)]*\)(?:\.[a-zA-Z0-9_]+)?|request(?:\([^)]*\))?\.[a-zA-Z0-9_]+)/);
    return actionMatch ? actionMatch[0] : undefined;
  }

  /**
   * Extract HTTP status and URL only when reliably present in the error message.
   * Recognizes HTTP 500, status code 404, status 503, responseCode, etc.
   * Reliably strips trailing punctuation from URLs.
   */
  private static extractReliableNetworkData(errorMessage: string): { httpStatus?: number; requestUrl?: string } {
    let httpStatus: number | undefined = undefined;
    let requestUrl: string | undefined = undefined;

    const statusMatch = errorMessage.match(/\b(?:status\s*code|status|HTTP(?:\/\d(?:\.\d)?)?|responseCode|code)\s*:?\s*(\d{3})\b/i);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      if (code >= 100 && code <= 599) {
        httpStatus = code;
      }
    }

    const urlMatch = errorMessage.match(/https?:\/\/[^\s"',<>[\]`]+/i);
    if (urlMatch) {
      requestUrl = urlMatch[0].replace(/[.,;:)]+$/, '');
    }

    return { httpStatus, requestUrl };
  }

  /**
   * Discover and copy screenshot, trace, and video paths from test attachments safely.
   */
  public static extractArtifacts(result: TestResult): FailureArtifacts | undefined {
    if (!result.attachments || result.attachments.length === 0) {
      return undefined;
    }

    const artifacts: FailureArtifacts = {};

    for (const attachment of result.attachments) {
      if (!attachment.path) continue;

      const name = (attachment.name || '').toLowerCase();
      const contentType = (attachment.contentType || '').toLowerCase();
      const path = (attachment.path || '').toLowerCase();

      if (name.includes('screenshot') || contentType.startsWith('image/') || path.endsWith('.png')) {
        if (!artifacts.screenshot) artifacts.screenshot = attachment.path;
      } else if (name.includes('trace') || path.endsWith('trace.zip')) {
        if (!artifacts.trace) artifacts.trace = attachment.path;
      } else if (name.includes('video') || contentType.startsWith('video/') || path.endsWith('.webm')) {
        if (!artifacts.video) artifacts.video = attachment.path;
      }
    }

    return Object.keys(artifacts).length > 0 ? artifacts : undefined;
  }

  /**
   * Extract worker process stderr as secondary diagnostic evidence.
   *
   * NOTE: TestResult.stderr contains worker process/Node.js stderr output,
   * NOT in-page browser console logs (which require page.on('console')).
   * Populates FailureInfo.consoleErrors for backward compatibility.
   */
  public static extractWorkerStderr(result: TestResult): string[] | undefined {
    if (!result.stderr || result.stderr.length === 0) {
      return undefined;
    }

    const output: string[] = [];
    for (const item of result.stderr) {
      const text = typeof item === 'string' ? item : item.toString('utf8');
      const trimmed = text.trim();
      if (trimmed.length > 0) {
        output.push(trimmed);
      }
    }

    return output.length > 0 ? output : undefined;
  }
}
