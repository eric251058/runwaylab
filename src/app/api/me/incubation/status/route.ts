import { NextResponse } from "next/server";
import { ProposalStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { designerProposalStatuses } from "@/lib/incubation";
import { prisma } from "@/lib/prisma";

type ProposalKind = "presale" | "fabric" | "sample" | "factory" | "buyer";

const kinds = new Set<ProposalKind>(["presale", "fabric", "sample", "factory", "buyer"]);

function isDesignerStatus(value: unknown): value is ProposalStatus {
  return designerProposalStatuses.includes(value as ProposalStatus);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind as ProposalKind;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;

  if (!kinds.has(kind) || !id || !isDesignerStatus(status)) {
    return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  }

  if (kind === "presale") {
    const item = await prisma.presaleIntent.findFirst({
      where: {
        id,
        work: {
          userId: user.id
        }
      },
      select: {
        id: true
      }
    });
    if (!item) return NextResponse.json({ error: "没有权限修改该记录" }, { status: 404 });
    await prisma.presaleIntent.update({ where: { id }, data: { status } });
  }

  if (kind === "fabric") {
    const item = await prisma.fabricProposal.findFirst({
      where: {
        id,
        work: {
          userId: user.id
        }
      },
      select: {
        id: true
      }
    });
    if (!item) return NextResponse.json({ error: "没有权限修改该记录" }, { status: 404 });
    await prisma.fabricProposal.update({ where: { id }, data: { status } });
  }

  if (kind === "sample") {
    const item = await prisma.sampleProposal.findFirst({
      where: {
        id,
        work: {
          userId: user.id
        }
      },
      select: {
        id: true
      }
    });
    if (!item) return NextResponse.json({ error: "没有权限修改该记录" }, { status: 404 });
    await prisma.sampleProposal.update({ where: { id }, data: { status } });
  }

  if (kind === "factory") {
    const item = await prisma.factoryProposal.findFirst({
      where: {
        id,
        work: {
          userId: user.id
        }
      },
      select: {
        id: true
      }
    });
    if (!item) return NextResponse.json({ error: "没有权限修改该记录" }, { status: 404 });
    await prisma.factoryProposal.update({ where: { id }, data: { status } });
  }

  if (kind === "buyer") {
    const item = await prisma.buyerIntent.findFirst({
      where: {
        id,
        work: {
          userId: user.id
        }
      },
      select: {
        id: true
      }
    });
    if (!item) return NextResponse.json({ error: "没有权限修改该记录" }, { status: 404 });
    await prisma.buyerIntent.update({ where: { id }, data: { status } });
  }

  return NextResponse.json({ ok: true });
}
