import { z } from "zod";
export const SUPPORT_LABELS: Record<string, string> = { FEEDBACK: "问题反馈", CORRECTION: "修改个人资料", DELETION: "删除资料申请" };
export const supportInput = z.object({
  clientId: z.string().uuid(),
  category: z.enum(["FEEDBACK", "CORRECTION", "DELETION"]),
  message: z.string().trim().min(10, "请至少填写10个字，说明需要处理的问题。").max(2000)
}).strict();
export const supportReply = z.object({
  version: z.number().int().min(0),
  reply: z.string().trim().min(5, "请填写明确的处理结果。").max(2000)
}).strict();
