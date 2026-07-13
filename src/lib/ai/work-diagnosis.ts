import { AiDiagnosisStatus, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { WORK_DIAGNOSIS_PROMPT_VERSION, WORK_DIAGNOSIS_SYSTEM_PROMPT, buildWorkDiagnosisUserPrompt } from "@/lib/ai/prompts/work-diagnosis";
import { AiConfigurationError, AiProviderError, getAiProvider, isAiDiagnosisConfigured } from "@/lib/ai/provider";
import type { WorkDiagnosisInput, WorkDiagnosisResult } from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";

const listSchema = z.array(z.string()).max(8).optional().default([]);

const workDiagnosisResultSchema = z.object({
  designSummary: z.string().min(1).max(800),
  designHighlights: listSchema,
  targetAudience: listSchema,
  suitableScenes: listSchema,
  suggestedCategories: listSchema,
  suggestedMaterials: listSchema,
  suggestedTechniques: listSchema,
  productionRisks: listSchema,
  missingInformation: listSchema,
  nextStepSuggestions: listSchema,
  professionalAssessment: z.string().max(900).optional().default(""),
  productionAssessment: z.string().max(900).optional().default(""),
  marketAssessment: z.string().max(900).optional().default(""),
  confidence: z.coerce.number().int().min(0).max(100)
});

export const AI_NOT_CONFIGURED_MESSAGE = "AI 诊断服务暂未配置，请联系管理员。";
export const AI_GENERIC_FAILURE_MESSAGE = "AI 服务暂时不可用，请稍后再试。";

type DiagnosisUser = {
  id: string;
  role: UserRole | string;
};

type DiagnosisActionInput = {
  workId: string;
  requestedById: string;
  isAdmin: boolean;
};

function cleanText(value: unknown, maxLength = 600) {
  if (typeof value !== "string") return "";
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanList(values: string[], maxItems = 6) {
  return values
    .map((item) => cleanText(item, 120))
    .filter(Boolean)
    .slice(0, maxItems);
}

function listToText(values: string[]) {
  return values.length ? values.join("\n") : null;
}

function textToList(value?: string | null) {
  return value?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [];
}

function containsSensitivePattern(value: string) {
  const patterns = [
    /DATABASE_URL/i,
    /SESSION_SECRET/i,
    /AI_API_KEY/i,
    /cookie\s*:/i,
    /Bearer\s+[A-Za-z0-9._-]+/i,
    /sk-[A-Za-z0-9_-]{16,}/i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b1[3-9]\d{9}\b/
  ];

  return patterns.some((pattern) => pattern.test(value));
}

function normalizeDiagnosisResult(input: unknown): WorkDiagnosisResult {
  const parsed = workDiagnosisResultSchema.safeParse(input);

  if (!parsed.success) {
    throw new AiProviderError("AI 返回格式不符合要求。");
  }

  const result: WorkDiagnosisResult = {
    designSummary: cleanText(parsed.data.designSummary, 500),
    designHighlights: cleanList(parsed.data.designHighlights),
    targetAudience: cleanList(parsed.data.targetAudience),
    suitableScenes: cleanList(parsed.data.suitableScenes),
    suggestedCategories: cleanList(parsed.data.suggestedCategories),
    suggestedMaterials: cleanList(parsed.data.suggestedMaterials),
    suggestedTechniques: cleanList(parsed.data.suggestedTechniques),
    productionRisks: cleanList(parsed.data.productionRisks),
    missingInformation: cleanList(parsed.data.missingInformation),
    nextStepSuggestions: cleanList(parsed.data.nextStepSuggestions),
    professionalAssessment: cleanText(parsed.data.professionalAssessment, 600),
    productionAssessment: cleanText(parsed.data.productionAssessment, 600),
    marketAssessment: cleanText(parsed.data.marketAssessment, 600),
    confidence: parsed.data.confidence
  };

  const combined = JSON.stringify(result);
  if (!result.designSummary || containsSensitivePattern(combined)) {
    throw new AiProviderError("AI 返回格式不符合要求。");
  }

  return result;
}

function diagnosisToData(result: WorkDiagnosisResult) {
  return {
    designSummary: result.designSummary,
    designHighlights: listToText(result.designHighlights),
    targetAudience: listToText(result.targetAudience),
    suitableScenes: listToText(result.suitableScenes),
    suggestedCategories: listToText(result.suggestedCategories),
    suggestedMaterials: listToText(result.suggestedMaterials),
    suggestedTechniques: listToText(result.suggestedTechniques),
    productionRisks: listToText(result.productionRisks),
    missingInformation: listToText(result.missingInformation),
    nextStepSuggestions: listToText(result.nextStepSuggestions),
    professionalAssessment: result.professionalAssessment || null,
    productionAssessment: result.productionAssessment || null,
    marketAssessment: result.marketAssessment || null,
    confidence: result.confidence,
    rawResponse: result as unknown as Prisma.InputJsonValue
  };
}

function compactDescription(value: string) {
  return cleanText(value, 1800);
}

async function loadWorkForDiagnosis(workId: string) {
  return prisma.work.findUnique({
    where: { id: workId },
    include: {
      school: true,
      teacherRecommendations: {
        include: {
          teacher: {
            include: {
              school: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 3
      },
      opportunityProfile: true
    }
  });
}

function buildDiagnosisInput(work: Awaited<ReturnType<typeof loadWorkForDiagnosis>>): WorkDiagnosisInput {
  if (!work) {
    throw new Error("Work not found.");
  }

  return {
    title: cleanText(work.title, 160),
    description: compactDescription(work.description),
    category: cleanText(work.category, 80),
    workType: cleanText(work.workType, 80),
    styleTags: work.styleTags.map((tag) => cleanText(tag, 40)).filter(Boolean).slice(0, 8),
    school: work.school ? [work.school.name, work.school.city].filter(Boolean).join(" / ") : null,
    teacherRecommendations: work.teacherRecommendations.map((item) => cleanText([item.teacher?.name, item.teacher?.school?.name, item.note].filter(Boolean).join(" / "), 180)).filter(Boolean),
    opportunityProfile: work.opportunityProfile
      ? {
          targetQuantity: work.opportunityProfile.targetQuantity,
          targetRetailPrice: work.opportunityProfile.targetRetailPrice?.toString() ?? null,
          sampleStatus: work.opportunityProfile.sampleStatus,
          fabricStatus: work.opportunityProfile.fabricStatus,
          targetLaunchDate: work.opportunityProfile.targetLaunchDate?.toISOString().slice(0, 10) ?? null
        }
      : null
  };
}

function publicErrorMessage(error: unknown) {
  if (error instanceof AiConfigurationError) return AI_NOT_CONFIGURED_MESSAGE;
  if (error instanceof AiProviderError) return error.message;
  return AI_GENERIC_FAILURE_MESSAGE;
}

export function canUseAiDiagnosis() {
  return isAiDiagnosisConfigured();
}

export function formatDiagnosisList(value?: string | null) {
  return textToList(value);
}

export function canRequestWorkDiagnosis(user: DiagnosisUser | null | undefined, work: { userId: string }) {
  return Boolean(user && (user.role === UserRole.ADMIN || user.id === work.userId));
}

export async function assertWorkDiagnosisRequestAllowed({ workId, requestedById, isAdmin }: DiagnosisActionInput) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { id: true, userId: true }
  });

  if (!work) {
    return { allowed: false as const, status: 404, message: "作品不存在。" };
  }

  if (!isAdmin && work.userId !== requestedById) {
    return { allowed: false as const, status: 403, message: "只能为自己的作品申请 AI 诊断。" };
  }

  if (!isAdmin) {
    const recentCount = await prisma.workAiDiagnosis.count({
      where: {
        workId,
        requestedById,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (recentCount >= 3) {
      return { allowed: false as const, status: 429, message: "同一作品 24 小时最多申请 3 次 AI 诊断。" };
    }
  }

  return { allowed: true as const, work };
}

export async function createWorkAiDiagnosis({ workId, requestedById }: { workId: string; requestedById: string }) {
  const latest = await prisma.workAiDiagnosis.aggregate({
    where: { workId },
    _max: { version: true }
  });

  return prisma.workAiDiagnosis.create({
    data: {
      workId,
      requestedById,
      version: (latest._max.version ?? 0) + 1,
      status: AiDiagnosisStatus.PENDING
    }
  });
}

export async function runWorkAiDiagnosis(diagnosisId: string) {
  const diagnosis = await prisma.workAiDiagnosis.findUnique({
    where: { id: diagnosisId },
    select: { id: true, workId: true }
  });

  if (!diagnosis) {
    throw new Error("Diagnosis not found.");
  }

  if (!canUseAiDiagnosis()) {
    await prisma.workAiDiagnosis.update({
      where: { id: diagnosisId },
      data: {
        status: AiDiagnosisStatus.FAILED,
        errorMessage: AI_NOT_CONFIGURED_MESSAGE
      }
    });
    throw new AiConfigurationError();
  }

  await prisma.workAiDiagnosis.update({
    where: { id: diagnosisId },
    data: {
      status: AiDiagnosisStatus.PROCESSING,
      errorMessage: null
    }
  });

  try {
    const work = await loadWorkForDiagnosis(diagnosis.workId);
    if (!work) {
      throw new AiProviderError("作品不存在。");
    }

    const input = buildDiagnosisInput(work);
    const provider = getAiProvider();
    const raw = await provider.generateStructuredResult<unknown>({
      schemaName: "WorkDiagnosisResult",
      systemPrompt: WORK_DIAGNOSIS_SYSTEM_PROMPT,
      userPrompt: buildWorkDiagnosisUserPrompt(input),
      maxTokens: 1500,
      temperature: 0.2
    });
    const result = normalizeDiagnosisResult(raw);

    return prisma.workAiDiagnosis.update({
      where: { id: diagnosisId },
      data: {
        ...diagnosisToData(result),
        status: AiDiagnosisStatus.COMPLETED,
        modelProvider: provider.name,
        modelName: provider.model,
        promptVersion: WORK_DIAGNOSIS_PROMPT_VERSION,
        errorMessage: null
      }
    });
  } catch (error) {
    const message = publicErrorMessage(error);
    await prisma.workAiDiagnosis.update({
      where: { id: diagnosisId },
      data: {
        status: AiDiagnosisStatus.FAILED,
        errorMessage: message
      }
    });
    throw error;
  }
}

export async function createAndRunWorkAiDiagnosis(input: DiagnosisActionInput) {
  const allowed = await assertWorkDiagnosisRequestAllowed(input);

  if (!allowed.allowed) {
    return allowed;
  }

  if (!canUseAiDiagnosis()) {
    return { allowed: false as const, status: 503, message: AI_NOT_CONFIGURED_MESSAGE };
  }

  const diagnosis = await createWorkAiDiagnosis({
    workId: input.workId,
    requestedById: input.requestedById
  });

  try {
    const completed = await runWorkAiDiagnosis(diagnosis.id);
    return { allowed: true as const, diagnosis: completed };
  } catch (error) {
    const failed = await prisma.workAiDiagnosis.findUnique({
      where: { id: diagnosis.id }
    });
    return {
      allowed: true as const,
      diagnosis: failed,
      warning: publicErrorMessage(error)
    };
  }
}
