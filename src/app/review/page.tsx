"use client";

import { useEffect, useState } from "react";

type ReviewQuestion = {
  id: string;
  text: string;
  explanation: string;
  difficulty: string;
  topic: string;
  sourcePage: number | null;
  options: { id: string; text: string; position: number }[];
};

export default function ReviewPage() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [message, setMessage] = useState("Loading review queue...");

  async function loadQueue() {
    const response = await fetch("/api/questions/review-queue");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Unable to load review queue.");
    setQuestions(data.questions);
    setMessage(data.questions.length ? "" : "No questions are waiting for review.");
  }

  useEffect(() => { void loadQueue(); }, []);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/questions/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (response.ok) {
      setQuestions((current) => current.filter((question) => question.id !== id));
      setMessage("Decision saved.");
    } else {
      const data = await response.json();
      setMessage(data.error ?? "Unable to save decision.");
    }
  }

  return (
    <main className="shell">
      <p className="eyebrow">Teacher review queue</p>
      <h1>Review before publishing.</h1>
      {message && <p className="lede">{message}</p>}
      <section className="question-list">
        {questions.map((question) => (
          <article className="question-card" key={question.id}>
            <div className="question-meta">{question.topic} · {question.difficulty}{question.sourcePage ? ` · page ${question.sourcePage}` : ""}</div>
            <h2>{question.text}</h2>
            <ol>{question.options.map((option) => <li key={option.id}>{option.text}</li>)}</ol>
            <p className="muted">{question.explanation}</p>
            <div className="actions">
              <button className="button primary" onClick={() => decide(question.id, "APPROVED")}>Approve</button>
              <button className="button" onClick={() => decide(question.id, "REJECTED")}>Reject</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
