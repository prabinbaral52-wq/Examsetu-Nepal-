"use client";

import { useEffect, useState } from "react";

type Question = {
  id: string;
  text: string;
  difficulty: string;
  topic: string;
  options: { id: string; text: string; position: number }[];
};

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/practice/questions")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setQuestions(data.questions);
      })
      .catch((reason: Error) => setError(reason.message || "Unable to load practice questions."));
  }, []);

  if (error) {
    return <main className="shell"><p className="eyebrow">Practice</p><h1>{error}</h1><a className="button primary" href="/login">Sign in</a></main>;
  }

  return (
    <main className="shell">
      <p className="eyebrow">College practice</p>
      <h1>Learn from approved questions.</h1>
      {!questions.length && <p className="lede">No approved questions are available in your college space yet.</p>}
      <section className="question-list">
        {questions.map((question, index) => (
          <article className="question-card" key={question.id}>
            <div className="question-meta">Question {index + 1} · {question.topic} · {question.difficulty}</div>
            <h2>{question.text}</h2>
            <div className="option-list">
              {question.options.map((option) => (
                <label className={`option ${selected[question.id] === option.id ? "selected" : ""}`} key={option.id}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={selected[question.id] === option.id}
                    onChange={() => setSelected((current) => ({ ...current, [question.id]: option.id }))}
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
