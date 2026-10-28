// ==========================================================================
// ExamSetu Nepal - Instant Feedback Practice Engine
// ==========================================================================

const PracticeEngine = {
  questions: [],
  currentIndex: 0,
  userSelections: {}, // { [qId]: { selected: 'B', isCorrect: true } }
  examName: 'Lok Sewa',
  subjectName: 'General Knowledge',
  topicName: '',

  questionCount: 50,

  changeCount(newCount) {
    this.questionCount = parseInt(newCount) || 50;
    this.loadQuestions();
  },

  shuffleNewQuestions() {
    this.loadQuestions(true);
  },

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.examName = urlParams.get('exam') || 'Lok Sewa';
    this.subjectName = urlParams.get('subject') || '';
    this.topicName = urlParams.get('topic') || '';
    this.questionCount = parseInt(urlParams.get('count') || urlParams.get('limit')) || 50;

    const countSelect = document.getElementById('practiceCountSelect');
    if (countSelect) {
      countSelect.value = String(this.questionCount);
    }

    const headerTitle = document.getElementById('practiceTitleInfo');
    if (headerTitle) {
      headerTitle.textContent = `${this.examName} • ${this.subjectName || 'Practice Drill'} ${this.topicName ? '(' + this.topicName + ')' : ''}`;
    }

    await this.loadQuestions();
  },

  async loadQuestions(isShuffle = false) {
    const container = document.getElementById('practiceQuestionCard');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center;padding:50px;">
          <i class="ri-loader-4-line ri-spin" style="font-size:2.5rem;color:var(--primary);"></i>
          <p style="margin-top:12px;color:var(--muted-text);font-weight:600;">Generating ${this.questionCount} genuine questions...</p>
        </div>
      `;
    }

    try {
      const query = new URLSearchParams({
        exam: this.examName,
        subject: this.subjectName,
        topic: this.topicName,
        limit: String(this.questionCount),
        t: Date.now()
      });

      const res = await fetch(`/api/practice/questions?${query.toString()}`);
      const data = await res.json();

      if (!data.success || !data.questions || data.questions.length === 0) {
        if (container) {
          container.innerHTML = `
            <div style="text-align:center;padding:40px;">
              <i class="ri-alert-line" style="font-size:3rem;color:var(--warning);"></i>
              <h3 style="margin-top:12px;">No questions found for this topic.</h3>
              <p style="color:var(--muted-text);margin-bottom:20px;">Try another subject or general practice sets.</p>
              <a href="/exams" class="btn btn-primary">Browse All Exams</a>
            </div>
          `;
        }
        return;
      }

      this.questions = data.questions;
      this.renderQuestion(0);
      this.bindButtons();
      this.updateStats();
    } catch (err) {
      console.error('Practice mode error:', err);
      ExamSetu.showToast('Could not load practice questions.', 'danger');
    }
  },

  renderQuestion(index) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentIndex = index;
    const q = this.questions[index];
    const container = document.getElementById('practiceQuestionCard');
    if (!container) return;

    const answeredState = this.userSelections[q.id];

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="q-badge">Question ${index + 1} of ${this.questions.length}</span>
          <span class="tag-badge" style="background:var(--primary-light);color:var(--primary);">${escapeHTML(q.topic || 'General')}</span>
          <span class="tag-badge" style="background:var(--surface-alt);color:var(--muted-text);">${escapeHTML(q.difficulty || 'medium')}</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="PracticeEngine.bookmarkQuestion(${q.id})" class="btn btn-secondary btn-sm" title="Bookmark for revision">
            <i class="ri-bookmark-line"></i> Bookmark
          </button>
          <button onclick="PracticeEngine.openReportModal(${q.id})" class="btn btn-secondary btn-sm" title="Report issue with question" style="color:var(--danger);">
            <i class="ri-flag-line"></i> Report
          </button>
        </div>
      </div>

      <h2 style="font-size:1.25rem;font-weight:700;line-height:1.5;margin-bottom:24px;color:var(--text);">
        ${escapeHTML(q.question)}
      </h2>

      <div class="options-container" id="practiceOptionsGroup">
        ${['A', 'B', 'C', 'D'].map((optKey) => {
          const optText = q.options[optKey];
          let extraClass = '';
          let badgeIcon = '';

          if (answeredState) {
            const isCorrectAnswer = optKey.toUpperCase() === q.correct_answer.toUpperCase();
            const isUserSelection = optKey.toUpperCase() === answeredState.selected.toUpperCase();

            if (isCorrectAnswer) {
              extraClass = 'practice-opt-correct';
              badgeIcon = '<i class="ri-checkbox-circle-fill" style="color:var(--success);font-size:1.2rem;"></i>';
            } else if (isUserSelection && !answeredState.isCorrect) {
              extraClass = 'practice-opt-wrong';
              badgeIcon = '<i class="ri-close-circle-fill" style="color:var(--danger);font-size:1.2rem;"></i>';
            }
          }

          return `
            <button type="button" class="option-btn ${extraClass}" onclick="PracticeEngine.selectOption(${q.id}, '${optKey}')" ${answeredState ? 'disabled' : ''}>
              <span class="opt-key">${optKey}</span>
              <span class="opt-text">${escapeHTML(optText)}</span>
              ${badgeIcon}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Instant Explanation Box (Visible once answered) -->
      ${answeredState ? `
        <div class="explanation-box" style="animation:fadeIn 0.3s ease;margin-top:20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <strong style="color:${answeredState.isCorrect ? 'var(--success)' : 'var(--danger)'};">
              <i class="${answeredState.isCorrect ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'}"></i>
              ${answeredState.isCorrect ? 'Correct Answer! (+5 XP)' : 'Incorrect (Correct: Option ' + q.correct_answer + ')'}
            </strong>
          </div>
          <div>${escapeHTML(q.explanation || 'No additional explanation provided.')}</div>
        </div>
      ` : ''}
    `;

    // Navigation buttons state
    const prevBtn = document.getElementById('practicePrevBtn');
    const nextBtn = document.getElementById('practiceNextBtn');
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) {
      if (index === this.questions.length - 1) {
        nextBtn.innerHTML = 'Finish Practice <i class="ri-check-line"></i>';
      } else {
        nextBtn.innerHTML = 'Next Question <i class="ri-arrow-right-line"></i>';
      }
    }

    this.updateStats();
  },

  selectOption(questionId, selectedKey) {
    const q = this.questions[this.currentIndex];
    if (!q || this.userSelections[questionId]) return;

    const isCorrect = selectedKey.toUpperCase() === q.correct_answer.toUpperCase();
    this.userSelections[questionId] = {
      selected: selectedKey,
      isCorrect
    };

    if (isCorrect) {
      ExamSetu.showToast('Correct! Great job.', 'success');
    } else {
      ExamSetu.showToast(`Incorrect! The correct answer is Option ${q.correct_answer}.`, 'danger');
    }

    this.renderQuestion(this.currentIndex);
  },

  updateStats() {
    const total = this.questions.length;
    const answeredKeys = Object.keys(this.userSelections);
    const attempted = answeredKeys.length;
    let correct = 0;
    answeredKeys.forEach((k) => {
      if (this.userSelections[k].isCorrect) correct++;
    });

    const statAttempted = document.getElementById('practiceStatAttempted');
    const statCorrect = document.getElementById('practiceStatCorrect');
    const progressFill = document.getElementById('practiceProgressFill');

    if (statAttempted) statAttempted.textContent = `${attempted} / ${total}`;
    if (statCorrect) statCorrect.textContent = `${correct}`;
    if (progressFill) {
      const pct = total > 0 ? Math.round((attempted / total) * 100) : 0;
      progressFill.style.width = `${pct}%`;
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.renderQuestion(this.currentIndex + 1);
    } else {
      // Completed practice
      const answeredKeys = Object.keys(this.userSelections);
      let correct = 0;
      answeredKeys.forEach((k) => {
        if (this.userSelections[k].isCorrect) correct++;
      });
      ExamSetu.showToast(`Practice complete! You scored ${correct} / ${this.questions.length}`, 'success');
      setTimeout(() => {
        ExamSetu.navigateTo('/dashboard');
      }, 1200);
    }
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.renderQuestion(this.currentIndex - 1);
    }
  },

  async bookmarkQuestion(qId) {
    try {
      const res = await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId })
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast('Question bookmarked for revision!', 'success');
      } else {
        ExamSetu.showToast(data.message || 'Please log in to save bookmarks.', 'warning');
      }
    } catch (e) {
      ExamSetu.showToast('Could not save bookmark.', 'danger');
    }
  },

  openReportModal(qId) {
    const modalHTML = `
      <div id="reportQuestionModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;">
        <div style="background:var(--surface);border-radius:var(--radius-xl);padding:30px;max-width:440px;width:100%;box-shadow:var(--shadow-lg);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:1.25rem;font-weight:800;color:var(--danger);"><i class="ri-flag-line"></i> Report Question</h3>
            <button onclick="document.getElementById('reportQuestionModal').remove()" style="font-size:1.5rem;color:var(--muted-text);">&times;</button>
          </div>
          <p style="color:var(--muted-text);font-size:0.88rem;margin-bottom:16px;">Help us maintain highest academic accuracy. What issue did you find?</p>

          <form onsubmit="PracticeEngine.submitReport(event, ${qId})">
            <div class="form-group">
              <label class="form-label">Issue Type</label>
              <select id="reportReasonSelect" class="form-input" required>
                <option value="wrong_answer">Wrong Answer Key</option>
                <option value="unclear_explanation">Unclear or Incomplete Explanation</option>
                <option value="typo_grammar">Typographical / Spelling Error</option>
                <option value="duplicate">Duplicate Question</option>
                <option value="out_of_syllabus">Out of Official Syllabus</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Details / Reference</label>
              <textarea id="reportDetailsInput" class="form-input" rows="3" placeholder="Explain the correction or cite official source..."></textarea>
            </div>

            <div style="display:flex;gap:10px;margin-top:20px;">
              <button type="button" onclick="document.getElementById('reportQuestionModal').remove()" class="btn btn-secondary btn-block">Cancel</button>
              <button type="submit" class="btn btn-danger btn-block">Submit Report</button>
            </div>
          </form>
        </div>
      </div>
    `;
    const existing = document.getElementById('reportQuestionModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  async submitReport(e, qId) {
    e.preventDefault();
    const reason = document.getElementById('reportReasonSelect').value;
    const details = document.getElementById('reportDetailsInput').value.trim();

    try {
      const res = await fetch(`/api/questions/${qId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('reportQuestionModal').remove();
        ExamSetu.showToast('Report submitted. Thank you for your feedback!', 'success');
      } else {
        ExamSetu.showToast(data.message || 'Could not submit report.', 'danger');
      }
    } catch (err) {
      ExamSetu.showToast('Network error submitting report.', 'danger');
    }
  },

  bindButtons() {
    const prevBtn = document.getElementById('practicePrevBtn');
    const nextBtn = document.getElementById('practiceNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('practicePageIdentifier')) {
    PracticeEngine.init();
  }
});
