import {
  ContentStatus,
  FabricStatus,
  ProviderShowcaseStatus,
  RequestStatus,
  ReviewStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;
type DependencySummary = Record<string, number>;
const hardDeletableWorkStatuses: ReviewStatus[] = [ReviewStatus.PENDING, ReviewStatus.REJECTED];
const blockedContentStatuses: ContentStatus[] = [ContentStatus.DELETED, ContentStatus.OFFLINE];
const hardDeletableFabricStatuses: FabricStatus[] = [FabricStatus.INACTIVE, FabricStatus.UNKNOWN];
const restorableFabricStatuses: FabricStatus[] = [FabricStatus.INACTIVE, FabricStatus.ARCHIVED];
const hardDeletableShowcaseStatuses: ProviderShowcaseStatus[] = [
  ProviderShowcaseStatus.DRAFT,
  ProviderShowcaseStatus.REJECTED,
  ProviderShowcaseStatus.PENDING_REVIEW
];
const terminalInquiryStatuses: RequestStatus[] = [RequestStatus.CLOSED, RequestStatus.COMPLETED];
const providerInquiryNextStatuses: RequestStatus[] = [
  RequestStatus.CONTACTED,
  RequestStatus.EVALUATED,
  RequestStatus.QUOTED,
  RequestStatus.CLOSED,
  RequestStatus.COMPLETED
];

export function hasDependencies(summary: DependencySummary) {
  return Object.values(summary).some((count) => count > 0);
}

export function publicDependencySummary(summary: DependencySummary) {
  return Object.fromEntries(Object.entries(summary).filter(([, count]) => count > 0));
}

export function lifecycleConflict(message: string, dependencies: DependencySummary) {
  return {
    ok: false,
    code: "HAS_DEPENDENCIES",
    message,
    dependencies: publicDependencySummary(dependencies)
  };
}

export async function getWorkDeleteDependencies(workId: string, db: DbClient = prisma): Promise<DependencySummary> {
  const [
    comments,
    likes,
    favorites,
    recommendations,
    fabricRecommendations,
    providerProposals,
    inquiries,
    fabricRequests,
    sampleRequests,
    incubationRecommendations,
    incubationApplications,
    workIncubation,
    providerOpportunityInterests,
    presaleIntents,
    presaleCampaigns,
    presaleCampaignIntents,
    projects,
    orders,
    demandIntents,
    batchLinks
  ] = await Promise.all([
    db.comment.count({ where: { workId } }),
    db.like.count({ where: { workId } }),
    db.favorite.count({ where: { workId } }),
    db.teacherRecommendedWork.count({ where: { workId } }),
    db.workFabricRecommendation.count({ where: { workId } }),
    db.providerWorkProposal.count({ where: { workId } }),
    db.cooperationRequest.count({ where: { workId } }),
    db.fabricRequest.count({ where: { workId } }),
    db.sampleRequest.count({ where: { workId } }),
    db.incubationRecommendation.count({ where: { workId } }),
    db.incubationApplication.count({ where: { workId } }),
    db.workIncubation.count({ where: { workId } }),
    db.providerOpportunityInterest.count({ where: { workId } }),
    db.presaleIntent.count({ where: { workId } }),
    db.presaleCampaign.count({ where: { workId } }),
    db.presaleCampaignIntent.count({ where: { workId } }),
    db.collaborationProject.count({ where: { workId } }),
    db.projectOrder.count({ where: { workId } }),
    db.workDemandIntent.count({ where: { workId } }),
    db.incubationBatchWork.count({ where: { workId } })
  ]);

  return {
    comments,
    likes,
    favorites,
    recommendations: recommendations + fabricRecommendations + providerProposals,
    inquiries: inquiries + fabricRequests + sampleRequests,
    incubation: incubationRecommendations + incubationApplications + workIncubation + batchLinks,
    presale: presaleIntents + presaleCampaigns + presaleCampaignIntents,
    projects: projects + orders + demandIntents,
    providerOpportunityInterests
  };
}

export function canHardDeleteWork(work: { reviewStatus: ReviewStatus; contentStatus: ContentStatus }, dependencies: DependencySummary) {
  return (
    hardDeletableWorkStatuses.includes(work.reviewStatus) &&
    !blockedContentStatuses.includes(work.contentStatus) &&
    !hasDependencies(dependencies)
  );
}

export function canOfflineWork(work: { reviewStatus: ReviewStatus; contentStatus: ContentStatus }) {
  return work.reviewStatus === ReviewStatus.APPROVED && work.contentStatus === ContentStatus.VISIBLE;
}

export function canResubmitOfflineWork(work: { reviewStatus: ReviewStatus; contentStatus: ContentStatus }) {
  return work.reviewStatus === ReviewStatus.OFFLINE || work.contentStatus === ContentStatus.OFFLINE;
}

export async function getFabricDeleteDependencies(fabricId: string, db: DbClient = prisma): Promise<DependencySummary> {
  const [recommendations, inquiries, projects] = await Promise.all([
    db.workFabricRecommendation.count({ where: { fabricId } }),
    db.cooperationRequest.count({ where: { fabricId } }),
    db.collaborationProject.count({ where: { fabricId } })
  ]);

  return {
    recommendations,
    inquiries,
    projects
  };
}

export function canHardDeleteFabric(fabric: { status: FabricStatus }, dependencies: DependencySummary) {
  return hardDeletableFabricStatuses.includes(fabric.status) && !hasDependencies(dependencies);
}

export function canOfflineFabric(fabric: { status: FabricStatus }) {
  return fabric.status === FabricStatus.ACTIVE;
}

export function canRestoreFabric(fabric: { status: FabricStatus }) {
  return restorableFabricStatuses.includes(fabric.status);
}

export async function getShowcaseDeleteDependencies(showcaseItemId: string, db: DbClient = prisma): Promise<DependencySummary> {
  const inquiries = await db.cooperationRequest.count({ where: { showcaseItemId } });
  return { inquiries };
}

export function canHardDeleteShowcase(item: { status: ProviderShowcaseStatus }, dependencies: DependencySummary) {
  return hardDeletableShowcaseStatuses.includes(item.status) && !hasDependencies(dependencies);
}

export function canOfflineShowcase(item: { status: ProviderShowcaseStatus }) {
  return item.status === ProviderShowcaseStatus.PUBLISHED;
}

export function canResubmitShowcase(item: { status: ProviderShowcaseStatus }) {
  return item.status === ProviderShowcaseStatus.ARCHIVED;
}

export function isTerminalInquiryStatus(status: RequestStatus) {
  return terminalInquiryStatuses.includes(status);
}

export function canWithdrawInquiry(inquiry: { status: RequestStatus; replies: Array<unknown> }) {
  return inquiry.status === RequestStatus.PENDING && inquiry.replies.length === 0;
}

export function canProviderTransitionInquiry(from: RequestStatus, to: RequestStatus) {
  if (isTerminalInquiryStatus(from)) return false;
  return providerInquiryNextStatuses.includes(to);
}
