import { LLMProvider, ModelMessage, GenerationOptions, ProviderMetadata } from './types';
import { RequirementInput, TestDesignOutput, TestScenario, AuthoringOutput, GeneratedTestFile } from '../types';

/**
 * Deterministic, model-free Quality Engineering Fallback Engine.
 *
 * Implements the LLMProvider interface without external network requests or API keys.
 * Systematically applies Equivalence Partitioning (EP), Boundary Value Analysis (BVA),
 * and Error Guessing to derive complete, validated test design artifacts and idiomatic
 * Playwright TypeScript automation code for AutomationExercise.
 *
 * Runtime status is explicitly flagged as DETERMINISTIC_FALLBACK (isLive: false).
 */
export class ModelFreeFallbackProvider implements LLMProvider {
  readonly metadata: ProviderMetadata;

  constructor() {
    this.metadata = {
      name: 'Model-Free Quality Engineering Fallback Engine',
      isLive: false,
      executionMode: 'DETERMINISTIC_FALLBACK',
      modelIdentifier: 'deterministic-qe-rules-v1',
    };
  }

  async generateText(messages: ModelMessage[], _options?: GenerationOptions): Promise<string> {
    const userPrompt = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
    return `[ModelFreeFallbackProvider] Processed requirement: ${userPrompt.slice(0, 100)}...`;
  }

  async generateStructured<T>(
    messages: ModelMessage[],
    _schemaDescription: string,
    options?: GenerationOptions
  ): Promise<T> {
    const userMessage = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');

    // Priority 1: Automation Authoring Agent request
    // Explicitly matched via options.task === 'AUTOMATION_AUTHORING' or explicit prompt prefix
    if (
      options?.task === 'AUTOMATION_AUTHORING' ||
      userMessage.startsWith('APPROVED_SCENARIOS:') ||
      userMessage.includes('APPROVED_SCENARIOS:')
    ) {
      const scenarios = this.extractScenarios(userMessage);
      if (!scenarios || scenarios.length === 0) {
        throw new Error(
          '[ModelFreeFallbackProvider] Failed to extract approved scenarios from authoring prompt. Cannot generate tests.'
        );
      }
      const authoringOutput = this.generatePlaywrightTests(scenarios);
      return authoringOutput as unknown as T;
    }

    // Priority 2: Test Design Agent request
    // Explicitly matched via options.task === 'TEST_DESIGN' or explicit prompt prefix
    if (
      options?.task === 'TEST_DESIGN' ||
      userMessage.startsWith('REQUIREMENT_INPUT:') ||
      userMessage.includes('REQUIREMENT_INPUT:')
    ) {
      const requirement = this.extractRequirement(userMessage);
      const testDesign = this.deriveTestScenarios(requirement);
      return testDesign as unknown as T;
    }

    throw new Error(
      `[ModelFreeFallbackProvider] Unrecognized structured generation request. options.task must be 'TEST_DESIGN' or 'AUTOMATION_AUTHORING'.`
    );
  }

  /**
   * Parse RequirementInput from the prompt text or JSON payload.
   */
  private extractRequirement(text: string): RequirementInput {
    try {
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = text.slice(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.requirementId && parsed.title) {
          return parsed as RequirementInput;
        }
      }
    } catch {
      // Fallback to text parsing
    }

    return {
      requirementId: 'REQ-AE-SUB-001',
      title: 'Footer Newsletter Subscription',
      description: 'Users can subscribe to the newsletter by submitting an email in the homepage footer.',
      applicationArea: 'ENG',
      userRole: 'Visitor / Customer',
      acceptanceCriteria: [
        'Footer section displays "SUBSCRIPTION" heading and email input.',
        'Submitting a valid email displays success message "You have been successfully subscribed!".',
        'Submitting empty or invalid email fails HTML5 validation and does not submit.',
      ],
      constraints: ['Must not require user authentication', 'Must not spam server'],
    };
  }

  /**
   * Parse TestScenario array from the prompt text or JSON payload safely.
   */
  private extractScenarios(text: string): TestScenario[] {
    try {
      const startIdx = text.indexOf('[');
      const endIdx = text.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = text.slice(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as TestScenario[];
        }
      }
    } catch {
      // try wrapped pattern
    }

    try {
      const wrappedMatch = text.match(/\{[\s\S]*"scenarios"\s*:\s*(\[[\s\S]*?\])[\s\S]*\}/);
      if (wrappedMatch) {
        const parsed = JSON.parse(wrappedMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as TestScenario[];
        }
      }
    } catch {
      // Fallback
    }

    return [];
  }

  /**
   * Check if a requirement corresponds to the verified newsletter subscription demonstration.
   */
  private isNewsletterRequirement(reqId: string, title?: string, desc?: string): boolean {
    const combined = `${reqId} ${title || ''} ${desc || ''}`.toLowerCase();
    return combined.includes('sub') || combined.includes('newsletter') || combined.includes('subscription');
  }

  /**
   * Systematically derive positive, negative, and edge-case scenarios using EP and BVA.
   */
  private deriveTestScenarios(req: RequirementInput): TestDesignOutput {
    const area = (req.applicationArea || 'GEN').toUpperCase();
    const reqId = req.requirementId || 'REQ-AE-GEN';
    const scenarios: TestScenario[] = [];
    const isNewsletter = this.isNewsletterRequirement(reqId, req.title, req.description);

    if (isNewsletter) {
      // Verified Newsletter Subscription Demonstration Scenarios
      // Scenario 1: Primary Happy Path (Positive Equivalence Class)
      scenarios.push({
        scenarioId: `TC-GEN-${area}-001`,
        requirementId: reqId,
        title: `${req.title} - Successful submission with valid inputs`,
        objective: `Verify that submitting valid inputs satisfies acceptance criteria, displays success confirmation, and retains the user on the homepage.`,
        preconditions: [
          `System Under Test (SUT) is accessible at base URL.`,
          `Target feature interface or component is visibly rendered.`,
        ],
        testSteps: [
          `Navigate to target page containing the ${req.title} interface.`,
          `Locate input controls and enter valid, dynamically generated test data.`,
          `Click submit button to trigger form processing.`,
        ],
        expectedResults: [
          `Newsletter subscription form submits successfully with unique dynamic email.`,
          `Visual confirmation alert is visibly displayed with text 'You have been successfully subscribed!'.`,
          `User remains on the homepage without unintended navigation or URL redirection.`,
          `Global navigation controls remain visible and accessible.`,
        ],
        testType: 'UI',
        priority: 'High',
        tags: [`@${area.toLowerCase()}`, `@smoke`, `@${reqId}`, `@generated`],
        automationFeasibility: 'Automated',
        assumptions: [
          `Target element locators conform to AutomationExercise DOM structure.`,
          `Ad-blocking prevents third-party overlay interception.`,
        ],
        ambiguityNotes: [],
      });

      // Scenario 2: Negative Equivalence Class (Invalid/Malformed Input)
      scenarios.push({
        scenarioId: `TC-GEN-${area}-002`,
        requirementId: reqId,
        title: `${req.title} - Input validation error with malformed data`,
        objective: `Verify that submitting malformed or syntactically invalid input is rejected via HTML5 email validation without submitting the form.`,
        preconditions: [
          `SUT is accessible at base URL.`,
          `Target input field is in initial unmodified state.`,
        ],
        testSteps: [
          `Navigate to target page.`,
          `Enter malformed input (e.g. invalid email format without '@' or domain).`,
          `Attempt to submit form.`,
        ],
        expectedResults: [
          `Email input element enforces HTML5 type='email' attribute specification.`,
          `Submitting malformed email triggers browser validity mismatch (validity.typeMismatch is true, checkValidity() is false).`,
          `Browser validation message is non-empty, preventing form dispatch.`,
          `Success confirmation alert is not visible.`,
          `User remains on the homepage without unintended redirection.`,
        ],
        testType: 'UI',
        priority: 'Medium',
        tags: [`@${area.toLowerCase()}`, `@negative`, `@${reqId}`, `@generated`],
        automationFeasibility: 'Automated',
        assumptions: [`Browser HTML5 validation flags invalid formats prior to network dispatch.`],
        ambiguityNotes: [
          `Exact validation error text may vary between Chromium HTML5 popover and custom application DOM.`,
        ],
      });

      // Scenario 3: Boundary Value Analysis (Empty / Zero-Length Input)
      scenarios.push({
        scenarioId: `TC-GEN-${area}-003`,
        requirementId: reqId,
        title: `${req.title} - Boundary check with empty input submission`,
        objective: `Verify that attempting submission with empty required input fields triggers HTML5 required-field validation and blocks submission.`,
        preconditions: [`Target form is open and input fields are empty.`],
        testSteps: [
          `Navigate to target component.`,
          `Leave required input field completely blank.`,
          `Click submit button.`,
        ],
        expectedResults: [
          `Email input element enforces HTML5 'required' attribute specification.`,
          `Attempting submission with empty input triggers valueMissing validity error (validity.valueMissing is true, checkValidity() is false).`,
          `Browser validation message is non-empty, preventing empty form dispatch.`,
          `Success confirmation alert is not visible.`,
          `User remains on the homepage without unintended redirection.`,
        ],
        testType: 'UI',
        priority: 'Medium',
        tags: [`@${area.toLowerCase()}`, `@boundary`, `@${reqId}`, `@generated`],
        automationFeasibility: 'Automated',
        assumptions: [`Field has 'required' attribute in DOM.`],
        ambiguityNotes: [],
      });
    } else {
      // Generic Systematic Derivation for Unmapped Requirements
      // Marks automation feasibility as ManualReview to prevent selector fabrication in fallback mode
      scenarios.push({
        scenarioId: `TC-GEN-${area}-001`,
        requirementId: reqId,
        title: `${req.title} - Primary functional workflow with valid inputs`,
        objective: `Verify that submitting valid data satisfies requirement acceptance criteria for ${req.title}.`,
        preconditions: [
          `System Under Test (SUT) is accessible at base URL.`,
          `Target feature interface or component is visibly rendered.`,
        ],
        testSteps: [
          `Navigate to target page containing the ${req.title} interface.`,
          `Enter valid test inputs for all required fields.`,
          `Execute primary action (e.g. submit, click, or save).`,
        ],
        expectedResults: [
          `Action completes successfully without unhandled errors.`,
          `Application reflects expected state transition or success feedback.`,
        ],
        testType: 'UI',
        priority: 'High',
        tags: [`@${area.toLowerCase()}`, `@smoke`, `@${reqId}`, `@generated`],
        automationFeasibility: 'ManualReview',
        assumptions: [
          `Target element locators require live DOM inspection or Page Object verification.`,
        ],
        ambiguityNotes: [
          `In deterministic fallback mode, automatic code generation is suspended for unmapped requirements to prevent selector hallucination.`,
        ],
      });

      scenarios.push({
        scenarioId: `TC-GEN-${area}-002`,
        requirementId: reqId,
        title: `${req.title} - Negative validation error with malformed inputs`,
        objective: `Verify that submitting malformed or syntactically invalid data triggers appropriate validation feedback.`,
        preconditions: [
          `SUT is accessible at base URL.`,
          `Target feature interface is in initial unmodified state.`,
        ],
        testSteps: [
          `Navigate to target component.`,
          `Enter invalid or malformed data into required fields.`,
          `Attempt to submit form or trigger action.`,
        ],
        expectedResults: [
          `Submission is blocked and does not succeed.`,
          `Validation error message or client-side feedback is presented.`,
        ],
        testType: 'UI',
        priority: 'Medium',
        tags: [`@${area.toLowerCase()}`, `@negative`, `@${reqId}`, `@generated`],
        automationFeasibility: 'ManualReview',
        assumptions: [`Client or server validation rejects malformed inputs.`],
        ambiguityNotes: [],
      });

      scenarios.push({
        scenarioId: `TC-GEN-${area}-003`,
        requirementId: reqId,
        title: `${req.title} - Boundary check with missing required data`,
        objective: `Verify that attempting action with empty required fields blocks submission.`,
        preconditions: [`Target form or input controls are in empty initial state.`],
        testSteps: [
          `Navigate to target interface.`,
          `Leave required input fields completely blank.`,
          `Trigger submission action.`,
        ],
        expectedResults: [
          `Action is blocked by required-field validation.`,
          `No success response or state change occurs.`,
        ],
        testType: 'UI',
        priority: 'Medium',
        tags: [`@${area.toLowerCase()}`, `@boundary`, `@${reqId}`, `@generated`],
        automationFeasibility: 'ManualReview',
        assumptions: [`Fields have required validation enforcement.`],
        ambiguityNotes: [],
      });
    }

    return {
      requirement: req,
      scenarios,
      missingOrAmbiguousRequirements: isNewsletter
        ? [`Check whether rate-limiting applies to repeated submissions from the same IP/session.`]
        : [`Inspect live DOM structure and Page Objects to verify selectors before automated execution.`],
      designTechniquesApplied: [
        'Equivalence Partitioning (Valid vs Malformed input classes)',
        'Boundary Value Analysis (Empty zero-length submission)',
        'Error Guessing (Unauthenticated guest submission)',
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        executionMode: this.metadata.executionMode,
        provider: this.metadata.name,
        model: this.metadata.modelIdentifier,
      },
    };
  }

  /**
   * Convert approved scenarios into clean, robust Playwright TypeScript test files.
   * Enforces safety governance: refuses to fabricate code for unmapped requirements in deterministic mode.
   */
  private generatePlaywrightTests(scenarios: TestScenario[]): AuthoringOutput {
    const generatedFiles: GeneratedTestFile[] = [];
    let automatedCount = 0;
    let manualReviewCount = 0;
    let skippedCount = 0;

    const primaryReqId = scenarios[0]?.requirementId || 'REQ-UNKNOWN';
    const isNewsletter = this.isNewsletterRequirement(primaryReqId, scenarios[0]?.title);

    if (isNewsletter) {
      // Verified Demonstration: Automated Newsletter Subscription
      const automatedScenarios = scenarios.filter(s => s.automationFeasibility === 'Automated');
      const manualScenarios = scenarios.filter(s => s.automationFeasibility === 'ManualReview');
      const unsupportedScenarios = scenarios.filter(s => s.automationFeasibility === 'Unsupported');

      automatedCount = automatedScenarios.length;
      manualReviewCount = manualScenarios.length;
      skippedCount = unsupportedScenarios.length;

      if (automatedScenarios.length > 0) {
        const safeReqId = primaryReqId.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filename = `generated_${safeReqId}.spec.ts`;
        const code = this.buildPlaywrightSpecCode(automatedScenarios);

        generatedFiles.push({
          filename,
          filePath: `tests/generated/${filename}`,
          content: code,
          scenariosCovered: automatedScenarios.map(s => s.scenarioId),
          reusedComponents: ['BasePage'],
          status: 'GENERATED',
        });
      }

      if (manualScenarios.length > 0) {
        generatedFiles.push({
          filename: 'manual_review_scenarios.md',
          filePath: 'tests/generated/manual_review_scenarios.md',
          content: manualScenarios.map(s => `### ${s.scenarioId}: ${s.title}\n${s.objective}\n`).join('\n'),
          scenariosCovered: manualScenarios.map(s => s.scenarioId),
          reusedComponents: [],
          status: 'REQUIRES_MANUAL_REVIEW',
          reviewNotes: ['Requires manual verification due to dynamic third-party or CAPTCHA elements.'],
        });
      }
    } else {
      // Unmapped Requirement in Deterministic Fallback Mode:
      // Safety rule: never fabricate selectors or application behavior.
      const safeReqId = primaryReqId.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `manual_review_${safeReqId}.md`;

      const reviewContent = `# Manual Review Required: ${primaryReqId}

## Safety Governance Notice
Automatic code generation in **DETERMINISTIC_FALLBACK** mode was safely suspended for requirement \`${primaryReqId}\`.
- **Reason**: The deterministic fallback engine does not contain pre-verified Page Object mappings or DOM selectors for this requirement.
- **Safety Policy**: To prevent selector hallucination, phantom assertions, and brittle test generation, unmapped requirements require either:
  1. A live LLM provider configuration (\`GEMINI_API_KEY\` or \`OPENAI_API_KEY\`), OR
  2. Manual implementation of verified Page Object locators.

### Scenarios Awaiting Review:
${scenarios
  .map(
    s => `#### ${s.scenarioId}: ${s.title}
- **Type**: \`${s.testType}\` | **Priority**: \`${s.priority}\`
- **Objective**: ${s.objective}
- **Preconditions**:
${s.preconditions.map(p => `  - ${p}`).join('\n')}
- **Test Steps**:
${s.testSteps.map((step, i) => `  ${i + 1}. ${step}`).join('\n')}
- **Expected Results**:
${s.expectedResults.map(e => `  - ${e}`).join('\n')}
`
  )
  .join('\n\n')}
`;

      generatedFiles.push({
        filename,
        filePath: `tests/generated/${filename}`,
        content: reviewContent,
        scenariosCovered: scenarios.map(s => s.scenarioId),
        reusedComponents: [],
        status: 'REQUIRES_MANUAL_REVIEW',
        reviewNotes: [
          `Requirement "${primaryReqId}" contains unverified UI locators in deterministic fallback mode. Automatic speculative code authoring refused to prevent invalid selector hallucination.`,
        ],
      });

      automatedCount = 0;
      manualReviewCount = scenarios.length;
      skippedCount = 0;
    }

    return {
      generatedFiles,
      executionSummary: {
        totalScenarios: scenarios.length,
        automated: automatedCount,
        manualReviewRequired: manualReviewCount,
        skipped: skippedCount,
        reusedPageObjects: ['BasePage'],
        reusedApiClients: [],
      },
      metadata: {
        timestamp: new Date().toISOString(),
        executionMode: this.metadata.executionMode,
        provider: this.metadata.name,
      },
    };
  }

  /**
   * Build complete Playwright test suite source code adhering strictly to project POM conventions.
   */
  private buildPlaywrightSpecCode(scenarios: TestScenario[]): string {
    const primaryTitle = scenarios[0]?.title.split(' - ')[0] || 'Feature Workflow';
    const primaryReqId = scenarios[0]?.requirementId || 'REQ-GEN';

    const testBlocks = scenarios.map(scenario => {
      const tagsLiteral = JSON.stringify(scenario.tags);
      const isNegativeOrBoundary = scenario.tags.some(t => t.includes('negative') || t.includes('boundary'));

      if (!isNegativeOrBoundary) {
        return `  test('${scenario.scenarioId}: ${scenario.title}', {
    tag: ${tagsLiteral},
  }, async ({ page }) => {
    // 1. Navigate to target page and apply ad-blocker
    const basePage = new BasePage(page);
    await basePage.applyAdBlocker();
    await basePage.navigate('/');

    // 2. Scroll to footer subscription section
    const subscriptionHeading = page.getByRole('heading', { name: /subscription/i });
    await subscriptionHeading.scrollIntoViewIfNeeded();
    await expect(subscriptionHeading).toBeVisible();

    // 3. Enter unique test email and subscribe
    const dynamicEmail = \`subscriber_\${Date.now()}@example.com\`;
    const emailInput = page.locator('#susbscribe_email');
    await emailInput.fill(dynamicEmail);

    const subscribeBtn = page.locator('#subscribe');
    await subscribeBtn.click();

    // 4. Verify web-first assertion on success confirmation
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toHaveText('You have been successfully subscribed!');

    // 5. Verify user remains on the homepage without unintended navigation
    await expect(page).toHaveURL(/automationexercise\\.com\\/?(?:#.*)?$/);
    await expect(basePage.homeLink).toBeVisible();
  });`;
      } else if (scenario.tags.some(t => t.includes('boundary'))) {
        return `  test('${scenario.scenarioId}: ${scenario.title}', {
    tag: ${tagsLiteral},
  }, async ({ page }) => {
    // 1. Navigate to target page and scroll to subscription form
    const basePage = new BasePage(page);
    await basePage.applyAdBlocker();
    await basePage.navigate('/');

    const subscriptionHeading = page.getByRole('heading', { name: /subscription/i });
    await subscriptionHeading.scrollIntoViewIfNeeded();
    await expect(subscriptionHeading).toBeVisible();

    // 2. Inspect HTML5 required attribute on the email input element
    const emailInput = page.locator('#susbscribe_email');
    await expect(emailInput).toHaveAttribute('required', /.*/);
    const isRequired = await emailInput.evaluate((el: HTMLInputElement) => el.required);
    expect(isRequired).toBe(true);

    // 3. Leave email input empty and attempt submission
    await emailInput.fill('');
    const subscribeBtn = page.locator('#subscribe');
    await subscribeBtn.click();

    // 4. Assert browser HTML5 required validation state blocks submission
    const isInputValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isInputValid).toBe(false);

    const validityState = await emailInput.evaluate((el: HTMLInputElement) => ({
      valid: el.validity.valid,
      valueMissing: el.validity.valueMissing,
      validationMessage: el.validationMessage,
    }));
    expect(validityState.valid).toBe(false);
    expect(validityState.valueMissing).toBe(true);
    expect(validityState.validationMessage.length).toBeGreaterThan(0);

    // 5. Verify success alert is not rendered and user remains on homepage
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).not.toBeVisible();
    await expect(page).toHaveURL(/automationexercise\\.com\\/?(?:#.*)?$/);
    await expect(basePage.homeLink).toBeVisible();
  });`;
      } else {
        return `  test('${scenario.scenarioId}: ${scenario.title}', {
    tag: ${tagsLiteral},
  }, async ({ page }) => {
    // 1. Navigate to target page and scroll to subscription form
    const basePage = new BasePage(page);
    await basePage.applyAdBlocker();
    await basePage.navigate('/');

    const subscriptionHeading = page.getByRole('heading', { name: /subscription/i });
    await subscriptionHeading.scrollIntoViewIfNeeded();
    await expect(subscriptionHeading).toBeVisible();

    // 2. Enter malformed email input and verify HTML5 email type specification
    const emailInput = page.locator('#susbscribe_email');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await emailInput.fill('invalid-email-format-without-at');

    const subscribeBtn = page.locator('#subscribe');
    await subscribeBtn.click();

    // 3. Assert browser HTML5 validity state rejects malformed email input
    const isInputValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isInputValid).toBe(false);

    const validityState = await emailInput.evaluate((el: HTMLInputElement) => ({
      valid: el.validity.valid,
      typeMismatch: el.validity.typeMismatch,
      validationMessage: el.validationMessage,
    }));
    expect(validityState.valid).toBe(false);
    expect(validityState.typeMismatch).toBe(true);
    expect(validityState.validationMessage.length).toBeGreaterThan(0);

    // 4. Verify submission is blocked and success confirmation is not displayed
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).not.toBeVisible();

    // 5. Verify user remains on homepage without redirect or full page reload
    await expect(page).toHaveURL(/automationexercise\\.com\\/?(?:#.*)?$/);
    await expect(basePage.homeLink).toBeVisible();
  });`;
      }
    });

    return `/**
 * AUTO-GENERATED TEST SUITE: ${primaryReqId} - ${primaryTitle}
 *
 * Generated by: Automation Authoring Agent
 * Generation Mode: DETERMINISTIC_FALLBACK
 * Timestamp: ${new Date().toISOString()}
 *
 * SAFETY GOVERNANCE:
 * - Handled by Human-in-the-Loop review gates.
 * - Adheres strictly to Page Object Model and web-first assertions.
 * - Zero hardcoded sleeps (waitForTimeout).
 */

import { test, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

test.describe('${primaryReqId}: ${primaryTitle} - Automated Test Suite', () => {
${testBlocks.join('\n\n')}
});
`;
  }
}
