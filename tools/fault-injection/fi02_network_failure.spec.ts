import { test } from '@playwright/test';

/**
 * FI-02: Controlled Network Failure Injection
 *
 * Objective:
 * Demonstrates that an intentionally simulated network transport failure
 * (TCP connection reset during navigation) is captured by the custom Playwright RCA reporter
 * and deterministically classified as `ENVIRONMENT_OR_NETWORK` under `RULE_P2_ENVIRONMENT_OR_NETWORK`.
 *
 * Mechanism:
 * Uses Playwright's `page.route()` to intercept requests to a dedicated endpoint:
 * `https://automationexercise.com/fi02-network-probe` and aborts with `'connectionreset'`.
 * Invoking `page.goto()` causes the browser network layer to fail with a genuine
 * `net::ERR_CONNECTION_RESET` network error.
 *
 * Differentiation from Other Categories:
 * - ENVIRONMENT_OR_NETWORK: Transport/network layer drop (`net::ERR_CONNECTION_RESET`), DNS error, or gateway outage.
 * - PRODUCT_DEFECT: Server 500 error payload or internal backend crash from a reachable server.
 * - TEST_SCRIPT_DEFECT: Syntactically invalid locator or unhandled runtime JS exception (FI-01).
 * - LOCATOR_OR_UI_CHANGE: DOM element timeout on a successfully loaded page.
 */
test.describe('FI-02: Controlled Network Failure Injection', () => {
  test('TC-FI-NETWORK-001: Intentional connection reset network failure', async ({ page }) => {
    const probeUrl = 'https://automationexercise.com/fi02-network-probe';

    // 1. Intercept requests to the dedicated probe URL and abort with 'connectionreset'
    await page.route(probeUrl, async route => {
      await route.abort('connectionreset');
    });

    // 2. Trigger navigation to the intercepted probe URL.
    // The browser encounters an immediate TCP connection reset (`net::ERR_CONNECTION_RESET`).
    // Do NOT catch or suppress this error so it propagates directly to the RCA reporter.
    await page.goto(probeUrl);
  });
});
