import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  collegeId: z.string().cuid(),
});

export async function POST(request: Request) {
  const input = registrationSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json(
      { error: "Invalid registration details.", issues: input.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password, collegeId } = input.data;
  const college = await prisma.college.findFirst({
    where: { id: collegeId, isActive: true },
    select: { id: true },
  });

  if (!college) {
    return NextResponse.json({ error: "Select an active college." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 12),
      collegeId: college.id,
      role: "STUDENT",
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true, collegeId: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
