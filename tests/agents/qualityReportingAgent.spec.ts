import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { QualityReportingAgent, QualityReportingContext } from '../../tools/agents/qualityReportingAgent';
import { ModelFreeFallbackProvider } from '../../src/agents/providers/fallbackProvider';
import { LLMProvider } from '../../src/agents/providers/types';
import { PipelineReporter } from '../../tools/agents/pipelineReporter';
import {
  OrchestrationResult,
  RequirementInput,
  RcaAnalysisOutput,
  RepairProposalOutput,
  TestDesignOutput,
  AuthoringOutput,
} from '../../src/agents/types';
import { RcaCategory } from '../../src/rca/types';

function createMockRequirement(): RequirementInput {
  return {
    requirementId: 'REQ-QUAL-001',
    title: 'Customer Checkout and Payment Gateway',
    description: 'Ensure registered customers can complete checkout and payment verification.',
    applicationArea: 'CHECK',
    userRole: 'Authenticated Customer',
    acceptanceCriteria: [
      'Order summary displays accurate subtotal and tax.',
      'Payment submission processes and returns order confirmation.',
    ],
  };
}

function createMockDesignOutput(): TestDesignOutput {
  return {
    requirement: createMockRequirement(),
    scenarios: [
      {
        scenarioId: 'TC-QUAL-SCEN-001',
        requirementId: 'REQ-QUAL-001',
        title: 'Verify Order Summary',
        objective: 'Check subtotal and tax calculations',
        preconditions: ['User is logged in'],
        testSteps: ['Navigate to cart', 'Click proceed to checkout'],
        expectedResults: ['Order summary table is visible'],
        testType: 'UI',
        priority: 'High',
        tags: ['checkout'],
        automationFeasibility: 'Automated',
        assumptions: [],
        ambiguityNotes: [],
      },
      {
        scenarioId: 'TC-QUAL-SCEN-002',
        requirementId: 'REQ-QUAL-001',
        title: 'Submit Valid Card Payment',
        objective: 'Complete payment gateway flow',
        preconditions: ['Checkout form is filled'],
        testSteps: ['Enter card details', 'Click Pay and Confirm Order'],
        expectedResults: ['Success alert "Your order has been placed successfully!"'],
        testType: 'UI',
        priority: 'High',
        tags: ['payment'],
        automationFeasibility: 'Automated',
        assumptions: [],
        ambiguityNotes: [],
      },
    ],
    missingOrAmbiguousRequirements: [],
    designTechniquesApplied: ['Equivalence Partitioning', 'Boundary Value Analysis'],
    metadata: {
      timestamp: new Date().toISOString(),
      executionMode: 'DETERMINISTIC_FALLBACK',
      provider: 'Model-Free Fallback',
    },
  };
}

function createMockOrchestrationResult(overrides?: Partial<OrchestrationResult>): OrchestrationResult {
  return {
    pipelineId: 'PIPE-QUAL-TEST-001',
    executionId: 'EXEC-QUAL-TEST-001',
    status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
    executionMode: 'DETERMINISTIC_FALLBACK',
    gate1Status: 'APPROVED',
    gate2Status: 'APPROVED',
    requirementId: 'REQ-QUAL-001',
    generatedFiles: ['tests/generated/checkout.spec.ts'],
    executionSummary: {
      totalScenarios: 2,
      automated: 2,
      manualReviewRequired: 0,
      skipped: 0,
      reusedPageObjects: ['CheckoutPage'],
      reusedApiClients: [],
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function createMockRcaOutput(failures: Array<{ testId: string; category: RcaCategory; errorMessage?: string }>): RcaAnalysisOutput {
  return {
    runSummary: {
      totalTests: Math.max(failures.length, 2),
      passed: Math.max(0, 2 - failures.length),
      failed: failures.length,
      skipped: 0,
      flaky: 0,
      durationMs: 4500,
      status: failures.length > 0 ? 'failed' : 'passed',
    },
    totalFailuresAnalyzed: failures.length,
    analyses: failures.map(f => ({
      failureId: f.testId,
      testId: f.testId,
      testTitle: `Scenario test for ${f.testId}`,
      deterministicClassification: {
        testId: f.testId,
        category: f.category,
        confidence: 0.95,
        classificationSource: 'DETERMINISTIC',
        explanation: `Test failure classified as ${f.category}`,
        recommendedAction: 'Remediate failure according to taxonomy',
        requiresHumanApproval: true,
        timestamp: new Date().toISOString(),
        evidence: {
          errorMessage: f.errorMessage || `Error executing ${f.testId}`,
          matchedRule: 'RULE_TEST_EXECUTION',
        },
      },
      effectiveCategory: f.category,
      effectiveConfidence: 0.95,
      explanation: `Test failure classified as ${f.category}`,
      recommendedAction: 'Remediate failure according to taxonomy',
      requiresHumanApproval: true,
      evidence: {
        errorMessage: f.errorMessage || `Error executing ${f.testId}`,
        matchedRule: 'RULE_TEST_EXECUTION',
      },
      status: 'DETERMINISTIC_ONLY',
    })),
    metadata: {
      timestamp: new Date().toISOString(),
      executionMode: 'DETERMINISTIC_FALLBACK',
      provider: 'Deterministic Fallback Provider',
    },
  };
}

test.describe('Agent 6: Quality Reporting Agent - Invariants, Governance & Metric Validation', () => {
  const fallbackProvider = new ModelFreeFallbackProvider();
  const agent = new QualityReportingAgent(fallbackProvider);

  test('TC-VAL-QUAL-001: Recommends GO when all required checks pass and 100% test verification is complete', async () => {
    const requirement = createMockRequirement();
    const design = createMockDesignOutput();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
      executionResult: {
        executionId: 'EXEC-TEST-PASS-001',
        status: 'PASSED',
        exitCode: 0,
        testFile: 'tests/generated/checkout.spec.ts',
        project: 'Google Chrome',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 3500,
        stdout: '',
        stderr: '',
        commandExecuted: 'playwright test checkout.spec.ts',
      },
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-PASS-001',
      requirement,
      orchestrationResult: orchResult,
      designOutput: design,
      historicalTrends: {
        runsAnalyzed: 5,
        averagePassRate: 100.0,
        passRateTrajectory: 'STABLE',
        recurrentFailures: [],
        flakyWatchlist: [],
        excludedFaultInjectionRuns: 0,
      },
    });

    expect(report.releaseRecommendation).toBe('GO');
    expect(report.recommendationRationale).toContain('100.0% pass rate');
    expect(report.metrics.passRate).toBe(100.0);
    expect(report.metrics.failed).toBe(0);
    expect(report.releaseSignOff.status).toBe('PENDING'); // Governance: Never auto-signs off
    expect(report.releaseSignOff.signOffBy).toBeUndefined();
  });

  test('TC-VAL-QUAL-002: Recommends NO_GO when authentic PRODUCT_DEFECT is detected', async () => {
    const requirement = createMockRequirement();
    const design = createMockDesignOutput();
    const rca = createMockRcaOutput([
      { testId: 'TC-QUAL-SCEN-002', category: 'PRODUCT_DEFECT', errorMessage: 'HTTP 500 Internal Server Error' },
    ]);
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
      rcaAnalysis: rca,
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-FAIL-PROD-001',
      requirement,
      orchestrationResult: orchResult,
      designOutput: design,
      rcaAnalysis: rca,
    });

    expect(report.releaseRecommendation).toBe('NO_GO');
    expect(report.recommendationRationale).toContain('PRODUCT_DEFECT');
    expect(report.outstandingRisks.some(r => r.includes('PRODUCT_DEFECT') || r.includes('regressions'))).toBe(true);
    expect(report.recommendedNextActions.some(a => a.includes('Do NOT modify test assertions'))).toBe(true);
  });

  test('TC-VAL-QUAL-003: Recommends NO_GO when UNKNOWN failure classification occurs', async () => {
    const requirement = createMockRequirement();
    const design = createMockDesignOutput();
    const rca = createMockRcaOutput([
      { testId: 'TC-QUAL-SCEN-001', category: 'UNKNOWN', errorMessage: 'Inconclusive diagnostic error' },
    ]);
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
      rcaAnalysis: rca,
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-FAIL-UNK-001',
      requirement,
      orchestrationResult: orchResult,
      designOutput: design,
      rcaAnalysis: rca,
    });

    expect(report.releaseRecommendation).toBe('NO_GO');
    expect(report.recommendationRationale).toContain('UNKNOWN');
    expect(report.outstandingRisks.some(r => r.includes('unverified root causes'))).toBe(true);
  });

  test('TC-VAL-QUAL-004: Recommends NO_GO when pass rate falls below the 85% threshold', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
    });

    // 10 tests: 7 passed, 3 failed = 70.0% pass rate
    const rca: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 10,
        passed: 7,
        failed: 3,
        skipped: 0,
        flaky: 0,
        durationMs: 8000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 3,
      analyses: [
        {
          failureId: 'TC-01',
          testId: 'TC-01',
          testTitle: 'Test 01',
          deterministicClassification: {
            testId: 'TC-01',
            category: 'ENVIRONMENT_OR_NETWORK',
            confidence: 0.9,
            classificationSource: 'DETERMINISTIC',
            explanation: '',
            recommendedAction: '',
            requiresHumanApproval: false,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: '', matchedRule: '' },
          },
          effectiveCategory: 'ENVIRONMENT_OR_NETWORK',
          effectiveConfidence: 0.9,
          explanation: '',
          recommendedAction: '',
          requiresHumanApproval: false,
          evidence: { errorMessage: '', matchedRule: '' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-LOW-RATE-001',
      requirement,
      orchestrationResult: orchResult,
      rcaAnalysis: rca,
    });

    expect(report.metrics.passRate).toBe(70.0);
    expect(report.releaseRecommendation).toBe('NO_GO');
    expect(report.recommendationRationale).toContain('85.0% release threshold');
  });

  test('TC-VAL-QUAL-005: Recommends NO_GO when Gate 1 or Gate 2 is rejected', async () => {
    const requirement = createMockRequirement();
    const orchResultGate1 = createMockOrchestrationResult({
      gate1Status: 'REJECTED',
      status: 'GATE1_REJECTED',
    });

    const reportGate1 = await agent.generateQualityReport({
      pipelineId: 'PIPE-GATE1-REJ',
      requirement,
      orchestrationResult: orchResultGate1,
    });

    expect(reportGate1.releaseRecommendation).toBe('NO_GO');
    expect(reportGate1.recommendationRationale).toContain('Gate 1');

    const orchResultGate2 = createMockOrchestrationResult({
      gate2Status: 'REJECTED',
      status: 'GATE2_REJECTED',
    });

    const reportGate2 = await agent.generateQualityReport({
      pipelineId: 'PIPE-GATE2-REJ',
      requirement,
      orchestrationResult: orchResultGate2,
    });

    expect(reportGate2.releaseRecommendation).toBe('NO_GO');
    expect(reportGate2.recommendationRationale).toContain('Gate 2');
  });

  test('TC-VAL-QUAL-006: Recommends NO_GO when test execution evidence is missing or runner fails with process error', async () => {
    const requirement = createMockRequirement();
    const orchResultProcessError = createMockOrchestrationResult({
      status: 'EXECUTION_PROCESS_ERROR',
      executionResult: {
        executionId: 'EXEC-CRASH-001',
        status: 'PROCESS_ERROR',
        exitCode: null,
        testFile: 'tests/generated/checkout.spec.ts',
        project: 'Google Chrome',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 500,
        stdout: '',
        stderr: 'Fatal error: node out of memory',
        commandExecuted: 'node test',
        errorMessage: 'Process spawn crash',
      },
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-CRASH-001',
      requirement,
      orchestrationResult: orchResultProcessError,
    });

    expect(report.releaseRecommendation).toBe('NO_GO');
    expect(report.recommendationRationale).toContain('fatal execution process error');
  });

  test('TC-VAL-QUAL-007: Recommends CONDITIONAL_GO for transient infrastructure failures with pass rate >= 85%', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
    });

    // 10 tests: 9 passed, 1 network failure = 90.0% pass rate
    const rca: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 10,
        passed: 9,
        failed: 1,
        skipped: 0,
        flaky: 0,
        durationMs: 12000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 1,
      analyses: [
        {
          failureId: 'TC-NET-01',
          testId: 'TC-NET-01',
          testTitle: 'Network probe test',
          deterministicClassification: {
            testId: 'TC-NET-01',
            category: 'ENVIRONMENT_OR_NETWORK',
            confidence: 0.95,
            classificationSource: 'DETERMINISTIC',
            explanation: 'net::ERR_CONNECTION_RESET',
            recommendedAction: 'Retry when network recovers',
            requiresHumanApproval: false,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: 'net::ERR_CONNECTION_RESET', matchedRule: 'RULE_P2' },
          },
          effectiveCategory: 'ENVIRONMENT_OR_NETWORK',
          effectiveConfidence: 0.95,
          explanation: 'net::ERR_CONNECTION_RESET',
          recommendedAction: 'Retry when network recovers',
          requiresHumanApproval: false,
          evidence: { errorMessage: 'net::ERR_CONNECTION_RESET', matchedRule: 'RULE_P2' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-NET-001',
      requirement,
      orchestrationResult: orchResult,
      rcaAnalysis: rca,
    });

    expect(report.metrics.passRate).toBe(90.0);
    expect(report.releaseRecommendation).toBe('CONDITIONAL_GO');
    expect(report.recommendationRationale).toContain('Conditional Release');
    expect(report.recommendationRationale).toContain('transient network dropouts');
  });

  test('TC-VAL-QUAL-008: Enforces CONDITIONAL_GO (prohibits unconditional GO) for TEST_SCRIPT_DEFECT', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
    });

    // 10 tests: 9 passed, 1 test script defect = 90.0% pass rate
    const rca: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 10,
        passed: 9,
        failed: 1,
        skipped: 0,
        flaky: 0,
        durationMs: 12000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 1,
      analyses: [
        {
          failureId: 'TC-SCRIPT-01',
          testId: 'TC-SCRIPT-01',
          testTitle: 'Selector typo test',
          deterministicClassification: {
            testId: 'TC-SCRIPT-01',
            category: 'TEST_SCRIPT_DEFECT',
            confidence: 0.95,
            classificationSource: 'DETERMINISTIC',
            explanation: 'Invalid selector grammar',
            recommendedAction: 'Fix CSS quote',
            requiresHumanApproval: true,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: 'Unexpected token', matchedRule: 'RULE_P7' },
          },
          effectiveCategory: 'TEST_SCRIPT_DEFECT',
          effectiveConfidence: 0.95,
          explanation: 'Invalid selector grammar',
          recommendedAction: 'Fix CSS quote',
          requiresHumanApproval: true,
          evidence: { errorMessage: 'Unexpected token', matchedRule: 'RULE_P7' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-SCRIPT-001',
      requirement,
      orchestrationResult: orchResult,
      rcaAnalysis: rca,
    });

    // Must be CONDITIONAL_GO, never unconditional GO
    expect(report.releaseRecommendation).toBe('CONDITIONAL_GO');
    expect(report.recommendationRationale).toContain('automation test-script or locator drift');
    expect(report.recommendationRationale).toContain('Unconditional GO is prohibited while verification is outstanding');
  });

  test('TC-VAL-QUAL-009: Invariant enforcement: Live AI narrative CANNOT override or weaken deterministic NO_GO', async () => {
    const requirement = createMockRequirement();
    const rca = createMockRcaOutput([
      { testId: 'TC-PROD-01', category: 'PRODUCT_DEFECT', errorMessage: 'Server 500 error' },
    ]);
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
      rcaAnalysis: rca,
    });

    // Malicious or hallucinating live provider attempting to declare GO
    const rogueLiveProvider: LLMProvider = {
      metadata: {
        name: 'RogueLiveLLM',
        isLive: true,
        executionMode: 'AI_POWERED',
      },
      generateText: async () => '',
      generateStructured: async <T>() =>
        ({
          executiveNarrative: 'Everything looks fantastic! Recommend releasing software immediately!',
          outstandingRisks: ['No risks whatsoever'],
          recommendedNextActions: ['Deploy to production'],
        } as unknown as T),
    };

    const rogueAgent = new QualityReportingAgent(rogueLiveProvider);
    const report = await rogueAgent.generateQualityReport({
      pipelineId: 'PIPE-INVARIANT-TEST',
      requirement,
      orchestrationResult: orchResult,
      rcaAnalysis: rca,
    });

    // Invariant: The recommendation must remain NO_GO, completely unaffected by the AI model!
    expect(report.releaseRecommendation).toBe('NO_GO');
    expect(report.recommendationRationale).toContain('PRODUCT_DEFECT');
  });

  test('TC-VAL-QUAL-010: Gracefully falls back to deterministic narrative when AI provider throws an error', async () => {
    const requirement = createMockRequirement();
    const design = createMockDesignOutput();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
      executionResult: {
        executionId: 'EXEC-TEST-FALLBACK-001',
        status: 'PASSED',
        exitCode: 0,
        testFile: 'tests/generated/checkout.spec.ts',
        project: 'Google Chrome',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 3500,
        stdout: '',
        stderr: '',
        commandExecuted: 'playwright test checkout.spec.ts',
      },
    });

    const throwingProvider: LLMProvider = {
      metadata: {
        name: 'ThrowingLLM',
        isLive: true,
        executionMode: 'AI_POWERED',
      },
      generateText: async () => '',
      generateStructured: async <T>() => {
        throw new Error('503 Service Unavailable: Model rate limit exceeded');
      },
    };

    const resilientAgent = new QualityReportingAgent(throwingProvider);
    const report = await resilientAgent.generateQualityReport({
      pipelineId: 'PIPE-FALLBACK-TEST',
      requirement,
      orchestrationResult: orchResult,
      designOutput: design,
      historicalTrends: {
        runsAnalyzed: 5,
        averagePassRate: 100.0,
        passRateTrajectory: 'STABLE',
        recurrentFailures: [],
        flakyWatchlist: [],
        excludedFaultInjectionRuns: 0,
      },
    });

    expect(report.metadata.narrativeSource).toBe('DETERMINISTIC_HEURISTIC');
    expect(report.executiveNarrative.length).toBeGreaterThan(50);
    expect(report.releaseRecommendation).toBe('GO');
  });

  test('TC-VAL-QUAL-011: Handles empty history or missing directories gracefully without divide-by-zero or crashes', async () => {
    const trends = agent.analyzeHistoricalData('NON-EXISTENT-EXEC-ID');

    expect(Number.isFinite(trends.averagePassRate)).toBe(true);
    expect(isNaN(trends.averagePassRate)).toBe(false);
    expect(['IMPROVING', 'STABLE', 'DEGRADING', 'INSUFFICIENT_DATA']).toContain(trends.passRateTrajectory);
    expect(Array.isArray(trends.recurrentFailures)).toBe(true);
    expect(Array.isArray(trends.flakyWatchlist)).toBe(true);
  });

  test('TC-VAL-QUAL-012: Correctly excludes controlled fault-injection runs (FI-01, FI-02) from historical quality benchmarks using controlled fixtures', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qual-fi-fixture-'));
    const tempPipelineDir = path.join(tempDir, 'pipeline');
    const tempRcaDir = path.join(tempDir, 'rca');
    fs.mkdirSync(tempPipelineDir, { recursive: true });
    fs.mkdirSync(tempRcaDir, { recursive: true });

    try {
      // 1. Create a controlled standard product execution pipeline report (100% pass)
      const validProductReport = {
        pipelineId: 'PIPE-PROD-BENCH-001',
        executionId: 'EXEC-PROD-BENCH-001',
        requirementId: 'REQ-AUTH-001',
        scenarioCount: 2,
        executionResult: { status: 'PASSED' },
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(tempPipelineDir, 'PIPE-PROD-BENCH-001-REQ_AUTH_001-report.json'),
        JSON.stringify(validProductReport)
      );

      // 2. Create controlled FI-01 controlled test script defect report
      const fi01Report = {
        executionId: 'EXEC-FI-01-CONTROLLED',
        generatedAt: new Date().toISOString(),
        runSummary: { totalTests: 1, passed: 0, failed: 1, flaky: 0, skipped: 0, durationMs: 1200, status: 'failed' },
        failures: [
          {
            testId: 'TC-FI-01',
            testTitle: 'Intentional invalid selector fault injection',
            rca: { category: 'TEST_SCRIPT_DEFECT' },
          },
        ],
      };
      fs.writeFileSync(
        path.join(tempRcaDir, 'rca-report-FI-01-injection.json'),
        JSON.stringify(fi01Report)
      );

      // 3. Create controlled FI-02 network abort fault injection report
      const fi02Report = {
        executionId: 'EXEC-FI-02-CONTROLLED',
        generatedAt: new Date().toISOString(),
        runSummary: { totalTests: 1, passed: 0, failed: 1, flaky: 0, skipped: 0, durationMs: 1500, status: 'failed' },
        failures: [
          {
            testId: 'TC-FI-02',
            testTitle: 'Intentional network reset fault injection',
            rca: { category: 'ENVIRONMENT_OR_NETWORK' },
          },
        ],
      };
      fs.writeFileSync(
        path.join(tempRcaDir, 'rca-report-FI-02-injection.json'),
        JSON.stringify(fi02Report)
      );

      const trends = agent.analyzeHistoricalData('EXEC-CURRENT-RUN', {
        pipelineDir: tempPipelineDir,
        rcaDir: tempRcaDir,
      });

      // Both controlled FI runs must be excluded
      expect(trends.excludedFaultInjectionRuns).toBe(2);
      // Only the genuine product report should be analyzed
      expect(trends.runsAnalyzed).toBe(1);
      expect(trends.averagePassRate).toBe(100.0);
      expect(trends.recurrentFailures.length).toBe(0);
      for (const failure of trends.recurrentFailures) {
        expect(failure.testId.startsWith('TC-FI-')).toBe(false);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('TC-VAL-QUAL-013: Accurately calculates repair proposal counts, risk profiles, and pending human approvals', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult();

    const proposals: RepairProposalOutput = {
      executionId: 'EXEC-PROP-001',
      timestamp: new Date().toISOString(),
      totalProposals: 3,
      proposals: [
        {
          proposalId: 'PROP-01',
          testId: 'TC-01',
          executionId: 'EXEC-PROP-001',
          rcaCategory: 'TEST_SCRIPT_DEFECT',
          confidence: 0.95,
          problemSummary: 'Selector error',
          targetType: 'TEST_SCRIPT',
          suggestedFiles: ['checkout.spec.ts'],
          recommendedAction: 'Fix selector',
          riskLevel: 'LOW',
          requiresHumanApproval: true,
          rationale: 'Script fix',
          status: 'PROPOSED',
          supportingEvidence: ['Error'],
          source: 'DETERMINISTIC_HEURISTIC',
        },
        {
          proposalId: 'PROP-02',
          testId: 'TC-02',
          executionId: 'EXEC-PROP-001',
          rcaCategory: 'PRODUCT_DEFECT',
          confidence: 0.95,
          problemSummary: 'SUT error',
          targetType: 'PRODUCT_SUT',
          suggestedFiles: [],
          recommendedAction: 'File bug',
          riskLevel: 'HIGH',
          requiresHumanApproval: true,
          rationale: 'SUT bug',
          status: 'NO_ACTION',
          supportingEvidence: ['Error 500'],
          source: 'DETERMINISTIC_HEURISTIC',
        },
        {
          proposalId: 'PROP-03',
          testId: 'TC-03',
          executionId: 'EXEC-PROP-001',
          rcaCategory: 'UNKNOWN',
          confidence: 0.3,
          problemSummary: 'Ambiguous',
          targetType: 'UNKNOWN',
          suggestedFiles: [],
          recommendedAction: 'Investigate',
          riskLevel: 'MEDIUM',
          requiresHumanApproval: true,
          rationale: 'Needs triage',
          status: 'NEEDS_INVESTIGATION',
          supportingEvidence: ['Error'],
          source: 'DETERMINISTIC_HEURISTIC',
        },
      ],
      metadata: { executionMode: 'DETERMINISTIC_FALLBACK', provider: 'Fallback' },
    };

    const metrics = agent.calculateMetrics({
      pipelineId: 'PIPE-PROP-TEST',
      requirement,
      orchestrationResult: orchResult,
      repairProposals: proposals,
    });

    expect(metrics.proposals.total).toBe(3);
    expect(metrics.proposals.proposed).toBe(1);
    expect(metrics.proposals.noAction).toBe(1);
    expect(metrics.proposals.needsInvestigation).toBe(1);
    expect(metrics.proposals.riskDistribution.LOW).toBe(1);
    expect(metrics.proposals.riskDistribution.HIGH).toBe(1);
    expect(metrics.proposals.riskDistribution.MEDIUM).toBe(1);
    expect(metrics.proposals.pendingHumanApprovals).toBe(3);
  });

  test('TC-VAL-QUAL-014: Strictly preserves human release governance: releaseSignOff is initialized as PENDING', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult();

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-GOV-001',
      requirement,
      orchestrationResult: orchResult,
    });

    expect(report.releaseSignOff.status).toBe('PENDING');
    expect(report.releaseSignOff.signOffBy).toBeUndefined();
    expect(report.releaseSignOff.signOffTimestamp).toBeUndefined();
    expect(report.releaseSignOff.reviewNotes).toContain('Formal production release authorization requires explicit human Quality Engineering sign-off');
  });

  test('TC-VAL-QUAL-015: Strict filesystem governance: confirms agent writes only under reports/quality/ and never touches src/ or tests/', async () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const testsDir = path.resolve(process.cwd(), 'tests');

    const srcFilesBefore = fs.readdirSync(srcDir, { recursive: true });
    const testsFilesBefore = fs.readdirSync(testsDir, { recursive: true });

    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      pipelineId: 'PIPE-FS-TEST-999',
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-FS-TEST-999',
      requirement,
      orchestrationResult: orchResult,
    });

    // Verify quality report artifacts exist in reports/quality/
    expect(fs.existsSync(report.reportPaths.json)).toBe(true);
    expect(fs.existsSync(report.reportPaths.markdown)).toBe(true);
    expect(fs.existsSync(report.reportPaths.latestMarkdown)).toBe(true);

    // Verify reports are inside reports/quality/ or reports/quality-summary.md
    expect(report.reportPaths.json.includes('reports\\quality') || report.reportPaths.json.includes('reports/quality')).toBe(true);

    // Clean up specific test execution files
    try {
      if (fs.existsSync(report.reportPaths.json)) fs.unlinkSync(report.reportPaths.json);
      if (fs.existsSync(report.reportPaths.markdown)) fs.unlinkSync(report.reportPaths.markdown);
    } catch {
      // Ignore cleanup error
    }

    // Verify src/ and tests/ were completely untouched
    const srcFilesAfter = fs.readdirSync(srcDir, { recursive: true });
    const testsFilesAfter = fs.readdirSync(testsDir, { recursive: true });

    expect(srcFilesAfter).toEqual(srcFilesBefore);
    expect(testsFilesAfter).toEqual(testsFilesBefore);
  });

  test('TC-VAL-QUAL-016: Recommends CONDITIONAL_GO for TIMING_OR_FLAKINESS failure when pass rate >= 85% and no product defects', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
    });

    // 10 tests: 9 passed, 1 timing/flakiness failure = 90.0% pass rate
    const rca: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 10,
        passed: 9,
        failed: 1,
        skipped: 0,
        flaky: 0,
        durationMs: 14000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 1,
      analyses: [
        {
          failureId: 'TC-TIME-01',
          testId: 'TC-TIME-01',
          testTitle: 'Slow modal render test',
          deterministicClassification: {
            testId: 'TC-TIME-01',
            category: 'TIMING_OR_FLAKINESS',
            confidence: 0.9,
            classificationSource: 'DETERMINISTIC',
            explanation: 'element is not visible within 5000ms',
            recommendedAction: 'Increase timeout or add waitFor',
            requiresHumanApproval: true,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: 'element is not visible within 5000ms', matchedRule: 'RULE_TIMING' },
          },
          effectiveCategory: 'TIMING_OR_FLAKINESS',
          effectiveConfidence: 0.9,
          explanation: 'element is not visible within 5000ms',
          recommendedAction: 'Increase timeout or add waitFor',
          requiresHumanApproval: true,
          evidence: { errorMessage: 'element is not visible within 5000ms', matchedRule: 'RULE_TIMING' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-TIME-001',
      requirement,
      orchestrationResult: orchResult,
      rcaAnalysis: rca,
    });

    expect(report.metrics.passRate).toBe(90.0);
    expect(report.releaseRecommendation).toBe('CONDITIONAL_GO');
    expect(report.recommendationRationale).toContain('Conditional Release');
    expect(report.recommendationRationale).toContain('asynchronous timing/flakiness');
    expect(report.recommendationRationale).toContain(
      'A timing/flakiness failure must never produce unconditional GO while the failure remains unresolved'
    );
    expect(report.releaseRecommendation).not.toBe('GO');
  });

  test('TC-VAL-QUAL-017: Multi-category defect clustering generates distinct clusters with accurate counts and scenario lists', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_FAILED',
    });

    // 2 distinct RCA categories: 1 PRODUCT_DEFECT and 1 ENVIRONMENT_OR_NETWORK
    const rca: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 4,
        passed: 2,
        failed: 2,
        skipped: 0,
        flaky: 0,
        durationMs: 6000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 2,
      analyses: [
        {
          failureId: 'TC-PROD-01',
          testId: 'TC-PROD-01',
          testTitle: 'Cart total bug',
          deterministicClassification: {
            testId: 'TC-PROD-01',
            category: 'PRODUCT_DEFECT',
            confidence: 0.95,
            classificationSource: 'DETERMINISTIC',
            explanation: 'HTTP 500 Internal Server Error',
            recommendedAction: 'File bug',
            requiresHumanApproval: true,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: '500 error', matchedRule: 'RULE_PROD' },
          },
          effectiveCategory: 'PRODUCT_DEFECT',
          effectiveConfidence: 0.95,
          explanation: 'HTTP 500 Internal Server Error',
          recommendedAction: 'File bug',
          requiresHumanApproval: true,
          evidence: { errorMessage: '500 error', matchedRule: 'RULE_PROD' },
          status: 'DETERMINISTIC_ONLY',
        },
        {
          failureId: 'TC-NET-01',
          testId: 'TC-NET-01',
          testTitle: 'Payment gateway timeout',
          deterministicClassification: {
            testId: 'TC-NET-01',
            category: 'ENVIRONMENT_OR_NETWORK',
            confidence: 0.95,
            classificationSource: 'DETERMINISTIC',
            explanation: 'net::ERR_CONNECTION_RESET',
            recommendedAction: 'Retry network',
            requiresHumanApproval: false,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: 'net::ERR_CONNECTION_RESET', matchedRule: 'RULE_NET' },
          },
          effectiveCategory: 'ENVIRONMENT_OR_NETWORK',
          effectiveConfidence: 0.95,
          explanation: 'net::ERR_CONNECTION_RESET',
          recommendedAction: 'Retry network',
          requiresHumanApproval: false,
          evidence: { errorMessage: 'net::ERR_CONNECTION_RESET', matchedRule: 'RULE_NET' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-MULTI-CLUSTER-001',
      requirement,
      orchestrationResult: orchResult,
      rcaAnalysis: rca,
    });

    expect(report.defectClusters.length).toBe(2);

    const prodCluster = report.defectClusters.find(c => c.primaryCategory === 'PRODUCT_DEFECT');
    expect(prodCluster).toBeDefined();
    expect(prodCluster?.failureCount).toBe(1);
    expect(prodCluster?.affectedScenarios).toEqual(['TC-PROD-01']);

    const netCluster = report.defectClusters.find(c => c.primaryCategory === 'ENVIRONMENT_OR_NETWORK');
    expect(netCluster).toBeDefined();
    expect(netCluster?.failureCount).toBe(1);
    expect(netCluster?.affectedScenarios).toEqual(['TC-NET-01']);
  });

  test('TC-VAL-QUAL-018: Zero executed tests produces zero-division-protected rates (no NaN/Infinity) and enforces strict NO_GO', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_GATE2_PENDING',
      executionResult: undefined,
      executionSummary: {
        totalScenarios: 0,
        automated: 0,
        manualReviewRequired: 0,
        skipped: 0,
        reusedPageObjects: [],
        reusedApiClients: [],
      },
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-ZERO-TESTS-001',
      requirement,
      orchestrationResult: orchResult,
      designOutput: {
        requirement,
        scenarios: [],
        missingOrAmbiguousRequirements: [],
        designTechniquesApplied: [],
        metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
      },
    });

    expect(report.metrics.totalTests).toBe(0);
    expect(report.metrics.passed).toBe(0);
    expect(report.metrics.failed).toBe(0);
    expect(report.metrics.passRate).toBe(0);
    expect(Number.isFinite(report.metrics.passRate)).toBe(true);
    expect(isNaN(report.metrics.passRate)).toBe(false);
    expect(report.metrics.failureRate).toBe(0);
    expect(Number.isFinite(report.metrics.failureRate)).toBe(true);
    expect(isNaN(report.metrics.failureRate)).toBe(false);
    expect(report.metrics.coverage.coverageRate).toBe(0);
    expect(Number.isFinite(report.metrics.coverage.coverageRate)).toBe(true);

    // Rule: Zero tests executed must never result in an unsafe GO
    expect(report.releaseRecommendation).toBe('NO_GO');
    expect(report.recommendationRationale).toContain('Release blocked');
  });

  test('TC-VAL-QUAL-019: Correlated RCA runSummary takes precedence over scenario-count estimates for executed tests', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qual-rca-prec-'));
    const rcaReportFile = path.join(tempDir, 'rca-report-EXEC-PREC-001.json');

    try {
      // Create actual Playwright RCA report on disk: 6 executed tests (all passed)
      const verifiedReport = {
        executionId: 'EXEC-PREC-001',
        generatedAt: new Date().toISOString(),
        runSummary: {
          totalTests: 6,
          passed: 6,
          failed: 0,
          flaky: 0,
          skipped: 0,
          durationMs: 3800,
          status: 'passed',
        },
        failures: [],
      };
      fs.writeFileSync(rcaReportFile, JSON.stringify(verifiedReport));

      const requirement = createMockRequirement();
      // Design output claims only 2 scenarios, but actual execution ran 6 tests
      const design = createMockDesignOutput();
      const orchResult = createMockOrchestrationResult({
        status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
        executionResult: {
          executionId: 'EXEC-PREC-001',
          status: 'PASSED',
          exitCode: 0,
          testFile: 'tests/generated/checkout.spec.ts',
          project: 'Google Chrome',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 3800,
          stdout: '',
          stderr: '',
          rcaReportPath: rcaReportFile,
          commandExecuted: 'playwright test',
        },
      });

      const metrics = agent.calculateMetrics({
        pipelineId: 'PIPE-PREC-001',
        requirement,
        orchestrationResult: orchResult,
        designOutput: design,
        executionResult: orchResult.executionResult,
      });

      // Must use actual verified file telemetry (6 tests), NOT design scenario count (2 tests)
      expect(metrics.totalTests).toBe(6);
      expect(metrics.passed).toBe(6);
      expect(metrics.failed).toBe(0);
      expect(metrics.passRate).toBe(100.0);
      expect(metrics.executionDurationMs).toBe(3800);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('TC-VAL-QUAL-020: Verifies PipelineReporter includes the generated Agent 6 dashboard path when qualityReportPath is provided', async () => {
    const pipeReport = PipelineReporter.writeReport({
      pipelineId: 'PIPE-DASH-LINK-TEST',
      requirementId: 'REQ-QUAL-001',
      requirementTitle: 'Checkout Flow',
      requirementDescription: 'Verify payment processing',
      status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
      executionMode: 'DETERMINISTIC_FALLBACK',
      provider: 'ModelFreeFallbackProvider',
      gate1: { status: 'APPROVED' },
      gate2: { status: 'APPROVED' },
      scenarioCount: 2,
      generatedFiles: ['tests/generated/checkout.spec.ts'],
      qualityReportPath: 'reports/quality/quality-summary-PIPE-DASH-LINK-TEST.md',
      durationMs: 1500,
      timestamp: new Date().toISOString(),
      reportPaths: { json: '', markdown: '' },
    });

    try {
      expect(fs.existsSync(pipeReport.markdownPath)).toBe(true);
      const markdown = fs.readFileSync(pipeReport.markdownPath, 'utf8');

      // Pipeline markdown report must contain the Executive Quality Dashboard (Agent 6) link
      expect(markdown).toContain(
        '- **Executive Quality Dashboard (Agent 6)**: `reports/quality/quality-summary-PIPE-DASH-LINK-TEST.md`'
      );
    } finally {
      if (fs.existsSync(pipeReport.markdownPath)) fs.unlinkSync(pipeReport.markdownPath);
      if (fs.existsSync(pipeReport.jsonPath)) fs.unlinkSync(pipeReport.jsonPath);
    }
  });

  test('TC-VAL-QUAL-021: Strict NO_GO invariants remain intact when TIMING_OR_FLAKINESS coincides with PRODUCT_DEFECT or sub-85% pass rate', async () => {
    const requirement = createMockRequirement();

    // Case A: 1 TIMING_OR_FLAKINESS + 1 PRODUCT_DEFECT (pass rate 80%) -> Strict NO_GO
    const rcaProdAndTiming: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        flaky: 0,
        durationMs: 9000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 2,
      analyses: [
        {
          failureId: 'TC-T1',
          testId: 'TC-T1',
          testTitle: 'Flaky test',
          deterministicClassification: {
            testId: 'TC-T1',
            category: 'TIMING_OR_FLAKINESS',
            confidence: 0.9,
            classificationSource: 'DETERMINISTIC',
            explanation: '',
            recommendedAction: '',
            requiresHumanApproval: true,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: '', matchedRule: '' },
          },
          effectiveCategory: 'TIMING_OR_FLAKINESS',
          effectiveConfidence: 0.9,
          explanation: '',
          recommendedAction: '',
          requiresHumanApproval: true,
          evidence: { errorMessage: '', matchedRule: '' },
          status: 'DETERMINISTIC_ONLY',
        },
        {
          failureId: 'TC-P1',
          testId: 'TC-P1',
          testTitle: 'Product bug',
          deterministicClassification: {
            testId: 'TC-P1',
            category: 'PRODUCT_DEFECT',
            confidence: 0.95,
            classificationSource: 'DETERMINISTIC',
            explanation: '',
            recommendedAction: '',
            requiresHumanApproval: true,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: '', matchedRule: '' },
          },
          effectiveCategory: 'PRODUCT_DEFECT',
          effectiveConfidence: 0.95,
          explanation: '',
          recommendedAction: '',
          requiresHumanApproval: true,
          evidence: { errorMessage: '', matchedRule: '' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const reportA = await agent.generateQualityReport({
      pipelineId: 'PIPE-FLAKY-PROD',
      requirement,
      orchestrationResult: createMockOrchestrationResult({ status: 'GENERATION_SUCCESS_EXECUTION_FAILED' }),
      rcaAnalysis: rcaProdAndTiming,
    });

    expect(reportA.releaseRecommendation).toBe('NO_GO');
    expect(reportA.recommendationRationale).toContain('PRODUCT_DEFECT');

    // Case B: TIMING_OR_FLAKINESS with pass rate 70% (< 85%) -> Strict NO_GO
    const rcaLowRateTiming: RcaAnalysisOutput = {
      runSummary: {
        totalTests: 10,
        passed: 7,
        failed: 3,
        skipped: 0,
        flaky: 0,
        durationMs: 9000,
        status: 'failed',
      },
      totalFailuresAnalyzed: 1,
      analyses: [
        {
          failureId: 'TC-T1',
          testId: 'TC-T1',
          testTitle: 'Flaky test',
          deterministicClassification: {
            testId: 'TC-T1',
            category: 'TIMING_OR_FLAKINESS',
            confidence: 0.9,
            classificationSource: 'DETERMINISTIC',
            explanation: '',
            recommendedAction: '',
            requiresHumanApproval: true,
            timestamp: new Date().toISOString(),
            evidence: { errorMessage: '', matchedRule: '' },
          },
          effectiveCategory: 'TIMING_OR_FLAKINESS',
          effectiveConfidence: 0.9,
          explanation: '',
          recommendedAction: '',
          requiresHumanApproval: true,
          evidence: { errorMessage: '', matchedRule: '' },
          status: 'DETERMINISTIC_ONLY',
        },
      ],
      metadata: { timestamp: '', executionMode: 'DETERMINISTIC_FALLBACK', provider: '' },
    };

    const reportB = await agent.generateQualityReport({
      pipelineId: 'PIPE-FLAKY-LOW-RATE',
      requirement,
      orchestrationResult: createMockOrchestrationResult({ status: 'GENERATION_SUCCESS_EXECUTION_FAILED' }),
      rcaAnalysis: rcaLowRateTiming,
    });

    expect(reportB.releaseRecommendation).toBe('NO_GO');
    expect(reportB.recommendationRationale).toContain('below the mandatory 85.0% release threshold');
  });

  test('TC-VAL-QUAL-022: Recommends CONDITIONAL_GO (prohibits unconditional GO) when historical passRateTrajectory is DEGRADING despite 100% current pass', async () => {
    const requirement = createMockRequirement();
    const design = createMockDesignOutput();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
      executionResult: {
        executionId: 'EXEC-TEST-PASS-DEGRADE',
        status: 'PASSED',
        exitCode: 0,
        testFile: 'tests/generated/checkout.spec.ts',
        project: 'Google Chrome',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 3500,
        stdout: '',
        stderr: '',
        commandExecuted: 'playwright test checkout.spec.ts',
      },
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-DEGRADE-001',
      requirement,
      orchestrationResult: orchResult,
      designOutput: design,
      historicalTrends: {
        runsAnalyzed: 10,
        averagePassRate: 50.0,
        passRateTrajectory: 'DEGRADING',
        recurrentFailures: [],
        flakyWatchlist: [],
        excludedFaultInjectionRuns: 0,
      },
    });

    expect(report.releaseRecommendation).toBe('CONDITIONAL_GO');
    expect(report.recommendationRationale).toContain('Conditional Release');
    expect(report.recommendationRationale).toContain('historical pass rate trajectory is DEGRADING');
    expect(report.outstandingRisks.some(r => r.includes('DEGRADING') || r.includes('Historical test pass rate trajectory'))).toBe(true);
    expect(report.recommendedNextActions.some(a => a.includes('Lead Quality Engineer sign-off') || a.includes('investigation'))).toBe(true);
  });

  test('TC-VAL-QUAL-023: Recommends CONDITIONAL_GO when historical recurrentFailures contain unclassified UNKNOWN failures despite 100% current pass', async () => {
    const requirement = createMockRequirement();
    const design = createMockDesignOutput();
    const orchResult = createMockOrchestrationResult({
      status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
      executionResult: {
        executionId: 'EXEC-TEST-PASS-RECURRENT',
        status: 'PASSED',
        exitCode: 0,
        testFile: 'tests/generated/checkout.spec.ts',
        project: 'Google Chrome',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 3500,
        stdout: '',
        stderr: '',
        commandExecuted: 'playwright test checkout.spec.ts',
      },
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-RECURRENT-UNK-001',
      requirement,
      orchestrationResult: orchResult,
      designOutput: design,
      historicalTrends: {
        runsAnalyzed: 5,
        averagePassRate: 85.0,
        passRateTrajectory: 'STABLE',
        recurrentFailures: [
          {
            testId: 'TC-API-UNKNOWN-HOTSPOT',
            testTitle: 'API Subscribe Post',
            failureCount: 3,
            categories: ['UNKNOWN'],
          },
        ],
        flakyWatchlist: [],
        excludedFaultInjectionRuns: 0,
      },
    });

    expect(report.releaseRecommendation).toBe('CONDITIONAL_GO');
    expect(report.recommendationRationale).toContain('recurrent failure hotspot');
    expect(report.recommendationRationale).toContain('UNKNOWN');
    expect(report.outstandingRisks.some(r => r.includes('UNKNOWN') && r.includes('TC-API-UNKNOWN-HOTSPOT'))).toBe(true);
  });

  test('TC-VAL-QUAL-024: PipelineReporter displays test count from qualityReport metrics when rcaAnalysis is undefined (passing run)', async () => {
    const pipeReport = PipelineReporter.writeReport({
      pipelineId: 'PIPE-COUNT-TEST-001',
      requirementId: 'REQ-AE-SUB-001',
      requirementTitle: 'Newsletter Subscription',
      requirementDescription: 'Subscribe newsletter with valid email',
      status: 'GENERATION_SUCCESS_EXECUTION_PASSED',
      executionMode: 'DETERMINISTIC_FALLBACK',
      provider: 'ModelFreeFallbackProvider',
      gate1: { status: 'APPROVED' },
      gate2: { status: 'APPROVED' },
      scenarioCount: 1, // Scenario count is 1, but actual executed tests were 3!
      generatedFiles: ['tests/generated/newsletter.spec.ts'],
      executionId: 'EXEC-TEST-COUNT-001',
      qualityReport: {
        reportId: 'QUAL-COUNT-TEST-001',
        pipelineId: 'PIPE-COUNT-TEST-001',
        requirementId: 'REQ-AE-SUB-001',
        timestamp: new Date().toISOString(),
        releaseRecommendation: 'GO',
        recommendationRationale: 'All passed',
        metrics: {
          totalTests: 3,
          passed: 3,
          failed: 0,
          flaky: 0,
          skipped: 0,
          passRate: 100.0,
          failureRate: 0.0,
          executionDurationMs: 4200,
          coverage: {
            totalScenarios: 1,
            automated: 1,
            manualReviewRequired: 0,
            skipped: 0,
            coverageRate: 100.0,
          },
          rcaDistribution: {
            PRODUCT_DEFECT: 0,
            TEST_SCRIPT_DEFECT: 0,
            LOCATOR_OR_UI_CHANGE: 0,
            ENVIRONMENT_OR_NETWORK: 0,
            TIMING_OR_FLAKINESS: 0,
            TEST_DATA_OR_STATE: 0,
            THIRD_PARTY_DEPENDENCY: 0,
            UNKNOWN: 0,
          },
          proposals: {
            total: 0,
            proposed: 0,
            pendingHumanApprovals: 0,
            needsInvestigation: 0,
            noAction: 0,
            riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
          },
        },
        historicalTrends: {
          runsAnalyzed: 5,
          averagePassRate: 100.0,
          passRateTrajectory: 'STABLE',
          recurrentFailures: [],
          flakyWatchlist: [],
          excludedFaultInjectionRuns: 0,
        },
        defectClusters: [],
        outstandingRisks: [],
        recommendedNextActions: [],
        releaseSignOff: {
          status: 'PENDING',
          decision: 'GO',
          reviewNotes: 'Proposal-Only Governance',
        },
        reportPaths: { json: '', markdown: '', latestMarkdown: '' },
        metadata: {
          provider: 'Fallback',
          executionMode: 'DETERMINISTIC_FALLBACK',
          narrativeSource: 'DETERMINISTIC_HEURISTIC',
        },
        executiveNarrative: 'Test passed',
      },
      durationMs: 5000,
      timestamp: new Date().toISOString(),
      reportPaths: { json: '', markdown: '' },
    });

    try {
      expect(fs.existsSync(pipeReport.markdownPath)).toBe(true);
      const markdown = fs.readFileSync(pipeReport.markdownPath, 'utf8');

      // Markdown must show 3 total, 3 passed, 0 failed, 0 flaky, and 0 skipped from qualityReport.metrics
      expect(markdown).toContain('| Total Tests | Passed | Failed | Flaky | Skipped | Runner Status |');
      expect(markdown).toContain('| **3** | 🟢 **3** | 🔴 **0** | 🟡 **0** | ⚪ **0** | `passed` |');
      expect(markdown).not.toContain('Test execution was not initiated for this run');

      // Standalone pipeline report JSON must have populated reportPaths
      const writtenJson = JSON.parse(fs.readFileSync(pipeReport.jsonPath, 'utf8'));
      expect(writtenJson.reportPaths.json).toBe(pipeReport.jsonPath);
      expect(writtenJson.reportPaths.markdown).toBe(pipeReport.markdownPath);
    } finally {
      if (fs.existsSync(pipeReport.markdownPath)) fs.unlinkSync(pipeReport.markdownPath);
      if (fs.existsSync(pipeReport.jsonPath)) fs.unlinkSync(pipeReport.jsonPath);
    }
  });

  test('TC-VAL-QUAL-025: Agent 6 populates reportPaths before writing quality-summary JSON to disk', async () => {
    const requirement = createMockRequirement();
    const orchResult = createMockOrchestrationResult({
      pipelineId: 'PIPE-PATHS-VERIFY-001',
    });

    const report = await agent.generateQualityReport({
      pipelineId: 'PIPE-PATHS-VERIFY-001',
      requirement,
      orchestrationResult: orchResult,
    });

    try {
      expect(fs.existsSync(report.reportPaths.json)).toBe(true);
      const jsonContent = JSON.parse(fs.readFileSync(report.reportPaths.json, 'utf8'));
      expect(jsonContent.reportPaths).toBeDefined();
      expect(jsonContent.reportPaths.json).toBe(report.reportPaths.json);
      expect(jsonContent.reportPaths.markdown).toBe(report.reportPaths.markdown);
      expect(jsonContent.reportPaths.latestMarkdown).toBe(report.reportPaths.latestMarkdown);
      expect(jsonContent.reportPaths.json.length).toBeGreaterThan(0);
      expect(jsonContent.reportPaths.markdown.length).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(report.reportPaths.json)) fs.unlinkSync(report.reportPaths.json);
      if (fs.existsSync(report.reportPaths.markdown)) fs.unlinkSync(report.reportPaths.markdown);
    }
  });
});
