# ExamSetu Nepal - AI & Copilot Developer Instructions

ExamSetu Nepal is a full-stack MCQ practice platform designed for students preparing for Lok Sewa Aayog, SEE, NEB, Banking, and TSC examinations in Nepal.

## Architecture Guidelines
- **Backend**: Node.js with Express. Session authentication via `express-session` with bcrypt password hashing.
- **Database**: SQLite using parameterized prepared statements via `models/db.js`. Always sanitize and prepare queries to prevent SQL injection.
- **Frontend**: Semantic HTML5, modern CSS3 with custom properties, and vanilla ES6+ JavaScript. No unnecessary frontend framework bloat.
- **Testing Engine**: One question at a time with instant visual feedback, timer countdown with auto-submit, question palette navigation, and local storage state persistence.
- **Academic Standard**: Questions must adhere strictly to official syllabi of Nepal's Public Service Commission (Lok Sewa), National Examination Board (NEB), and SEE specifications.
- **Compliance & Disclaimer**: All user-facing exam materials must include clear educational disclaimers stating that ExamSetu is an independent educational platform.
