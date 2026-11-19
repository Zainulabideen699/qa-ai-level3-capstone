import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { FailureExtractor } from './failureExtractor';
import { DeterministicClassifier } from './deterministicClassifier';
import { FailureArtifacts, FailureLocation, FailureInfo, RcaResult } from '../../src/rca/types';

export interface FailedAttempt {
  retry: number;
  errorMessage: string;
  durationMs: number;
  timestamp: string;
  artifactPaths?: FailureArtifacts;
}

export interface ResolvedRetryInfo {
  retry: number;
  durationMs: number;
}

export interface RcaFailureRecord {
  testId: string;
  testTitle: string;
  fullTitle: string;
  testSourceLocation?: FailureLocation;
  failureLocation?: FailureLocation;
  retry: number;
  durationMs: number;
  status: string;
  finalOutcome: 'failed' | 'flaky';
  originalError: {
    message: string;
    stack?: string;
  };
  artifactPaths?: FailureArtifacts;
  rca: RcaResult;
  attempts: FailedAttempt[];
  resolvedOnRetry?: ResolvedRetryInfo;
}

export interface RcaRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  status: string;
}

export interface RcaRunReport {
  schemaVersion: string;
  executionId?: string;
  generatedAt: string;
  runSummary: RcaRunSummary;
  failures: RcaFailureRecord[];
  flaky?: RcaFailureRecord[];
}

interface TestTrackingState {
  test: TestCase;
  testId: string;
  fullTitle: string;
  testSourceLocation?: FailureLocation;
  failedAttempts: FailedAttempt[];
  lastFailureInfo?: FailureInfo;
  lastResult?: TestResult;
  hasPassed: boolean;
  hasFailed: boolean;
  isSkipped: boolean;
}

/**
 * Custom Playwright Reporter for automated failure extraction and
 * deterministic Root Cause Analysis (RCA) JSON reporting.
 *
 * Correctly distinguishes flaky passes from final failures, preserves
 * multi-attempt diagnostic histories with artifacts, and writes collision-proof
 * timestamped reports to reports/rca/.
 */
export default class RcaReporter implements Reporter {
  private startTime = 0;
  private totalTests = 0;
  private testMap = new Map<string, TestTrackingState>();

  onBegin(_config: FullConfig, suite: Suite): void {
    this.startTime = Date.now();
    this.totalTests = suite.allTests().length;
    this.testMap.clear();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testKey = test.id;
    let state = this.testMap.get(testKey);

    if (!state) {
      const fullTitle = typeof test.titlePath === 'function' ? test.titlePath().join(' > ') : test.title;
      state = {
        test,
        testId: FailureExtractor.extractTestId(test),
        fullTitle,
        testSourceLocation: FailureExtractor.extractTestSourceLocation(test),
        failedAttempts: [],
        hasPassed: false,
        hasFailed: false,
        isSkipped: false,
      };
      this.testMap.set(testKey, state);
    }

    state.lastResult = result;

    if (result.status === 'skipped') {
      state.isSkipped = true;
      return;
    }

    if (result.status === 'passed') {
      state.hasPassed = true;
      return;
    }

    // Record failure attempt (failed, timedOut, interrupted)
    if (result.status === 'failed' || result.status === 'timedOut' || result.status === 'interrupted') {
      state.hasFailed = true;
      const failureInfo = FailureExtractor.extract(test, result);
      state.lastFailureInfo = failureInfo;

      state.failedAttempts.push({
        retry: result.retry,
        errorMessage: failureInfo.errorMessage,
        durationMs: result.duration,
        timestamp: new Date().toISOString(),
        artifactPaths: failureInfo.artifactPaths,
      });
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const durationMs = Date.now() - this.startTime;

    let passedCount = 0;
    let failedCount = 0;
    let flakyCount = 0;
    let skippedCount = 0;

    const finalFailures: RcaFailureRecord[] = [];
    const flakyTests: RcaFailureRecord[] = [];

    for (const state of this.testMap.values()) {
      // 1. Passed without any failed attempts
      if (state.hasPassed && state.failedAttempts.length === 0) {
        passedCount++;
        continue;
      }

      // 2. Failed earlier attempt(s) but passed on a subsequent retry -> FLAKY
      // Must NOT be left classified as an unresolved final failure
      // Distinguish the failed attempt's duration from the successful retry's duration
      if (state.hasPassed && state.failedAttempts.length > 0) {
        flakyCount++;

        const lastFailureInfo = state.lastFailureInfo!;
        const rcaResult = DeterministicClassifier.classify(lastFailureInfo);
        const lastFailedAttempt = state.failedAttempts[state.failedAttempts.length - 1];

        flakyTests.push({
          testId: state.testId,
          testTitle: state.test.title,
          fullTitle: state.fullTitle,
          testSourceLocation: state.testSourceLocation,
          failureLocation: lastFailureInfo.failureLocation,
          retry: lastFailedAttempt.retry,
          durationMs: lastFailedAttempt.durationMs,
          status: 'flaky',
          finalOutcome: 'flaky',
          originalError: {
            message: lastFailureInfo.errorMessage,
            stack: lastFailureInfo.stackTrace,
          },
          artifactPaths: lastFailureInfo.artifactPaths,
          rca: rcaResult,
          attempts: state.failedAttempts,
          resolvedOnRetry: state.lastResult
            ? {
                retry: state.lastResult.retry,
                durationMs: state.lastResult.duration,
              }
            : undefined,
        });
        continue;
      }

      // 3. Failed all attempts (never passed) -> UNRESOLVED FINAL FAILURE
      if (!state.hasPassed && state.hasFailed) {
        failedCount++;

        const lastFailureInfo = state.lastFailureInfo!;
        const rcaResult = DeterministicClassifier.classify(lastFailureInfo);
        const lastFailedAttempt = state.failedAttempts[state.failedAttempts.length - 1];

        finalFailures.push({
          testId: state.testId,
          testTitle: state.test.title,
          fullTitle: state.fullTitle,
          testSourceLocation: state.testSourceLocation,
          failureLocation: lastFailureInfo.failureLocation,
          retry: lastFailedAttempt ? lastFailedAttempt.retry : (state.lastResult?.retry ?? 0),
          durationMs: lastFailedAttempt ? lastFailedAttempt.durationMs : (state.lastResult?.duration ?? 0),
          status: state.lastResult?.status ?? 'failed',
          finalOutcome: 'failed',
          originalError: {
            message: lastFailureInfo.errorMessage,
            stack: lastFailureInfo.stackTrace,
          },
          artifactPaths: lastFailureInfo.artifactPaths,
          rca: rcaResult,
          attempts: state.failedAttempts,
        });
        continue;
      }

      // 4. Skipped
      if (state.isSkipped) {
        skippedCount++;
      }
    }

    const runSummary: RcaRunSummary = {
      totalTests: this.totalTests,
      passed: passedCount,
      failed: failedCount,
      skipped: skippedCount,
      flaky: flakyCount,
      durationMs,
      status: result.status,
    };

    const executionId = process.env.AGENT_EXECUTION_ID || process.env.PW_EXECUTION_ID;

    const report: RcaRunReport = {
      schemaVersion: '1.0.0',
      executionId: executionId || undefined,
      generatedAt: new Date().toISOString(),
      runSummary,
      failures: finalFailures,
      flaky: flakyTests.length > 0 ? flakyTests : undefined,
    };

    // Safely write JSON report to reports/rca/ without overwriting
    try {
      const outputDir = path.resolve(process.cwd(), 'reports', 'rca');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let written = false;
      let counter = 0;

      while (!written && counter < 1000) {
        const suffix = counter === 0 ? '' : `-${counter}`;
        const filename = executionId
          ? `rca-report-${executionId}${suffix}.json`
          : `rca-report-${timestamp}${suffix}.json`;
        const filePath = path.join(outputDir, filename);

        try {
          fs.writeFileSync(filePath, JSON.stringify(report, null, 2), { encoding: 'utf8', flag: 'wx' });
          written = true;
        } catch (err: any) {
          if (err && (err.code === 'EEXIST' || err.code === 'EACCES')) {
            counter++;
            continue;
          }
          throw err;
        }
      }
    } catch (writeError) {
      console.warn('[RcaReporter] Warning: Could not write RCA JSON report to reports/rca/:', writeError);
    }
  }
}
