const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const college = await prisma.college.upsert({
    where: { slug: "examsetu-demo-college" },
    update: { isActive: true },
    create: { name: "ExamSetu Demo College", slug: "examsetu-demo-college" },
  });

  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL.toLowerCase() },
      update: { role: "SUPER_ADMIN", status: "ACTIVE", passwordHash },
      create: {
        name: process.env.SEED_ADMIN_NAME || "ExamSetu Super Admin",
        email: process.env.SEED_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  console.log(`Seeded college: ${college.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
