import { z } from "zod";

export const START_PROJECT_DRAFT_VERSION = 1;
export const START_PROJECT_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const START_PROJECT_DRAFT_KEY = "runwaylab.startProject.v1";

export const START_SOURCE_VALUES = ["DESIGN", "IDEA", "AUDIENCE", "STORE", "BRAND"] as const;
export const START_CATEGORY_VALUES = ["DRESS", "SHIRT", "OUTERWEAR", "SET", "SKIRT", "PANTS", "LIGHT_FORMAL", "KNIT", "OTHER"] as const;
export const START_NEED_VALUES = ["DESIGN_DIRECTION", "FABRIC", "SAMPLE", "PRODUCTION", "MARKET_VALIDATION", "UNSURE"] as const;
export const PROJECT_INTAKE_STATUS_VALUES = ["DRAFT", "READY_FOR_REVIEW"] as const;

export type StartSourceType = (typeof START_SOURCE_VALUES)[number];
export type StartCategory = (typeof START_CATEGORY_VALUES)[number];
export type StartPrimaryNeed = (typeof START_NEED_VALUES)[number];

const safeDraftId = z
  .string()
  .trim()
  .min(8, "草稿编号无效。")
  .max(80, "草稿编号无效。")
  .regex(/^[A-Za-z0-9_-]+$/, "草稿编号无效。");

export const projectIntakeCreateSchema = z
  .object({
    clientDraftId: safeDraftId,
    sourceType: z.enum(START_SOURCE_VALUES),
    category: z.enum(START_CATEGORY_VALUES),
    categoryOther: z.string().trim().max(40, "补充品类最多 40 个字。").optional().nullable(),
    primaryNeed: z.enum(START_NEED_VALUES),
    ideaText: z.string().trim().max(180, "一句话描述最多 180 个字。").optional().nullable()
  })
  .strict()
  .superRefine((value, context) => {
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
    categoryOther: z.string().trim().max(40, "补充品类最多 40 个字。").optional().nullable(),
    primaryNeed: z.enum(START_NEED_VALUES).optional(),
    ideaText: z.string().trim().max(180, "一句话描述最多 180 个字。").optional().nullable(),
    status: z.enum(PROJECT_INTAKE_STATUS_VALUES).optional()
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

export function normalizeStartSourceParam(value?: string | null): StartSourceType | null {
  if (value === "design") return "DESIGN";
  if (value === "idea") return "IDEA";
  return null;
}
