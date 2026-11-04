/**
 * EXAMSETU NEPAL - CURRICULUM INTELLIGENCE & AI STUDY GUIDANCE API ROUTER
 * Implements:
 * - Module 1 & 2: 8 Examination Curriculum Intelligence & Official Sources
 * - Module 3 & 4: SEE Explorer & NEB Grade 11/12 Subject-Selection
 * - Module 5: Chapter-Wise Marks Analysis (OFFICIAL, HISTORICAL, AI ESTIMATE)
 * - Module 6: AI Personal Study Planner (Gemini + SQLite Persistence)
 * - Module 7: AI Tutor (Socratic Hints, Concept Explanation, Flashcards)
 * - Module 8: Smart Question Generator (Specification Grid Compliant)
 * - Module 9: Student Progress Analytics (Weak/Strong Chapters, Mastery)
 * - Module 10: Admin Curriculum & Verification Management
 */

const express = require('express');
const router = express.Router();
const DB = require('../models/db');
const CurriculumDB = DB.curriculum || require('../models/curriculum-db');

// Helper to authenticate user or fallback to demo student for preview
function getActiveUser(req) {
  if (req.session && req.session.user) {
    return req.session.user;
  }
  // Fallback demo student if session not yet created
  const demo = DB.getUserByEmail('student@examsetu.com');
  return demo || { id: 1, name: 'Student', role: 'student' };
}

function isAdmin(req) {
  return req.session && req.session.user && req.session.user.role === 'admin';
}

// Gemini API Call Helper with resilient model fallback
async function callGemini(promptText, systemInstruction = '', jsonFormat = false) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const models = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const m of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2500
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      if (jsonFormat) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text.trim();
        return jsonFormat ? JSON.parse(text) : text;
      }
      if (data?.error) {
        console.warn(`[Gemini ${m} warning]:`, data.error.message);
      }
    } catch (err) {
      console.warn(`[Gemini ${m} error]:`, err.message);
    }
  }

  // Graceful rule-based fallback if offline or API quota exceeded
  return null;
}

// =============================================================================
// MODULE 1 & 2: EXAMINATION CATEGORIES & CURRICULUM SOURCES
// =============================================================================

// List all 8 official examination categories with metadata and verified counts
router.get('/exams', (req, res) => {
  try {
    const exams = CurriculumDB.getAllExams();
    res.json({ success: true, exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single exam details
router.get('/exams/:examSlug', (req, res) => {
  try {
    const exam = CurriculumDB.getExamBySlug(req.params.examSlug);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination curriculum not found.' });
    }
    const subjects = CurriculumDB.getSubjectsByExamSlug(req.params.examSlug);
    res.json({ success: true, exam, subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get subjects for an examination (with stream filter for Grade 11/12)
router.get('/exams/:examSlug/subjects', (req, res) => {
  try {
    const stream = req.query.stream || null;
    const subjects = CurriculumDB.getSubjectsByExamSlug(req.params.examSlug, stream);
    res.json({ success: true, subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 3 & 4: FULL SUBJECT SYLLABUS EXPLORER (SEE & NEB 11/12)
// =============================================================================

// Get deep subject syllabus with chapters, lessons, and topics
router.get('/subjects/:id', (req, res) => {
  try {
    const subject = CurriculumDB.getSubjectById(Number(req.params.id));
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found in curriculum database.' });
    }
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 5: CHAPTER-WISE MARKS ANALYSIS (OFFICIAL, HISTORICAL, AI ESTIMATE)
// =============================================================================

router.get('/chapters/:id/marks', (req, res) => {
  try {
    const analysis = CurriculumDB.getChapterMarksAnalysis(Number(req.params.id));
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Chapter marks analysis not found.' });
    }
    res.json({ success: true, ...analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 4: STUDENT SUBJECT SELECTION (FOR NEB 11/12 & SEE OPTIONALS)
// =============================================================================

// Get student's registered subjects
router.get('/student/subjects', (req, res) => {
  try {
    const user = getActiveUser(req);
    const examSlug = req.query.exam || 'see';
    const enrolled = CurriculumDB.getStudentEnrolledSubjects(user.id, examSlug);
    res.json({ success: true, enrolled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save student's registered subjects
router.post('/student/subjects', (req, res) => {
  try {
    const user = getActiveUser(req);
    const { examSlug, subjectIds, stream } = req.body;
    if (!examSlug || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide examSlug and at least one subject ID.' });
    }

    const updated = CurriculumDB.enrollStudentSubjects(user.id, examSlug, subjectIds, stream || 'General');
    res.json({
      success: true,
      message: 'Your curriculum subjects have been registered successfully.',
      enrolled: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 9: STUDENT PROGRESS ANALYTICS & CHAPTER COMPLETION
// =============================================================================

// Get student curriculum preparation progress
router.get('/student/progress', (req, res) => {
  try {
    const user = getActiveUser(req);
    const examSlug = req.query.exam || 'see';
    const analytics = CurriculumDB.getStudentProgress(user.id, examSlug);
    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update single chapter completion status
router.post('/student/progress', (req, res) => {
  try {
    const user = getActiveUser(req);
    const { chapterId, subjectId, status, score } = req.body;
    if (!chapterId || !subjectId || !status) {
      return res.status(400).json({ success: false, message: 'Missing chapterId, subjectId, or status.' });
    }

    const validStatuses = ['Not Started', 'Learning', 'Practicing', 'Revision Required', 'Mastered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = CurriculumDB.updateChapterProgress(user.id, Number(chapterId), Number(subjectId), status, score);
    res.json({ success: true, message: `Chapter status updated to ${status}`, progress: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 6: AI PERSONAL STUDY PLANNER (GEMINI + PERSISTENCE)
// =============================================================================

// Generate intelligent study plan with Gemini
router.post('/planner/generate', async (req, res) => {
  try {
    const user = getActiveUser(req);
    const { examSlug, targetDate, dailyHours, prepLevel, targetGrade, subjectIds } = req.body;

    if (!examSlug || !targetDate) {
      return res.status(400).json({ success: false, message: 'Examination type and target date are required.' });
    }

    const exam = CurriculumDB.getExamBySlug(examSlug);
    const subjects = CurriculumDB.getSubjectsByExamSlug(examSlug);

    // Filter to selected subjects if provided
    const targetSubjects = (Array.isArray(subjectIds) && subjectIds.length > 0)
      ? subjects.filter(s => subjectIds.includes(s.id))
      : subjects;

    // Build curriculum context for Gemini planner
    const curriculumOverview = targetSubjects.map(s => {
      const full = CurriculumDB.getSubjectById(s.id);
      return {
        subject: s.name,
        code: s.code,
        full_marks: s.full_marks,
        chapters: (full.chapters || []).map(c => ({
          id: c.id,
          chapter: c.title_en,
          official_marks: c.official_marks || 'Content Area Pooled',
          hours: c.learning_hours,
          difficulty: c.difficulty_level
        }))
      };
    });

    const prompt = `
Act as an expert Nepal Curriculum Architect and Education Planner.
Generate an intelligent, highly personalized, and balanced study plan for a student preparing for:
Examination: ${exam ? exam.name : examSlug} (${exam ? exam.nepali_title : ''})
Authority: ${exam ? exam.authority : 'National Curriculum Board'}
Target Exam Date: ${targetDate}
Available Daily Study Hours: ${dailyHours || 3} hours/day
Current Preparation Level: ${prepLevel || 'Intermediate'}
Target Goal: ${targetGrade || 'A+ (3.6+ GPA) / Top 10% Rank'}

Official Syllabus Context:
${JSON.stringify(curriculumOverview, null, 2)}

Requirements for Output (respond ONLY with valid JSON):
{
  "summary": "Concise strategy overview in English and Nepali",
  "weekly_distribution": {
    "Monday": "Subjects and focus areas",
    "Tuesday": "...",
    "Wednesday": "...",
    "Thursday": "...",
    "Friday": "...",
    "Saturday": "Mock Test and Revision",
    "Sunday": "Weekly review and weak topic drill"
  },
  "monthly_milestones": [
    { "phase": "Month 1 (Core Concepts)", "objective": "...", "target_chapters": ["..."] },
    { "phase": "Month 2 (Practice & Numerical)", "objective": "...", "target_chapters": ["..."] },
    { "phase": "Month 3 (Revision & Model Tests)", "objective": "...", "target_chapters": ["..."] }
  ],
  "daily_tasks": [
    {
      "day_number": 1,
      "date": "${new Date().toISOString().split('T')[0]}",
      "subject_id": ${targetSubjects[0]?.id || 1},
      "subject_name": "${targetSubjects[0]?.name || 'Core'}",
      "chapter_id": ${targetSubjects[0]?.chapters?.[0]?.id || 1},
      "title": "Study foundational concepts & definitions",
      "duration_minutes": ${Math.round((dailyHours || 3) * 60 * 0.5)},
      "session_type": "learn",
      "advice": "Read official textbook theory and note definitions"
    },
    {
      "day_number": 1,
      "date": "${new Date().toISOString().split('T')[0]}",
      "subject_id": ${targetSubjects[0]?.id || 1},
      "subject_name": "${targetSubjects[0]?.name || 'Core'}",
      "chapter_id": ${targetSubjects[0]?.chapters?.[0]?.id || 1},
      "title": "Solve 10 chapter MCQs & practice numericals",
      "duration_minutes": ${Math.round((dailyHours || 3) * 60 * 0.5)},
      "session_type": "practice",
      "advice": "Review incorrect answers and write formulas"
    }
  ],
  "revision_schedule": [
    { "week": "Every Sunday", "activity": "Solve 1 past specification grid question paper under timed conditions" },
    { "week": "15 Days before Exam", "activity": "Complete comprehensive flashcard review and formula sheets" }
  ],
  "high_priority_chapters": [
    "List of highest marks chapters based on the official specification grid"
  ]
}
`;

    let generatedPlan = await callGemini(
      prompt,
      'You are ExamSetu Nepal AI Study Guidance Engine. You always prioritize the official CDC/NEB/PSC specification grid marks and realistic pacing.',
      true
    );

    // Fallback template if Gemini is offline
    if (!generatedPlan || !generatedPlan.daily_tasks) {
      generatedPlan = {
        summary: `Tailored study roadmap for ${exam ? exam.name : examSlug} targeting ${targetGrade || 'A+ (3.6+ GPA)'} with ${dailyHours || 3} hours daily.`,
        weekly_distribution: {
          Monday: 'Mathematics & Science concept learning',
          Tuesday: 'Nepali & English literature and grammar practice',
          Wednesday: 'Social Studies, Civics & Governance analysis',
          Thursday: 'Quantitative reasoning & Numerical problem solving',
          Friday: 'Short-answer and long-answer descriptive writing',
          Saturday: 'Full Model Question Paper under timed conditions',
          Sunday: 'Weak topic review, flashcards, and error analysis'
        },
        monthly_milestones: [
          { phase: 'Phase 1: Syllabus Mastery', objective: 'Complete all theoretical lessons and create concise revision notes.' },
          { phase: 'Phase 2: Intensive Practice', objective: 'Practice 25 questions per chapter and tackle high-yield numericals.' },
          { phase: 'Phase 3: Board Exam Simulation', objective: 'Attempt full 3-hour model examinations complying with the official specification grid.' }
        ],
        daily_tasks: [
          {
            day_number: 1,
            date: new Date().toISOString().split('T')[0],
            subject_id: targetSubjects[0]?.id || 1,
            subject_name: targetSubjects[0]?.name || 'Core Subject',
            chapter_id: 1,
            title: `Learn ${targetSubjects[0]?.name || 'Subject'} Chapter 1 Key Concepts`,
            duration_minutes: 60,
            session_type: 'learn',
            advice: 'Study official CDC textbook definitions and derive essential formulas.'
          },
          {
            day_number: 1,
            date: new Date().toISOString().split('T')[0],
            subject_id: targetSubjects[0]?.id || 1,
            subject_name: targetSubjects[0]?.name || 'Core Subject',
            chapter_id: 1,
            title: `Solve 15 Specification Grid MCQs & Short Questions`,
            duration_minutes: 60,
            session_type: 'practice',
            advice: 'Self-evaluate against model answer keys and record error patterns.'
          }
        ],
        revision_schedule: [
          { week: 'Weekly', activity: 'Take a timed 50-mark model paper every Saturday' },
          { week: 'Monthly', activity: 'Review marked and bookmarked questions in student notebook' }
        ],
        high_priority_chapters: [
          'Compulsory Mathematics: Geometry (18 Marks) & Algebra (14 Marks)',
          'Science & Technology: Living World / Biology (18 Marks) & Energy (13 Marks)'
        ]
      };
    }

    // Persist into database
    const saved = CurriculumDB.saveStudyPlan(
      user.id, examSlug, targetDate, Number(dailyHours) || 3.0,
      prepLevel || 'Intermediate', targetGrade || 'A+ (3.6+)', generatedPlan
    );

    res.json({
      success: true,
      message: 'AI Personalized Study Plan created successfully!',
      planId: saved.planId,
      plan: generatedPlan
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get currently active study plan
router.get('/planner/current', (req, res) => {
  try {
    const user = getActiveUser(req);
    const examSlug = req.query.exam || 'see';
    const plan = CurriculumDB.getActiveStudyPlan(user.id, examSlug);
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark scheduled study session as completed
router.post('/planner/session/:id/complete', (req, res) => {
  try {
    const user = getActiveUser(req);
    const updated = CurriculumDB.completeStudySession(Number(req.params.id), user.id);
    if (updated && updated.chapter_id) {
      CurriculumDB.updateChapterProgress(user.id, updated.chapter_id, updated.subject_id, 'Practicing');
    }
    res.json({ success: true, message: 'Session completed!', session: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 7: AI TUTOR (EXPLAIN, SOCRATIC HINTS, ANSWER CHECKER, FLASHCARDS)
// =============================================================================

// Explain chapter in simple English & Nepali
router.post('/tutor/explain', async (req, res) => {
  try {
    const { chapterId, topicTitle, language } = req.body;
    if (!chapterId) {
      return res.status(400).json({ success: false, message: 'Chapter ID is required.' });
    }

    const analysis = CurriculumDB.getChapterMarksAnalysis(Number(chapterId));
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const ch = analysis.chapter;
    const prompt = `
You are the official ExamSetu Nepal AI Tutor. Teach the following chapter from the Nepal National Curriculum:
Subject: ${ch.subject_name} (${ch.subject_nepali_name})
Chapter ${ch.chapter_no}: ${ch.title_en} (${ch.title_np})
Content Area: ${ch.content_area}
Official Marks Weight: ${analysis.official.value ? analysis.official.value + ' Marks' : 'Official pooled marks'}
Language Preference: ${language || 'both (Nepali and English)'}

Provide a comprehensive, pedagogical, student-friendly explanation:
1. Executive Summary: What is this chapter about in simple terms?
2. Step-by-Step Concepts: Break down key ideas with Nepali cultural & real-world examples.
3. Essential Formulas & Principles: High-yield points to memorize for the board exam.
4. Model Solved Example: One typical question from the official specification grid with full step-by-step solution.
5. Common Pitfalls / Don'ts: Mistakes students commonly make in this chapter.
6. 3 Quick Check Questions: For the student to test their understanding immediately.
`;

    const explanation = await callGemini(
      prompt,
      'You are a patient, encouraging, and authoritative Nepalese high-school and civil service teacher. You use clear formatting with headers, bullet points, and dual English/Nepali terms.'
    );

    res.json({
      success: true,
      chapter: {
        title_en: ch.title_en,
        title_np: ch.title_np,
        subject_name: ch.subject_name
      },
      explanation: explanation || `### ${ch.title_en} (${ch.title_np})\n\nThis chapter carries **${analysis.official.value || 10} marks** in the official specification grid.\n\nKey Concepts:\n- Review fundamental definitions and formulas from your official CDC textbook.\n- Practice solving previous year board questions under this content area.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Socratic AI Tutor Chat (Hints, step-by-step guidance)
router.post('/tutor/chat', async (req, res) => {
  try {
    const user = getActiveUser(req);
    const { chapterId, userMessage, mode, conversationHistory } = req.body;

    let context = 'Nepal National Curriculum and Competitive Examination Prep.';
    if (chapterId) {
      const analysis = CurriculumDB.getChapterMarksAnalysis(Number(chapterId));
      if (analysis) {
        context = `Subject: ${analysis.chapter.subject_name}, Chapter: ${analysis.chapter.title_en} (${analysis.chapter.title_np}), Content Area: ${analysis.chapter.content_area}`;
      }
    }

    const isHintMode = mode === 'hint';
    const systemPrompt = `
You are the ExamSetu Nepal AI Personal Tutor.
Current Student Context: ${context}
Student Name: ${user.name}

Guidelines:
${isHintMode ? 'IMPORTANT: SOCRATIC HINT MODE IS ACTIVE. Do NOT reveal the direct answer immediately. Give a subtle, illuminating clue or ask a guiding question that helps the student deduce the correct answer themselves.' : 'Provide clear, concise, accurate explanations aligned with Nepal CDC/NEB/PSC curriculum.'}
Support both Nepali (देवनागरी) and English.
`;

    const fullPrompt = `
Conversation History:
${JSON.stringify(conversationHistory || [], null, 2)}

Student's Latest Message:
${userMessage}
`;

    const reply = await callGemini(fullPrompt, systemPrompt);

    res.json({
      success: true,
      reply: reply || (isHintMode
        ? '💡 Hint: Think about the fundamental formula connecting these two variables. What happens when the independent variable increases?'
        : 'I am here to guide your study. Please review this topic in your official textbook, or ask me for a step-by-step example!')
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Check student's written/subjective answer
router.post('/tutor/check-answer', async (req, res) => {
  try {
    const { question, studentAnswer, maxMarks, chapterId } = req.body;
    if (!question || !studentAnswer) {
      return res.status(400).json({ success: false, message: 'Question and student answer are required.' });
    }

    const prompt = `
Act as an official NEB / CDC Board Examiner in Nepal.
Evaluate the following student answer against standard marking criteria:

Question: ${question}
Full Marks: ${maxMarks || 5} Marks
Student's Written Answer:
"""
${studentAnswer}
"""

Evaluate and respond ONLY in valid JSON:
{
  "marks_awarded": 3.5,
  "max_marks": ${maxMarks || 5},
  "overall_verdict": "Good attempt / Needs improvement / Excellent",
  "strengths": ["Clear definition", "Correct terminology used"],
  "missing_points": ["Did not mention the required exception", "Lacks a diagram or mathematical derivation"],
  "model_answer": "Complete ideal answer that would score full marks",
  "actionable_feedback": "Specific advice to score 100% marks on this question"
}
`;

    const evaluation = await callGemini(
      prompt,
      'You are a strict but constructive national board examiner in Nepal. Score accurately according to curriculum specification grid.',
      true
    );

    res.json({
      success: true,
      evaluation: evaluation || {
        marks_awarded: Math.round((maxMarks || 5) * 0.7),
        max_marks: maxMarks || 5,
        overall_verdict: 'Good effort',
        strengths: ['Identified the core concept', 'Relevant terminology included'],
        missing_points: ['Include specific statutory provisions or formula derivations'],
        model_answer: 'Ensure complete explanation with labeled diagrams and step-by-step logic.',
        actionable_feedback: 'Practice writing within the allocated time limit.'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate chapter revision notes, flashcards & summaries
router.post('/tutor/notes', async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId) {
      return res.status(400).json({ success: false, message: 'Chapter ID is required.' });
    }

    const analysis = CurriculumDB.getChapterMarksAnalysis(Number(chapterId));
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const ch = analysis.chapter;
    const prompt = `
Generate high-yield revision notes and flashcards for:
Subject: ${ch.subject_name}
Chapter ${ch.chapter_no}: ${ch.title_en} (${ch.title_np})
Official Specification Marks: ${analysis.official.value || 'Curriculum unit'} Marks

Respond ONLY in valid JSON:
{
  "chapter_summary": "150-word concise high-yield summary",
  "key_formulas_and_dates": [
    { "term": "...", "detail": "..." }
  ],
  "flashcards": [
    { "question": "Front of card (Question / Term)", "answer": "Back of card (Concise Answer / Definition)" },
    { "question": "Front of card", "answer": "Back of card" },
    { "question": "Front of card", "answer": "Back of card" },
    { "question": "Front of card", "answer": "Back of card" },
    { "question": "Front of card", "answer": "Back of card" }
  ],
  "expected_exam_questions": [
    "Predict 3 questions that commonly appear from this chapter"
  ]
}
`;

    const notes = await callGemini(
      prompt,
      'You are ExamSetu Nepal Revision Specialist. Output strict JSON with bilingual English/Nepali concepts.',
      true
    );

    res.json({
      success: true,
      chapter: { title_en: ch.title_en, title_np: ch.title_np },
      notes: notes || {
        chapter_summary: `Summary of ${ch.title_en}: Key content area covers fundamental principles and problem solving for board examinations.`,
        key_formulas_and_dates: [
          { term: 'Core Definition', detail: 'Refer to official textbook definitions.' }
        ],
        flashcards: [
          { question: `What is the central concept of ${ch.title_en}?`, answer: 'The foundational principle defined in the official curriculum.' },
          { question: 'What is the full mark weighting of this chapter?', answer: `${analysis.official.value || 10} Marks.` }
        ],
        expected_exam_questions: [
          `Explain the key principles of ${ch.title_en} with practical examples.`
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 8: SMART QUESTION GENERATOR (SPECIFICATION GRID COMPLIANT)
// =============================================================================

router.post('/questions/generate-smart', async (req, res) => {
  try {
    const { subjectId, chapterId, count, examType } = req.body;
    const qCount = [10, 25, 50, 'full'].includes(count) ? count : 10;

    let subjectName = 'Compulsory Mathematics';
    let chapterName = 'All Chapters';
    let examSlug = 'see';

    if (subjectId) {
      const s = CurriculumDB.getSubjectById(Number(subjectId));
      if (s) {
        subjectName = s.name;
        examSlug = s.exam_slug;
      }
    }

    if (chapterId) {
      const analysis = CurriculumDB.getChapterMarksAnalysis(Number(chapterId));
      if (analysis) {
        chapterName = analysis.chapter.title_en;
        subjectName = analysis.chapter.subject_name;
      }
    }

    const prompt = `
Generate a strict specification-grid-compliant test for Nepalese students:
Examination: ${examSlug}
Subject: ${subjectName}
Chapter: ${chapterName}
Question Count: ${qCount === 'full' ? 25 : qCount} Questions

Requirements:
- Questions must follow the official CDC / NEB / PSC cognitive weights:
  * 20% Knowledge
  * 30% Understanding
  * 30% Application
  * 20% Higher Ability
- Multiple Choice Questions with 4 realistic distractors (A, B, C, D)
- Accurate Nepali and English context where appropriate
- Detailed pedagogical explanation for why the correct option is right

Respond ONLY in valid JSON array of objects:
[
  {
    "question": "Clear question text",
    "option_a": "Option A",
    "option_b": "Option B",
    "option_c": "Option C",
    "option_d": "Option D",
    "correct_answer": "A",
    "cognitive_level": "Application",
    "marks": 1,
    "explanation": "Detailed explanation citing official curriculum principles"
  }
]
`;

    const generated = await callGemini(
      prompt,
      'You are ExamSetu Nepal National Examination Paper Creator. Generate rigorous, error-free questions complying with the official specification grid.',
      true
    );

    const questionsList = Array.isArray(generated) ? generated : [
      {
        question: `According to the official curriculum of ${subjectName}, which statement regarding ${chapterName} is correct?`,
        option_a: 'It complies with the official national specification grid standards.',
        option_b: 'It is excluded from final board evaluations.',
        option_c: 'It only tests rote memorization without application.',
        option_d: 'It does not require practical or internal assessment.',
        correct_answer: 'A',
        cognitive_level: 'Understanding',
        marks: 1,
        explanation: 'The official curriculum mandates strict adherence to the national specification grid and cognitive domain balance.'
      }
    ];

    res.json({
      success: true,
      subjectName,
      chapterName,
      count: questionsList.length,
      questions: questionsList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// MODULE 10: ADMIN CURRICULUM & VERIFICATION MANAGEMENT
// =============================================================================

// List all official documents
router.get('/admin/documents', (req, res) => {
  try {
    const docs = CurriculumDB.getAllSourceDocuments(req.query.exam || null);
    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register new official document
router.post('/admin/documents', (req, res) => {
  try {
    const { exam_slug, title, authority, official_url, document_type, academic_year, verification_status, notes } = req.body;
    if (!exam_slug || !title || !authority || !official_url) {
      return res.status(400).json({ success: false, message: 'Exam slug, title, authority, and official URL are required.' });
    }

    const docId = CurriculumDB.addSourceDocument({
      exam_slug,
      title,
      authority,
      official_url,
      document_type,
      academic_year,
      verification_status: verification_status || 'verified',
      verified_by: req.session?.user?.name || 'Administrator',
      notes
    });

    res.json({ success: true, message: 'Source document added successfully.', docId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin edit chapter details & marks
router.put('/admin/chapters/:id', (req, res) => {
  try {
    const chapterId = Number(req.params.id);
    const updated = CurriculumDB.updateChapter(chapterId, req.body);
    res.json({ success: true, message: 'Chapter details updated.', chapter: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
