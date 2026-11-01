import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const sectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  questionType: z.string().trim().min(1).max(50),
  questionCount: z.number().int().positive().max(200),
  marksEach: z.number().positive().max(100),
  internalChoice: z.boolean().default(false),
});

const patternSchema = z.object({
  name: z.string().trim().min(1).max(150),
  language: z.enum(["en", "ne", "both"]).default("en"),
  durationMinutes: z.number().int().positive().max(600),
  totalMarks: z.number().positive().max(1000),
  negativeMarking: z.number().min(0).max(100).default(0),
  sections: z.array(sectionSchema).min(1).max(20),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let collegeId: string;
  try { collegeId = requireCollegeScope(session); } catch { return NextResponse.json({ error: "An active college is required." }, { status: 403 }); }

  const patterns = await prisma.examPattern.findMany({
    where: { collegeId },
    include: { sections: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ patterns });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["COLLEGE_ADMIN", "TEACHER", "SUPER_ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Exam authoring permission required." }, { status: 403 });

  let collegeId: string;
  try { collegeId = requireCollegeScope(session); } catch { return NextResponse.json({ error: "An active college is required." }, { status: 403 }); }
  const parsed = patternSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid exam pattern.", issues: parsed.error.flatten() }, { status: 400 });

  const calculatedMarks = parsed.data.sections.reduce((sum, section) => sum + section.questionCount * section.marksEach, 0);
  if (calculatedMarks !== parsed.data.totalMarks) {
    return NextResponse.json({ error: `Section marks total ${calculatedMarks}, but totalMarks is ${parsed.data.totalMarks}.` }, { status: 400 });
  }

  const pattern = await prisma.examPattern.create({
    data: {
      collegeId,
      name: parsed.data.name,
      language: parsed.data.language,
      durationMinutes: parsed.data.durationMinutes,
      totalMarks: parsed.data.totalMarks,
      negativeMarking: parsed.data.negativeMarking,
      sections: { create: parsed.data.sections },
    },
    include: { sections: true },
  });
  return NextResponse.json({ pattern }, { status: 201 });
}
