import { LLMProvider, ModelMessage, GenerationOptions, ProviderMetadata } from './types';

/**
 * Live Google Gemini provider adapter using native Node.js fetch.
 * Connects directly to the Gemini REST API when GEMINI_API_KEY is configured.
 */
export class GeminiProvider implements LLMProvider {
  readonly metadata: ProviderMetadata;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.metadata = {
      name: 'Google Gemini Provider',
      isLive: true,
      executionMode: 'AI_POWERED',
      modelIdentifier: this.model,
    };
  }

  async generateText(messages: ModelMessage[], options?: GenerationOptions): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(`Empty response from Gemini API: ${JSON.stringify(data).slice(0, 300)}`);
    }

    return text;
  }

  async generateStructured<T>(
    messages: ModelMessage[],
    schemaDescription: string,
    options?: GenerationOptions
  ): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const promptWithSchema = `Return ONLY valid JSON strictly adhering to the following schema:\n${schemaDescription}`;
    contents.push({
      role: 'user',
      parts: [{ text: promptWithSchema }],
    });

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        maxOutputTokens: options?.maxTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data: any = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error(`Empty structured response from Gemini API`);
    }

    let parsed: any = JSON.parse(rawText);
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
