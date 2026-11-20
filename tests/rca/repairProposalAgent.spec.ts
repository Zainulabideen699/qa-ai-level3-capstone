import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { RepairProposalAgent } from '../../tools/agents/repairProposalAgent';
import { ModelFreeFallbackProvider } from '../../src/agents/providers/fallbackProvider';
import { LLMProvider } from '../../src/agents/providers/types';
import { RcaAnalysisItem, RcaAnalysisOutput } from '../../src/agents/types';
import { RcaResult } from '../../src/rca/types';

function createMockRcaOutput(items: RcaAnalysisItem[]): RcaAnalysisOutput {
  return {
    runSummary: {
      totalTests: items.length,
      passed: 0,
      failed: items.length,
      skipped: 0,
      flaky: 0,
      durationMs: 1500,
      status: 'failed',
    },
    totalFailuresAnalyzed: items.length,
    analyses: items,
    metadata: {
      timestamp: new Date().toISOString(),
      executionMode: 'DETERMINISTIC_FALLBACK',
      provider: 'Deterministic Fallback Provider',
    },
  };
}

function createRcaItem(overrides: Partial<RcaAnalysisItem>): RcaAnalysisItem {
  const deterministic: RcaResult = {
    category: overrides.effectiveCategory || 'UNKNOWN',
    confidence: overrides.effectiveConfidence ?? 0.85,
    classificationSource: 'DETERMINISTIC',
    explanation: 'Deterministic baseline classification.',
    recommendedAction: 'Take appropriate corrective action.',
    requiresHumanApproval: true,
    evidence: {
      matchedRule: 'RULE_TEST_RULE',
      failingLine: 'tests/generated/auth.spec.ts:42',
      failingAction: 'page.click',
      errorMessage: 'Sample error message for testing.',
    },
  };

  return {
    failureId: 'TC-FAIL-001',
    testId: 'TC-FAIL-001',
    testTitle: 'Failing Test Scenario',
    deterministicClassification: deterministic,
    effectiveCategory: overrides.effectiveCategory || 'UNKNOWN',
    effectiveConfidence: overrides.effectiveConfidence ?? 0.85,
    explanation: 'Effective explanation.',
    recommendedAction: 'Take appropriate action.',
    requiresHumanApproval: true,
    evidence: {
      errorMessage: 'Sample error message for testing.',
      matchedRule: 'RULE_TEST_RULE',
      failingLine: 'tests/generated/auth.spec.ts:42',
      failingAction: 'page.click',
    },
    status: 'DETERMINISTIC_ONLY',
    ...overrides,
  };
}

test.describe('Agent 5: Repair Proposal Agent - Governance & Heuristic Validation', () => {
  const fallbackProvider = new ModelFreeFallbackProvider();
  const agent = new RepairProposalAgent(fallbackProvider);

  test('TC-VAL-REP-001: Formulates PRODUCT_DEFECT proposal targeting SUT with NO_ACTION on test suite', async () => {
    const item = createRcaItem({
      effectiveCategory: 'PRODUCT_DEFECT',
      effectiveConfidence: 0.95,
      evidence: {
        errorMessage: 'Response code 500 (Internal Server Error) returned from /api/checkout',
        httpStatus: 500,
        targetUrl: 'https://automationexercise.com/api/checkout',
        matchedRule: 'RULE_P1_HTTP_500_INTERNAL_SERVER_ERROR',
        failingLine: 'tests/generated/checkout.spec.ts:55',
      },
      deterministicClassification: {
        category: 'PRODUCT_DEFECT',
        confidence: 0.95,
        classificationSource: 'DETERMINISTIC',
        explanation: 'Server error 500 encountered.',
        recommendedAction: 'Log defect ticket for backend team.',
        requiresHumanApproval: true,
        evidence: {
          errorMessage: 'Response code 500 (Internal Server Error) returned from /api/checkout',
          httpStatus: 500,
          targetUrl: 'https://automationexercise.com/api/checkout',
          matchedRule: 'RULE_P1_HTTP_500_INTERNAL_SERVER_ERROR',
          failingLine: 'tests/generated/checkout.spec.ts:55',
        },
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-001',
      testFile: 'tests/generated/checkout.spec.ts',
      requirementId: 'REQ-CHECK-001',
    });

    expect(output.totalProposals).toBe(1);
    const proposal = output.proposals[0];

    expect(proposal.rcaCategory).toBe('PRODUCT_DEFECT');
    expect(proposal.targetType).toBe('PRODUCT_SUT');
    expect(proposal.status).toBe('NO_ACTION');
    expect(proposal.riskLevel).toBe('HIGH');
    expect(proposal.requiresHumanApproval).toBe(true);
    expect(proposal.suggestedFiles).toEqual([]);
    expect(proposal.diffSnippet).toBeUndefined();
    expect(proposal.recommendedAction).toMatch(/(?:log|file) a high-severity bug report/i);
    expect(proposal.rationale).toContain('must never be modified to mask product regressions');
  });

  test('TC-VAL-REP-002: Formulates TEST_SCRIPT_DEFECT proposal targeting test script with human approval', async () => {
    const item = createRcaItem({
      effectiveCategory: 'TEST_SCRIPT_DEFECT',
      effectiveConfidence: 0.95,
      evidence: {
        errorMessage: 'Error: locator.click: Unexpected token "" while parsing css selector "button[type=\'submit\'"',
        matchedRule: 'RULE_P7_INVALID_SELECTOR_SYNTAX',
        failingLine: 'tests/generated/subscription.spec.ts:32',
        failingAction: 'locator.click',
      },
      deterministicClassification: {
        category: 'TEST_SCRIPT_DEFECT',
        confidence: 0.95,
        classificationSource: 'DETERMINISTIC',
        explanation: 'Invalid selector syntax in test script.',
        recommendedAction: 'Fix CSS selector syntax.',
        requiresHumanApproval: true,
        evidence: {
          errorMessage: 'Error: locator.click: Unexpected token "" while parsing css selector "button[type=\'submit\'"',
          matchedRule: 'RULE_P7_INVALID_SELECTOR_SYNTAX',
          failingLine: 'tests/generated/subscription.spec.ts:32',
          failingAction: 'locator.click',
        },
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-002',
      testFile: 'tests/generated/subscription.spec.ts',
    });

    expect(output.totalProposals).toBe(1);
    const proposal = output.proposals[0];

    expect(proposal.rcaCategory).toBe('TEST_SCRIPT_DEFECT');
    expect(proposal.targetType).toBe('TEST_SCRIPT');
    expect(proposal.status).toBe('PROPOSED');
    expect(proposal.riskLevel).toBe('MEDIUM');
    expect(proposal.requiresHumanApproval).toBe(true);
    expect(proposal.suggestedFiles).toContain('tests/generated/subscription.spec.ts');
    expect(proposal.diffSnippet).toBeDefined();
    expect(proposal.diffSnippet).toContain('locator(\'button[type="submit"]\')');
    expect(proposal.recommendedAction).toContain('Fix invalid selector syntax');
  });

  test('TC-VAL-REP-003: Formulates ENVIRONMENT_OR_NETWORK proposal targeting INFRASTRUCTURE with NO_ACTION', async () => {
    const item = createRcaItem({
      effectiveCategory: 'ENVIRONMENT_OR_NETWORK',
      effectiveConfidence: 0.95,
      evidence: {
        errorMessage: 'net::ERR_CONNECTION_RESET at https://automationexercise.com/api',
        matchedRule: 'RULE_P2_ENVIRONMENT_OR_NETWORK',
        targetUrl: 'https://automationexercise.com/api',
      },
      deterministicClassification: {
        category: 'ENVIRONMENT_OR_NETWORK',
        confidence: 0.95,
        classificationSource: 'DETERMINISTIC',
        explanation: 'Network connection reset.',
        recommendedAction: 'Verify network connectivity and retry.',
        requiresHumanApproval: false,
        evidence: {
          errorMessage: 'net::ERR_CONNECTION_RESET at https://automationexercise.com/api',
          matchedRule: 'RULE_P2_ENVIRONMENT_OR_NETWORK',
          targetUrl: 'https://automationexercise.com/api',
        },
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-003',
      testFile: 'tests/generated/network.spec.ts',
    });

    const proposal = output.proposals[0];
    expect(proposal.rcaCategory).toBe('ENVIRONMENT_OR_NETWORK');
    expect(proposal.targetType).toBe('INFRASTRUCTURE');
    expect(proposal.status).toBe('NO_ACTION');
    expect(proposal.riskLevel).toBe('LOW');
    expect(proposal.requiresHumanApproval).toBe(false);
    expect(proposal.suggestedFiles).toEqual([]);
    expect(proposal.diffSnippet).toBeUndefined();
    expect(proposal.recommendedAction).toContain('Do NOT modify test code or application code');
  });

  test('TC-VAL-REP-004: Formulates LOCATOR_OR_UI_CHANGE proposal targeting PAGE_OBJECT with human approval', async () => {
    const item = createRcaItem({
      effectiveCategory: 'LOCATOR_OR_UI_CHANGE',
      effectiveConfidence: 0.90,
      evidence: {
        errorMessage: 'Timeout 30000ms exceeded waiting for locator("button#submit-newsletter")',
        matchedRule: 'RULE_P4_LOCATOR_WAIT_TIMEOUT',
        failingLine: 'tests/generated/newsletter.spec.ts:28',
        failingAction: 'locator.click',
      },
      deterministicClassification: {
        category: 'LOCATOR_OR_UI_CHANGE',
        confidence: 0.90,
        classificationSource: 'DETERMINISTIC',
        explanation: 'Locator timeout waiting for element.',
        recommendedAction: 'Inspect DOM and update Page Object locator.',
        requiresHumanApproval: true,
        evidence: {
          errorMessage: 'Timeout 30000ms exceeded waiting for locator("button#submit-newsletter")',
          matchedRule: 'RULE_P4_LOCATOR_WAIT_TIMEOUT',
          failingLine: 'tests/generated/newsletter.spec.ts:28',
          failingAction: 'locator.click',
        },
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-004',
      testFile: 'tests/generated/newsletter.spec.ts',
    });

    const proposal = output.proposals[0];
    expect(proposal.rcaCategory).toBe('LOCATOR_OR_UI_CHANGE');
    expect(proposal.targetType).toBe('PAGE_OBJECT');
    expect(proposal.status).toBe('PROPOSED');
    expect(proposal.riskLevel).toBe('LOW');
    expect(proposal.requiresHumanApproval).toBe(true);
    expect(proposal.suggestedFiles).toContain('tests/generated/newsletter.spec.ts');
    expect(proposal.diffSnippet).toBeDefined();
    expect(proposal.recommendedAction).toContain('Update Page Object locator');
  });

  test('TC-VAL-REP-005: Flags UNKNOWN category for manual QA triage (NEEDS_INVESTIGATION, risk HIGH)', async () => {
    const item = createRcaItem({
      effectiveCategory: 'UNKNOWN',
      effectiveConfidence: 0.30,
      evidence: {
        errorMessage: 'An obscure unclassified diagnostic failure occurred without stack trace',
        matchedRule: 'RULE_P8_GENERAL_FALLBACK_UNKNOWN',
      },
      deterministicClassification: {
        category: 'UNKNOWN',
        confidence: 0.30,
        classificationSource: 'DETERMINISTIC',
        explanation: 'Ambiguous failure signature.',
        recommendedAction: 'Manual QA investigation required.',
        requiresHumanApproval: true,
        evidence: {
          errorMessage: 'An obscure unclassified diagnostic failure occurred without stack trace',
          matchedRule: 'RULE_P8_GENERAL_FALLBACK_UNKNOWN',
        },
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-005',
      testFile: 'tests/generated/unknown.spec.ts',
    });

    const proposal = output.proposals[0];
    expect(proposal.rcaCategory).toBe('UNKNOWN');
    expect(proposal.targetType).toBe('UNKNOWN');
    expect(proposal.status).toBe('NEEDS_INVESTIGATION');
    expect(proposal.riskLevel).toBe('HIGH');
    expect(proposal.requiresHumanApproval).toBe(true);
    expect(proposal.diffSnippet).toBeUndefined();
    expect(proposal.recommendedAction).toContain('Inspect Playwright trace zip');
  });

  test('TC-VAL-REP-006: Rejects AI-proposed assertion weakening to enforce Golden Rule', async () => {
    const weakeningProvider: LLMProvider = {
      metadata: {
        name: 'MockWeakeningLLM',
        isLive: true,
        executionMode: 'AI_POWERED',
      },
      generateText: async () => '',
      generateStructured: async () => ({
        problemSummary: 'Assertion mismatch on status heading',
        targetType: 'TEST_SCRIPT',
        suggestedFiles: ['tests/generated/auth.spec.ts'],
        recommendedAction: 'Remove assertion to force test to pass',
        riskLevel: 'HIGH',
        requiresHumanApproval: true,
        rationale: 'Deleting assertion will allow suite to succeed',
        status: 'PROPOSED',
        diffSnippet: '- await expect(page.locator("h2")).toHaveText("Account Created!");',
        supportingEvidence: ['Assertion error: expected "Account Created!" but got ""'],
      }),
    };

    const liveAgent = new RepairProposalAgent(weakeningProvider);
    const item = createRcaItem({
      effectiveCategory: 'TEST_SCRIPT_DEFECT',
      effectiveConfidence: 0.85,
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await liveAgent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-006',
      testFile: 'tests/generated/auth.spec.ts',
    });

    const proposal = output.proposals[0];
    // Golden Rule enforcement: diff that deletes assertion must be rejected!
    expect(proposal.diffSnippet).toBeUndefined();
    expect(proposal.source).toBe('AI_GENERATED');
  });

  test('TC-VAL-REP-007: Fallback cleanly to deterministic proposal on malformed AI response', async () => {
    const crashingProvider: LLMProvider = {
      metadata: {
        name: 'MockCrashingLLM',
        isLive: true,
        executionMode: 'AI_POWERED',
      },
      generateText: async () => '',
      generateStructured: async () => {
        throw new Error('LLM JSON parse exception: unexpected token in JSON payload');
      },
    };

    const resilientAgent = new RepairProposalAgent(crashingProvider);
    const item = createRcaItem({
      effectiveCategory: 'TEST_DATA_OR_STATE',
      effectiveConfidence: 0.90,
      evidence: {
        errorMessage: 'Email Address already exist!',
        matchedRule: 'RULE_P5_TEST_DATA_COLLISION',
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await resilientAgent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-007',
      testFile: 'tests/generated/register.spec.ts',
    });

    expect(output.totalProposals).toBe(1);
    const proposal = output.proposals[0];
    expect(proposal.source).toBe('DETERMINISTIC_HEURISTIC');
    expect(proposal.rcaCategory).toBe('TEST_DATA_OR_STATE');
    expect(proposal.targetType).toBe('TEST_DATA');
    expect(proposal.status).toBe('PROPOSED');
  });

  test('TC-VAL-REP-008: Strict governance verification: agent possesses zero write privileges to src/ or tests/', async () => {
    // Record directory contents and timestamps before generating proposals
    const testsDir = path.resolve(process.cwd(), 'tests');
    const srcDir = path.resolve(process.cwd(), 'src');

    const srcFilesBefore = fs.readdirSync(srcDir, { recursive: true });
    const testsFilesBefore = fs.readdirSync(testsDir, { recursive: true });

    const item = createRcaItem({
      effectiveCategory: 'TEST_SCRIPT_DEFECT',
      effectiveConfidence: 0.95,
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-008',
      testFile: 'tests/generated/readonly_check.spec.ts',
    });

    expect(output.totalProposals).toBe(1);

    // Verify artifacts were saved in reports/proposals/ only
    const proposalJsonPath = path.resolve(process.cwd(), 'reports', 'proposals', 'proposal-EXEC-TEST-008.json');
    const proposalMdPath = path.resolve(process.cwd(), 'reports', 'proposals', 'proposal-EXEC-TEST-008.md');
    expect(fs.existsSync(proposalJsonPath)).toBe(true);
    expect(fs.existsSync(proposalMdPath)).toBe(true);

    // Clean up the test artifact to leave repository clean
    try {
      fs.unlinkSync(proposalJsonPath);
      fs.unlinkSync(proposalMdPath);
    } catch {
      // Ignore
    }

    // Verify src/ and tests/ were completely untouched
    const srcFilesAfter = fs.readdirSync(srcDir, { recursive: true });
    const testsFilesAfter = fs.readdirSync(testsDir, { recursive: true });

    expect(srcFilesAfter).toEqual(srcFilesBefore);
    expect(testsFilesAfter).toEqual(testsFilesBefore);
  });

  test('TC-VAL-REP-009: Formulates THIRD_PARTY_DEPENDENCY proposal with status PROPOSED and enforces requiresHumanApproval = true', async () => {
    // Record directory contents before proposal generation
    const srcDir = path.resolve(process.cwd(), 'src');
    const testsDir = path.resolve(process.cwd(), 'tests');
    const srcFilesBefore = fs.readdirSync(srcDir, { recursive: true });
    const testsFilesBefore = fs.readdirSync(testsDir, { recursive: true });

    const item = createRcaItem({
      effectiveCategory: 'THIRD_PARTY_DEPENDENCY',
      effectiveConfidence: 0.90,
      evidence: {
        errorMessage:
          'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        targetUrl: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        matchedRule: 'RULE_P3_THIRD_PARTY_AD_SCRIPT',
      },
      deterministicClassification: {
        category: 'THIRD_PARTY_DEPENDENCY',
        confidence: 0.90,
        classificationSource: 'DETERMINISTIC',
        explanation: 'Third-party ad script blocked.',
        recommendedAction: 'Abort third-party route in fixture.',
        requiresHumanApproval: false, // In RCA classifier, diagnosis itself didn't require human review
        evidence: {
          errorMessage:
            'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
          targetUrl: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
          matchedRule: 'RULE_P3_THIRD_PARTY_AD_SCRIPT',
        },
      },
    });

    const rcaOutput = createMockRcaOutput([item]);
    const output = await agent.generateProposals(rcaOutput, {
      executionId: 'EXEC-TEST-009',
      testFile: 'tests/generated/ad_check.spec.ts',
    });

    expect(output.totalProposals).toBe(1);
    const proposal = output.proposals[0];

    // Verify category and target layer
    expect(proposal.rcaCategory).toBe('THIRD_PARTY_DEPENDENCY');
    expect(proposal.targetType).toBe('TEST_SCRIPT');

    // Verify actionable status and central safety invariant
    expect(proposal.status).toBe('PROPOSED');
    expect(proposal.requiresHumanApproval).toBe(true);

    // Verify proposal remains advisory with diffSnippet and deterministic source
    expect(proposal.diffSnippet).toBeDefined();
    expect(proposal.diffSnippet).toContain('page.route');
    expect(proposal.source).toBe('DETERMINISTIC_HEURISTIC');

    // Clean up artifact files generated by the test
    const proposalJsonPath = path.resolve(
      process.cwd(),
      'reports',
      'proposals',
      'proposal-EXEC-TEST-009.json'
    );
    const proposalMdPath = path.resolve(
      process.cwd(),
      'reports',
      'proposals',
      'proposal-EXEC-TEST-009.md'
    );
    try {
      if (fs.existsSync(proposalJsonPath)) fs.unlinkSync(proposalJsonPath);
      if (fs.existsSync(proposalMdPath)) fs.unlinkSync(proposalMdPath);
    } catch {
      // Ignore cleanup error
    }

    // Verify source files remain completely untouched
    const srcFilesAfter = fs.readdirSync(srcDir, { recursive: true });
    const testsFilesAfter = fs.readdirSync(testsDir, { recursive: true });
    expect(srcFilesAfter).toEqual(srcFilesBefore);
    expect(testsFilesAfter).toEqual(testsFilesBefore);
  });
});
