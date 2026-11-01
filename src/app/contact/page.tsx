import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact ExamSetu Nepal" };

export default function ContactPage() {
  return <main className="shell narrow"><p className="eyebrow">Contact</p><h1>We are here to help.</h1><p className="lede">For support, college onboarding, or content corrections, email the ExamSetu team through the address published in the deployment environment.</p></main>;
}
