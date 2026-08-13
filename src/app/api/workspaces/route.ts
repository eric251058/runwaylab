import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PUBLIC")
});

function slugBase(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "workspace";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const items = await prisma.workspace.findMany({
    where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id, status: "ACTIVE" } } }] },
    include: { _count: { select: { members: true, works: true, projects: true } } },
    orderBy: { updatedAt: "desc" }
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录后创建空间。" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "空间名称需要 2–60 个字符。" }, { status: 400 });
  const base = slugBase(parsed.data.name);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({ data: { ownerId: user.id, name: parsed.data.name, description: parsed.data.description || null, visibility: parsed.data.visibility, slug: `${base}-${suffix}` } });
    await tx.workspaceMember.create({ data: { workspaceId: created.id, userId: user.id, role: "OWNER" } });
    return created;
  });
  return NextResponse.json({ workspace, href: `/me/workspaces/${workspace.id}` }, { status: 201 });
}
