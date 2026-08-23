import assert from "node:assert/strict";
import { FabricStatus, ProviderShowcaseStatus } from "@prisma/client";
import { providerSelfServiceReadiness } from "../src/lib/provider-self-service";

type ReadinessProvider = Parameters<typeof providerSelfServiceReadiness>[0];

function provider(overrides: Partial<ReadinessProvider> = {}): ReadinessProvider {
  return {
    id: "provider-1",
    ownerId: "user-1",
    name: "华格纺织",
    slug: null,
    type: "FABRIC_SUPPLIER",
    logoUrl: "/uploads/logo.jpg",
    coverUrl: null,
    tagline: null,
    city: "杭州",
    address: null,
    province: null,
    country: "China",
    description: "专注女装针织面料和小批量采购服务",
    contactName: "陈经理",
    contactPhone: "13800138000",
    contactEmail: null,
    wechat: null,
    whatsapp: null,
    website: null,
    tags: [],
    specialties: ["面料供应"],
    categories: [],
    materials: [],
    techniques: [],
    serviceRegions: [],
    serviceArea: null,
    responseTime: null,
    isVerified: false,
    isFeatured: false,
    status: "PENDING",
    orderPreference: "FLEXIBLE",
    minimumOrderQuantity: null,
    maximumOrderQuantity: null,
    moqMin: null,
    acceptsSampling: true,
    acceptsSmallBatch: false,
    acceptsLargeOrder: false,
    sampleSupported: true,
    singleSampleSupported: null,
    patternMaking: null,
    minimumOrder: null,
    sampleLeadDays: null,
    productionLeadDays: null,
    leadTime: null,
    priceRange: null,
    monthlyCapacity: null,
    qualityControl: null,
    capacityText: null,
    capacityStatus: "UNKNOWN",
    availabilityStatus: "OPEN",
    supportedCategories: null,
    preferredMaterials: null,
    preferredRegions: null,
    providerDetails: null,
    opportunityVisible: false,
    publicContactEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    fabrics: [],
    showcaseItems: [],
    ...overrides
  } as ReadinessProvider;
}

const missingCatalog = providerSelfServiceReadiness(provider());
assert.equal(missingCatalog.ready, false);
assert.ok(missingCatalog.missing.includes("至少一个带图产品或案例"));

const withImageCatalog = providerSelfServiceReadiness(provider({
  fabrics: [{ status: FabricStatus.INACTIVE, imageUrl: "/uploads/fabric.jpg", imageUrls: [] }] as unknown as ReadinessProvider["fabrics"]
}));
assert.equal(withImageCatalog.ready, true, "a complete private draft with an image should be ready for self-service opening");

const archivedCatalog = providerSelfServiceReadiness(provider({
  showcaseItems: [{ status: ProviderShowcaseStatus.ARCHIVED, coverImageUrl: "/uploads/case.jpg", imageUrls: [] }] as unknown as ReadinessProvider["showcaseItems"]
}));
assert.equal(archivedCatalog.ready, false, "archived content must not satisfy public opening readiness");

console.log("provider self-service rules tests: PASS");
