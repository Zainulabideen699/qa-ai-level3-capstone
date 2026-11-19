# Skill: Root Cause Analysis (RCA) Agent

## Description
This skill guides the **RCA Agent** in diagnosing test failures executed against [Automation Exercise](https://automationexercise.com). It prescribes strict artifact ingestion, standardized 8-category taxonomy classification, evidence compilation, and deterministic model-free fallback analysis.

---

## The 8-Category RCA Failure Taxonomy

Every test failure must be classified into exactly one of the following eight standardized categories:

1. `PRODUCT_DEFECT`
   - **Definition**: The System Under Test (SUT) failed to meet requirements or returned an unexpected server/application error.
   - **Examples**: HTTP 500 on checkout, cart total mismatch, incorrect order confirmation message.
2. `TEST_SCRIPT_DEFECT`
   - **Definition**: Flaw or bug in the automated test script itself.
   - **Examples**: Flawed assertion logic, missing `await`, syntax error, bad test design assumptions.
3. `LOCATOR_OR_UI_CHANGE`
   - **Definition**: Application UI structure or labels changed legitimately, breaking element queries.
   - **Examples**: Button text changed from "Signup / Login" to "Sign In", DOM hierarchy altered.
4. `TEST_DATA_OR_STATE`
   - **Definition**: Failure caused by invalid, dirty, or expired test data.
   - **Examples**: Attempting to register an email that already exists, expired test tokens, empty database seed.
5. `ENVIRONMENT_OR_NETWORK`
   - **Definition**: Infrastructure, hosting, or network connection failure.
   - **Examples**: DNS lookup failure, `net::ERR_CONNECTION_REFUSED`, SUT hosting downtime.
6. `TIMING_OR_FLAKINESS`
   - **Definition**: Race condition, slow animation, or asynchronous rendering delay.
   - **Examples**: Action attempted while modal animation is in-flight, micro-task timing mismatches.
7. `THIRD_PARTY_DEPENDENCY`
   - **Definition**: External service or script outside the core SUT application failed.
   - **Examples**: Google Ads iframe overlay blocking clicks, external payment gateway timeout, analytics script hang.
8. `UNKNOWN`
   - **Definition**: Unclassified failure or ambiguous error where evidence is insufficient or conflicting.
   - **Action**: Escalated immediately to human QA engineer for manual triage.

---

## Evidence Collection Protocol

The RCA Agent must ingest and extract concrete evidence from:
1. **Playwright Trace Archive (`trace.zip`)**: Step-by-step action timeline, DOM snapshot before/after each action, network waterfall.
2. **Failure Screenshot**: Captured at the exact point of test failure.
3. **Execution Video**: Visual replay of the browser session.
4. **Console Logs**: Browser console warnings, uncaught JS exceptions, and SUT logs.
5. **Network HAR / Traffic**: Status codes (4xx, 5xx), request payloads, response bodies.

---

## Model-Free RCA Fallback Engine

When the primary AI/LLM model is unavailable, rate-limited, or times out, the agent activates the deterministic rule-based fallback engine:

| Error Signature / Pattern | Matched Category | Confidence |
| :--- | :--- | :--- |
| `HTTP 500\|Internal Server Error\|AssertionError.*expected.*to equal` (with correct data) | `PRODUCT_DEFECT` | High |
| `TypeError:.*is not a function\|ReferenceError:\|UnhandledPromiseRejection` | `TEST_SCRIPT_DEFECT` | High |
| `Timeout .* waiting for getByRole\|getByLabel\|locator` | `LOCATOR_OR_UI_CHANGE` | High |
| `Email Address already exist\|Invalid credentials\|401 Unauthorized` | `TEST_DATA_OR_STATE` | High |
| `net::ERR_CONNECTION_REFUSED\|ENOTFOUND\|ETIMEDOUT\|502 Bad Gateway` | `ENVIRONMENT_OR_NETWORK` | High |
| `element is not visible within .*ms\|intercepted by animated element` | `TIMING_OR_FLAKINESS` | Medium |
| `google-analytics\|doubleclick\|googlesyndication\|adservice` | `THIRD_PARTY_DEPENDENCY` | High |
| *No pattern match* | `UNKNOWN` | Neutral |

---

## Workflow

```
[Test Execution Failure]
           │
           ▼
[Collect Evidence: Trace, Screenshot, Video, Logs]
           │
           ▼
[Check Model Availability]
   ├── Available ────> [LLM Diagnostic Reasoning]
   └── Unavailable ──> [Deterministic Regex Fallback Engine]
           │
           ▼
[Classify into 8-Point Taxonomy]
           │
     ┌─────┴────────────────────────────┐
     │                                  │
[PRODUCT_DEFECT]              [LOCATOR / SCRIPT ISSUE]
     │                                  │
     ▼                                  ▼
[Generate Bug Report]         [Dispatch to Repair Proposal Agent]
     │                                  │
     └─────────────────┬────────────────┘
                       │
                       ▼
          [Generate RCA Diagnostic Report]
          (Saved in reports/rca-<test-id>.md)
```

---

## Human Approval Requirements
- All RCA classifications must be documented in `reports/` and reviewed by human engineers.
- **Rule**: An agent is never permitted to unilaterally reclassify a `PRODUCT_DEFECT` as a test issue to artificially boost pass rates.
