import * as fs from 'fs';
import * as path from 'path';
import { ExecutionOrchestrator } from './orchestrator';
import { RequirementInput } from '../../src/agents/types';

/**
 * Command-line entry point for the Multi-Agent Quality Engineering Pipeline.
 *
 * Demonstrates the full autonomous engineering cycle:
 * Requirement -> Agent 1 (Test Design) -> Gate 1 Approval -> Agent 2 (Authoring) ->
 * Gate 2 Authorization -> Autonomous Execution -> RCA Agent -> Consolidated Pipeline Report.
 *
 * Usage:
 *   # Author test code and pause at Gate 2 for human code review:
 *   node --experimental-strip-types tools/agents/runPipeline.ts --approve-gate1
 *
 *   # Author code AND authorize autonomous browser execution + RCA:
 *   node --experimental-strip-types tools/agents/runPipeline.ts --approve-all
 *
 *   # Author with custom requirement file:
 *   node --experimental-strip-types tools/agents/runPipeline.ts --req my-requirement.json --approve-all
 *
 * Flags:
 *   --approve-gate1      Approve Gate 1 (Test Design) only. Pipeline pauses at Gate 2.
 *   --approve-gate2      Authorize Gate 2 (Code Review & Execution).
 *   --approve-all        Explicitly approve BOTH Gate 1 and Gate 2 (End-to-End execution).
 *   --approve            Legacy shortcut: approves Gate 1 (Test Design). Execution pauses at Gate 2.
 *   --skip-execution     Do not execute tests even if Gate 2 is approved.
 *   --headed             Run browser tests in headed mode.
 *   --provider <p>       'gemini' | 'openai' | 'fallback' (defaults to environment discovery).
 *   --req <file.json>    Path to JSON requirement input file.
 */
async function main() {
  const args = process.argv.slice(2);

  let providerOption: 'gemini' | 'openai' | 'fallback' | undefined = undefined;
  let approveGate1 = false;
  let approveGate2 = false;
  let approveAll = false;
  let skipExecution = false;
  let headed = false;
  let customReqPath: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--provider' && args[i + 1]) {
      providerOption = args[i + 1] as any;
      i++;
    } else if (arg === '--approve-all') {
      approveAll = true;
      approveGate1 = true;
      approveGate2 = true;
    } else if (arg === '--approve-gate1') {
      approveGate1 = true;
    } else if (arg === '--approve-gate2') {
      approveGate2 = true;
    } else if (arg === '--approve' || arg === '-y') {
      // Documented behavior: --approve grants Gate 1 (Test Design). Gate 2 remains explicit.
      approveGate1 = true;
      console.log(
        `[Pipeline CLI] Notice: Flag '--approve' approved Gate 1 (Test Design). Gate 2 (Execution) requires explicit '--approve-all' or '--approve-gate2'.`
      );
    } else if (arg === '--skip-execution') {
      skipExecution = true;
    } else if (arg === '--headed') {
      headed = true;
    } else if (arg === '--req' && args[i + 1]) {
      customReqPath = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Load requirement
  let requirement: RequirementInput;

  if (customReqPath && fs.existsSync(customReqPath)) {
    const raw = fs.readFileSync(path.resolve(process.cwd(), customReqPath), 'utf8');
    requirement = JSON.parse(raw);
    console.log(`[Pipeline CLI] Loaded custom requirement from: ${customReqPath}`);
  } else {
    // Default verified demonstration requirement
    requirement = {
      requirementId: 'REQ-AE-SUB-001',
      title: 'Homepage Footer Newsletter Subscription',
      description:
        'As a site visitor, I want to subscribe to the newsletter by submitting my email address in the homepage footer subscription box so that I receive promotional updates and discounts.',
      applicationArea: 'ENG',
      userRole: 'Unauthenticated Visitor / Customer',
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
  }

  const orchestrator = new ExecutionOrchestrator({
    provider: providerOption,
    autoApproveGate1: approveGate1 || approveAll,
    autoApproveGate2: approveGate2 || approveAll,
    autoApproveAll: approveAll,
    approvedBy: 'Lead Quality Engineer (HITL Sign-off)',
    skipExecution,
    headed,
  });

  try {
    const result = await orchestrator.executePipeline(requirement, {
      autoApproveGate1: approveGate1 || approveAll,
      autoApproveGate2: approveGate2 || approveAll,
      autoApproveAll: approveAll,
      skipExecution,
      headed,
    });

    console.log(`\n======================================================`);
    console.log(`[Pipeline CLI] Pipeline Run Result: ${result.status}`);
    if (result.executionId) {
      console.log(`[Pipeline CLI] Execution ID: ${result.executionId}`);
    }
    console.log(`[Pipeline CLI] Consolidated Report: ${result.pipelineReportPath || 'N/A'}`);

    if (result.status === 'GENERATION_SUCCESS_EXECUTION_PASSED') {
      console.log(`[Pipeline CLI] 🟢 All generated tests executed and passed successfully!`);
      process.exit(0);
    } else if (result.status === 'GENERATION_SUCCESS_EXECUTION_FAILED') {
      console.log(`[Pipeline CLI] 🔴 Test execution failed. RCA report generated with diagnostics.`);
      if (result.repairProposalPath) {
        console.log(`[Pipeline CLI] 🛠️ Repair Proposals (Agent 5): ${result.repairProposalPath}`);
      }
      process.exit(1);
    } else if (result.status === 'GENERATION_SUCCESS_EXECUTION_SKIPPED') {
      console.log(
        `[Pipeline CLI] 🔵 Test generation succeeded. Automated execution was intentionally skipped.`
      );
      process.exit(0);
    } else if (result.status === 'GENERATION_SUCCESS_GATE2_PENDING') {
      console.log(`[Pipeline CLI] 🟡 Test generation succeeded. Pipeline paused awaiting Gate 2 authorization.`);
      console.log(`[Pipeline CLI] To execute generated tests, rerun with '--approve-all' or '--approve-gate2'.`);
      process.exit(0);
    } else if (result.status === 'GATE1_REJECTED') {
      console.log(`[Pipeline CLI] ⛔ Halted at Gate 1 (Human Approval Pending).`);
      process.exit(0);
    } else {
      console.error(`[Pipeline CLI] ⚠️ Pipeline completed with status: ${result.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[Pipeline CLI] Fatal pipeline error:`, error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Multi-Agent Quality Engineering Pipeline CLI

Usage:
  node --experimental-strip-types tools/agents/runPipeline.ts [options]

Options:
  --approve-all       Authorize both Gate 1 and Gate 2 (End-to-End generation + execution).
  --approve-gate1     Approve Gate 1 (Test Design) only. Code is generated; execution paused.
  --approve-gate2     Authorize Gate 2 (Code Review & Execution).
  --approve           Legacy shortcut: approves Gate 1. Execution remains paused for review.
  --skip-execution    Generate code and write reports without running tests.
  --headed            Run Playwright in headed mode.
  --provider <name>   'gemini' | 'openai' | 'fallback'.
  --req <file.json>   Path to custom requirement JSON file.
  -h, --help          Show this help text.
`);
}

main();
