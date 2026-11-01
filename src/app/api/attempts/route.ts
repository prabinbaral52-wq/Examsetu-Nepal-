import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const attemptSchema = z.object({
  examId: z.string().cuid(),
  answers: z.array(z.object({
    questionId: z.string().cuid(),
    optionId: z.string().cuid().nullable(),
  })).max(500),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let collegeId: string;
  try { collegeId = requireCollegeScope(session); } catch { return NextResponse.json({ error: "An active college is required." }, { status: 403 }); }

  const parsed = attemptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempt payload.", issues: parsed.error.flatten() }, { status: 400 });

  const exam = await prisma.exam.findFirst({
    where: { id: parsed.data.examId, collegeId },
    select: { id: true, questions: { where: { question: { status: "APPROVED" } }, select: { questionId: true, question: { select: { id: true, options: { select: { id: true, isCorrect: true } } } } } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found in your college scope." }, { status: 404 });

  const allowedQuestions = new Map(exam.questions.map(({ question }) => [question.id, question]));
  const submittedIds = new Set(parsed.data.answers.map((answer) => answer.questionId));
  if ([...submittedIds].some((id) => !allowedQuestions.has(id))) {
    return NextResponse.json({ error: "Attempt contains a question outside the exam." }, { status: 400 });
  }

  const answerRows = [...allowedQuestions.values()].map((question) => {
    const submitted = parsed.data.answers.find((answer) => answer.questionId === question.id);
    const correctOption = question.options.find((option) => option.isCorrect);
    return {
      questionId: question.id,
      optionId: submitted?.optionId ?? null,
      isCorrect: Boolean(submitted?.optionId && submitted.optionId === correctOption?.id),
    };
  });
  const correct = answerRows.filter((answer) => answer.isCorrect).length;
  const skipped = answerRows.filter((answer) => !answer.optionId).length;
  const incorrect = answerRows.length - correct - skipped;
  const total = answerRows.length;
  const percentage = total ? (correct / total) * 100 : 0;

  const attempt = await prisma.$transaction(async (transaction) => {
    const created = await transaction.studentAttempt.create({
      data: {
        userId: session.user.id,
        examId: exam.id,
        score: correct,
        finishedAt: new Date(),
        answers: { create: answerRows },
        result: { create: { score: correct, total, percentage, correct, incorrect, skipped } },
      },
      include: { result: true },
    });
    return created;
  });

  return NextResponse.json({ attemptId: attempt.id, result: attempt.result }, { status: 201 });
}
