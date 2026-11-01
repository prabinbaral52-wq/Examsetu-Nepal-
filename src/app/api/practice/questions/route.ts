import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let collegeId: string;
  try {
    collegeId = requireCollegeScope(session);
  } catch {
    return NextResponse.json({ error: "An active college is required." }, { status: 403 });
  }

  const questions = await prisma.question.findMany({
    where: { collegeId, status: "APPROVED" },
    select: {
      id: true,
      text: true,
      explanation: true,
      difficulty: true,
      topic: true,
      options: { select: { id: true, text: true, position: true }, orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ questions });
}
