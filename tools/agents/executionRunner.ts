import * as fs from 'fs';
import * as path from 'path';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import {
  TestExecutionOptions,
  TestExecutionResult,
  TestExecutionStatus,
} from '../../src/agents/types';
import type { RcaRunReport } from '../rca/rcaReporter';

/**
 * ExecutionRunner.
 *
 * Executes a single generated Playwright test file via a controlled child process.
 * Guarantees:
 * - Isolation to the exact generated test file and target browser project.
 * - Zero shell-injection risk: arguments are passed as a discrete array with shell: false.
 * - Reliable capture of stdout, stderr, exit code, duration, and Playwright RCA artifacts.
 * - Distinction between test assertion failures (exitCode 1 with test runs) and environment process errors.
 * - Safe handling of process timeouts and unexpected terminations with cross-platform process tree cleanup.
 */
export class ExecutionRunner {
  private static readonly DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

  /**
   * Forcibly terminate child process and all spawned child processes (e.g. browser instances).
   * Returns an error description if termination fails.
   */
  private static terminateProcessTree(child: ChildProcess): string | undefined {
    const pid = child.pid;
    if (!pid) return undefined;

    try {
      if (process.platform === 'win32') {
        // On Windows, taskkill /PID <PID> /T /F terminates the full process tree
        const killResult = spawnSync('taskkill', ['/PID', pid.toString(), '/T', '/F'], {
          windowsHide: true,
          encoding: 'utf8',
        });
        if (killResult.error) {
          return `taskkill error: ${killResult.error.message}`;
        }
        // Code 0 is success; code 128 is "process not found" (e.g. already exited)
        if (killResult.status !== 0 && killResult.status !== 128) {
          const detail = (killResult.stderr || killResult.stdout || '').trim();
          return `taskkill exited with code ${killResult.status}: ${detail}`;
        }
      } else {
        // On POSIX, terminate the process group via negative PID
        try {
          process.kill(-pid, 'SIGTERM');
        } catch {
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            // Process may already have terminated
          }
        }

        // Escalation: verify if still alive after grace period and send SIGKILL to group
        setTimeout(() => {
          try {
            process.kill(pid, 0); // Check if process still alive
            try {
              process.kill(-pid, 'SIGKILL');
            } catch {
              process.kill(pid, 'SIGKILL');
            }
          } catch {
            // Process already exited
          }
        }, 1500);
      }
    } catch (err: any) {
      return `Process termination exception: ${err?.message || String(err)}`;
    }

    return undefined;
  }

  /**
   * Execute the target test file and capture complete execution metrics.
   */
  public static async executeTest(options: TestExecutionOptions): Promise<TestExecutionResult> {
    const startTimeMs = Date.now();
    const startTime = new Date(startTimeMs).toISOString();

    // Unique execution ID correlated via environment variable to custom RCA reporter
    const executionId = `EXEC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const normalizedTestFile = options.testFile.replace(/\\/g, '/');
    const targetProject = options.project || 'Google Chrome';
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    // Verify test file exists
    const fullTestPath = path.resolve(process.cwd(), normalizedTestFile);
    if (!fs.existsSync(fullTestPath)) {
      const endTime = new Date().toISOString();
      return {
        executionId,
        status: 'PROCESS_ERROR',
        exitCode: null,
        testFile: normalizedTestFile,
        project: targetProject,
        startTime,
        endTime,
        durationMs: Date.now() - startTimeMs,
        stdout: '',
        stderr: `Target test file not found at: ${fullTestPath}`,
        commandExecuted: `playwright test ${normalizedTestFile}`,
        errorMessage: `Target test file does not exist on disk: ${fullTestPath}`,
      };
    }

    const rcaDir = path.resolve(process.cwd(), 'reports', 'rca');
    if (!fs.existsSync(rcaDir)) {
      fs.mkdirSync(rcaDir, { recursive: true });
    }

    // Resolve Playwright runner: prefer direct node execution of @playwright/test/cli.js
    const playwrightCli = path.resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
    let executable: string;
    let cliArgs: string[];

    if (fs.existsSync(playwrightCli)) {
      executable = process.execPath;
      cliArgs = [playwrightCli, 'test', normalizedTestFile, `--project=${targetProject}`];
    } else {
      executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      cliArgs = ['playwright', 'test', normalizedTestFile, `--project=${targetProject}`];
    }

    if (options.headed) {
      cliArgs.push('--headed');
    }

    const commandExecuted = `${executable} ${cliArgs.join(' ')}`;
    console.log(`[ExecutionRunner] Spawning test runner process [Execution ID: ${executionId}]:`);
    console.log(`[ExecutionRunner] Target: ${normalizedTestFile} (Project: ${targetProject})`);
    console.log(`[ExecutionRunner] Command: ${commandExecuted}\n`);

    return new Promise<TestExecutionResult>(resolve => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let processError: Error | null = null;
      let isResolved = false;
      let terminationError: string | undefined = undefined;

      const cleanupAndResolve = (result: TestExecutionResult) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timer);
        if (terminationError) {
          result.errorMessage = result.errorMessage
            ? `${result.errorMessage} (Termination detail: ${terminationError})`
            : `Termination detail: ${terminationError}`;
        }
        resolve(result);
      };

      // Spawn child process without shell to eliminate shell injection
      // On POSIX, detached: true creates a new process group for clean group termination
      const isWindows = process.platform === 'win32';
      const child = spawn(executable, cliArgs, {
        cwd: process.cwd(),
        shell: false,
        detached: !isWindows,
        env: {
          ...process.env,
          CI: process.env.CI || '1', // Disable interactive prompts
          AGENT_EXECUTION_ID: executionId,
          PW_EXECUTION_ID: executionId,
        },
      });

      let forceTimer: NodeJS.Timeout | undefined = undefined;

      const timer = setTimeout(() => {
        timedOut = true;
        console.warn(
          `[ExecutionRunner] Test execution timed out after ${timeoutMs}ms. Terminating process tree.`
        );
        const termErr = ExecutionRunner.terminateProcessTree(child);
        if (termErr) {
          terminationError = termErr;
        }

        // Failsafe force resolution if close event is delayed
        forceTimer = setTimeout(() => {
          cleanupAndResolve({
            executionId,
            status: 'TIMED_OUT',
            exitCode: null,
            testFile: normalizedTestFile,
            project: targetProject,
            startTime,
            endTime: new Date().toISOString(),
            durationMs: Date.now() - startTimeMs,
            stdout,
            stderr,
            rcaReportPath: undefined,
            commandExecuted,
            errorMessage: `Execution timed out after ${timeoutMs}ms and was forcibly terminated.`,
          });
        }, 3000);
      }, timeoutMs);

      child.stdout.on('data', data => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);
      });

      child.stderr.on('data', data => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });

      child.on('error', err => {
        processError = err;
        console.error(`[ExecutionRunner] Child process error:`, err);
        const termErr = ExecutionRunner.terminateProcessTree(child);
        if (termErr) {
          terminationError = termErr;
        }
        cleanupAndResolve({
          executionId,
          status: 'PROCESS_ERROR',
          exitCode: null,
          testFile: normalizedTestFile,
          project: targetProject,
          startTime,
          endTime: new Date().toISOString(),
          durationMs: Date.now() - startTimeMs,
          stdout,
          stderr,
          rcaReportPath: undefined,
          commandExecuted,
          errorMessage: `Process spawn error: ${err.message || String(err)}`,
        });
      });

      child.on('close', exitCode => {
        if (forceTimer) clearTimeout(forceTimer);

        const endTimeMs = Date.now();
        const endTime = new Date(endTimeMs).toISOString();
        const durationMs = endTimeMs - startTimeMs;

        // Locate and validate the unique RCA JSON report correlating to this specific execution ID
        let locatedRcaReportPath: string | undefined = undefined;
        let parsedRcaReport: RcaRunReport | null = null;

        if (fs.existsSync(rcaDir)) {
          // Check for direct report filename: rca-report-${executionId}.json
          const exactFile = path.join(rcaDir, `rca-report-${executionId}.json`);
          if (fs.existsSync(exactFile)) {
            try {
              const content = JSON.parse(fs.readFileSync(exactFile, 'utf8'));
              if (content.executionId === executionId) {
                locatedRcaReportPath = exactFile;
                parsedRcaReport = content;
              }
            } catch {
              // Ignore parse error
            }
          }

          // Check for suffixed report filename: rca-report-${executionId}-*.json
          if (!locatedRcaReportPath) {
            try {
              const files = fs.readdirSync(rcaDir);
              for (const f of files) {
                if (f.startsWith(`rca-report-${executionId}`) && f.endsWith('.json')) {
                  const candidate = path.join(rcaDir, f);
                  try {
                    const content = JSON.parse(fs.readFileSync(candidate, 'utf8'));
                    if (content.executionId === executionId) {
                      locatedRcaReportPath = candidate;
                      parsedRcaReport = content;
                      break;
                    }
                  } catch {
                    // Ignore parse error
                  }
                }
              }
            } catch {
              // Ignore readdir error
            }
          }
        }

        // Determine execution status using machine-readable evidence only (no stdout regex guessing)
        let executionStatus: TestExecutionStatus;
        let errorMessage: string | undefined = undefined;

        if (timedOut) {
          executionStatus = 'TIMED_OUT';
          errorMessage = `Execution timed out after ${timeoutMs}ms. Child process tree terminated.`;
        } else if (processError) {
          executionStatus = 'PROCESS_ERROR';
          errorMessage = `Process spawn error: ${(processError as Error).message || String(processError)}`;
        } else if (!parsedRcaReport || !parsedRcaReport.runSummary) {
          // Machine-readable RCA report was NOT generated or failed validation
          // Rule: If no valid report is available, do not claim that test execution passed!
          executionStatus = 'PROCESS_ERROR';
          errorMessage =
            exitCode === 0
              ? 'Runner exited with code 0, but no valid machine-readable RCA report matching execution ID was produced to verify test results.'
              : (stderr.trim() ||
                `Playwright test runner crashed or exited abnormally with exit code ${exitCode} without generating an RCA report.`);
        } else {
          // We have a verified machine-readable RCA report correlated to executionId
          const summary = parsedRcaReport.runSummary;

          if (exitCode === 0) {
            if (summary.totalTests > 0 && summary.failed === 0 && summary.passed > 0) {
              executionStatus = 'PASSED';
            } else if (summary.totalTests === 0) {
              // Zero tests run
              executionStatus = 'PROCESS_ERROR';
              errorMessage =
                'Verified RCA report indicates zero tests were executed. Playwright spec may be empty or filtered out.';
            } else {
              executionStatus = 'FAILED';
              errorMessage = `Process exited with code 0 but RCA report recorded ${summary.failed} failed test(s).`;
            }
          } else {
            // Exit code non-zero: distinguish test assertion failure from runner environment crash
            if (
              summary.failed > 0 ||
              (parsedRcaReport.failures && parsedRcaReport.failures.length > 0)
            ) {
              executionStatus = 'FAILED';
              errorMessage = `Test suite failed with ${summary.failed} assertion failure(s).`;
            } else {
              executionStatus = 'PROCESS_ERROR';
              errorMessage =
                stderr.trim() ||
                `Playwright runner exited with exit code ${exitCode} without recorded test assertion failures.`;
            }
          }
        }

        console.log(
          `\n[ExecutionRunner] Process closed with exit code: ${exitCode} (${executionStatus})`
        );
        if (locatedRcaReportPath) {
          console.log(`[ExecutionRunner] Verified Correlated RCA Report: ${locatedRcaReportPath}`);
        } else if (executionStatus === 'FAILED' || executionStatus === 'PROCESS_ERROR') {
          console.warn(
            `[ExecutionRunner] Notice: No machine-readable RCA report matching execution ID [${executionId}] was found.`
          );
        }

        cleanupAndResolve({
          executionId,
          status: executionStatus,
          exitCode,
          testFile: normalizedTestFile,
          project: targetProject,
          startTime,
          endTime,
          durationMs,
          stdout,
          stderr,
          rcaReportPath: locatedRcaReportPath,
          commandExecuted,
          errorMessage,
        });
      });
    });
  }
}
