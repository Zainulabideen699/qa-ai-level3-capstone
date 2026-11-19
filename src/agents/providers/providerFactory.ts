import { LLMProvider } from './types';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';
import { ModelFreeFallbackProvider } from './fallbackProvider';

/**
 * Factory for instantiating provider-independent model adapters.
 *
 * Checks environment credentials in priority order:
 * 1. GEMINI_API_KEY -> Google Gemini Provider
 * 2. OPENAI_API_KEY -> OpenAI Provider
 * 3. None -> Deterministic Model-Free Quality Engineering Fallback Engine
 */
export class ProviderFactory {
  public static createProvider(preferredProvider?: 'gemini' | 'openai' | 'fallback'): LLMProvider {
    if (preferredProvider === 'fallback') {
      return new ModelFreeFallbackProvider();
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (preferredProvider === 'gemini' && geminiKey) {
      return new GeminiProvider(geminiKey);
    }

    if (preferredProvider === 'openai' && openaiKey) {
      return new OpenAIProvider(openaiKey);
    }

    if (geminiKey) {
      return new GeminiProvider(geminiKey);
    }

    if (openaiKey) {
      return new OpenAIProvider(openaiKey);
    }

    // Default to deterministic model-free fallback when no API key is configured
    return new ModelFreeFallbackProvider();
  }
}
