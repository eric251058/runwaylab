export type ProviderBillingCycle = "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export type ProviderMembershipPlan = {
  id: string;
  name: string;
  billingCycle: ProviderBillingCycle;
  priceCny: number;
  priceLabel: string;
  description: string;
  recommended?: boolean;
  benefits: string[];
  limits: string[];
};

export const PROVIDER_MEMBERSHIP_PLANS: ProviderMembershipPlan[] = [
  {
    id: "FOUNDING_TRIAL",
    name: "首批共创伙伴",
    billingCycle: "TRIAL",
    priceCny: 0,
    priceLabel: "首批 90 天免费",
    description: "适合首批真实服务商完成主页、产品与询盘流程验证。",
    benefits: ["认证资料审核", "公开服务商主页", "最多 10 个产品或案例", "站内合作询盘"],
    limits: ["不承诺订单数量", "试运营结束前另行确认是否续费"]
  },
  {
    id: "GROWTH_MONTHLY",
    name: "增长版 · 月付",
    billingCycle: "MONTHLY",
    priceCny: 299,
    priceLabel: "¥299 / 月",
    description: "适合需要持续展示产品、接收需求并验证获客效果的服务商。",
    benefits: ["最多 50 个产品或案例", "AI 图片资料提取", "合作机会优先匹配", "询盘工作台与数据摘要"],
    limits: ["平台不代替服务商报价", "成交与履约由合作双方确认"]
  },
  {
    id: "GROWTH_QUARTERLY",
    name: "增长版 · 季付",
    billingCycle: "QUARTERLY",
    priceCny: 799,
    priceLabel: "¥799 / 季",
    description: "适合以季度为周期稳定运营产品和案例的服务商。",
    recommended: true,
    benefits: ["包含增长版全部权益", "季度运营体检", "公开主页重点完善建议", "节省 ¥98"],
    limits: ["推荐排序仍以资料质量和响应表现为准", "付费不等于购买排名"]
  },
  {
    id: "GROWTH_YEARLY",
    name: "增长版 · 年付",
    billingCycle: "YEARLY",
    priceCny: 2399,
    priceLabel: "¥2,399 / 年",
    description: "适合产品稳定、愿意长期经营平台渠道的成熟服务商。",
    benefits: ["包含增长版全部权益", "年度能力档案", "案例内容优先审核", "节省 ¥1,189"],
    limits: ["不出售虚假认证", "不承诺曝光量或成交额"]
  }
];

export function providerPlanById(id: string | null | undefined) {
  return PROVIDER_MEMBERSHIP_PLANS.find((plan) => plan.id === id) ?? null;
}

