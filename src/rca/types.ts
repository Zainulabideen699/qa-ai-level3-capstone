/**
 * Standardized 8-category failure taxonomy for Root Cause Analysis (RCA).
 * As defined in skills/rca/SKILL.md and tools/rca/model_free_rca.md.
 */
export type RcaCategory =
  | 'PRODUCT_DEFECT'
  | 'TEST_SCRIPT_DEFECT'
  | 'LOCATOR_OR_UI_CHANGE'
  | 'TEST_DATA_OR_STATE'
  | 'ENVIRONMENT_OR_NETWORK'
  | 'TIMING_OR_FLAKINESS'
  | 'THIRD_PARTY_DEPENDENCY'
  | 'UNKNOWN';

export const ALL_RCA_CATEGORIES: readonly RcaCategory[] = [
  'PRODUCT_DEFECT',
  'TEST_SCRIPT_DEFECT',
  'LOCATOR_OR_UI_CHANGE',
  'TEST_DATA_OR_STATE',
  'ENVIRONMENT_OR_NETWORK',
  'TIMING_OR_FLAKINESS',
  'THIRD_PARTY_DEPENDENCY',
  'UNKNOWN',
] as const;

/**
 * Diagnostic failure information ingested from Playwright test runner.
 */
export interface FailureLocation {
  file: string;
  line?: number;
  column?: number;
}

export interface FailureArtifacts {
  screenshot?: string;
  trace?: string;
  video?: string;
}

export interface FailureInfo {
  testId: string;
  testTitle: string;
  errorMessage: string;
  stackTrace?: string;
  failureLocation?: FailureLocation;
  failingAction?: string;
  httpStatus?: number;
  requestUrl?: string;
  consoleErrors?: string[];
  artifactPaths?: FailureArtifacts;
}

/**
 * Concrete, sanitized evidence associated with an RCA diagnosis.
 */
export interface RcaEvidence {
  matchedRule?: string;
  matchedPattern?: string;
  matchedSnippet?: string;
  failingLine?: string;
  failingAction?: string;
  errorMessage: string;
  stackSnippet?: string;
  consoleSnippet?: string;
  artifacts?: FailureArtifacts;
  httpStatus?: number;
  targetUrl?: string;
  stackTrace?: string;
}

/**
 * Source of classification: deterministic rule engine or AI model.
 */
export type ClassificationSource = 'DETERMINISTIC' | 'AI';

/**
 * Complete structured result produced by the RCA engine.
 *
 * NOTE ON DETERMINISM:
 * For identical FailureInfo inputs, the classification (category, confidence,
 * rule, explanation, evidence, recommendedAction, requiresHumanApproval) is
 * 100% deterministic. The `timestamp` reflects the wall-clock execution time
 * and will naturally vary between separate runs.
 */
export interface RcaResult {
  testId: string;
  category: RcaCategory;
  /** Normalized confidence score strictly bounded between 0.0 and 1.0 */
  confidence: number;
  classificationSource: ClassificationSource;
  explanation: string;
  evidence: RcaEvidence;
  recommendedAction: string;
  requiresHumanApproval: boolean;
  /** ISO-8601 execution timestamp */
  timestamp: string;
}

/**
 * Summary metrics for a complete Playwright test run evaluated by the RCA reporter.
 */
export interface RcaRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  status: string;
}
