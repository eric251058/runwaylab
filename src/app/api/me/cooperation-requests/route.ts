import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const requests = await prisma.cooperationRequest.findMany({
    where: {
      userId: user.id
    },
    include: {
      work: {
        include: {
          images: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ requests });
}
