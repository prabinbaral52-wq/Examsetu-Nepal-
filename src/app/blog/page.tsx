import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";

export const metadata: Metadata = {
  title: "Exam Guides and Study Notes | ExamSetu Nepal",
  description: "Original exam guides, study strategies, and topic explanations for Nepali learners.",
};

export default function BlogPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Study guides</p>
      <h1>Useful explanations, not copied notes.</h1>
      <p className="lede">
        Our public guides explain difficult topics, exam patterns, and study methods in
        clear English with a Nepali-language foundation.
      </p>
      <section className="card-grid" aria-label="Featured guides">
        <article className="card">
          <strong>How to build a daily revision habit</strong>
          <span>Use short, repeatable sessions and review mistakes before adding new topics.</span>
        </article>
        <article className="card">
          <strong>How to read a mock-test result</strong>
          <span>Separate knowledge gaps, careless errors, and time-management problems.</span>
        </article>
      </section>
      <AdSlot approvedPublicPage />
    </main>
  );
}
