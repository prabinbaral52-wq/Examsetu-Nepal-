"use client";

import { useEffect, useState } from "react";

type College = { id: string; name: string; slug: string; isActive?: boolean };

export default function CollegeAdminPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [message, setMessage] = useState("Loading colleges...");

  async function load() {
    const response = await fetch("/api/colleges");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Unable to load colleges.");
    setColleges(data.colleges);
    setMessage(data.colleges.length ? "" : "No active colleges yet.");
  }

  useEffect(() => { void load(); }, []);

  async function createCollege(formData: FormData) {
    const response = await fetch("/api/colleges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const data = await response.json();
    setMessage(response.ok ? "College created." : (data.error ?? "Unable to create college."));
    if (response.ok) void load();
  }

  return (
    <main className="shell narrow">
      <p className="eyebrow">Super admin</p>
      <h1>Manage colleges.</h1>
      <form className="form-card" action={createCollege}>
        <label>Name<input name="name" required /></label>
        <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
        <button className="button primary">Create college</button>
      </form>
      {message && <p className="muted">{message}</p>}
      <section className="question-list">{colleges.map((college) => <article className="card" key={college.id}><strong>{college.name}</strong><span>{college.slug}</span></article>)}</section>
    </main>
  );
}
