import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["COLLEGE_ADMIN", "TEACHER", "REVIEWER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Question review permission required." }, { status: 403 });
  }

  const collegeId = session.user.role === "SUPER_ADMIN" ? null : requireCollegeScope(session);
  const questions = await prisma.question.findMany({
    where: { status: "PENDING_REVIEW", ...(collegeId ? { collegeId } : {}) },
    select: {
      id: true,
      text: true,
      explanation: true,
      difficulty: true,
      topic: true,
      sourcePage: true,
      options: { select: { id: true, text: true, position: true }, orderBy: { position: "asc" } },
      college: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ questions });
}
