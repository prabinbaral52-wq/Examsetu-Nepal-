import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";

export const metadata: Metadata = {
  title: "Nepal Exam Preparation | ExamSetu Nepal",
  description: "Explore structured practice for Lok Sewa, SEE, NEB, Banking, TSC, and entrance exams.",
};

const exams = [
  ["Lok Sewa Aayog", "Civil service general knowledge, constitution, and computer practice."],
  ["SEE and NEB", "Class 10 and +2 subject-wise revision with clear explanations."],
  ["Banking", "Practice Nepal banking, finance, aptitude, and current affairs."],
  ["TSC and Entrance", "Teacher service and university entrance preparation."],
];

export default function ExamsPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Exam preparation</p>
      <h1>Build confidence one topic at a time.</h1>
      <p className="lede">Choose a track, practice with purpose, and learn from every result.</p>
      <div className="card-grid">
        {exams.map(([title, description]) => (
          <article className="card" key={title}>
            <strong>{title}</strong>
            <span>{description}</span>
            <a className="button" href="/practice">Start practice</a>
          </article>
        ))}
      </div>
      <AdSlot approvedPublicPage label="Sponsored educational content" />
    </main>
  );
}
