"use server";

import { revalidatePath } from "next/cache";
import {
  FabricStatus,
  OpportunityStage,
  ProviderCapacityStatus,
  ProviderOrderPreference,
  SampleStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { optionalText } from "@/lib/provider-market";

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function positiveInt(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function positiveDecimal(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T) {
  const text = optionalText(value);
  return text && allowed.includes(text as T) ? (text as T) : fallback;
}

export async function saveAdminOpportunityProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");

  const workId = optionalText(formData.get("workId"));
  if (!workId) throw new Error("作品 ID 不能为空");

  await prisma.workOpportunityProfile.upsert({
    where: { workId },
    create: {
      workId,
      stage: enumValue(formData.get("stage"), Object.values(OpportunityStage), OpportunityStage.DISPLAY_ONLY),
      targetQuantity: positiveInt(formData.get("targetQuantity")),
      targetUnitCost: positiveDecimal(formData.get("targetUnitCost")),
      targetRetailPrice: positiveDecimal(formData.get("targetRetailPrice")),
      sampleBudget: positiveDecimal(formData.get("sampleBudget")),
      sampleStatus: enumValue(formData.get("sampleStatus"), Object.values(SampleStatus), SampleStatus.NOT_STARTED),
      fabricStatus: enumValue(formData.get("fabricStatus"), [FabricStatus.UNKNOWN, FabricStatus.RECOMMENDED, FabricStatus.SELECTED, FabricStatus.CONFIRMED], FabricStatus.UNKNOWN),
      targetLaunchDate: optionalDate(formData.get("targetLaunchDate")),
      targetDeliveryDate: optionalDate(formData.get("targetDeliveryDate")),
      expectedFabricMeters: positiveDecimal(formData.get("expectedFabricMeters")),
      expectedReorder: boolValue(formData, "expectedReorder"),
      buyerInterestCount: positiveInt(formData.get("buyerInterestCount")) ?? 0,
      confirmedBuyerQuantity: positiveInt(formData.get("confirmedBuyerQuantity")) ?? 0,
      adminApproved: boolValue(formData, "adminApproved"),
      adminNote: optionalText(formData.get("adminNote")),
      designerNote: optionalText(formData.get("designerNote"))
    },
    update: {
      stage: enumValue(formData.get("stage"), Object.values(OpportunityStage), OpportunityStage.DISPLAY_ONLY),
      targetQuantity: positiveInt(formData.get("targetQuantity")),
      targetUnitCost: positiveDecimal(formData.get("targetUnitCost")),
      targetRetailPrice: positiveDecimal(formData.get("targetRetailPrice")),
      sampleBudget: positiveDecimal(formData.get("sampleBudget")),
      sampleStatus: enumValue(formData.get("sampleStatus"), Object.values(SampleStatus), SampleStatus.NOT_STARTED),
      fabricStatus: enumValue(formData.get("fabricStatus"), [FabricStatus.UNKNOWN, FabricStatus.RECOMMENDED, FabricStatus.SELECTED, FabricStatus.CONFIRMED], FabricStatus.UNKNOWN),
      targetLaunchDate: optionalDate(formData.get("targetLaunchDate")),
      targetDeliveryDate: optionalDate(formData.get("targetDeliveryDate")),
      expectedFabricMeters: positiveDecimal(formData.get("expectedFabricMeters")),
      expectedReorder: boolValue(formData, "expectedReorder"),
      buyerInterestCount: positiveInt(formData.get("buyerInterestCount")) ?? 0,
      confirmedBuyerQuantity: positiveInt(formData.get("confirmedBuyerQuantity")) ?? 0,
      adminApproved: boolValue(formData, "adminApproved"),
      adminNote: optionalText(formData.get("adminNote")),
      designerNote: optionalText(formData.get("designerNote"))
    }
  });

  revalidatePath("/admin/opportunities");
  revalidatePath(`/works/${workId}`);
}

export async function saveProviderCapability(formData: FormData) {
  const user = await getCurrentUser();
  const provider = await getProviderForUser(user);
  if (!user || !provider) throw new Error("请先完成服务商入驻和资料审核");

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      orderPreference: enumValue(formData.get("orderPreference"), Object.values(ProviderOrderPreference), ProviderOrderPreference.FLEXIBLE),
      minimumOrderQuantity: positiveInt(formData.get("minimumOrderQuantity")),
      maximumOrderQuantity: positiveInt(formData.get("maximumOrderQuantity")),
      acceptsSampling: boolValue(formData, "acceptsSampling"),
      acceptsSmallBatch: boolValue(formData, "acceptsSmallBatch"),
      acceptsLargeOrder: boolValue(formData, "acceptsLargeOrder"),
      sampleLeadDays: positiveInt(formData.get("sampleLeadDays")),
      productionLeadDays: positiveInt(formData.get("productionLeadDays")),
      capacityStatus: enumValue(formData.get("capacityStatus"), Object.values(ProviderCapacityStatus), ProviderCapacityStatus.UNKNOWN),
      supportedCategories: optionalText(formData.get("supportedCategories")),
      preferredMaterials: optionalText(formData.get("preferredMaterials")),
      preferredRegions: optionalText(formData.get("preferredRegions"))
    }
  });

  revalidatePath("/me/provider-profile");
  revalidatePath("/providers/opportunities");
}
