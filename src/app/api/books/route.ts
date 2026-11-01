import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCollegeScope } from "@/lib/tenant";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const bookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!["COLLEGE_ADMIN", "TEACHER", "SUPER_ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Book upload permission required." }, { status: 403 });

  let collegeId: string;
  try { collegeId = requireCollegeScope(session); } catch { return NextResponse.json({ error: "An active college is required." }, { status: 403 }); }
  const parsed = bookSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid book metadata.", issues: parsed.error.flatten() }, { status: 400 });

  const storageKey = `${collegeId}/books/${crypto.randomUUID()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    const uploadUrl = await storage.createUploadUrl({
      key: storageKey,
      contentType: parsed.data.mimeType,
      size: parsed.data.size,
    });
    const book = await prisma.book.create({
      data: { collegeId, title: parsed.data.title, storageKey, mimeType: parsed.data.mimeType, status: "UPLOADING" },
      select: { id: true, title: true, storageKey: true, status: true },
    });
    return NextResponse.json({ book, uploadUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Storage provider is unavailable." }, { status: 503 });
  }
}
