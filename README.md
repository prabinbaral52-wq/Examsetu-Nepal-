# 🇳🇵 ExamSetu Nepal (अभ्यास गर्नुहोस्। तयारी गर्नुहोस्। सफल हुनुहोस्।)
> **Practice. Prepare. Pass.**

ExamSetu Nepal is a complete, production-ready full-stack online MCQ examination platform created for Nepali students and career aspirants. It enables comprehensive preparation for **Lok Sewa Aayog (Civil Service), SEE (Class 10), NEB (+2 Board), Banking (NRB, RBB, ADBL), TSC (Teachers Service Commission), and University Entrance Exams**.

---

## 🌟 Key Features

1. **Realistic Timed Exam Engine**
2. **Instant Score & Comprehensive Review**
3. **User Dashboard & Bookmarks**
4. **Comprehensive Admin Portal**
5. **SEO & Google AdSense Readiness**
6. **Mobile-First & Fast**
7. **Guru AI** (Gemini-backed)
8. **Daily Challenge** — Special quiz every day with XP rewards
9. **Leaderboard** — Compete with other students

---

## 🗄️ Tech Stack

- **Frontend**: Semantic HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js + Express 5
- **Database**: SQLite
- **Security**: bcryptjs + secure sessions

---

## 🚀 Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000`  
Health check: `http://localhost:3000/health`

---

## 📝 Import Questions

Sample files ready for Admin import:
- `data/sample-questions-loksewa.json`
- `data/sample-questions-expanded.json`

---

## 🔢 New API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/leaderboard` | Top users by XP |
| `GET /api/daily-challenge` | Today's challenge questions (auth required) |
| `POST /api/daily-challenge/submit` | Submit daily challenge answers |
| `GET /health` | Server health check |

---

## 📋 Feature Checklist

- [x] Timed exam engine + review
- [x] Admin portal + bulk import
- [x] Secure sessions in production
- [x] Health check
- [x] Sample question banks
- [x] Daily Challenge API
- [x] Leaderboard API
- [ ] Full progress analytics dashboard
- [ ] Mobile test UI polish
- [ ] 500+ questions

---

## 🚀 Roadmap

### Next
- Complete progress analytics (weak topics)
- Frontend for Daily Challenge and Leaderboard
- Expand question bank further

### Later
- PWA / offline mode
- Full Android polish
- Advanced Guru AI
