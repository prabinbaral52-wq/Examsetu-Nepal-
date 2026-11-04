# ExamSetuNepal — Project Instructions

## Product
Build ExamSetuNepal, a multi-tenant AI-powered educational platform for Nepal.

The platform will have four main areas:

1. Public SEO website for educational content and Google AdSense.
2. Student portal for MCQ practice, mock tests, progress tracking, and college-specific content.
3. College portal for college admins/teachers to upload books, generate and review questions, create tests, manage students, and view analytics.
4. Super Admin panel for the platform owner to manage colleges, users, subscriptions, AI credits, payments, content moderation, and platform settings.

## Core rule: strict college isolation
Every student must select one registered and active college during signup.

After selecting a college:
- The student can access only that college’s books, questions, tests, teachers, announcements, and reports.
- The student must never access another college’s private data.
- A student cannot switch college without approval or a verified transfer request.

Every college-specific database table must include `college_id`.
Every API query that accesses college-scoped data must filter by the authenticated user’s `college_id`.
Never rely only on frontend checks for authorization.

## Tech stack
Use this stack:

- Frontend: Next.js 14+ App Router, React, TypeScript, Tailwind CSS
- Backend: Next.js API routes initially; structure code so it can migrate to NestJS later
- Database: PostgreSQL
- ORM: Prisma
- Authentication: Auth.js/NextAuth with email/password, Google login, and phone OTP-ready structure
- Validation: Zod
- File storage: Cloudflare R2, AWS S3, or Supabase Storage using a storage abstraction
- Background jobs: BullMQ or a simple database-backed job queue initially
- AI/RAG: LangChain or LlamaIndex
- Vector database: pgvector initially
- PDF extraction: pdfplumber or PyMuPDF
- DOCX extraction: python-docx
- OCR: Tesseract initially
- Nepal payments: eSewa, Khalti, FonePay-ready structure
- Analytics: Google Analytics 4 and Google Search Console

## Coding standards
- Use TypeScript everywhere.
- Use clean, modular, production-ready code.
- Use reusable UI components.
- Use server components for public SEO pages.
- Use server-side authorization for every protected API route.
- Use Zod for all API request validation.
- Use Prisma migrations for database changes.
- Store secrets in environment variables only.
- Use HTTPS, hashed passwords, rate limiting, CSRF protection, and secure session/JWT handling.
- Write clear loading, empty, error, and success states.
- Make all pages mobile-first and responsive.
- Support Nepali and English language structure from the beginning.
- Add only necessary comments.

## Google AdSense rules
AdSense must appear only on public, original educational content pages.

Allowed pages:
- Blog posts
- Exam guides
- Syllabus pages
- MCQ topic explanation pages
- Past-paper analysis pages
- College directory pages
- Subject notes pages

Do not place AdSense on:
- Login/signup pages
- Student dashboard
- College dashboard
- Test-taking screens
- Result pages
- Admin panel
- Private messages
- Thin, copied, scraped, or non-content pages

Create a reusable `AdSlot` component.
The `AdSlot` component must render only on approved public content pages.
Use responsive ad units and maintain clear spacing from navigation, buttons, and interactive elements.

## MVP scope
Build the MVP first:

1. Public homepage, About, Contact, Privacy Policy, Terms, Cookie Policy, and Blog.
2. Student signup/login with mandatory college selection.
3. College admin/teacher login.
4. Super Admin college management.
5. Book upload.
6. AI MCQ generation from uploaded book/chapter.
7. Teacher review queue for AI-generated MCQs.
8. Student topic-wise MCQ practice.
9. Student result page.
10. Basic college analytics.
11. AdSense-ready public content pages.

Do not build mobile app, live classes, video courses, social feed, or multi-country expansion in the MVP.

## AI MCQ generation requirements
When a college teacher uploads a book:

1. Upload file securely.
2. Extract text from PDF, DOCX, TXT, or scanned PDF using OCR.
3. Detect chapters, headings, sections, and page numbers.
4. Split content into overlapping chunks of approximately 800 words.
5. Create embeddings and store chunks in pgvector.
6. Extract key concepts, definitions, formulas, dates, processes, and comparisons.
7. Generate MCQs only from the uploaded book content.
8. Run duplicate detection.
9. Run quality validation.
10. Save questions with status `PENDING_REVIEW`.
11. Teacher must approve, edit, reject, or delete before publishing.
12. Only approved questions become visible to students.

Each generated MCQ must return strict JSON:

{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correct_option_index": 0,
  "explanation": "string",
  "difficulty": "easy|medium|hard",
  "topic": "string",
  "source_page": 1,
  "source_text": "string"
}

Validation rules:
- Exactly one correct answer.
- Four unique options.
- No duplicate or near-duplicate questions.
- Answer must be supported by source text.
- No copied text from the book.
- Correct grammar and topic tag.
- Valid JSON structure.
- No offensive, irrelevant, or out-of-syllabus content.

## Exam pattern generator requirements
Provide two generation modes:

### Mode A: MCQ Practice Bank
Generate only MCQs from a selected book, chapter, topic, page range, difficulty, and language.

### Mode B: Full Exam Pattern Question Set
Generate a complete exam paper with:

- Exam name
- Total marks
- Duration
- Sections
- Question types
- Marks distribution
- Chapter weightage
- Difficulty mix
- Negative marking
- Internal choice
- Language
- College logo/header
- Answer key
- Model answers
- Marking scheme
- Printable PDF
- Online MCQ test version

Supported question types:
- Single-choice MCQ
- Multiple-select MCQ
- True/False
- Fill in the blank
- Matching
- Assertion-reason
- Statement-based
- Numerical
- Short answer
- Long answer
- Case-based/application
- Diagram-based
- Previous-paper-style

## Database models
Create these Prisma models:

- Country
- Language
- College
- CollegeSetting
- User
- Role
- Permission
- Department
- Program
- Class
- Subject
- Chapter
- Topic
- Book
- BookChunk
- AIGenerationJob
- Question
- QuestionOption
- QuestionTag
- QuestionReview
- QuestionReport
- ExamPattern
- ExamSection
- Exam
- ExamQuestion
- StudentAttempt
- StudentAnswer
- Result
- Bookmark
- WrongAnswerNotebook
- Streak
- Badge
- Leaderboard
- Subscription
- Payment
- AICredit
- Notification
- Announcement
- AuditLog
- BlogPost
- SeoPage
- AdsSetting

## Roles
- SUPER_ADMIN: full platform control
- COLLEGE_ADMIN: full control of one college
- DEPARTMENT_HEAD: department-level content and reports
- TEACHER: upload books, generate/edit questions, create tests
- REVIEWER: approve/reject AI-generated questions
- STUDENT: practice, tests, results, bookmarks
- GUEST: public content only

## UI requirements
- Clean, modern, professional education-platform UI
- Mobile-first responsive design
- Dark/light mode
- Nepali/English language switch
- Fast loading and good Core Web Vitals
- Skeleton loaders
- Empty states
- Error states
- Toast notifications
- Progress bars
- Charts for analytics
- Print-friendly exam paper layout
- PWA-ready structure

## Development approach
Work incrementally.

For every major feature:
1. First provide a short implementation plan.
2. List files to create or modify.
3. Wait for confirmation before implementing large changes.
4. Implement one bounded task at a time.
5. Include validation, authorization, and error handling.
6. Do not break existing functionality.
7. Do not add unnecessary packages.
