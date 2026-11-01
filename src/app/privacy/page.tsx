import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | ExamSetu Nepal" };

export default function PrivacyPage() {
  return <main className="shell narrow"><p className="eyebrow">Privacy</p><h1>Your learning data stays protected.</h1><p className="lede">We use account, college, practice, and diagnostic data to provide the service. College-scoped records are protected by server-side authorization and are not exposed across colleges.</p></main>;
}
