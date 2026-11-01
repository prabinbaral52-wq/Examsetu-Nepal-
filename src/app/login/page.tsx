"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (result?.error) setError("Email or password is incorrect.");
    else window.location.href = "/dashboard";
    setLoading(false);
  }

  return (
    <main className="shell narrow">
      <p className="eyebrow">Welcome back</p>
      <h1>Continue learning.</h1>
      <form className="form-card" onSubmit={submit}>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <p className="error">{error}</p>}
        <button className="button primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      <p className="muted">New to ExamSetu? <a href="/register">Create a student account</a>.</p>
    </main>
  );
}
