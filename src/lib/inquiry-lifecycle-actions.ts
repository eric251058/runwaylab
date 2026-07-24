"use server";

import { revalidatePath } from "next/cache";
import { RequestStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { canWithdrawInquiry, isTerminalInquiryStatus } from "@/lib/content-lifecycle";
import { prisma } from "@/lib/prisma";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function updateDesignerInquiryLifecycle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const id = textValue(formData, "id");
  const action = textValue(formData, "action");
  if (!id || !action) throw new Error("缺少询盘操作参数");

  const inquiry = await prisma.cooperationRequest.findUnique({
    where: { id },
    include: { replies: { select: { id: true } } }
  });
  if (!inquiry || inquiry.userId !== user.id) throw new Error("询盘不存在或没有权限操作");
  if (isTerminalInquiryStatus(inquiry.status)) throw new Error("该询盘已经结束，不能继续变更状态。");

  if (action === "withdraw") {
    if (!canWithdrawInquiry(inquiry)) throw new Error("只有服务商尚未回复的待处理询盘可以撤回。");
    await prisma.cooperationRequest.update({
      where: { id },
      data: {
        status: RequestStatus.CLOSED,
        handledAt: new Date(),
        adminNote: inquiry.adminNote ?? "用户已撤回未处理询盘"
      }
    });
  } else if (action === "close") {
    await prisma.cooperationRequest.update({
      where: { id },
      data: {
        status: RequestStatus.CLOSED,
        handledAt: new Date()
      }
    });
  } else {
    throw new Error("不支持的询盘操作");
  }

  revalidatePath("/me/inquiries");
  revalidatePath("/provider-center/inquiries");
}
