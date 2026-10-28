# ExamSetu Nepal – Interactive Telegram Quiz Bot for Termux

A high-performance, lightweight Telegram Quiz Bot designed to run 24/7 inside Android Termux, synchronizing directly with ExamSetu's SQLite database to deliver native interactive polls, instant explanations, streak tracking, and daily mock test challenges for Nepali competitive exam aspirants.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices**:
> - **Bot Service Core**: Interactive Telegram Quiz Bot serving Lok Sewa, Banking, TSC, SEE, and Entrance exam questions with native Telegram Quiz Polls (`sendPoll`) and callback keyboards.
> - **Integration Pattern**: Direct synchronization with ExamSetu's existing `node:sqlite` database (`data/examsetu.db` and `data/questions.json`) to keep question banks, XP, and user streaks aligned without extra database infrastructure.
>
> **Recommended Defaults**:
> - **Zero-Weight Long-Polling**: Runs via Node.js native HTTPS/fetch long-polling without requiring external webhooks, open ports, or domain setup—ideal for Termux battery efficiency.
> - **Admin Control & Cron Trigger**: Bundles a Termux runner script (`scripts/run-telegram-bot.sh`) with auto-restart loop and an optional Express admin dashboard webhook toggle.

---

## 1. Overview & Core Concept

- **What It Does**: Enables students across Nepal to prepare for Lok Sewa, Banking, and TSC exams directly inside Telegram. The bot sends interactive native Quiz Polls, gives instant answer explanations in Nepali and English, runs timed daily challenge sets, tracks streaks and scores, and provides direct links to the ExamSetu Android app and web portal.
- **Target Audience / Persona**: Nepali job seekers, college graduates, and SEE/NEB students studying on mobile devices, often participating in Telegram study groups and channels.
- **Key Value**: Bridges ExamSetu's question bank into Nepal's most active student communities on Telegram, automated from Termux on a smartphone without needing paid cloud servers.

---

## 2. User Experience & Telegram Interface Flow

```
┌────────────────────────────────────────────────────────┐
│ Telegram User Chat                                     │
│                                                        │
│ 1. User sends /start or /quiz                          │
│    ┌──────────────────────────────────────────────┐    │
│    │ 🇳🇵 Welcome to ExamSetu Quiz Bot!             │    │
│    │ Select your examination target below:        │    │
│    │ [ Lok Sewa ] [ Banking ] [ TSC / Teaching ]  │    │
│    │ [ SEE / NEB ] [ Random Daily 10 ]            │    │
│    └──────────────────────────────────────────────┘    │
│                                                        │
│ 2. Bot sends Native Interactive Quiz Poll:             │
│    ┌──────────────────────────────────────────────┐    │
│    │ ❓ नेपालको संविधान कहिले जारी गरियो?         │    │
│    │ ◯ २०७२ असोज ३ (Correct)                     │    │
│    │ ◯ २०७२ भदौ ३                                 │    │
│    │ ◯ २०७१ असोज ३                                │    │
│    │ ◯ २०७२ असोज २८                              │    │
│    └──────────────────────────────────────────────┘    │
│                                                        │
│ 3. On Answer:                                          │
│    - Instant celebratory confetti / haptic in Telegram │
│    - Detailed Nepali/English explanation pop-up       │
│    - XP streak point added to user profile             │
│    - Inline buttons: [ Next Question ➡️ ] [ 📊 Stats ] │
└────────────────────────────────────────────────────────┘
```

- **Interactive Commands**:
  - `/start`: Onboarding message with inline category keyboard and language toggle.
  - `/quiz [category]`: Generates an instant 4-option native quiz poll.
  - `/daily`: Launches the Daily 10 Challenge for current affairs and Lok Sewa GK.
  - `/stats`: Displays current streak, total questions attempted, accuracy rate, and ExamSetu leaderboard rank.
  - `/link`: Generates a code to link Telegram progress with the ExamSetu web/app account.
- **Group Mode Support**: When added to Telegram study channels or groups, administrators can trigger `/groupquiz` where members compete simultaneously on public leaderboards.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Telegram `sendPoll` vs. Custom Inline Buttons**
  - *Chosen Approach*: Native Telegram Quiz Polls (`type: "quiz"`, `is_anonymous: false`).
  - *Why*: Native Telegram quiz polls display built-in celebratory animations, prevent changing answers once locked in, work flawlessly on poor 3G/4G connections, and provide native answer explanation balloons (`explanation` parameter).
  - *Alternatives Considered*: Pure text with inline buttons. Rejected because it looks cluttered in group chats and lacks native Telegram quiz mechanics.

- **Decision 2: Long-Polling vs. Webhook Architecture**
  - *Chosen Approach*: Lightweight HTTPS Long-Polling (`getUpdates`) with exponential backoff.
  - *Why*: Termux runs on a local mobile network behind carrier-grade NAT (CGNAT) without a public IP or SSL certificate. Long-polling requires zero open ports, zero port-forwarding, and zero domain configuration.
  - *Alternatives Considered*: Webhook via ngrok or Cloudflare tunnel. More complex to keep running continuously when mobile IP addresses cycle.

- **Decision 3: Termux Process Reliability & Background Persistence**
  - *Chosen Approach*: Self-healing Bash wrapper script with PID monitoring (`termux-wake-lock` integration and auto-restart loop) replacing faulty crontab edits.
  - *Why*: Resolves the user's observed Termux crontab error while ensuring Android battery management does not freeze the bot when the screen turns off.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TERMUX ON ANDROID RUNTIME                           │
│                                                                         │
│  ┌───────────────────────┐             ┌─────────────────────────────┐  │
│  │ Termux Wake-Lock      │             │  Telegram Bot Script        │  │
│  │ (Prevents OS sleep)   │────────────▶│  (bot/telegram-bot.js)      │  │
│  └───────────────────────┘             └──────────────┬──────────────┘  │
│                                                       │                 │
│              ┌────────────────────────────────────────┼──────────────┐  │
│              │ Queries questions                      │ Saves XP     │  │
│              ▼                                        ▼ & stats      │  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                ExamSetu SQLite Database (node:sqlite)              │  │
│  │                                                                   │  │
│  │  - questions (id, category, question, options, answer, expl)      │  │
│  │  - telegram_users (telegram_id, username, score, streak, xp)      │  │
│  │  - quiz_history (user_id, question_id, is_correct, answered_at)   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                       ▲                 │
│                                                       │                 │
│  ┌────────────────────────┐            ┌──────────────┴──────────────┐  │
│  │ ExamSetu Express Web   │◀───────────│  Shared Model & DB Layer    │  │
│  │ (server.js / port 3000)│            │  (models/db.js)             │  │
│  └────────────────────────┘            └─────────────────────────────┘  │
└───────────────────────────────────────────────────────▲─────────────────┘
                                                        │
                                    HTTPS Long-Polling  │
                                                        ▼
                                         ┌─────────────────────────────┐
                                         │ Telegram Bot API Servers    │
                                         │ (api.telegram.org)          │
                                         └─────────────────────────────┘
```

- **Telegram Bot Engine**:
  - Standalone CommonJS module compatible with Node.js 26.3.1 (`bot/telegram-bot.js`).
  - Uses native Node.js `fetch` or lightweight HTTPS client to interact with Telegram Bot API without bulky third-party bloat.
  - Features graceful shutdown (`SIGINT`, `SIGTERM`) to release locks and clean up resources cleanly.
- **Database Schema Extensions**:
  - `telegram_users`: Tracks `telegram_id`, `chat_id`, `first_name`, `username`, `streak`, `xp`, `last_active`.
  - `telegram_attempts`: Logs questions answered, success rate, and active category preferences.
- **Admin & Management**:
  - Integration with ExamSetu Express dashboard to view Telegram bot status, active users, and total quizzes served.
  - `.env.example` entry for `TELEGRAM_BOT_TOKEN`.
