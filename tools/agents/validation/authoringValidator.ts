import { AuthoringOutput, GeneratedTestFile } from '../../../src/agents/types';

export interface AuthoringValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Runtime schema and contract validator for Agent 2 (Automation Authoring Agent) outputs.
 *
 * Enforces:
 * 1. generatedFiles presence as a non-empty array
 * 2. Proper file metadata, status enums, and destination paths (tests/generated/ only)
 * 3. Execution summary structure with non-negative counters
 * 4. Protection against false success reporting when files were not generated
 */
export class AuthoringValidator {
  public static validate(candidate: any): AuthoringValidationResult {
    const errors: string[] = [];

    if (!candidate || typeof candidate !== 'object') {
      return {
        isValid: false,
        errors: ['Authoring output is null or not an object'],
      };
    }

    // 1. generatedFiles collection validation
    if (!Array.isArray(candidate.generatedFiles)) {
      errors.push(
        `Missing or malformed "generatedFiles": expected an Array but received ${typeof candidate.generatedFiles}`
      );
      return { isValid: false, errors };
    }

    if (candidate.generatedFiles.length === 0) {
      errors.push(
        '"generatedFiles" array is empty. The authoring agent must produce at least one generated test or manual review file.'
      );
    }

    candidate.generatedFiles.forEach((file: GeneratedTestFile, idx: number) => {
      const prefix = `generatedFiles[${idx}]`;

      if (!file || typeof file !== 'object') {
        errors.push(`${prefix}: item is null or not an object`);
        return;
      }

      if (!file.filename || typeof file.filename !== 'string' || file.filename.trim().length === 0) {
        errors.push(`${prefix}: filename is required and must be a non-empty string`);
      }

      if (!file.filePath || typeof file.filePath !== 'string' || file.filePath.trim().length === 0) {
        errors.push(`${prefix}: filePath is required and must be a non-empty string`);
      } else {
        const normalized = file.filePath.replace(/\\/g, '/');
        if (!normalized.startsWith('tests/generated/')) {
          errors.push(
            `${prefix}: filePath "${file.filePath}" violates safety boundary; must be within "tests/generated/"`
          );
        }
      }

      if (typeof file.content !== 'string' || file.content.trim().length === 0) {
        errors.push(`${prefix}: content is required and must be non-empty`);
      }

      if (!Array.isArray(file.scenariosCovered) || file.scenariosCovered.length === 0) {
        errors.push(`${prefix}: scenariosCovered must be a non-empty array of scenario IDs`);
      }

      if (!['GENERATED', 'REQUIRES_MANUAL_REVIEW', 'SKIPPED'].includes(file.status)) {
        errors.push(
          `${prefix}: status must be 'GENERATED', 'REQUIRES_MANUAL_REVIEW', or 'SKIPPED' (received "${file.status}")`
        );
      }
    });

    // 2. executionSummary validation
    if (!candidate.executionSummary || typeof candidate.executionSummary !== 'object') {
      errors.push('Missing required "executionSummary" object');
    } else {
      const summary = candidate.executionSummary;
      if (typeof summary.totalScenarios !== 'number' || summary.totalScenarios < 0) {
        errors.push('executionSummary.totalScenarios must be a non-negative number');
      }
      if (typeof summary.automated !== 'number' || summary.automated < 0) {
        errors.push('executionSummary.automated must be a non-negative number');
      }
      if (typeof summary.manualReviewRequired !== 'number' || summary.manualReviewRequired < 0) {
        errors.push('executionSummary.manualReviewRequired must be a non-negative number');
      }
      if (typeof summary.skipped !== 'number' || summary.skipped < 0) {
        errors.push('executionSummary.skipped must be a non-negative number');
      }
      if (!Array.isArray(summary.reusedPageObjects)) {
        errors.push('executionSummary.reusedPageObjects must be an array');
      }
      if (!Array.isArray(summary.reusedApiClients)) {
        errors.push('executionSummary.reusedApiClients must be an array');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
