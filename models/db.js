const fs = require('fs');
const path = require('path');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  const crypto = require('crypto');
  bcrypt = {
    genSaltSync: () => 'salt',
    hashSync: (pw) => crypto.createHash('sha256').update(pw).digest('hex'),
    compareSync: (pw, hash) => hash === pw || hash === crypto.createHash('sha256').update(pw).digest('hex')
  };
}
let QuestionGenerator;
try {
  QuestionGenerator = require('./question-generator');
} catch (e) {
  QuestionGenerator = { generateQuestionsBatch: () => [] };
}
const CurriculumDB = require('./curriculum-db');

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

// Multi-tenant colleges, custom questions, and exams are registered genuinely by colleges and faculty.
// Initial state starts clean at zero.

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

    CREATE TABLE IF NOT EXISTS telegram_users (
      telegram_id INTEGER PRIMARY KEY,
      chat_id INTEGER NOT NULL,
      username TEXT,
      first_name TEXT,
      score INTEGER DEFAULT 0,
      total_quizzes INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 1,
      total_xp INTEGER DEFAULT 10,
      last_active_date TEXT,
      preferred_category TEXT DEFAULT 'all',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telegram_quiz_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      poll_id TEXT,
      selected_option INTEGER,
      is_correct INTEGER DEFAULT 0,
      answered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(telegram_id) REFERENCES telegram_users(telegram_id)
    );

    /* --- Multi-Tenant College Portal & Isolated Exam Database --- */
    CREATE TABLE IF NOT EXISTS colleges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      special_access_code TEXT UNIQUE NOT NULL,
      description TEXT,
      motto TEXT,
      logo_icon TEXT DEFAULT 'ri-building-4-line',
      theme_color TEXT DEFAULT '#2563eb',
      banner_gradient TEXT DEFAULT 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      location TEXT DEFAULT 'Kathmandu, Nepal',
      contact_email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS college_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      subject_name TEXT NOT NULL,
      topic TEXT DEFAULT 'General',
      difficulty TEXT DEFAULT 'medium',
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      created_by TEXT DEFAULT 'Faculty',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id)
    );

    CREATE TABLE IF NOT EXISTS college_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 20,
      total_questions INTEGER DEFAULT 10,
      pass_marks INTEGER DEFAULT 40,
      status TEXT DEFAULT 'active',
      created_by TEXT DEFAULT 'Faculty',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id)
    );

    CREATE TABLE IF NOT EXISTS college_test_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      FOREIGN KEY(test_id) REFERENCES college_tests(id),
      FOREIGN KEY(question_id) REFERENCES college_questions(id)
    );

    CREATE TABLE IF NOT EXISTS college_student_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      college_id INTEGER NOT NULL,
      student_id_number TEXT,
      enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      UNIQUE(user_id, college_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(college_id) REFERENCES colleges(id)
    );

    CREATE TABLE IF NOT EXISTS college_test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      college_id INTEGER NOT NULL,
      student_name TEXT,
      score REAL DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      time_taken_seconds INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(test_id) REFERENCES college_tests(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(college_id) REFERENCES colleges(id)
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
    db.exec(`ALTER TABLE users ADD COLUMN college_id INTEGER`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN college_role TEXT DEFAULT 'student'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE test_attempts ADD COLUMN mode TEXT DEFAULT 'mock'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE test_attempts ADD COLUMN xp_earned INTEGER DEFAULT 0`);
  } catch (e) {}

  // Colleges, questions, and tests are clean at zero until registered/uploaded.

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

  // Initialize Curriculum Intelligence tables & authoritative seed
  try {
    CurriculumDB.init(db);
  } catch (currErr) {
    console.error('[DB] CurriculumDB init error:', currErr.message);
  }
}

// Automatically bootstrap tables and seed data on initial load
try {
  initDB();
} catch (e) {
  console.warn('[DB Auto-init notice]:', e.message);
}

// Safe database query wrappers
const DB = {
  init: initDB,
  raw: () => db,
  curriculum: CurriculumDB,

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
    let rows = [];
    if (topic && topic !== '') {
      rows = db.prepare(`
        SELECT * FROM questions
        WHERE status = 'published'
          AND (exam_name LIKE ? OR ? = '')
          AND (subject_name LIKE ? OR ? = '')
          AND (topic LIKE ? OR ? = '')
        ORDER BY RANDOM() LIMIT ?
      `).all(`%${examName}%`, examName, `%${subjectName}%`, subjectName, `%${topic}%`, topic, limit);
    } else if (examName && subjectName) {
      rows = db.prepare(`
        SELECT * FROM questions
        WHERE status = 'published'
          AND (exam_name LIKE ? OR ? = '')
          AND (subject_name LIKE ? OR ? = '')
        ORDER BY RANDOM() LIMIT ?
      `).all(`%${examName}%`, examName, `%${subjectName}%`, subjectName, limit);
    } else if (examName) {
      rows = db.prepare(`
        SELECT * FROM questions WHERE status = 'published' AND exam_name LIKE ? ORDER BY RANDOM() LIMIT ?
      `).all(`%${examName}%`, limit);
    } else {
      rows = db.prepare("SELECT * FROM questions WHERE status = 'published' ORDER BY RANDOM() LIMIT ?").all(limit);
    }

    // Unlimited Dynamic Question Generation: If requested limit exceeds available DB questions, auto-generate syllabus questions!
    if (rows.length < limit) {
      const needed = limit - rows.length;
      try {
        const generated = QuestionGenerator.generateQuestionsBatch(needed, examName);
        const insertStmt = db.prepare(`
          INSERT INTO questions (
            country_id, exam_name, subject_name, topic, difficulty,
            language, question, option_a, option_b, option_c, option_d,
            correct_answer, explanation, marks, status, created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'generator')
        `);

        for (const g of generated) {
          const res = insertStmt.run(
            1,
            examName || g.exam || 'Lok Sewa',
            subjectName || g.subject || 'General Knowledge',
            g.topic || 'General',
            g.difficulty || 'medium',
            'both',
            g.question,
            g.options.A,
            g.options.B,
            g.options.C,
            g.options.D,
            g.correct_answer,
            g.explanation || '',
            1
          );
          g.id = Number(res.lastInsertRowid);
          g.exam_name = examName || g.exam;
          g.subject_name = subjectName || g.subject;
          g.option_a = g.options.A;
          g.option_b = g.options.B;
          g.option_c = g.options.C;
          g.option_d = g.options.D;
          rows.push(g);
        }
      } catch (genErr) {
        console.warn('[DB Generator] Auto-generation notice:', genErr.message);
      }
    }

    return rows;
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
  },

  // Telegram Bot Integration
  upsertTelegramUser: ({ telegram_id, chat_id, username = '', first_name = '', preferred_category = 'all' }) => {
    try {
      const existing = db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').get(telegram_id);
      const today = new Date().toISOString().split('T')[0];

      if (!existing) {
        db.prepare(`
          INSERT INTO telegram_users (telegram_id, chat_id, username, first_name, preferred_category, last_active_date, current_streak, total_xp)
          VALUES (?, ?, ?, ?, ?, ?, 1, 10)
        `).run(telegram_id, chat_id, username, first_name, preferred_category, today);
        return db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').get(telegram_id);
      } else {
        // Streak calculation
        let streak = existing.current_streak || 1;
        if (existing.last_active_date) {
          const lastDate = new Date(existing.last_active_date);
          const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streak += 1;
          } else if (diffDays > 1) {
            streak = 1;
          }
        }

        db.prepare(`
          UPDATE telegram_users
          SET chat_id = ?, username = COALESCE(NULLIF(?, ''), username),
              first_name = COALESCE(NULLIF(?, ''), first_name),
              preferred_category = COALESCE(NULLIF(?, ''), preferred_category),
              last_active_date = ?, current_streak = ?
          WHERE telegram_id = ?
        `).run(chat_id, username, first_name, preferred_category, today, streak, telegram_id);

        return db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').get(telegram_id);
      }
    } catch (e) {
      console.error('[DB] upsertTelegramUser error:', e.message);
      return null;
    }
  },

  getTelegramUser: (telegramId) => {
    try {
      return db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').get(telegramId);
    } catch (e) {
      return null;
    }
  },

  setTelegramCategory: (telegramId, category) => {
    try {
      return db.prepare('UPDATE telegram_users SET preferred_category = ? WHERE telegram_id = ?').run(category, telegramId);
    } catch (e) {
      return null;
    }
  },

  recordTelegramQuizAttempt: ({ telegram_id, question_id, poll_id, selected_option, is_correct }) => {
    try {
      // 1. Insert into history
      db.prepare(`
        INSERT INTO telegram_quiz_history (telegram_id, question_id, poll_id, selected_option, is_correct)
        VALUES (?, ?, ?, ?, ?)
      `).run(telegram_id, question_id, poll_id || '', selected_option, is_correct ? 1 : 0);

      // 2. Update user stats and XP
      const xpGain = is_correct ? 10 : 2;
      const scoreGain = is_correct ? 1 : 0;
      db.prepare(`
        UPDATE telegram_users
        SET total_quizzes = total_quizzes + 1,
            correct_answers = correct_answers + ?,
            score = score + ?,
            total_xp = total_xp + ?,
            last_active_date = date('now')
        WHERE telegram_id = ?
      `).run(scoreGain, scoreGain, xpGain, telegram_id);

      return db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').get(telegram_id);
    } catch (e) {
      console.error('[DB] recordTelegramQuizAttempt error:', e.message);
      return null;
    }
  },

  getRandomQuestionForTelegram: (category = 'all') => {
    try {
      let q = null;
      if (category && category !== 'all' && category !== 'random') {
        q = db.prepare(`
          SELECT * FROM questions
          WHERE status = 'published' AND (exam_name LIKE ? OR subject_name LIKE ?)
          ORDER BY RANDOM() LIMIT 1
        `).get(`%${category}%`, `%${category}%`);
      }

      if (!q) {
        q = db.prepare("SELECT * FROM questions WHERE status = 'published' ORDER BY RANDOM() LIMIT 1").get();
      }

      if (!q) return null;

      // Determine correct option index (0 for A, 1 for B, 2 for C, 3 for D)
      const correctLetter = (q.correct_answer || 'A').toUpperCase().trim().replace(/OPTION\s*/i, '');
      const map = { 'A': 0, '1': 0, 'B': 1, '2': 1, 'C': 2, '3': 2, 'D': 3, '4': 3 };
      const correctIndex = map[correctLetter] !== undefined ? map[correctLetter] : 0;

      const options = [
        q.option_a_np || q.option_a || 'Option A',
        q.option_b_np || q.option_b || 'Option B',
        q.option_c_np || q.option_c || 'Option C',
        q.option_d_np || q.option_d || 'Option D'
      ];

      const questionText = q.question_text_np || q.question || 'Question';
      const explanation = q.explanation_np || q.explanation || 'No detailed explanation provided.';

      return {
        id: q.id,
        exam_name: q.exam_name,
        subject_name: q.subject_name,
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'medium',
        question: questionText,
        options: options,
        correct_option_id: correctIndex,
        explanation: explanation.substring(0, 195) // Telegram poll explanation character limit is 200 chars
      };
    } catch (e) {
      console.error('[DB] getRandomQuestionForTelegram error:', e.message);
      return null;
    }
  },

  getTelegramLeaderboard: (limit = 10) => {
    try {
      return db.prepare(`
        SELECT telegram_id, username, first_name, score, total_quizzes, correct_answers, current_streak, total_xp
        FROM telegram_users
        ORDER BY score DESC, total_xp DESC
        LIMIT ?
      `).all(limit);
    } catch (e) {
      return [];
    }
  },

  getTelegramBotStats: () => {
    try {
      const users = db.prepare('SELECT COUNT(*) as c FROM telegram_users').get().c;
      const quizzes = db.prepare('SELECT COUNT(*) as c FROM telegram_quiz_history').get().c;
      const correct = db.prepare('SELECT COUNT(*) as c FROM telegram_quiz_history WHERE is_correct = 1').get().c;
      const accuracy = quizzes > 0 ? Math.round((correct / quizzes) * 100) : 0;

      return {
        totalTelegramUsers: users,
        totalQuizzesAnswered: quizzes,
        totalCorrectAnswers: correct,
        overallAccuracy: `${accuracy}%`
      };
    } catch (e) {
      return { totalTelegramUsers: 0, totalQuizzesAnswered: 0, totalCorrectAnswers: 0, overallAccuracy: '0%' };
    }
  },

  // --- Multi-Tenant College Portal & Database Methods ---
  getAllColleges: () => {
    try {
      return db.prepare(`
        SELECT c.*,
          c.special_access_code as access_code,
          c.theme_color as brand_color,
          (SELECT COUNT(*) FROM college_questions q WHERE q.college_id = c.id) as question_count,
          (SELECT COUNT(*) FROM college_tests t WHERE t.college_id = c.id AND t.status = 'active') as test_count,
          (SELECT COUNT(*) FROM college_student_enrollments e WHERE e.college_id = c.id) as student_count
        FROM colleges c
        WHERE c.is_active = 1
        ORDER BY c.id ASC
      `).all();
    } catch (e) {
      console.error('[DB] getAllColleges error:', e.message);
      return [];
    }
  },

  getCollegeById: (id) => {
    try {
      return db.prepare('SELECT * FROM colleges WHERE id = ?').get(id);
    } catch (e) {
      return null;
    }
  },

  getCollegeByCode: (code) => {
    try {
      if (!code) return null;
      return db.prepare('SELECT * FROM colleges WHERE LOWER(code) = LOWER(?)').get(code.trim());
    } catch (e) {
      return null;
    }
  },

  getCollegeByName: (name) => {
    try {
      if (!name) return null;
      const clean = name.trim().toLowerCase();
      let college = db.prepare('SELECT * FROM colleges WHERE LOWER(name) = ? OR LOWER(code) = ?').get(clean, clean);
      if (!college) {
        college = db.prepare('SELECT * FROM colleges WHERE LOWER(name) LIKE ?').get(`%${clean}%`);
      }
      return college || null;
    } catch (e) {
      return null;
    }
  },

  getCollegeByAccessCode: (accessCode) => {
    try {
      if (!accessCode) return null;
      const cleanCode = accessCode.trim().toUpperCase();
      return db.prepare('SELECT * FROM colleges WHERE UPPER(special_access_code) = ?').get(cleanCode);
    } catch (e) {
      return null;
    }
  },

  createCollege: (data) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO colleges (name, code, special_access_code, description, motto, logo_icon, theme_color, banner_gradient, location, contact_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        data.name,
        data.code.toLowerCase().trim(),
        data.special_access_code.toUpperCase().trim(),
        data.description || '',
        data.motto || '',
        data.logo_icon || 'ri-building-4-line',
        data.theme_color || '#2563eb',
        data.banner_gradient || 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        data.location || 'Nepal',
        data.contact_email || ''
      );
      return res.lastInsertRowid;
    } catch (e) {
      console.error('[DB] createCollege error:', e.message);
      throw e;
    }
  },

  enrollStudentInCollege: (userId, codeOrName, studentIdNumber = '') => {
    try {
      let college = DB.getCollegeByAccessCode(codeOrName);
      if (!college) {
        college = DB.getCollegeByName(codeOrName);
      }
      if (!college) {
        college = DB.getCollegeByCode(codeOrName);
      }
      if (!college) {
        return { success: false, message: 'College not found. Please enter a valid college name or special access code.' };
      }

      // Check if already enrolled
      const existing = db.prepare('SELECT * FROM college_student_enrollments WHERE user_id = ? AND college_id = ?').get(userId, college.id);
      if (!existing) {
        db.prepare('INSERT INTO college_student_enrollments (user_id, college_id, student_id_number) VALUES (?, ?, ?)').run(
          userId, college.id, studentIdNumber || ''
        );
      }

      // Update user primary college_id and role
      try {
        db.prepare("UPDATE users SET college_id = ?, college_role = 'college_student' WHERE id = ?").run(college.id, userId);
      } catch (e) {}

      return { success: true, college: college };
    } catch (e) {
      console.error('[DB] enrollStudentInCollege error:', e.message);
      return { success: false, message: e.message };
    }
  },

  getStudentCollege: (userId) => {
    try {
      return db.prepare(`
        SELECT c.*, e.student_id_number, e.enrolled_at
        FROM college_student_enrollments e
        JOIN colleges c ON e.college_id = c.id
        WHERE e.user_id = ?
        ORDER BY e.id DESC
        LIMIT 1
      `).get(userId);
    } catch (e) {
      return null;
    }
  },

  getCollegeQuestions: (collegeId, subject = null) => {
    try {
      if (subject) {
        return db.prepare('SELECT * FROM college_questions WHERE college_id = ? AND subject_name = ? ORDER BY id DESC').all(collegeId, subject);
      }
      return db.prepare('SELECT * FROM college_questions WHERE college_id = ? ORDER BY id DESC').all(collegeId);
    } catch (e) {
      return [];
    }
  },

  addCollegeQuestion: (collegeIdOrData, qData) => {
    try {
      let collegeId = collegeIdOrData;
      let q = qData;
      if (typeof collegeIdOrData === 'object' && collegeIdOrData !== null) {
        collegeId = collegeIdOrData.college_id;
        q = collegeIdOrData;
      }
      const stmt = db.prepare(`
        INSERT INTO college_questions (college_id, subject_name, topic, difficulty, question, option_a, option_b, option_c, option_d, correct_answer, explanation, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        collegeId,
        q.subject_name || q.subject || 'General',
        q.topic || 'General',
        q.difficulty || 'medium',
        q.question || q.question_text || '',
        q.option_a || '',
        q.option_b || '',
        q.option_c || '',
        q.option_d || '',
        (q.correct_answer || 'A').toUpperCase().trim(),
        q.explanation || '',
        q.created_by || 'Faculty'
      );
      return res.lastInsertRowid;
    } catch (e) {
      console.error('[DB] addCollegeQuestion error:', e.message);
      throw e;
    }
  },

  bulkAddCollegeQuestions: (collegeId, questions, createdBy = 'AI Paper Import') => {
    try {
      if (!Array.isArray(questions) || questions.length === 0) return 0;
      const stmt = db.prepare(`
        INSERT INTO college_questions (college_id, subject_name, topic, difficulty, question, option_a, option_b, option_c, option_d, correct_answer, explanation, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let count = 0;
      for (const q of questions) {
        const qText = q.question || q.question_text;
        if (!qText) continue;
        stmt.run(
          collegeId,
          q.subject_name || q.subject || 'General',
          q.topic || 'General',
          q.difficulty || 'medium',
          qText,
          q.option_a || 'Option A',
          q.option_b || 'Option B',
          q.option_c || 'Option C',
          q.option_d || 'Option D',
          (q.correct_answer || 'A').toUpperCase().trim(),
          q.explanation || '',
          q.created_by || createdBy
        );
        count++;
      }
      return count;
    } catch (e) {
      console.error('[DB] bulkAddCollegeQuestions error:', e.message);
      throw e;
    }
  },

  getCollegeTests: (collegeId) => {
    try {
      return db.prepare(`
        SELECT t.*,
          (SELECT COUNT(*) FROM college_test_questions tq WHERE tq.test_id = t.id) as question_count,
          (SELECT COUNT(*) FROM college_test_attempts a WHERE a.test_id = t.id) as total_attempts
        FROM college_tests t
        WHERE t.college_id = ? AND t.status = 'active'
        ORDER BY t.id DESC
      `).all(collegeId);
    } catch (e) {
      return [];
    }
  },

  getCollegeTestById: (testId) => {
    try {
      return db.prepare(`
        SELECT t.*, c.name as college_name, c.logo_icon, c.theme_color, c.special_access_code
        FROM college_tests t
        JOIN colleges c ON t.college_id = c.id
        WHERE t.id = ?
      `).get(testId);
    } catch (e) {
      return null;
    }
  },

  getCollegeTestQuestions: (testId) => {
    try {
      return db.prepare(`
        SELECT q.id, q.college_id, q.subject_name, q.topic, q.difficulty, q.question,
               q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation
        FROM college_test_questions tq
        JOIN college_questions q ON tq.question_id = q.id
        WHERE tq.test_id = ?
        ORDER BY tq.id ASC
      `).all(testId);
    } catch (e) {
      return [];
    }
  },

  createCollegeTest: (collegeId, data, questionIds = []) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO college_tests (college_id, title, subject_name, description, duration_minutes, total_questions, pass_marks, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const totalQ = (questionIds && questionIds.length > 0) ? questionIds.length : (data.total_questions || 5);
      const res = stmt.run(
        collegeId,
        data.title,
        data.subject_name || 'General',
        data.description || '',
        data.duration_minutes || 20,
        totalQ,
        data.pass_marks || 40,
        data.created_by || 'Faculty'
      );
      const testId = res.lastInsertRowid;

      if (questionIds && questionIds.length > 0) {
        const linkStmt = db.prepare('INSERT INTO college_test_questions (test_id, question_id) VALUES (?, ?)');
        for (const qid of questionIds) {
          linkStmt.run(testId, qid);
        }
      }

      return testId;
    } catch (e) {
      console.error('[DB] createCollegeTest error:', e.message);
      throw e;
    }
  },

  recordCollegeTestAttempt: (testId, userId, collegeId, data) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO college_test_attempts (test_id, user_id, college_id, student_name, score, total_questions, correct_count, wrong_count, time_taken_seconds, percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        testId,
        userId,
        collegeId,
        data.student_name || 'Candidate Student',
        data.score || 0,
        data.total_questions || 0,
        data.correct_count || 0,
        data.wrong_count || 0,
        data.time_taken_seconds || 0,
        data.percentage || 0
      );

      // Award XP to student
      const xpEarned = Math.round((data.score || 0) * 10) + 15;
      try {
        db.prepare('UPDATE users SET total_xp = total_xp + ?, current_streak = current_streak + 1 WHERE id = ?').run(xpEarned, userId);
      } catch (e) {}

      return res.lastInsertRowid;
    } catch (e) {
      console.error('[DB] recordCollegeTestAttempt error:', e.message);
      return null;
    }
  },

  getCollegeLeaderboard: (collegeId, limit = 20) => {
    try {
      return db.prepare(`
        SELECT u.id as user_id, u.name as student_name,
               COUNT(a.id) as total_tests_taken,
               MAX(a.score) as highest_score,
               ROUND(AVG(a.percentage), 1) as avg_percentage,
               u.total_xp, u.current_streak
        FROM college_test_attempts a
        JOIN users u ON a.user_id = u.id
        WHERE a.college_id = ?
        GROUP BY u.id
        ORDER BY highest_score DESC, avg_percentage DESC, u.total_xp DESC
        LIMIT ?
      `).all(collegeId, limit);
    } catch (e) {
      return [];
    }
  },

  getCollegeStats: (collegeId) => {
    try {
      const qCount = db.prepare('SELECT COUNT(*) as c FROM college_questions WHERE college_id = ?').get(collegeId).c;
      const tCount = db.prepare("SELECT COUNT(*) as c FROM college_tests WHERE college_id = ? AND status = 'active'").get(collegeId).c;
      const sCount = db.prepare('SELECT COUNT(*) as c FROM college_student_enrollments WHERE college_id = ?').get(collegeId).c;
      const aCount = db.prepare('SELECT COUNT(*) as c FROM college_test_attempts WHERE college_id = ?').get(collegeId).c;
      const avgRow = db.prepare('SELECT AVG(percentage) as a FROM college_test_attempts WHERE college_id = ?').get(collegeId);
      const avgScore = avgRow && avgRow.a ? Math.round(avgRow.a) : 0;

      return {
        totalQuestions: qCount,
        totalTests: tCount,
        enrolledStudents: sCount,
        totalAttempts: aCount,
        averageScore: avgScore
      };
    } catch (e) {
      return { totalQuestions: 0, totalTests: 0, enrolledStudents: 0, totalAttempts: 0, averageScore: 0 };
    }
  }
};

module.exports = DB;
