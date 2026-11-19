/**
 * Sanitization and prompt-injection defense utilities for untrusted web application content.
 *
 * As specified in docs/security.md, external content (DOM text, server error messages,
 * console logs, network payloads) harvested from the System Under Test (SUT) must be treated
 * strictly as passive data, never as agent instructions.
 *
 * IMPORTANT SECURITY LIMITATION:
 * Sanitization is a defense-in-depth measure to structure and delineate untrusted input.
 * Delineation alone does not guarantee absolute protection against all prompt-injection
 * or adversarial phrasing attacks. Downstream consumers and LLM prompts must enforce that
 * content inside <untrusted_content> is never executed or interpreted as system commands.
 */

export interface SanitizeOptions {
  /** Optional origin or descriptor of the untrusted source (e.g. 'dom_text', 'error_message') */
  source?: string;
  /** Maximum length to prevent payload expansion / denial-of-service */
  maxLength?: number;
}

/**
 * Strip dangerous control characters (e.g., null bytes, backspaces, non-printable control codes)
 * while preserving standard whitespace (newlines, carriage returns, tabs).
 */
export function stripControlCharacters(input: string): string {
  // Removes ASCII control characters 0-8, 11-12, 14-31, and 127 (DEL)
  // Retains \t (9), \n (10), \r (13)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Escape opening and closing delimiter tags or adversarial imitation sequences so
 * untrusted content cannot break out of or spoof the <untrusted_content> envelope.
 */
export function escapeDelimiters(input: string): string {
  return input
    .replace(/<\s*untrusted_content(\s*[^>]*)?>/gi, '&lt;untrusted_content$1&gt;')
    .replace(/<\/\s*untrusted_content\s*>/gi, '&lt;/untrusted_content&gt;');
}

/**
 * Sanitize an attribute value strictly so it cannot inject additional attributes,
 * quotes, spaces, or closing XML markup.
 */
export function sanitizeAttributeValue(input?: string): string {
  if (!input) return '';
  // Only allow alphanumeric characters, underscores, and hyphens
  return input.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Prepares untrusted external content by stripping control characters, escaping delimiter tags,
 * and wrapping the content in strict <untrusted_content> XML boundaries.
 *
 * Handles null, undefined, empty, and non-string inputs safely without throwing exceptions.
 */
export function sanitizeUntrustedContent(
  content: unknown,
  options?: SanitizeOptions
): string {
  const safeSource = sanitizeAttributeValue(options?.source);
  const sourceAttr = safeSource ? ` source="${safeSource}"` : '';

  if (content === null || content === undefined) {
    return `<untrusted_content${sourceAttr}>\n</untrusted_content>`;
  }

  const rawString = typeof content === 'string' ? content : String(content);

  // 1. Strip non-printable control characters
  let sanitized = stripControlCharacters(rawString);

  // 2. Escape delimiters to prevent envelope breakout or imitation
  sanitized = escapeDelimiters(sanitized);

  // 3. Optional length truncation
  if (options?.maxLength && options.maxLength > 0 && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength) + '\n[...truncated...]';
  }

  return `<untrusted_content${sourceAttr}>\n${sanitized}\n</untrusted_content>`;
}
