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
    else if (tab === 'colleges') this.loadColleges();
    else if (tab === 'curriculum') this.loadCurriculum();
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
  },

  // 7. Colleges & Special Access Codes
  async loadColleges() {
    const tbody = document.getElementById('adminCollegesList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Loading registered colleges...</td></tr>';

    try {
      const res = await fetch('/api/colleges');
      const data = await res.json();
      if (!data.success || !data.colleges || data.colleges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted-text);">No colleges registered yet.</td></tr>';
        return;
      }

      tbody.innerHTML = data.colleges.map((c) => `
        <tr>
          <td>
            <div style="font-weight:700;display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${escapeHTML(c.brand_color || '#2563eb')};"></span>
              ${escapeHTML(c.name)}
            </div>
            <div style="font-size:0.75rem;color:var(--muted-text);">${escapeHTML(c.location || 'Nepal')}</div>
          </td>
          <td><code>${escapeHTML(c.code)}</code></td>
          <td>
            <span style="font-family:monospace;font-weight:800;background:rgba(2,132,199,0.1);color:#0284c7;padding:3px 8px;border-radius:4px;border:1px dashed #0284c7;">
              ${escapeHTML(c.access_code)}
            </span>
          </td>
          <td><strong>${c.stats ? c.stats.studentCount : 0}</strong></td>
          <td><strong>${c.stats ? c.stats.questionCount : 0}</strong></td>
          <td><strong>${c.stats ? c.stats.testCount : 0}</strong></td>
          <td>
            <a href="/college?code=${encodeURIComponent(c.access_code)}" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.78rem;padding:4px 8px;">
              <i class="ri-external-link-line"></i> Open Portal
            </a>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);">${escapeHTML(e.message)}</td></tr>`;
    }
  },

  async provisionCollege(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('newCollegeName').value.trim();
    const code = document.getElementById('newCollegeCode').value.trim().toLowerCase();
    const accessCode = document.getElementById('newCollegeAccessCode').value.trim().toUpperCase();
    const affiliation = document.getElementById('newCollegeAffiliation').value.trim();
    const location = document.getElementById('newCollegeLocation').value.trim();
    const brandColor = document.getElementById('newCollegeColor').value.trim() || '#2563eb';

    if (!name || !code || !accessCode) {
      alert('Please fill out Name, Slug, and Special Access Code.');
      return;
    }

    try {
      const res = await fetch('/api/admin/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, accessCode, affiliation, location, brandColor })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Partner college "${name}" provisioned successfully with Access Code: ${accessCode}`);
        document.getElementById('adminNewCollegeForm').reset();
        document.getElementById('newCollegeColor').value = '#2563eb';
        this.loadColleges();
      } else {
        alert(data.error || 'Failed to provision college');
      }
    } catch (err) {
      alert('Error provisioning college: ' + err.message);
    }
  },

  // 8. Module 10: Curriculum Intelligence & Verification Management
  async loadCurriculum() {
    await this.loadSourceDocuments();
    await this.onCurriculumExamChange();
  },

  async loadSourceDocuments() {
    const list = document.getElementById('adminSourceDocsList');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;">Loading official documents...</td></tr>';

    try {
      const res = await fetch('/api/curriculum/admin/documents');
      const data = await res.json();
      if (!data.success || !data.documents || data.documents.length === 0) {
        list.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted-text);">No curriculum documents found.</td></tr>';
        return;
      }

      list.innerHTML = data.documents.map(d => {
        const isVerified = d.verification_status === 'verified';
        return `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:12px 14px;"><strong style="text-transform:uppercase;color:var(--primary);">${escapeHTML(d.exam_slug)}</strong></td>
            <td style="padding:12px 14px;"><strong>${escapeHTML(d.title)}</strong><div style="font-size:0.75rem;color:var(--muted-text);">${escapeHTML(d.document_type || '')}</div></td>
            <td style="padding:12px 14px;"><span class="tag-badge tag-badge-primary" style="font-size:0.75rem;">${escapeHTML(d.authority)}</span></td>
            <td style="padding:12px 14px;color:var(--text);">${escapeHTML(d.academic_year || '2081/2082')}</td>
            <td style="padding:12px 14px;">
              <span class="tag-badge ${isVerified ? 'tag-badge-success' : 'tag-badge-warning'}" style="font-size:0.75rem;">
                <i class="${isVerified ? 'ri-shield-check-fill' : 'ri-time-line'}"></i> ${isVerified ? 'Verified' : 'Pending'}
              </span>
            </td>
            <td style="padding:12px 14px;">
              <a href="${escapeHTML(d.official_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:0.75rem;">
                <i class="ri-external-link-line"></i> Source PDF
              </a>
            </td>
            <td style="padding:12px 14px;">
              <button class="btn ${isVerified ? 'btn-secondary' : 'btn-primary'} btn-sm" style="padding:3px 10px;font-size:0.75rem;" onclick="AdminPanel.verifySourceDoc(${d.id}, '${isVerified ? 'pending_review' : 'verified'}')">
                ${isVerified ? 'Unverify' : '<i class="ri-check-line"></i> Verify & Publish'}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--danger);">Error loading documents: ${escapeHTML(err.message)}</td></tr>`;
    }
  },

  async verifySourceDoc(docId, nextStatus) {
    try {
      const res = await fetch(`/api/curriculum/admin/documents/${docId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast(`Document updated to "${nextStatus}"`, 'success');
        this.loadSourceDocuments();
      } else {
        ExamSetu.showToast(data.message || 'Verification failed', 'danger');
      }
    } catch (err) {
      ExamSetu.showToast(err.message, 'danger');
    }
  },

  async onCurriculumExamChange() {
    const examSelect = document.getElementById('adminCurriculumExamSelect');
    const subSelect = document.getElementById('adminCurriculumSubjectSelect');
    if (!examSelect || !subSelect) return;

    subSelect.innerHTML = '<option value="">Loading subjects...</option>';
    try {
      const res = await fetch(`/api/curriculum/exams/${examSelect.value}/subjects`);
      const data = await res.json();
      if (data.success && data.subjects && data.subjects.length > 0) {
        subSelect.innerHTML = data.subjects.map(s => `
          <option value="${s.id}">${escapeHTML(s.name)} (${s.code || ''})</option>
        `).join('');
        await this.onCurriculumSubjectChange();
      } else {
        subSelect.innerHTML = '<option value="">No subjects registered</option>';
        document.getElementById('adminChaptersList').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;">No subjects found.</td></tr>';
      }
    } catch (e) {
      subSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
  },

  async onCurriculumSubjectChange() {
    const subSelect = document.getElementById('adminCurriculumSubjectSelect');
    const list = document.getElementById('adminChaptersList');
    if (!subSelect || !list) return;

    const subId = subSelect.value;
    if (!subId) return;

    list.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;">Loading chapters...</td></tr>';

    try {
      const res = await fetch(`/api/curriculum/subjects/${subId}`);
      const data = await res.json();
      if (data.success && data.subject && data.subject.chapters && data.subject.chapters.length > 0) {
        list.innerHTML = data.subject.chapters.map(c => `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px 12px;font-weight:700;color:var(--muted-text);">${c.chapter_no}</td>
            <td style="padding:10px 12px;">
              <input type="text" id="ch-title-en-${c.id}" class="form-input" style="padding:4px 8px;font-size:0.82rem;" value="${escapeHTML(c.title_en || '')}">
            </td>
            <td style="padding:10px 12px;">
              <input type="text" id="ch-title-np-${c.id}" class="form-input" style="padding:4px 8px;font-size:0.82rem;" value="${escapeHTML(c.title_np || '')}">
            </td>
            <td style="padding:10px 12px;">
              <input type="number" id="ch-marks-${c.id}" class="form-input" style="padding:4px 8px;font-size:0.82rem;width:80px;" value="${c.official_marks || ''}" placeholder="Pooled">
            </td>
            <td style="padding:10px 12px;">
              <input type="number" id="ch-hours-${c.id}" class="form-input" style="padding:4px 8px;font-size:0.82rem;width:70px;" value="${c.learning_hours || 10}">
            </td>
            <td style="padding:10px 12px;">
              <select id="ch-diff-${c.id}" class="form-input" style="padding:4px 6px;font-size:0.8rem;">
                <option value="Easy" ${c.difficulty_level === 'Easy' ? 'selected' : ''}>Easy</option>
                <option value="Medium" ${c.difficulty_level === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Hard" ${c.difficulty_level === 'Hard' ? 'selected' : ''}>Hard</option>
              </select>
            </td>
            <td style="padding:10px 12px;">
              <button class="btn btn-primary btn-sm" style="padding:4px 10px;font-size:0.75rem;" onclick="AdminPanel.saveChapter(${c.id})">
                <i class="ri-save-line"></i> Save
              </button>
            </td>
          </tr>
        `).join('');
      } else {
        list.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted-text);">No chapters registered for this subject.</td></tr>';
      }
    } catch (e) {
      list.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--danger);">Error loading chapters: ${escapeHTML(e.message)}</td></tr>`;
    }
  },

  async saveChapter(chapterId) {
    const titleEn = document.getElementById(`ch-title-en-${chapterId}`)?.value.trim();
    const titleNp = document.getElementById(`ch-title-np-${chapterId}`)?.value.trim();
    const marksRaw = document.getElementById(`ch-marks-${chapterId}`)?.value.trim();
    const hours = Number(document.getElementById(`ch-hours-${chapterId}`)?.value || 10);
    const difficulty = document.getElementById(`ch-diff-${chapterId}`)?.value || 'Medium';

    const officialMarks = marksRaw ? Number(marksRaw) : null;

    try {
      const res = await fetch(`/api/curriculum/admin/chapters/${chapterId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn,
          titleNp,
          officialMarks,
          learningHours: hours,
          difficultyLevel: difficulty
        })
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast('Chapter details & specification grid marks saved!', 'success');
      } else {
        ExamSetu.showToast(data.message || 'Save failed', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Network error saving chapter: ' + e.message, 'danger');
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
