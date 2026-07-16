import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { isPublicQualityWork } from "@/lib/works/rules";

type SubmissionKind = "presale" | "fabric" | "sample" | "factory" | "buyer";

const kinds = new Set<SubmissionKind>(["presale", "fabric", "sample", "factory", "buyer"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function required(value: unknown, label: string) {
  const normalized = text(value);
  if (!normalized) {
    throw new Error(`${label}不能为空`);
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(`incubation-submit:ip:${getClientIp(request)}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
    if (limit.limited) return tooManyRequests("提交较频繁，请稍后再试。", limit.retryAfter);

    const body = await request.json();
    const kind = text(body.kind) as SubmissionKind;
    const workId = required(body.workId, "作品");

    if (!kinds.has(kind)) {
      return NextResponse.json({ error: "提交类型不正确" }, { status: 400 });
    }

    const work = await prisma.work.findFirst({
      where: {
        id: workId
      },
      select: {
        id: true,
        title: true,
        description: true,
        reviewStatus: true,
        contentStatus: true,
        images: {
          select: {
            imageUrl: true
          }
        }
      }
    });

    if (!work || !isPublicQualityWork(work)) {
      return NextResponse.json({ error: "作品不存在或暂不可提交" }, { status: 404 });
    }

    if (kind === "presale") {
      const intent = await prisma.presaleIntent.create({
        data: {
          workId,
          name: required(body.name, "姓名"),
          contact: required(body.contact, "联系方式"),
          size: text(body.size) || null,
          color: text(body.color) || null,
          quantity: text(body.quantity) || null,
          acceptablePrice: text(body.acceptablePrice) || null,
          message: text(body.message) || null
        },
        select: {
          id: true
        }
      });
      return NextResponse.json({ ok: true, id: intent.id });
    }

    if (kind === "fabric") {
      const proposal = await prisma.fabricProposal.create({
        data: {
          workId,
          proposerName: required(body.proposerName, "提交人"),
          companyName: text(body.companyName) || null,
          contact: required(body.contact, "联系方式"),
          fabricName: required(body.fabricName, "面料名称"),
          composition: text(body.composition) || null,
          weight: text(body.weight) || null,
          width: text(body.width) || null,
          priceRange: text(body.priceRange) || null,
          reason: text(body.reason) || null,
          imageUrl: text(body.imageUrl) || null
        },
        select: {
          id: true
        }
      });
      return NextResponse.json({ ok: true, id: proposal.id });
    }

    if (kind === "sample") {
      const proposal = await prisma.sampleProposal.create({
        data: {
          workId,
          proposerName: required(body.proposerName, "提交人"),
          studioName: text(body.studioName) || null,
          contact: required(body.contact, "联系方式"),
          serviceType: text(body.serviceType) || null,
          category: text(body.category) || null,
          leadTime: text(body.leadTime) || null,
          priceRange: text(body.priceRange) || null,
          message: text(body.message) || null
        },
        select: {
          id: true
        }
      });
      return NextResponse.json({ ok: true, id: proposal.id });
    }

    if (kind === "factory") {
      const proposal = await prisma.factoryProposal.create({
        data: {
          workId,
          proposerName: required(body.proposerName, "提交人"),
          factoryName: text(body.factoryName) || null,
          contact: required(body.contact, "联系方式"),
          category: text(body.category) || null,
          moq: text(body.moq) || null,
          leadTime: text(body.leadTime) || null,
          unitPriceRange: text(body.unitPriceRange) || null,
          message: text(body.message) || null
        },
        select: {
          id: true
        }
      });
      return NextResponse.json({ ok: true, id: proposal.id });
    }

    const intent = await prisma.buyerIntent.create({
      data: {
        workId,
        buyerName: required(body.buyerName, "采购人"),
        companyName: text(body.companyName) || null,
        contact: required(body.contact, "联系方式"),
        channelType: text(body.channelType) || null,
        quantity: text(body.quantity) || null,
        targetPrice: text(body.targetPrice) || null,
        cooperationType: text(body.cooperationType) || null,
        message: text(body.message) || null
      },
      select: {
        id: true
      }
    });
    return NextResponse.json({ ok: true, id: intent.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
