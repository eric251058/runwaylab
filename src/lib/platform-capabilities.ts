export type PlatformAvailability = "LIVE" | "PARTIAL" | "PLANNED";

export type PlatformStage = {
  id: string;
  label: string;
  summary: string;
  href: string;
  availability: PlatformAvailability;
  appReady: boolean;
};

export type PlatformJourney = {
  id: "creative" | "project" | "commerce";
  eyebrow: string;
  title: string;
  summary: string;
  accent: string;
  stages: readonly PlatformStage[];
};

export type PlatformPersona = {
  id: "customer" | "creator" | "project-owner" | "provider" | "operator";
  label: string;
  summary: string;
  primaryHref: string;
  primaryAction: string;
};

export const PLATFORM_VERSION = "2.0B.6";
export const PLATFORM_SCHEMA_VERSION = "2026-08-13";

export const PLATFORM_AVAILABILITY_LABELS: Record<PlatformAvailability, string> = {
  LIVE: "已可使用",
  PARTIAL: "基础可用，继续补齐",
  PLANNED: "后续版本"
};

export const PLATFORM_SALES_MODEL = {
  id: "limited-preorder",
  label: "限量预售 · 达标生产",
  shortLabel: "达标生产",
  summary: "用户预订支持设计成真；达到最低数量后进入生产，未达标则取消并退款。",
  financialCrowdfunding: false,
  investmentReturn: false,
  lifecycle: ["设计产品化", "配置价格与 SKU", "限时预订", "达标判断", "生产交付", "售后结算"] as const
};

export const PLATFORM_JOURNEYS: readonly PlatformJourney[] = [
  {
    id: "creative",
    eyebrow: "Creative",
    title: "创意链",
    summary: "让设计被发布、被发现、被验证，并获得进入商业项目的机会。",
    accent: "from-[#f1e6ff] to-[#fff8e7]",
    stages: [
      { id: "publish", label: "发布作品", summary: "设计师提交作品、图片和创作说明。", href: "/publish", availability: "LIVE", appReady: false },
      { id: "discover", label: "发现与互动", summary: "浏览、点赞、收藏、评论、关注与分享。", href: "/works", availability: "LIVE", appReady: false },
      { id: "verify", label: "验证与孵化", summary: "审核、确权、AI 诊断、推荐与孵化申请。", href: "/verify", availability: "LIVE", appReady: false }
    ]
  },
  {
    id: "project",
    eyebrow: "Project",
    title: "项目链",
    summary: "把需求、设计、供应商和交付里程碑放进同一个协作对象。",
    accent: "from-[#e9f7f1] to-[#eef3ff]",
    stages: [
      { id: "start", label: "发起需求", summary: "创建项目意向，说明目标、受众、预算与时间。", href: "/start", availability: "LIVE", appReady: false },
      { id: "match", label: "匹配资源", summary: "连接设计师、面辅料、样衣、工厂与买手。", href: "/providers/opportunities", availability: "PARTIAL", appReady: false },
      { id: "deliver", label: "协作与验收", summary: "管理动作、里程碑、问题、授权和项目结果。", href: "/projects", availability: "LIVE", appReady: false }
    ]
  },
  {
    id: "commerce",
    eyebrow: "Commerce",
    title: "交易链",
    summary: "让作品成为可预订商品，并贯通订单、生产、物流与售后。",
    accent: "from-[#fff0e8] to-[#f3efff]",
    stages: [
      { id: "productize", label: "产品化与 SKU", summary: "确定款式、颜色、尺码、价格、限量和交付预期。", href: "/projects", availability: "PARTIAL", appReady: false },
      { id: "preorder", label: "限量预售", summary: "按最低成团量与截止时间聚合真实订单。", href: "/presale", availability: "PARTIAL", appReady: false },
      { id: "fulfillment", label: "生产与交付", summary: "达标后进入生产、质检、物流、签收和售后。", href: "/me/project-orders", availability: "PARTIAL", appReady: false },
      { id: "settlement", label: "退款与结算", summary: "未达标退款，完成后平台佣金与服务商结算。", href: "/platform", availability: "PLANNED", appReady: false }
    ]
  }
];

export const PLATFORM_PERSONAS: readonly PlatformPersona[] = [
  { id: "customer", label: "消费者 / 支持者", summary: "发现设计，参与限量预售，跟踪生产与收货。", primaryHref: "/presale", primaryAction: "浏览限量预售" },
  { id: "creator", label: "设计师 / 创作者", summary: "发布作品，积累反馈，进入项目和商业化。", primaryHref: "/me/platform", primaryAction: "进入创作者工作台" },
  { id: "project-owner", label: "品牌 / 项目方", summary: "发起需求，匹配人才与供应链，管理项目结果。", primaryHref: "/start", primaryAction: "发起项目" },
  { id: "provider", label: "供应商 / 服务商", summary: "展示能力，响应机会，参与交付和结算。", primaryHref: "/provider-center", primaryAction: "进入服务商中心" },
  { id: "operator", label: "平台运营", summary: "审核内容、协调项目、处理订单与风险。", primaryHref: "/admin", primaryAction: "进入运营后台" }
];

export const PLATFORM_PRINCIPLES = [
  "预售不是投资，不承诺收益或股权。",
  "达标判断、支付、退款和结算以服务端可审计状态为准。",
  "Web 与未来 App 共享业务状态机，避免维护两套规则。"
] as const;

export function getPlatformCapabilityContract() {
  return {
    version: PLATFORM_VERSION,
    schemaVersion: PLATFORM_SCHEMA_VERSION,
    salesModel: PLATFORM_SALES_MODEL,
    journeys: PLATFORM_JOURNEYS,
    personas: PLATFORM_PERSONAS,
    principles: PLATFORM_PRINCIPLES
  };
}
