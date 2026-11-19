import { LLMProvider, ModelMessage } from '../../src/agents/providers/types';
import { AuthoringInput, AuthoringOutput, GeneratedTestFile } from '../../src/agents/types';
import { CodeValidator } from './validation/codeValidator';
import { AuthoringValidator } from './validation/authoringValidator';

/**
 * Agent 2: Automation Authoring Agent.
 *
 * Responsibilities:
 * - Converts approved test scenarios (Gate 1 sign-off) into production-grade Playwright + TypeScript test files.
 * - Reuses existing Page Objects (BasePage, LoginPage, ProductPage, CartPage) and API clients.
 * - Enforces web-first assertions and resilient accessible locators.
 * - Strictly prohibits arbitrary fixed sleeps (page.waitForTimeout).
 * - Separates automated scenarios from those requiring human review (e.g. CAPTCHAs or unverified selectors).
 * - Directs generated code exclusively to the dedicated tests/generated/ directory.
 */
export class AutomationAuthoringAgent {
  private readonly provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Convert approved scenarios into validated Playwright test code.
   */
  public async authorTests(input: AuthoringInput): Promise<AuthoringOutput> {
    // 1. Mandatory Gate 1 Verification
    if (input.gate1Approval.status !== 'APPROVED') {
      throw new Error(
        `[AutomationAuthoringAgent] Gate 1 Violation: Cannot author automation code for unapproved scenarios (status: "${input.gate1Approval.status}"). Human approval required.`
      );
    }

    if (!input.scenarios || input.scenarios.length === 0) {
      throw new Error('[AutomationAuthoringAgent] Input contains no test scenarios to automate.');
    }

    // 2. Prepare authoring prompt with existing repository architecture context
    const systemPrompt = `You are the Automation Authoring Agent for an enterprise Playwright + TypeScript test suite.
Target Application: https://automationexercise.com

REUSABLE ARCHITECTURAL ASSETS:
- BasePage (@pages/BasePage): provides goto(path), applyAdBlocker(), getHeading(text).
- LoginPage (@pages/LoginPage): login form, signup form, validation messages.
- ProductPage (@pages/ProductPage): catalog list, view details, search bar.
- CartPage (@pages/CartPage): cart items, quantity, checkout button.
- AccountApi (@api/accountApi): API account provisioning and cleanup.
- testData (@utils/testData): generateUniqueUser() for unique credentials.

STRICT AUTHORING RULES:
1. Always import { test, expect } from '@playwright/test'.
2. Always use web-first assertions: await expect(locator).toBeVisible(), toContainText(), etc.
3. NEVER use page.waitForTimeout() or arbitrary sleep functions.
4. Always wrap dynamically created test accounts in try/finally blocks to ensure deleteAccount cleanup.
5. Target destination must be within 'tests/generated/'.
6. If a scenario requires unverified selectors or third-party CAPTCHA solving, mark automationFeasibility as ManualReview instead of inventing speculative code.`;

    const userPrompt = `APPROVED_SCENARIOS:
${JSON.stringify(input.scenarios, null, 2)}`;

    const schemaDescription = `{
  "generatedFiles": [
    {
      "filename": string,
      "filePath": string,
      "content": string,
      "scenariosCovered": string[],
      "reusedComponents": string[],
      "status": "GENERATED" | "REQUIRES_MANUAL_REVIEW" | "SKIPPED",
      "reviewNotes": string[]
    }
  ],
  "executionSummary": {
    "totalScenarios": number,
    "automated": number,
    "manualReviewRequired": number,
    "skipped": number,
    "reusedPageObjects": string[],
    "reusedApiClients": string[]
  },
  "metadata": {
    "timestamp": string,
    "executionMode": "AI_POWERED" | "DETERMINISTIC_FALLBACK",
    "provider": string
  }
}`;

    const messages: ModelMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const rawOutput = await this.provider.generateStructured<AuthoringOutput>(
      messages,
      schemaDescription,
      { temperature: 0.1, task: 'AUTOMATION_AUTHORING' }
    );

    // 3. Runtime contract validation for authoring response
    const authoringValidation = AuthoringValidator.validate(rawOutput);
    if (!authoringValidation.isValid) {
      const preview = JSON.stringify(rawOutput)?.slice(0, 300) || String(rawOutput);
      throw new Error(
        `[AutomationAuthoringAgent] Provider returned malformed authoring output:\n- ${authoringValidation.errors.join('\n- ')}\nRaw Response Preview: ${preview}`
      );
    }

    // 4. Runtime validation for all generated code files
    for (const file of rawOutput.generatedFiles) {
      if (file.status === 'GENERATED') {
        const validation = CodeValidator.validate(file);
        if (!validation.isValid) {
          throw new Error(
            `[AutomationAuthoringAgent] Code validation failed for "${file.filename}":\n- ${validation.errors.join('\n- ')}`
          );
        }
      }
    }

    return {
      ...rawOutput,
      metadata: {
        timestamp: new Date().toISOString(),
        executionMode: this.provider.metadata.executionMode,
        provider: this.provider.metadata.name,
      },
    };
  }
}
