# AI Level-3 Quality Engineering Capstone Architecture

## 1. Executive Summary & System Under Test (SUT)
This architecture defines the engineering standards, multi-agent collaboration protocols, and quality governance for the **AI Level-3 Quality Engineering Capstone**.

- **System Under Test (SUT)**: [Automation Exercise](https://automationexercise.com)
  - An e-commerce web application featuring user authentication, product catalog, cart/checkout flows, payment processing, subscription newsletters, contact forms with uploads, and backend REST APIs.
- **Core Mission**: Combine enterprise Playwright/TypeScript automation with an autonomous, multi-agent AI system governed by strict Human-in-the-Loop (HITL) safety gates, comprehensive traceability, automated evidence capture, model-free fallback diagnostics, and prompt-injection defenses.

---

## 2. Updated Project Directory Structure

```
qa-ai-level3/
├── .github/
│   └── workflows/
│       └── playwright.yml         # CI/CD pipeline
├── agents/
│   └── orchestrator.md            # Orchestrator & state machine specification
├── docs/
│   ├── architecture.md            # Master architectural specification (this file)
│   ├── security.md                # Prompt-injection defense & data sanitization
│   └── traceability.md            # Requirements-to-defect traceability matrix
├── reports/
│   └── .gitkeep                   # Execution, RCA, and quality dashboards
├── skills/
│   ├── test-design/
│   │   └── SKILL.md               # SUT scenario design (EP, BVA, State)
│   ├── playwright/
│   │   └── SKILL.md               # POM standards, resilient locators, fixtures
│   ├── rca/
│   │   └── SKILL.md               # 8-category failure taxonomy & heuristics
│   ├── review/
│   │   └── SKILL.md               # Code review, repair proposal integrity
│   └── reporting/
│       └── SKILL.md               # Metrics compilation & executive dashboards
├── src/
│   ├── api/                       # API clients for hybrid testing (Automation Exercise REST endpoints)
│   ├── fixtures/                  # Custom Playwright fixtures (test.extend)
│   ├── pages/                     # Page Object Model (POM) classes
│   └── utils/                     # Data generators, env configs, sanitizers
├── tests/
│   ├── api/                       # API integration tests
│   ├── integration/               # Hybrid UI + API workflow tests
│   ├── ui/                        # End-to-end UI tests for automationexercise.com
│   └── example.spec.ts            # Starter spec (unmodified)
├── tools/
│   └── rca/
│       ├── model_free_rca.md      # Deterministic fallback engine design
│       └── .gitkeep               # Diagnostic scripts
├── .gitignore                     # Git ignore rules
├── package-lock.json              # Dependency lockfile
├── package.json                   # Project manifest & npm scripts
└── playwright.config.ts           # Central Playwright runner configuration
```

---

## 3. The Six Agent Responsibilities, Contracts & Gates

```
┌─────────────────────────────────────────────────────────────────┐
│                     3. Execution Orchestrator                   │
└──────┬──────────────────────────┬─────────────────────────┬─────┘
       │                          │                         │
       ▼                          ▼                         ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│1. Test Design│          │2. Automation │          │4. RCA Agent  │
│    Agent     │          │  Authoring   │          │(AI + Rule-FB)│
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       ▼                         ▼                         ▼
  [Test Specs]               [POM & Specs]            [8-Category
                                                       Diagnostics]
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │  5. Repair   │
                                                    │   Proposal   │
                                                    └──────┬───────┘
                                                           │
                                                           ▼
                                                    ┌──────────────┐
                                                    │  6. Quality  │
                                                    │  Reporting   │
                                                    └──────────────┘
```

| Agent Responsibility | Core Responsibilities | Inputs | Outputs | Human Approval Gate |
| :--- | :--- | :--- | :--- | :--- |
| **1. Test Design Agent** | Analyzes `https://automationexercise.com` features (auth, cart, checkout, API); derives test scenarios using EP, BVA, State Transition, and error guessing. | SUT specifications, user stories, OpenAPI endpoints. | Structured Test Case Specs (`TC-AE-xxx`) with clear steps, test data, and assertions. | **Gate 1**: Human verifies coverage, edge cases, and scope. |
| **2. Automation Authoring Agent** | Implements clean, maintainable Playwright/TS code using Page Object Model (`src/pages/`), custom fixtures, and accessible locators (`getByRole`, `getByLabel`). | Approved Test Specs (`TC-AE-xxx`), target DOM, API docs. | Page Objects (`src/pages/*.ts`), Test specs (`tests/**/*.spec.ts`), Fixtures. | **Gate 2**: Human reviews code quality, POM adherence, locator resilience, and secret safety. |
| **3. Execution Orchestrator** | Schedules and runs tests across browsers, tags, and environments. Monitors worker health, collects run artifacts, and routes failures. | Test execution triggers, CLI params, target environments. | Execution run status, artifact bundles (traces, videos, screenshots), routing signals. | N/A (Automated runtime orchestration). |
| **4. Root Cause Analysis (RCA) Agent** | Diagnoses test failures into one of 8 standardized categories using LLM reasoning with a deterministic model-free regex fallback. | Playwright trace files (`trace.zip`), console logs, network waterfalls, failure screenshots. | Standardized RCA Report (`reports/rca-<test-id>.md`) with category, evidence, and next steps. | Human validates RCA classification to prevent masking product defects. |
| **5. Repair Proposal Agent** | Proposes surgical fixes (git diffs) for tests failing due to locator drift or script flaws. Strictly prohibited from weakening assertions. | RCA Diagnostic Report, existing Page Object code, updated DOM snapshots. | Minimal unified git diff, repair rationale, and risk assessment. | **Gate 3**: Mandatory human sign-off before patch is applied to disk. |
| **6. Quality Reporting Agent** | Compiles execution statistics, pass/fail ratios, flaky test telemetry, defect clusters, and release readiness. | Test results, RCA reports, execution logs, coverage metrics. | Executive Quality Dashboard (`reports/quality-summary.md`), HTML/Markdown dashboards. | Stakeholder release sign-off. |

---

## 4. Root Cause Analysis (RCA) 8-Point Taxonomy

Every test failure must be explicitly mapped to one of the following eight standardized categories:

1. `PRODUCT_DEFECT`: SUT behavior deviated from specification (e.g. HTTP 500 error, cart total miscalculation, broken form submission).
2. `TEST_SCRIPT_DEFECT`: Programmer flaw in the test code itself (e.g. incorrect assertion logic, unhandled async promise, improper test setup).
3. `LOCATOR_OR_UI_CHANGE`: UI changed legitimately (e.g. button label renamed, DOM restructured), causing locator timeouts.
4. `TEST_DATA_OR_STATE`: Failure caused by dirty database state, duplicate test accounts, expired credentials, or missing seed data.
5. `ENVIRONMENT_OR_NETWORK`: SUT environment downtime, DNS resolution failure, network timeout, or CORS block.
6. `TIMING_OR_FLAKINESS`: Race conditions, slow animation transitions, or asynchronous render delays.
7. `THIRD_PARTY_DEPENDENCY`: External integrations failing (e.g. Google Ads banner blocking UI, external payment gateway timeout).
8. `UNKNOWN`: Unclassified failure or ambiguous error requiring manual human investigation.

---

## 5. Model-Free RCA Fallback Engine

To maintain high resilience when AI models are unavailable, rate-limited, or offline, the framework incorporates a **deterministic rule-based regex fallback engine** in `tools/rca/`:

```
               [Test Failure Detected]
                          │
                          ▼
             [Is LLM Online & Available?]
                     /         \
              (Yes) /           \ (No / Timeout / Rate Limit)
                   ▼             ▼
          [LLM RCA Agent]   [Deterministic Model-Free Engine]
                   │             │
                   │             ├─ Regex on Error Stack
                   │             ├─ HTTP Status Code Filter
                   │             └─ DOM Actionability Check
                   │             │
                   ▼             ▼
          [Standardized RCA Classification (8 Categories)]
```

- **Locator Fallback**: Matches `Timeout .* waiting for getByRole|locator` -> `LOCATOR_OR_UI_CHANGE`.
- **Network/Env Fallback**: Matches `net::ERR_CONNECTION_REFUSED|ETIMEDOUT|502 Bad Gateway` -> `ENVIRONMENT_OR_NETWORK`.
- **Third-Party Fallback**: Matches `google-analytics|doubleclick|adnxs` script blocks -> `THIRD_PARTY_DEPENDENCY`.
- **Timing Fallback**: Matches `element is not visible within .*ms` on animated elements -> `TIMING_OR_FLAKINESS`.
- **Data Fallback**: Matches `User already exists|Invalid credentials` during setup -> `TEST_DATA_OR_STATE`.
- **Product Defect**: Matches unexpected HTTP 500 or UI error banner from SUT -> `PRODUCT_DEFECT`.
- **Catch-all**: Unmatched patterns map safely to `UNKNOWN`.

---

## 6. Security & Prompt-Injection Defense Architecture

Because AI agents ingest untrusted strings directly from external web pages (SUT error messages, HTML attributes, user reviews, DOM text), the framework implements multi-layered security:

```
[Untrusted SUT Page Content / Logs]
                 │
                 ▼
     [Data Sanitization Layer]
  (Strip Markdown / Instruction Tokens)
                 │
                 ▼
[Strict XML Delimitation: <untrusted_input>]
                 │
                 ▼
    [Agent Processing / LLM]
 (Passive Data Only - Never Executable)
                 │
                 ▼
   [Human-in-the-Loop Approval]
  (Zero autonomous file writes / pushes)
```

1. **Untrusted Data Isolation**: All external content (DOM text, API responses, console logs) is enclosed in strict XML delimiters (`<untrusted_content>...</untrusted_content>`) with instructions that this data must never be treated as system directives.
2. **Instruction Neutralization**: Pre-processing strips prompt injection triggers (e.g., `"Ignore previous instructions"`, `"System Instruction:"`, Markdown overrides).
3. **Least Privilege**: Agents run in restricted execution sandboxes without administrative permissions or unauthorized file modification tools.
4. **Mandatory Human Approval (Gate 3)**: Even if an injection attack succeeded in generating a malicious patch, the patch cannot be written or merged without explicit human inspection and approval.

---

## 7. Traceability & Evidence Collection

### Bidirectional Traceability Matrix
Every artifact is interconnected to ensure complete auditability:

$$\text{Requirement (REQ)} \longleftrightarrow \text{Test Scenario (TC)} \longleftrightarrow \text{Spec File (.spec.ts)} \longleftrightarrow \text{Run Result} \longleftrightarrow \text{RCA / Patch}$$

- **REQ-AUTH-001**: User Registration & Login on `automationexercise.com`
- **TC-AUTH-001**: Positive User Registration with valid credentials
- **Spec**: `tests/ui/auth.spec.ts` -> Page Object: `src/pages/AuthPage.ts`
- **Result**: `test-results/auth-TC-AUTH-001/`
- **RCA/Patch**: `reports/rca-TC-AUTH-001.md`

### Automated Evidence Collection
During every test execution, Playwright is configured to capture comprehensive diagnostic evidence:
- **Playwright Trace Archive (`trace.zip`)**: Captures DOM snapshots before and after every action, network waterfalls, and console logs.
- **Full-Page Screenshots**: Captured automatically on test failure.
- **Video Recordings**: Retained for failed test runs to visually inspect timing and popup issues.
- **HAR Network Recordings**: Captured for API and hybrid tests to verify payload accuracy.
