import { ProjectIssueType } from "@prisma/client";
import { z } from "zod";

export const projectIssueRequestSchema = z
  .object({
    type: z.nativeEnum(ProjectIssueType).optional().default(ProjectIssueType.OTHER),
    title: z.string().trim().min(1, "请填写问题标题。").max(80, "标题最多 80 个字。"),
    description: z.string().trim().max(1000, "说明最多 1000 个字。").optional().nullable()
  })
  .strict();

export function parseProjectIssueRequest(input: unknown) {
  return projectIssueRequestSchema.safeParse(input);
}
