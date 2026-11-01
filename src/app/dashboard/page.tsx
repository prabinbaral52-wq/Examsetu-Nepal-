import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <main className="shell">
      <p className="eyebrow">Student dashboard</p>
      <h1>Keep your momentum, {session.user.name ?? "student"}.</h1>
      <p className="lede">Your private learning space is scoped to your selected college.</p>
      <section className="card-grid">
        <article className="card"><strong>Practice</strong><span>Start a topic-wise session from approved questions.</span><a className="button" href="/exams">Browse exams</a></article>
        <article className="card"><strong>Progress</strong><span>Results, streaks, and weak-topic insights will appear here.</span></article>
        <article className="card"><strong>College space</strong><span>College ID: {session.user.collegeId ?? "not assigned"}</span></article>
      </section>
    </main>
  );
}
