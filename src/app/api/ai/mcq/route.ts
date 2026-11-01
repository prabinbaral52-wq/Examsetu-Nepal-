import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { generatedMcqListSchema, findDuplicateMcqs, assertGroundedMcq } from "@/lib/mcq";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  bookId: z.string().cuid().optional(),
  sourceText: z.string().trim().min(100).max(100_000),
  questions: generatedMcqListSchema,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["COLLEGE_ADMIN", "TEACHER", "REVIEWER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "AI generation permission required." }, { status: 403 });
  }

  let collegeId: string;
  try {
    collegeId = requireCollegeScope(session);
  } catch {
    return NextResponse.json({ error: "An active college is required." }, { status: 403 });
  }

  const input = requestSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Invalid grounded MCQ payload.", issues: input.error.flatten() }, { status: 400 });
  if (findDuplicateMcqs(input.data.questions).length) {
    return NextResponse.json({ error: "Duplicate questions are not allowed." }, { status: 400 });
  }

  try {
    input.data.questions.forEach(assertGroundedMcq);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCQ grounding validation failed." }, { status: 400 });
  }

  if (input.data.bookId) {
    const book = await prisma.book.findFirst({ where: { id: input.data.bookId, collegeId }, select: { id: true } });
    if (!book) return NextResponse.json({ error: "Book is outside your college scope." }, { status: 404 });
  }

  const job = await prisma.aIGenerationJob.create({
    data: {
      collegeId,
      bookId: input.data.bookId,
      requestedBy: session.user.id,
      status: "COMPLETED",
      input: { sourceLength: input.data.sourceText.length, questionCount: input.data.questions.length },
    },
  });

  await prisma.$transaction(
    input.data.questions.map((question) =>
      prisma.question.create({
        data: {
          collegeId,
          bookId: input.data.bookId,
          authorId: session.user.id,
          text: question.question,
          explanation: question.explanation,
          difficulty: question.difficulty,
          topic: question.topic,
          sourcePage: question.source_page,
          sourceText: question.source_text,
          status: "PENDING_REVIEW",
          options: {
            create: question.options.map((text, position) => ({
              text,
              position,
              isCorrect: position === question.correct_option_index,
            })),
          },
        },
      }),
    ),
  );

  return NextResponse.json({ jobId: job.id, status: job.status, queuedForReview: input.data.questions.length }, { status: 201 });
}
