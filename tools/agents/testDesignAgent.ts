import { LLMProvider, ModelMessage } from '../../src/agents/providers/types';
import { RequirementInput, TestDesignOutput } from '../../src/agents/types';
import { ScenarioValidator } from './validation/scenarioValidator';
import { sanitizeUntrustedContent } from '../../src/utils/sanitizer';

/**
 * Agent 1: Test Design Agent.
 *
 * Responsibilities:
 * - Understands software requirements in plain English.
 * - Systematically identifies test conditions via Equivalence Partitioning (EP),
 *   Boundary Value Analysis (BVA), and Error Guessing.
 * - Derives positive, negative, and edge-case scenarios with preconditions,
 *   concrete steps, and unambiguous expected assertions.
 * - Emits validated structured JSON conforming to TestDesignOutput schema.
 */
export class TestDesignAgent {
  private readonly provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Derive structured test scenarios from a software requirement.
   */
  public async designTests(input: RequirementInput): Promise<TestDesignOutput> {
    const sanitizedDescription = sanitizeUntrustedContent(input.description, {
      source: 'requirement_description',
      maxLength: 2000,
    });

    const sanitizedCriteria = (input.acceptanceCriteria || []).map((ac, idx) =>
      sanitizeUntrustedContent(ac, { source: `acceptance_criterion_${idx}`, maxLength: 500 })
    );

    const systemPrompt = `You are the Test Design Agent for an enterprise Quality Engineering capstone testing https://automationexercise.com.
Your responsibility is to systematically analyze software requirements and derive comprehensive test scenarios.

APPLY RIGOROUS QUALITY ENGINEERING TECHNIQUES:
1. Equivalence Partitioning (EP): Identify valid and invalid input classes.
2. Boundary Value Analysis (BVA): Test empty inputs, minimums, maximums, and length limits.
3. State Transition: Verify initial state, action, and resulting state.
4. Error Guessing: Test malformed formats, duplicate submissions, and unauthenticated states.

CONSTRAINTS:
- Do not invent unsupported application behavior or non-existent URLs.
- Assign unique, stable scenario IDs matching the format: TC-GEN-<AREA>-<INDEX> (e.g. TC-GEN-SUB-001).
- Include concrete, verifiable expected assertions without ambiguity.
- Tag every test with requirement ID, test type (@smoke, @negative, @boundary), and domain tag.
- Output MUST be valid JSON adhering strictly to the TestDesignOutput schema.`;

    const userPrompt = `REQUIREMENT_INPUT:
${JSON.stringify(
  {
    requirementId: input.requirementId,
    title: input.title,
    description: sanitizedDescription,
    applicationArea: input.applicationArea,
    userRole: input.userRole || 'Customer / Visitor',
    acceptanceCriteria: sanitizedCriteria,
    constraints: input.constraints || [],
  },
  null,
  2
)}`;

    const schemaDescription = `{
  "requirement": { "requirementId": string, "title": string, "description": string, "applicationArea": string },
  "scenarios": [
    {
      "scenarioId": string,
      "requirementId": string,
      "title": string,
      "objective": string,
      "preconditions": string[],
      "testSteps": string[],
      "expectedResults": string[],
      "testType": "UI" | "API" | "Integration",
      "priority": "High" | "Medium" | "Low",
      "tags": string[],
      "automationFeasibility": "Automated" | "ManualReview" | "Unsupported",
      "assumptions": string[],
      "ambiguityNotes": string[]
    }
  ],
  "missingOrAmbiguousRequirements": string[],
  "designTechniquesApplied": string[],
  "metadata": { "timestamp": string, "executionMode": "AI_POWERED" | "DETERMINISTIC_FALLBACK", "provider": string }
}`;

    const messages: ModelMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const rawOutput = await this.provider.generateStructured<TestDesignOutput>(
      messages,
      schemaDescription,
      { temperature: 0.1, task: 'TEST_DESIGN' }
    );

    // Guarantee metadata attribution
    const output: TestDesignOutput = {
      ...rawOutput,
      requirement: {
        ...input,
        acceptanceCriteria: sanitizedCriteria,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        executionMode: this.provider.metadata.executionMode,
        provider: this.provider.metadata.name,
        model: this.provider.metadata.modelIdentifier,
      },
    };

    // Strict runtime validation
    const validation = ScenarioValidator.validate(output);
    if (!validation.isValid) {
      throw new Error(
        `[TestDesignAgent] Output failed schema validation:\n- ${validation.errors.join('\n- ')}`
      );
    }

    return output;
  }
}
