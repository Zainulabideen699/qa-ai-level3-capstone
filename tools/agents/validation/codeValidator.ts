import { GeneratedTestFile } from '../../../src/agents/types';

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Static code quality and safety validator for generated Playwright TypeScript files.
 * Enforces Gate 2 criteria:
 * - Proper Playwright runner imports
 * - Balanced brackets and syntax sanity
 * - Strict prohibition of arbitrary sleeps (page.waitForTimeout)
 * - Safe destination paths (tests/generated/ only)
 * - Prevention of hardcoded secrets
 */
export class CodeValidator {
  public static validate(file: GeneratedTestFile): CodeValidationResult {
    const errors: string[] = [];

    if (!file.content || file.content.trim().length === 0) {
      return { isValid: false, errors: ['Generated file content is completely empty'] };
    }

    // 1. Mandatory Playwright imports
    if (!file.content.includes("from '@playwright/test'") && !file.content.includes('from "@playwright/test"')) {
      errors.push('Missing mandatory import from "@playwright/test"');
    }

    // 2. Mandatory test definitions
    if (!/\btest\s*\(\s*['"`]/.test(file.content) && !/\btest\.describe\s*\(/.test(file.content)) {
      errors.push('File contains no valid test() or test.describe() definitions');
    }

    // 3. Prohibited anti-patterns: arbitrary sleep calls
    if (/waitForTimeout\s*\(/.test(file.content)) {
      errors.push(
        'Prohibited anti-pattern detected: page.waitForTimeout() is strictly disallowed by Gate 2 governance. Use web-first assertions instead.'
      );
    }

    // 4. Bracket balance check
    const openBraces = (file.content.match(/\{/g) || []).length;
    const closeBraces = (file.content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced curly braces: ${openBraces} open vs ${closeBraces} close`);
    }

    const openParens = (file.content.match(/\(/g) || []).length;
    const closeParens = (file.content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Unbalanced parentheses: ${openParens} open vs ${closeParens} close`);
    }

    // 5. Safety constraint: Target destination path
    const normalizedPath = file.filePath.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('tests/generated/')) {
      errors.push(
        `Safety violation: Generated test destination "${file.filePath}" is outside the approved "tests/generated/" directory`
      );
    }

    // 6. Prohibited credentials / plain-text secrets
    if (/api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i.test(file.content)) {
      errors.push('Potential hardcoded API key or secret token detected in generated test code');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
