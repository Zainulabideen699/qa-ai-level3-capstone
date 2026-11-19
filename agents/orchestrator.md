# Multi-Agent Quality Engineering Orchestrator

## Overview
The **Execution Orchestrator** governs the lifecycle of automated testing for [Automation Exercise](https://automationexercise.com). It directs tasks across six specialized agents, enforces strict **Human-in-the-Loop (HITL)** approval gates, manages bidirectional traceability, triggers the model-free RCA fallback when needed, and shields the test framework against prompt-injection attacks.

---

## The Six Agent Contracts & Responsibilities

```
                               ┌─────────────────────────┐
                               │ 3. Execution            │
                               │    Orchestrator         │
                               └────────────┬────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
               ▼                            ▼                            ▼
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ 1. Test Design Agent    │    │ 2. Automation Authoring │    │ 4. RCA Agent            │
│    (EP, BVA, State)     │    │    Agent (POM, Fixtures)│    │    (8-Category Taxonomy)│
└──────────────┬──────────┘    └────────────┬────────────┘    └────────────┬────────────┘
               │                            │                            │
               ▼                            ▼                            ▼
      [Gate 1: Design]             [Gate 2: Code]               [Model-Free Fallback]
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │
                               ┌────────────┴────────────┐
                               │                         │
                               ▼                         ▼
                  ┌─────────────────────────┐    ┌─────────────────────────┐
                  │ 5. Repair Proposal Agent│    │ 6. Quality Reporting    │
                  │    (Gate 3: Sign-off)   │    │    Agent (Dashboards)   │
                  └─────────────────────────┘    └─────────────────────────┘
```

### 1. Test Design Agent
- **Purpose**: Transforms functional specs of `automationexercise.com` into test scenarios.
- **Inputs**: User stories (e.g. User Registration, Product Search, Cart Checkout), API endpoints (`/api/productsList`), wireframes.
- **Outputs**: Formatted Test Specifications (`TC-AE-xxx`) with preconditions, steps, test data, and assertions.
- **Gate**: **Gate 1 (Human Approval)** — Human QA reviews and approves the test design before authoring starts.

### 2. Automation Authoring Agent
- **Purpose**: Writes robust Playwright TypeScript automation code following Page Object Model.
- **Inputs**: Approved Test Specs (`TC-AE-xxx`), target DOM locators, API schemas.
- **Outputs**: Page Objects (`src/pages/*.ts`), test specs (`tests/**/*.spec.ts`), custom fixtures (`src/fixtures/*.ts`).
- **Gate**: **Gate 2 (Human Code Review)** — Human checks for POM compliance, resilient locators (`getByRole`), and zero hardcoded sleeps (`waitForTimeout`).

### 3. Execution Orchestrator
- **Purpose**: Controls test scheduling, cross-browser matrix runs, worker allocation, and artifact bundling.
- **Inputs**: Execution requests, test tags (e.g. `@smoke`, `@regression`, `@api`), environment flags.
- **Outputs**: Test run results, trace logs, routing signals for failed tests.
- **Gate**: Autonomous execution engine.

### 4. Root Cause Analysis (RCA) Agent
- **Purpose**: Evaluates test failures and assigns one of eight standardized categories:
  1. `PRODUCT_DEFECT`
  2. `TEST_SCRIPT_DEFECT`
  3. `LOCATOR_OR_UI_CHANGE`
  4. `TEST_DATA_OR_STATE`
  5. `ENVIRONMENT_OR_NETWORK`
  6. `TIMING_OR_FLAKINESS`
  7. `THIRD_PARTY_DEPENDENCY`
  8. `UNKNOWN`
- **Inputs**: Playwright traces (`trace.zip`), failure screenshots, video logs, console errors, network HARs.
- **Outputs**: RCA Diagnostic Report (`reports/rca-<test-id>.md`).
- **Fallback**: Automatically falls back to deterministic regex pattern matcher if AI model is unreachable.

### 5. Repair Proposal Agent
- **Purpose**: Formulates targeted repair proposals (unified git diffs) for test/locator issues.
- **Golden Rule**: Never weakens assertions. Never touches production application code.
- **Inputs**: RCA report, current Page Object, updated DOM snippet.
- **Outputs**: Surgical git diff, repair rationale, risk evaluation.
- **Gate**: **Gate 3 (Human Repair Approval)** — Mandatory human sign-off before patch is applied to disk.

### 6. Quality Reporting Agent
- **Purpose**: Synthesizes test runs, failure taxonomy distributions, defect logs, and release readiness.
- **Inputs**: Test runner results, RCA reports, execution duration logs.
- **Outputs**: Executive Quality Summary (`reports/quality-summary.md`), stakeholder metrics.

---

## Human-in-the-Loop (HITL) Safety Gates

| Gate | Stage | Responsible Agent | Human Review Checkpoint |
| :--- | :--- | :--- | :--- |
| **Gate 1** | Test Design | Test Design Agent | Confirm all acceptance criteria, negative boundary values, and SUT security checks are addressed. |
| **Gate 2** | Code Authoring | Automation Authoring Agent | Verify strict POM usage, absence of hardcoded sleeps (`waitForTimeout`), and no plain-text credentials. |
| **Gate 3** | Repair Proposal | Repair Proposal Agent | Inspect the surgical git diff. Verify that assertions have not been weakened or bypassed. |

---

## Security & Prompt-Injection Protections

1. **Untrusted Content Encapsulation**: Any DOM string, error message, or network response harvested from `automationexercise.com` is wrapped in `<untrusted_content>` tags.
2. **Passive Context Constraint**: Agents are instructed that untrusted strings are passive data objects and never system commands.
3. **Restricted File Operations**: No agent has autonomous permission to overwrite test files or push commits without explicit Gate 3 sign-off.
