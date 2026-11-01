export default function HomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">ExamSetu Nepal</p>
      <h1>Practice. Prepare. Pass.</h1>
      <p className="lede">
        A secure, bilingual learning platform for Nepal&apos;s students, teachers, and colleges.
      </p>
      <div className="actions">
        <a className="button primary" href="/register">Join as a student</a>
        <a className="button" href="/exams">Explore exams</a>
      </div>
      <section className="card-grid" aria-label="Platform pillars">
        <article className="card"><strong>Focused practice</strong><span>Topic-wise MCQs and realistic mock exams.</span></article>
        <article className="card"><strong>Trusted content</strong><span>Teacher-reviewed questions grounded in source books.</span></article>
        <article className="card"><strong>College-ready</strong><span>Private spaces for students, teachers, and administrators.</span></article>
      </section>
      <nav className="legal-nav" aria-label="Legal and information">
        <a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/blog">Study guides</a>
      </nav>
    </main>
  );
}
