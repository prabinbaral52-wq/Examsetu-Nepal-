// ==========================================================================
// ExamSetu Nepal - Practice Test Engine
// ==========================================================================

const TestEngine = {
  questions: [],
  currentIndex: 0,
  userAnswers: {},       // { [questionId]: "A" | "B" | "C" | "D" }
  flaggedQuestions: {},  // { [questionId]: true }
  timerInterval: null,
  totalSeconds: 1200,    // 20 minutes default
  remainingSeconds: 1200,
  startTime: null,
  examName: 'Lok Sewa',
  subjectName: 'General Knowledge',

  // Initialize Test
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const examParam = urlParams.get('exam') || 'Lok Sewa';
    const subjectParam = urlParams.get('subject') || '';
    const countParam = urlParams.get('count') || '10';

    this.examName = examParam;
    this.subjectName = subjectParam || 'General Practice';

    // Show loading state
    const questionContainer = document.getElementById('questionDisplayArea');
    if (questionContainer) {
      questionContainer.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <i class="ri-loader-4-line ri-spin" style="font-size:3rem;color:var(--primary);"></i>
          <h3 style="margin-top:16px;">Preparing your practice set...</h3>
          <p style="color:var(--muted-text);">Loading questions and setting up timer</p>
        </div>
      `;
    }

    try {
      // Check for local storage backup
      const storageKey = `examsetu_active_${this.examName}_${this.subjectName}`;
      const savedSession = localStorage.getItem(storageKey);

      let testData = null;

      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.questions && parsed.questions.length > 0) {
            testData = parsed;
            this.userAnswers = parsed.userAnswers || {};
            this.flaggedQuestions = parsed.flaggedQuestions || {};
            this.remainingSeconds = parsed.remainingSeconds || (parsed.durationMinutes * 60);
          }
        } catch (e) {
          localStorage.removeItem(storageKey);
        }
      }

      if (!testData) {
        const res = await fetch('/api/tests/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam: this.examName,
            subject: this.subjectName,
            count: countParam
          })
        });
        const data = await res.json();
        if (!data.success || !data.test.questions || data.test.questions.length === 0) {
          if (questionContainer) {
            questionContainer.innerHTML = `
              <div style="text-align:center;padding:40px;">
                <i class="ri-alert-line" style="font-size:3rem;color:var(--warning);"></i>
                <h3 style="margin-top:12px;">No questions found for this selection.</h3>
                <p style="color:var(--muted-text);margin-bottom:20px;">Try another subject or general practice.</p>
                <a href="/exams" class="btn btn-primary">Browse All Exams</a>
              </div>
            `;
          }
          return;
        }

        testData = data.test;
        this.totalSeconds = (testData.durationMinutes || 20) * 60;
        this.remainingSeconds = this.totalSeconds;
      }

      this.questions = testData.questions;
      this.totalSeconds = (testData.durationMinutes || 20) * 60;
      this.startTime = Date.now();

      // Render Header Meta
      const examTitleElem = document.getElementById('testExamTitle');
      if (examTitleElem) {
        examTitleElem.textContent = `${this.examName} - ${this.subjectName}`;
      }

      // Render Palette & First Question
      this.renderPalette();
      this.renderQuestion(0);
      this.startTimer();
      this.bindControls();

      // Save backup on unload
      window.addEventListener('beforeunload', () => {
        this.saveStateToStorage();
      });

    } catch (err) {
      console.error('Error starting test:', err);
      ExamSetu.showToast('Could not load test session.', 'danger');
    }
  },

  // Save current progress to localStorage
  saveStateToStorage() {
    const storageKey = `examsetu_active_${this.examName}_${this.subjectName}`;
    const state = {
      exam: this.examName,
      subject: this.subjectName,
      durationMinutes: Math.ceil(this.totalSeconds / 60),
      questions: this.questions,
      userAnswers: this.userAnswers,
      flaggedQuestions: this.flaggedQuestions,
      remainingSeconds: this.remainingSeconds,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  },

  clearStorage() {
    const storageKey = `examsetu_active_${this.examName}_${this.subjectName}`;
    localStorage.removeItem(storageKey);
  },

  // Timer Countdown
  startTimer() {
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this.updateTimerDisplay();

      if (this.remainingSeconds % 5 === 0) {
        this.saveStateToStorage();
      }

      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        ExamSetu.showToast('Time is up! Auto-submitting your test...', 'warning');
        setTimeout(() => this.submitTest(true), 1200);
      }
    }, 1000);
  },

  updateTimerDisplay() {
    const timerElem = document.getElementById('testTimer');
    if (!timerElem) return;

    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    timerElem.innerHTML = `<i class="ri-timer-line"></i> <span>${formatted}</span>`;

    // Highlight low time (< 2 minutes)
    if (this.remainingSeconds < 120) {
      timerElem.classList.add('timer-warning');
    } else {
      timerElem.classList.remove('timer-warning');
    }
  },

  // Render Palette on the Right Sidebar
  renderPalette() {
    const paletteGrid = document.getElementById('paletteGrid');
    if (!paletteGrid) return;

    paletteGrid.innerHTML = '';
    this.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'q-pallet-btn';
      btn.textContent = idx + 1;
      btn.setAttribute('aria-label', `Go to question ${idx + 1}`);

      if (idx === this.currentIndex) btn.classList.add('current');
      if (this.userAnswers[q.id]) btn.classList.add('answered');
      if (this.flaggedQuestions[q.id]) btn.classList.add('flagged');

      btn.addEventListener('click', () => {
        this.renderQuestion(idx);
      });

      paletteGrid.appendChild(btn);
    });

    // Update Palette Stats
    const answeredCount = Object.keys(this.userAnswers).length;
    const flaggedCount = Object.keys(this.flaggedQuestions).length;

    const answeredStat = document.getElementById('answeredStatCount');
    if (answeredStat) answeredStat.textContent = `${answeredCount} / ${this.questions.length}`;

    // Update Progress Bar
    const percent = Math.round((answeredCount / this.questions.length) * 100);
    const progressFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}% Answered`;
  },

  // Render a Single Question by Index
  renderQuestion(index) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentIndex = index;
    const q = this.questions[index];

    const area = document.getElementById('questionDisplayArea');
    if (!area) return;

    const selectedOpt = this.userAnswers[q.id] || null;
    const isFlagged = Boolean(this.flaggedQuestions[q.id]);

    area.innerHTML = `
      <div class="question-header">
        <span class="q-badge">Question ${index + 1} of ${this.questions.length}</span>
        <span class="q-topic-tag"><i class="ri-bookmark-line"></i> ${escapeHTML(q.topic || q.subject || 'General')}</span>
      </div>

      <h2 class="question-text">${escapeHTML(q.question)}</h2>

      <div class="options-container">
        ${['A', 'B', 'C', 'D'].map((optKey) => {
          const optText = q.options[optKey];
          const isSelected = selectedOpt === optKey;
          return `
            <button type="button" class="option-btn ${isSelected ? 'selected' : ''}" onclick="TestEngine.selectOption(${q.id}, '${optKey}')">
              <span class="opt-key">${optKey}</span>
              <span class="opt-text">${escapeHTML(optText)}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Update Navigation Buttons States
    const prevBtn = document.getElementById('prevQBtn');
    const nextBtn = document.getElementById('nextQBtn');
    const flagBtn = document.getElementById('flagQBtn');

    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) {
      if (index === this.questions.length - 1) {
        nextBtn.innerHTML = 'Review & Submit <i class="ri-check-double-line"></i>';
      } else {
        nextBtn.innerHTML = 'Next Question <i class="ri-arrow-right-line"></i>';
      }
    }

    if (flagBtn) {
      if (isFlagged) {
        flagBtn.classList.add('flagged');
        flagBtn.innerHTML = '<i class="ri-flag-fill"></i> Flagged for Review';
      } else {
        flagBtn.classList.remove('flagged');
        flagBtn.innerHTML = '<i class="ri-flag-line"></i> Mark for Review';
      }
    }

    this.renderPalette();
  },

  // Select Option A, B, C, or D
  selectOption(questionId, optKey) {
    this.userAnswers[questionId] = optKey;
    this.renderQuestion(this.currentIndex);
    this.saveStateToStorage();
  },

  // Clear Answer for current question
  clearAnswer() {
    const q = this.questions[this.currentIndex];
    if (q && this.userAnswers[q.id]) {
      delete this.userAnswers[q.id];
      this.renderQuestion(this.currentIndex);
      this.saveStateToStorage();
      ExamSetu.showToast('Answer cleared', 'info');
    }
  },

  // Toggle Flag for Review
  toggleFlag() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    if (this.flaggedQuestions[q.id]) {
      delete this.flaggedQuestions[q.id];
      ExamSetu.showToast('Removed review flag', 'info');
    } else {
      this.flaggedQuestions[q.id] = true;
      ExamSetu.showToast('Question flagged for review', 'warning');
    }
    this.renderQuestion(this.currentIndex);
    this.saveStateToStorage();
  },

  // Navigation handlers
  prevQuestion() {
    if (this.currentIndex > 0) {
      this.renderQuestion(this.currentIndex - 1);
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.renderQuestion(this.currentIndex + 1);
    } else {
      this.confirmSubmitModal();
    }
  },

  // Submit Confirmation Modal
  confirmSubmitModal() {
    const total = this.questions.length;
    const answered = Object.keys(this.userAnswers).length;
    const skipped = total - answered;
    const flagged = Object.keys(this.flaggedQuestions).length;

    const modalHTML = `
      <div id="submitConfirmModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;">
        <div style="background:var(--surface);border-radius:var(--radius-xl);padding:32px;max-width:440px;width:100%;box-shadow:var(--shadow-lg);text-align:center;">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">
            <i class="ri-file-list-3-line"></i>
          </div>
          <h3 style="font-size:1.4rem;font-weight:800;margin-bottom:8px;">Ready to Submit?</h3>
          <p style="color:var(--muted-text);margin-bottom:20px;font-size:0.92rem;">Please review your exam attempt summary before final submission.</p>

          <div style="background:var(--surface-alt);border-radius:var(--radius-md);padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;text-align:left;">
            <div>
              <span style="font-size:0.75rem;color:var(--muted-text);text-transform:uppercase;font-weight:700;">Answered</span>
              <div style="font-size:1.2rem;font-weight:800;color:var(--success);">${answered} / ${total}</div>
            </div>
            <div>
              <span style="font-size:0.75rem;color:var(--muted-text);text-transform:uppercase;font-weight:700;">Unattempted</span>
              <div style="font-size:1.2rem;font-weight:800;color:${skipped > 0 ? 'var(--danger)' : 'var(--muted-text)'};">${skipped}</div>
            </div>
            <div>
              <span style="font-size:0.75rem;color:var(--muted-text);text-transform:uppercase;font-weight:700;">Flagged for Review</span>
              <div style="font-size:1.2rem;font-weight:800;color:var(--accent);">${flagged}</div>
            </div>
            <div>
              <span style="font-size:0.75rem;color:var(--muted-text);text-transform:uppercase;font-weight:700;">Time Remaining</span>
              <div style="font-size:1.2rem;font-weight:800;color:var(--primary);">${Math.floor(this.remainingSeconds / 60)}m ${this.remainingSeconds % 60}s</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;">
            <button onclick="document.getElementById('submitConfirmModal').remove()" class="btn btn-secondary btn-block">Back to Test</button>
            <button onclick="TestEngine.submitTest(false)" class="btn btn-primary btn-block">Submit Now</button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('submitConfirmModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  // Final Test Submission
  async submitTest(isAutoSubmit = false) {
    clearInterval(this.timerInterval);

    // Close modal if open
    const modal = document.getElementById('submitConfirmModal');
    if (modal) modal.remove();

    // Prepare answers payload
    const submissionAnswers = {};
    this.questions.forEach((q) => {
      submissionAnswers[q.id] = this.userAnswers[q.id] || '';
    });

    const timeSpent = Math.max(1, this.totalSeconds - this.remainingSeconds);

    // Show loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'submittingOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;';
    overlay.innerHTML = `
      <i class="ri-loader-4-line ri-spin" style="font-size:3.5rem;color:var(--primary);"></i>
      <h2 style="margin-top:20px;font-weight:800;">Evaluating Your Exam...</h2>
      <p style="color:var(--muted-text);">Calculating marks, percentage, and preparing review</p>
    `;
    document.body.appendChild(overlay);

    try {
      const res = await fetch('/api/tests/1/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswers: submissionAnswers,
          timeTakenSeconds: timeSpent,
          examName: this.examName,
          subjectName: this.subjectName
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        this.clearStorage();
        // Save result in sessionStorage for instant result view
        sessionStorage.setItem('examsetu_last_result', JSON.stringify({
          attemptId: data.attemptId,
          examName: this.examName,
          subjectName: this.subjectName,
          result: data.result
        }));

        setTimeout(() => {
          window.location.href = `/result?id=${data.attemptId}`;
        }, 1000);
      } else {
        overlay.remove();
        ExamSetu.showToast(data.message || 'Submission failed. Please try again.', 'danger');
      }
    } catch (err) {
      overlay.remove();
      console.error('Submission error:', err);
      ExamSetu.showToast('Network error during submission. Retrying...', 'danger');
    }
  },

  // Bind Buttons
  bindControls() {
    const prevBtn = document.getElementById('prevQBtn');
    const nextBtn = document.getElementById('nextQBtn');
    const flagBtn = document.getElementById('flagQBtn');
    const clearBtn = document.getElementById('clearQBtn');
    const submitBtn = document.getElementById('submitTestBtn');

    if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
    if (flagBtn) flagBtn.addEventListener('click', () => this.toggleFlag());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearAnswer());
    if (submitBtn) submitBtn.addEventListener('click', () => this.confirmSubmitModal());

    // Keyboard Shortcuts for accessibility (1, 2, 3, 4 or A, B, C, D)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        const q = this.questions[this.currentIndex];
        if (q) this.selectOption(q.id, key);
      } else if (key === 'ARROWLEFT') {
        this.prevQuestion();
      } else if (key === 'ARROWRIGHT') {
        this.nextQuestion();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('practiceTestPage')) {
    TestEngine.init();
  }
});
