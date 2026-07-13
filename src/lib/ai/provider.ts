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

const DEFAULT_AI_TIMEOUT_MS = 60000;
const MIN_AI_TIMEOUT_MS = 10000;
const MAX_AI_TIMEOUT_MS = 120000;

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

function getAiTimeoutMs() {
  const raw = process.env.AI_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_AI_TIMEOUT_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_AI_TIMEOUT_MS;

  return Math.min(MAX_AI_TIMEOUT_MS, Math.max(MIN_AI_TIMEOUT_MS, Math.floor(parsed)));
}

function getEnableThinking(model: string) {
  const raw = process.env.AI_ENABLE_THINKING?.trim().toLowerCase();

  if (raw === "true") return true;
  if (raw === "false") return false;
  if (model.toLowerCase().startsWith("qwen")) return false;

  return undefined;
}

function logAiProviderEvent(event: string, details: Record<string, unknown>) {
  console.warn("[ai-provider]", {
    event,
    ...details
  });
}

class HttpJsonAiProvider implements AiProvider {
  name: string;
  model: string;
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private enableThinking?: boolean;

  constructor() {
    this.name = process.env.AI_PROVIDER?.trim() || "openai-compatible";
    this.model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
    this.apiKey = process.env.AI_API_KEY?.trim() || "";
    this.baseUrl = (process.env.AI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
    this.timeoutMs = getAiTimeoutMs();
    this.enableThinking = getEnableThinking(this.model);
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generateStructuredResult<T>({ systemPrompt, userPrompt, schemaName, maxTokens = 1400, temperature = 0.2 }: AiStructuredRequest): Promise<T> {
    if (!this.isConfigured()) {
      throw new AiConfigurationError();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const requestBody: Record<string, unknown> = {
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
      };

      if (this.enableThinking !== undefined) {
        requestBody.enable_thinking = this.enableThinking;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        logAiProviderEvent("http_error", {
          provider: this.name,
          model: this.model,
          status: response.status,
          errorType: "HttpError",
          timedOut: false
        });
        throw new AiProviderError(response.status === 429 ? "AI 服务请求较多，请稍后再试。" : "AI 服务暂时不可用，请稍后再试。");
      }

      const data = await response.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;
      return parseStructuredJson<T>(content);
    } catch (error) {
      if (error instanceof AiConfigurationError || error instanceof AiProviderError) {
        throw error;
      }
      if ((error as Error).name === "AbortError") {
        logAiProviderEvent("request_timeout", {
          provider: this.name,
          model: this.model,
          errorType: "AbortError",
          timedOut: true,
          timeoutMs: this.timeoutMs
        });
        throw new AiProviderError("AI 诊断生成超时，请稍后重试。");
      }
      logAiProviderEvent("request_error", {
        provider: this.name,
        model: this.model,
        errorType: (error as Error).name || "UnknownError",
        timedOut: false
      });
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
