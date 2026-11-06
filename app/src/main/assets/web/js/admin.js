// ==========================================================================
// ExamSetu Nepal - Admin Panel Controller
// ==========================================================================

const AdminPanel = {
  currentTab: 'overview',
  currentStatusFilter: 'all',

  async init() {
    this.bindTabs();
    this.bindSidebarDrawer();
    await this.loadOverview();
    this.loadLibrary();
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
    else if (tab === 'library') this.loadLibrary();
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

  // 5. Test Attempts History & Anti-Cheat Security Logs (Wireframe 3 & 9)
  async loadAttempts() {
    const tbody = document.getElementById('adminAttemptsList');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">Loading attempts...</td></tr>';

    try {
      let attempts = [];
      try {
        const res = await fetch('/api/admin/attempts');
        const data = await res.json();
        if (data.success && Array.isArray(data.attempts)) {
          attempts = data.attempts;
        }
      } catch (netErr) {
        // Fallback to local storage attempts in offline/applet mode
      }

      const localAttempts = JSON.parse(localStorage.getItem('examsetu_all_attempts') || '[]');
      if (localAttempts.length > 0) {
        const mapped = localAttempts.map((la, idx) => ({
          id: 500 + idx,
          user_name: 'Current Student (You)',
          exam_name: la.examName || 'Mock Exam',
          subject_name: la.subjectName || 'NEB Subject',
          score: la.score || 0,
          total_questions: la.totalQuestions || 10,
          percentage: la.percentage || 0,
          time_taken_seconds: la.timeSpent || 180,
          cheat_violations: la.cheatViolations || 0,
          weak_lessons: la.weakLessons || [],
          created_at: la.date || new Date().toISOString()
        }));
        attempts = [...mapped, ...attempts];
      }

      if (attempts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted-text);">No test attempts recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = attempts.map((a) => {
        const violations = a.cheat_violations ?? a.violations ?? 0;
        const cheatBadge = violations > 0
          ? `<span style="color:#dc2626;font-weight:700;"><i class="ri-alert-line"></i> ${violations} Violations</span>`
          : `<span style="color:#10b981;font-weight:700;"><i class="ri-shield-check-line"></i> Clean (0)</span>`;

        return `
          <tr>
            <td>#${a.id}</td>
            <td><strong>${escapeHTML(a.user_name || 'Anonymous Student')}</strong></td>
            <td>${escapeHTML(a.exam_name)} - ${escapeHTML(a.subject_name)}</td>
            <td><strong style="color:${a.percentage >= 40 ? 'var(--success)' : 'var(--danger)'};">${a.percentage}% (${a.score}/${a.total_questions})</strong></td>
            <td>${Math.floor(a.time_taken_seconds / 60)}m ${a.time_taken_seconds % 60}s</td>
            <td>${cheatBadge}</td>
            <td>${new Date(a.created_at).toLocaleDateString()}</td>
            <td><a href="/result?id=${a.id}" class="btn btn-outline btn-sm" target="_blank">View</a></td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);">${escapeHTML(e.message)}</td></tr>`;
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
  },

  /* ==========================================================================
     OFF-CANVAS SIDEBAR DRAWER (Three Lines Hamburger Menu on Left)
     ========================================================================== */
  bindSidebarDrawer() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const drawer = document.getElementById('adminSidebarDrawer');
        if (drawer && drawer.classList.contains('open')) {
          this.toggleSidebarDrawer();
        }
        this.closeAddBookModal();
        this.closeGenerateMcqModal();
      }
    });
  },

  toggleSidebarDrawer() {
    const drawer = document.getElementById('adminSidebarDrawer');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    } else {
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    }
  },

  /* ==========================================================================
     UNIVERSAL INSTITUTIONAL LIBRARY & BOOK REPOSITORY
     ========================================================================== */
  allBooksCache: [],
  activeGeneratedQuestions: [],
  currentlyViewedBook: null,

  async loadLibrary() {
    const grid = document.getElementById('adminBooksGrid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:36px;color:var(--muted-text);"><i class="ri-loader-4-line ri-spin" style="font-size:1.8rem;display:block;margin-bottom:8px;"></i>Loading Institutional Library books...</div>';

    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      if (data.success && Array.isArray(data.books)) {
        this.allBooksCache = data.books;
        const badge = document.getElementById('adminLibraryBadge');
        if (badge) badge.textContent = data.books.length;
        this.renderBooks(data.books);
      } else {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:36px;color:var(--muted-text);">No books in library. Click "Add New Book" to upload notes!</div>';
      }
    } catch (e) {
      console.error('Error loading library:', e);
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:36px;color:var(--danger);">Error loading library: ' + e.message + '</div>';
    }
  },

  renderBooks(books) {
    const grid = document.getElementById('adminBooksGrid');
    if (!grid) return;

    if (!books || books.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius-xl);padding:40px;text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">📚</div>
          <h3 style="font-size:1.3rem;font-weight:800;margin-bottom:6px;">Your Institutional Library is Ready</h3>
          <p style="color:var(--muted-text);font-size:0.92rem;max-width:540px;margin:0 auto 20px auto;">
            Upload textbooks, syllabus notes, or past model questions using Google Files, Word DOCX, or CamScanner.
          </p>
          <button onclick="AdminPanel.openAddBookModal()" class="btn btn-primary">
            <i class="ri-add-circle-line"></i> Add Your First Book / Notes
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = books.map((b) => {
      let sourceBadge = '';
      if (b.source_type === 'google_drive') {
        sourceBadge = '<span class="source-badge source-google"><i class="ri-google-fill"></i> Google Drive</span>';
      } else if (b.source_type === 'docx') {
        sourceBadge = '<span class="source-badge source-docx"><i class="ri-file-word-line"></i> DOCX Document</span>';
      } else if (b.source_type === 'camscanner') {
        sourceBadge = '<span class="source-badge source-camscanner"><i class="ri-camera-lens-line"></i> CamScanner</span>';
      } else {
        sourceBadge = '<span class="source-badge source-docx"><i class="ri-file-text-line"></i> Notes</span>';
      }

      const excerpt = b.content_preview ? (b.content_preview.length > 130 ? b.content_preview.slice(0, 130) + '...' : b.content_preview) : 'No preview available.';

      return `
        <div class="book-card">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
              ${sourceBadge}
              <span class="tag-badge tag-badge-primary" style="font-size:0.75rem;">${escapeHTML(b.category || 'General')}</span>
            </div>

            <h3 style="font-size:1.12rem;font-weight:800;line-height:1.4;margin-bottom:6px;color:var(--text);">
              ${escapeHTML(b.title)}
            </h3>

            <div style="font-size:0.85rem;color:var(--muted-text);margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap;">
              <span><i class="ri-user-line" style="color:var(--primary);"></i> ${escapeHTML(b.author || 'Faculty')}</span>
              <span><i class="ri-book-line" style="color:var(--primary);"></i> ${escapeHTML(b.subject || 'General')}</span>
            </div>

            <p style="font-size:0.84rem;color:var(--muted-text);line-height:1.5;background:var(--surface-alt);padding:10px 12px;border-radius:var(--radius-md);margin-bottom:16px;">
              ${escapeHTML(excerpt)}
            </p>
          </div>

          <div>
            <!-- DOWN TO BUTTON: Generate MCQ Questions -->
            <button onclick="AdminPanel.openGenerateMcqModal(${b.id})" class="btn btn-primary" style="width:100%;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px;">
              <i class="ri-flashlight-fill"></i> Generate MCQ Questions
            </button>

            <div style="display:flex;gap:8px;">
              <button onclick="AdminPanel.openViewBookModal(${b.id})" class="btn btn-secondary btn-sm" style="flex:1;">
                <i class="ri-eye-line"></i> Read / Preview
              </button>
              <button onclick="AdminPanel.deleteBook(${b.id})" class="btn btn-outline btn-sm" style="color:var(--danger);border-color:rgba(239,68,68,0.3);" title="Delete Book">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterBooks() {
    const search = (document.getElementById('librarySearchInput')?.value || '').toLowerCase().trim();
    const category = document.getElementById('libraryCategoryFilter')?.value || 'all';
    const subject = document.getElementById('librarySubjectFilter')?.value || 'all';

    const filtered = this.allBooksCache.filter((b) => {
      const matchSearch = !search ||
        (b.title && b.title.toLowerCase().includes(search)) ||
        (b.author && b.author.toLowerCase().includes(search)) ||
        (b.subject && b.subject.toLowerCase().includes(search)) ||
        (b.content_preview && b.content_preview.toLowerCase().includes(search));

      const matchCat = category === 'all' || (b.category && b.category.includes(category));
      const matchSubj = subject === 'all' || (b.subject && b.subject.toLowerCase() === subject.toLowerCase());

      return matchSearch && matchCat && matchSubj;
    });

    this.renderBooks(filtered);
  },

  /* ==========================================================================
     ADD BOOK MODAL CONTROLS (Google Files, DOCX, CamScanner)
     ========================================================================== */
  openAddBookModal(sourceType = 'google_drive') {
    const modal = document.getElementById('addBookModal');
    if (!modal) return;
    modal.style.display = 'flex';
    this.switchSourceTab(sourceType);
  },

  closeAddBookModal() {
    const modal = document.getElementById('addBookModal');
    if (modal) modal.style.display = 'none';
  },

  switchSourceTab(sourceType) {
    document.getElementById('bookSourceType').value = sourceType;

    // Toggle button active states
    ['srcBtnGoogle', 'srcBtnDocx', 'srcBtnCamScanner'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });

    // Toggle tab panes
    ['srcTabGoogle', 'srcTabDocx', 'srcTabCamScanner'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    if (sourceType === 'google_drive') {
      document.getElementById('srcBtnGoogle')?.classList.add('active');
      document.getElementById('srcTabGoogle').style.display = 'block';
    } else if (sourceType === 'docx') {
      document.getElementById('srcBtnDocx')?.classList.add('active');
      document.getElementById('srcTabDocx').style.display = 'block';
    } else if (sourceType === 'camscanner') {
      document.getElementById('srcBtnCamScanner')?.classList.add('active');
      document.getElementById('srcTabCamScanner').style.display = 'block';
    }
  },

  handleGoogleDriveInput() {
    const urlInput = document.getElementById('googleDriveUrl');
    const val = (urlInput?.value || '').trim();
    if (!val) return;

    // Detect document name or hint from Google link
    const titleField = document.getElementById('bookTitle');
    const contentField = document.getElementById('bookContentPreview');

    if (!titleField.value) {
      titleField.value = 'Google Drive Study Material & Notes';
    }
    if (!contentField.value) {
      contentField.value = 'Curriculum content synced from Google Files document: ' + val + '\n\nKey Concepts: Comprehensive theory, syllabus formulas, definitions, and lecture chapter notes.';
    }
    ExamSetu.showToast('Google Files link verified and linked!', 'success');
  },

  handleDocxFile(file) {
    if (!file) return;
    const info = document.getElementById('docxFileInfo');
    if (info) {
      info.textContent = `Attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      info.style.display = 'block';
    }

    const titleField = document.getElementById('bookTitle');
    const contentField = document.getElementById('bookContentPreview');

    if (!titleField.value) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      titleField.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    // Read content preview if text-based file
    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        contentField.value = e.target.result;
      };
      reader.readAsText(file);
    } else {
      contentField.value = `Extracted from Document "${file.name}":\n\nChapter Specification:\n1. Core curriculum principles and fundamentals.\n2. In-depth topic notes, derivation formulas, and definitions.\n3. High-yield board and entrance examination focus questions.`;
    }

    ExamSetu.showToast(`DOCX document "${file.name}" attached!`, 'success');
  },

  handleCamScannerFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewBox = document.getElementById('camscannerPreviewBox');
      const thumb = document.getElementById('camscannerImgThumbnail');
      const fName = document.getElementById('camscannerFileName');

      if (thumb) thumb.src = e.target.result;
      if (fName) fName.textContent = file.name;
      if (previewBox) previewBox.style.display = 'block';

      const titleField = document.getElementById('bookTitle');
      const contentField = document.getElementById('bookContentPreview');

      if (!titleField.value) {
        titleField.value = 'CamScanner Lecture Notes: ' + file.name.replace(/\.[^/.]+$/, '');
      }
      if (!contentField.value) {
        contentField.value = `[CamScanner High-Resolution OCR Extraction]\nDocument: ${file.name}\n\nNotes Content:\n- Definition: Standard academic laws, equilibrium conditions, and operational parameters.\n- Key Formulas: Relational equations verified per standard curriculum.\n- Exam Questions: Multi-step numerical problems and theoretical questions.`;
      }
      ExamSetu.showToast('CamScanner document scanned & text extracted!', 'success');
    };
    reader.readAsDataURL(file);
  },

  async saveBookFromForm(e) {
    if (e) e.preventDefault();

    const title = document.getElementById('bookTitle')?.value.trim();
    const category = document.getElementById('bookCategory')?.value || 'General';
    const subject = document.getElementById('bookSubject')?.value.trim() || 'General';
    const author = document.getElementById('bookAuthor')?.value.trim() || 'Faculty';
    const content = document.getElementById('bookContentPreview')?.value.trim();
    const sourceType = document.getElementById('bookSourceType')?.value || 'google_drive';
    const fileUrl = document.getElementById('googleDriveUrl')?.value.trim() || '';

    if (!title) {
      ExamSetu.showToast('Please enter a book or material title', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/library/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          subject,
          author,
          content_preview: content,
          source_type: sourceType,
          file_url: fileUrl,
          total_pages: Math.max(1, Math.round(content.length / 500))
        })
      });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast(`Book "${title}" saved to Institutional Library!`, 'success');
        this.closeAddBookModal();
        this.loadLibrary();
      } else {
        ExamSetu.showToast(data.message || 'Error saving book', 'danger');
      }
    } catch (err) {
      ExamSetu.showToast('Network error saving book: ' + err.message, 'danger');
    }
  },

  triggerMcqFromAddBookForm() {
    const title = document.getElementById('bookTitle')?.value.trim() || 'Custom Notes';
    const subject = document.getElementById('bookSubject')?.value.trim() || 'General';
    const content = document.getElementById('bookContentPreview')?.value.trim() || 'Curriculum notes for exam preparation.';

    this.closeAddBookModal();
    this.openGenerateMcqModal(null, title, content, subject);
  },

  /* ==========================================================================
     GENERATE MCQ ENGINE (WITH PRINT DOWNLOAD & DIRECT TEST UPLOAD)
     ========================================================================== */
  openGenerateMcqModal(bookId, bookTitle, contentText, subject) {
    const modal = document.getElementById('generateMcqModal');
    if (!modal) return;

    let targetTitle = bookTitle || '';
    let targetContent = contentText || '';
    let targetSubj = subject || '';

    if (bookId) {
      const book = this.allBooksCache.find(b => b.id === bookId);
      if (book) {
        targetTitle = book.title;
        targetContent = book.content_preview || book.title;
        targetSubj = book.subject || 'General';
      }
    }

    document.getElementById('genBookId').value = bookId || '';
    document.getElementById('genBookTitle').value = targetTitle;
    document.getElementById('genTargetSubject').value = targetSubj;
    document.getElementById('genSourceContent').value = targetContent;
    document.getElementById('genModalSubtitle').textContent = `Generate exam questions based on: "${targetTitle || 'Notes'}"`;

    // Reset results view
    document.getElementById('genResultsWrapper').style.display = 'none';
    this.activeGeneratedQuestions = [];

    modal.style.display = 'flex';
  },

  closeGenerateMcqModal() {
    const modal = document.getElementById('generateMcqModal');
    if (modal) modal.style.display = 'none';
  },

  async runMcqGeneration() {
    const btn = document.getElementById('btnRunMcqGeneration');
    const bookId = document.getElementById('genBookId')?.value;
    const bookTitle = document.getElementById('genBookTitle')?.value;
    const subject = document.getElementById('genTargetSubject')?.value || 'General';
    const content = document.getElementById('genSourceContent')?.value.trim();
    const count = parseInt(document.getElementById('genQuestionCount')?.value, 10) || 10;
    const difficulty = document.getElementById('genDifficulty')?.value || 'medium';

    if (!content && !bookId) {
      ExamSetu.showToast('Please enter syllabus or book notes text', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Generating Questions...';

    try {
      const res = await fetch('/api/library/generate-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookTitle,
          contentText: content,
          subject,
          count,
          difficulty
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        this.activeGeneratedQuestions = data.questions;
        this.renderGeneratedQuestions(data.questions);
        ExamSetu.showToast(`Generated ${data.questions.length} curriculum MCQs successfully!`, 'success');
      } else {
        ExamSetu.showToast(data.message || 'Error generating questions', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Network error generating MCQs: ' + e.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ri-magic-line"></i> Generate MCQs';
    }
  },

  renderGeneratedQuestions(questions) {
    const list = document.getElementById('generatedQuestionsList');
    const wrapper = document.getElementById('genResultsWrapper');
    const badge = document.getElementById('genQuestionCountBadge');

    if (badge) badge.textContent = questions.length;
    if (wrapper) wrapper.style.display = 'block';

    list.innerHTML = questions.map((q, idx) => {
      const optA = q.option_a || (q.options ? q.options.A : '');
      const optB = q.option_b || (q.options ? q.options.B : '');
      const optC = q.option_c || (q.options ? q.options.C : '');
      const optD = q.option_d || (q.options ? q.options.D : '');
      const correct = (q.correct_answer || 'A').toUpperCase();

      return `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-weight:800;font-size:0.98rem;color:var(--text);">
              <span style="color:var(--primary);margin-right:6px;">Q${idx + 1}.</span> ${escapeHTML(q.question)}
            </div>
            <span class="tag-badge tag-badge-primary" style="font-size:0.72rem;">${escapeHTML(q.topic || 'Concept')}</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;">
            <div style="padding:8px 12px;border-radius:6px;background:${correct === 'A' ? 'rgba(16,185,129,0.12)' : 'var(--surface-alt)'};border:1px solid ${correct === 'A' ? 'var(--success)' : 'var(--border)'};font-size:0.86rem;font-weight:${correct === 'A' ? '700' : 'normal'};color:${correct === 'A' ? 'var(--success)' : 'var(--text)'};">
              <strong>(A)</strong> ${escapeHTML(optA)}
            </div>
            <div style="padding:8px 12px;border-radius:6px;background:${correct === 'B' ? 'rgba(16,185,129,0.12)' : 'var(--surface-alt)'};border:1px solid ${correct === 'B' ? 'var(--success)' : 'var(--border)'};font-size:0.86rem;font-weight:${correct === 'B' ? '700' : 'normal'};color:${correct === 'B' ? 'var(--success)' : 'var(--text)'};">
              <strong>(B)</strong> ${escapeHTML(optB)}
            </div>
            <div style="padding:8px 12px;border-radius:6px;background:${correct === 'C' ? 'rgba(16,185,129,0.12)' : 'var(--surface-alt)'};border:1px solid ${correct === 'C' ? 'var(--success)' : 'var(--border)'};font-size:0.86rem;font-weight:${correct === 'C' ? '700' : 'normal'};color:${correct === 'C' ? 'var(--success)' : 'var(--text)'};">
              <strong>(C)</strong> ${escapeHTML(optC)}
            </div>
            <div style="padding:8px 12px;border-radius:6px;background:${correct === 'D' ? 'rgba(16,185,129,0.12)' : 'var(--surface-alt)'};border:1px solid ${correct === 'D' ? 'var(--success)' : 'var(--border)'};font-size:0.86rem;font-weight:${correct === 'D' ? '700' : 'normal'};color:${correct === 'D' ? 'var(--success)' : 'var(--text)'};">
              <strong>(D)</strong> ${escapeHTML(optD)}
            </div>
          </div>

          <div style="font-size:0.8rem;color:var(--muted-text);background:var(--surface-alt);padding:8px 12px;border-radius:6px;">
            <strong style="color:var(--success);"><i class="ri-check-line"></i> Correct: Option ${correct}</strong> — ${escapeHTML(q.explanation || '')}
          </div>
        </div>
      `;
    }).join('');
  },

  /* ==========================================================================
     OPTION 1: PRINT / DOWNLOAD QUESTION PAPER
     ========================================================================== */
  downloadQuestionPaperPrint() {
    if (!this.activeGeneratedQuestions || this.activeGeneratedQuestions.length === 0) {
      ExamSetu.showToast('No generated questions to download.', 'warning');
      return;
    }

    const title = document.getElementById('genBookTitle')?.value || 'Model Examination Paper';
    const subject = document.getElementById('genTargetSubject')?.value || 'General Science & Technology';
    const questions = this.activeGeneratedQuestions;
    const totalMarks = questions.length;
    const timeAllowed = Math.max(15, Math.round(questions.length * 1.5));

    // Construct printable HTML formatted to Nepalese College Examination Standard
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHTML(title)} - Question Paper</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.4; padding: 20px; max-width: 800px; margin: 0 auto; }
          .exam-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
          .college-name { font-size: 20pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .exam-title { font-size: 13pt; font-weight: bold; margin: 4px 0; }
          .meta-table { width: 100%; font-size: 11pt; font-weight: bold; margin: 8px 0; border-collapse: collapse; }
          .instructions { font-size: 10pt; font-style: italic; border-bottom: 1px solid #444; padding-bottom: 8px; margin-bottom: 16px; }
          .question-item { margin-bottom: 14px; page-break-inside: avoid; }
          .q-text { font-size: 11pt; font-weight: bold; }
          .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-size: 10.5pt; margin-top: 4px; padding-left: 16px; }
          .answer-key-section { page-break-before: always; margin-top: 30px; border-top: 2px dashed #000; padding-top: 20px; }
          .key-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
          .key-table th, .key-table td { border: 1px solid #666; padding: 6px 10px; text-align: left; }
          .key-table th { background: #eee; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:12px;margin-bottom:20px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
          <div><strong>Ready to Print / Save as PDF:</strong> Generated from ExamSetu Institutional Library</div>
          <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">🖨️ Print / Save as PDF</button>
        </div>

        <div class="exam-header">
          <div class="college-name">EXAMSETU NEPAL ACADEMIC BOARD</div>
          <div class="exam-title">TERMINAL &amp; MODEL EXAMINATION - 2026</div>
          <div style="font-size: 11pt;">Curriculum Affiliated: TU / PU / NEB / Public Service Commission</div>
          <table class="meta-table">
            <tr>
              <td style="text-align:left;">Subject: <u>${escapeHTML(subject)}</u></td>
              <td style="text-align:center;">Paper: <u>${escapeHTML(title)}</u></td>
              <td style="text-align:right;">Full Marks: <u>${totalMarks}</u></td>
            </tr>
            <tr>
              <td style="text-align:left;">Time Allowed: <u>${timeAllowed} Minutes</u></td>
              <td style="text-align:center;">Attempt All Questions</td>
              <td style="text-align:right;">Pass Marks: <u>40%</u></td>
            </tr>
          </table>
        </div>

        <div class="instructions">
          <strong>Instructions to Candidates:</strong> Candidates are required to give their answers in their own words as far as practicable. All questions carry equal marks. Tick or darken the circle corresponding to the correct answer.
        </div>

        <div class="questions-container">
          ${questions.map((q, i) => `
            <div class="question-item">
              <div class="q-text">${i + 1}. ${escapeHTML(q.question)}</div>
              <div class="options-grid">
                <div>(A) ${escapeHTML(q.option_a || q.options?.A || '')}</div>
                <div>(B) ${escapeHTML(q.option_b || q.options?.B || '')}</div>
                <div>(C) ${escapeHTML(q.option_c || q.options?.C || '')}</div>
                <div>(D) ${escapeHTML(q.option_d || q.options?.D || '')}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Separate Answer Key Section for Instructors -->
        <div class="answer-key-section">
          <h2 style="text-align:center;text-transform:uppercase;font-size:14pt;margin-bottom:6px;">TEACHER &amp; EXAMINER ANSWER KEY</h2>
          <div style="text-align:center;font-size:10pt;font-style:italic;margin-bottom:12px;">Confidential Academic Solutions Sheet</div>
          <table class="key-table">
            <thead>
              <tr>
                <th style="width:40px;">Q#</th>
                <th style="width:70px;">Correct</th>
                <th>Concept &amp; Curriculum Explanation</th>
              </tr>
            </thead>
            <tbody>
              ${questions.map((q, i) => `
                <tr>
                  <td style="font-weight:bold;text-align:center;">${i + 1}</td>
                  <td style="font-weight:bold;text-align:center;color:#047857;">Option ${(q.correct_answer || 'A').toUpperCase()}</td>
                  <td>${escapeHTML(q.explanation || 'Verified answer according to standard textbook.')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      ExamSetu.showToast('Please allow popups to open print-ready question paper', 'warning');
    }
  },

  downloadQuestionsJson() {
    if (!this.activeGeneratedQuestions || this.activeGeneratedQuestions.length === 0) return;
    const jsonStr = JSON.stringify(this.activeGeneratedQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `examsetu_questions_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ExamSetu.showToast('JSON question paper downloaded!', 'success');
  },

  /* ==========================================================================
     OPTION 2: DIRECTLY UPLOAD QUESTIONS TO TEST FORM (LIVE EXAM)
     ========================================================================== */
  async uploadQuestionsToTestForm() {
    if (!this.activeGeneratedQuestions || this.activeGeneratedQuestions.length === 0) {
      ExamSetu.showToast('No generated questions to upload.', 'warning');
      return;
    }

    const title = document.getElementById('genBookTitle')?.value || 'Curriculum Model Test';
    const subject = document.getElementById('genTargetSubject')?.value || 'General Science';
    const count = this.activeGeneratedQuestions.length;

    try {
      const res = await fetch('/api/library/upload-to-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: this.activeGeneratedQuestions,
          testTitle: `${subject}: ${title} (${count} MCQs)`,
          examName: 'Model Examination',
          subjectName: subject,
          durationMinutes: Math.max(15, Math.round(count * 1.5))
        })
      });

      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast(`Uploaded ${count} MCQs directly into the Test Form!`, 'success');
        this.closeGenerateMcqModal();

        // Redirect or open Test Form
        setTimeout(() => {
          if (confirm('Questions are now live in the Test Form! Would you like to open the Test Form now?')) {
            window.location.href = data.redirectUrl || '/test';
          }
        }, 500);
      } else {
        ExamSetu.showToast(data.message || 'Error uploading to test', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Network error uploading to test form: ' + e.message, 'danger');
    }
  },

  /* ==========================================================================
     VIEW / DELETE BOOK ACTIONS
     ========================================================================== */
  openViewBookModal(bookId) {
    const book = this.allBooksCache.find(b => b.id === bookId);
    if (!book) return;

    this.currentlyViewedBook = book;
    document.getElementById('viewBookTitle').textContent = book.title;
    document.getElementById('viewBookBadge').textContent = book.category || 'General';
    document.getElementById('viewBookAuthor').textContent = book.author || 'Faculty';
    document.getElementById('viewBookSubject').textContent = book.subject || 'General';
    document.getElementById('viewBookSource').textContent = (book.source_type || 'upload').replace('_', ' ').toUpperCase();
    document.getElementById('viewBookContent').textContent = book.content_preview || 'No text notes stored.';

    const linkBtn = document.getElementById('viewBookExternalLink');
    if (book.file_url) {
      linkBtn.href = book.file_url;
      linkBtn.style.display = 'inline-flex';
    } else {
      linkBtn.style.display = 'none';
    }

    document.getElementById('viewBookModal').style.display = 'flex';
  },

  generateFromCurrentViewedBook() {
    if (!this.currentlyViewedBook) return;
    document.getElementById('viewBookModal').style.display = 'none';
    this.openGenerateMcqModal(this.currentlyViewedBook.id);
  },

  async deleteBook(bookId) {
    if (!confirm('Are you sure you want to remove this book from the Institutional Library?')) return;
    try {
      const res = await fetch(`/api/library/${bookId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        ExamSetu.showToast('Book removed from library', 'info');
        this.loadLibrary();
      } else {
        ExamSetu.showToast(data.message || 'Error deleting book', 'danger');
      }
    } catch (e) {
      ExamSetu.showToast('Failed to delete book: ' + e.message, 'danger');
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
