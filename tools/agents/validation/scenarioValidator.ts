import { TestDesignOutput, TestScenario } from '../../../src/agents/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Runtime schema and semantic validation for Agent 1 (Test Design Agent) outputs.
 * Enforces field presence, type safety, non-empty step collections, unique IDs,
 * valid enums, and traceability linkage.
 */
export class ScenarioValidator {
  public static validate(candidate: any): ValidationResult {
    const errors: string[] = [];

    if (!candidate || typeof candidate !== 'object') {
      return { isValid: false, errors: ['Candidate output is not an object or is null'] };
    }

    // 1. Requirement validation
    if (!candidate.requirement || typeof candidate.requirement !== 'object') {
      errors.push('Missing required "requirement" object');
    } else {
      if (!candidate.requirement.requirementId || typeof candidate.requirement.requirementId !== 'string') {
        errors.push('requirement.requirementId is required and must be a string');
      }
      if (!candidate.requirement.title || typeof candidate.requirement.title !== 'string') {
        errors.push('requirement.title is required and must be a string');
      }
      if (!candidate.requirement.description || typeof candidate.requirement.description !== 'string') {
        errors.push('requirement.description is required and must be a string');
      }
    }

    // 2. Scenarios collection validation
    if (!Array.isArray(candidate.scenarios)) {
      errors.push('"scenarios" must be an array');
      return { isValid: false, errors };
    }

    if (candidate.scenarios.length === 0) {
      errors.push('"scenarios" array must contain at least one scenario');
    }

    const seenIds = new Set<string>();

    candidate.scenarios.forEach((scenario: TestScenario, idx: number) => {
      const prefix = `Scenario[${idx}]`;

      if (!scenario.scenarioId || typeof scenario.scenarioId !== 'string') {
        errors.push(`${prefix}: scenarioId is required and must be a string`);
      } else {
        if (seenIds.has(scenario.scenarioId)) {
          errors.push(`${prefix}: duplicate scenarioId "${scenario.scenarioId}" detected`);
        }
        seenIds.add(scenario.scenarioId);

        if (!/^TC-[A-Z0-9_-]+$/i.test(scenario.scenarioId)) {
          errors.push(`${prefix}: scenarioId "${scenario.scenarioId}" must match pattern TC-xxx`);
        }
      }

      if (!scenario.title || typeof scenario.title !== 'string') {
        errors.push(`${prefix}: title is required and must be a string`);
      }

      if (!scenario.objective || typeof scenario.objective !== 'string') {
        errors.push(`${prefix}: objective is required and must be a string`);
      }

      if (!Array.isArray(scenario.preconditions)) {
        errors.push(`${prefix}: preconditions must be an array of strings`);
      }

      if (!Array.isArray(scenario.testSteps) || scenario.testSteps.length === 0) {
        errors.push(`${prefix}: testSteps must be a non-empty array of strings`);
      }

      if (!Array.isArray(scenario.expectedResults) || scenario.expectedResults.length === 0) {
        errors.push(`${prefix}: expectedResults must be a non-empty array of strings`);
      }

      if (!['UI', 'API', 'Integration'].includes(scenario.testType)) {
        errors.push(`${prefix}: testType must be 'UI', 'API', or 'Integration'`);
      }

      if (!['High', 'Medium', 'Low'].includes(scenario.priority)) {
        errors.push(`${prefix}: priority must be 'High', 'Medium', or 'Low'`);
      }

      if (!Array.isArray(scenario.tags) || scenario.tags.length === 0) {
        errors.push(`${prefix}: tags must be a non-empty array of strings`);
      }

      if (!['Automated', 'ManualReview', 'Unsupported'].includes(scenario.automationFeasibility)) {
        errors.push(`${prefix}: automationFeasibility must be 'Automated', 'ManualReview', or 'Unsupported'`);
      }
    });

    // 3. Metadata validation
    if (!candidate.metadata || typeof candidate.metadata !== 'object') {
      errors.push('Missing required "metadata" object');
    } else {
      if (!candidate.metadata.executionMode || !['AI_POWERED', 'DETERMINISTIC_FALLBACK'].includes(candidate.metadata.executionMode)) {
        errors.push('metadata.executionMode must be "AI_POWERED" or "DETERMINISTIC_FALLBACK"');
      }
      if (!candidate.metadata.provider || typeof candidate.metadata.provider !== 'string') {
        errors.push('metadata.provider is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
