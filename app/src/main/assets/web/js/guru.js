/**
 * EXAMSETU NEPAL - AI TUTOR & CURRICULUM TEACHING ENGINE (MODULE 7)
 * Implements:
 * - Step-by-step chapter teaching with real-world examples & CDC guidelines
 * - Socratic hint mode (clues instead of direct answers)
 * - Written / subjective answer checker (Board examiner grading rubric)
 * - Flashcards & high-yield summary modal
 * - Smart specification grid chapter MCQ drill
 */

const TutorEngine = {
  currentExam: 'see',
  currentSubject: null,
  currentChapter: null,
  hintModeActive: false,
  subjectsCache: {},

  async init() {
    await this.loadSubjectsForExam(this.currentExam);
  },

  async onExamChange() {
    const examSelect = document.getElementById('tutorExamSelect');
    if (!examSelect) return;
    this.currentExam = examSelect.value;
    await this.loadSubjectsForExam(this.currentExam);
  },

  async loadSubjectsForExam(examSlug) {
    const subSelect = document.getElementById('tutorSubjectSelect');
    const chSelect = document.getElementById('tutorChapterSelect');
    if (!subSelect) return;

    subSelect.innerHTML = '<option value="">Loading official subjects...</option>';
    chSelect.innerHTML = '<option value="">Select Chapter</option>';

    try {
      const res = await fetch(`/api/curriculum/exams/${examSlug}/subjects`);
      const data = await res.json();
      if (!data.success || !data.subjects || data.subjects.length === 0) {
        subSelect.innerHTML = '<option value="">No subjects found</option>';
        return;
      }

      this.subjectsCache[examSlug] = data.subjects;
      subSelect.innerHTML = data.subjects.map(s => `
        <option value="${s.id}">${escapeHTML(s.name)} (${s.code || ''})</option>
      `).join('');

      this.currentSubject = data.subjects[0].id;
      await this.onSubjectChange();
    } catch (err) {
      console.warn('Error loading subjects:', err);
      subSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
  },

  async onSubjectChange() {
    const subSelect = document.getElementById('tutorSubjectSelect');
    const chSelect = document.getElementById('tutorChapterSelect');
    if (!subSelect || !chSelect) return;

    const subjectId = subSelect.value;
    if (!subjectId) return;
    this.currentSubject = subjectId;

    chSelect.innerHTML = '<option value="">Loading chapters...</option>';

    try {
      const res = await fetch(`/api/curriculum/subjects/${subjectId}`);
      const data = await res.json();
      if (!data.success || !data.subject || !data.subject.chapters || data.subject.chapters.length === 0) {
        chSelect.innerHTML = '<option value="">No chapters registered</option>';
        return;
      }

      chSelect.innerHTML = data.subject.chapters.map(c => `
        <option value="${c.id}">Ch ${c.chapter_no}: ${escapeHTML(c.title_en)}</option>
      `).join('');

      this.currentChapter = data.subject.chapters[0].id;
    } catch (err) {
      console.warn('Error loading chapters:', err);
      chSelect.innerHTML = '<option value="">Error loading chapters</option>';
    }
  },

  onChapterChange() {
    const chSelect = document.getElementById('tutorChapterSelect');
    if (chSelect) {
      this.currentChapter = chSelect.value;
    }
  },

  // 1. STEP-BY-STEP CHAPTER TEACHING (MODULE 7)
  async teachChapterStepByStep() {
    if (!this.currentChapter) {
      ExamSetu.showToast('Please select a subject and chapter first.', 'warning');
      return;
    }

    const btn = document.getElementById('modeExplainBtn');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Preparing Lesson...';
    }

    const container = document.getElementById('guruMessagesContainer');
    // Add user action to chat
    const chSelect = document.getElementById('tutorChapterSelect');
    const chText = chSelect.options[chSelect.selectedIndex]?.text || 'this chapter';
    this.appendUserMessage(`Explain ${chText} step-by-step according to the official Nepal curriculum.`);

    // Add loading placeholder
    const loadingId = 'loading-lesson-' + Date.now();
    this.appendAiThinking(loadingId, 'Exam Guru is synthesizing official CDC concepts, formulas, and model examples...');

    try {
      const res = await fetch('/api/curriculum/tutor/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: this.currentChapter,
          language: 'both (Nepali and English)'
        })
      });
      const data = await res.json();
      this.removeElement(loadingId);

      if (data.success && data.explanation) {
        this.appendAiLesson(data.chapter, data.explanation);
      } else {
        throw new Error(data.message || 'Unable to generate chapter lesson.');
      }
    } catch (err) {
      this.removeElement(loadingId);
      ExamSetu.showToast(err.message, 'danger');
      this.appendAiMessage(`⚠️ **Lesson Note:** ${escapeHTML(err.message)}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    }
  },

  // 2. SOCRATIC HINT MODE TOGGLE
  toggleSocraticHintMode() {
    this.hintModeActive = !this.hintModeActive;
    const label = document.getElementById('hintBtnLabel');
    const btn = document.getElementById('modeHintBtn');
    if (this.hintModeActive) {
      if (label) label.textContent = '💡 Socratic Hints: ON';
      if (btn) btn.className = 'btn btn-primary btn-sm';
      ExamSetu.showToast('Socratic Hint Mode enabled: Guru will guide you with clues without spoiling direct answers.', 'info');
      this.appendAiMessage(`💡 **Socratic Hint Mode is now ACTIVE!**\n\nWhen you ask questions or submit problems, I will provide clues, thought frameworks, and leading questions to help you solve it yourself!`);
    } else {
      if (label) label.textContent = '💡 Socratic Hints: OFF';
      if (btn) btn.className = 'btn btn-secondary btn-sm';
      ExamSetu.showToast('Socratic Hint Mode disabled. Standard explanations restored.', 'info');
    }
  },

  // 3. WRITTEN ANSWER GRADER MODAL
  openAnswerGraderModal() {
    const existing = document.getElementById('answerGraderModal');
    if (existing) existing.remove();

    const chSelect = document.getElementById('tutorChapterSelect');
    const chText = chSelect?.options[chSelect.selectedIndex]?.text || 'Selected Topic';

    const modal = document.createElement('div');
    modal.id = 'answerGraderModal';
    modal.className = 'modal-backdrop active';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:680px;width:95%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;background:linear-gradient(135deg, #16a34a, #15803d);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">
              <i class="ri-edit-line"></i>
            </div>
            <div>
              <h3 style="margin:0;font-size:1.2rem;font-weight:800;">Board Examiner Answer Grader</h3>
              <span style="font-size:0.75rem;color:var(--muted-text);">${escapeHTML(chText)} • CDC / NEB Marking Rubric</span>
            </div>
          </div>
          <button onclick="document.getElementById('answerGraderModal').remove()" style="background:transparent;border:none;font-size:1.4rem;color:var(--muted-text);cursor:pointer;">&times;</button>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:0.82rem;font-weight:700;display:block;margin-bottom:4px;">Examination Question:</label>
          <input type="text" id="graderQuestionInput" class="form-input" placeholder="e.g. Differentiate between mass and weight with formula and SI units." value="Differentiate between mass and weight with appropriate SI units and formula.">
        </div>

        <div style="display:flex;gap:12px;margin-bottom:14px;">
          <div style="flex:1;">
            <label style="font-size:0.82rem;font-weight:700;display:block;margin-bottom:4px;">Full Marks:</label>
            <select id="graderMaxMarks" class="form-input">
              <option value="2">2 Marks (Short Answer)</option>
              <option value="4" selected>4 Marks (Standard Question)</option>
              <option value="5">5 Marks (Long Answer)</option>
              <option value="10">10 Marks (Lok Sewa / Board Subjective)</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:0.82rem;font-weight:700;display:block;margin-bottom:4px;">Your Written Answer (Type or paste your response):</label>
          <textarea id="graderStudentAnswer" class="form-input" rows="5" placeholder="Write your full answer here in English or Nepali..." style="line-height:1.5;font-size:0.9rem;">Mass is the total amount of matter present in an object. It is measured in kilograms (kg) and remains constant everywhere. Weight is the gravitational force exerted on an object. It is given by W = mg, measured in Newtons (N), and changes depending on gravity.</textarea>
        </div>

        <div id="graderResultBox" style="display:none;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
          <!-- Evaluated output will appear here -->
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('answerGraderModal').remove()">Close</button>
          <button id="graderSubmitBtn" class="btn btn-primary" onclick="TutorEngine.submitAnswerForGrading()">
            <i class="ri-check-double-line"></i> Evaluate with Official Rubric
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async submitAnswerForGrading() {
    const qInput = document.getElementById('graderQuestionInput');
    const aInput = document.getElementById('graderStudentAnswer');
    const marksSelect = document.getElementById('graderMaxMarks');
    const btn = document.getElementById('graderSubmitBtn');
    const resultBox = document.getElementById('graderResultBox');

    const question = qInput?.value.trim();
    const studentAnswer = aInput?.value.trim();
    const maxMarks = Number(marksSelect?.value || 4);

    if (!question || !studentAnswer) {
      ExamSetu.showToast('Please provide both question and answer.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Grading with NEB / CDC Criteria...';
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted-text);"><i class="ri-loader-4-line ri-spin" style="font-size:1.4rem;"></i> Comparing with official marking scheme...</div>';

    try {
      const res = await fetch('/api/curriculum/tutor/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          studentAnswer,
          maxMarks,
          chapterId: this.currentChapter
        })
      });

      const data = await res.json();
      if (!data.success || !data.evaluation) throw new Error(data.message || 'Grading failed');

      const ev = data.evaluation;
      const pct = Math.round((ev.marks_awarded / ev.max_marks) * 100);
      const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

      resultBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--muted-text);text-transform:uppercase;">Evaluated Score</div>
            <div style="font-size:1.8rem;font-weight:900;color:${color};line-height:1.1;">
              ${ev.marks_awarded} / ${ev.max_marks} Marks <span style="font-size:0.9rem;font-weight:700;">(${pct}%)</span>
            </div>
          </div>
          <span class="tag-badge" style="background:${color}20;color:${color};font-weight:800;font-size:0.85rem;">
            ${escapeHTML(ev.overall_verdict || 'Evaluated')}
          </span>
        </div>

        <div style="margin-bottom:10px;">
          <strong style="font-size:0.82rem;color:var(--success);"><i class="ri-checkbox-circle-fill"></i> Strengths:</strong>
          <ul style="margin:4px 0 8px 20px;font-size:0.85rem;color:var(--text);">
            ${(ev.strengths || []).map(s => `<li>${escapeHTML(s)}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-bottom:10px;">
          <strong style="font-size:0.82rem;color:#dc2626;"><i class="ri-error-warning-fill"></i> Missing Key Points / Inaccuracies:</strong>
          <ul style="margin:4px 0 8px 20px;font-size:0.85rem;color:var(--text);">
            ${(ev.missing_points || []).map(m => `<li>${escapeHTML(m)}</li>`).join('')}
          </ul>
        </div>

        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:10px;">
          <strong style="font-size:0.8rem;color:var(--primary);display:block;margin-bottom:2px;"><i class="ri-award-fill"></i> Ideal Model Answer:</strong>
          <p style="font-size:0.82rem;color:var(--text);margin:0;line-height:1.45;">${escapeHTML(ev.model_answer || '')}</p>
        </div>

        <div style="font-size:0.8rem;color:var(--muted-text);font-style:italic;">
          💡 <strong>Examiner's Tip:</strong> ${escapeHTML(ev.actionable_feedback || '')}
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = `<div style="color:var(--danger);font-size:0.85rem;">Evaluation error: ${escapeHTML(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ri-check-double-line"></i> Re-Evaluate Answer';
    }
  },

  // 4. FLASHCARDS & HIGH-YIELD NOTES MODAL
  async generateFlashcards() {
    if (!this.currentChapter) {
      ExamSetu.showToast('Please select a chapter first.', 'warning');
      return;
    }

    const btn = document.getElementById('modeFlashcardsBtn');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Generating Cards...';
    }

    try {
      const res = await fetch('/api/curriculum/tutor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: this.currentChapter })
      });
      const data = await res.json();
      if (!data.success || !data.notes) throw new Error(data.message || 'Could not generate flashcards');

      this.renderFlashcardsModal(data.chapter, data.notes);
    } catch (err) {
      ExamSetu.showToast(err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    }
  },

  renderFlashcardsModal(chapter, notes) {
    const existing = document.getElementById('flashcardsModal');
    if (existing) existing.remove();

    const flashcards = notes.flashcards || [];
    let currentIdx = 0;

    const modal = document.createElement('div');
    modal.id = 'flashcardsModal';
    modal.className = 'modal-backdrop active';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:680px;width:95%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;background:linear-gradient(135deg, #9333ea, #7e22ce);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">
              <i class="ri-file-list-3-line"></i>
            </div>
            <div>
              <h3 style="margin:0;font-size:1.2rem;font-weight:800;">Flashcards &amp; Revision Notes</h3>
              <span style="font-size:0.75rem;color:var(--muted-text);">${escapeHTML(chapter.title_en)} (${escapeHTML(chapter.title_np || '')})</span>
            </div>
          </div>
          <button onclick="document.getElementById('flashcardsModal').remove()" style="background:transparent;border:none;font-size:1.4rem;color:var(--muted-text);cursor:pointer;">&times;</button>
        </div>

        <!-- 150-word Chapter Summary -->
        <div style="background:rgba(147, 51, 234, 0.08);border:1px solid rgba(147, 51, 234, 0.25);border-radius:var(--radius-md);padding:14px;margin-bottom:18px;">
          <strong style="font-size:0.82rem;color:#9333ea;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">
            <i class="ri-booklet-line"></i> 150-Word Chapter Summary
          </strong>
          <p style="font-size:0.88rem;color:var(--text);line-height:1.5;margin:0;">
            ${escapeHTML(notes.chapter_summary || '')}
          </p>
        </div>

        <!-- Interactive Flip Flashcard -->
        <div style="text-align:center;margin-bottom:16px;">
          <div id="flashcardElement" onclick="TutorEngine.flipFlashcard()" style="min-height:170px;background:var(--surface);border:2px dashed var(--primary);border-radius:var(--radius-lg);padding:24px 20px;display:flex;flex-direction:column;justify-content:center;align-items:center;cursor:pointer;box-shadow:var(--shadow-sm);transition:transform 0.3s ease;">
            <span id="fcSideLabel" style="font-size:0.72rem;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
              CARD 1 / ${flashcards.length} • TAP TO REVEAL ANSWER
            </span>
            <div id="fcContentText" style="font-size:1.15rem;font-weight:700;color:var(--text);line-height:1.4;">
              ${escapeHTML(flashcards[0]?.question || 'No card available')}
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <button class="btn btn-secondary btn-sm" onclick="TutorEngine.prevFlashcard()">
            <i class="ri-arrow-left-line"></i> Previous Card
          </button>
          <span id="fcCounter" style="font-size:0.82rem;font-weight:700;color:var(--muted-text);">Card 1 of ${flashcards.length}</span>
          <button class="btn btn-primary btn-sm" onclick="TutorEngine.nextFlashcard()">
            Next Card <i class="ri-arrow-right-line"></i>
          </button>
        </div>

        <div style="display:flex;justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="document.getElementById('flashcardsModal').remove()">Done Reviewing</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._cards = flashcards;
    this._cardIdx = 0;
    this._cardFlipped = false;
  },

  flipFlashcard() {
    if (!this._cards || this._cards.length === 0) return;
    this._cardFlipped = !this._cardFlipped;
    const sideLabel = document.getElementById('fcSideLabel');
    const textEl = document.getElementById('fcContentText');
    const cardEl = document.getElementById('flashcardElement');
    const current = this._cards[this._cardIdx];

    if (this._cardFlipped) {
      if (sideLabel) sideLabel.textContent = `CARD ${this._cardIdx + 1} / ${this._cards.length} • ANSWER (TAP TO FLIP BACK)`;
      if (textEl) {
        textEl.textContent = current.answer;
        textEl.style.color = 'var(--primary)';
      }
      if (cardEl) cardEl.style.borderColor = 'var(--success)';
    } else {
      if (sideLabel) sideLabel.textContent = `CARD ${this._cardIdx + 1} / ${this._cards.length} • TAP TO REVEAL ANSWER`;
      if (textEl) {
        textEl.textContent = current.question;
        textEl.style.color = 'var(--text)';
      }
      if (cardEl) cardEl.style.borderColor = 'var(--primary)';
    }
  },

  nextFlashcard() {
    if (!this._cards || this._cards.length === 0) return;
    this._cardIdx = (this._cardIdx + 1) % this._cards.length;
    this._cardFlipped = false;
    this.updateFlashcardView();
  },

  prevFlashcard() {
    if (!this._cards || this._cards.length === 0) return;
    this._cardIdx = (this._cardIdx - 1 + this._cards.length) % this._cards.length;
    this._cardFlipped = false;
    this.updateFlashcardView();
  },

  updateFlashcardView() {
    const sideLabel = document.getElementById('fcSideLabel');
    const textEl = document.getElementById('fcContentText');
    const counter = document.getElementById('fcCounter');
    const cardEl = document.getElementById('flashcardElement');
    const current = this._cards[this._cardIdx];

    if (counter) counter.textContent = `Card ${this._cardIdx + 1} of ${this._cards.length}`;
    if (sideLabel) sideLabel.textContent = `CARD ${this._cardIdx + 1} / ${this._cards.length} • TAP TO REVEAL ANSWER`;
    if (textEl) {
      textEl.textContent = current.question;
      textEl.style.color = 'var(--text)';
    }
    if (cardEl) cardEl.style.borderColor = 'var(--primary)';
  },

  // 5. SMART CHAPTER DRILL (SPECIFICATION GRID COMPLIANT)
  async generateSmartMcqs() {
    if (!this.currentChapter) {
      ExamSetu.showToast('Please select a chapter first.', 'warning');
      return;
    }

    const btn = document.getElementById('modeSmartMcqBtn');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Assembling Grid MCQs...';
    }

    try {
      const res = await fetch('/api/curriculum/questions/generate-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: this.currentSubject,
          chapterId: this.currentChapter,
          count: 5
        })
      });
      const data = await res.json();
      if (!data.success || !data.questions) throw new Error(data.message || 'Could not generate questions');

      this.renderSmartDrillModal(data.chapterName, data.questions);
    } catch (err) {
      ExamSetu.showToast(err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    }
  },

  renderSmartDrillModal(chapterName, questions) {
    const existing = document.getElementById('smartDrillModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'smartDrillModal';
    modal.className = 'modal-backdrop active';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:760px;width:95%;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;position:sticky;top:0;background:var(--surface);padding-bottom:10px;border-bottom:1px solid var(--border);z-index:2;">
          <div>
            <h3 style="margin:0;font-size:1.25rem;font-weight:800;">Specification Grid MCQ Drill</h3>
            <span style="font-size:0.75rem;color:var(--muted-text);">${escapeHTML(chapterName)} • 5 Questions Balanced by Cognitive Levels</span>
          </div>
          <button onclick="document.getElementById('smartDrillModal').remove()" style="background:transparent;border:none;font-size:1.4rem;color:var(--muted-text);cursor:pointer;">&times;</button>
        </div>

        <div id="smartDrillItems">
          ${questions.map((q, idx) => `
            <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:0.75rem;font-weight:800;color:var(--primary);text-transform:uppercase;">Question ${idx + 1} of ${questions.length}</span>
                <span class="tag-badge tag-badge-primary" style="font-size:0.7rem;">${escapeHTML(q.cognitive_level || 'Understanding')}</span>
              </div>
              <p style="font-size:0.95rem;font-weight:700;margin-bottom:12px;color:var(--text);">${escapeHTML(q.question)}</p>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="q-opts-${idx}">
                <button class="btn btn-secondary btn-sm" style="justify-content:flex-start;text-align:left;" onclick="TutorEngine.checkDrillAnswer(${idx}, 'A', '${q.correct_answer}', '${escapeHTML(q.explanation || '')}')">
                  <strong>A.</strong> &nbsp; ${escapeHTML(q.option_a)}
                </button>
                <button class="btn btn-secondary btn-sm" style="justify-content:flex-start;text-align:left;" onclick="TutorEngine.checkDrillAnswer(${idx}, 'B', '${q.correct_answer}', '${escapeHTML(q.explanation || '')}')">
                  <strong>B.</strong> &nbsp; ${escapeHTML(q.option_b)}
                </button>
                <button class="btn btn-secondary btn-sm" style="justify-content:flex-start;text-align:left;" onclick="TutorEngine.checkDrillAnswer(${idx}, 'C', '${q.correct_answer}', '${escapeHTML(q.explanation || '')}')">
                  <strong>C.</strong> &nbsp; ${escapeHTML(q.option_c)}
                </button>
                <button class="btn btn-secondary btn-sm" style="justify-content:flex-start;text-align:left;" onclick="TutorEngine.checkDrillAnswer(${idx}, 'D', '${q.correct_answer}', '${escapeHTML(q.explanation || '')}')">
                  <strong>D.</strong> &nbsp; ${escapeHTML(q.option_d)}
                </button>
              </div>

              <div id="q-feedback-${idx}" style="display:none;margin-top:12px;padding:10px 14px;border-radius:var(--radius-sm);font-size:0.85rem;line-height:1.45;"></div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:16px;">
          <button class="btn btn-primary" onclick="document.getElementById('smartDrillModal').remove()">Finish Practice</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  checkDrillAnswer(qIdx, selected, correct, explanation) {
    const feedback = document.getElementById(`q-feedback-${qIdx}`);
    const optsContainer = document.getElementById(`q-opts-${qIdx}`);
    if (!feedback || !optsContainer) return;

    const isCorrect = selected.toUpperCase() === correct.toUpperCase();
    optsContainer.querySelectorAll('button').forEach(b => b.disabled = true);

    feedback.style.display = 'block';
    if (isCorrect) {
      feedback.style.background = '#dcfce7';
      feedback.style.border = '1px solid #86efac';
      feedback.style.color = '#14532d';
      feedback.innerHTML = `<strong><i class="ri-checkbox-circle-fill"></i> Correct!</strong> Option ${correct} is the right answer.<div style="margin-top:4px;">${explanation}</div>`;
    } else {
      feedback.style.background = '#fee2e2';
      feedback.style.border = '1px solid #fca5a5';
      feedback.style.color = '#7f1d1d';
      feedback.innerHTML = `<strong><i class="ri-close-circle-fill"></i> Incorrect.</strong> You chose Option ${selected}. Correct answer is <strong>Option ${correct}</strong>.<div style="margin-top:4px;">${explanation}</div>`;
    }
  },

  // Helpers for appending to the main chat interface
  appendUserMessage(text) {
    const container = document.getElementById('guruMessagesContainer');
    if (!container) return;
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-msg msg-user';
    userDiv.innerHTML = `
      <div class="chat-avatar"><i class="ri-user-smile-line"></i></div>
      <div class="chat-bubble"><p>${escapeHTML(text)}</p></div>
    `;
    container.appendChild(userDiv);
    container.scrollTop = container.scrollHeight;
  },

  appendAiMessage(markdownText) {
    const container = document.getElementById('guruMessagesContainer');
    if (!container) return;

    let formatted = escapeHTML(markdownText)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    const aiDiv = document.createElement('div');
    aiDiv.className = 'chat-msg msg-ai';
    aiDiv.innerHTML = `
      <div class="chat-avatar"><i class="ri-sparkling-fill"></i></div>
      <div class="chat-bubble"><p>${formatted}</p></div>
    `;
    container.appendChild(aiDiv);
    container.scrollTop = container.scrollHeight;
  },

  appendAiThinking(id, text) {
    const container = document.getElementById('guruMessagesContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.id = id;
    div.className = 'chat-msg msg-ai';
    div.innerHTML = `
      <div class="chat-avatar"><i class="ri-sparkling-fill"></i></div>
      <div class="chat-bubble">
        <p><i class="ri-loader-4-line ri-spin" style="color:var(--primary);"></i> ${escapeHTML(text)}</p>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  appendAiLesson(chapter, lessonText) {
    const container = document.getElementById('guruMessagesContainer');
    if (!container) return;

    let formatted = escapeHTML(lessonText)
      .replace(/^### (.*$)/gim, '<h4 style="font-size:1.05rem;font-weight:800;color:var(--primary);margin:14px 0 6px 0;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="font-size:1.15rem;font-weight:900;color:var(--primary);margin:16px 0 8px 0;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    const aiDiv = document.createElement('div');
    aiDiv.className = 'chat-msg msg-ai';
    aiDiv.innerHTML = `
      <div class="chat-avatar"><i class="ri-sparkling-fill"></i></div>
      <div class="chat-bubble" style="max-width:85%;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);">
          <span class="tag-badge tag-badge-primary" style="font-size:0.75rem;">Official Curriculum Lesson</span>
          <strong style="font-size:0.95rem;">${escapeHTML(chapter.title_en)} (${escapeHTML(chapter.title_np || '')})</strong>
        </div>
        <div><p>${formatted}</p></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:8px;border-top:1px solid var(--border);font-size:0.75rem;color:var(--muted-text);">
          <span><i class="ri-shield-check-line" style="color:var(--success);"></i> Verified National Curriculum CDC/NEB Scheme</span>
          <button onclick="speakText('${escapeHTML(chapter.title_en)} lesson generated')" class="tts-btn"><i class="ri-volume-up-line"></i> Listen</button>
        </div>
      </div>
    `;
    container.appendChild(aiDiv);
    container.scrollTop = container.scrollHeight;
  },

  removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
};

window.TutorEngine = TutorEngine;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tutorExamSelect')) {
    TutorEngine.init();
  }
});
