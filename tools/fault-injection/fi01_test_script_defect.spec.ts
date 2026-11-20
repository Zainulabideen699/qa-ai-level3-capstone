import { test } from '@playwright/test';

/**
 * FI-01: Controlled Test-Script Fault Injection
 *
 * Objective:
 * Demonstrates that an intentionally introduced automation-script defect
 * (syntactically invalid Playwright locator/selector) is captured by the
 * custom Playwright RCA reporter and deterministically classified as
 * `TEST_SCRIPT_DEFECT` under `RULE_P7_INVALID_SELECTOR_SYNTAX`.
 *
 * Differentiation from Real Product Defects:
 * - Real Product Defect: Server 500 error, application crash, or broken business logic.
 * - Real UI Change: Valid selector that times out waiting for DOM element (`LOCATOR_OR_UI_CHANGE`).
 * - Intentional Test-Script Defect: Syntactically invalid selector syntax (`button[type='submit'`)
 *   that fails immediately during Playwright query parsing before any DOM interaction.
 */
test.describe('FI-01: Controlled Fault Injection', () => {
  test('TC-FI-SCRIPT-001: Intentional invalid selector syntax in test script', async ({ page }) => {
    // 1. Arrange: navigate to application homepage
    await page.goto('/');

    // 2. Controlled Fault Injection:
    // Intentionally pass an invalid selector syntax with an unclosed bracket '['.
    // Playwright's selector engine immediately rejects this with a selector parsing error
    // (e.g. `Unexpected token "" while parsing selector` or `DOMException: ... is not a valid selector`),
    // producing unambiguous evidence of an authoring script flaw rather than a runtime timeout
    // or an application defect.
    const malformedSelector = "button[type='submit'"; // Missing closing bracket ']'

    // 3. Action: Attempt to click using the malformed selector
    await page.locator(malformedSelector).click();
  });
});
