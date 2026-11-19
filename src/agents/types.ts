import {
  RcaCategory,
  RcaResult,
  RcaEvidence,
  FailureArtifacts,
} from '../rca/types';
import type { RcaRunSummary, RcaRunReport } from '../../tools/rca/rcaReporter';

/**
 * Core type definitions for the Multi-Agent Quality Engineering architecture.
 * Governs contracts between Requirement, Test Design Agent, Automation Authoring Agent,
 * Execution Orchestrator, Test Execution Runner, RCA Agent, and Human-in-the-Loop approval gates.
 */

export type TestType = 'UI' | 'API' | 'Integration';
export type TestPriority = 'High' | 'Medium' | 'Low';
export type AutomationFeasibility = 'Automated' | 'ManualReview' | 'Unsupported';
export type ExecutionMode = 'AI_POWERED' | 'DETERMINISTIC_FALLBACK';
export type GateStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

/**
 * High-level lifecycle pipeline status distinguishing generation from execution outcomes.
 */
export type PipelineStatus =
  | 'GENERATION_SUCCESS_EXECUTION_PASSED'
  | 'GENERATION_SUCCESS_EXECUTION_FAILED'
  | 'GENERATION_SUCCESS_EXECUTION_SKIPPED'
  | 'GENERATION_SUCCESS_GATE2_PENDING'
  | 'GATE1_REJECTED'
  | 'GATE2_REJECTED'
  | 'VALIDATION_FAILED'
  | 'EXECUTION_PROCESS_ERROR';

/**
 * Explicit Root Cause Analysis ingestion and agent diagnostic status.
 */
export type RcaAnalysisStatus =
  | 'NOT_APPLICABLE_PASSED'
  | 'ANALYSIS_COMPLETED'
  | 'REPORT_MISSING'
  | 'ANALYSIS_FAILED';

/**
 * Structured requirement input ingested by the Test Design Agent.
 */
export interface RequirementInput {
  requirementId: string;
  title: string;
  description: string;
  applicationArea: 'AUTH' | 'PROD' | 'CART' | 'CHECK' | 'ENG' | 'API' | 'SUB' | string;
  userRole?: string;
  acceptanceCriteria: string[];
  constraints?: string[];
}

/**
 * Granular test scenario derived by the Test Design Agent.
 */
export interface TestScenario {
  scenarioId: string;
  requirementId: string;
  title: string;
  objective: string;
  preconditions: string[];
  testSteps: string[];
  expectedResults: string[];
  testType: TestType;
  priority: TestPriority;
  tags: string[];
  automationFeasibility: AutomationFeasibility;
  assumptions: string[];
  ambiguityNotes: string[];
}

/**
 * Complete structured output produced by Agent 1 (Test Design Agent).
 */
export interface TestDesignOutput {
  requirement: RequirementInput;
  scenarios: TestScenario[];
  missingOrAmbiguousRequirements: string[];
  designTechniquesApplied: string[];
  metadata: {
    timestamp: string;
    executionMode: ExecutionMode;
    provider: string;
    model?: string;
  };
}

/**
 * Human-in-the-Loop Gate 1 Review Record (Test Design Approval).
 */
export interface Gate1Approval {
  status: GateStatus;
  approvedBy?: string;
  approvalTimestamp?: string;
  reviewNotes?: string;
}

/**
 * Human-in-the-Loop Gate 2 Review Record (Code Review & Execution Authorization).
 */
export interface Gate2Approval {
  status: GateStatus;
  approvedBy?: string;
  approvalTimestamp?: string;
  reviewNotes?: string;
}

/**
 * Structured input consumed by Agent 2 (Automation Authoring Agent).
 */
export interface AuthoringInput {
  scenarios: TestScenario[];
  gate1Approval: Gate1Approval;
  targetDirectory?: string;
}

/**
 * Individual generated test file specification.
 */
export interface GeneratedTestFile {
  filename: string;
  filePath: string;
  content: string;
  scenariosCovered: string[];
  reusedComponents: string[];
  status: 'GENERATED' | 'REQUIRES_MANUAL_REVIEW' | 'SKIPPED';
  reviewNotes?: string[];
}

/**
 * Complete output produced by Agent 2 (Automation Authoring Agent).
 */
export interface AuthoringOutput {
  generatedFiles: GeneratedTestFile[];
  executionSummary: {
    totalScenarios: number;
    automated: number;
    manualReviewRequired: number;
    skipped: number;
    reusedPageObjects: string[];
    reusedApiClients: string[];
  };
  metadata: {
    timestamp: string;
    executionMode: ExecutionMode;
    provider: string;
  };
}

/**
 * Configuration options for automated Playwright test execution.
 */
export interface TestExecutionOptions {
  testFile: string;
  project?: string;
  timeoutMs?: number;
  retries?: number;
  headed?: boolean;
}

/**
 * Status of child process test execution.
 */
export type TestExecutionStatus = 'PASSED' | 'FAILED' | 'TIMED_OUT' | 'PROCESS_ERROR';

/**
 * Structured result produced by the ExecutionRunner child-process execution.
 */
export interface TestExecutionResult {
  executionId: string;
  status: TestExecutionStatus;
  exitCode: number | null;
  testFile: string;
  project: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  rcaReportPath?: string;
  commandExecuted: string;
  errorMessage?: string;
}

/**
 * AI-generated diagnostic hypothesis from the RCA Agent.
 */
export interface RcaAiHypothesis {
  hypothesisCategory: RcaCategory;
  confidence: number;
  reasoning: string;
  supportingEvidence: string[];
  alternativeHypotheses: string[];
  recommendedAction: string;
  requiresHumanApproval: boolean;
}

/**
 * Analysis record for an individual test failure evaluated by the RCA Agent.
 */
export interface RcaAnalysisItem {
  failureId: string;
  testId: string;
  testTitle: string;
  deterministicClassification: RcaResult;
  aiHypothesis?: RcaAiHypothesis;
  effectiveCategory: RcaCategory;
  effectiveConfidence: number;
  explanation: string;
  recommendedAction: string;
  requiresHumanApproval: boolean;
  evidence: RcaEvidence;
  artifactPaths?: FailureArtifacts;
  status: 'DETERMINISTIC_ONLY' | 'AI_ENRICHED' | 'AI_FAILED_FALLBACK';
}

/**
 * Complete output emitted by the RCA Agent.
 */
export interface RcaAnalysisOutput {
  runSummary: RcaRunSummary;
  totalFailuresAnalyzed: number;
  analyses: RcaAnalysisItem[];
  metadata: {
    timestamp: string;
    executionMode: ExecutionMode;
    provider: string;
    model?: string;
  };
}

/**
 * Overall result produced by the Execution Orchestrator.
 */
export interface OrchestrationResult {
  pipelineId: string;
  executionId?: string;
  status: PipelineStatus;
  executionMode: ExecutionMode;
  gate1Status: GateStatus;
  gate2Status: GateStatus;
  requirementId: string;
  scenarioArtifactPath?: string;
  generatedFiles: string[];
  executionSummary: AuthoringOutput['executionSummary'];
  summaryReportPath?: string;
  executionResult?: TestExecutionResult;
  rcaReportPath?: string;
  rcaAnalysis?: RcaAnalysisOutput;
  rcaStatus?: RcaAnalysisStatus;
  rcaStatusDetails?: string;
  pipelineReportPath?: string;
  timestamp: string;
}

/**
 * Consolidated pipeline report specification saved under reports/pipeline/.
 */
export interface PipelineReport {
  pipelineId: string;
  executionId?: string;
  requirementId: string;
  requirementTitle: string;
  requirementDescription: string;
  status: PipelineStatus;
  executionMode: ExecutionMode;
  provider: string;
  gate1: Gate1Approval;
  gate2: Gate2Approval;
  scenarioCount: number;
  generatedFiles: string[];
  executionResult?: TestExecutionResult;
  rcaReportPath?: string;
  rcaAnalysis?: RcaAnalysisOutput;
  rcaStatus?: RcaAnalysisStatus;
  rcaStatusDetails?: string;
  durationMs: number;
  timestamp: string;
  reportPaths: {
    json: string;
    markdown: string;
  };
}
