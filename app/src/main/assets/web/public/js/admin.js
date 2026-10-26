// ==========================================================================
// ExamSetu Nepal - Admin Panel Controller
// ==========================================================================

const AdminPanel = {
  currentTab: 'overview',
  currentStatusFilter: 'all',

  async init() {
    this.bindTabs();
    await this.loadOverview();
    this.checkPendingReports();
  },

  bindTabs() {
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => {
          b.classList.remove('active', 'btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-secondary');
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
    else if (tab === 'questions') this.loadQuestions(this.currentStatusFilter);
    else if (tab === 'reports') this.loadReports();
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

  // Check pending reports for badge
  async checkPendingReports() {
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (data.success && data.reports) {
        const pendingCount = data.reports.filter(r => r.status === 'pending').length;
        const badge = document.getElementById('adminReportsBadge');
        if (badge) {
          if (pendingCount > 0) {
            badge.textContent = `${pendingCount} new`;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }
      }
    } catch (e) {}
  },

  // 2. Questions Manager & Moderation
  async loadQuestions(status = 'all') {
    this.currentStatusFilter = status;
    const listContainer = document.getElementById('adminQuestionsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;">Loading questions...</td></tr>';

    try {
      const res = await fetch(`/api/admin/questions?limit=60&status=${encodeURIComponent(status)}`);
      const data = await res.json();
      if (!data.success || data.questions.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted-text);">No questions found matching criteria. Add one above!</td></tr>';
        return;
      }

      listContainer.innerHTML = data.questions.map((q) => {
        const statusColors = {
          published: 'tag-badge-primary',
          under_review: 'tag-badge-warning',
          draft: 'tag-badge-info',
          archived: 'tag-badge-danger'
        };
        const badgeClass = statusColors[q.status] || 'tag-badge-primary';

        return `
          <tr>
            <td><strong>#${q.id}</strong></td>
            <td>
              <span class="tag-badge tag-badge-primary" style="font-size:0.75rem;">${escapeHTML(q.exam_name)}</span>
              <div style="font-size:0.8rem;color:var(--muted-text);margin-top:2px;">${escapeHTML(q.subject_name || '-')}</div>
            </td>
            <td style="max-width:300px;font-size:0.88rem;" title="${escapeHTML(q.question)}">
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;">
                ${escapeHTML(q.question)}
              </div>
              <div style="font-size:0.78rem;color:var(--muted-text);">${escapeHTML(q.topic || 'General')} • Diff: ${escapeHTML(q.difficulty)}</div>
            </td>
            <td><strong style="color:var(--success);font-size:1.1rem;">${escapeHTML(q.correct_answer)}</strong></td>
            <td>
              <select class="form-input" style="padding:4px 8px;font-size:0.8rem;border-radius:var(--radius-sm);" onchange="AdminPanel.changeStatus(${q.id}, this.value)">
                <option value="published" ${q.status === 'published' ? 'selected' : ''}>Published</option>
                <option value="under_review" ${q.status === 'under_review' ? 'selected' : ''}>Under Review</option>
                <option value="draft" ${q.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="archived" ${q.status === 'archived' ? 'selected' : ''}>Archived</option>
              </select>
            </td>
            <td>
              <div style="display:flex;gap:6px;">
                <button onclick="AdminPanel.deleteQuestion(${q.id})" class="btn btn-danger btn-sm" title="Delete Question">
                  <i class="ri-delete-bin-line"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      listContainer.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">Error loading questions: ${escapeHTML(e.message)}</td></tr>`;
    }
  },

  // Update Status
  async changeStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/admin/questions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast(`Question #${id} status changed to ${newStatus}`, 'success');
      } else {
        ExamSetu.showToast(data.message || 'Status update failed', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Network error updating status', 'danger');
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
        this.loadQuestions(this.currentStatusFilter);
        this.loadOverview();
      } else {
        ExamSetu.showToast(data.message || 'Failed to delete question', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Error deleting question', 'danger');
    }
  },

  // 3. Question Reports
  async loadReports() {
    const list = document.getElementById('adminReportsList');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Loading reports...</td></tr>';

    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (!data.success || data.reports.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted-text);">No reported questions at this time.</td></tr>';
        return;
      }

      list.innerHTML = data.reports.map(r => `
        <tr>
          <td>#${r.id}</td>
          <td style="max-width:280px;">
            <div style="font-weight:600;font-size:0.9rem;">${escapeHTML(r.question_text || `Question #${r.question_id}`)}</div>
            <div style="font-size:0.75rem;color:var(--muted-text);">QID: #${r.question_id}</div>
          </td>
          <td><span class="tag-badge tag-badge-danger" style="font-size:0.75rem;">${escapeHTML(r.reason)}</span></td>
          <td style="font-size:0.85rem;color:var(--muted-text);max-width:200px;">${escapeHTML(r.details || '-')}</td>
          <td>
            <span class="tag-badge ${r.status === 'pending' ? 'tag-badge-warning' : 'tag-badge-primary'}">${escapeHTML(r.status)}</span>
          </td>
          <td>
            ${r.status === 'pending' ? `
              <div style="display:flex;gap:6px;">
                <button onclick="AdminPanel.handleReportAction(${r.id}, 'resolve')" class="btn btn-primary btn-sm" title="Mark Fixed">
                  <i class="ri-check-line"></i> Resolve
                </button>
                <button onclick="AdminPanel.handleReportAction(${r.id}, 'dismiss')" class="btn btn-secondary btn-sm" title="Dismiss Report">
                  <i class="ri-close-line"></i> Dismiss
                </button>
              </div>
            ` : `<span style="font-size:0.8rem;color:var(--muted-text);">Resolved</span>`}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      list.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">${escapeHTML(e.message)}</td></tr>`;
    }
  },

  async handleReportAction(reportId, action) {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast(`Report ${action}ed`, 'success');
        this.loadReports();
        this.checkPendingReports();
      } else {
        ExamSetu.showToast(data.message || 'Action failed', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Error performing report action', 'danger');
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
      status: document.getElementById('qStatus') ? document.getElementById('qStatus').value : 'published',
      question: document.getElementById('qText').value.trim(),
      option_a: document.getElementById('qOptA').value.trim(),
      option_b: document.getElementById('qOptB').value.trim(),
      option_c: document.getElementById('qOptC').value.trim(),
      option_d: document.getElementById('qOptD').value.trim(),
      correct_answer: document.getElementById('qCorrect').value,
      explanation: document.getElementById('qExplanation').value.trim()
    };

    if (!payload.question || !payload.option_a || !payload.option_b || !payload.correct_answer) {
      ExamSetu.showToast('Please fill in question, options A & B, and the correct answer.', 'warning');
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
        this.loadQuestions(this.currentStatusFilter);
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

  // 4. Import Questions
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

  // 5. Test Attempts History
  async loadAttempts() {
    const tbody = document.getElementById('adminAttemptsList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Loading attempts...</td></tr>';

    try {
      const res = await fetch('/api/admin/attempts');
      const data = await res.json();
      if (!data.success || data.attempts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted-text);">No test attempts recorded yet.</td></tr>';
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

  // 6. Users List
  async loadUsers() {
    const tbody = document.getElementById('adminUsersList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Loading users...</td></tr>';

    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!data.success || data.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted-text);">No users found.</td></tr>';
        return;
      }

      tbody.innerHTML = data.users.map((u) => `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${escapeHTML(u.name)}</strong></td>
          <td>${escapeHTML(u.email)}</td>
          <td><span class="tag-badge ${u.role === 'admin' ? 'tag-badge-primary' : 'tag-badge-warning'}">${escapeHTML(u.role)}</span></td>
          <td>${u.current_streak || 1}d / ${u.total_xp || 50} XP</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">${escapeHTML(e.message)}</td></tr>`;
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
