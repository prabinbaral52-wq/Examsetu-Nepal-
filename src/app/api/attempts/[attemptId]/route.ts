import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { attemptId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const attempt = await prisma.studentAttempt.findFirst({
    where: { id: params.attemptId, userId: session.user.id },
    select: {
      id: true,
      exam: { select: { id: true, name: true, duration: true } },
      result: true,
      answers: {
        select: {
          questionId: true,
          optionId: true,
          isCorrect: true,
          question: {
            select: {
              text: true,
              explanation: true,
              options: { select: { id: true, text: true, isCorrect: true }, orderBy: { position: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Result not found." }, { status: 404 });
  return NextResponse.json({ attempt });
}
