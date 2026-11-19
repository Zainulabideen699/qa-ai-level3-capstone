import { ExecutionMode } from '../types';

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  task?: 'TEST_DESIGN' | 'AUTOMATION_AUTHORING';
}

export interface ProviderMetadata {
  name: string;
  isLive: boolean;
  executionMode: ExecutionMode;
  modelIdentifier?: string;
}

/**
 * Provider-independent model interface for LLM integrations and deterministic fallbacks.
 */
export interface LLMProvider {
  readonly metadata: ProviderMetadata;

  /**
   * Complete a raw text prompt or chat message history.
   */
  generateText(messages: ModelMessage[], options?: GenerationOptions): Promise<string>;

  /**
   * Generate a structured, typed object conforming to a target schema.
   */
  generateStructured<T>(
    messages: ModelMessage[],
    schemaDescription: string,
    options?: GenerationOptions
  ): Promise<T>;
}
