import { NextRequest, NextResponse } from "next/server";
import { ProviderStatus, ProviderType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnyProviderForUser } from "@/lib/provider-access";
import { consumeProviderAiExtraction, getProviderEntitlements } from "@/lib/provider-subscription";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  imageUrl: z.string().trim().min(1).max(1000)
});

const draftSchema = z.object({
  title: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  materials: z.array(z.string()),
  techniques: z.array(z.string()),
  quantityRange: z.string(),
  moqMin: z.string(),
  leadTimeDays: z.string(),
  summary: z.string(),
  description: z.string(),
  capacityText: z.string(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string())
}).strict();

const draftFields = [
  "title",
  "category",
  "tags",
  "materials",
  "techniques",
  "quantityRange",
  "moqMin",
  "leadTimeDays",
  "summary",
  "description",
  "capacityText"
] as const;

function imageUrlForModel(request: NextRequest, rawUrl: string) {
  if (rawUrl.startsWith("/uploads/work/")) {
    const base = process.env.AI_PUBLIC_BASE_URL || request.nextUrl.origin;
    return new URL(rawUrl, base).toString();
  }
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("图片地址必须使用 HTTPS");
  const allowedHost = process.env.AI_ALLOWED_IMAGE_HOST?.trim();
  if (!allowedHost || url.hostname !== allowedHost) throw new Error("该图片地址不允许用于 AI 识别");
  return url.toString();
}

function responseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function extractionPrompt(providerType: ProviderType) {
  const context = providerType === ProviderType.FACTORY
    ? "这是服装工厂准备发布的生产案例图片。"
    : "这是打样工作室准备发布的打样案例图片。";
  return [
    context,
    "生成中文案例资料草稿，只记录图片中明确可见或可谨慎概括的品类、材料、工艺和案例特点。",
    "图片中没有或看不清的信息必须返回空字符串或空数组，禁止猜测。",
    "不得虚构客户、品牌、认证、产能、MOQ、交期、合作结果、质量承诺或商业数据。",
    "不得提取姓名、电话、地址、订单号等个人信息；发现疑似敏感信息时写入 warnings。",
    "quantityRange、moqMin、leadTimeDays 只有在图片明确出现时才填写。",
    "summary 与 description 必须使用中性事实表达，并明确这是待服务商人工核对的草稿。"
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const provider = await getAnyProviderForUser(user);
  const supportedType = provider?.type === ProviderType.FACTORY || provider?.type === ProviderType.SAMPLE_STUDIO;
  if (!provider || provider.status !== ProviderStatus.ACTIVE || !supportedType) {
    return NextResponse.json({ error: "只有已启用的工厂或打样工作室可以使用 AI 案例录入" }, { status: 403 });
  }

  const entitlements = await getProviderEntitlements(provider.id);
  if (!entitlements.aiProductExtractionEnabled) {
    return NextResponse.json({ error: "当前权益未包含 AI 图片录入，请先启用相应套餐" }, { status: 403 });
  }
  if (process.env.AI_PRODUCT_EXTRACTION_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI 案例录入尚未启用，请先手动填写" }, { status: 503 });
  }

  const ip = getClientIp(request);
  const requestLimit = checkRateLimits([
    "provider-showcase-ai:user:" + user.id,
    "provider-showcase-ai:provider:" + provider.id,
    "provider-showcase-ai:ip:" + ip
  ], [
    { windowMs: 60 * 1000, limit: 6 },
    { windowMs: 60 * 60 * 1000, limit: 30 }
  ]);
  if (requestLimit.limited) {
    return tooManyRequests("AI 图片识别请求过于频繁，请稍后再试。", requestLimit.retryAfter);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请先上传一张有效的案例图片" }, { status: 400 });

  let imageUrl: string;
  try {
    imageUrl = imageUrlForModel(request, parsed.data.imageUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "图片地址无效" }, { status: 400 });
  }

  const monthlyUsage = await consumeProviderAiExtraction(provider.id, entitlements.aiProductExtractionMonthlyLimit);
  if (!monthlyUsage.allowed) {
    return tooManyRequests("本月 AI 图片识别额度已用完（" + monthlyUsage.limit + " 次），请下月再试或手动填写。", 3600);
  }

  const stringArrayFields = new Set(["tags", "materials", "techniques"]);
  const properties = Object.fromEntries(draftFields.map((field) => [
    field,
    stringArrayFields.has(field) ? { type: "array", items: { type: "string" } } : { type: "string" }
  ]));
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5.6",
      store: false,
      max_output_tokens: 1400,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: extractionPrompt(provider.type) },
          { type: "input_image", image_url: imageUrl, detail: "high" }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "provider_showcase_draft",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ...properties,
              confidence: { type: "number", minimum: 0, maximum: 1 },
              warnings: { type: "array", items: { type: "string" } }
            },
            required: [...draftFields, "confidence", "warnings"],
            additionalProperties: false
          }
        }
      }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!aiResponse.ok) {
    console.error("AI provider showcase extraction failed", { status: aiResponse.status });
    return NextResponse.json({ error: "图片识别暂时不可用，请稍后重试或手动填写" }, { status: 502 });
  }

  const payload = await aiResponse.json();
  const text = responseText(payload);
  if (!text) return NextResponse.json({ error: "未识别到可用资料，请手动填写" }, { status: 422 });

  try {
    const draft = draftSchema.parse(JSON.parse(text));
    return NextResponse.json({
      draft,
      notice: "AI 仅填充空白字段，资料由你逐项核对并决定是否发布。",
      usage: { remaining: monthlyUsage.remaining, limit: monthlyUsage.limit }
    });
  } catch {
    return NextResponse.json({ error: "识别结果格式异常，请手动填写" }, { status: 502 });
  }
}
