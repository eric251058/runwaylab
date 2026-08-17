import { LimitedPreorderQualificationMode, LimitedPreorderStatus } from "@prisma/client";
import type { AdmissionIssue } from "@/lib/projects/preorder-lifecycle";

export const LIMITED_PREORDER_PILOT_TEMPLATE = {
  version: "V2.3-PILOT-CONFIRMED-ORDER-2026-08",
  qualificationMode: LimitedPreorderQualificationMode.CONFIRMED_ORDER,
  acceptsPayment: false,
  recommendedWindowDays: { min: 7, max: 14 },
  principles: [
    "仅记录经平台人工确认的真实订单意向，不在线收款、不收定金。",
    "成团目标必须来自已核实的生产最小起订量，不能使用虚构默认值。",
    "活动硬限量必须等于开售商品硬限量合计，SKU 容量必须与商品硬限量一致。",
    "预计发货时间必须晚于截止时间，并在提交前向消费者明确展示。",
    "未达标、取消或异常时停止新增意向，并保留订单、状态事件和审计记录。"
  ]
} as const;

export type PilotReadinessArea =
  | "关联与作品"
  | "需求与授权"
  | "活动条款"
  | "商品与 SKU"
  | "试点安全";

const AREA_CODES: Record<PilotReadinessArea, readonly string[]> = {
  "关联与作品": ["PROJECT_LINK", "WORK_MISMATCH", "WORK_QUALITY", "PROJECT_VISIBILITY", "PROJECT_STATUS"],
  "需求与授权": ["DESIGN_AUTHORIZATION", "DEMAND_TARGET", "DEMAND_CAMPAIGN_STATUS"],
  "活动条款": [
    "CAMPAIGN_STATUS",
    "PREORDER_TARGET",
    "PREORDER_CAPACITY",
    "TARGET_OVER_CAPACITY",
    "PREORDER_DEADLINE",
    "TERMS_VERSION",
    "TERMS_TEXT",
    "PAYMENT_INSTRUCTIONS"
  ],
  "商品与 SKU": [
    "PRODUCTS",
    "PRODUCT_DESCRIPTION",
    "PRODUCT_PRICE",
    "PRODUCT_TARGET",
    "PRODUCT_LIMIT",
    "PRODUCT_TARGET_OVER_LIMIT",
    "ESTIMATED_SHIP_DATE",
    "SKU_REQUIRED",
    "SKU_OPTION",
    "SKU_CAPACITY",
    "SKU_PRICE",
    "SKU_LIMIT_MISMATCH",
    "CAMPAIGN_CAPACITY_UNREACHABLE",
    "CAMPAIGN_TARGET_UNREACHABLE"
  ],
  "试点安全": ["PILOT_MODE"]
};

export function pilotSafetyIssues(mode: LimitedPreorderQualificationMode): AdmissionIssue[] {
  return mode === LIMITED_PREORDER_PILOT_TEMPLATE.qualificationMode
    ? []
    : [{
        code: "PILOT_MODE",
        message: "首期试点只允许 CONFIRMED_ORDER；在真实支付与退款闭环验收前不得启用 PAID_ORDER。"
      }];
}

export function groupPilotReadinessIssues(issues: readonly AdmissionIssue[]) {
  return (Object.entries(AREA_CODES) as Array<[PilotReadinessArea, readonly string[]]>)
    .map(([area, codes]) => ({
      area,
      issues: issues.filter((item) => codes.includes(item.code))
    }))
    .filter((group) => group.issues.length > 0);
}

export function pilotReadinessAction(projectId: string, issueCode: string) {
  if (["WORK_QUALITY"].includes(issueCode)) {
    return { href: "/admin/works", label: "处理作品" };
  }
  if (["DEMAND_TARGET", "DEMAND_CAMPAIGN_STATUS"].includes(issueCode)) {
    return { href: "/admin/presale-intents", label: "处理需求验证" };
  }
  if (["PROJECT_LINK", "WORK_MISMATCH", "PROJECT_VISIBILITY", "PROJECT_STATUS"].includes(issueCode)) {
    return { href: "/admin/projects?mode=maintenance", label: "维护项目" };
  }
  return { href: `/admin/projects/${projectId}/preorder`, label: "进入预售工作台" };
}

export function isPilotLifecycleConfigurable(status: LimitedPreorderStatus) {
  return status === LimitedPreorderStatus.NOT_STARTED || status === LimitedPreorderStatus.PAUSED;
}
