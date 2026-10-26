// ==========================================================================
// ExamSetu Nepal - Admin Panel Controller
// ==========================================================================

const AdminPanel = {
  currentTab: 'overview',

  async init() {
    this.bindTabs();
    await this.loadOverview();
  },

  bindTabs() {
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.admin-tab-pane').forEach((p) => p.style.display = 'none');
    const activePane = document.getElementById(`tab-${tab}`);
    if (activePane) activePane.style.display = 'block';

    if (tab === 'overview') this.loadOverview();
    else if (tab === 'questions') this.loadQuestions();
    else if (tab === 'import') this.setupImport();
    else if (tab === 'attempts') this.loadAttempts();
    else if (tab === 'users') this.loadUsers();
  },

  // 1. Overview Statistics
  async loadOverview() {
    const pane = document.getElementById('tab-overview');
    if (!pane) return;

    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        const s = data.stats;
        document.getElementById('statQuestions').textContent = s.totalQuestions;
        document.getElementById('statAttempts').textContent = s.totalAttempts;
        document.getElementById('statUsers').textContent = s.totalUsers;
        document.getElementById('statExams').textContent = s.totalExams;
      }
    } catch (e) {
      console.warn('Stats error:', e);
    }
  },

  // 2. Questions Manager
  async loadQuestions() {
    const listContainer = document.getElementById('adminQuestionsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;">Loading questions...</td></tr>';

    try {
      const res = await fetch('/api/admin/questions?limit=50');
      const data = await res.json();
      if (!data.success || data.questions.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;">No questions found. Add one above!</td></tr>';
        return;
      }

      listContainer.innerHTML = data.questions.map((q) => `
        <tr>
          <td><strong>#${q.id}</strong></td>
          <td><span class="tag-badge tag-badge-primary">${escapeHTML(q.exam_name)}</span></td>
          <td>${escapeHTML(q.subject_name || '-')}</td>
          <td style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHTML(q.question)}">
            ${escapeHTML(q.question)}
          </td>
          <td><strong style="color:var(--success);">${escapeHTML(q.correct_answer)}</strong></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button onclick="AdminPanel.deleteQuestion(${q.id})" class="btn btn-danger btn-sm" title="Delete">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      listContainer.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">Error loading questions: ${escapeHTML(e.message)}</td></tr>`;
    }
  },

  // Delete Question
  async deleteQuestion(id) {
    if (!confirm(`Are you sure you want to delete question #${id}?`)) return;

    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast('Question deleted successfully', 'success');
        this.loadQuestions();
        this.loadOverview();
      } else {
        ExamSetu.showToast(data.message || 'Failed to delete question', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Error deleting question', 'danger');
    }
  },

  // Add Single Question Form Submit
  async handleAddQuestion(e) {
    e.preventDefault();
    const form = document.getElementById('addQuestionForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
      exam: document.getElementById('qExam').value,
      subject: document.getElementById('qSubject').value,
      topic: document.getElementById('qTopic').value,
      difficulty: document.getElementById('qDifficulty').value,
      question: document.getElementById('qText').value.trim(),
      option_a: document.getElementById('qOptA').value.trim(),
      option_b: document.getElementById('qOptB').value.trim(),
      option_c: document.getElementById('qOptC').value.trim(),
      option_d: document.getElementById('qOptD').value.trim(),
      correct_answer: document.getElementById('qCorrect').value,
      explanation: document.getElementById('qExplanation').value.trim()
    };

    if (!payload.question || !payload.option_a || !payload.option_b || !payload.correct_answer) {
      ExamSetu.showToast('Please fill in question, at least options A & B, and the correct answer.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast('New question saved to bank!', 'success');
        form.reset();
        this.loadQuestions();
        this.loadOverview();
      } else {
        ExamSetu.showToast(data.message || 'Error saving question', 'danger');
      }
    } catch (err) {
      ExamSetu.showToast('Server error while saving question', 'danger');
    } finally {
      submitBtn.disabled = false;
    }
  },

  // 3. Import Questions
  setupImport() {
    const importForm = document.getElementById('importQuestionsForm');
    if (importForm) {
      importForm.onsubmit = async (e) => {
        e.preventDefault();
        const jsonText = document.getElementById('importJsonText').value.trim();
        if (!jsonText) {
          ExamSetu.showToast('Paste valid JSON questions data', 'warning');
          return;
        }

        try {
          const parsed = JSON.parse(jsonText);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const res = await fetch('/api/admin/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: list })
          });
          const data = await res.json();
          if (data.success) {
            ExamSetu.showToast(data.message, 'success');
            document.getElementById('importJsonText').value = '';
            this.loadOverview();
          } else {
            ExamSetu.showToast(data.message || 'Import failed', 'danger');
          }
        } catch (err) {
          ExamSetu.showToast('Invalid JSON format: ' + err.message, 'danger');
        }
      };
    }
  },

  // 4. Test Attempts History
  async loadAttempts() {
    const tbody = document.getElementById('adminAttemptsList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Loading attempts...</td></tr>';

    try {
      const res = await fetch('/api/admin/attempts');
      const data = await res.json();
      if (!data.success || data.attempts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No test attempts recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = data.attempts.map((a) => `
        <tr>
          <td>#${a.id}</td>
          <td><strong>${escapeHTML(a.user_name || 'Anonymous Student')}</strong></td>
          <td>${escapeHTML(a.exam_name)} - ${escapeHTML(a.subject_name)}</td>
          <td><strong style="color:${a.percentage >= 40 ? 'var(--success)' : 'var(--danger)'};">${a.percentage}% (${a.score}/${a.total_questions})</strong></td>
          <td>${Math.floor(a.time_taken_seconds / 60)}m ${a.time_taken_seconds % 60}s</td>
          <td>${new Date(a.created_at).toLocaleDateString()}</td>
          <td><a href="/result?id=${a.id}" class="btn btn-outline btn-sm" target="_blank">View</a></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);">${escapeHTML(e.message)}</td></tr>`;
    }
  },

  // 5. Users List
  async loadUsers() {
    const tbody = document.getElementById('adminUsersList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Loading users...</td></tr>';

    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!data.success || data.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No users found.</td></tr>';
        return;
      }

      tbody.innerHTML = data.users.map((u) => `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${escapeHTML(u.name)}</strong></td>
          <td>${escapeHTML(u.email)}</td>
          <td><span class="tag-badge ${u.role === 'admin' ? 'tag-badge-primary' : 'tag-badge-warning'}">${escapeHTML(u.role)}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);">${escapeHTML(e.message)}</td></tr>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminPanelContainer')) {
    AdminPanel.init();

    const addQForm = document.getElementById('addQuestionForm');
    if (addQForm) {
      addQForm.addEventListener('submit', (e) => AdminPanel.handleAddQuestion(e));
    }
  }
});
