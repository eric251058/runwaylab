import { z } from "zod";

export const START_PROJECT_DRAFT_VERSION = 1;
export const START_PROJECT_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const START_PROJECT_DRAFT_KEY = "runwaylab.startProject.v1";

export const START_SOURCE_VALUES = ["DESIGN", "IDEA", "AUDIENCE", "STORE", "BRAND"] as const;
export const START_CATEGORY_VALUES = ["DRESS", "SHIRT", "OUTERWEAR", "SET", "SKIRT", "PANTS", "LIGHT_FORMAL", "KNIT", "OTHER"] as const;
export const START_NEED_VALUES = ["DESIGN_DIRECTION", "FABRIC", "SAMPLE", "PRODUCTION", "MARKET_VALIDATION", "UNSURE"] as const;
export const PROJECT_INTAKE_STATUS_VALUES = ["DRAFT", "READY_FOR_REVIEW", "SUBMITTED", "NEEDS_INFO", "ACCEPTED", "DECLINED"] as const;
export const PROJECT_INTAKE_EVENT_VALUES = ["CREATED", "DETAILS_UPDATED", "SUBMITTED", "WITHDRAWN", "NEEDS_INFO", "RESUBMITTED", "ACCEPTED", "DECLINED", "CONVERTED"] as const;

export const USE_SCENARIO_VALUES = ["DAILY_COMMUTE", "WEEKEND", "DATE_PARTY", "FORMAL", "TRAVEL", "STAGE_PHOTO", "STORE_SALES", "OTHER", "UNSURE"] as const;
export const EXPECTED_PRICE_BAND_VALUES = ["UNDER_299", "FROM_300_TO_599", "FROM_600_TO_999", "FROM_1000_TO_1999", "FROM_2000", "UNSURE"] as const;
export const LAUNCH_TIMING_VALUES = ["WITHIN_30_DAYS", "ONE_TO_THREE_MONTHS", "THREE_TO_SIX_MONTHS", "EXPLORING"] as const;
export const PROJECT_INTAKE_REVIEW_DECISIONS = ["ACCEPTED", "NEEDS_INFO", "DECLINED"] as const;

export type StartSourceType = (typeof START_SOURCE_VALUES)[number];
export type StartCategory = (typeof START_CATEGORY_VALUES)[number];
export type StartPrimaryNeed = (typeof START_NEED_VALUES)[number];
export type UseScenario = (typeof USE_SCENARIO_VALUES)[number];
export type ExpectedPriceBand = (typeof EXPECTED_PRICE_BAND_VALUES)[number];
export type LaunchTiming = (typeof LAUNCH_TIMING_VALUES)[number];
export type ProjectIntakeReviewDecision = (typeof PROJECT_INTAKE_REVIEW_DECISIONS)[number];

const safeDraftId = z
  .string()
  .trim()
  .min(8, "草稿编号无效。")
  .max(80, "草稿编号无效。")
  .regex(/^[A-Za-z0-9_-]+$/, "草稿编号无效。");

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isRepeatedTitle(value: string) {
  const chars = Array.from(value.replace(/\s+/g, ""));
  if (chars.length < 3) return false;
  return chars.every((char) => char === chars[0]);
}

function looksLikeTestTitle(value: string) {
  return /^(test|demo|sample|测试|示例|随便|asdf|aaaa|项目|我的项目)$/i.test(value.trim());
}

export const projectTitleSchema = z
  .string()
  .trim()
  .min(2, "项目名称至少 2 个字符。")
  .max(50, "项目名称最多 50 个字符。")
  .superRefine((value, context) => {
    const text = compact(value);
    if (/^\d+$/.test(text)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "项目名称不能只有数字。" });
    }
    if (isRepeatedTitle(text)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "项目名称不能是重复字符。" });
    }
    if (looksLikeTestTitle(text)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "请填写一个更具体的项目名称。" });
    }
  });

export const optionalProjectTitleSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const text = compact(value);
  return text ? text : undefined;
}, projectTitleSchema.optional());

export const targetAudienceSchema = z
  .string()
  .trim()
  .min(2, "请简单说明主要为谁而做。")
  .max(120, "目标用户最多 120 个字符。");

export const reviewMessageSchema = z
  .string()
  .trim()
  .max(500, "补充说明最多 500 个字符。")
  .optional()
  .nullable();

export const reviewNoteSchema = z.string().trim().max(500, "反馈最多 500 个字符。").optional().nullable();

const specificReviewNoteSchema = z
  .string()
  .trim()
  .min(10, "请写清楚具体需要补充什么或为什么暂不适合。")
  .max(500, "反馈最多 500 个字符。")
  .superRefine((value, context) => {
    const text = compact(value);
    if (/^(资料不完整|不完整|补充资料|再看看|不合适|暂不合适)$/i.test(text)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "反馈需要更具体，不能只写笼统结论。" });
    }
  });

export const projectIntakeCreateSchema = z
  .object({
    clientDraftId: safeDraftId,
    sourceType: z.enum(START_SOURCE_VALUES),
    linkedWorkId: z.string().trim().min(1, "请选择要继续推进的作品。").max(80, "作品编号无效。").optional().nullable(),
    category: z.enum(START_CATEGORY_VALUES),
    categoryOther: z.string().trim().max(40, "补充品类最多 40 个字符。").optional().nullable(),
    primaryNeed: z.enum(START_NEED_VALUES),
    ideaText: z.string().trim().max(180, "一句话描述最多 180 个字符。").optional().nullable()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sourceType === "DESIGN" && !value.linkedWorkId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["linkedWorkId"], message: "请选择要继续推进的作品。" });
    }
    if (value.sourceType !== "DESIGN" && value.linkedWorkId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["linkedWorkId"], message: "只有从已有作品开始时才能关联作品。" });
    }
    if (value.category !== "OTHER" && value.categoryOther?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "只有选择其他品类时才需要补充说明。"
      });
    }
  });

export const projectIntakePatchSchema = z
  .object({
    sourceType: z.enum(START_SOURCE_VALUES).optional(),
    category: z.enum(START_CATEGORY_VALUES).optional(),
    categoryOther: z.string().trim().max(40, "补充品类最多 40 个字符。").optional().nullable(),
    primaryNeed: z.enum(START_NEED_VALUES).optional(),
    ideaText: z.string().trim().max(180, "一句话描述最多 180 个字符。").optional().nullable(),
    projectTitle: optionalProjectTitleSchema.nullable().optional(),
    targetAudience: targetAudienceSchema.optional().nullable(),
    useScenario: z.enum(USE_SCENARIO_VALUES).optional().nullable(),
    expectedPriceBand: z.enum(EXPECTED_PRICE_BAND_VALUES).optional().nullable(),
    launchTiming: z.enum(LAUNCH_TIMING_VALUES).optional().nullable(),
    reviewMessage: reviewMessageSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.category && value.category !== "OTHER" && value.categoryOther?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "只有选择其他品类时才需要补充说明。"
      });
    }
  });

export const projectIntakeReviewSchema = z
  .object({
    decision: z.enum(PROJECT_INTAKE_REVIEW_DECISIONS),
    note: reviewNoteSchema,
    expectedUpdatedAt: z.string().datetime("项目版本已失效，请刷新后再处理。")
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "NEEDS_INFO" || value.decision === "DECLINED") {
      const parsed = specificReviewNoteSchema.safeParse(value.note ?? "");
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["note"],
          message: parsed.error.issues[0]?.message ?? "请填写具体反馈。"
        });
      }
    }
  });

export const projectIntakeConversionSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime("项目状态已更新，请刷新后重试。")
  })
  .strict();

export function normalizeStartSourceParam(value?: string | null): StartSourceType | null {
  if (value === "design") return "DESIGN";
  if (value === "idea") return "IDEA";
  return null;
}
