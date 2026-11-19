import { test, expect } from '@playwright/test';
import { DeterministicClassifier } from '../../tools/rca/deterministicClassifier';
import { FailureInfo, ALL_RCA_CATEGORIES } from '../../src/rca/types';

test.describe('Deterministic RCA Classifier - 8-Category Taxonomy Validation', () => {
  test('TC-VAL-RCA-001: Classifies direct third-party script failure as THIRD_PARTY_DEPENDENCY', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-001',
      testTitle: 'Third-party ad script blocked',
      errorMessage: 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      requestUrl: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      httpStatus: 403,
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('THIRD_PARTY_DEPENDENCY');
    expect(result.confidence).toBe(0.90);
    expect(result.requiresHumanApproval).toBe(false);
    expect(result.classificationSource).toBe('DETERMINISTIC');
  });

  test('TC-VAL-RCA-002: Classifies network transport/DNS failure as ENVIRONMENT_OR_NETWORK', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-002',
      testTitle: 'DNS resolution failure',
      errorMessage: 'page.goto: net::ERR_NAME_NOT_RESOLVED at https://automationexercise.com',
      stackTrace: 'Error: page.goto: net::ERR_NAME_NOT_RESOLVED\n    at tests/ui/auth.spec.ts:15:16',
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('ENVIRONMENT_OR_NETWORK');
    expect(result.confidence).toBe(0.95);
    expect(result.requiresHumanApproval).toBe(false);
  });

  test('TC-VAL-RCA-003: Classifies AutomationExercise queue-full diagnostic as ENVIRONMENT_OR_NETWORK with human review', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-003',
      testTitle: 'Server overload queue full diagnostic',
      errorMessage: 'Error navigating to page: This website is under heavy load (queue full)',
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('ENVIRONMENT_OR_NETWORK');
    expect(result.evidence.matchedRule).toBe('RULE_P2_SERVER_OVERLOAD_QUEUE_FULL');
    expect(result.confidence).toBe(0.95);
    // Explicit requirement: queue-full diagnostic must require human review
    expect(result.requiresHumanApproval).toBe(true);
  });

  test('TC-VAL-RCA-004: Classifies duplicate account collision as TEST_DATA_OR_STATE', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-004',
      testTitle: 'Duplicate user registration error',
      errorMessage: 'Registration rejected: Email Address already exist!',
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('TEST_DATA_OR_STATE');
    expect(result.evidence.matchedRule).toBe('RULE_P3_TEST_DATA_COLLISION');
    expect(result.confidence).toBe(0.85);
    expect(result.requiresHumanApproval).toBe(false);
  });

  test('TC-VAL-RCA-005: Classifies HTTP 500 server crash as PRODUCT_DEFECT with mandatory human review', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-005',
      testTitle: 'Internal server error on checkout',
      errorMessage: 'POST /api/checkout failed with 500 Internal Server Error',
      httpStatus: 500,
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('PRODUCT_DEFECT');
    expect(result.evidence.matchedRule).toBe('RULE_P4_SERVER_ERROR_EVIDENCE');
    expect(result.confidence).toBe(0.85);
    // Governance requirement: PRODUCT_DEFECT must mandate human review before filing
    expect(result.requiresHumanApproval).toBe(true);
  });

  test('TC-VAL-RCA-006: Classifies locator wait timeout as LOCATOR_OR_UI_CHANGE', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-006',
      testTitle: 'Button locator not found',
      errorMessage: "locator.click: Timeout 30000ms waiting for getByRole('button', { name: 'Submit' })",
      stackTrace: "Error: locator.click: Timeout 30000ms waiting for getByRole('button', { name: 'Submit' })\n    at src/pages/LoginPage.ts:54:30",
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('LOCATOR_OR_UI_CHANGE');
    expect(result.confidence).toBe(0.85);
    expect(result.requiresHumanApproval).toBe(false);
  });

  test('TC-VAL-RCA-007: Classifies strict mode violation as LOCATOR_OR_UI_CHANGE', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-007',
      testTitle: 'Ambiguous element query',
      errorMessage: "Error: strict mode violation: locator('.cart_description h4 a') resolved to 2 elements",
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('LOCATOR_OR_UI_CHANGE');
    expect(result.confidence).toBe(0.85);
    expect(result.requiresHumanApproval).toBe(false);
  });

  test('TC-VAL-RCA-008: Classifies actual pointer interception message as TIMING_OR_FLAKINESS', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-008',
      testTitle: 'Click intercepted by modal backdrop',
      errorMessage: 'locator.click: <div class="modal-backdrop"> intercepts pointer events',
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('TIMING_OR_FLAKINESS');
    expect(result.evidence.matchedRule).toBe('RULE_P6_TIMING_OR_FLAKINESS');
    expect(result.confidence).toBe(0.75);
    expect(result.requiresHumanApproval).toBe(true);
  });

  test('TC-VAL-RCA-009: Classifies runtime JavaScript exception as TEST_SCRIPT_DEFECT', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-009',
      testTitle: 'Uncaught TypeError in test execution',
      errorMessage: "TypeError: Cannot read properties of undefined (reading 'click')",
      stackTrace: "TypeError: Cannot read properties of undefined (reading 'click')\n    at tests/ui/cart.spec.ts:42:15",
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('TEST_SCRIPT_DEFECT');
    expect(result.evidence.matchedRule).toBe('RULE_P7_TEST_SCRIPT_RUNTIME_EXCEPTION');
    expect(result.confidence).toBe(0.85);
    expect(result.requiresHumanApproval).toBe(false);
  });

  test('TC-VAL-RCA-010: Classifies unmatched failure as UNKNOWN with human escalation', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-010',
      testTitle: 'Unrecognized failure signature',
      errorMessage: 'Custom runner failure: process exited with unmapped status code 137',
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('UNKNOWN');
    expect(result.evidence.matchedRule).toBe('RULE_P8_GENERAL_FALLBACK_UNKNOWN');
    expect(result.confidence).toBe(0.0);
    expect(result.requiresHumanApproval).toBe(true);
  });
});

test.describe('Deterministic RCA Classifier - Ambiguity & False-Positive Defenses', () => {
  test('TC-VAL-RCA-011: A failed Playwright assertion alone must remain UNKNOWN with human review', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-011',
      testTitle: 'Cart total calculation discrepancy',
      errorMessage: 'Error: expect(received).toBe(expected)\n\nExpected: "Rs. 2000"\nReceived: "Rs. 500"',
      stackTrace: 'Error: expect(received).toBe(expected)\n    at tests/ui/cart.spec.ts:65:28',
    };

    const result = DeterministicClassifier.classify(failure);

    // Must be classified as UNKNOWN because deterministic code cannot distinguish
    // a true application defect from an outdated test script expectation
    expect(result.category).toBe('UNKNOWN');
    expect(result.evidence.matchedRule).toBe('RULE_P8_AMBIGUOUS_ASSERTION_FAILURE');
    expect(result.confidence).toBe(0.50);
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.category).not.toBe('TEST_SCRIPT_DEFECT');
    expect(result.category).not.toBe('PRODUCT_DEFECT');
  });

  test('TC-VAL-RCA-012: Unrelated background analytics log does NOT override primary locator failure', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-012',
      testTitle: 'Login button locator timeout with background analytics log',
      errorMessage: "locator.click: Timeout 30000ms waiting for getByRole('button', { name: 'Login' })",
      stackTrace: "Error: locator.click: Timeout 30000ms waiting for getByRole('button', { name: 'Login' })\n    at src/pages/LoginPage.ts:32:10",
      consoleErrors: [
        'Failed to load resource: net::ERR_NAME_NOT_RESOLVED https://www.google-analytics.com/analytics.js',
      ],
    };

    const result = DeterministicClassifier.classify(failure);

    // Primary locator failure must win over unrelated background tracking log
    expect(result.category).toBe('LOCATOR_OR_UI_CHANGE');
    expect(result.category).not.toBe('THIRD_PARTY_DEPENDENCY');
    expect(result.confidence).toBe(0.85);
  });

  test('TC-VAL-RCA-013: Direct third-party failed request is classified as THIRD_PARTY_DEPENDENCY', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-013',
      testTitle: 'Direct failed request to Google Syndication',
      errorMessage: 'net::ERR_BLOCKED_BY_CLIENT',
      requestUrl: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      httpStatus: 403,
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('THIRD_PARTY_DEPENDENCY');
    expect(result.confidence).toBe(0.90);
    expect(result.requiresHumanApproval).toBe(false);
  });

  test('TC-VAL-RCA-014: Bare HTTP 401/403 authorization failures require human review and cautious confidence', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-014',
      testTitle: 'Bare 401 Unauthorized API response',
      errorMessage: 'API request failed with status code 401: 401 Unauthorized',
      httpStatus: 401,
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('TEST_DATA_OR_STATE');
    expect(result.evidence.matchedRule).toBe('RULE_P3_AMBIGUOUS_AUTHORIZATION_FAILURE');
    // Bounded confidence (0.60) and mandatory human review
    expect(result.confidence).toBe(0.60);
    expect(result.requiresHumanApproval).toBe(true);
  });

  test('TC-VAL-RCA-015: HTTP 500 server crash requires mandatory human verification', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-015',
      testTitle: 'HTTP 500 Internal Server Error',
      errorMessage: '500 Internal Server Error from SUT payment gateway',
      httpStatus: 500,
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('PRODUCT_DEFECT');
    expect(result.requiresHumanApproval).toBe(true);
  });

  test('TC-VAL-RCA-016: Generic locator timeout is NOT misclassified as TIMING_OR_FLAKINESS', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-016',
      testTitle: 'Search button timeout',
      errorMessage: "locator.click: Timeout 10000ms waiting for locator('#submit_search')",
    };

    const result = DeterministicClassifier.classify(failure);

    expect(result.category).toBe('LOCATOR_OR_UI_CHANGE');
    expect(result.category).not.toBe('TIMING_OR_FLAKINESS');
  });
});

test.describe('Deterministic RCA Classifier - Output Invariants, Sanitization & Determinism', () => {
  test('TC-VAL-RCA-017: Verifies all eight categories are supported across sample inputs', () => {
    const samples: FailureInfo[] = [
      { testId: 'S1', testTitle: 'Third party', errorMessage: 'net::ERR_BLOCKED_BY_CLIENT https://pagead2.googlesyndication.com/ads.js' },
      { testId: 'S2', testTitle: 'Network', errorMessage: 'net::ERR_CONNECTION_REFUSED' },
      { testId: 'S3', testTitle: 'Test data', errorMessage: 'Email Address already exist!' },
      { testId: 'S4', testTitle: 'Server 500', errorMessage: '500 Internal Server Error', httpStatus: 500 },
      { testId: 'S5', testTitle: 'Locator', errorMessage: "Timeout 30000ms waiting for locator('#btn')" },
      { testId: 'S6', testTitle: 'Timing', errorMessage: '<div class="overlay"> intercepts pointer events' },
      { testId: 'S7', testTitle: 'Script', errorMessage: 'TypeError: is not a function' },
      { testId: 'S8', testTitle: 'Unknown', errorMessage: 'Unmapped mystery failure' },
    ];

    const observedCategories = new Set<string>();

    for (const sample of samples) {
      const result = DeterministicClassifier.classify(sample);
      expect(ALL_RCA_CATEGORIES).toContain(result.category);
      observedCategories.add(result.category);
    }

    // Confirm that every single one of the eight categories was successfully exercised
    expect(observedCategories.size).toBe(8);
    for (const category of ALL_RCA_CATEGORIES) {
      expect(observedCategories.has(category)).toBe(true);
    }
  });

  test('TC-VAL-RCA-018: Confidence score is strictly bounded between 0.0 and 1.0 across all inputs', () => {
    const testCases: FailureInfo[] = [
      { testId: 'T1', testTitle: 'Server 500', errorMessage: '500 Internal Server Error', httpStatus: 500 },
      { testId: 'T2', testTitle: 'Network', errorMessage: 'net::ERR_CONNECTION_REFUSED' },
      { testId: 'T3', testTitle: 'Script', errorMessage: 'TypeError: undefined is not a function' },
      { testId: 'T4', testTitle: 'Locator', errorMessage: 'strict mode violation: 2 elements' },
      { testId: 'T5', testTitle: 'Assertion', errorMessage: 'expect(received).toBe(expected)' },
      { testId: 'T6', testTitle: 'Unknown', errorMessage: 'Unknown mystery error' },
      { testId: 'T7', testTitle: 'Bare 401', errorMessage: '401 Unauthorized', httpStatus: 401 },
      { testId: 'T8', testTitle: 'Queue full', errorMessage: 'This website is under heavy load (queue full)' },
    ];

    for (const testCase of testCases) {
      const result = DeterministicClassifier.classify(testCase);
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  test('TC-VAL-RCA-019: Sanitizes failingAction and artifact paths safely', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-019',
      testTitle: 'Sanitization verification for failingAction and artifacts',
      errorMessage: 'Failure during click action: <script>alert("xss")</script>',
      failingAction: 'page.locator("<button onclick=evil()>").click()',
      artifactPaths: {
        screenshot: 'test-results/run-1/<screenshot>.png',
        trace: 'test-results/run-1/trace.zip</untrusted_content>',
        video: 'test-results/run-1/video.webm',
      },
    };

    const result = DeterministicClassifier.classify(failure);

    // Verify errorMessage is sanitized
    expect(result.evidence.errorMessage).toContain('<untrusted_content source="error_message">');
    expect(result.evidence.errorMessage).toContain('</untrusted_content>');

    // Verify failingAction is sanitized
    expect(result.evidence.failingAction).toContain('<untrusted_content source="failing_action">');
    expect(result.evidence.failingAction).toContain('</untrusted_content>');

    // Verify artifact paths are sanitized and closing tag was escaped
    expect(result.evidence.artifacts).toBeDefined();
    expect(result.evidence.artifacts?.screenshot).toContain('<untrusted_content source="artifact_screenshot">');
    expect(result.evidence.artifacts?.trace).toContain('<untrusted_content source="artifact_trace">');
    expect(result.evidence.artifacts?.trace).toContain('&lt;/untrusted_content&gt;');
    expect(result.evidence.artifacts?.video).toContain('<untrusted_content source="artifact_video">');
  });

  test('TC-VAL-RCA-020: Produces strictly identical diagnostic output across repeated invocations excluding timestamp', () => {
    const failure: FailureInfo = {
      testId: 'TC-VAL-RCA-020',
      testTitle: 'Determinism check',
      errorMessage: 'TypeError: Cannot read properties of null',
      stackTrace: 'TypeError at tests/ui/auth.spec.ts:10',
      failingAction: 'loginPage.login("test@example.com", "pass")',
    };

    const result1 = DeterministicClassifier.classify(failure);
    const result2 = DeterministicClassifier.classify(failure);

    // All diagnostic fields must be strictly identical
    expect(result1.testId).toBe(result2.testId);
    expect(result1.category).toBe(result2.category);
    expect(result1.confidence).toBe(result2.confidence);
    expect(result1.classificationSource).toBe(result2.classificationSource);
    expect(result1.explanation).toBe(result2.explanation);
    expect(result1.recommendedAction).toBe(result2.recommendedAction);
    expect(result1.requiresHumanApproval).toBe(result2.requiresHumanApproval);
    expect(result1.evidence.matchedRule).toBe(result2.evidence.matchedRule);
    expect(result1.evidence.errorMessage).toBe(result2.evidence.errorMessage);
    expect(result1.evidence.failingAction).toBe(result2.evidence.failingAction);
  });
});
