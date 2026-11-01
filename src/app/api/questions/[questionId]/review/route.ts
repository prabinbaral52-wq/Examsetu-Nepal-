import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { questionId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["COLLEGE_ADMIN", "TEACHER", "REVIEWER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Question review permission required." }, { status: 403 });
  }

  let collegeId: string;
  try {
    collegeId = requireCollegeScope(session);
  } catch {
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "An active college is required." }, { status: 403 });
    }
    collegeId = "";
  }

  const input = reviewSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });

  const question = await prisma.question.findFirst({
    where: {
      id: params.questionId,
      ...(collegeId ? { collegeId } : {}),
      status: "PENDING_REVIEW",
    },
    select: { id: true, collegeId: true },
  });
  if (!question) return NextResponse.json({ error: "Question not found in your college scope." }, { status: 404 });

  const result = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.question.update({
      where: { id: question.id },
      data: { status: input.data.decision },
      select: { id: true, status: true },
    });
    await transaction.questionReview.create({
      data: {
        questionId: question.id,
        reviewerId: session.user.id,
        decision: input.data.decision,
        notes: input.data.notes,
      },
    });
    return updated;
  });

  return NextResponse.json({ question: result });
}
