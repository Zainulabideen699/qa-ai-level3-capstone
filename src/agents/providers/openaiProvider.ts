import { LLMProvider, ModelMessage, GenerationOptions, ProviderMetadata } from './types';

/**
 * Live OpenAI provider adapter using native Node.js fetch.
 * Connects directly to the OpenAI Chat Completions API when OPENAI_API_KEY is configured.
 */
export class OpenAIProvider implements LLMProvider {
  readonly metadata: ProviderMetadata;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
    this.metadata = {
      name: 'OpenAI Provider',
      isLive: true,
      executionMode: 'AI_POWERED',
      modelIdentifier: this.model,
    };
  }

  async generateText(messages: ModelMessage[], options?: GenerationOptions): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateStructured<T>(
    messages: ModelMessage[],
    schemaDescription: string,
    options?: GenerationOptions
  ): Promise<T> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const systemPromptWithSchema: ModelMessage = {
      role: 'system',
      content: `You must return ONLY valid, parseable JSON conforming to this schema:\n${schemaDescription}`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [systemPromptWithSchema, ...messages.map(m => ({ role: m.role, content: m.content }))],
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 8192,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data: any = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    let parsed: any = JSON.parse(rawContent);

    if (options?.task === 'AUTOMATION_AUTHORING' && parsed) {
      if (Array.isArray(parsed)) {
        parsed = { generatedFiles: parsed };
      } else if (!parsed.generatedFiles && Array.isArray(parsed.files)) {
        parsed.generatedFiles = parsed.files;
      }
    }

    return parsed as T;
  }
}
