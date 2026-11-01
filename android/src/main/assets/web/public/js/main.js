// ==========================================================================
// ExamSetu Nepal - Main Client Application Logic
// ==========================================================================

const ExamSetu = {
  // Initialize Global Features
  init() {
    this.initTheme();
    this.initMobileMenu();
    this.checkAuthStatus();
  },

  // Dark/Light Theme Handler
  initTheme() {
    const savedTheme = localStorage.getItem('examsetu_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      this.updateThemeIcon(themeToggleBtn, savedTheme);
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('examsetu_theme', next);
        this.updateThemeIcon(themeToggleBtn, next);
      });
    }
  },

  updateThemeIcon(btn, theme) {
    btn.innerHTML = theme === 'dark' ? '<i class="ri-sun-line"></i>' : '<i class="ri-moon-line"></i>';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  },

  // Mobile Navigation
  initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        const isOpen = links.classList.contains('open');
        toggle.innerHTML = isOpen ? '<i class="ri-close-line"></i>' : '<i class="ri-menu-line"></i>';
      });
    }
  },

  // User Authentication State
  async checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      const authSlot = document.getElementById('navAuthSlot');

      if (authSlot) {
        if (data.success && data.user) {
          const isAdmin = data.user.role === 'admin';
          authSlot.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <a href="${isAdmin ? '/admin' : '/dashboard'}" class="btn btn-secondary btn-sm" title="Go to Dashboard">
                <i class="ri-user-smile-line"></i> ${escapeHTML(data.user.name.split(' ')[0])}
                ${isAdmin ? '<span class="tag-badge tag-badge-primary" style="margin-left:4px;font-size:0.7rem;">Admin</span>' : ''}
              </a>
              <button onclick="ExamSetu.logout()" class="btn btn-outline btn-sm" title="Sign Out">
                <i class="ri-logout-box-r-line"></i>
              </button>
            </div>
          `;
        } else {
          authSlot.innerHTML = `
            <a href="/login" class="btn btn-secondary btn-sm">Login</a>
            <a href="/register" class="btn btn-primary btn-sm">Join Free</a>
          `;
        }
      }
    } catch (e) {
      console.warn('Auth check skipped:', e.message);
    }
  },

  // Logout
  async logout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Logged out successfully', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    } catch (err) {
      this.showToast('Error logging out', 'danger');
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'ri-checkbox-circle-line' : type === 'danger' ? 'ri-error-warning-line' : 'ri-information-line';
    toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHTML(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Security helper: sanitize HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  ExamSetu.init();
});
