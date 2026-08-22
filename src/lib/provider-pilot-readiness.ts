export type ProviderReadinessIssue = {
  code: string;
  label: string;
  detail: string;
  severity: "BLOCKER" | "WARNING";
  actionHref: string;
  actionLabel: string;
};

export type ProviderPilotReadinessInput = {
  status: string;
  isVerified: boolean;
  hasOwner: boolean;
  name: string;
  tagline: string | null;
  description: string | null;
  contactChannelCount: number;
  capabilityCount: number;
  hasMinimumOrder: boolean;
  hasLeadTime: boolean;
  publishedProductCount: number;
  activeSubscription: boolean;
  pendingInquiryCreatedAt: Date[];
  now?: Date;
};

export type ProviderPilotReadiness = {
  ready: boolean;
  passedChecks: number;
  totalChecks: number;
  issues: ProviderReadinessIssue[];
  commercialPlanReady: boolean;
};

const providerAction = {
  actionHref: "/admin/providers?tab=providers",
  actionLabel: "完善服务商资料"
};

export function evaluateProviderPilotReadiness(input: ProviderPilotReadinessInput): ProviderPilotReadiness {
  const issues: ProviderReadinessIssue[] = [];
  const requiredChecks = [
    input.status === "ACTIVE",
    input.isVerified,
    input.hasOwner,
    input.name.trim().length >= 2 && (input.tagline?.trim().length ?? 0) >= 4 && (input.description?.trim().length ?? 0) >= 40,
    input.contactChannelCount > 0,
    input.capabilityCount > 0,
    input.hasMinimumOrder && input.hasLeadTime,
    input.publishedProductCount > 0
  ];

  if (!requiredChecks[0]) {
    issues.push({ code: "STATUS", label: "尚未启用", detail: "服务商状态必须为 ACTIVE 才能进入首批试点。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[1]) {
    issues.push({ code: "VERIFICATION", label: "尚未认证", detail: "首批试点需要先完成人工认证，避免把未核验主体推荐给客户。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[2]) {
    issues.push({ code: "OWNER", label: "缺少负责人", detail: "服务商必须绑定负责人，确保询盘、报价与交付都有明确责任人。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[3]) {
    issues.push({ code: "PROFILE", label: "公开资料不完整", detail: "补齐名称、定位短句和至少 40 字简介，让客户能快速判断是否匹配。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[4]) {
    issues.push({ code: "CONTACT", label: "缺少联系通道", detail: "至少保留电话、邮箱、微信、WhatsApp 或官网中的一种。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[5]) {
    issues.push({ code: "CAPABILITY", label: "能力标签不足", detail: "至少填写一个品类、材料、工艺或专业方向。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[6]) {
    issues.push({ code: "CAPACITY", label: "产能边界不清", detail: "最低起订量与交付周期必须同时明确，避免无效询盘。", severity: "BLOCKER", ...providerAction });
  }
  if (!requiredChecks[7]) {
    issues.push({
      code: "CONTENT",
      label: "缺少已发布产品",
      detail: "至少发布一个已审核面料或案例，形成可验证的真实供给。",
      severity: "BLOCKER",
      actionHref: "/admin/providers?tab=fabrics",
      actionLabel: "检查产品内容"
    });
  }

  const now = input.now ?? new Date();
  const staleThreshold = now.getTime() - 72 * 60 * 60 * 1000;
  const staleInquiryCount = input.pendingInquiryCreatedAt.filter((createdAt) => createdAt.getTime() < staleThreshold).length;
  if (staleInquiryCount > 0) {
    issues.push({
      code: "STALE_INQUIRY",
      label: staleInquiryCount + " 条询盘超过 72 小时",
      detail: "试点服务商应保持真实响应节奏；请先联系并更新处理状态。",
      severity: "WARNING",
      actionHref: "/admin/providers?tab=inquiries",
      actionLabel: "处理询盘"
    });
  }

  return {
    ready: !issues.some((issue) => issue.severity === "BLOCKER"),
    passedChecks: requiredChecks.filter(Boolean).length,
    totalChecks: requiredChecks.length,
    issues,
    commercialPlanReady: input.activeSubscription
  };
}
