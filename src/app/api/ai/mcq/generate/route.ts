import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { mcqProvider } from "@/lib/ai";
import { generatedMcqListSchema } from "@/lib/mcq";
import { requireCollegeScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  sourceText: z.string().trim().min(100).max(100_000),
  count: z.number().int().min(1).max(20).default(5),
  language: z.enum(["en", "ne", "both"]).default("en"),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["COLLEGE_ADMIN", "TEACHER", "REVIEWER", "SUPER_ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "AI generation permission required." }, { status: 403 });
  try { requireCollegeScope(session); } catch { return NextResponse.json({ error: "An active college is required." }, { status: 403 }); }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid generation request.", issues: parsed.error.flatten() }, { status: 400 });
  try {
    const questions = await mcqProvider.generateMcqs(parsed.data);
    const validated = generatedMcqListSchema.safeParse(questions);
    if (!validated.success) return NextResponse.json({ error: "Generated questions failed validation." }, { status: 502 });
    return NextResponse.json({ questions: validated.data, status: "PENDING_REVIEW" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI provider unavailable." }, { status: 503 });
  }
}
