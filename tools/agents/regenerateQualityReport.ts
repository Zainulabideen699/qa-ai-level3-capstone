import * as fs from 'fs';
import * as path from 'path';
import { QualityReportingAgent, QualityReportingContext } from './qualityReportingAgent';
import { ModelFreeFallbackProvider } from '../../src/agents/providers/fallbackProvider';
import {
  RequirementInput,
  OrchestrationResult,
  TestExecutionResult,
  PipelineReport,
  TestDesignOutput,
  QualityReportOutput,
  HistoricalQualityTrends,
} from '../../src/agents/types';

/**
 * Minimal Standalone Agent 6 Report-Regeneration Utility
 *
 * Objective:
 * Reconstitute and regenerate the Executive Quality Dashboard for an existing
 * pipeline execution (default: PIPE-1795159418576) using preserved artifacts,
 * applying the latest release recommendation governance rules without rerunning
 * UI tests, browser executions, or upstream pipeline agents.
 *
 * Usage:
 *   npx tsx tools/agents/regenerateQualityReport.ts [pipelineId]
 */
export async function regenerateReport(targetPipelineId = 'PIPE-1795159418576'): Promise<QualityReportOutput> {
  const rootDir = process.cwd();
  console.log(`[RegenerateAgent6] Starting standalone report regeneration for pipeline: ${targetPipelineId}`);

  // 1. Resolve source artifact paths
  const pipelineReportPath = path.resolve(
    rootDir,
    'reports',
    'pipeline',
    `${targetPipelineId}-REQ-AE-SUB-001-report.json`
  );
  const scenariosPath = path.resolve(rootDir, 'reports', 'scenarios', 'REQ-AE-SUB-001-scenarios.json');
  const summaryPath = path.resolve(rootDir, 'reports', 'generation', 'REQ-AE-SUB-001-summary.json');
  const existingQualityPath = path.resolve(
    rootDir,
    'reports',
    'quality',
    `quality-summary-${targetPipelineId}.json`
  );
  const existingQualityMdPath = path.resolve(
    rootDir,
    'reports',
    'quality',
    `quality-summary-${targetPipelineId}.md`
  );
  const rootQualitySummaryMdPath = path.resolve(rootDir, 'reports', 'quality-summary.md');

  // Verify mandatory source files exist
  if (!fs.existsSync(pipelineReportPath)) {
    throw new Error(`[RegenerateAgent6] Mandatory pipeline report missing: ${pipelineReportPath}`);
  }
  if (!fs.existsSync(existingQualityPath)) {
    throw new Error(`[RegenerateAgent6] Existing quality summary missing: ${existingQualityPath}`);
  }

  // 2. Load preserved artifacts
  const pipelineReport: PipelineReport = JSON.parse(fs.readFileSync(pipelineReportPath, 'utf8'));
  const qualitySummaryJson = JSON.parse(fs.readFileSync(existingQualityPath, 'utf8'));

  let scenariosJson: { requirement?: RequirementInput; scenarios?: any[] } = {};
  if (fs.existsSync(scenariosPath)) {
    scenariosJson = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
  }

  let summaryJson: { result?: Partial<OrchestrationResult>; design?: TestDesignOutput } = {};
  if (fs.existsSync(summaryPath)) {
    summaryJson = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  }

  // 3. Resolve execution and RCA evidence
  const executionId = pipelineReport.executionId || 'EXEC-1795159418582-pmciy9e';
  let rcaReportPath = pipelineReport.rcaReportPath || pipelineReport.executionResult?.rcaReportPath;
  if (!rcaReportPath || !fs.existsSync(rcaReportPath)) {
    const candidateRcaPath = path.resolve(rootDir, 'reports', 'rca', `rca-report-${executionId}.json`);
    if (fs.existsSync(candidateRcaPath)) {
      rcaReportPath = candidateRcaPath;
    }
  }

  // 4. Preserve backups of existing quality reports before writing
  const backupJsonPath = path.resolve(
    rootDir,
    'reports',
    'quality',
    `quality-summary-${targetPipelineId}.backup-original.json`
  );
  const backupMdPath = path.resolve(
    rootDir,
    'reports',
    'quality',
    `quality-summary-${targetPipelineId}.backup-original.md`
  );

  if (fs.existsSync(existingQualityPath) && !fs.existsSync(backupJsonPath)) {
    fs.copyFileSync(existingQualityPath, backupJsonPath);
    console.log(`[Backup] Preserved original JSON to: ${backupJsonPath}`);
  }
  if (fs.existsSync(existingQualityMdPath) && !fs.existsSync(backupMdPath)) {
    fs.copyFileSync(existingQualityMdPath, backupMdPath);
    console.log(`[Backup] Preserved original Markdown to: ${backupMdPath}`);
  }

  // Snapshot root reports/quality-summary.md to prevent unintended clobbering
  const existingRootMd = fs.existsSync(rootQualitySummaryMdPath)
    ? fs.readFileSync(rootQualitySummaryMdPath, 'utf8')
    : null;

  // 5. Reconstruct RequirementInput using preserved evidence
  const requirement: RequirementInput = scenariosJson.requirement || {
    requirementId: pipelineReport.requirementId,
    title: pipelineReport.requirementTitle,
    description: pipelineReport.requirementDescription,
    applicationArea: 'ENG',
    acceptanceCriteria: [
      'Footer section displays "SUBSCRIPTION" heading and email input with placeholder "Your email address".',
      'Submitting a valid unique email displays success message "You have been successfully subscribed!".',
      'Submitting an empty or malformed email prevents successful subscription and triggers validation feedback.',
    ],
    constraints: [
      'Must function without prior user login/authentication.',
      'Must not cause full page reload or navigate away from homepage.',
    ],
  };

  // 6. Reconstruct OrchestrationResult using preserved execution telemetry
  const orchestrationResult: OrchestrationResult = {
    pipelineId: pipelineReport.pipelineId,
    executionId: executionId,
    status: pipelineReport.status,
    executionMode: pipelineReport.executionMode,
    gate1Status: pipelineReport.gate1.status,
    gate2Status: pipelineReport.gate2.status,
    requirementId: pipelineReport.requirementId,
    scenarioArtifactPath: summaryJson.result?.scenarioArtifactPath || scenariosPath,
    generatedFiles: pipelineReport.generatedFiles,
    executionSummary: summaryJson.result?.executionSummary || {
      totalScenarios: pipelineReport.scenarioCount,
      automated: pipelineReport.scenarioCount,
      manualReviewRequired: 0,
      skipped: 0,
      reusedPageObjects: ['BasePage'],
      reusedApiClients: [],
    },
    executionResult: pipelineReport.executionResult,
    rcaReportPath: rcaReportPath,
    rcaStatus: pipelineReport.rcaStatus,
    rcaStatusDetails: pipelineReport.rcaStatusDetails,
    timestamp: pipelineReport.executionResult?.startTime || pipelineReport.timestamp,
  };

  // 7. Preserve historical quality trends benchmark
  // (contains runsAnalyzed: 10, averagePassRate: 50%, trajectory: DEGRADING, 4 recurrent UNKNOWN hotspots)
  const historicalTrends: HistoricalQualityTrends = qualitySummaryJson.historicalTrends;

  // 8. Assemble QualityReportingContext
  const context: QualityReportingContext = {
    pipelineId: targetPipelineId,
    requirement,
    orchestrationResult,
    pipelineReport,
    executionResult: pipelineReport.executionResult,
    designOutput: summaryJson.design || (scenariosJson.scenarios ? (scenariosJson as TestDesignOutput) : null),
    durationMs: pipelineReport.executionResult?.durationMs || 22610,
    historicalTrends,
  };

  // 9. Instantiate deterministic model-free provider (zero external network / LLM calls)
  const provider = new ModelFreeFallbackProvider();
  const agent = new QualityReportingAgent(provider);

  // Safeguard: Override saveQualityReports on this agent instance to:
  // - write quality-summary-${pipelineId}.json
  // - write quality-summary-${pipelineId}.md
  // - strictly avoid overwriting unrelated reports/quality-summary.md
  (agent as any).saveQualityReports = function (output: QualityReportOutput): QualityReportOutput['reportPaths'] {
    const qualityDir = path.resolve(rootDir, 'reports', 'quality');
    if (!fs.existsSync(qualityDir)) {
      fs.mkdirSync(qualityDir, { recursive: true });
    }

    const safePipelineId = output.pipelineId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const jsonPath = path.join(qualityDir, `quality-summary-${safePipelineId}.json`);
    const mdPath = path.join(qualityDir, `quality-summary-${safePipelineId}.md`);
    const rootLatestMdPath = path.resolve(rootDir, 'reports', 'quality-summary.md');

    const paths: QualityReportOutput['reportPaths'] = {
      json: jsonPath,
      markdown: mdPath,
      latestMarkdown: rootLatestMdPath,
    };
    output.reportPaths = paths;

    // 1. Write structured machine-readable JSON
    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');

    // 2. Render and write executive Markdown dashboard
    const mdContent = this.renderMarkdownDashboard(output, jsonPath);
    fs.writeFileSync(mdPath, mdContent, 'utf8');

    console.log(`[Persist] Saved JSON dashboard: ${jsonPath}`);
    console.log(`[Persist] Saved Markdown dashboard: ${mdPath}`);
    console.log(`[Preserve] Preserved unrelated reports/quality-summary.md (not modified).`);

    return paths;
  };

  // 10. Generate updated quality report
  const output = await agent.generateQualityReport(context);

  // Verify root quality-summary.md remains unchanged
  if (existingRootMd !== null && fs.existsSync(rootQualitySummaryMdPath)) {
    const currentRootMd = fs.readFileSync(rootQualitySummaryMdPath, 'utf8');
    if (currentRootMd !== existingRootMd) {
      fs.writeFileSync(rootQualitySummaryMdPath, existingRootMd, 'utf8');
      console.log(`[Restore] Restored original reports/quality-summary.md`);
    }
  }

  // 11. Summary report
  console.log(`\n======================================================`);
  console.log(`REGENERATION COMPLETE FOR: ${targetPipelineId}`);
  console.log(`Release Recommendation: ${output.releaseRecommendation}`);
  console.log(`Pass Rate: ${output.metrics.passRate.toFixed(1)}% (${output.metrics.passed}/${output.metrics.totalTests} passed)`);
  console.log(`Historical Trajectory: ${output.historicalTrends.passRateTrajectory} (avg: ${output.historicalTrends.averagePassRate}%)`);
  console.log(`Recurrent Failures: ${output.historicalTrends.recurrentFailures.length} cluster(s)`);
  console.log(`Decision Rationale: ${output.recommendationRationale}`);
  console.log(`======================================================\n`);

  return output;
}

// Direct execution entrypoint
if (require.main === module || process.argv[1]?.endsWith('regenerateQualityReport.ts')) {
  const targetId = process.argv[2] || 'PIPE-1795159418576';
  regenerateReport(targetId).catch(err => {
    console.error(`[RegenerateAgent6] Error:`, err);
    process.exit(1);
  });
}
