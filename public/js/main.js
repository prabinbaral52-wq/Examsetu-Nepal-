// ==========================================================================
// ExamSetu Nepal - Main Client Application Logic (Web First)
// ==========================================================================

const ExamSetu = {
  // Initialize Global Features
  init() {
    this.initTheme();
    this.initMobileMenu();
    this.checkAuthStatus();
    this.initMobileBottomBar();
  },

  // Ambition Guru-Style Mobile Bottom App Bar
  initMobileBottomBar() {
    if (document.querySelector('.mobile-bottom-bar')) return;
    const isFileProto = window.location.protocol === 'file:';
    const currentPath = window.location.pathname;

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-bar';
    nav.setAttribute('aria-label', 'Mobile Bottom Navigation');

    const homeUrl = isFileProto ? 'index.html' : '/';
    const libUrl = isFileProto ? 'dashboard.html#librarySection' : '/dashboard#librarySection';
    const examsUrl = isFileProto ? 'exams.html' : '/exams';
    const guruUrl = isFileProto ? 'guru.html' : '/guru';
    const dashUrl = isFileProto ? 'dashboard.html' : '/dashboard';

    const isHome = currentPath === '/' || currentPath.endsWith('index.html') || currentPath === '';
    const isLib = window.location.hash === '#librarySection';
    const isExams = currentPath.includes('/exams') || currentPath.includes('/practice') || currentPath.includes('/test');
    const isGuru = currentPath.includes('/guru');
    const isDash = (currentPath.includes('/dashboard') || currentPath.includes('/admin')) && !isLib;

    nav.innerHTML = `
      <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}">
        <i class="ri-home-5-${isHome ? 'fill' : 'line'}"></i>
        <span>Home</span>
      </a>
      <a href="${libUrl}" class="bottom-nav-item ${isLib ? 'active' : ''}">
        <i class="ri-book-2-${isLib ? 'fill' : 'line'}"></i>
        <span>Library</span>
      </a>
      <a href="${examsUrl}" class="bottom-nav-item ${isExams ? 'active' : ''}">
        <i class="ri-file-list-3-${isExams ? 'fill' : 'line'}"></i>
        <span>Tests</span>
      </a>
      <a href="${guruUrl}" class="bottom-nav-item ${isGuru ? 'active' : ''}">
        <i class="ri-sparkling-${isGuru ? 'fill' : 'line'}"></i>
        <span>Guru AI</span>
      </a>
      <a href="${dashUrl}" class="bottom-nav-item ${isDash ? 'active' : ''}">
        <i class="ri-user-3-${isDash ? 'fill' : 'line'}"></i>
        <span>Dashboard</span>
      </a>
    `;
    document.body.appendChild(nav);
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

  // Mobile/Responsive Header Navigation Menu
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

  // User Authentication State with Persistent Auto-Login (Remember Me)
  async checkAuthStatus() {
    try {
      let res = await fetch('/api/auth/me');
      let data = await res.json();

      // If server session is not active, attempt auto-login using persisted local credentials
      if (!data.success || !data.user) {
        const savedUserJson = localStorage.getItem('examsetu_user');
        if (savedUserJson) {
          try {
            const savedUser = JSON.parse(savedUserJson);
            if (savedUser && (savedUser.id || savedUser.email)) {
              const autoRes = await fetch('/api/auth/auto-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: savedUser.id, email: savedUser.email })
              });
              const autoData = await autoRes.json();
              if (autoData.success && autoData.user) {
                data = autoData;
                localStorage.setItem('examsetu_user', JSON.stringify(autoData.user));
                localStorage.setItem('examsetu_logged_in', 'true');
              }
            }
          } catch (err) {
            console.warn('Auto-login parse error:', err);
          }
        }
      } else {
        localStorage.setItem('examsetu_user', JSON.stringify(data.user));
        localStorage.setItem('examsetu_logged_in', 'true');
      }

      // If user is already authenticated and visits login/register page, auto-redirect to dashboard
      const currentPath = window.location.pathname;
      if (data.success && data.user && (currentPath === '/login' || currentPath === '/register' || currentPath.endsWith('login.html') || currentPath.endsWith('register.html'))) {
        window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
        return;
      }

      const authSlot = document.getElementById('navAuthSlot');
      if (authSlot) {
        if (data.success && data.user) {
          const isAdmin = data.user.role === 'admin';
          authSlot.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
              <a href="${isAdmin ? '/admin' : '/dashboard'}" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">
                <i class="ri-user-smile-line" style="color:var(--primary);"></i> <span>${escapeHTML(data.user.name.split(' ')[0])}</span>
                ${isAdmin ? '<span class="tag-badge tag-badge-primary" style="margin-left:2px;font-size:0.68rem;padding:2px 6px;">Admin</span>' : ''}
              </a>
              <button onclick="ExamSetu.logout()" class="btn btn-outline btn-sm" title="Sign Out" style="padding:6px 10px;">
                <i class="ri-logout-box-r-line"></i>
              </button>
            </div>
          `;
        } else {
          authSlot.innerHTML = `
            <a href="/login" class="btn btn-secondary btn-sm" style="font-weight:700;">Login</a>
            <a href="/register" class="btn btn-primary btn-sm" style="font-weight:700;">Join Free</a>
          `;
        }
      }

      // Update Home Screen Dynamic Welcome Banner if present
      const homeGreeting = document.getElementById('homeUserGreeting');
      if (homeGreeting) {
        if (data.success && data.user) {
          homeGreeting.innerHTML = `
            <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:16px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;box-shadow:var(--shadow-sm);">
              <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#3b82f6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;box-shadow:0 3px 8px rgba(37,99,235,0.3);">
                  ${escapeHTML(data.user.name.charAt(0).toUpperCase())}
                </div>
                <div>
                  <div style="font-size:0.82rem;color:var(--muted-text);font-weight:600;">Welcome back,</div>
                  <div style="font-size:1.15rem;font-weight:800;color:var(--text);">${escapeHTML(data.user.name)}</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <a href="/dashboard" class="btn btn-primary btn-sm" style="font-weight:700;">
                  <i class="ri-dashboard-line"></i> Go to Dashboard
                </a>
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      console.warn('Auth check skipped:', e.message);
    }
  },

  // Logout & Clean Persistence
  async logout() {
    try {
      localStorage.removeItem('examsetu_user');
      localStorage.removeItem('examsetu_logged_in');
      await fetch('/api/auth/logout', { method: 'POST' });
      this.showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err) {
      localStorage.removeItem('examsetu_user');
      localStorage.removeItem('examsetu_logged_in');
      window.location.href = '/';
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

// Global Instant Link Interceptor for Smooth Navigation
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
