import assert from "node:assert/strict";
import {
  LimitedPreorderQualificationMode,
  ProjectDesignAuthorizationStatus,
  ProjectProductStatus
} from "@prisma/client";
import {
  assertLimitedPreorderOfferEditable,
  createLimitedPreorderOfferEnvelope,
  readLimitedPreorderOfferSnapshot,
  type LimitedPreorderOfferCampaign,
  type LimitedPreorderOfferProduct
} from "../src/lib/projects/preorder-offer";
import { LIMITED_PREORDER_NO_PAYMENT_NOTICE } from "../src/lib/projects/preorder-lifecycle";

const now = new Date("2026-08-18T00:00:00.000Z");
const deadline = new Date("2026-08-30T00:00:00.000Z");
const estimatedShipDate = new Date("2026-10-15T00:00:00.000Z");

type OfferInput = {
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
  projectTargetQuantity: string | null;
  projectEstimatedBudget: string | null;
  workTitle: string;
  workDescription: string | null;
  campaign: LimitedPreorderOfferCampaign;
  products: LimitedPreorderOfferProduct[];
  displayImageUrls: string[];
  now: Date;
};

function validInput(): OfferInput {
  return {
    projectId: "project_1",
    projectTitle: "东方结构连衣裙首期合作项目",
    projectDescription: "由真实项目负责人组织的首期限量意向验证，具体商品与交付边界见下方冻结资料。",
    projectTargetQuantity: "10 件",
    projectEstimatedBudget: "首期样衣与十件小单生产预算已由双方线下核对",
    workTitle: "东方结构连衣裙",
    workDescription: "以东方服饰结构为灵感完成的原创连衣裙作品，当前展示内容已经作者确认。",
    campaign: {
      id: "campaign_1",
      workId: "work_1",
      title: "东方结构连衣裙首期限量预售",
      description: "仅验证本期真实订单意向，达到公开目标后再按双方确认的责任边界推进生产。",
      estimatedPrice: "CNY 199.00",
      priceNote: "页面价格为本期不收款意向确认的参考价格",
      sizeOptions: ["S", "M"],
      colorOptions: ["黑色"],
      preorderQualificationMode: LimitedPreorderQualificationMode.CONFIRMED_ORDER,
      preorderTargetQuantity: 6,
      preorderCapacity: 10,
      preorderDeadline: deadline,
      preorderTermsVersion: "limited-preorder-v1",
      preorderTermsText: `${LIMITED_PREORDER_NO_PAYMENT_NOTICE} 本商品为限量预售而非现货。达到公开成团目标后进入生产；未达到目标则关闭。`,
      preorderPaymentInstructions: null
    },
    products: [
      {
        id: "product_b",
        preorderCampaignId: null,
        title: "东方结构连衣裙",
        description: "使用立体剪裁完成的限量连衣裙，消费者下单前可以看到完整的预售边界说明。",
        materialDescription: "主面料为棉麻混纺，里料为粘胶纤维；最终批次以作者确认的样衣资料为准。",
        careInstructions: "建议冷水轻柔手洗，不可漂白，平铺晾干并使用低温蒸汽熨烫。",
        price: 19_900,
        currency: "CNY",
        targetQuantity: 6,
        preorderLimit: 10,
        preorderDeadline: deadline,
        estimatedShipDate,
        imageStage: "SAMPLE_CONFIRMED",
        status: ProjectProductStatus.APPROVED,
        skus: [
          {
            id: "sku_m",
            size: "M",
            color: "黑色",
            skuCode: "DR-BLK-M",
            priceOverride: 20_900,
            capacity: 6,
            enabled: true
          },
          {
            id: "sku_s",
            size: "S",
            color: "黑色",
            skuCode: "DR-BLK-S",
            priceOverride: null,
            capacity: 4,
            enabled: true
          },
          {
            id: "sku_disabled",
            size: "L",
            color: "黑色",
            skuCode: "DRAFT-ONLY",
            priceOverride: null,
            capacity: null,
            enabled: false
          }
        ]
      },
      {
        id: "product_draft",
        preorderCampaignId: null,
        title: "未纳入开售的草稿",
        description: null,
        materialDescription: null,
        careInstructions: null,
        price: 0,
        currency: "CNY",
        targetQuantity: null,
        preorderLimit: null,
        preorderDeadline: null,
        estimatedShipDate: null,
        imageStage: null,
        status: ProjectProductStatus.DRAFT,
        skus: []
      }
    ],
    displayImageUrls: [
      "/uploads/work/11111111-1111-4111-8111-111111111111.jpg",
      "/uploads/work/22222222-2222-4222-8222-222222222222.webp"
    ],
    now
  };
}

function issueCodes(input: ReturnType<typeof validInput>) {
  return new Set(createLimitedPreorderOfferEnvelope(input).issues.map((item) => item.code));
}

const first = createLimitedPreorderOfferEnvelope(validInput());
assert.deepEqual(first.issues, [], JSON.stringify(first.issues));
assert.equal(first.totalProductLimit, 10);
assert.match(first.hash, /^[a-f0-9]{64}$/);
assert.deepEqual(readLimitedPreorderOfferSnapshot(first.snapshot), first.snapshot);
assert.equal(readLimitedPreorderOfferSnapshot(null), null);
assert.equal(readLimitedPreorderOfferSnapshot({ version: "unknown" }), null);
assert.equal(readLimitedPreorderOfferSnapshot({
  version: "V2.3-OFFER-1",
  projectId: "project_1",
  campaignId: "campaign_1",
  workId: "work_1",
  products: [{}]
}), null, "malformed nested snapshot data must not reach the author UI");

assert.throws(() => assertLimitedPreorderOfferEditable(ProjectDesignAuthorizationStatus.PENDING), /不能再修改/);
assert.throws(() => assertLimitedPreorderOfferEditable(ProjectDesignAuthorizationStatus.ACCEPTED), /不能再修改/);
assert.doesNotThrow(() => assertLimitedPreorderOfferEditable(ProjectDesignAuthorizationStatus.REJECTED));
assert.doesNotThrow(() => assertLimitedPreorderOfferEditable(ProjectDesignAuthorizationStatus.REVOKED));
assert.doesNotThrow(() => assertLimitedPreorderOfferEditable(null));

// Product/SKU database return order is canonical, while reviewed display-image
// order is business data because the first image is the consumer-facing cover.
const reordered = validInput();
reordered.products.reverse();
reordered.products[1].skus.reverse();
assert.equal(createLimitedPreorderOfferEnvelope(reordered).hash, first.hash);

const reorderedImages = validInput();
reorderedImages.displayImageUrls.reverse();
assert.notEqual(createLimitedPreorderOfferEnvelope(reorderedImages).hash, first.hash, "changing the reviewed cover image must change the offer hash");

const multipleProducts = validInput();
const productB = multipleProducts.products[0];
productB.preorderLimit = 5;
productB.targetQuantity = 3;
productB.skus[0].capacity = 3;
productB.skus[1].capacity = 2;
const productA = {
  ...productB,
  id: "product_a",
  title: "东方结构上衣",
  skus: productB.skus.map((sku) => ({ ...sku, id: `a_${sku.id}` }))
};
multipleProducts.products = [productB, productA];
const multipleHash = createLimitedPreorderOfferEnvelope(multipleProducts).hash;
multipleProducts.products.reverse();
assert.equal(createLimitedPreorderOfferEnvelope(multipleProducts).hash, multipleHash, "product ordering must be canonical");

for (const status of [ProjectProductStatus.PREORDER_OPEN, ProjectProductStatus.PAUSED, ProjectProductStatus.SOLD_OUT]) {
  const lifecycleStatusOnly = validInput();
  lifecycleStatusOnly.products[0].status = status;
  assert.equal(createLimitedPreorderOfferEnvelope(lifecycleStatusOnly).hash, first.hash, `${status} must remain the same commercial offer`);
}

// Runtime lifecycle fields are intentionally outside the author's commercial offer.
const runtimeOnly = validInput() as ReturnType<typeof validInput> & {
  campaign: ReturnType<typeof validInput>["campaign"] & { preorderStatus: string; preorderPublicNotice: string };
};
runtimeOnly.campaign.preorderStatus = "PAUSED";
runtimeOnly.campaign.preorderPublicNotice = "临时暂停接单";
assert.equal(createLimitedPreorderOfferEnvelope(runtimeOnly).hash, first.hash);

// Product-level deadline is a runtime mirror of the signed campaign deadline,
// not an independently authored commercial term.
const derivedProductDeadline = validInput();
derivedProductDeadline.products[0].preorderDeadline = new Date("2026-08-29T12:34:00.000Z");
assert.equal(createLimitedPreorderOfferEnvelope(derivedProductDeadline).hash, first.hash);

// Disabled and draft-only records are not part of the exact offer shown to the author.
const ignoredDraftChanges = validInput();
ignoredDraftChanges.products[0].skus[2].size = "XXL";
ignoredDraftChanges.products[1].title = "另一个未纳入开售的草稿";
assert.equal(createLimitedPreorderOfferEnvelope(ignoredDraftChanges).hash, first.hash);

// Any commercial term accepted by the author must create a different envelope hash.
for (const [label, mutate] of [
  ["campaign deadline", (input: ReturnType<typeof validInput>) => { input.campaign.preorderDeadline = new Date("2026-08-31T00:00:00.000Z"); }],
  ["terms text", (input: ReturnType<typeof validInput>) => { input.campaign.preorderTermsText += "（修订版）"; }],
  ["project title", (input: ReturnType<typeof validInput>) => { input.projectTitle += "（更新）"; }],
  ["work title", (input: ReturnType<typeof validInput>) => { input.workTitle += "（更新）"; }],
  ["campaign title", (input: ReturnType<typeof validInput>) => { input.campaign.title += "（更新）"; }],
  ["payment instructions", (input: ReturnType<typeof validInput>) => { input.campaign.preorderPaymentInstructions = "不得用于首期试点的付款说明"; }],
  ["product price", (input: ReturnType<typeof validInput>) => { input.products[0].price += 100; }],
  ["product material", (input: ReturnType<typeof validInput>) => { input.products[0].materialDescription = "变更后的面料说明"; }],
  ["product care", (input: ReturnType<typeof validInput>) => { input.products[0].careInstructions = "变更后的护理说明"; }],
  ["product image stage", (input: ReturnType<typeof validInput>) => { input.products[0].imageStage = "RENDER_ONLY"; }],
  ["display image", (input: ReturnType<typeof validInput>) => { input.displayImageUrls[0] = "/uploads/work/33333333-3333-4333-8333-333333333333.png"; }],
  ["ship date", (input: ReturnType<typeof validInput>) => { input.products[0].estimatedShipDate = new Date("2026-10-16T00:00:00.000Z"); }],
  ["SKU capacity", (input: ReturnType<typeof validInput>) => { input.products[0].skus[0].capacity = 5; }]
] as const) {
  const changed = validInput();
  mutate(changed);
  assert.notEqual(createLimitedPreorderOfferEnvelope(changed).hash, first.hash, `${label} must change the offer hash`);
}

const missingMaterial = validInput();
missingMaterial.products[0].materialDescription = " ";
assert(issueCodes(missingMaterial).has("OFFER_PRODUCT_MATERIAL"));

const missingCare = validInput();
missingCare.products[0].careInstructions = null;
assert(issueCodes(missingCare).has("OFFER_PRODUCT_CARE"));

const missingImageStage = validInput();
missingImageStage.products[0].imageStage = null;
assert(issueCodes(missingImageStage).has("OFFER_PRODUCT_IMAGE"));

const missingDisplayImage = validInput();
missingDisplayImage.displayImageUrls = [];
assert(issueCodes(missingDisplayImage).has("OFFER_DISPLAY_IMAGE"));

const mutableExternalImage = validInput();
mutableExternalImage.displayImageUrls = ["https://example.com/mutable-look.jpg"];
assert(issueCodes(mutableExternalImage).has("OFFER_DISPLAY_IMAGE_SOURCE"));

const noEnabledSku = validInput();
noEnabledSku.products[0].skus = noEnabledSku.products[0].skus.map((sku) => ({ ...sku, enabled: false }));
assert(issueCodes(noEnabledSku).has("OFFER_SKU_REQUIRED"));

const incompleteSku = validInput();
incompleteSku.products[0].skus[0].color = " ";
assert(issueCodes(incompleteSku).has("OFFER_SKU_OPTION"));

const paidMode = validInput();
paidMode.campaign.preorderQualificationMode = LimitedPreorderQualificationMode.PAID_ORDER;
paidMode.campaign.preorderPaymentInstructions = "请仅从 RunwayLab 官方订单页进入支付宝官方收银台，支付结果以服务器回调为准。";
assert(!issueCodes(paidMode).has("OFFER_MODE"));
assert(!issueCodes(paidMode).has("OFFER_PAYMENT_INSTRUCTIONS"));

const paymentInstructions = validInput();
paymentInstructions.campaign.preorderPaymentInstructions = "请向个人账户转账并把截图发送给项目负责人";
assert(issueCodes(paymentInstructions).has("OFFER_PAYMENT_INSTRUCTIONS"));

const hiddenPaymentSolicitation = validInput();
hiddenPaymentSolicitation.campaign.preorderTermsText += " 请向项目负责人微信转账定金。";
assert(issueCodes(hiddenPaymentSolicitation).has("OFFER_PAYMENT_SOLICITATION"));

const productPaymentSolicitation = validInput();
productPaymentSolicitation.products[0].description += " 请扫描收款码支付定金。";
assert(issueCodes(productPaymentSolicitation).has("OFFER_PAYMENT_SOLICITATION"));

const projectPaymentSolicitation = validInput();
projectPaymentSolicitation.projectDescription += " 请向个人账户转账。";
assert(issueCodes(projectPaymentSolicitation).has("OFFER_PAYMENT_SOLICITATION"));

const mismatchedLimit = validInput();
mismatchedLimit.campaign.preorderCapacity = 9;
assert(issueCodes(mismatchedLimit).has("OFFER_CAMPAIGN_LIMIT_MISMATCH"));

console.log("limited preorder offer envelope tests: PASS");
