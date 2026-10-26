# 🇳🇵 ExamSetu Nepal (अभ्यास गर्नुहोस्। तयारी गर्नुहोस्। सफल हुनुहोस्।)
> **Practice. Prepare. Pass.**

ExamSetu Nepal is a complete, production-ready full-stack online MCQ examination platform created for Nepali students and career aspirants. It enables comprehensive preparation for **Lok Sewa Aayog (Civil Service), SEE (Class 10), NEB (+2 Board), Banking (NRB, RBB, ADBL), TSC (Teachers Service Commission), and University Entrance Exams**.

---

## 🌟 Key Features

1. **Realistic Timed Exam Engine**:
   - Single-question display with A, B, C, D choices.
   - Live timer countdown with auto-submit when time expires.
   - Interactive question palette (answered, unattempted, flagged).
   - Instant option selection, "Mark for Review", and "Clear Answer".
   - LocalStorage backup to prevent loss on accidental reloads.

2. **Instant Score & Comprehensive Review**:
   - Percentage score, total attempted, correct, wrong, skipped, and time taken.
   - Question-by-question review showing correct answer, your choice, and detailed explanations citing Nepali laws, articles, and formulas.
   - Filter review by Correct, Incorrect, or Skipped.

3. **User Dashboard & Bookmarks**:
   - Student profile and progress statistics (tests taken, average score, best score).
   - Test attempt history with direct review links.
   - Saved bookmarks for focused revision.

4. **Comprehensive Admin Portal**:
   - Admin-only access gate (`admin@examsetu.com` / `admin123`).
   - Add, edit, and delete questions with options, answers, and explanations.
   - Bulk question import from JSON.
   - Candidate test attempt audit log.
   - Registered users directory.

5. **SEO & Google AdSense Readiness**:
   - Semantic HTML5 markup and accessible ARIA attributes.
   - OpenGraph metadata, canonical tags, `sitemap.xml`, and `robots.txt`.
   - Distinct, non-intrusive AdSense responsive container placeholders.
   - Full legal pages: About Us, Contact Us, Privacy Policy, Terms & Conditions, and Official Practice Disclaimer.

6. **Mobile-First & Fast**:
   - Responsive design tailored for Android smartphones, tablets, and desktop computers.
   - Dark mode toggle with persisted preference.

---

## 🗄️ Tech Stack

- **Frontend**: Semantic HTML5, CSS3 with CSS variables & responsive grid, Vanilla ES6+ JavaScript.
- **Backend**: Node.js, Express 5.
- **Database**: SQLite with prepared statements.
- **Security**: `bcryptjs` password hashing, `express-session` with secure cookies, SQL injection protection, XSS escaping.

---

## 🚀 Quick Start Guide

### 1. Installation
Clone or navigate to the project directory:
```bash
npm install
```

### 2. Run Locally
```bash
npm start
```

Then open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 Pre-Configured Demo Accounts

For immediate evaluation without manual sign-up, the login screen provides 1-click autofill for both accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@examsetu.com` | `admin123` |
| **Student** | `student@examsetu.com` | `student123` |

---

## 📝 How to Add / Import Questions

### Option A: Via Admin Web Interface
1. Log in as `admin@examsetu.com`.
2. Go to **Admin Portal** (`/admin`).
3. Click the **Manage Questions** tab to use the GUI question builder.
4. Or click **Import Questions** and paste a JSON array of questions.

### Option B: Sample JSON Format for Import
```json
[
  {
    "exam": "Lok Sewa",
    "subject": "General Knowledge",
    "topic": "Nepal Constitution",
    "difficulty": "easy",
    "question": "According to the Constitution of Nepal (2072), how many fundamental rights are guaranteed?",
    "options": {
      "A": "25",
      "B": "31",
      "C": "35",
      "D": "21"
    },
    "correct_answer": "B",
    "explanation": "Part 3 (Articles 16 to 46) of the Constitution of Nepal 2072 guarantees 31 fundamental rights."
  }
]
```

---

## 🌐 Deployment Guide

### Deploying to Render
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) and create a **New Web Service**.
3. Select your repository.
4. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables in the Render dashboard:
   - `SESSION_SECRET`: `your-random-strong-secret-key`
   - `NODE_ENV`: `production`
6. Click **Deploy Web Service**.

### Deploying to Railway
1. Go to [Railway.app](https://railway.app) and create a **New Project from GitHub Repo**.
2. Railway detects Node.js automatically.
3. In Variables, set `SESSION_SECRET` and `PORT=3000`.
4. Railway will build and deploy the app with an HTTPS URL.

### Deploying to VPS (Ubuntu / Nginx / PM2)
```bash
git clone <repo-url>
cd examsetu-nepal
npm install --production
npm install -g pm2
pm2 start server.js --name "examsetu"
pm2 startup
pm2 save
```
Configure Nginx reverse proxy to forward port 80/443 to `http://127.0.0.1:3000`.

---

## 📋 Feature Verification Checklist

- [x] Home page with tagline (English & Nepali) and stats counter
- [x] All 6 exam category cards (Lok Sewa, SEE, NEB, Banking, TSC, Entrance)
- [x] Subject practice set selection with duration, question count, and marks
- [x] Interactive test engine with live countdown timer and auto-submit
- [x] Navigation: Previous, Next, Clear Answer, Mark for Review, and Palette
- [x] Full Result page with percentage, pass/fail status, metrics, and explanations
- [x] User Registration, Login, Logout, and Session Authentication
- [x] User Dashboard with test history and saved bookmarks
- [x] Admin Portal with Statistics, Question Manager, Bulk JSON Import, and Attempts Audit
- [x] 35 original sample MCQs (Lok Sewa GK, Lok Sewa IT, SEE Science, SEE Math, Banking, TSC)
- [x] Legal pages: About Us, Contact Us, Privacy Policy, Terms & Conditions, Disclaimer
- [x] Google AdSense-ready responsive placeholder ad slots
- [x] Dark/Light mode theme switch with local storage persistence
- [x] Mobile-first responsive layout (smartphones, tablets, and desktops)
