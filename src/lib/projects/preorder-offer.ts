import { createHash } from "node:crypto";
import {
  LimitedPreorderQualificationMode,
  ProjectDesignAuthorizationStatus,
  ProjectProductStatus
} from "@prisma/client";
import {
  assertOnlinePaymentInstructions,
  assertNoLimitedPreorderPaymentSolicitation,
  LIMITED_PREORDER_NO_PAYMENT_NOTICE
} from "@/lib/projects/preorder-lifecycle";

export const LIMITED_PREORDER_OFFER_SNAPSHOT_VERSION = "V2.3-OFFER-1";

export type LimitedPreorderOfferCampaign = {
  id: string;
  workId: string;
  title: string;
  description: string | null;
  estimatedPrice: string | null;
  priceNote: string | null;
  sizeOptions: string[];
  colorOptions: string[];
  preorderQualificationMode: LimitedPreorderQualificationMode;
  preorderTargetQuantity: number | null;
  preorderCapacity: number | null;
  preorderDeadline: Date | null;
  preorderTermsVersion: string;
  preorderTermsText: string | null;
  preorderPaymentInstructions: string | null;
};

export type LimitedPreorderOfferSku = {
  id: string;
  size: string;
  color: string;
  skuCode: string | null;
  priceOverride: number | null;
  capacity: number | null;
  enabled: boolean;
};

export type LimitedPreorderOfferProduct = {
  id: string;
  preorderCampaignId: string | null;
  title: string;
  description: string | null;
  materialDescription: string | null;
  careInstructions: string | null;
  price: number;
  currency: string;
  targetQuantity: number | null;
  preorderLimit: number | null;
  preorderDeadline: Date | null;
  estimatedShipDate: Date | null;
  imageStage: string | null;
  status: ProjectProductStatus;
  skus: LimitedPreorderOfferSku[];
};

export type LimitedPreorderOfferSnapshot = {
  version: typeof LIMITED_PREORDER_OFFER_SNAPSHOT_VERSION;
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
  projectTargetQuantity: string | null;
  projectEstimatedBudget: string | null;
  campaignId: string;
  campaignTitle: string;
  campaignDescription: string | null;
  campaignEstimatedPrice: string | null;
  campaignPriceNote: string | null;
  campaignSizeOptions: string[];
  campaignColorOptions: string[];
  workId: string;
  workTitle: string;
  workDescription: string | null;
  qualificationMode: LimitedPreorderQualificationMode;
  targetQuantity: number | null;
  capacity: number | null;
  deadline: string | null;
  termsVersion: string;
  termsText: string | null;
  paymentInstructions: string | null;
  displayImageUrls: string[];
  products: Array<{
    id: string;
    title: string;
    description: string | null;
    materialDescription: string | null;
    careInstructions: string | null;
    price: number;
    currency: string;
    targetQuantity: number | null;
    preorderLimit: number | null;
    estimatedShipDate: string | null;
    imageStage: string | null;
    skus: Array<{
      id: string;
      size: string;
      color: string;
      skuCode: string | null;
      priceOverride: number | null;
      capacity: number | null;
    }>;
  }>;
};

export type LimitedPreorderOfferIssue = { code: string; message: string };

export function assertLimitedPreorderOfferEditable(status: ProjectDesignAuthorizationStatus | null | undefined) {
  if (
    status === ProjectDesignAuthorizationStatus.PENDING
    || status === ProjectDesignAuthorizationStatus.ACCEPTED
  ) {
    throw new Error("最终开售资料已发送给作品作者或已经接受，不能再修改；如需调整，请先由作者拒绝或撤销后重新邀请");
  }
}

const OFFER_PRODUCT_STATUSES: readonly ProjectProductStatus[] = [
  ProjectProductStatus.APPROVED,
  ProjectProductStatus.PREORDER_OPEN,
  ProjectProductStatus.PAUSED,
  ProjectProductStatus.SOLD_OUT
];

const IMMUTABLE_MANAGED_WORK_IMAGE = /^\/uploads\/work\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpe?g|png|webp)$/i;

function isoDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function issue(code: string, message: string): LimitedPreorderOfferIssue {
  return { code, message };
}

export function createLimitedPreorderOfferEnvelope({
  projectId,
  projectTitle,
  projectDescription,
  projectTargetQuantity,
  projectEstimatedBudget,
  workTitle,
  workDescription,
  campaign,
  products,
  displayImageUrls,
  now = new Date()
}: {
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
  projectTargetQuantity: string | null;
  projectEstimatedBudget: string | null;
  workTitle: string;
  workDescription: string | null;
  campaign: LimitedPreorderOfferCampaign;
  products: readonly LimitedPreorderOfferProduct[];
  displayImageUrls: readonly string[];
  now?: Date;
}) {
  const issues: LimitedPreorderOfferIssue[] = [];
  // Preserve the reviewed WorkImage sort order: the first URL is the public
  // cover image. Reordering the same files must therefore create a new hash.
  const offerDisplayImageUrls = [...new Set(displayImageUrls.map((value) => value.trim()).filter(Boolean))];
  const offerProducts = products
    .filter((product) => (
      OFFER_PRODUCT_STATUSES.includes(product.status)
      && (!product.preorderCampaignId || product.preorderCampaignId === campaign.id)
    ))
    .sort((left, right) => left.id.localeCompare(right.id));

  const noPaymentMode = campaign.preorderQualificationMode === LimitedPreorderQualificationMode.CONFIRMED_ORDER;
  if (noPaymentMode && campaign.preorderPaymentInstructions?.trim()) {
    issues.push(issue("OFFER_PAYMENT_INSTRUCTIONS", "不收款试点不得包含转账、定金或其他付款指引。"));
  }
  if (!noPaymentMode) {
    try {
      assertOnlinePaymentInstructions(campaign.preorderPaymentInstructions);
    } catch {
      issues.push(issue("OFFER_PAYMENT_INSTRUCTIONS", "在线付款模式必须提供官方订单页付款说明，且不得引导个人账户、收款码或线下转账。"));
    }
  }
  for (const [label, value] of [
    ["项目标题", projectTitle],
    ["项目说明", projectDescription],
    ["项目目标数量", projectTargetQuantity],
    ["项目预算", projectEstimatedBudget],
    ["作品标题", workTitle],
    ["作品说明", workDescription],
    ["活动标题", campaign.title],
    ["活动说明", campaign.description],
    ["活动预计价格", campaign.estimatedPrice],
    ["活动价格说明", campaign.priceNote],
    ["活动尺码选项", campaign.sizeOptions.join("、")],
    ["活动颜色选项", campaign.colorOptions.join("、")]
  ] as const) {
    if (!value) continue;
    try {
      assertNoLimitedPreorderPaymentSolicitation(value, label);
    } catch {
      issues.push(issue("OFFER_PAYMENT_SOLICITATION", `${label}不得包含转账、定金、收款码或其他付款指引。`));
    }
  }
  if (!Number.isInteger(campaign.preorderTargetQuantity) || (campaign.preorderTargetQuantity ?? 0) < 1) {
    issues.push(issue("OFFER_TARGET", "最终开售资料包必须包含有效成团目标。"));
  }
  if (!Number.isInteger(campaign.preorderCapacity) || (campaign.preorderCapacity ?? 0) < 1) {
    issues.push(issue("OFFER_CAPACITY", "最终开售资料包必须包含有效活动限量。"));
  }
  if ((campaign.preorderTargetQuantity ?? 0) > (campaign.preorderCapacity ?? 0)) {
    issues.push(issue("OFFER_TARGET_OVER_CAPACITY", "成团目标不能大于活动限量。"));
  }
  if (!campaign.preorderDeadline || campaign.preorderDeadline <= now) {
    issues.push(issue("OFFER_DEADLINE", "最终开售资料包必须包含晚于当前时间的截止时间。"));
  }
  if (!campaign.preorderTermsVersion.trim()) {
    issues.push(issue("OFFER_TERMS_VERSION", "最终开售资料包必须锁定条款版本。"));
  }
  if (!campaign.preorderTermsText || campaign.preorderTermsText.trim().length < 40) {
    issues.push(issue("OFFER_TERMS_TEXT", "最终开售资料包必须锁定至少 40 个字符的完整条款。"));
  }
  if (noPaymentMode && !campaign.preorderTermsText?.includes(LIMITED_PREORDER_NO_PAYMENT_NOTICE)) {
    issues.push(issue("OFFER_NO_PAYMENT_NOTICE", "最终开售资料包必须包含不可删除的不收款与不提供线下转账指引说明。"));
  }
  if (noPaymentMode && campaign.preorderTermsText) {
    try {
      assertNoLimitedPreorderPaymentSolicitation(campaign.preorderTermsText, "最终开售条款");
    } catch {
      issues.push(issue("OFFER_PAYMENT_SOLICITATION", "最终开售资料包不得包含转账、定金、收款码或其他付款指引。"));
    }
  }
  if (!offerDisplayImageUrls.length) {
    issues.push(issue("OFFER_DISPLAY_IMAGE", "最终开售资料包必须冻结至少一张当前实际展示图片。"));
  }
  if (offerDisplayImageUrls.some((imageUrl) => !IMMUTABLE_MANAGED_WORK_IMAGE.test(imageUrl))) {
    issues.push(issue("OFFER_DISPLAY_IMAGE_SOURCE", "最终开售展示图必须使用平台上传生成的不可覆盖 work 图片地址，不能使用可被原站替换的外链。"));
  }
  if (!offerProducts.length) {
    issues.push(issue("OFFER_PRODUCTS", "最终开售资料包至少需要一个审核通过的商品。"));
  }

  for (const product of offerProducts) {
    const label = `商品“${product.title || product.id}”`;
    for (const [fieldLabel, value] of [
      ["标题", product.title],
      ["商品说明", product.description],
      ["面料与工艺", product.materialDescription],
      ["护理说明", product.careInstructions],
      ["图片阶段", product.imageStage]
    ] as const) {
      if (!value) continue;
      try {
        assertNoLimitedPreorderPaymentSolicitation(value, `${label}${fieldLabel}`);
      } catch {
        issues.push(issue("OFFER_PAYMENT_SOLICITATION", `${label}${fieldLabel}不得包含转账、定金、收款码或其他付款指引。`));
      }
    }
    if (!product.title.trim() || !product.description || product.description.trim().length < 20) {
      issues.push(issue("OFFER_PRODUCT_DESCRIPTION", `${label}需要标题及至少 20 字商品说明。`));
    }
    if (!product.materialDescription || product.materialDescription.trim().length < 10) {
      issues.push(issue("OFFER_PRODUCT_MATERIAL", `${label}需要至少 10 字的面料与工艺说明。`));
    }
    if (!product.careInstructions || product.careInstructions.trim().length < 10) {
      issues.push(issue("OFFER_PRODUCT_CARE", `${label}需要至少 10 字的护理说明。`));
    }
    if (!product.imageStage || product.imageStage.trim().length < 2) {
      issues.push(issue("OFFER_PRODUCT_IMAGE", `${label}必须说明消费者所见图片的真实阶段。`));
    }
    if (!Number.isInteger(product.price) || product.price <= 0) {
      issues.push(issue("OFFER_PRODUCT_PRICE", `${label}价格必须为正整数最小货币单位。`));
    }
    if (!Number.isInteger(product.targetQuantity) || (product.targetQuantity ?? 0) < 1) {
      issues.push(issue("OFFER_PRODUCT_TARGET", `${label}必须设置有效目标量。`));
    }
    if (!Number.isInteger(product.preorderLimit) || (product.preorderLimit ?? 0) < 1) {
      issues.push(issue("OFFER_PRODUCT_LIMIT", `${label}必须设置有效硬限量。`));
    }
    if ((product.targetQuantity ?? 0) > (product.preorderLimit ?? 0)) {
      issues.push(issue("OFFER_PRODUCT_TARGET_OVER_LIMIT", `${label}目标量不能大于硬限量。`));
    }
    if (!product.estimatedShipDate || !campaign.preorderDeadline || product.estimatedShipDate <= campaign.preorderDeadline) {
      issues.push(issue("OFFER_ESTIMATED_SHIP_DATE", `${label}预计发货时间必须晚于活动截止时间。`));
    }

    const enabledSkus = product.skus.filter((sku) => sku.enabled);
    if (!enabledSkus.length) issues.push(issue("OFFER_SKU_REQUIRED", `${label}至少需要一个启用的 SKU。`));
    let skuCapacity = 0;
    for (const sku of enabledSkus) {
      if (!sku.size.trim() || !sku.color.trim()) issues.push(issue("OFFER_SKU_OPTION", `${label}存在缺少尺码或颜色的 SKU。`));
      if (!Number.isInteger(sku.capacity) || (sku.capacity ?? 0) < 1) issues.push(issue("OFFER_SKU_CAPACITY", `${label}的启用 SKU 必须设置正整数容量。`));
      if (sku.priceOverride !== null && (!Number.isInteger(sku.priceOverride) || sku.priceOverride <= 0)) {
        issues.push(issue("OFFER_SKU_PRICE", `${label}的 SKU 覆盖价格必须留空或为正整数最小货币单位。`));
      }
      skuCapacity += sku.capacity ?? 0;
    }
    if (enabledSkus.length && skuCapacity !== product.preorderLimit) {
      issues.push(issue("OFFER_SKU_LIMIT_MISMATCH", `${label}启用 SKU 容量合计必须等于商品硬限量。`));
    }
  }

  const totalProductLimit = offerProducts.reduce((sum, product) => sum + (product.preorderLimit ?? 0), 0);
  if ((campaign.preorderCapacity ?? 0) !== totalProductLimit) {
    issues.push(issue("OFFER_CAMPAIGN_LIMIT_MISMATCH", "首期试点的活动限量必须等于开售商品硬限量合计。"));
  }

  const snapshot: LimitedPreorderOfferSnapshot = {
    version: LIMITED_PREORDER_OFFER_SNAPSHOT_VERSION,
    projectId,
    projectTitle,
    projectDescription,
    projectTargetQuantity,
    projectEstimatedBudget,
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignDescription: campaign.description,
    campaignEstimatedPrice: campaign.estimatedPrice,
    campaignPriceNote: campaign.priceNote,
    campaignSizeOptions: campaign.sizeOptions.map((item) => item.trim()),
    campaignColorOptions: campaign.colorOptions.map((item) => item.trim()),
    workId: campaign.workId,
    workTitle,
    workDescription,
    qualificationMode: campaign.preorderQualificationMode,
    targetQuantity: campaign.preorderTargetQuantity,
    capacity: campaign.preorderCapacity,
    deadline: isoDate(campaign.preorderDeadline),
    termsVersion: campaign.preorderTermsVersion,
    termsText: campaign.preorderTermsText,
    paymentInstructions: campaign.preorderPaymentInstructions,
    displayImageUrls: offerDisplayImageUrls,
    products: offerProducts.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      materialDescription: product.materialDescription,
      careInstructions: product.careInstructions,
      price: product.price,
      currency: product.currency,
      targetQuantity: product.targetQuantity,
      preorderLimit: product.preorderLimit,
      estimatedShipDate: isoDate(product.estimatedShipDate),
      imageStage: product.imageStage,
      skus: product.skus
        .filter((sku) => sku.enabled)
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((sku) => ({
          id: sku.id,
          size: sku.size,
          color: sku.color,
          skuCode: sku.skuCode,
          priceOverride: sku.priceOverride,
          capacity: sku.capacity
        }))
    }))
  };
  const hash = hashLimitedPreorderOfferSnapshot(snapshot);
  return { snapshot, hash, issues, totalProductLimit };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function hashLimitedPreorderOfferSnapshot(snapshot: LimitedPreorderOfferSnapshot) {
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

export function readLimitedPreorderOfferSnapshot(value: unknown): LimitedPreorderOfferSnapshot | null {
  const nullableString = (item: unknown) => typeof item === "string" || item === null;
  const nullableNumber = (item: unknown) => typeof item === "number" || item === null;
  if (!isRecord(value)) return null;
  if (value.version !== LIMITED_PREORDER_OFFER_SNAPSHOT_VERSION) return null;
  if (
    typeof value.projectId !== "string"
    || typeof value.projectTitle !== "string"
    || !nullableString(value.projectDescription)
    || !nullableString(value.projectTargetQuantity)
    || !nullableString(value.projectEstimatedBudget)
    || typeof value.campaignId !== "string"
    || typeof value.campaignTitle !== "string"
    || !nullableString(value.campaignDescription)
    || !nullableString(value.campaignEstimatedPrice)
    || !nullableString(value.campaignPriceNote)
    || !Array.isArray(value.campaignSizeOptions)
    || !value.campaignSizeOptions.every((item) => typeof item === "string")
    || !Array.isArray(value.campaignColorOptions)
    || !value.campaignColorOptions.every((item) => typeof item === "string")
    || typeof value.workId !== "string"
    || typeof value.workTitle !== "string"
    || !nullableString(value.workDescription)
  ) return null;
  if (!Object.values(LimitedPreorderQualificationMode).includes(value.qualificationMode as LimitedPreorderQualificationMode)) return null;
  if (!nullableNumber(value.targetQuantity) || !nullableNumber(value.capacity) || !nullableString(value.deadline)) return null;
  if (typeof value.termsVersion !== "string" || !nullableString(value.termsText) || !nullableString(value.paymentInstructions)) return null;
  if (!Array.isArray(value.displayImageUrls) || value.displayImageUrls.length === 0 || !value.displayImageUrls.every((item) => typeof item === "string" && item.trim())) return null;
  if (!Array.isArray(value.products) || value.products.length === 0) return null;
  if (!value.products.every((product) => (
    isRecord(product)
    && typeof product.id === "string"
    && typeof product.title === "string"
    && typeof product.currency === "string"
    && nullableString(product.description)
    && nullableString(product.materialDescription)
    && nullableString(product.careInstructions)
    && typeof product.price === "number"
    && nullableNumber(product.targetQuantity)
    && nullableNumber(product.preorderLimit)
    && nullableString(product.estimatedShipDate)
    && nullableString(product.imageStage)
    && Array.isArray(product.skus)
    && product.skus.every((sku) => (
      isRecord(sku)
      && typeof sku.id === "string"
      && typeof sku.size === "string"
      && typeof sku.color === "string"
      && nullableString(sku.skuCode)
      && nullableNumber(sku.priceOverride)
      && nullableNumber(sku.capacity)
    ))
  ))) return null;
  return value as unknown as LimitedPreorderOfferSnapshot;
}
