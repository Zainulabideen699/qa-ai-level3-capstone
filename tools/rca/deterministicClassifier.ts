import {
  RcaCategory,
  FailureInfo,
  FailureArtifacts,
  RcaResult,
  RcaEvidence,
} from '../../src/rca/types';
import { sanitizeUntrustedContent } from '../../src/utils/sanitizer';

interface RuleMatch {
  matched: boolean;
  ruleName: string;
  pattern?: string;
  snippet?: string;
  category: RcaCategory;
  confidence: number;
  explanation: string;
  recommendedAction: string;
  requiresHumanApproval: boolean;
}

/**
 * Deterministic, model-free Root Cause Analysis (RCA) Classifier.
 *
 * Implements the 8-category rule-matching heuristics defined in tools/rca/model_free_rca.md
 * and skills/rca/SKILL.md without requiring an AI model, API key, or network connection.
 *
 * NOTE ON DETERMINISM:
 * For identical FailureInfo inputs, the classification outcome (category, confidence,
 * ruleName, explanation, evidence, recommendedAction, requiresHumanApproval) is 100%
 * deterministic. The `timestamp` reflects execution time and will naturally vary.
 */
export class DeterministicClassifier {
  /**
   * Classify a structured test failure into exactly one of eight RCA categories.
   *
   * Evaluation strictly follows the documented priority sequence (1 to 8):
   * 1. THIRD_PARTY_DEPENDENCY (requires direct causal involvement in failure)
   * 2. ENVIRONMENT_OR_NETWORK (transport, DNS, server overload queue full, gateway errors)
   * 3. TEST_DATA_OR_STATE (data collisions, with cautious handling of bare 401/403)
   * 4. PRODUCT_DEFECT (unhandled 500 server faults; human review mandatory)
   * 5. LOCATOR_OR_UI_CHANGE (DOM structure shifts, selector timeouts)
   * 6. TIMING_OR_FLAKINESS (pointer intercepts, animation instability)
   * 7. TEST_SCRIPT_DEFECT (runtime JS/TS script errors; assertions excluded)
   * 8. UNKNOWN (ambiguous assertions and unmatched fallbacks; human triage)
   */
  public static classify(failure: FailureInfo): RcaResult {
    const errorMsg = failure.errorMessage || '';
    const stack = failure.stackTrace || '';
    const consoleText = (failure.consoleErrors || []).join('\n');
    const url = failure.requestUrl || '';
    const httpStatus = failure.httpStatus;

    // Distinguish primary failure evidence (error message and stack trace)
    // from secondary console diagnostics (background network/console logs)
    const primaryDiagnostics = `${errorMsg}\n${stack}`.trim();
    const secondaryDiagnostics = consoleText;
    const combinedDiagnostics = `${primaryDiagnostics}\n${secondaryDiagnostics}\n${url}`.trim();

    // Evaluate rules in strict priority order
    const match =
      this.checkThirdPartyDependency(failure) ||
      this.checkEnvironmentOrNetwork(primaryDiagnostics, httpStatus, secondaryDiagnostics) ||
      this.checkTestDataOrState(combinedDiagnostics, httpStatus) ||
      this.checkProductDefect(combinedDiagnostics, httpStatus) ||
      this.checkLocatorOrUiChange(primaryDiagnostics, stack) ||
      this.checkTimingOrFlakiness(primaryDiagnostics) ||
      this.checkTestScriptDefect(primaryDiagnostics) ||
      this.checkAmbiguousAssertionOrFallback(primaryDiagnostics, errorMsg);

    // Format failing line if available
    const failingLine = failure.failureLocation
      ? `${failure.failureLocation.file}:${failure.failureLocation.line || 0}`
      : undefined;

    // Sanitize all artifact paths if present
    const sanitizedArtifacts: FailureArtifacts | undefined = failure.artifactPaths
      ? {
          screenshot: failure.artifactPaths.screenshot
            ? sanitizeUntrustedContent(failure.artifactPaths.screenshot, { source: 'artifact_screenshot', maxLength: 300 })
            : undefined,
          trace: failure.artifactPaths.trace
            ? sanitizeUntrustedContent(failure.artifactPaths.trace, { source: 'artifact_trace', maxLength: 300 })
            : undefined,
          video: failure.artifactPaths.video
            ? sanitizeUntrustedContent(failure.artifactPaths.video, { source: 'artifact_video', maxLength: 300 })
            : undefined,
        }
      : undefined;

    // Sanitize all diagnostic text before embedding in evidence
    const evidence: RcaEvidence = {
      matchedRule: match.ruleName,
      matchedPattern: match.pattern,
      matchedSnippet: match.snippet
        ? sanitizeUntrustedContent(match.snippet, { source: 'matched_snippet', maxLength: 500 })
        : undefined,
      failingLine,
      failingAction: failure.failingAction
        ? sanitizeUntrustedContent(failure.failingAction, { source: 'failing_action', maxLength: 500 })
        : undefined,
      errorMessage: sanitizeUntrustedContent(errorMsg, { source: 'error_message', maxLength: 1000 }),
      stackSnippet: stack
        ? sanitizeUntrustedContent(stack.split('\n').slice(0, 5).join('\n'), { source: 'stack_snippet', maxLength: 1000 })
        : undefined,
      consoleSnippet: failure.consoleErrors && failure.consoleErrors.length > 0
        ? sanitizeUntrustedContent(failure.consoleErrors.slice(0, 3).join('\n'), { source: 'console_errors', maxLength: 1000 })
        : undefined,
      artifacts: sanitizedArtifacts,
    };

    return {
      testId: failure.testId,
      category: match.category,
      confidence: match.confidence,
      classificationSource: 'DETERMINISTIC',
      explanation: match.explanation,
      evidence,
      recommendedAction: match.recommendedAction,
      requiresHumanApproval: match.requiresHumanApproval,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Priority 1: THIRD_PARTY_DEPENDENCY ---
  // ACCURACY RULE: Must NOT trigger merely because an external domain appears in benign logs or URLs.
  // Requires evidence that the third-party dependency is directly involved in the actual failure.
  private static checkThirdPartyDependency(failure: FailureInfo): RuleMatch | null {
    const domainPattern = /google-analytics\.com|doubleclick\.net|googlesyndication|adservice|cdn-cgi|recaptcha|facebook\.net/i;
    const errorMsg = failure.errorMessage || '';
    const failingAction = failure.failingAction || '';
    const requestUrl = failure.requestUrl || '';
    const httpStatus = failure.httpStatus;

    // Check direct causal involvement:
    // 1. Error message directly references the third-party domain (e.g. resource load failure, script block)
    const errorDirectlyMentionsDomain = errorMsg.match(domainPattern);
    // 2. The failing action directly targeted a third-party frame or element
    const actionDirectlyTargetsDomain = failingAction.match(domainPattern);
    // 3. The failing request URL is an external third-party domain that failed (HTTP >= 400 or network error)
    const failedExternalRequest = requestUrl.match(domainPattern) && ((httpStatus && httpStatus >= 400) || /net::ERR_|Failed to load resource/i.test(errorMsg));
    // 4. Pointer intercept where the intercepting element specifically mentions the third-party domain
    const interceptByThirdParty = errorMsg.match(/intercepts pointer events/i) && errorMsg.match(domainPattern);

    if (errorDirectlyMentionsDomain || actionDirectlyTargetsDomain || failedExternalRequest || interceptByThirdParty) {
      const matchedSnippet = (errorDirectlyMentionsDomain || actionDirectlyTargetsDomain || interceptByThirdParty)?.[0] || requestUrl;
      return {
        matched: true,
        category: 'THIRD_PARTY_DEPENDENCY',
        ruleName: 'RULE_P1_THIRD_PARTY_DEPENDENCY',
        pattern: domainPattern.source,
        snippet: matchedSnippet,
        confidence: 0.90,
        explanation: 'Failure was directly caused by an external dependency, advertisement script, or third-party service outside the core SUT application.',
        recommendedAction: 'Verify ad-blocking routes (applyAdBlocker) or mock external dependencies in test setup.',
        requiresHumanApproval: false,
      };
    }

    return null;
  }

  // --- Priority 2: ENVIRONMENT_OR_NETWORK ---
  private static checkEnvironmentOrNetwork(
    primaryText: string,
    httpStatus?: number,
    secondaryText?: string
  ): RuleMatch | null {
    // 1. Exact AutomationExercise server overload queue full diagnostic
    const heavyLoadPattern = /This website is under heavy load \(queue full\)|This website is under heavy load/i;
    const heavyLoadMatch = primaryText.match(heavyLoadPattern) || (secondaryText && secondaryText.match(heavyLoadPattern));

    if (heavyLoadMatch) {
      return {
        matched: true,
        category: 'ENVIRONMENT_OR_NETWORK',
        ruleName: 'RULE_P2_SERVER_OVERLOAD_QUEUE_FULL',
        pattern: heavyLoadPattern.source,
        snippet: heavyLoadMatch[0],
        confidence: 0.95,
        explanation: 'SUT capacity limit reached: "This website is under heavy load (queue full)". SUT request queues or backend workers are saturated.',
        recommendedAction: 'Wait for server request queues to drain or retry execution when system load subsides.',
        requiresHumanApproval: true,
      };
    }

    const networkPattern =
      /net::ERR_CONNECTION_REFUSED|net::ERR_CONNECTION_RESET|net::ERR_NAME_NOT_RESOLVED|net::ERR_CONNECTION_TIMED_OUT|net::ERR_INTERNET_DISCONNECTED|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up|502 Bad Gateway|504 Gateway Timeout/i;

    // Check primary failure evidence first (errorMessage and stackTrace)
    const primaryMatch = primaryText.match(networkPattern);

    if (primaryMatch || httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
      return {
        matched: true,
        category: 'ENVIRONMENT_OR_NETWORK',
        ruleName: 'RULE_P2_ENVIRONMENT_OR_NETWORK',
        pattern: networkPattern.source,
        snippet: primaryMatch ? primaryMatch[0] : `HTTP ${httpStatus}`,
        confidence: 0.95,
        explanation: 'Infrastructure, network transport, DNS resolution, or SUT connectivity outage.',
        recommendedAction: 'Check host environment connectivity, DNS resolution, and target server availability before rerunning.',
        requiresHumanApproval: false,
      };
    }

    // Check secondary console diagnostics ONLY if primary failure evidence does NOT
    // indicate a distinct primary locator failure (e.g. timeout waiting for locator or strict mode violation)
    const isPrimaryLocatorFailure = /Timeout \d+ms waiting for (locator|getByRole|getByLabel|getByText|getByPlaceholder|getByTestId)|waiting for locator\(.*?\) to be (visible|attached|hidden)|strict mode violation:.*resolved to \d+ elements/i.test(primaryText);

    if (!isPrimaryLocatorFailure && secondaryText) {
      const secondaryMatch = secondaryText.match(networkPattern);
      if (secondaryMatch) {
        return {
          matched: true,
          category: 'ENVIRONMENT_OR_NETWORK',
          ruleName: 'RULE_P2_ENVIRONMENT_OR_NETWORK',
          pattern: networkPattern.source,
          snippet: secondaryMatch[0],
          confidence: 0.85,
          explanation: 'Secondary console logs indicate a network transport or DNS failure while primary error has no explicit locator failure.',
          recommendedAction: 'Investigate host network connectivity and verify whether secondary network failure caused downstream test termination.',
          requiresHumanApproval: false,
        };
      }
    }

    return null;
  }

  // --- Priority 3: TEST_DATA_OR_STATE ---
  // ACCURACY RULE: Distinguish clear test-data collisions from bare/ambiguous HTTP 401/403 errors.
  private static checkTestDataOrState(text: string, httpStatus?: number): RuleMatch | null {
    const explicitDataPattern = /Email Address already exist|User already exists|user not found|invalid credentials|token expired|session expired/i;
    const explicitMatch = text.match(explicitDataPattern);

    if (explicitMatch) {
      return {
        matched: true,
        category: 'TEST_DATA_OR_STATE',
        ruleName: 'RULE_P3_TEST_DATA_COLLISION',
        pattern: explicitDataPattern.source,
        snippet: explicitMatch[0],
        confidence: 0.85,
        explanation: 'Failure caused by dirty, duplicate, or expired test data, or invalid session authentication credentials.',
        recommendedAction: 'Ensure dynamic unique test user generation (generateUniqueUser) and verify pre-test account provisioning and cleanup.',
        requiresHumanApproval: false,
      };
    }

    // Bare HTTP 401/403 or generic unauthorized text without explicit data collision message
    const genericAuthPattern = /401 Unauthorized|403 Forbidden|Access Denied/i;
    const authMatch = text.match(genericAuthPattern);

    if (authMatch || httpStatus === 401 || httpStatus === 403) {
      return {
        matched: true,
        category: 'TEST_DATA_OR_STATE',
        ruleName: 'RULE_P3_AMBIGUOUS_AUTHORIZATION_FAILURE',
        pattern: genericAuthPattern.source,
        snippet: authMatch ? authMatch[0] : `HTTP ${httpStatus}`,
        // Cautious confidence because 401/403 could indicate permission regressions or auth service bugs
        confidence: 0.60,
        explanation: 'Request returned HTTP 401 Unauthorized or 403 Forbidden. While this often relates to expired tokens or credentials, it may also indicate an authorization regression or backend access control defect.',
        recommendedAction: 'Verify whether test credentials and tokens are valid, and confirm whether recent backend changes altered endpoint permissions.',
        // Ambiguous authorization failures MUST have human verification
        requiresHumanApproval: true,
      };
    }

    return null;
  }

  // --- Priority 4: PRODUCT_DEFECT ---
  // ACCURACY RULE: HTTP 500 is evidence of an unhandled server error, but does not conclusively prove a product defect.
  // Mandatory human verification is strictly preserved.
  private static checkProductDefect(text: string, httpStatus?: number): RuleMatch | null {
    const pattern = /500 Internal Server Error|Internal Server Error|Server Error|Payment Failed.*Server Error|HTTP 500|Fatal error:.*php/i;
    const match = text.match(pattern);

    if (match || httpStatus === 500) {
      return {
        matched: true,
        category: 'PRODUCT_DEFECT',
        ruleName: 'RULE_P4_SERVER_ERROR_EVIDENCE',
        pattern: pattern.source,
        snippet: match ? match[0] : `HTTP ${httpStatus}`,
        confidence: 0.85,
        explanation: 'System Under Test (SUT) returned an unhandled server error (HTTP 500) or internal application crash. While indicative of an unhandled backend exception, human investigation is required to determine whether this stems from an application code defect, database state, or server environment issue.',
        recommendedAction: 'Log an investigation ticket with backend server logs and network trace evidence for engineering triage.',
        // Mandatory human review required by project governance
        requiresHumanApproval: true,
      };
    }
    return null;
  }

  // --- Priority 5: LOCATOR_OR_UI_CHANGE ---
  private static checkLocatorOrUiChange(text: string, stack: string): RuleMatch | null {
    const pattern = /Timeout \d+ms waiting for (locator|getByRole|getByLabel|getByText|getByPlaceholder|getByTestId)|waiting for locator\(.*?\) to be (visible|attached|hidden)|strict mode violation:.*resolved to \d+ elements/i;
    const match = text.match(pattern) || stack.match(pattern);

    if (match) {
      return {
        matched: true,
        category: 'LOCATOR_OR_UI_CHANGE',
        ruleName: 'RULE_P5_LOCATOR_OR_UI_CHANGE',
        pattern: pattern.source,
        snippet: match[0],
        confidence: 0.85,
        explanation: 'Application DOM structure, element text, or selector query failed to resolve the target element.',
        recommendedAction: 'Inspect updated DOM on live application and refine locator in the corresponding Page Object.',
        requiresHumanApproval: false,
      };
    }
    return null;
  }

  // --- Priority 6: TIMING_OR_FLAKINESS ---
  // ACCURACY RULE: Do not classify generic timeouts as timing issues. Only pointer intercepts and animation instability.
  private static checkTimingOrFlakiness(text: string): RuleMatch | null {
    const pattern = /intercepts pointer events|element is not stable|actionability check timed out|animation in progress/i;
    const match = text.match(pattern);

    if (match) {
      return {
        matched: true,
        category: 'TIMING_OR_FLAKINESS',
        ruleName: 'RULE_P6_TIMING_OR_FLAKINESS',
        pattern: pattern.source,
        snippet: match[0],
        confidence: 0.75,
        explanation: 'Execution timing mismatch, CSS transition/animation intercept, or asynchronous rendering delay.',
        recommendedAction: 'Replace arbitrary wait with Playwright state assertions (e.g. waitFor({ state: "visible" })) or scrollIntoViewIfNeeded.',
        requiresHumanApproval: true,
      };
    }
    return null;
  }

  // --- Priority 7: TEST_SCRIPT_DEFECT ---
  // ACCURACY RULE: Matches genuine runtime JS/TS script exceptions and syntax errors only.
  // Failed assertions are NOT automatically classified as script defects.
  private static checkTestScriptDefect(text: string): RuleMatch | null {
    // 1. Invalid or malformed Playwright locator/selector syntax in test code
    const invalidSelectorPattern =
      /Unexpected token .* while parsing (?:css )?selector|Unknown engine .* while parsing selector|is not a valid (?:CSS )?selector|is not a valid XPath expression|Invalid selector:/i;
    const selectorMatch = text.match(invalidSelectorPattern);

    if (selectorMatch) {
      return {
        matched: true,
        category: 'TEST_SCRIPT_DEFECT',
        ruleName: 'RULE_P7_INVALID_SELECTOR_SYNTAX',
        pattern: invalidSelectorPattern.source,
        snippet: selectorMatch[0],
        confidence: 0.95,
        explanation:
          'Test automation script contains an invalid, malformed, or unparseable locator/selector syntax (e.g. unclosed bracket, bad pseudo-selector, unknown selector engine, or invalid XPath).',
        recommendedAction:
          'Fix selector syntax in test script or Page Object; verify locator conforms to CSS/Playwright selector grammar.',
        requiresHumanApproval: false,
      };
    }

    // 2. Unhandled runtime JavaScript/TypeScript script exceptions
    const scriptErrorPattern =
      /TypeError:|ReferenceError:|Cannot read propert.*of (undefined|null)|UnhandledPromiseRejection|SyntaxError:|is not a function/i;
    const scriptMatch = text.match(scriptErrorPattern);

    if (scriptMatch) {
      return {
        matched: true,
        category: 'TEST_SCRIPT_DEFECT',
        ruleName: 'RULE_P7_TEST_SCRIPT_RUNTIME_EXCEPTION',
        pattern: scriptErrorPattern.source,
        snippet: scriptMatch[0],
        confidence: 0.85,
        explanation:
          'Unhandled runtime JavaScript/TypeScript exception or syntax error within test automation code.',
        recommendedAction:
          'Review test script implementation, ensure proper async/await usage, and check null-safety.',
        requiresHumanApproval: false,
      };
    }

    return null;
  }

  // --- Priority 8: UNKNOWN (Ambiguous Assertion or General Fallback) ---
  // ACCURACY RULE: A failed assertion could be a product defect OR an outdated test.
  // When evidence cannot distinguish, classify as UNKNOWN with mandatory human escalation.
  private static checkAmbiguousAssertionOrFallback(text: string, errorMsg: string): RuleMatch {
    const assertionPattern = /expect\(received\)\.(toBe|toEqual|toHave|toContain)|AssertionError|expect\(.*?\)\.not\./i;
    const assertionMatch = errorMsg.match(assertionPattern) || text.match(assertionPattern);

    if (assertionMatch) {
      return {
        matched: true,
        category: 'UNKNOWN',
        ruleName: 'RULE_P8_AMBIGUOUS_ASSERTION_FAILURE',
        pattern: assertionPattern.source,
        snippet: assertionMatch[0],
        confidence: 0.50,
        explanation: 'Test assertion failed against the rendered UI or API state. Deterministic analysis cannot distinguish whether this reflects an actual application defect (PRODUCT_DEFECT) or an incorrect/outdated test expectation (TEST_SCRIPT_DEFECT). Human review is required.',
        recommendedAction: 'Compare actual application behavior against approved test specifications to determine whether to file a product defect or update test assertion logic.',
        requiresHumanApproval: true,
      };
    }

    return {
      matched: false,
      category: 'UNKNOWN',
      ruleName: 'RULE_P8_GENERAL_FALLBACK_UNKNOWN',
      pattern: 'NONE',
      snippet: text.slice(0, 150),
      confidence: 0.0,
      explanation: 'Diagnostic signatures did not match any deterministic pattern. Evidence is insufficient or ambiguous.',
      recommendedAction: 'Escalate to Human QA Engineer for manual failure triage and trace investigation.',
      requiresHumanApproval: true,
    };
  }
}
