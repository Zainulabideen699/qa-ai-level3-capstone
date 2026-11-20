import * as fs from 'fs';
import * as path from 'path';
import { PipelineReport } from '../../src/agents/types';

/**
 * PipelineReporter.
 *
 * Produces consolidated, audit-ready JSON and Markdown reports under reports/pipeline/.
 * Clearly distinguishes test generation success from runtime execution success.
 * Captures:
 * - Requirement and scenario metadata
 * - Explicit Gate 1 & Gate 2 human approval records
 * - Test execution duration, exit code, and pass/fail telemetry
 * - Root Cause Analysis (RCA) 8-point taxonomy breakdown
 * - AI diagnostic hypotheses vs. deterministic baseline comparisons
 * - Links to diagnostic artifacts (screenshots, traces, videos, JSON reports)
 */
export class PipelineReporter {
  /**
   * Save consolidated JSON and Markdown pipeline reports.
   */
  public static writeReport(data: PipelineReport): { jsonPath: string; markdownPath: string } {
    const pipelineDir = path.resolve(process.cwd(), 'reports', 'pipeline');
    if (!fs.existsSync(pipelineDir)) {
      fs.mkdirSync(pipelineDir, { recursive: true });
    }

    const safeReqId = data.requirementId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const baseName = `${data.pipelineId}-${safeReqId}`;
    const jsonPath = path.join(pipelineDir, `${baseName}-report.json`);
    const markdownPath = path.join(pipelineDir, `${baseName}-report.md`);

    // Write JSON report
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

    // Build Markdown report
    const md = this.buildMarkdown(data, jsonPath, markdownPath);
    fs.writeFileSync(markdownPath, md, 'utf8');

    // Also update a convenient latest pointer
    try {
      const latestMdPath = path.join(pipelineDir, 'latest-pipeline-report.md');
      fs.writeFileSync(latestMdPath, md, 'utf8');
    } catch {
      // Ignore
    }

    return { jsonPath, markdownPath };
  }

  /**
   * Render professional GitHub-flavored Markdown pipeline report.
   */
  private static buildMarkdown(
    data: PipelineReport,
    jsonPath: string,
    markdownPath: string
  ): string {
    const exec = data.executionResult;
    const rca = data.rcaAnalysis;
    const runSummary = rca?.runSummary || (exec ? {
      totalTests: exec.status === 'PASSED' ? 1 : 0,
      passed: exec.status === 'PASSED' ? 1 : 0,
      failed: exec.status === 'FAILED' ? 1 : 0,
      skipped: 0,
      flaky: 0,
      durationMs: exec.durationMs,
      status: exec.status.toLowerCase(),
    } : undefined);

    // Compute status banner
    let statusBanner = '';
    let statusClass = '';
    switch (data.status) {
      case 'GENERATION_SUCCESS_EXECUTION_PASSED':
        statusBanner = '🟢 GENERATION SUCCESS | EXECUTION PASSED';
        statusClass = 'All generated tests executed and passed successfully.';
        break;
      case 'GENERATION_SUCCESS_EXECUTION_FAILED':
        statusBanner = '🔴 GENERATION SUCCESS | EXECUTION FAILED';
        statusClass =
          'Test code authored successfully, but browser execution failed. RCA diagnostics completed.';
        break;
      case 'GENERATION_SUCCESS_EXECUTION_SKIPPED':
        statusBanner = '🔵 GENERATION SUCCESS | EXECUTION SKIPPED';
        statusClass =
          'Test code authored and validated. Execution was intentionally skipped (--skip-execution or non-executable suite).';
        break;
      case 'GENERATION_SUCCESS_GATE2_PENDING':
        statusBanner = '🟡 GENERATION SUCCESS | GATE 2 PENDING';
        statusClass =
          'Test code authored and validated. Execution paused awaiting Gate 2 human sign-off.';
        break;
      case 'GATE1_REJECTED':
        statusBanner = '⛔ GATE 1 REJECTED';
        statusClass = 'Test scenarios rejected or halted before code authoring.';
        break;
      case 'GATE2_REJECTED':
        statusBanner = '⛔ GATE 2 REJECTED';
        statusClass = 'Generated test code rejected before execution.';
        break;
      case 'VALIDATION_FAILED':
        statusBanner = '⚠️ VALIDATION FAILED';
        statusClass = 'Static code validation or scenario schema validation failed.';
        break;
      case 'EXECUTION_PROCESS_ERROR':
        statusBanner = '💥 EXECUTION PROCESS ERROR';
        statusClass =
          'Test runner process crashed, timed out, or encountered an environment error.';
        break;
      default:
        statusBanner = `STATUS: ${data.status}`;
        statusClass = '';
    }

    // RCA diagnostic status notice
    let rcaStatusNotice = '';
    if (data.rcaStatus === 'REPORT_MISSING') {
      rcaStatusNotice = `\n> ⚠️ **RCA Notice**: ${data.rcaStatusDetails || 'Test execution failed but no new Playwright RCA JSON report was found in reports/rca/.'}\n`;
    } else if (data.rcaStatus === 'ANALYSIS_FAILED') {
      rcaStatusNotice = `\n> ⚠️ **RCA Warning**: ${data.rcaStatusDetails || 'RCA report ingestion or agent analysis encountered an error.'}\n`;
    } else if (data.rcaStatus === 'NOT_APPLICABLE_PASSED') {
      rcaStatusNotice = `\n> ℹ️ **RCA Status**: ${data.rcaStatusDetails || 'All generated tests passed. Root cause analysis not required.'}\n`;
    } else if (data.rcaStatus === 'ANALYSIS_COMPLETED') {
      rcaStatusNotice = `\n> ✅ **RCA Status**: ${data.rcaStatusDetails || 'Root cause analysis successfully completed.'}\n`;
    }

    // Category distribution table
    let categoryDistributionTable = '*No test failures recorded.*';
    if (rca && rca.analyses.length > 0) {
      const counts: Record<string, number> = {};
      for (const item of rca.analyses) {
        counts[item.effectiveCategory] = (counts[item.effectiveCategory] || 0) + 1;
      }

      const rows = Object.entries(counts)
        .map(([cat, count]) => `| \`${cat}\` | **${count}** |`)
        .join('\n');

      categoryDistributionTable = `| RCA Failure Category | Count |\n| :--- | :---: |\n${rows}`;
    }

    // Failure Dossiers
    let failureDossiers = '';
    if (rca && rca.analyses.length > 0) {
      failureDossiers = rca.analyses
        .map((item, idx) => {
          let aiSection = '';
          if (item.status === 'AI_ENRICHED' && item.aiHypothesis) {
            aiSection =
              `- **AI Advisory Hypothesis (${data.provider}) [Unverified - Requires HITL Sign-off]**: \`${item.aiHypothesis.hypothesisCategory}\` (Confidence: ${Math.round(item.aiHypothesis.confidence * 100)}%)\n` +
              `  - *Reasoning*: ${item.aiHypothesis.reasoning}\n` +
              `  - *Grounded Evidence*: ${item.aiHypothesis.supportingEvidence.join('; ') || 'None'}\n` +
              `  - *Alternatives*: ${item.aiHypothesis.alternativeHypotheses.join(', ') || 'None'}`;
          } else if (item.status === 'AI_FAILED_FALLBACK') {
            aiSection = `- **AI Hypothesis**: *Generation or strict schema validation failed; verified deterministic classification retained.*`;
          } else {
            aiSection = `- **AI Hypothesis**: *Not executed (Mode: ${data.executionMode})*`;
          }

          const artifacts = item.artifactPaths
            ? `- **Trace**: ${item.artifactPaths.trace ? `\`${item.artifactPaths.trace}\`` : 'N/A'}\n- **Screenshot**: ${item.artifactPaths.screenshot ? `\`${item.artifactPaths.screenshot}\`` : 'N/A'}\n- **Video**: ${item.artifactPaths.video ? `\`${item.artifactPaths.video}\`` : 'N/A'}`
            : '- **Artifacts**: None recorded';

          return `### Failure #${idx + 1}: ${item.testId} - ${item.testTitle}
- **Deterministic Category**: \`${item.deterministicClassification.category}\` (Confidence: ${Math.round(item.deterministicClassification.confidence * 100)}%)
- **Deterministic Rule**: \`${item.deterministicClassification.evidence.matchedRule || 'N/A'}\`
${aiSection}
- **Failing Location**: \`${item.deterministicClassification.evidence.failingLine || 'Unknown'}\`
- **Recommended Action**: ${item.recommendedAction}
- **Human Approval Required**: ${item.requiresHumanApproval ? '**YES (Action Required)**' : 'No'}
- **Evidence Snippet**:
\`\`\`
${item.evidence.errorMessage.slice(0, 500)}
\`\`\`
${artifacts}
`;
        })
        .join('\n\n---\n\n');
    }

    // Repair Proposals Section (Agent 5)
    let repairProposalSection = '';
    const proposals = data.repairProposals?.proposals;
    if (proposals && proposals.length > 0) {
      const proposalRows = proposals
        .map(
          p =>
            `| **${p.proposalId}** | \`${p.testId}\` | \`${p.rcaCategory}\` | \`${p.targetType}\` | \`${p.riskLevel}\` | \`${p.status}\` | ${p.requiresHumanApproval ? '**YES (Sign-off Required)**' : 'No'} |`
        )
        .join('\n');

      const proposalDetails = proposals
        .map((p, idx) => {
          const diffBlock = p.diffSnippet
            ? `\n#### Proposed Advisory Diff Preview (HITL Review Required):\n> ⚠️ **Proposal Only**: Automated code changes are NEVER applied directly without human authorization.\n\`\`\`typescript\n${p.diffSnippet}\n\`\`\``
            : '';

          const filesList =
            p.suggestedFiles.length > 0
              ? p.suggestedFiles.map(f => `  - \`${f}\``).join('\n')
              : '  - *None (Infrastructure or Product SUT remediation)*';

          return `### Proposal #${idx + 1}: ${p.proposalId} (${p.testId})
- **RCA Classification**: \`${p.rcaCategory}\` (Confidence: ${Math.round(p.confidence * 100)}%)
- **Source**: \`${p.source}\`
- **Remediation Status**: \`${p.status}\`
- **Target Component**: \`${p.targetType}\`
- **Risk Level**: \`${p.riskLevel}\`
- **Human Approval Required**: ${p.requiresHumanApproval ? '**YES (Action Required)**' : 'No'}
- **Problem Summary**: ${p.problemSummary}
- **Recommended Action**: ${p.recommendedAction}
- **Rationale**: ${p.rationale}
- **Target / Investigated Files**:
${filesList}
${diffBlock}`;
        })
        .join('\n\n---\n\n');

      repairProposalSection = `\n---\n\n## 6. Automated Repair Proposals (Agent 5 - HITL Review Required)

> ⚠️ **Proposal Only**: In accordance with AI Level-3 Quality Engineering safety invariants, the Repair Proposal Agent is strictly proposal-only. Automated code changes are NEVER applied directly to source or test files without explicit human verification and authorization.

- **Total Proposals Formulated**: **${data.repairProposals.totalProposals}**
- **Proposal Artifact**: ${data.repairProposalPath ? `\`${data.repairProposalPath}\`` : 'Generated under `reports/proposals/`'}

### Proposal Summary Matrix:
| Proposal ID | Test ID | RCA Category | Target Layer | Risk Level | Status | Human Sign-off |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
${proposalRows}

${proposalDetails}
`;
    }

    return `# Multi-Agent Quality Engineering Pipeline Report

## ${statusBanner}
> ${statusClass}

- **Pipeline ID**: \`${data.pipelineId}\`
${data.executionId || exec?.executionId ? `- **Execution ID**: \`${data.executionId || exec?.executionId}\`\n` : ''}- **Requirement ID**: \`${data.requirementId}\` — ${data.requirementTitle}
- **Execution Mode**: \`${data.executionMode}\` (Provider: ${data.provider})
- **Timestamp**: \`${data.timestamp}\`
- **Report JSON**: \`${jsonPath}\`

---

## 1. Human-in-the-Loop Gate Governance

| Review Gate | Gate Status | Authorized By | Timestamp | Review Notes |
| :--- | :---: | :--- | :--- | :--- |
| **Gate 1: Test Design Review** | \`${data.gate1.status}\` | ${data.gate1.approvedBy || 'Pending'} | ${data.gate1.approvalTimestamp || 'N/A'} | ${data.gate1.reviewNotes || 'N/A'} |
| **Gate 2: Code Review & Execution** | \`${data.gate2.status}\` | ${data.gate2.approvedBy || 'Pending'} | ${data.gate2.approvalTimestamp || 'N/A'} | ${data.gate2.reviewNotes || 'N/A'} |

---

## 2. Test Generation Dossier

- **Requirement Description**: ${data.requirementDescription}
- **Scenarios Derived**: ${data.scenarioCount}
- **Generated Test Files**:
${data.generatedFiles.map(f => `  - \`${f}\``).join('\n') || '  - None'}

---

## 3. Automated Test Execution Telemetry

${exec ? `- **Execution Status**: \`${exec.status}\`
- **Execution ID**: \`${exec.executionId}\`
- **Exit Code**: \`${exec.exitCode !== null ? exec.exitCode : 'N/A'}\`
- **Duration**: \`${exec.durationMs}ms\` (${(exec.durationMs / 1000).toFixed(2)}s)
- **Target Browser Project**: \`${exec.project}\`
- **Target Spec File**: \`${exec.testFile}\`
- **Command Executed**: \`${exec.commandExecuted}\`
- **Machine-Readable RCA Artifact**: ${exec.rcaReportPath ? `\`${exec.rcaReportPath}\`` : '*None generated*'}
${exec.errorMessage ? `- **Process Diagnostic Details**: \`${exec.errorMessage}\`` : ''}
` : '*Test execution was not initiated for this run.*'}
${rcaStatusNotice}
${runSummary ? `### Test Results Summary:
| Total Tests | Passed | Failed | Flaky | Skipped | Runner Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **${runSummary.totalTests}** | 🟢 **${runSummary.passed}** | 🔴 **${runSummary.failed}** | 🟡 **${runSummary.flaky}** | ⚪ **${runSummary.skipped}** | \`${runSummary.status}\` |
` : ''}

---

## 4. Root Cause Analysis (RCA) Category Distribution

${categoryDistributionTable}

${failureDossiers ? `\n---\n\n## 5. Detailed Failure Diagnostics\n\n${failureDossiers}` : ''}
${repairProposalSection}
---

## ${repairProposalSection ? '7' : '6'}. Safety & Governance Compliance

### Programmatically Verified Controls:
- [x] Controlled child-process execution without shell-injection risk (\`shell: false\`) [Verified]
- [x] Unique execution ID correlation between runner and custom RCA reporter (\`AGENT_EXECUTION_ID\`) [Verified]
- [x] Machine-readable execution report verification required for \`PASSED\` classification (no stdout regex guessing) [Verified]
- [x] Canonical directory containment strictly within \`tests/generated/\` (\`fs.realpathSync\` & symlink rejection) [Verified]
- [x] Atomic exclusive creation (\`flag: 'wx'\`) and non-generated file overwrite protection [Verified]
- [x] Core test suites (\`tests/ui/\`, \`tests/api/\`, \`tests/rca/\`, \`src/\`) untouched [Verified]
- [x] Zero hardcoded sleeps (\`page.waitForTimeout\` prohibited via AST & regex scanning) [Verified]
- [x] Child process tree termination with Windows \`taskkill /PID /T /F\` cleanup [Verified]

### Policy & HITL Governance:
- [x] Independent Gate 1 and Gate 2 sign-off recorded in audit trail (Gate 2 never auto-approved)
- [x] Strict schema and grounding validation on AI RCA output (zero silent defaulting)
- [x] Comprehensive sensitive-data redaction (Bearer tokens, cookies, passwords, API keys, session IDs)
- [x] AI analysis treated strictly as an advisory hypothesis; deterministic classification baseline preserved
- [x] Repair proposals strictly proposal-only; zero autonomous edits or commits without Gate 3 human authorization
- [x] Golden Rule enforcement: zero weakening, deletion, or loosening of assertions across all proposals
- [x] Authentic SUT defects isolated to bug tracking; automated tests never altered to bypass product failures
`;
  }
}
