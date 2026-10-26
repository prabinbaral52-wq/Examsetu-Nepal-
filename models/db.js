const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;
let useNodeSqlite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  let dbRelative = './data/examsetu.db';
  if (process.env.DATABASE_URL) {
    dbRelative = process.env.DATABASE_URL.replace(/^file:/, '').trim();
  }
  const dbPath = path.isAbsolute(dbRelative) ? dbRelative : path.join(__dirname, '..', dbRelative);
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new DatabaseSync(dbPath);
  useNodeSqlite = true;
  console.log('[DB] Initialized SQLite via node:sqlite at', dbPath);
} catch (err) {
  console.warn('[DB] node:sqlite error, falling back:', err.message);
}

// Initialize tables and seed initial data
function initDB() {
  if (!useNodeSqlite || !db) {
    throw new Error('Database initialization failed');
  }

  // 1. Countries table (multi-country architecture: Nepal, India, Bangladesh, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      currency TEXT DEFAULT 'NPR',
      flag_emoji TEXT DEFAULT '🇳🇵',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      current_streak INTEGER DEFAULT 1,
      last_activity_date TEXT,
      total_xp INTEGER DEFAULT 50,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      nepali_title TEXT,
      icon TEXT,
      badge TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(country_id) REFERENCES countries(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      FOREIGN KEY(exam_id) REFERENCES exams(id)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS practice_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 20,
      total_marks INTEGER DEFAULT 20,
      pass_percentage INTEGER DEFAULT 40,
      difficulty TEXT DEFAULT 'medium',
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_id INTEGER DEFAULT 1,
      exam_id INTEGER,
      subject_id INTEGER,
      topic_id INTEGER,
      exam_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      topic TEXT,
      difficulty TEXT DEFAULT 'medium',
      language TEXT DEFAULT 'both',
      question TEXT NOT NULL,
      question_text_np TEXT,
      question_text_en TEXT,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      option_a_np TEXT,
      option_b_np TEXT,
      option_c_np TEXT,
      option_d_np TEXT,
      option_a_en TEXT,
      option_b_en TEXT,
      option_c_en TEXT,
      option_d_en TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      explanation_np TEXT,
      explanation_en TEXT,
      marks REAL DEFAULT 1,
      status TEXT DEFAULT 'published',
      created_by TEXT DEFAULT 'admin',
      reviewed_by TEXT DEFAULT 'editorial_team',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(country_id) REFERENCES countries(id),
      FOREIGN KEY(exam_id) REFERENCES exams(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id),
      FOREIGN KEY(topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      mode TEXT DEFAULT 'mock',
      exam_name TEXT,
      subject_name TEXT,
      practice_set_title TEXT,
      score REAL DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      skipped_count INTEGER DEFAULT 0,
      time_taken_seconds INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT,
      is_correct INTEGER DEFAULT 0,
      FOREIGN KEY(attempt_id) REFERENCES test_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS question_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      user_id INTEGER,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      xp_reward INTEGER DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      awarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration helper: add columns if they didn't exist in older table versions
  try {
    db.exec(`ALTER TABLE questions ADD COLUMN status TEXT DEFAULT 'published'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE questions ADD COLUMN language TEXT DEFAULT 'both'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE questions ADD COLUMN marks REAL DEFAULT 1`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 50`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 1`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE test_attempts ADD COLUMN mode TEXT DEFAULT 'mock'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE test_attempts ADD COLUMN xp_earned INTEGER DEFAULT 0`);
  } catch (e) {}

  // Seed Countries if empty
  const countryCount = db.prepare('SELECT COUNT(*) as count FROM countries').get().count;
  if (countryCount === 0) {
    console.log('[DB] Seeding countries...');
    const insertCountry = db.prepare('INSERT INTO countries (name, code, currency, flag_emoji, is_active) VALUES (?, ?, ?, ?, ?)');
    insertCountry.run('Nepal', 'NP', 'NPR', '🇳🇵', 1);
    insertCountry.run('India', 'IN', 'INR', '🇮🇳', 0); // Prepared for future expansion
    insertCountry.run('Bangladesh', 'BD', 'BDT', '🇧🇩', 0);
  }

  // Seed default badges
  const badgeCount = db.prepare('SELECT COUNT(*) as count FROM badges').get().count;
  if (badgeCount === 0) {
    const insertBadge = db.prepare('INSERT INTO badges (code, name, description, icon, xp_reward) VALUES (?, ?, ?, ?, ?)');
    insertBadge.run('first_test', 'First Step', 'Completed your first practice test on ExamSetu', 'ri-rocket-line', 50);
    insertBadge.run('streak_7', '7-Day Scholar', 'Maintained a 7-day daily study streak', 'ri-fire-line', 150);
    insertBadge.run('centurion', '100 Questions', 'Answered 100 questions across all subjects', 'ri-medal-line', 200);
    insertBadge.run('master_gk', 'Lok Sewa Guru', 'Achieved 90%+ in Lok Sewa General Knowledge', 'ri-award-line', 250);
  }

  // Seed default exams if empty
  const examCountRow = db.prepare('SELECT COUNT(*) as count FROM exams').get();
  if (examCountRow.count === 0) {
    console.log('[DB] Seeding default exams and subjects...');
    const insertExam = db.prepare(`
      INSERT INTO exams (country_id, name, slug, description, nepali_title, icon, badge)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const examsData = [
      {
        name: 'Lok Sewa',
        slug: 'lok-sewa',
        description: 'Civil Service Examination (Kharidar, Nayab Subba, Section Officer, Technical, Health)',
        nepali_title: 'लोक सेवा आयोग तयारी',
        icon: 'ri-government-line',
        badge: 'High Demand'
      },
      {
        name: 'SEE',
        slug: 'see',
        description: 'Secondary Education Examination (Class 10 - Mathematics, Science, English, Social)',
        nepali_title: 'एसईई परीक्षा अभ्यास',
        icon: 'ri-book-read-line',
        badge: 'Core Curriculum'
      },
      {
        name: 'NEB',
        slug: 'neb',
        description: 'National Examination Board (+2 Science, Management, Humanities, Social Studies)',
        nepali_title: 'राष्ट्रिय परीक्षा बोर्ड (+२)',
        icon: 'ri-graduation-cap-line',
        badge: '+2 Board'
      },
      {
        name: 'Banking',
        slug: 'banking',
        description: 'Nepal Rastra Bank (NRB), Rastriya Banijya Bank (RBB), Agricultural Development Bank (ADBL)',
        nepali_title: 'बैंकिङ परीक्षा तयारी',
        icon: 'ri-bank-card-line',
        badge: 'Career Focus'
      },
      {
        name: 'TSC',
        slug: 'tsc',
        description: 'Teachers Service Commission (Shikshak Sewa Aayog - Primary, Lower Secondary, Secondary)',
        nepali_title: 'शिक्षक सेवा आयोग',
        icon: 'ri-presentation-line',
        badge: 'Teaching License'
      },
      {
        name: 'Entrance',
        slug: 'entrance',
        description: 'Engineering (IOE), Medical (CEE), Management (CMAT, KUUMAT) Aptitude tests',
        nepali_title: 'प्रवेश परीक्षा (इन्जिनियरिङ र मेडिकल)',
        icon: 'ri-compass-3-line',
        badge: 'Competitive'
      }
    ];

    for (const ex of examsData) {
      insertExam.run(1, ex.name, ex.slug, ex.description, ex.nepali_title, ex.icon, ex.badge);
    }

    // Seed Subjects
    const getExamId = db.prepare('SELECT id FROM exams WHERE slug = ?');
    const insertSubject = db.prepare('INSERT INTO subjects (exam_id, name, slug, description, icon) VALUES (?, ?, ?, ?, ?)');

    const subjectsData = [
      { examSlug: 'lok-sewa', name: 'General Knowledge (GK)', slug: 'general-knowledge', description: 'Nepal Geography, History, Constitution, International Affairs', icon: 'ri-earth-line' },
      { examSlug: 'lok-sewa', name: 'Computer/IT', slug: 'computer-it', description: 'Fundamentals, Networking, Cyber Law, MS Office, Database', icon: 'ri-terminal-box-line' },
      { examSlug: 'lok-sewa', name: 'General Mental Ability (IQ)', slug: 'iq', description: 'Verbal, Numerical, Spatial and Logical Reasoning', icon: 'ri-lightbulb-line' },
      { examSlug: 'see', name: 'Compulsory Science', slug: 'science', description: 'Physics, Chemistry, Biology, Astronomy, Geology', icon: 'ri-flask-line' },
      { examSlug: 'see', name: 'Compulsory Mathematics', slug: 'mathematics', description: 'Sets, Arithmetic, Mensuration, Algebra, Geometry, Stats', icon: 'ri-function-line' },
      { examSlug: 'banking', name: 'Banking Law & Economy', slug: 'banking-law-economy', description: 'NRB Act, BAFIA, Monetary Policy, Accounting Standards', icon: 'ri-coin-line' },
      { examSlug: 'tsc', name: 'Education Pedagogy', slug: 'education-pedagogy', description: 'Curriculum development, teaching methodologies, evaluation', icon: 'ri-booklet-line' },
      { examSlug: 'entrance', name: 'Engineering / Medical Aptitude', slug: 'entrance-aptitude', description: 'Applied Physics, Chemistry, Math & Logic problems', icon: 'ri-rocket-line' },
      { examSlug: 'neb', name: '+2 General Studies', slug: 'neb-general-studies', description: 'Compulsory English, Nepali, and Social Studies MCQs', icon: 'ri-file-list-3-line' }
    ];

    for (const sub of subjectsData) {
      const examRow = getExamId.get(sub.examSlug);
      if (examRow) {
        insertSubject.run(examRow.id, sub.name, sub.slug, sub.description, sub.icon);
      }
    }

    // Seed Topics for hierarchy (Country -> Exam -> Subject -> Topic)
    const getSubjectId = db.prepare('SELECT id FROM subjects WHERE slug = ?');
    const insertTopic = db.prepare('INSERT INTO topics (subject_id, name, slug, description) VALUES (?, ?, ?, ?)');

    const topicsData = [
      { subSlug: 'general-knowledge', name: 'Nepal Constitution', slug: 'nepal-constitution', description: 'Fundamental Rights, Directive Principles, Organs of State' },
      { subSlug: 'general-knowledge', name: 'Geography of Nepal', slug: 'geography-nepal', description: 'Rivers, Mountains, Provinces, Protected Areas' },
      { subSlug: 'general-knowledge', name: 'History of Nepal', slug: 'history-nepal', description: 'Ancient, Medieval, Modern Era and Treaties' },
      { subSlug: 'computer-it', name: 'Networking & Protocols', slug: 'networking-protocols', description: 'OSI Model, IP Addressing, TCP/UDP' },
      { subSlug: 'computer-it', name: 'Cyber Law of Nepal', slug: 'cyber-law', description: 'Electronic Transactions Act 2063' },
      { subSlug: 'science', name: 'Optics & Light', slug: 'optics-light', description: 'Lenses, Defects of Vision, Reflection' },
      { subSlug: 'mathematics', name: 'Sets & Venn Diagrams', slug: 'sets-venn', description: 'Union, Intersection, Cardinality' }
    ];

    for (const top of topicsData) {
      const subRow = getSubjectId.get(top.subSlug);
      if (subRow) {
        insertTopic.run(subRow.id, top.name, top.slug, top.description);
      }
    }
  }

  // Seed or sync admin and default users
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@examsetu.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123';
  const adminName = process.env.ADMIN_NAME || 'ExamSetu Admin';

  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (name, email, password_hash, role, total_xp, current_streak) VALUES (?, ?, ?, ?, 500, 7)').run(
      adminName,
      adminEmail,
      adminHash,
      'admin'
    );
    console.log(`[DB] Created admin account: ${adminEmail}`);
  } else {
    const adminHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare("UPDATE users SET name = ?, password_hash = ?, role = 'admin' WHERE email = ?").run(
      adminName,
      adminHash,
      adminEmail
    );
  }

  // Ensure default student account exists
  const studentEmail = 'student@examsetu.com';
  const existingStudent = db.prepare('SELECT * FROM users WHERE email = ?').get(studentEmail);
  if (!existingStudent) {
    const studentHash = bcrypt.hashSync('student123', 10);
    db.prepare('INSERT INTO users (name, email, password_hash, role, total_xp, current_streak) VALUES (?, ?, ?, ?, 120, 3)').run(
      'Aayush Shrestha (Student)',
      studentEmail,
      studentHash,
      'student'
    );
    console.log(`[DB] Created demo student account: ${studentEmail}`);
  }

  // Seed questions if empty
  const qCount = db.prepare('SELECT COUNT(*) as count FROM questions').get();
  if (qCount.count === 0) {
    const qPath = path.join(__dirname, '..', 'data', 'questions.json');
    if (fs.existsSync(qPath)) {
      const qList = JSON.parse(fs.readFileSync(qPath, 'utf8'));
      const insertQ = db.prepare(`
        INSERT INTO questions (
          country_id, exam_name, subject_name, topic, difficulty,
          language, question, option_a, option_b, option_c, option_d,
          correct_answer, explanation, marks, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const q of qList) {
        insertQ.run(
          1,
          q.exam,
          q.subject,
          q.topic || 'General',
          q.difficulty || 'medium',
          q.language || 'both',
          q.question,
          q.options.A,
          q.options.B,
          q.options.C,
          q.options.D,
          q.correct_answer,
          q.explanation || '',
          1,
          'published'
        );
      }
      console.log(`[DB] Seeded ${qList.length} questions from questions.json`);
    }
  }
}

// Safe database query wrappers
const DB = {
  init: initDB,
  raw: () => db,

  // User queries
  getUserByEmail: (email) => {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },
  getUserById: (id) => {
    return db.prepare('SELECT id, name, email, role, current_streak, total_xp, created_at FROM users WHERE id = ?').get(id);
  },
  createUser: (name, email, passwordHash, role = 'student') => {
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, role, total_xp, current_streak) VALUES (?, ?, ?, ?, 50, 1)');
    const result = stmt.run(name, email, passwordHash, role);
    return result.lastInsertRowid;
  },
  getAllUsers: () => {
    return db.prepare('SELECT id, name, email, role, current_streak, total_xp, created_at FROM users ORDER BY id DESC').all();
  },
  addXpToUser: (userId, xp) => {
    try {
      db.prepare('UPDATE users SET total_xp = total_xp + ?, current_streak = current_streak + 1 WHERE id = ?').run(xp, userId);
    } catch (e) {}
  },

  // Countries
  getAllCountries: () => {
    return db.prepare('SELECT * FROM countries ORDER BY id ASC').all();
  },
  createCountry: (name, code, currency, flag_emoji, is_active = 1) => {
    const stmt = db.prepare('INSERT INTO countries (name, code, currency, flag_emoji, is_active) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(name, code, currency, flag_emoji, is_active);
  },

  // Exam queries
  getAllExams: (countryCode = 'NP') => {
    return db.prepare(`
      SELECT e.*, c.name as country_name, c.code as country_code
      FROM exams e
      JOIN countries c ON e.country_id = c.id
      WHERE (c.code = ? OR ? = 'ALL') AND e.status = 'active'
      ORDER BY e.id ASC
    `).all(countryCode, countryCode);
  },
  getExamBySlug: (slug) => {
    return db.prepare('SELECT * FROM exams WHERE slug = ?').get(slug);
  },
  createExam: (name, slug, description, nepali_title, icon, badge, country_id = 1) => {
    const stmt = db.prepare('INSERT INTO exams (country_id, name, slug, description, nepali_title, icon, badge) VALUES (?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(country_id, name, slug, description, nepali_title, icon, badge);
  },
  updateExam: (id, name, slug, description, nepali_title, icon, badge) => {
    const stmt = db.prepare('UPDATE exams SET name=?, slug=?, description=?, nepali_title=?, icon=?, badge=? WHERE id=?');
    return stmt.run(name, slug, description, nepali_title, icon, badge, id);
  },
  deleteExam: (id) => {
    return db.prepare('DELETE FROM exams WHERE id=?').run(id);
  },

  // Subject queries
  getSubjectsByExamSlug: (examSlug) => {
    return db.prepare(`
      SELECT s.*, e.name as exam_name, e.slug as exam_slug
      FROM subjects s
      JOIN exams e ON s.exam_id = e.id
      WHERE e.slug = ?
      ORDER BY s.id ASC
    `).all(examSlug);
  },
  getAllSubjects: () => {
    return db.prepare(`
      SELECT s.*, e.name as exam_name, e.slug as exam_slug
      FROM subjects s
      JOIN exams e ON s.exam_id = e.id
      ORDER BY s.id ASC
    `).all();
  },
  getSubjectBySlug: (slug) => {
    return db.prepare(`
      SELECT s.*, e.name as exam_name, e.slug as exam_slug
      FROM subjects s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.slug = ?
    `).get(slug);
  },

  // Topics
  getTopicsBySubjectSlug: (subjectSlug) => {
    return db.prepare(`
      SELECT t.*, s.name as subject_name, s.slug as subject_slug
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      WHERE s.slug = ?
      ORDER BY t.id ASC
    `).all(subjectSlug);
  },

  // Question queries
  getAllQuestions: (limit = 100, offset = 0, status = 'all') => {
    if (status === 'all') {
      return db.prepare('SELECT * FROM questions ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    }
    return db.prepare('SELECT * FROM questions WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(status, limit, offset);
  },
  getQuestionById: (id) => {
    return db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  },
  getQuestionsByExamAndSubject: (examName, subjectName, limit = 20, topic = '') => {
    if (topic && topic !== '') {
      return db.prepare(`
        SELECT * FROM questions
        WHERE status = 'published'
          AND (exam_name LIKE ? OR ? = '')
          AND (subject_name LIKE ? OR ? = '')
          AND (topic LIKE ? OR ? = '')
        ORDER BY RANDOM() LIMIT ?
      `).all(`%${examName}%`, examName, `%${subjectName}%`, subjectName, `%${topic}%`, topic, limit);
    } else if (examName && subjectName) {
      return db.prepare(`
        SELECT * FROM questions
        WHERE status = 'published'
          AND (exam_name LIKE ? OR ? = '')
          AND (subject_name LIKE ? OR ? = '')
        ORDER BY RANDOM() LIMIT ?
      `).all(`%${examName}%`, examName, `%${subjectName}%`, subjectName, limit);
    } else if (examName) {
      return db.prepare(`
        SELECT * FROM questions WHERE status = 'published' AND exam_name LIKE ? ORDER BY RANDOM() LIMIT ?
      `).all(`%${examName}%`, limit);
    } else {
      return db.prepare("SELECT * FROM questions WHERE status = 'published' ORDER BY RANDOM() LIMIT ?").all(limit);
    }
  },
  createQuestion: (q) => {
    const stmt = db.prepare(`
      INSERT INTO questions (
        country_id, exam_name, subject_name, topic, difficulty,
        language, question, option_a, option_b, option_c, option_d,
        correct_answer, explanation, marks, status, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      q.country_id || 1,
      q.exam || q.exam_name || 'Lok Sewa',
      q.subject || q.subject_name || 'General Knowledge',
      q.topic || 'General',
      q.difficulty || 'medium',
      q.language || 'both',
      q.question,
      q.options?.A || q.option_a,
      q.options?.B || q.option_b,
      q.options?.C || q.option_c,
      q.options?.D || q.option_d,
      q.correct_answer,
      q.explanation || '',
      q.marks || 1,
      q.status || 'published',
      q.created_by || 'admin'
    );
    return res.lastInsertRowid;
  },
  updateQuestion: (id, q) => {
    const stmt = db.prepare(`
      UPDATE questions
      SET exam_name=?, subject_name=?, topic=?, difficulty=?, question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_answer=?, explanation=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `);
    return stmt.run(
      q.exam_name || q.exam,
      q.subject_name || q.subject,
      q.topic,
      q.difficulty,
      q.question,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_answer,
      q.explanation,
      q.status || 'published',
      id
    );
  },
  updateQuestionStatus: (id, status) => {
    return db.prepare('UPDATE questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  },
  deleteQuestion: (id) => {
    return db.prepare('DELETE FROM questions WHERE id=?').run(id);
  },

  // Question Reports
  createQuestionReport: (questionId, userId, reason, details) => {
    const stmt = db.prepare(`
      INSERT INTO question_reports (question_id, user_id, reason, details, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    const res = stmt.run(questionId, userId || null, reason, details || '');
    // Mark question as reported in questions table
    db.prepare("UPDATE questions SET status = 'reported' WHERE id = ?").run(questionId);
    return res.lastInsertRowid;
  },
  getAllQuestionReports: () => {
    return db.prepare(`
      SELECT r.*, q.question, q.exam_name, q.subject_name, q.correct_answer, u.name as reported_by_name
      FROM question_reports r
      JOIN questions q ON r.question_id = q.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.id DESC
    `).all();
  },
  resolveQuestionReport: (reportId, action) => {
    const report = db.prepare('SELECT * FROM question_reports WHERE id = ?').get(reportId);
    if (!report) return null;
    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    db.prepare('UPDATE question_reports SET status = ? WHERE id = ?').run(newStatus, reportId);
    if (action === 'archive') {
      db.prepare("UPDATE questions SET status = 'archived' WHERE id = ?").run(report.question_id);
    } else if (action === 'dismiss') {
      db.prepare("UPDATE questions SET status = 'published' WHERE id = ?").run(report.question_id);
    }
    return true;
  },

  // Test Attempt & Analytics
  createTestAttempt: (attempt) => {
    const stmt = db.prepare(`
      INSERT INTO test_attempts (user_id, mode, exam_name, subject_name, practice_set_title, score, total_questions, correct_count, wrong_count, skipped_count, time_taken_seconds, percentage, xp_earned, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const xpEarned = (attempt.correct_count || 0) * 5 + 10; // 5 XP per correct + 10 XP completion bonus
    const res = stmt.run(
      attempt.user_id || null,
      attempt.mode || 'mock',
      attempt.exam_name || 'Lok Sewa',
      attempt.subject_name || 'General Practice',
      attempt.practice_set_title || 'Mock Test Set',
      attempt.score || 0,
      attempt.total_questions || 0,
      attempt.correct_count || 0,
      attempt.wrong_count || 0,
      attempt.skipped_count || 0,
      attempt.time_taken_seconds || 0,
      attempt.percentage || 0,
      xpEarned,
      'completed'
    );

    if (attempt.user_id) {
      DB.addXpToUser(attempt.user_id, xpEarned);
    }

    return res.lastInsertRowid;
  },
  saveTestAnswer: (attemptId, questionId, selectedOption, isCorrect) => {
    const stmt = db.prepare(`
      INSERT INTO test_answers (attempt_id, question_id, selected_option, is_correct)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(attemptId, questionId, selectedOption, isCorrect ? 1 : 0);
  },
  getTestAttemptById: (attemptId) => {
    return db.prepare('SELECT * FROM test_attempts WHERE id = ?').get(attemptId);
  },
  getTestAttemptAnswers: (attemptId) => {
    return db.prepare(`
      SELECT a.*, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.topic, q.difficulty
      FROM test_answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.attempt_id = ?
    `).all(attemptId);
  },
  getUserTestHistory: (userId) => {
    return db.prepare('SELECT * FROM test_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(userId);
  },
  getAllAttempts: (limit = 50) => {
    return db.prepare(`
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM test_attempts t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC LIMIT ?
    `).all(limit);
  },
  getUserWrongAnswers: (userId) => {
    return db.prepare(`
      SELECT DISTINCT q.*, a.selected_option as user_last_wrong_answer
      FROM test_answers a
      JOIN test_attempts t ON a.attempt_id = t.id
      JOIN questions q ON a.question_id = q.id
      WHERE t.user_id = ? AND a.is_correct = 0
      ORDER BY a.id DESC LIMIT 30
    `).all(userId);
  },

  // Bookmarks
  addBookmark: (userId, questionId) => {
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, question_id) VALUES (?, ?)');
      return stmt.run(userId, questionId);
    } catch (e) {
      return null;
    }
  },
  removeBookmark: (userId, questionId) => {
    return db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?').run(userId, questionId);
  },
  getUserBookmarks: (userId) => {
    return db.prepare(`
      SELECT b.id as bookmark_id, b.created_at as bookmarked_at, q.*
      FROM bookmarks b
      JOIN questions q ON b.question_id = q.id
      WHERE b.user_id = ?
      ORDER BY b.id DESC
    `).all(userId);
  },

  // Badges & Gamification
  getUserBadges: (userId) => {
    return db.prepare(`
      SELECT b.*, ub.awarded_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `).all(userId);
  },
  getAllBadges: () => {
    return db.prepare('SELECT * FROM badges ORDER BY id ASC').all();
  },
  getWeeklyLeaderboard: () => {
    return db.prepare(`
      SELECT id, name, total_xp, current_streak
      FROM users
      ORDER BY total_xp DESC LIMIT 10
    `).all();
  },

  // Stats
  getOverallStats: () => {
    const questionsCount = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
    const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const attemptsCount = db.prepare('SELECT COUNT(*) as c FROM test_attempts').get().c;
    const examsCount = db.prepare('SELECT COUNT(*) as c FROM exams').get().c;
    const subjectsCount = db.prepare('SELECT COUNT(*) as c FROM subjects').get().c;
    const reportsCount = db.prepare("SELECT COUNT(*) as c FROM question_reports WHERE status = 'pending'").get().c;

    return {
      totalQuestions: questionsCount,
      totalUsers: usersCount,
      totalAttempts: attemptsCount,
      totalExams: examsCount,
      totalSubjects: subjectsCount,
      pendingReports: reportsCount
    };
  }
};

module.exports = DB;
