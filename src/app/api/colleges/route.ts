import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const colleges = await prisma.college.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ colleges });
}

const collegeSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super-admin permission required." }, { status: 403 });

  const parsed = collegeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid college details.", issues: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.college.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "A college with this slug already exists." }, { status: 409 });

  const college = await prisma.college.create({
    data: parsed.data,
    select: { id: true, name: true, slug: true, isActive: true },
  });
  return NextResponse.json({ college }, { status: 201 });
}
