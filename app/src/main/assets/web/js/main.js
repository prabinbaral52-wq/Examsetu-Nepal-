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
  },

  // Seamless Native-like Page Navigation for both Web and Android WebView (file:)
  navigateTo(url) {
    if (!url) return;
    const isFileProto = window.location.protocol === 'file:';

    if (!isFileProto) {
      window.location.href = url;
      return;
    }

    const parts = url.split('?');
    const path = parts[0];
    const query = parts[1] ? '?' + parts[1] : '';

    let target = 'index.html';
    const clean = path.replace(/^\//, '').replace(/\.html$/, '');

    if (clean === '' || clean === 'index') {
      target = 'index.html';
    } else if (clean === 'about' || clean === 'legal/about') {
      target = 'legal/about.html';
    } else if (clean === 'contact' || clean === 'legal/contact') {
      target = 'legal/contact.html';
    } else if (clean === 'privacy' || clean === 'legal/privacy') {
      target = 'legal/privacy.html';
    } else if (clean === 'terms' || clean === 'legal/terms') {
      target = 'legal/terms.html';
    } else if (clean === 'disclaimer' || clean === 'legal/disclaimer') {
      target = 'legal/disclaimer.html';
    } else {
      target = clean + '.html';
    }

    // Determine relative directory depth
    const currentLoc = window.location.pathname;
    let prefix = '';
    if (currentLoc.includes('/legal/') && !target.startsWith('legal/')) {
      prefix = '../';
    } else if (!currentLoc.includes('/legal/') && target.startsWith('legal/')) {
      prefix = '';
    }

    window.location.href = prefix + target + query;
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

// Global Instant Link Interceptor for Smooth Mobile Transition
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href) return;
  if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') return;
  if (href.startsWith('http://') || href.startsWith('https://')) return;

  if (window.location.protocol === 'file:') {
    e.preventDefault();
    ExamSetu.navigateTo(href);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  ExamSetu.init();
});
