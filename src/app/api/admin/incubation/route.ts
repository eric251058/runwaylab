import { NextResponse } from "next/server";
import { ProposalStatus, WorkIncubationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { adminProposalStatuses, workIncubationStatuses } from "@/lib/incubation";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type ProposalKind = "presale" | "fabric" | "sample" | "factory" | "buyer";
type Target = "work" | ProposalKind;

const targets = new Set<Target>(["work", "presale", "fabric", "sample", "factory", "buyer"]);

function isWorkStatus(value: unknown): value is WorkIncubationStatus {
  return workIncubationStatuses.includes(value as WorkIncubationStatus);
}

function isProposalStatus(value: unknown): value is ProposalStatus {
  return adminProposalStatuses.includes(value as ProposalStatus);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "没有后台权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const target = body?.target as Target;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;

  if (!targets.has(target) || !id) {
    return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  }

  if (target === "work") {
    if (!isWorkStatus(status)) {
      return NextResponse.json({ error: "作品孵化状态不正确" }, { status: 400 });
    }

    await prisma.workIncubation.upsert({
      where: {
        workId: id
      },
      create: {
        workId: id,
        status
      },
      update: {
        status
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (!isProposalStatus(status)) {
    return NextResponse.json({ error: "方案状态不正确" }, { status: 400 });
  }

  if (target === "presale") {
    await prisma.presaleIntent.update({ where: { id }, data: { status } });
  }
  if (target === "fabric") {
    await prisma.fabricProposal.update({ where: { id }, data: { status } });
  }
  if (target === "sample") {
    await prisma.sampleProposal.update({ where: { id }, data: { status } });
  }
  if (target === "factory") {
    await prisma.factoryProposal.update({ where: { id }, data: { status } });
  }
  if (target === "buyer") {
    await prisma.buyerIntent.update({ where: { id }, data: { status } });
  }

  return NextResponse.json({ ok: true });
}
