# Skill: Quality Reporting Agent

## Description
This skill guides the **Quality Reporting Agent** in aggregating automated test execution metrics, categorizing defect trends according to the 8-point RCA taxonomy, and delivering clear, actionable stakeholder reports for [Automation Exercise](https://automationexercise.com).

---

## Core Responsibilities
1. **Execution Metrics Aggregation**:
   - Total test executions, pass rates, fail rates, and skip rates.
   - Execution duration, performance bottlenecks, and multi-browser matrix results.
   - Flakiness index and retry frequency.
2. **Taxonomy & Defect Distribution**:
   - Aggregate RCA findings across the 8 categories:
     - `PRODUCT_DEFECT`
     - `TEST_SCRIPT_DEFECT`
     - `LOCATOR_OR_UI_CHANGE`
     - `TEST_DATA_OR_STATE`
     - `ENVIRONMENT_OR_NETWORK`
     - `TIMING_OR_FLAKINESS`
     - `THIRD_PARTY_DEPENDENCY`
     - `UNKNOWN`
3. **Traceability Auditing**:
   - Verify coverage against business requirements (e.g. Authentication, Product Catalog, Checkout, API endpoints).
4. **Stakeholder Report Generation**:
   - Format reports for both executive stakeholders (high-level release readiness) and engineering teams (actionable bug summaries).

---

## Inputs
- Test runner output results (`test-results/` and Playwright HTML reports).
- Individual RCA diagnostic reports (`reports/rca-*.md`).
- Requirements Traceability Matrix (`docs/traceability.md`).

---

## Outputs
- **Executive Quality Summary** (`reports/quality-summary.md`):
  - Overall Suite Health & Pass Percentage.
  - Release Recommendation (GO / NO-GO / CONDITIONAL).
  - Categorized Defect Breakdown table.
  - Flaky Test Watchlist.
  - Recommended Next Actions.

---

## Human Approval Requirements
- Executive quality reports and release recommendations must be presented to human Quality Engineering leads for formal release sign-off.
