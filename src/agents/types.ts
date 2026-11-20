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
 * Risk classification for automated repair proposals.
 */
export type RepairRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Operational status of an automated repair proposal.
 */
export type RepairProposalStatus = 'PROPOSED' | 'NEEDS_INVESTIGATION' | 'NO_ACTION';

/**
 * Target component or layer identified for remediation.
 */
export type RepairTargetType =
  | 'TEST_SCRIPT'
  | 'PAGE_OBJECT'
  | 'TEST_DATA'
  | 'INFRASTRUCTURE'
  | 'PRODUCT_SUT'
  | 'UNKNOWN';

/**
 * Structured repair proposal formulated for a single test failure.
 * Strict governance: proposals are advisory only and must never be applied automatically without human approval.
 */
export interface RepairProposalItem {
  proposalId: string;
  testId: string;
  executionId: string;
  rcaCategory: RcaCategory;
  confidence: number;
  problemSummary: string;
  targetType: RepairTargetType;
  suggestedFiles: string[];
  recommendedAction: string;
  riskLevel: RepairRiskLevel;
  requiresHumanApproval: boolean;
  rationale: string;
  status: RepairProposalStatus;
  diffSnippet?: string; // Proposed code change preview (advisory only, never applied automatically)
  supportingEvidence: string[];
  source: 'DETERMINISTIC_HEURISTIC' | 'AI_GENERATED';
}

/**
 * Complete output emitted by Agent 5 (Repair Proposal Agent).
 */
export interface RepairProposalOutput {
  executionId: string;
  timestamp: string;
  totalProposals: number;
  proposals: RepairProposalItem[];
  metadata: {
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
  repairProposalPath?: string;
  repairProposals?: RepairProposalOutput;
  qualityReportPath?: string;
  qualityReport?: QualityReportOutput;
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
  repairProposalPath?: string;
  repairProposals?: RepairProposalOutput;
  qualityReportPath?: string;
  qualityReport?: QualityReportOutput;
  durationMs: number;
  timestamp: string;
  reportPaths: {
    json: string;
    markdown: string;
  };
}

/**
 * Deterministic release decision recommendation formulated by Agent 6.
 */
export type ReleaseRecommendation = 'GO' | 'NO_GO' | 'CONDITIONAL_GO';

/**
 * Formal human release sign-off governance status.
 */
export type ReleaseSignOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Release gate record requiring formal human authorization.
 */
export interface ReleaseSignOff {
  status: ReleaseSignOffStatus;
  decision: ReleaseRecommendation;
  signOffBy?: string;
  signOffTimestamp?: string;
  reviewNotes?: string;
}

/**
 * Aggregated quality metrics calculated deterministically across test runs.
 */
export interface QualityMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  passRate: number; // 0.0 - 100.0
  failureRate: number; // 0.0 - 100.0
  executionDurationMs: number;
  rcaDistribution: Record<RcaCategory, number>;
  proposals: {
    total: number;
    proposed: number;
    needsInvestigation: number;
    noAction: number;
    riskDistribution: Record<RepairRiskLevel, number>;
    pendingHumanApprovals: number;
  };
  coverage: {
    totalScenarios: number;
    automated: number;
    manualReviewRequired: number;
    skipped: number;
    coverageRate: number; // 0.0 - 100.0
  };
}

/**
 * Longitudinal trends and recurrent pattern analytics computed across historical runs.
 */
export interface HistoricalQualityTrends {
  runsAnalyzed: number;
  averagePassRate: number; // 0.0 - 100.0
  passRateTrajectory: 'IMPROVING' | 'STABLE' | 'DEGRADING' | 'INSUFFICIENT_DATA';
  recurrentFailures: Array<{
    testId: string;
    testTitle: string;
    failureCount: number;
    categories: RcaCategory[];
  }>;
  flakyWatchlist: Array<{
    testId: string;
    testTitle: string;
    flakyOccurrences: number;
    lastSeen: string;
  }>;
  excludedFaultInjectionRuns: number;
}

/**
 * Defect clustering grouped by functional application area.
 */
export interface DefectCluster {
  applicationArea: string;
  failureCount: number;
  primaryCategory: RcaCategory;
  affectedScenarios: string[];
}

/**
 * Complete executive output emitted by Agent 6 (Quality Reporting Agent).
 */
export interface QualityReportOutput {
  reportId: string;
  pipelineId: string;
  executionId?: string;
  timestamp: string;
  requirementId: string;
  releaseRecommendation: ReleaseRecommendation;
  recommendationRationale: string;
  executiveNarrative: string;
  metrics: QualityMetrics;
  historicalTrends: HistoricalQualityTrends;
  defectClusters: DefectCluster[];
  outstandingRisks: string[];
  recommendedNextActions: string[];
  releaseSignOff: ReleaseSignOff;
  metadata: {
    executionMode: ExecutionMode;
    provider: string;
    model?: string;
    narrativeSource: 'AI_GENERATED' | 'DETERMINISTIC_HEURISTIC';
  };
  reportPaths: {
    json: string;
    markdown: string;
    latestMarkdown: string;
  };
}
