# Handover Documentation: AI Level-3 Quality Engineering Capstone

**Project**: Playwright + TypeScript AI Level-3 Quality Engineering Capstone  
**System Under Test (SUT)**: [Automation Exercise](https://automationexercise.com)  
**Handover Date**: November 20, 2026  
**Repository Branch**: `master`  
**Latest Baseline Commit**: `051eeae` (Implement governed repair proposal agent)  

---

## 1. Project Overview & Objectives

This repository contains the enterprise-grade **AI Level-3 Quality Engineering Capstone**. The mission of the project is to bridge enterprise end-to-end test automation with autonomous multi-agent software engineering, bounded by deterministic governance, model-free resilience, and strict Human-in-the-Loop (HITL) safety controls.

### Core Objectives
1. **Full-Stack Test Automation**: Automate end-to-end UI and REST API test suites against the Automation Exercise platform using modern Playwright and TypeScript with strict Page Object Model (POM) architecture.
2. **Autonomous Multi-Agent Lifecycle**: Implement six specialized autonomous agents that handle the full quality lifecycle from requirement ingestion through scenario design, automated code authoring, sandboxed execution, root cause diagnostics, self-healing repair proposals, and release decision reporting.
3. **Deterministic Governance & HITL Gates**: Enforce four mandatory human approval gates preventing unauthorized code generation, unexpected execution, autonomous repository modification, or unvalidated release sign-off.
4. **Model-Free Fallback Resilience**: Provide a deterministic rule-based engine and mock provider that guarantees full pipeline execution, failure diagnosis, and report generation even when external AI models (LLMs) are unavailable, rate-limited, or offline.
5. **Diagnostic Observability & Traceability**: Maintain bidirectional traceability connecting business requirements (`REQ-xxx`), test specifications (`TC-xxx`), execution traces (`trace.zip`), failure classifications, and executive release dashboards.

---

## 2. Technology Stack & Prerequisites

### Technology Stack
- **Test Runner & Automation Core**: [Playwright](https://playwright.dev/) (`@playwright/test` v1.65.1)
- **Language & Compiler**: TypeScript (`v5.9.3`), Node.js (CommonJS modules)
- **Execution Engine**: `tsx` (`v4.23.15`) for direct TypeScript tool/agent execution
- **Target Browser**: Google Chrome (Desktop Chrome channel)
- **CI/CD Platform**: GitHub Actions (`.github/workflows/playwright.yml`)
- **Type Definitions**: `@types/node` (`v26.6.6`)

### System Prerequisites
- **Node.js**: `v18.x` or `v20.x` LTS
- **npm**: `v9.x` or higher
- **Operating System**: Windows (PowerShell), macOS, or Linux
- **Network Access**: Stable outbound internet connectivity to `https://automationexercise.com` (SUT)
- **Optional LLM Credentials**: Environment variables `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for live AI reasoning (if omitted, the pipeline runs seamlessly using the built-in `ModelFreeFallbackProvider`).

---

## 3. Project Directory Structure

```
qa-ai-level3/
├── .github/
│   └── workflows/
│       └── playwright.yml             # GitHub Actions push & PR workflow (daily cron pending)
├── docs/
│   ├── architecture.md                # Comprehensive architectural specification
│   ├── security.md                    # Data sanitization, credential redaction & prompt defenses
│   ├── test-scenarios.md              # 24-scenario design catalogue (AE-01 to AE-24)
│   └── traceability.md                # Bidirectional requirement-to-test matrix
├── reports/
│   ├── generation/                    # Code authoring summaries (JSON & Markdown)
│   ├── pipeline/                      # Consolidated multi-agent pipeline run reports
│   ├── proposals/                     # Non-destructive repair proposal artifacts
│   ├── quality/                       # Pipeline-scoped quality audit summaries
│   ├── rca/                           # Playwright failure RCA JSON reports
│   ├── scenarios/                     # Structured test scenarios from Test Design Agent
│   └── quality-summary.md             # Unified executive quality dashboard
├── src/
│   ├── agents/
│   │   ├── providers/                 # LLM and deterministic fallback providers
│   │   └── types.ts                   # Core agent schemas, interfaces, and statuses
│   ├── api/
│   │   ├── accountApi.ts              # SUT REST client for user account CRUD operations
│   │   ├── apiHelper.ts               # Payload parsing and status assertions
│   │   └── productsApi.ts             # SUT REST client for product catalog & search
│   ├── fixtures/                      # Playwright custom test fixtures
│   ├── pages/
│   │   ├── BasePage.ts                # Common navigation, ad-blocker, domcontentloaded waits
│   │   ├── CartPage.ts                # Cart table, row calculations, ID-bound deletion
│   │   ├── LoginPage.ts               # Login/signup forms, credential submissions, logout
│   │   └── ProductPage.ts             # Catalog browsing, search, modals, product details
│   ├── rca/
│   │   └── types.ts                   # 8-category failure taxonomy & classification types
│   └── utils/
│       └── testData.ts                # Dynamic user account and unique string generators
├── tests/
│   ├── agents/
│   │   └── qualityReportingAgent.spec.ts  # Agent 6 unit & governance test suite (25 tests)
│   ├── api/
│   │   └── api.spec.ts                # REST API test suite (6 tests, 20+ assertions)
│   ├── generated/
│   │   └── generated_req_ae_sub_001.spec.ts # Pipeline-generated specs via deterministic fallback (3 tests)
│   ├── rca/
│   │   ├── deterministicClassifier.spec.ts # Deterministic 8-category unit suite (24 tests)
│   │   └── repairProposalAgent.spec.ts     # Repair Proposal Agent unit suite (9 tests)
│   └── ui/
│       ├── auth.spec.ts               # Authentication UI suite (3 tests)
│       ├── cart.spec.ts               # Cart computations & persistence suite (6 tests)
│       └── product.spec.ts            # Product catalog & search suite (4 tests)
├── tools/
│   ├── agents/
│   │   ├── automationAuthoringAgent.ts # Agent 2: Playwright spec authoring & code validation
│   │   ├── executionRunner.ts         # Agent 3: Subprocess runner, ID injection, telemetry
│   │   ├── orchestrator.ts            # Master state machine orchestrator
│   │   ├── pipelineReporter.ts        # Markdown and JSON pipeline reporter
│   │   ├── qualityReportingAgent.ts   # Agent 6: Metrics, historical trends & release gates
│   │   ├── rcaAgent.ts                # Agent 4: RCA diagnostic agent (AI + deterministic)
│   │   ├── repairProposalAgent.ts     # Agent 5: Governed advisory repair proposals
│   │   ├── runPipeline.ts             # CLI entrypoint for orchestrating multi-agent runs
│   │   └── testDesignAgent.ts         # Agent 1: Requirement parsing & scenario design
│   ├── fault-injection/
│   │   ├── fi01_test_script_defect.spec.ts # Controlled invalid locator syntax test
│   │   └── fi02_network_failure.spec.ts    # Controlled network connection-reset test
│   └── rca/
│       ├── deterministicClassifier.ts # Rule-based 8-category heuristic engine
│       └── rcaReporter.ts             # Playwright custom reporter writing RCA JSON
├── HANDOVER.md                        # Master handover documentation (this file)
├── package.json                       # Scripts and project dependencies
├── playwright.config.ts               # Main Playwright test configuration
└── playwright.fault-injection.config.ts # Isolated fault-injection configuration
```

---

## 4. Architecture and Responsibilities of the Six Agents

The multi-agent system divides the quality engineering lifecycle into six specialized, loosely-coupled agents orchestrated by a central finite state machine.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       3. Execution Orchestrator                             │
└───────┬───────────────────────────┬─────────────────────────────┬───────────┘
        │                           │                             │
        ▼                           ▼                             ▼
┌───────────────┐           ┌───────────────┐             ┌───────────────┐
│ 1. Test Design│           │ 2. Automation │             │ 4. RCA Agent  │
│     Agent     │           │   Authoring   │             │(AI + Rule-FB) │
└───────┬───────┘           └───────┬───────┘             └───────┬───────┘
        │                           │                             │
        ▼                           ▼                             ▼
   [Test Specs]                [POM Specs]                 [8-Category
                                                            Diagnostics]
                                                                  │
                                                                  ▼
                                                           ┌───────────────┐
                                                           │   5. Repair   │
                                                           │   Proposal    │
                                                           └──────┬────────┘
                                                                  │
                                                                  ▼
                                                           ┌───────────────┐
                                                           │  6. Quality   │
                                                           │   Reporting   │
                                                           └───────────────┘
```

| Agent | Module | Primary Responsibilities | Inputs | Outputs | Approval Gate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Agent 1: Test Design** | `tools/agents/testDesignAgent.ts` | Derives positive, negative, and edge test scenarios using Equivalence Partitioning (EP), Boundary Value Analysis (BVA), and State Transitions. Validates output with `ScenarioValidator`. | `RequirementInput` (plain text or JSON) | `reports/scenarios/<reqId>-scenarios.json` | **Gate 1**: Human signs off on scenario scope and edge cases. |
| **Agent 2: Automation Authoring** | `tools/agents/automationAuthoringAgent.ts` | Translates approved scenarios into Playwright/TypeScript specs. Reuses existing Page Objects, enforces web-first assertions, bans `waitForTimeout`, validates AST balance. | Approved scenarios, POM interfaces | `tests/generated/*.spec.ts`, authoring summaries | **Gate 2**: Human inspects code quality and authorizes runner execution. |
| **Agent 3: Execution Orchestrator** | `tools/agents/orchestrator.ts`, `tools/agents/executionRunner.ts` | Manages pipeline state transitions. Spawns isolated Playwright runner process (`shell: false`), injects unique `AGENT_EXECUTION_ID`, captures runtime telemetry. | Approved spec paths, browser target | Process exit codes, execution telemetry, trace bundles | N/A (Runtime execution governed by Gate 2 authorization). |
| **Agent 4: Root Cause Analysis** | `tools/agents/rcaAgent.ts` | Analyzes Playwright failures. Applies deterministic 8-category rule engine; enriches with AI hypotheses when LLM is available. Validates evidence grounding and sanitizes credentials. | `RcaRunReport` from `rcaReporter.ts`, error logs, traces | `reports/rca/rca-report-*.json`, structured diagnostic output | Validates classification to prevent masking product defects. |
| **Agent 5: Repair Proposal** | `tools/agents/repairProposalAgent.ts` | Generates surgical, non-destructive remediation proposals for script/locator flaws. Strict invariants: never weakens assertions; always outputs advisory diffs. | RCA diagnostic output, failing spec code | `reports/proposals/proposal-*.json` & `.md`, advisory diffs | **Gate 3**: Mandatory human approval before any patch application. |
| **Agent 6: Quality Reporting** | `tools/agents/qualityReportingAgent.ts` | Aggregates multi-run execution metrics, deduplicates history by execution ID, evaluates historical reliability trends, computes deterministic release decision (`GO`, `NO_GO`, `CONDITIONAL_GO`). | Execution metrics, RCA reports, proposal history | `reports/quality-summary.md`, `reports/quality/*.json` | **Gate 4**: Human release manager sign-off. |

---

## 5. Agent Pipeline Workflow, Approval Gates & Fallback Engine

### End-to-End Workflow
1. **Requirement Ingestion**: Requirement is parsed (e.g. `REQ-AE-SUB-001`).
2. **Test Design Phase**: Agent 1 generates structured test scenarios. Output is validated against JSON schema.
3. **Gate 1 (HITL)**: Pipeline pauses unless `--approve-gate1` or `--approve-all` is supplied.
4. **Authoring Phase**: Agent 2 writes spec code to `tests/generated/`. Directory boundary checks and symlink rejection protect the workspace.
5. **Gate 2 (HITL)**: Pipeline pauses for code review unless `--approve-gate2` or `--approve-all` is supplied. Gate 2 is strictly independent.
6. **Execution Phase**: Agent 3 executes the test using Playwright in an isolated child process with unique `AGENT_EXECUTION_ID`.
7. **RCA Phase**: If failures occur, custom `RcaReporter` captures failure facts, and Agent 4 classifies failures under the 8-category taxonomy.
8. **Repair Proposal Phase**: Agent 5 formulates advisory remediation diffs for locator/script errors without modifying files.
9. **Gate 3 (HITL)**: Proposals require human review and sign-off.
10. **Quality Reporting Phase**: Agent 6 compiles executive metrics, historical trends, and release recommendations into `reports/quality-summary.md`.
11. **Gate 4 (HITL)**: Release recommendations remain in `PENDING` sign-off status awaiting stakeholder authorization.

### Deterministic Fallback Safety Governance
When running without live LLM credentials (or when the model times out), the pipeline uses `ModelFreeFallbackProvider`:
- **Mapped Demonstrations (`REQ-AE-SUB-001`)**: Produces valid, executable Playwright test specs using verified repository POM mappings.
- **Unmapped Requirements**: For arbitrary requirements without verified selector mappings, the fallback provider **never hallucinates selectors**. It outputs a `manual_review_<reqId>.md` file marking feasibility as `ManualReview`, preventing speculative code generation.
- **Current Operational Reality**: Live LLM API execution has not been verified in this workspace; all verified multi-agent pipeline executions have operated under the deterministic fallback engine.

---

## 6. UI and API Automation Architecture (Page Object Model)

### Page Object Model (POM) Design
Located under `src/pages/`, every POM class inherits from `BasePage`:
- **`BasePage.ts`**:
  - Global navigation links (Home, Products, Cart, Login, Logout, Delete Account).
  - Resilient `navigate(path)` configured with `{ waitUntil: 'domcontentloaded' }` to eliminate stalls from third-party advertising scripts and slow image CDNs.
  - Targeted ad-blocker route interception (`applyAdBlocker()`) to abort `googlesyndication`, `doubleclick`, and tracker domains.
- **`CartPage.ts`**:
  - Table locators (`#cart_info_table tbody tr[id^="product-"]`).
  - Strict price and quantity parsing (`getRowDetails()`).
  - Safe deletion (`deleteProduct(row)`): captures the row's unique `id` attribute *before* clicking delete, and waits for `page.locator('#' + rowId).waitFor({ state: 'detached' })`. This completely avoids the dynamic `nth()` locator re-resolution trap.
- **`ProductPage.ts`**:
  - Catalog browsing and product cards count.
  - Search input and submission handling.
  - Product detail interactions and quantity adjustments.
  - Bootstrap confirmation modal handlers (`clickContinueShopping`, `clickViewCartFromModal`).
- **`LoginPage.ts`**:
  - Data-QA locators (`[data-qa="login-email"]`, `[data-qa="login-password"]`, `[data-qa="login-button"]`).
  - Signup form locators and error message assertions.

### REST API Architecture
Located under `src/api/`:
- **`AccountApi.ts`**: Handles backend user lifecycle via direct HTTP requests (`POST /api/createAccount`, `POST /api/verifyLogin`, `GET /api/getUserDetailByEmail`, `PUT /api/updateAccount`, `DELETE /api/deleteAccount`).
- **`ProductsApi.ts`**: Handles catalog API testing (`GET /api/productsList`, `POST /api/searchProduct`, `GET /api/brandsList`).
- **`apiHelper.ts`**: Formats responses, handles status code validation, and provides structured parse error messaging.

### Hybrid UI + API Testing Pattern
The framework uses a hybrid pattern for speed and reliability:
1. **Setup**: Pre-provisions fresh, dynamic user accounts via REST API in <1 second instead of slow UI registration forms.
2. **Execution**: Performs UI operations (e.g. login, cart persistence, checkout).
3. **Teardown**: Deletes the test account via `accountApi.deleteAccount()` in a `finally` block, recording a `cleanup_warning` annotation if cleanup fails rather than masking the underlying test assertion.

---

## 7. RCA Taxonomy, Evidence Collection & Confidence Handling

### Standardized 8-Category Taxonomy
Every failure analyzed by the framework is mapped to one of eight standardized categories:
1. `PRODUCT_DEFECT`: SUT behavior deviated from specification (e.g. HTTP 500 error, business logic miscalculation).
2. `TEST_SCRIPT_DEFECT`: Authoring defect in the test code (e.g. malformed selector syntax, unhandled async promise).
3. `LOCATOR_OR_UI_CHANGE`: DOM altered legitimately, causing valid selector timeout.
4. `TEST_DATA_OR_STATE`: Dirty database state, duplicate registration collision, or missing seed data.
5. `ENVIRONMENT_OR_NETWORK`: SUT downtime, DNS failure (`net::ERR_NAME_NOT_RESOLVED`), or TCP reset (`net::ERR_CONNECTION_RESET`).
6. `TIMING_OR_FLAKINESS`: Race conditions, slow animation transitions, or asynchronous render delays.
7. `THIRD_PARTY_DEPENDENCY`: External integrations failing (e.g. Google Ads banner blocking UI, ad script abort).
8. `UNKNOWN`: Unclassified failure or ambiguous error requiring human review.

### Evidence Grounding & Confidence Scoring
- **Evidence Extraction**: `rcaReporter.ts` extracts `matchedRule`, `failingAction`, `failingLine`, `errorMessage`, `httpStatus`, `requestUrl`, and `stackTrace`.
- **Confidence Handling**: Deterministic rules assign calibrated confidence scores:
  - `0.95`: Exact network transport resets, DNS failures, or Playwright syntax parsing errors.
  - `0.90`: Third-party ad blockers or exact text matches.
  - `0.70 - 0.85`: Generic action timeouts.
  - `0.00`: Unclassified `UNKNOWN` errors.
- **AI Grounding Rule**: When an LLM hypothesis is present, its evidence citations must strictly correspond to verified runtime facts (exact HTTP status, failing action, or line number). If the AI cites hallucinated facts or generic boilerplate, the agent rejects the AI enrichment and retains the deterministic baseline (`AI_FAILED_FALLBACK`).

---

## 8. Controlled Fault-Injection Scenarios (FI-01 & FI-02)

To validate that the diagnostic system accurately separates test code bugs and network failures from product defects, two controlled fault-injection exercises are implemented under `tools/fault-injection/`:

```
tools/fault-injection/
├── fi01_test_script_defect.spec.ts   # Injects malformed selector syntax
└── fi02_network_failure.spec.ts      # Injects TCP connection reset
```

### FI-01: Test Script Defect
- **File**: `tools/fault-injection/fi01_test_script_defect.spec.ts`
- **Fault Mechanism**: Injects a syntactically invalid selector with an unclosed bracket: `button[type='submit'`.
- **Expected Classification**: `TEST_SCRIPT_DEFECT`
- **Matched Rule**: `RULE_P7_INVALID_SELECTOR_SYNTAX` (Confidence: 0.95)
- **Controlled Result**: Verified in controlled demonstration (`reports/rca/rca-report-FI-01-*.json`).

### FI-02: Network Transport Failure
- **File**: `tools/fault-injection/fi02_network_failure.spec.ts`
- **Fault Mechanism**: Uses `page.route()` to intercept a probe URL and abort with `'connectionreset'`, triggering a native `net::ERR_CONNECTION_RESET` network drop during `page.goto()`.
- **Expected Classification**: `ENVIRONMENT_OR_NETWORK`
- **Matched Rule**: `RULE_P2_ENVIRONMENT_OR_NETWORK` (Confidence: 0.95)
- **Controlled Result**: Verified in controlled demonstration (`reports/rca/rca-report-FI-02-*.json`).

---

## 9. Repair Proposal Agent and Human Approval Safeguards

Implemented in `tools/agents/repairProposalAgent.ts`, Agent 5 operates under strict governance safeguards:

### Core Capabilities
- Ingests validated RCA classification and failure evidence.
- Produces targeted, advisory repair proposals for `LOCATOR_OR_UI_CHANGE`, `TEST_SCRIPT_DEFECT`, and `THIRD_PARTY_DEPENDENCY`.
- Recommends actionable locator replacements, syntax corrections, and route-interception ad-blockers.

### Mandatory Invariants & Safeguards
1. **Assertion Integrity Invariant**: The agent is strictly prohibited from deleting, commenting out, or weakening assertions (e.g. changing `toBe(expected)` to `toBeTruthy()`, or reducing count checks).
2. **Zero Autonomous Writes**: The agent never edits production or test files directly. It outputs structured proposal files to `reports/proposals/proposal-<executionId>.json` and `.md`.
3. **Mandatory Human Sign-off (Gate 3)**: Every generated proposal sets `requiresHumanApproval = true` and `status = 'PROPOSED'`, requiring explicit review by a Quality Engineer before application.

---

## 10. Quality Reporting Agent, Historical Trends & Release Decisions

Implemented in `tools/agents/qualityReportingAgent.ts`, Agent 6 synthesizes metrics and governs the final release decision:

### Release Decision Matrix & Priority Rules
The release recommendation is deterministic, evaluated in strict order of precedence:
1. **`NO_GO` Conditions** (Highest Priority):
   - Any open `PRODUCT_DEFECT` exists in the latest run.
   - Latest execution pass rate is strictly below 85%.
   - Test execution failed to initiate or runner process crashed (`EXECUTION_PROCESS_ERROR`).
2. **`CONDITIONAL_GO` Conditions**:
   - Latest pass rate >= 85%, but open `LOCATOR_OR_UI_CHANGE` or `TEST_SCRIPT_DEFECT` exists.
   - **Historical Degradation**: Historical pass-rate trajectory is `DEGRADING` (even if the latest run achieved 100%).
   - **Recurrent Unknowns**: Historical runs contain recurrent unclassified `UNKNOWN` failure hotspots.
   - Requires explicit human investigation and documented mitigation before deployment.
3. **`GO` Conditions**:
   - 100% pass rate, zero product defects, zero process crashes, stable/improving historical trajectory, and no unclassified failure hotspots.

### Governance Guardrails
- **Anti-Hallucination Guardrail**: Deterministic release rules strictly override any AI-generated narrative. An LLM narrative can never upgrade a `NO_GO` or `CONDITIONAL_GO` to a `GO`.
- **Fault-Injection Isolation**: Runs tagged with `FI-01` or `FI-02` are automatically excluded from production release metrics.
- **Gate 4 Sign-Off**: The automated release sign-off defaults strictly to `status: 'PENDING'`. Only a human release manager can approve deployment.

---

## 11. Installation and Setup Instructions

### Step 1: Clone Repository & Install Dependencies
```powershell
cd D:\Playwright\qa-ai-level3
npm install
```

### Step 2: Install Playwright Browsers
```powershell
npx playwright install chrome
# Or install all browsers with system dependencies:
npx playwright install --with-deps
```

### Step 3: Verify Environment Setup
Ensure Node.js and npm are accessible:
```powershell
node -v   # v18.x or v20.x
npm -v    # v9.x or v10.x
```

---

## 12. Execution Commands Reference

### Standard `package.json` Scripts
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm test` | `playwright test` | Runs the full standard test suite in headless mode. |
| `npm run test:ui` | `playwright test --ui` | Launches Playwright's interactive visual UI Mode. |
| `npm run test:headed` | `playwright test --headed` | Runs tests using visible browser windows. |
| `npm run report` | `playwright show-report` | Serves the HTML Playwright report locally. |
| `npm run agents:pipeline` | `tsx tools/agents/runPipeline.ts` | Runs the multi-agent pipeline with Gate 1 approval. |
| `npm run test:fi` | `playwright test --config=playwright.fault-injection.config.ts` | Runs both controlled fault-injection tests. |
| `npm run test:fi:01` | `playwright test tools/fault-injection/fi01_test_script_defect.spec.ts --config=playwright.fault-injection.config.ts` | Runs controlled script-defect injection (FI-01). |
| `npm run test:fi:02` | `playwright test tools/fault-injection/fi02_network_failure.spec.ts --config=playwright.fault-injection.config.ts` | Runs controlled network-failure injection (FI-02). |

### Specific Suite Execution Commands (Single Worker / Chrome)

#### 1. UI Test Suites
```powershell
# Run Cart Management suite (6 tests)
npx playwright test tests/ui/cart.spec.ts --project="Google Chrome" --workers=1

# Run Product Catalog suite (4 tests)
npx playwright test tests/ui/product.spec.ts --project="Google Chrome" --workers=1

# Run Authentication suite (3 tests)
npx playwright test tests/ui/auth.spec.ts --project="Google Chrome" --workers=1

# Run UI tests in visible headed browser
npx playwright test tests/ui/product.spec.ts --headed --project="Google Chrome" --workers=1
```

#### 2. REST API Test Suite
```powershell
npx playwright test tests/api/api.spec.ts --project="Google Chrome" --workers=1
```

#### 3. Agent-Generated Pipeline Test Suite
```powershell
npx playwright test tests/generated/generated_req_ae_sub_001.spec.ts --project="Google Chrome" --workers=1
```

#### 4. Agent Governance & RCA Validation Suites
```powershell
# Run Deterministic RCA Classifier validation (24 tests)
npx playwright test tests/rca/deterministicClassifier.spec.ts --workers=1

# Run Repair Proposal Agent validation (9 tests)
npx playwright test tests/rca/repairProposalAgent.spec.ts --workers=1

# Run Quality Reporting Agent & Release Governance validation (25 tests)
npx playwright test tests/agents/qualityReportingAgent.spec.ts --workers=1

# Run combined Agent and RCA validation suites (58 tests)
npx playwright test tests/rca/ tests/agents/ --workers=1
```

#### 5. Multi-Agent Pipeline CLI Commands
```powershell
# Full autonomous pipeline with all approval gates granted
npx tsx tools/agents/runPipeline.ts --approve-all

# Run pipeline pausing at Gate 2 for code review
npx tsx tools/agents/runPipeline.ts --approve-gate1

# Run pipeline with a custom requirement input file
npx tsx tools/agents/runPipeline.ts --req my-requirement.json --approve-all
```

---

## 13. Report Locations & Artifacts Reference

| Artifact Category | Location / Path | Purpose & Content |
| :--- | :--- | :--- |
| **Executive Dashboard** | `reports/quality-summary.md` | Primary high-level release readiness report, KPI table, defect clusters, and release recommendation. |
| **Pipeline Run Reports** | `reports/pipeline/<pipelineId>-<reqId>-report.md` & `.json` | End-to-end execution audit trail, timing breakdown, scenario counts, and stage status. |
| **Scenario Specs** | `reports/scenarios/<reqId>-scenarios.json` | Structured scenarios generated by Agent 1 (preconditions, steps, assertions). |
| **Authoring Summaries** | `reports/generation/<reqId>-summary.md` & `.json` | Code generation logs, re-used Page Objects, and static code validation metrics. |
| **RCA Diagnostic Reports** | `reports/rca/rca-report-<timestamp>.json` | Custom Playwright failure report with 8-category classification and failure facts. |
| **Repair Proposals** | `reports/proposals/proposal-<executionId>.md` & `.json` | Advisory code patches, diff snippets, and risk assessments from Agent 5. |
| **Quality Audit Reports** | `reports/quality/quality-summary-<pipelineId>.md` & `.json` | Detailed metrics and release gate state for a specific pipeline execution. |
| **Playwright HTML Report** | `playwright-report/index.html` | Playwright interactive test report (`npx playwright show-report`). |
| **Test Result Bundles** | `test-results/<test-name>-Google-Chrome/` | Execution artifacts: `trace.zip`, `test-failed-1.png`, and `video.webm`. |

---

## 14. Verified Test Results & Evidence (November 20, 2026)

The following test results were executed and confirmed on **November 20, 2026**:

| Suite / Component | Executable Tests | Result | Status | Context & Fix Details |
| :--- | :---: | :---: | :---: | :--- |
| **TypeScript Typecheck** | Entire Project | **0 errors** | **VERIFIED PASSED** | Clean compile across production sources and test fixtures. |
| **Cart UI Suite** (`tests/ui/cart.spec.ts`) | 6 tests | **6 / 6 passed** | **VERIFIED PASSED** | `CART-004` fixed: resolved dynamic `nth(0)` re-resolution trap in `CartPage.deleteProduct()` by binding to captured row ID; `CART-006` navigation budget stabilized with `domcontentloaded`. |
| **Product UI Suite** (`tests/ui/product.spec.ts`) | 4 tests | **4 / 4 passed** | **VERIFIED PASSED** | `PROD-004` fixed: replaced immediate non-waiting `isVisible()` race with web-first auto-waiting assertion `expect(allProductsHeading.or(searchedProductsHeading)).toBeVisible()`. |
| **Combined Agent & RCA Suites** | 58 tests | **58 / 58 passed** | **VERIFIED PASSED** | Unit & governance suites: Deterministic Classifier (24/24), Repair Proposal Agent (9/9), Quality Reporting Agent (25/25). |
| **Agent 6 Governance Suite** | 25 tests | **25 / 25 passed** | **VERIFIED PASSED** | Release recommendation precedence, historical degradation traps, and sign-off governance verified. |
| **Generated Newsletter Pipeline** | 3 tests | **3 / 3 passed** | **VERIFIED PASSED** | Executed via pipeline using deterministic fallback provider for `REQ-AE-SUB-001` (`generated_req_ae_sub_001.spec.ts`). |
| **Fault Injection: FI-01** | 1 test | **1 / 1 failed (expected)** | **VERIFIED CLASSIFIED** | Correctly classified as `TEST_SCRIPT_DEFECT` under `RULE_P7_INVALID_SELECTOR_SYNTAX` (0.95 confidence). |
| **Fault Injection: FI-02** | 1 test | **1 / 1 failed (expected)** | **VERIFIED CLASSIFIED** | Correctly classified as `ENVIRONMENT_OR_NETWORK` under `RULE_P2_ENVIRONMENT_OR_NETWORK` (0.95 confidence). |
| **Authentication UI Suite** (`tests/ui/auth.spec.ts`) | 3 tests | 3 implemented | **NOT RECENTLY RUN** | Implemented and syntax-validated, but not included in the latest November 20 execution pass. |
| **REST API Suite** (`tests/api/api.spec.ts`) | 6 tests | 6 implemented | **NOT RECENTLY RUN** | Implementation contains 20+ assertions; not included in the latest November 20 execution pass (fresh 6/6 execution run not established in latest audit). |

> [!NOTE]
> **Total Repository UI Test Count**: **16 executable UI tests across 4 functional areas** (13 hand-crafted specs in `tests/ui/`: `AUTH` 3, `PROD` 4, `CART` 6; plus 3 pipeline-generated specs in `tests/generated/`: `ENG` 3).

---

## 15. Current Limitations, Incomplete Criteria & Recommended Next Steps

### Honest Evaluation of Capstone Acceptance Criteria

| Capstone Requirement | Target Specification | Current Status | Evidence & Remaining Gap |
| :--- | :--- | :--- | :--- |
| **UI Scenarios Coverage** | 18+ scenarios across 6 functional areas | **PARTIALLY VERIFIED** | **16 executable UI tests implemented across 4 functional areas**: 13 hand-crafted specs in `tests/ui/` (`AUTH`: 3, `PROD`: 4, `CART`: 6) plus 3 pipeline-generated specs in `tests/generated/` (`ENG` newsletter: 3, generated via deterministic fallback).<br><br>**Minimum Acceptance Gap**: **2 additional UI scenarios** (to reach 18) and **2 additional functional areas** (to reach 6). The two missing functional areas according to `docs/test-scenarios.md` are Area 4 (**`CHECK`** - Checkout, Order Processing & Invoicing) and Area 7 (**`INT`** - Hybrid UI/API Integration). Area 5 (**`ENG`**) is already partially covered via the automated newsletter subscription suite. |
| **Negative / Edge UI Tests** | 6 negative/edge UI cases | **VERIFIED** | **Satisfied with at least 6 implemented cases**: `AUTH-003` (invalid login), `AUTH-004` (duplicate email), `PROD-003` (non-existent search), `PROD-004` (whitespace search edge case), `CART-005` (empty cart edge case), and `CART-006` (guest-to-auth cart persistence), plus generated tests `TC-GEN-ENG-002` (negative malformed input validation) and `TC-GEN-ENG-003` (empty required boundary validation). |
| **API Assertions / Checks** | 8+ API assertions/checks | **IMPLEMENTED (EXECUTION PENDING)** | **Implementation contains 6 API test cases and 20+ assertions** in `tests/api/api.spec.ts` (covering transport status codes, custom JSON response codes, product schemas, full CRUD account lifecycle, and HTTP method constraints), fully satisfying the numerical coverage requirement. However, the latest audit did not establish a fresh 6/6 passing execution run (tests were not executed during the November 20 verification pass). Implementation/coverage status is confirmed, while recent passing execution remains to be re-verified. |
| **Consecutive Smoke Runs** | 3 consecutive clean smoke runs | **UNVERIFIED / PENDING** | Individual smoke tests have passed in single test runs, but 3 consecutive recorded smoke passes have not been executed and documented as a formal stability gate. |
| **Fault Injection (FI-01, FI-02)** | 2 controlled exercises with RCA artifacts | **VERIFIED** | Both FI-01 (`TEST_SCRIPT_DEFECT`) and FI-02 (`ENVIRONMENT_OR_NETWORK`) are implemented in `playwright.fault-injection.config.ts` and verified with machine-readable RCA JSON reports. |
| **RCA Artifacts Generation** | Standardized RCA JSON reports | **VERIFIED** | Custom reporter (`tools/rca/rcaReporter.ts`) generates machine-readable reports in `reports/rca/` mapping failure facts into the 8-category taxonomy. |
| **CI/CD Integration** | Push, PR, and Daily Scheduled CI | **PARTIALLY VERIFIED** | GitHub Actions `.github/workflows/playwright.yml` implements push and PR triggers. **Daily scheduled cron trigger is pending configuration**. |
| **Live LLM Execution** | AI reasoning in live mode | **UNVERIFIED / FALLBACK** | Verified multi-agent pipeline executions operate under the deterministic `ModelFreeFallbackProvider`. Live LLM connectivity with third-party API keys is unverified. |

### Recommended Next Steps for Successor Engineers

1. **Close the Minimum Acceptance Gap (2 Scenarios & 2 Functional Areas)**:
   - Implement at least one Checkout scenario in Area 4 (**`CHECK`**), e.g. `TC-AE-CHECK-001` (Register while checkout, address verification, payment, invoice download) or `TC-AE-CHECK-002` (Login before checkout, payment) in `tests/ui/checkout.spec.ts`.
   - Implement at least one Hybrid Integration scenario in Area 7 (**`INT`**), e.g. `TC-AE-INT-001` (Catalog API response vs UI DOM consistency) or `TC-AE-INT-002` (Cart calculation consistency across API and UI) in `tests/integration/integration.spec.ts`.
   - *Impact*: Implementing these two specific scenarios brings the total implemented UI tests from 16 to **18** and expands covered functional areas from 4 to **6** (`AUTH`, `PROD`, `CART`, `ENG`, `CHECK`, `INT`), directly satisfying the minimum capstone acceptance target.

2. **Broader Catalogue Coverage Improvements (Additional UI Scenarios)**:
   - Distinct from closing the minimum 6-area acceptance gap, expand test automation for remaining catalogue scenarios:
     - **Area 5 (`ENG`) Expansion**: Customer Engagement is already partially automated via `TC-GEN-ENG-001` (`AE-10` newsletter). To complete catalogue coverage, automate `TC-AE-ENG-001` (Contact Us form with file attachment upload), `TC-AE-ENG-003` (Cart page footer newsletter), and `TC-AE-ENG-004` / `TC-AE-ENG-005` (Product review submission and validation) in `tests/ui/engagement.spec.ts`.
     - **Area 2 (`PROD`) Expansion**: Automate catalogue browsing scenarios `TC-AE-PROD-005` (Category navigation), `TC-AE-PROD-006` (Brand navigation), and `TC-AE-PROD-007` (Recommended items).
     - **Area 1 (`AUTH`) Expansion**: Automate catalogue scenario `TC-AE-AUTH-001` (Full profile registration through UI forms).

3. **Execute Three Consecutive Smoke Runs**:
   - Run the smoke suite three times consecutively:
     ```powershell
     npx playwright test --grep "@smoke" --project="Google Chrome" --workers=1
     ```
   - Archive the three test run results to formally satisfy the capstone stability gate.

4. **Configure Daily Scheduled CI**:
   - Add a cron trigger to `.github/workflows/playwright.yml`:
     ```yaml
     on:
       schedule:
         - cron: '0 0 * * *' # Daily at 00:00 UTC (corresponds to 05:00 Pakistan Standard Time, UTC+5)
       push:
         branches: [ main, master ]
       pull_request:
         branches: [ main, master ]
     ```
   - *Note*: Existing `push` and `pull_request` triggers remain unchanged.

5. **Live LLM Validation**:
   - Configure an active API key (`OPENAI_API_KEY`) and execute `npx tsx tools/agents/runPipeline.ts --approve-all` to verify live AI prompt generation, evidence grounding, and narrative synthesis.

---

## 16. Git Handover Information & Continuing Development

### Git Repository State
- **Active Branch**: `master`
- **Recent Git History**:
  - `051eeae`: Implement governed repair proposal agent
  - Working directory contains verified code fixes in `src/pages/BasePage.ts` (`domcontentloaded`), `src/pages/CartPage.ts` (safe ID-bound deletion), and `tests/ui/product.spec.ts` (web-first assertion for `PROD-004`).

### Quick Start Walkthrough for a New Engineer
1. **Pull and inspect branch status**:
   ```powershell
   git status
   git branch
   ```
2. **Verify dependencies and environment**:
   ```powershell
   npm install
   npx playwright install chrome
   ```
3. **Execute the verified Agent & RCA validation suite**:
   ```powershell
   npx playwright test tests/rca/ tests/agents/ --workers=1
   ```
   *Expected outcome*: 58 passed.
4. **Execute the verified UI test suites**:
   ```powershell
   npx playwright test tests/ui/product.spec.ts tests/ui/cart.spec.ts --project="Google Chrome" --workers=1
   ```
   *Expected outcome*: 10 passed (4 Product, 6 Cart).
5. **Run the autonomous multi-agent pipeline**:
   ```powershell
   npx tsx tools/agents/runPipeline.ts --approve-all
   ```
   *Expected outcome*: Executes requirement `REQ-AE-SUB-001`, authors generated spec, executes 3 tests, generates RCA/proposal reports, and compiles `reports/quality-summary.md`.

---

*This handover document was prepared to provide complete transparency into the current engineering state, verified capabilities, governance boundaries, and remaining deliverables of the AI Level-3 Quality Engineering Capstone.*
