# Skill: Automation Authoring Agent

## 1. Role and Responsibility
The **Automation Authoring Agent** is an autonomous engineering agent that transforms approved test scenarios (bearing Gate 1 sign-off) into production-grade, maintainable Playwright + TypeScript test files tailored for [Automation Exercise](https://automationexercise.com).

Core responsibilities:
- Translate structured `TestScenario` objects into executable Playwright specifications.
- Strictly adhere to the Page Object Model (POM) and reuse repository assets.
- Enforce resilient, user-facing accessible locators (`getByRole`, `getByPlaceholder`, `getByText`).
- Guarantee clean test teardowns without masking primary test failures.
- Reject speculative code generation when automation feasibility is unproven.

---

## 2. Input Contract
The agent accepts an `AuthoringInput` payload:

```typescript
export interface AuthoringInput {
  scenarios: TestScenario[];        // Scenarios derived by Agent 1
  gate1Approval: {
    status: 'APPROVED';             // MANDATORY: Must be APPROVED to proceed
    approvedBy?: string;
    approvalTimestamp?: string;
    reviewNotes?: string;
  };
  targetDirectory?: string;         // Defaults to "tests/generated/"
}
```

---

## 3. Output Contract
The agent emits an `AuthoringOutput` payload:

```typescript
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
    executionMode: 'AI_POWERED' | 'DETERMINISTIC_FALLBACK';
    provider: string;
  };
}

export interface GeneratedTestFile {
  filename: string;                // e.g. "generated_req_ae_sub_001.spec.ts"
  filePath: string;                // "tests/generated/generated_req_ae_sub_001.spec.ts"
  content: string;                 // Complete TypeScript source code
  scenariosCovered: string[];      // ["TC-GEN-ENG-001", "TC-GEN-ENG-002", "TC-GEN-ENG-003"]
  reusedComponents: string[];      // ["BasePage", "LoginPage", "AccountApi"]
  status: 'GENERATED' | 'REQUIRES_MANUAL_REVIEW' | 'SKIPPED';
  reviewNotes?: string[];
}
```

---

## 4. Operating Instructions
1. **Gate 1 Verification**:
   - The agent refuses to author code unless `gate1Approval.status === 'APPROVED'`.
2. **Page Object Model (POM) Hierarchy**:
   - Reuse `BasePage` (`src/pages/BasePage.ts`) for common navigations, heading checks, and ad-blocking.
   - Reuse `LoginPage`, `ProductPage`, `CartPage` where applicable.
   - Reuse `AccountApi` (`src/api/accountApi.ts`) and `ProductsApi` (`src/api/productsApi.ts`) for API actions.
3. **Resilient Locator Hierarchy**:
   1. `page.getByRole(...)`
   2. `page.getByLabel(...)`
   3. `page.getByPlaceholder(...)`
   4. `page.getByText(...)`
   5. Explicit IDs (`page.locator('#subscribe')`) when accessible locators are unavailable in SUT DOM.
   6. **Strictly Prohibited**: Brittle absolute XPaths (`/html/body/div[1]/...`).
4. **Web-First Assertions**:
   - Always await web-first assertions: `await expect(locator).toBeVisible()`, `await expect(locator).toHaveText(...)`.
5. **Dynamic Test Data & Cleanup**:
   - Always generate unique emails/usernames with timestamps (`Date.now()`).
   - If test accounts are provisioned, always wrap tests in `try/finally` blocks and invoke `deleteAccount()` in teardown.

---

## 5. Validation Rules
All generated files undergo static safety validation via `CodeValidator`:
- Must import `{ test, expect }` from `'@playwright/test'`.
- Must contain balanced curly braces `{}` and parentheses `()`.
- Must NOT contain `waitForTimeout()` calls.
- Target destination must be within `tests/generated/`.
- No plain-text API secrets or hardcoded passwords.

---

## 6. Error Handling
- **Unverified Locators**: If a scenario targets an element not documented in known POMs or wireframes, the agent flags the scenario as `REQUIRES_MANUAL_REVIEW` and outputs a review checklist instead of generating speculative code.
- **Syntax Validation Failure**: If generated code fails AST or bracket checks, the agent halts file emission and reports the syntax failure to the orchestrator.

---

## 7. Safety Restrictions
- **Zero Arbitrary Sleeps**: `page.waitForTimeout()` is strictly prohibited by Gate 2 governance.
- **Protected Core Directories**: The agent will refuse to write files to `tests/ui/`, `tests/api/`, or `tests/rca/`. All generated code is directed to `tests/generated/`.
- **No Automatic Test Execution**: Generated test files are written to disk for human review; they are never automatically executed or committed to version control without approval.

---

## 8. Example Output File

```typescript
import { test, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

test.describe('REQ-AE-SUB-001: Newsletter Subscription', () => {
  test('TC-GEN-ENG-001: Successful subscription with valid email', {
    tag: ['@eng', '@smoke', '@REQ-AE-SUB-001', '@generated'],
  }, async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.applyAdBlocker();
    await basePage.goto('/');

    const heading = page.getByRole('heading', { name: /subscription/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();

    const emailInput = page.locator('#susbscribe_email');
    await emailInput.fill(`subscriber_${Date.now()}@example.com`);

    await page.locator('#subscribe').click();

    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('You have been successfully subscribed!');
  });
});
```
