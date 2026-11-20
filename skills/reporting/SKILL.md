# Skill: Quality Reporting Agent

## Description
This skill guides the **Quality Reporting Agent** (Agent 6) in aggregating end-to-end automated test execution telemetry, categorizing defect trends according to the 8-point RCA taxonomy, synthesizing executive quality narratives, and delivering actionable, deterministic release recommendations for [Automation Exercise](https://automationexercise.com).

The Quality Reporting Agent serves as the capstone intelligence layer of the multi-agent autonomous testing pipeline, consolidating outputs from Test Design (Agent 1), Automation Authoring (Agent 2), Execution Orchestration (Agent 3), RCA Diagnostics (Agent 4), and Repair Proposals (Agent 5).

---

## Core Responsibilities

1. **Deterministic Quality Metrics Aggregation**:
   - Computes total test counts, pass rate, failure rate, skip rate, and flakiness rate.
   - Evaluates multi-run execution duration and performance trends.
   - Enforces strict zero-division guards when total test executions are zero.

2. **Historical Trend Analysis & Anomaly Isolation**:
   - Ingests and aggregates historical run records from `reports/pipeline/` and `reports/rca/`.
   - **Deduplication**: Correlates multi-source records by `executionId` so identical runs are never double-counted.
   - **Fault-Injection Isolation**: Automatically detects and excludes controlled fault injection runs (`FI-01`, `FI-02`) from product quality metrics and release decisions, recording them separately under an isolated audit section.

3. **8-Point Taxonomy & Defect Clustering**:
   - Aggregates RCA findings across the standardized taxonomy:
     - `PRODUCT_DEFECT` (Critical SUT bug)
     - `TEST_SCRIPT_DEFECT` (Automation code bug)
     - `LOCATOR_OR_UI_CHANGE` (UI/DOM evolution)
     - `TEST_DATA_OR_STATE` (Preconditions/state failure)
     - `ENVIRONMENT_OR_NETWORK` (Infrastructure/network instability)
     - `TIMING_OR_FLAKINESS` (Asynchronous race condition)
     - `THIRD_PARTY_DEPENDENCY` (External service outage/ad banner)
     - `UNKNOWN` (Unclassified failure requiring investigation)
   - Groups failures into actionable clusters by category, root cause summary, and affected components.

4. **Deterministic Release Recommendation Engine**:
   - Evaluates system quality against rigorous release gates:
     - **`NO_GO`**: Fails immediately if any `PRODUCT_DEFECT` is present, any `UNKNOWN` failure occurs, overall pass rate is below 85%, Gate 1 or Gate 2 was rejected, runner crashed/timed out (`EXECUTION_PROCESS_ERROR`), execution report is missing, or zero tests executed without verified validation.
     - **`CONDITIONAL_GO`**: Allowed when pass rate is $\ge 85\%$ with zero product defects, and failures are strictly confined to transient infrastructure (`ENVIRONMENT_OR_NETWORK`, `THIRD_PARTY_DEPENDENCY`) or test-script/locator defects requiring remediation prior to final sign-off.
     - **`GO`**: Granted only when 100% pass rate is achieved (`failed === 0`, `totalTests > 0`), zero regressions exist, execution was clean, and human approval gates are satisfied.

5. **AI Executive Narrative Synthesis with Model-Free Fallback**:
   - Generates an executive narrative for engineering leadership highlighting release health, primary risk factors, and next actions.
   - Incorporates `ModelFreeFallbackProvider` to guarantee deterministic, high-quality Markdown generation when LLM providers are unavailable, rate-limited, or offline.
   - **Anti-Hallucination Guardrail**: AI provider is strictly prohibited from loosening or overriding a deterministic `NO_GO` decision.

6. **Human-in-the-Loop Release Governance (Gate 4)**:
   - Evaluates release readiness in an advisory capacity.
   - All generated sign-off records strictly default to `status: 'PENDING'`. Autonomous authorization of software releases is strictly prohibited.

---

## Inputs

- **Current Pipeline Execution Context**:
  - `RequirementInput` (ID, title, target module).
  - Test execution summary (total, passed, failed, skipped, duration).
  - Human approval states (Gate 1 design approval, Gate 2 code approval).
  - Pipeline lifecycle status (e.g. `GENERATION_SUCCESS_EXECUTION_PASSED`, `GENERATION_SUCCESS_EXECUTION_FAILED`, `GATE1_REJECTED`, etc.).
- **RCA Findings**:
  - Structured `RcaRunReport` from `tools/rca/rcaReporter.ts`.
  - Machine-readable classifications, evidence citations, and confidence scores from `RcaAgent`.
- **Repair Proposals**:
  - Structured proposal outputs and advisory git diffs from `RepairProposalAgent`.
- **Historical Data Store**:
  - Historical pipeline run summaries (`reports/pipeline/*-report.json`).
  - Historical RCA reports (`reports/rca/rca-report-*.json`).

---

## Outputs & Artifact Contracts

### 1. Unified Executive Dashboard (`reports/quality-summary.md`)
A structured 12-section Markdown dashboard updated at the conclusion of every pipeline execution:
1. **Executive Title & Metadata**: Timestamp, Pipeline ID, Execution ID, Target Environment.
2. **Release Recommendation Banner**: Color-coded decision (`GO`, `NO_GO`, `CONDITIONAL_GO`) with confidence score.
3. **Executive Summary & AI Narrative**: Contextual business summary synthesized by LLM or deterministic fallback.
4. **Current Execution Quality Metrics**: Key metric table (Pass Rate, Failure Rate, Skip Rate, Flakiness Index, Duration).
5. **Human Approval Gates Status**: Status table covering Gate 1, Gate 2, Gate 3 (Repair), and Gate 4 (Release Sign-off).
6. **Defect Clustering & 8-Point RCA Breakdown**: Tabular summary of failure categories, root cause summaries, and affected files.
7. **RCA Diagnostics & Evidence Summary**: Correlated failure signatures, HTTP statuses, and error excerpts.
8. **Repair Proposal Advisory Summary**: Recommended remediations, risk levels, and human review requirements.
9. **Historical Quality Trends**: 5-run historical window, moving average pass rates, and stability trajectory.
10. **Flaky Test Watchlist**: Monitored tests with intermittent or timing-sensitive failures.
11. **Isolated Fault-Injection Audit**: Dedicated tracking of intentional test-defect and network injections (`FI-01`, `FI-02`).
12. **Mandatory Action Items & Release Sign-Off Block**: Concrete next steps and human authorization signature section.

### 2. Pipeline Quality Artifacts (`reports/quality/`)
Each pipeline run emits pipeline-scoped artifacts under `reports/quality/`:
- **Machine-Readable JSON**: `reports/quality/quality-summary-<pipelineId>.json`
- **Pipeline Markdown Report**: `reports/quality/quality-summary-<pipelineId>.md`
- **Root Latest Pointer**: `reports/quality-summary.md`

Conforms to the `QualityReportOutput` contract:
```typescript
export interface QualityReportOutput {
  reportId: string;
  pipelineId: string;
  executionId?: string;
  timestamp: string;
  requirementId: string;
  releaseRecommendation: ReleaseRecommendation;
  recommendationRationale: string;
  executiveNarrative: string;
  metrics: QualityMetrics;
  historicalTrends: HistoricalQualityTrends;
  defectClusters: DefectCluster[];
  outstandingRisks: string[];
  recommendedNextActions: string[];
  releaseSignOff: ReleaseSignOff;
  metadata: {
    executionMode: ExecutionMode;
    provider: string;
    model?: string;
    narrativeSource: 'AI_GENERATED' | 'DETERMINISTIC_HEURISTIC';
  };
  reportPaths: {
    json: string;
    markdown: string;
    latestMarkdown: string;
  };
}
```

---

## Deterministic Release Gate Decision Matrix

| Criterion | `GO` | `CONDITIONAL_GO` | `NO_GO` |
| :--- | :--- | :--- | :--- |
| **Pass Rate** | Exactly 100% | $\ge 85\%$ and $< 100\%$ (or 100% with historical degradation) | $< 85\%$ |
| **Product Defects** (`PRODUCT_DEFECT`) | 0 | 0 | $\ge 1$ |
| **Unclassified Failures** (`UNKNOWN`) | 0 in current & 0 in historical recurrence | 0 in current run | $\ge 1$ in current run |
| **Historical Trajectory** | `STABLE` or `IMPROVING` | `DEGRADING` triggers `CONDITIONAL_GO` | Degrading with active defects |
| **Historical Telemetry** | Verified ($\ge 3$ runs) or noted | Noted in conditional rationale | Missing for failed run |
| **Infrastructure / Flakiness** | 0 | Transient failures only | Any persistent blocker |
| **Automation Script Defects** | 0 | Proposed repairs pending | Multiple unaddressed |
| **Human Approval Gates** | Gate 1 & 2 Approved | Gate 1 & 2 Approved | Gate 1 or 2 Rejected |
| **Runner Process State** | Clean exit (`code 0`) | Clean exit (`code 0`) | Crash / Timeout / Error |
| **RCA Evidence Report** | Verified | Verified | Missing for failed run |
| **Release Sign-Off Status** | `PENDING` (Human Lead) | `PENDING` (Human Lead) | `PENDING` (Blocked) |

---

## Safety & Governance Invariants

1. **Anti-Hallucination Guardrail**:
   - The deterministic decision engine always executes first.
   - If the deterministic engine outputs `NO_GO`, an LLM narrative can never override or soften the recommendation to `GO` or `CONDITIONAL_GO`.
2. **Historical Reliability Invariant**:
   - A single 100% clean test execution cannot yield an unconditional `GO` if longitudinal multi-run pass rate trajectory is `DEGRADING` or if recurrent failure hotspots contain unclassified `UNKNOWN` categories. In such cases, the recommendation is downgraded to `CONDITIONAL_GO` requiring explicit Lead Quality Engineer authorization.
   - Insufficient historical telemetry (`< 3` runs) is explicitly declared in decision rationales and flagged as an outstanding risk rather than silently assuming multi-run stability.
3. **Requirement-Scoped Coverage & Narrative**:
   - Coverage metrics and release recommendations are strictly scoped to the specific requirement under test (e.g. `REQ-AE-SUB-001`), never falsely presented as 100% full application test coverage or unconditional whole-application deployment readiness.
4. **Read-Only Operation & Proposal-Only Governance**:
   - Agent 6 only reads execution artifacts and writes reports to `reports/quality/` and `reports/quality-summary.md`.
   - It is strictly prohibited from editing application code, test specs, Page Objects, or configuration files.
5. **Human Authority**:
   - Release recommendations are strictly advisory. The release sign-off block is initialized with `status: 'PENDING'` and requires human sign-off before production deployment.
6. **Data Hygiene & FI Isolation**:
   - Controlled experiments and fault injection suites (`tools/fault-injection/`) are segregated from production test metrics so deliberate failures do not corrupt the genuine SUT quality baseline.
