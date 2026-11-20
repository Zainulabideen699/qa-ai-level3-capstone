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

| Agent Responsibility | Core Responsibilities | Inputs | Outputs | Human Approval Gate | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Test Design Agent** | Analyzes `https://automationexercise.com` features (auth, cart, checkout, API); derives test scenarios using EP, BVA, State Transition, and error guessing. | SUT specifications, user stories, OpenAPI endpoints. | Structured Test Case Specs (`TC-AE-xxx`) with clear steps, test data, and assertions. | **Gate 1**: Human verifies coverage, edge cases, and scope. | **Implemented** (`tools/agents/testDesignAgent.ts`) |
| **2. Automation Authoring Agent** | Implements clean, maintainable Playwright/TS code using Page Object Model (`src/pages/`), custom fixtures, and accessible locators (`getByRole`, `getByLabel`). | Approved Test Specs (`TC-AE-xxx`), target DOM, API docs. | Page Objects (`src/pages/*.ts`), Test specs (`tests/generated/*.spec.ts`), Fixtures. | **Gate 2**: Human reviews code quality, POM adherence, locator resilience, and authorizes execution. | **Implemented** (`tools/agents/automationAuthoringAgent.ts`) |
| **3. Execution Orchestrator & Runner** | Orchestrates the end-to-end multi-agent pipeline. Executes generated specs via controlled child process (`ExecutionRunner`), isolates runs to target browser, captures telemetry. | Requirement inputs, CLI approval flags, target browser project. | Execution metrics, process telemetry, artifact bundles (traces, videos, screenshots), routing signals. | N/A (Automated runtime orchestration; governed by Gate 1 & Gate 2). | **Implemented** (`tools/agents/orchestrator.ts`, `tools/agents/executionRunner.ts`) |
| **4. Root Cause Analysis (RCA) Agent** | Ingests Playwright failure evidence; applies deterministic 8-category classifier and optional AI hypothesis reasoning via LLMProvider. | Playwright trace files (`trace.zip`), console stderr, network status, failure screenshots. | Standardized RCA JSON report (`reports/rca/`) and structured agent analysis output. | Human validates RCA classification to prevent masking product defects. | **Implemented** (`tools/rca/rcaReporter.ts`, `tools/agents/rcaAgent.ts`) |
| **5. Repair Proposal Agent** | Proposes surgical remediation for failing tests (Page Object locators, script syntax, timing). Proposal only; strictly prohibited from weakening assertions or editing files directly. | RCA Diagnostic Report, failure evidence, existing test specs/Page Objects. | Structured repair proposal (`reports/proposals/`), advisory diffs, risk assessment. | **Gate 3**: Mandatory human sign-off before patch can be applied. | **Implemented** (`tools/agents/repairProposalAgent.ts`) |
| **6. Quality Reporting Agent** | Compiles executive quality summary, historical pass/fail trends, defect clusters, risk telemetry, and deterministic release recommendations with human sign-off governance. | Execution metrics, RCA diagnostic reports, repair proposals, pipeline history. | Executive Quality Dashboard (`reports/quality-summary.md`), JSON artifacts (`reports/quality/`). | Stakeholder release sign-off (Gate 4). | **Implemented** (`tools/agents/qualityReportingAgent.ts`) |

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

---

## 8. Multi-Agent Autonomous Pipeline (End-to-End Autonomous Pipeline)

### 8.1 Workflow Architecture & Data Flow

```
[Requirement Input (Plain English / JSON)]
                 │
                 ▼
     ┌───────────────────────┐
     │ 1. Test Design Agent  │  <── Applies EP, BVA, State Transition & Error Guessing
     └───────────┬───────────┘
                 │
                 ▼
    [Runtime Schema Validator]  <── Validates required fields, unique IDs, enums
                 │
                 ▼
  [Saved: reports/scenarios/*.json]
                 │
                 ▼
    ┌─────────────────────────┐
    │  Gate 1: HITL Approval  │  <── Quality Engineer reviews & approves scenarios (--approve-gate1)
    └────────────┬────────────┘
                 │ (Approved)
                 ▼
  ┌──────────────────────────────┐
  │ 2. Automation Authoring Agent│  <── Translates to Playwright + TypeScript POM specs
  └──────────────┬───────────────┘
                 │
                 ▼
     [Static Code Validator]    <── Enforces no waitForTimeout, balanced AST, import checks
                 │
                 ▼
   [Saved: tests/generated/*.ts] <── Directory boundary & non-generated overwrite protection
                 │
                 ▼
    ┌─────────────────────────┐
    │  Gate 2: HITL Approval  │  <── Authorizes automated execution (--approve-gate2 / --approve-all)
    └────────────┬────────────┘
                 │ (Approved)
                 ▼
  ┌──────────────────────────────┐
  │ 3. Execution Runner (Child)  │  <── Isolated child process (shell: false, project: Google Chrome)
  └──────────────┬───────────────┘
                 │
                 ▼
   [Playwright RCA Reporter]     <── Ingests failure evidence, writes reports/rca/rca-report-*.json
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 4. RCA Diagnostic Agent      │  <── Deterministic classification + optional AI hypothesis
  └──────────────┬───────────────┘
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 5. Repair Proposal Agent     │  <── Advisory patches, Gate 3 HITL proposal (reports/proposals/)
  └──────────────┬───────────────┘
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 6. Quality Reporting Agent   │  <── Metrics, trends, release recommendation (reports/quality/)
  └──────────────┬───────────────┘
                 │
                 ▼
  [Executive Quality Dashboard]  <── reports/quality-summary.md & pipeline reports
```

### 8.2 Agent Responsibilities & Contracts
1. **Agent 1: Test Design Agent (`tools/agents/testDesignAgent.ts`)**:
   - Ingests `RequirementInput` (plain English title, description, acceptance criteria, constraints).
   - Generates positive, negative, and edge-case `TestScenario` records with preconditions, test steps, expected assertions, priority, and automation feasibility.
   - Validates outputs with `ScenarioValidator`.
2. **Agent 2: Automation Authoring Agent (`tools/agents/automationAuthoringAgent.ts`)**:
   - Ingests approved scenarios and Gate 1 sign-off.
   - Reuses existing repository Page Objects (`BasePage`, `LoginPage`, `ProductPage`, `CartPage`) and API clients.
   - Enforces web-first assertions and resilient accessible locators.
   - Strictly prohibits `waitForTimeout` calls.
   - Writes generated specs to `tests/generated/`.
3. **Agent 3: Execution Runner & Orchestrator (`tools/agents/executionRunner.ts`, `tools/agents/orchestrator.ts`)**:
   - Governed by explicit Gate 2 sign-off (Gate 2 is strictly independent and never auto-approved).
   - Generates a unique execution ID (`EXEC-<timestamp>-<hash>`) per run and injects it via `AGENT_EXECUTION_ID` into the runner process.
   - Requires a machine-readable RCA report matching that execution ID to classify a run as `PASSED`. Never guesses counts from stdout regex.
   - Zero exit code without verifiable executed tests is classified as `PROCESS_ERROR`.
   - Distinguishes test assertion failures from process/runner crashes using verified report counts.
   - Spawns Playwright test runner without shell injection risks (`shell: false`). On POSIX, uses process-group detachment; on Windows, uses `taskkill /PID <PID> /T /F` with exit code inspection for clean process-tree termination.
   - Enforces canonical directory containment (`tests/generated/` realpath validation with symlink rejection) and atomic exclusive creation (`flag: 'wx'`) to prevent path traversal and overwriting of non-generated files.
4. **Agent 4: RCA Agent (`tools/agents/rcaAgent.ts`)**:
   - Ingests structured `RcaRunReport` from `tools/rca/rcaReporter.ts`.
   - Baseline: Deterministic 8-category classifier (`DeterministicClassifier`).
   - Live Mode: Enriches failure with AI diagnostic hypothesis, confidence, alternative hypotheses, and recommended actions using `LLMProvider`.
   - Strict validation: rejects missing fields, invalid categories, out-of-bounds confidence (no silent defaulting). If validation fails, classifies run as `AI_FAILED_FALLBACK` and retains deterministic classification.
   - Evidence Grounding: validates that AI citations correspond to verified failure facts (exact HTTP status, failing action, line number, or continuous substantive phrase), rejecting generic boilerplate and single-word matches.
   - Treats AI hypotheses strictly as an advisory hypothesis; never mixes AI evidence into the deterministic evidence collection.
   - Comprehensive redaction: strips Bearer/Basic tokens, API keys, passwords, cookies, query-string auth parameters, and session identifiers (JWT, session IDs).
5. **Agent 5: Repair Proposal Agent (`tools/agents/repairProposalAgent.ts`)**:
   - Ingests validated RCA classification and Playwright failure evidence.
   - Formulates surgical, non-destructive repair proposals for `LOCATOR_OR_UI_CHANGE`, `TEST_SCRIPT_DEFECT`, and transient environment issues.
   - Strictly enforces assertion integrity: never deletes, comments out, or relaxes an assertion.
   - Strictly advisory: always marks actionable proposals with `requiresHumanApproval = true` and `status = 'PROPOSED'`, prohibiting autonomous writes.
   - Generates machine-readable proposal artifacts (`reports/proposals/`).
6. **Agent 6: Quality Reporting Agent (`tools/agents/qualityReportingAgent.ts`)**:
   - Ingests test execution metrics, RCA diagnostics, repair proposals, and historical run data (`reports/pipeline/`, `reports/rca/`).
   - Computes deterministic quality metrics (pass/fail/skip rates, flakiness index, RCA category distribution, defect clustering).
   - Automatically detects and isolates fault-injection runs (`FI-01`, `FI-02`) and deduplicates multi-run history by execution ID.
   - Evaluates deterministic release recommendation engine (`GO`, `NO_GO`, `CONDITIONAL_GO`) with hard-coded anti-hallucination guardrails (LLM cannot override a `NO_GO`) and longitudinal reliability evaluation (degrading historical pass rates or recurrent unclassified `UNKNOWN` failure hotspots downgrade 100% runs to `CONDITIONAL_GO`).
   - Enforces requirement-scoped coverage metrics and narrative reporting, avoiding over-generalized whole-application claims.
   - Synthesizes executive narrative via `LLMProvider` with seamless `ModelFreeFallbackProvider` fallback.
   - Initializes release sign-off as `PENDING` under human-in-the-loop governance (Gate 4).
   - Generates the unified Executive Quality Dashboard (`reports/quality-summary.md`) and pipeline-scoped audit reports (`reports/quality/quality-summary-<pipelineId>.json` & `.md`).

### 8.3 Human-in-the-Loop Governance & Pipeline Statuses
- **Gate 1 (Test Design Sign-Off)**: Human Quality Engineer must sign off on derived test scenarios before code authoring proceeds (`--approve-gate1` or `--approve-all`).
- **Gate 2 (Code Review & Execution Authorization)**: Generated code in `tests/generated/` requires explicit approval before test execution is permitted (`--approve-gate2` or `--approve-all`).
- **Gate 3 (Repair Proposal Approval)**: Human engineer reviews advisory diffs before any code repair can be applied.
- **Gate 4 (Release Sign-Off)**: Human release manager or QA lead authorizes deployment based on the Executive Quality Dashboard and release recommendation. All automated sign-offs default strictly to `PENDING`.
- **Pipeline Lifecycle Statuses**:
  - `GENERATION_SUCCESS_EXECUTION_PASSED`: Generated code passed static checks, Gate 2 was approved, and all tests executed and passed.
  - `GENERATION_SUCCESS_EXECUTION_FAILED`: Generated code authored and approved, but runtime execution failed; RCA analysis and repair proposal performed.
  - `GENERATION_SUCCESS_EXECUTION_SKIPPED`: Generated code authored and Gate 2 approved, but test execution was intentionally skipped (`--skip-execution` or non-executable test suite).
  - `GENERATION_SUCCESS_GATE2_PENDING`: Generated code authored; pipeline paused awaiting Gate 2 human review.
  - `GATE1_REJECTED`: Test scenarios rejected or halted before code authoring.
  - `GATE2_REJECTED`: Generated code rejected by reviewer.
  - `VALIDATION_FAILED`: AST, schema, or directory boundary checks failed.
  - `EXECUTION_PROCESS_ERROR`: Test runner process crashed, timed out, or encountered an environment failure.

### 8.4 How to Run the Pipeline
1. **Full Autonomous Pipeline (Design $\to$ Authoring $\to$ Execution $\to$ RCA $\to$ Proposal $\to$ Quality Report)**:
   ```powershell
   npx tsx tools/agents/runPipeline.ts --approve-all
   ```

2. **Author Code Only (Pause at Gate 2 for Human Review)**:
   ```powershell
   npx tsx tools/agents/runPipeline.ts --approve-gate1
   ```

3. **Author Code and Skip Execution (Gate 2 Approved)**:
   ```powershell
   npx tsx tools/agents/runPipeline.ts --approve-all --skip-execution
   ```

4. **Custom Requirement via JSON File**:
   ```powershell
   npx tsx tools/agents/runPipeline.ts --req my-requirement.json --approve-all
   ```

### 8.5 Deterministic Fallback Safety Governance
- **Supported Requirements**: When running in `DETERMINISTIC_FALLBACK` mode (no API keys), verified demonstration requirements (e.g. `REQ-AE-SUB-001` Newsletter Subscription) generate working, verified Playwright test suites.
- **Unmapped Requirements**: For unsupported requirements without verified Page Object selector mappings, the fallback engine **never fabricates selectors or speculative code**. Instead, it generates a `manual_review_<reqId>.md` file with feasibility marked as `ManualReview`, preventing selector hallucination.

### 8.6 Artifact Storage Locations
- **Scenarios**: `reports/scenarios/<requirementId>-scenarios.json`
- **Generated Tests**: `tests/generated/<filename>.spec.ts`
- **Authoring Summaries**: `reports/generation/<requirementId>-summary.json` & `.md`
- **Playwright RCA Reports**: `reports/rca/rca-report-<timestamp>.json`
- **Consolidated Pipeline Reports**: `reports/pipeline/<pipelineId>-<requirementId>-report.md` & `.json`
- **Repair Proposals**: `reports/proposals/<executionId>-proposal.json` & `.md`
- **Quality Reports**: `reports/quality/quality-summary-<pipelineId>.json` & `.md`
- **Executive Quality Dashboard**: `reports/quality-summary.md`

### 8.7 Current Limitations & Future Milestones
- **All Six Autonomous Agents Fully Implemented**: Agent 1 (Design), Agent 2 (Authoring), Agent 3 (Orchestration/Runner), Agent 4 (RCA), Agent 5 (Repair Proposal), and Agent 6 (Quality Reporting) are completely operational.
- **Dynamic Third-Party CAPTCHAs**: Scenarios requiring visual puzzle solving are marked as `ManualReview` rather than attempting brittle automation.
- **CI/CD Integration**: Webhook notification dispatch and automated PR creation from approved repair proposals represent future platform integrations.

