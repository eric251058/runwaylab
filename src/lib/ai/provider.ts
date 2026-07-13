import type { AiProvider, AiStructuredRequest } from "@/lib/ai/types";

export class AiConfigurationError extends Error {
  constructor() {
    super("AI 诊断服务暂未配置，请联系管理员。");
    this.name = "AiConfigurationError";
  }
}

export class AiProviderError extends Error {
  constructor(message = "AI 服务暂时不可用，请稍后再试。") {
    super(message);
    this.name = "AiProviderError";
  }
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseStructuredJson<T>(value: unknown): T {
  if (typeof value === "object" && value !== null) return value as T;
  if (typeof value !== "string") {
    throw new AiProviderError("AI 返回格式不符合要求。");
  }

  try {
    return JSON.parse(stripCodeFence(value)) as T;
  } catch {
    throw new AiProviderError("AI 返回格式不符合要求。");
  }
}

class HttpJsonAiProvider implements AiProvider {
  name: string;
  model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.name = process.env.AI_PROVIDER?.trim() || "openai-compatible";
    this.model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
    this.apiKey = process.env.AI_API_KEY?.trim() || "";
    this.baseUrl = (process.env.AI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generateStructuredResult<T>({ systemPrompt, userPrompt, schemaName, maxTokens = 1400, temperature = 0.2 }: AiStructuredRequest): Promise<T> {
    if (!this.isConfigured()) {
      throw new AiConfigurationError();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `${userPrompt}\n\n请只返回 ${schemaName} JSON 对象，不要返回 Markdown 代码块。`
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new AiProviderError(response.status === 429 ? "AI 服务请求较多，请稍后再试。" : "AI 服务暂时不可用，请稍后再试。");
      }

      const data = await response.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;
      return parseStructuredJson<T>(content);
    } catch (error) {
      if (error instanceof AiConfigurationError || error instanceof AiProviderError) {
        throw error;
      }
      throw new AiProviderError();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getAiProvider(): AiProvider {
  return new HttpJsonAiProvider();
}

export function isAiDiagnosisConfigured() {
  return getAiProvider().isConfigured();
}
