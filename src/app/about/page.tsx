import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About ExamSetu Nepal",
  description: "Learn how ExamSetu Nepal helps students and teachers prepare with trusted content.",
};

export default function AboutPage() {
  return (
    <main className="shell">
      <p className="eyebrow">About us</p>
      <h1>Learning tools built for Nepal.</h1>
      <p className="lede">
        ExamSetu connects students, teachers, and colleges through focused practice,
        transparent explanations, and privacy-first learning spaces.
      </p>
    </main>
  );
}
