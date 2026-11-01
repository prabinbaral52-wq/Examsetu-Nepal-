"use client";

import { FormEvent, useEffect, useState } from "react";

type College = { id: string; name: string; slug: string };

export default function RegisterPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/colleges").then(async (response) => {
      if (!response.ok) throw new Error("Unable to load colleges");
      const data = await response.json();
      setColleges(data.colleges);
    }).catch(() => setError("Colleges are temporarily unavailable."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Registration failed.");
    else window.location.href = "/login";
    setLoading(false);
  }

  return (
    <main className="shell narrow">
      <p className="eyebrow">Student registration</p>
      <h1>Choose your learning home.</h1>
      <p className="lede">Your college determines which private books, tests, and reports you can access.</p>
      <form className="form-card" onSubmit={submit}>
        <label>Name<input name="name" required minLength={2} autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        <label>College<select name="collegeId" required defaultValue=""><option value="" disabled>Select an active college</option>{colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label>
        {error && <p className="error">{error}</p>}
        <button className="button primary" disabled={loading || colleges.length === 0}>{loading ? "Creating account..." : "Create account"}</button>
      </form>
      <p className="muted">Already registered? <a href="/login">Sign in</a>.</p>
    </main>
  );
}
