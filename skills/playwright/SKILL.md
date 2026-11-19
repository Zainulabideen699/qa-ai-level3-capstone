# Skill: Playwright Automation Authoring Agent

## Description
This skill guides the **Automation Authoring Agent** in writing clean, scalable, maintainable, and idiomatic Playwright TypeScript code tailored for [Automation Exercise](https://automationexercise.com).

---

## Core Responsibilities
1. **Page Object Model (POM) Architecture**:
   - Encapsulate page locators and interaction methods inside classes under `src/pages/` (e.g. `AuthPage.ts`, `ProductsPage.ts`, `CartPage.ts`, `CheckoutPage.ts`).
   - Keep test files (`tests/**/*.spec.ts`) strictly declarative and free of direct selector manipulation.
2. **Resilient Locator Strategy**:
   - Always prioritize user-facing, accessible locators:
     - `page.getByRole('button', { name: 'Login' })`
     - `page.getByLabel('Password')`
     - `page.getByPlaceholder('Email Address')`
     - `page.getByText('Category')`
   - **Strictly Prohibit**: Brittle absolute XPaths or unstable auto-generated CSS classes.
3. **Flakiness Prevention & Ad Handling**:
   - *Automation Exercise Context*: The site renders Google Ads and popups. Use route blocking (`page.route('**/*google*', route => route.abort())`) or proper modal handling fixtures rather than arbitrary sleeps.
   - Rely strictly on Playwright's auto-waiting and web-first assertions (`await expect(locator).toBeVisible()`).
   - **Strictly Prohibit**: `page.waitForTimeout()` sleeps.
4. **Hybrid Testing & Custom Fixtures**:
   - Create custom fixtures in `src/fixtures/` using `test.extend` (e.g. `authenticatedPage`, `seededCart`).
   - Implement API helpers in `src/api/` using Playwright's `request` context for fast state setup and API contract validation.

---

## Inputs
- Approved Test Case Specification from the Test Design Agent (Gate 1 sign-off).
- DOM structure, forms, and endpoints on `https://automationexercise.com`.
- Project configuration (`playwright.config.ts`).

---

## Outputs
- Page Object classes in `src/pages/`.
- Test specifications in `tests/ui/`, `tests/api/`, or `tests/integration/`.
- Custom fixtures in `src/fixtures/` and API clients in `src/api/`.

---

## Human Approval Requirements (Gate 2)
- **Mandatory Review**: All authored code must undergo human code review before being added to active test suites.
- **Verification Criteria**:
  1. Strict adherence to the Page Object Model.
  2. Zero arbitrary sleeps (`waitForTimeout`).
  3. Clean separation of test data and environment configurations.
  4. Resilient locator choices.
