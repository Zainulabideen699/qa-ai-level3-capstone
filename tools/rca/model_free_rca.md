# Deterministic Model-Free RCA Fallback Engine

## 1. Overview
The **Model-Free RCA Fallback Engine** is a deterministic, rule-based diagnostic subsystem designed to categorize test failures when an AI/LLM model is unavailable, network-isolated, rate-limited, or unresponsive.

It maps Playwright error messages, stack traces, HTTP status codes, and DOM actionability errors directly to the 8-category failure taxonomy without requiring LLM inference.

---

## 2. Deterministic Rule Matching Heuristics

The engine executes in sequence, evaluating regular expressions against the test failure bundle:

```
[Test Failure Bundle]
         │
         ▼
[Step 1: Check HTTP Status Codes & Server Errors]
   ├── 500, 502, 503, 504 from SUT? ────> PRODUCT_DEFECT / ENVIRONMENT_OR_NETWORK
   └── External domain failure? ──────────> THIRD_PARTY_DEPENDENCY
         │
         ▼
[Step 2: Check Network & Infrastructure Exceptions]
   ├── ECONNREFUSED, ENOTFOUND, ETIMEDOUT ─> ENVIRONMENT_OR_NETWORK
         │
         ▼
[Step 3: Check Test Setup & State Errors]
   ├── Duplicate account, 401/403, missing seed ─> TEST_DATA_OR_STATE
         │
         ▼
[Step 4: Check Selector & Locator Errors]
   ├── Timeout waiting for locator / getByRole ─> LOCATOR_OR_UI_CHANGE
         │
         ▼
[Step 5: Check Timing & Animation Interceptions]
   ├── Element obscured, animation in progress ──> TIMING_OR_FLAKINESS
         │
         ▼
[Step 6: Check Script & TypeScript Runtime Errors]
   ├── TypeError, ReferenceError, bad assertion ──> TEST_SCRIPT_DEFECT
         │
         ▼
[Step 7: Unmatched Fallback]
   └── No regex matched ───────────────────────> UNKNOWN (Escalate to Human QA)
```

---

## 3. Pattern Matching Rules Table

| Priority | Category | Regex / Heuristic Patterns | Target Artifact |
| :--- | :--- | :--- | :--- |
| **1** | `THIRD_PARTY_DEPENDENCY` | `google-analytics\.com\|doubleclick\.net\|googlesyndication\|adservice\|cdn-cgi` | Network Log / Console |
| **2** | `ENVIRONMENT_OR_NETWORK` | `net::ERR_CONNECTION_REFUSED\|ENOTFOUND\|ETIMEDOUT\|502 Bad Gateway\|504 Gateway Timeout` | Network Log / Error Stack |
| **3** | `TEST_DATA_OR_STATE` | `Email Address already exist\|User already exists\|Invalid credentials\|Token expired` | Page Content / Console |
| **4** | `PRODUCT_DEFECT` | `500 Internal Server Error\|Server Error\|Payment Failed.*Server Error` | Network / Page DOM |
| **5** | `LOCATOR_OR_UI_CHANGE` | `Timeout .*ms waiting for (locator\|getByRole\|getByLabel\|getByText)` | Playwright Stack Trace |
| **6** | `TIMING_OR_FLAKINESS` | `element is not visible within .*ms\|subtree intercepts pointer events\|actionability check timed out` | Trace Action Log |
| **7** | `TEST_SCRIPT_DEFECT` | `TypeError:\|ReferenceError:\|Cannot read property.*of undefined\|UnhandledPromiseRejection` | Runner Error Output |
| **8** | `UNKNOWN` | *Default when no patterns match* | Manual Human Review |

---

## 4. Output Contract
The engine outputs a standardized JSON payload that adheres to the RCA reporting contract:

```json
{
  "testId": "TC-AE-AUTH-001",
  "category": "LOCATOR_OR_UI_CHANGE",
  "confidence": 0.95,
  "engine": "MODEL_FREE_DETERMINISTIC",
  "matchedRule": "Timeout .*ms waiting for getByRole",
  "evidence": {
    "failingLine": "tests/ui/auth.spec.ts:24",
    "failingAction": "page.getByRole('button', { name: 'Signup' }).click()",
    "errorMessage": "Timeout 30000ms waiting for getByRole('button', { name: 'Signup' })"
  },
  "escalateToHuman": false
}
```
