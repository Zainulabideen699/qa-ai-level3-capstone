import { APIResponse } from '@playwright/test';

/**
 * Reusable, type-safe response parsing and diagnostic helper for Automation Exercise APIs.
 *
 * Safely parses JSON responses. If the SUT or upstream proxy returns an unexpected non-JSON
 * response (such as an HTML error page, Cloudflare 503 "This website is under heavy load (queue full)",
 * or gateway timeout), it throws a descriptive error detailing:
 * - The request target / endpoint context
 * - The HTTP transport status code
 * - The response Content-Type header
 * - A short, sanitized preview of the raw response body
 *
 * This prevents misleading SyntaxError runtime crashes in test scripts while preserving
 * full diagnostic fidelity for Root Cause Analysis (RCA).
 */
export async function parseJsonResponse<T = any>(
  response: APIResponse,
  endpointContext?: string
): Promise<T> {
  const status = response.status();
  const contentType = response.headers()['content-type'] || 'unknown';
  const rawText = await response.text();

  try {
    return JSON.parse(rawText) as T;
  } catch (parseError) {
    const sanitizedPreview = rawText.replace(/\s+/g, ' ').trim().slice(0, 250);
    const target = endpointContext || response.url();

    throw new Error(
      `Unexpected non-JSON response from ${target} (HTTP ${status}, Content-Type: "${contentType}"): ${sanitizedPreview}`
    );
  }
}
