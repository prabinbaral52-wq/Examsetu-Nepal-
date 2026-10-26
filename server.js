require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const DB = require('./models/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & seed tables
DB.init();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  session({
    name: process.env.SESSION_NAME || 'examsetu_sid',
    secret: process.env.SESSION_SECRET || 'change_this_to_a_long_random_secret_at_least_32_characters',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  })
);

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// SEO Files
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Mount API routes
app.use('/api', apiRoutes);

// View routing helper
const sendView = (res, viewFile) => {
  res.sendFile(path.join(__dirname, 'views', viewFile));
};

// Website Page Routes
app.get('/', (req, res) => sendView(res, 'index.html'));
app.get('/exams', (req, res) => sendView(res, 'exams.html'));
app.get('/subject', (req, res) => sendView(res, 'subject.html'));
app.get('/practice', (req, res) => sendView(res, 'practice.html'));
app.get('/test', (req, res) => sendView(res, 'test.html'));
app.get('/result', (req, res) => sendView(res, 'result.html'));
app.get('/login', (req, res) => sendView(res, 'login.html'));
app.get('/register', (req, res) => sendView(res, 'register.html'));
app.get('/dashboard', (req, res) => sendView(res, 'dashboard.html'));
app.get('/admin', (req, res) => sendView(res, 'admin.html'));

// Legal & Information Pages
app.get('/about', (req, res) => sendView(res, 'legal/about.html'));
app.get('/contact', (req, res) => sendView(res, 'legal/contact.html'));
app.get('/privacy', (req, res) => sendView(res, 'legal/privacy.html'));
app.get('/terms', (req, res) => sendView(res, 'legal/terms.html'));
app.get('/disclaimer', (req, res) => sendView(res, 'legal/disclaimer.html'));

// 404 Handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 Page Not Found - ExamSetu Nepal</title>
      <link rel="stylesheet" href="/css/style.css">
      <link rel="stylesheet" href="/css/responsive.css">
    </head>
    <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;background:#f8fafc;padding:20px;">
      <div style="background:#fff;padding:40px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);max-width:480px;">
        <h1 style="color:#2563eb;font-size:3rem;margin-bottom:10px;">404</h1>
        <h2 style="margin-bottom:16px;color:#0f172a;">Page Not Found</h2>
        <p style="color:#64748b;margin-bottom:24px;">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
        <a href="/" class="btn btn-primary" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Return to Home</a>
      </div>
    </body>
    </html>
  `);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🇳🇵 ExamSetu Nepal Server running on http://localhost:${PORT}`);
  console.log(`Tagline: Practice. Prepare. Pass.`);
  console.log(`Default Admin: admin@examsetu.com / admin123`);
  console.log(`Default Student: student@examsetu.com / student123`);
  console.log(`====================================================`);
});
