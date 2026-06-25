import { IncubationStatus, type Work } from "@prisma/client";
import { clsx } from "clsx";

type WorkStatusBadgeProps = {
  kind: "featured" | "editorPick" | "openCoop" | "incubatable" | "challenge" | "ai" | "incubation";
  children?: React.ReactNode;
};

const toneClass: Record<WorkStatusBadgeProps["kind"], string> = {
  featured: "border-ink bg-ink text-white",
  editorPick: "border-accent bg-accent text-ink",
  openCoop: "border-ink/15 bg-white/85 text-ink",
  incubatable: "border-lime-300 bg-lime-100 text-ink",
  challenge: "border-blue-200 bg-blue-50 text-blue-950",
  ai: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950",
  incubation: "border-amber-200 bg-amber-50 text-amber-950"
};

export function WorkStatusBadge({ kind, children }: WorkStatusBadgeProps) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", toneClass[kind])}>
      {children}
    </span>
  );
}

export function getWorkBadges(
  work: Pick<Work, "isFeatured" | "isEditorPick" | "isOpenCoop" | "wantsIncubation" | "isAiAssisted" | "incubationStatus"> & {
    challengeEntries?: unknown[];
  }
) {
  const badges: Array<{ kind: WorkStatusBadgeProps["kind"]; label: string }> = [];

  if (work.isEditorPick) badges.push({ kind: "editorPick", label: "编辑推荐" });
  if (work.isFeatured) badges.push({ kind: "featured", label: "精选" });
  if (work.isOpenCoop) badges.push({ kind: "openCoop", label: "开放合作" });
  if (work.wantsIncubation || work.incubationStatus === IncubationStatus.CANDIDATE) badges.push({ kind: "incubatable", label: "可孵化" });
  if (work.challengeEntries?.length) badges.push({ kind: "challenge", label: "参赛中" });
  if (work.isAiAssisted) badges.push({ kind: "ai", label: "AI 辅助" });

  return badges.slice(0, 4);
}
