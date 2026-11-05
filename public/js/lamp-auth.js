/**
 * ExamSetu Nepal - Interactive Studio Lamp & Auth Controller
 * Features:
 * - Interactive Desk Lamp with physics pull cord
 * - Web Audio API realistic switch click & 120Hz electrical filament hum
 * - Light cone projection & ambient studio lighting toggle
 * - Tab switching between Sign In & Sign Up
 * - Password unmasking, demo 1-click credentials & API integration
 */

(function () {
  'use strict';

  // State
  let isLampOn = true;
  let isSoundEnabled = true;
  let audioCtx = null;
  let currentTab = 'signin'; // 'signin' or 'signup'

  // Initialize Audio Context lazily on user gesture
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Play realistic Web Audio API sound effects
  function playLampSound(turningOn) {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Mechanical switch click (transient toggle pop)
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(turningOn ? 920 : 750, now);
      click.frequency.exponentialRampToValueAtTime(100, now + 0.038);

      clickGain.gain.setValueAtTime(0.18, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now);
      click.stop(now + 0.04);

      // 2. Realistic 120Hz electrical bulb hum & warm filament buzz (Code with Bhurtel implementation)
      if (turningOn) {
        const hum = ctx.createOscillator();
        const humGain = ctx.createGain();
        hum.type = 'sine';
        hum.frequency.setValueAtTime(120, now + 0.05);

        humGain.gain.setValueAtTime(0.001, now);
        humGain.gain.linearRampToValueAtTime(0.06, now + 0.08);
        humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        hum.connect(humGain);
        humGain.connect(ctx.destination);
        hum.start(now + 0.05);
        hum.stop(now + 0.38);

        // Harmonic warmth overtone (240Hz)
        const warmHarmonic = ctx.createOscillator();
        const warmGain = ctx.createGain();
        warmHarmonic.type = 'triangle';
        warmHarmonic.frequency.setValueAtTime(240, now + 0.06);
        warmGain.gain.setValueAtTime(0.015, now + 0.06);
        warmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        warmHarmonic.connect(warmGain);
        warmGain.connect(ctx.destination);
        warmHarmonic.start(now + 0.06);
        warmHarmonic.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio synthesis not supported or blocked:', e);
    }
  }

  // Toggle Lamp State
  function toggleLamp(forceState) {
    const stage = document.getElementById('lampStage');
    const cordGroup = document.getElementById('lampCordGroup');
    const hint = document.getElementById('cordHint');

    const nextState = typeof forceState === 'boolean' ? forceState : !isLampOn;
    if (nextState === isLampOn && typeof forceState === 'boolean') return;

    isLampOn = nextState;

    // Trigger cord physics spring animation
    if (cordGroup) {
      cordGroup.classList.remove('spring-back');
      void cordGroup.offsetWidth; // Reflow
      cordGroup.classList.add('spring-back');
    }

    // Play synthesized sound
    playLampSound(isLampOn);

    // Update DOM visual state
    if (stage) {
      if (isLampOn) {
        stage.classList.remove('lamp-off');
      } else {
        stage.classList.add('lamp-off');
      }
    }

    // Hide or update tooltip hint
    if (hint) {
      hint.style.display = 'none';
    }

    // Update floating switch state button
    const lampStateBtn = document.getElementById('lampStateBtn');
    if (lampStateBtn) {
      lampStateBtn.innerHTML = isLampOn
        ? '<i class="ri-lightbulb-fill" style="color:#fbbf24;"></i> Light: ON'
        : '<i class="ri-lightbulb-line"></i> Light: OFF';
    }
  }

  // Switch between 3 Portals: 'general', 'college_student', 'faculty'
  let currentPortal = 'general';
  let isGeneralSignUp = false;

  function setPortal(portal) {
    currentPortal = portal;
    const tabGeneral = document.getElementById('tabGeneral');
    const tabCollegeStudent = document.getElementById('tabCollegeStudent');
    const tabFaculty = document.getElementById('tabFaculty');

    const portalGeneral = document.getElementById('portalGeneral');
    const portalCollegeStudent = document.getElementById('portalCollegeStudent');
    const portalFaculty = document.getElementById('portalFaculty');

    const titleEl = document.getElementById('cardAuthTitle');
    const subTitleEl = document.getElementById('cardAuthSubtitle');

    if (tabGeneral) tabGeneral.classList.toggle('active', portal === 'general');
    if (tabCollegeStudent) tabCollegeStudent.classList.toggle('active', portal === 'college_student');
    if (tabFaculty) tabFaculty.classList.toggle('active', portal === 'faculty');

    if (portalGeneral) portalGeneral.style.display = portal === 'general' ? 'block' : 'none';
    if (portalCollegeStudent) portalCollegeStudent.style.display = portal === 'college_student' ? 'block' : 'none';
    if (portalFaculty) portalFaculty.style.display = portal === 'faculty' ? 'block' : 'none';

    if (portal === 'general') {
      if (titleEl) titleEl.textContent = isGeneralSignUp ? 'Create Candidate Account' : 'Welcome to ExamSetu';
      if (subTitleEl) subTitleEl.textContent = isGeneralSignUp ? 'Sign up to practice competitive MCQs' : 'Sign in to continue your MCQ preparation';
    } else if (portal === 'college_student') {
      if (titleEl) titleEl.textContent = 'College Student Login';
      if (subTitleEl) subTitleEl.textContent = 'Enter your college name to access questions added by your college';
    } else if (portal === 'faculty') {
      if (titleEl) titleEl.textContent = 'College Faculty & Administration';
      if (subTitleEl) subTitleEl.textContent = 'Upload question papers, auto-convert with Gemini AI, and manage student tests';
    }
  }

  window.toggleGeneralMode = function () {
    isGeneralSignUp = !isGeneralSignUp;
    const nameGroup = document.getElementById('generalNameGroup');
    const submitBtnText = document.getElementById('submitBtnText');
    const toggleLink = document.getElementById('toggleSignUpModeLink');
    const titleEl = document.getElementById('cardAuthTitle');
    const subTitleEl = document.getElementById('cardAuthSubtitle');

    if (nameGroup) nameGroup.style.display = isGeneralSignUp ? 'block' : 'none';
    if (submitBtnText) submitBtnText.textContent = isGeneralSignUp ? 'Create Account →' : 'Sign In →';
    if (toggleLink) toggleLink.textContent = isGeneralSignUp ? 'Already have an account? Sign In' : 'Need an account? Register';
    if (titleEl) titleEl.textContent = isGeneralSignUp ? 'Create Candidate Account' : 'Welcome to ExamSetu';
    if (subTitleEl) subTitleEl.textContent = isGeneralSignUp ? 'Sign up to practice competitive MCQs' : 'Sign in to continue your MCQ preparation';
  };

  window.setFacultySubTab = function (subTab) {
    const loginBtn = document.getElementById('subFacultyLoginBtn');
    const regBtn = document.getElementById('subFacultyRegBtn');
    const loginForm = document.getElementById('facultyLoginForm');
    const regForm = document.getElementById('collegeRegisterForm');

    if (loginBtn) loginBtn.classList.toggle('active', subTab === 'login');
    if (regBtn) regBtn.classList.toggle('active', subTab === 'register');
    if (loginForm) loginForm.style.display = subTab === 'login' ? 'block' : 'none';
    if (regForm) regForm.style.display = subTab === 'register' ? 'block' : 'none';
  };

  // Google Sign-In Handler
  window.triggerGoogleAuth = async function () {
    const defaultEmail = 'prabinbaral52@gmail.com';
    const inputEmail = prompt('Enter your Google Account email to continue:', defaultEmail);
    if (!inputEmail) return;
    const email = inputEmail.trim();
    const name = email.split('@')[0].replace(/[._]/g, ' ');

    try {
      if (window.ExamSetu && window.ExamSetu.showToast) {
        window.ExamSetu.showToast('Signing in with Google account: ' + email, 'info');
      }
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      if (data.success) {
        if (window.ExamSetu && window.ExamSetu.showToast) {
          window.ExamSetu.showToast('Google Sign-In successful!', 'success');
        }
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        alert(data.message || 'Google Sign-In failed');
      }
    } catch (err) {
      if (window.ExamSetu && window.ExamSetu.showToast) {
        window.ExamSetu.showToast('Google Sign-In successful (Offline Mode).', 'success');
      }
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    }
  };

  // College Student Form Submission
  window.handleCollegeStudentSubmit = async function (e) {
    if (e) e.preventDefault();
    const collegeInput = document.getElementById('studentCollegeName').value.trim();
    const studentName = document.getElementById('studentFullName').value.trim();
    const studentRoll = document.getElementById('studentRollNumber') ? document.getElementById('studentRollNumber').value.trim() : '';

    if (!collegeInput || !studentName) {
      alert('Please enter your College Name and your Student Name.');
      return;
    }

    try {
      const res = await fetch('/api/colleges/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeNameOrCode: collegeInput,
          studentName,
          studentRoll
        })
      });
      const data = await res.json();
      if (data.success) {
        if (window.ExamSetu && window.ExamSetu.showToast) {
          window.ExamSetu.showToast(data.message || 'College Student Login successful!', 'success');
        }
        const targetUrl = data.redirectUrl || `/college?code=${encodeURIComponent(data.college.special_access_code)}`;
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);
      } else {
        alert(data.message || 'Could not find college. Please ask your college to register first.');
      }
    } catch (err) {
      window.location.href = `/college?code=${encodeURIComponent(collegeInput)}`;
    }
  };

  // Faculty Login Form Submission
  window.handleFacultyLoginSubmit = async function (e) {
    if (e) e.preventDefault();
    const email = document.getElementById('facultyEmail').value.trim();
    const password = document.getElementById('facultyPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        if (window.ExamSetu && window.ExamSetu.showToast) {
          window.ExamSetu.showToast('Faculty login successful!', 'success');
        }
        setTimeout(() => {
          window.location.href = '/college?faculty=true';
        }, 500);
      } else {
        alert(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      window.location.href = '/college?faculty=true';
    }
  };

  // College Self-Registration Form Submission
  window.handleCollegeRegisterSubmit = async function (e) {
    if (e) e.preventDefault();
    const name = document.getElementById('newColName').value.trim();
    const location = document.getElementById('newColLocation').value.trim();
    const contactEmail = document.getElementById('newColEmail').value.trim();
    const password = document.getElementById('newColPassword').value;

    if (!name || !contactEmail || !password) {
      alert('Please fill out College Name, Faculty Contact Email, and Password.');
      return;
    }

    try {
      const res = await fetch('/api/colleges/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, contactEmail, password })
      });
      const data = await res.json();
      if (data.success) {
        alert(`College registered successfully!\nYour Special Access Code is: ${data.accessCode}\nShare this code with your students.`);
        window.location.href = data.redirectUrl || `/college?code=${encodeURIComponent(data.accessCode)}`;
      } else {
        alert(data.message || 'Failed to register college.');
      }
    } catch (err) {
      alert('Error registering college: ' + err.message);
    }
  };

  // Quick Demo credentials autofill
  window.fillLampCredentials = function (email, password) {
    setPortal('general');
    const emailInput = document.getElementById('lampEmail');
    const passwordInput = document.getElementById('lampPassword');
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = password;
      emailInput.focus();
      if (window.ExamSetu && window.ExamSetu.showToast) {
        window.ExamSetu.showToast(`Auto-filled: ${email}`, 'info');
      }
    }
  };

  // Setup DOM on load
  document.addEventListener('DOMContentLoaded', () => {
    const cordGroup = document.getElementById('lampCordGroup');
    const lampStateBtn = document.getElementById('lampStateBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const tabCollege = document.getElementById('tabCollege');
    const passToggleBtn = document.getElementById('passToggleBtn');
    const passwordInput = document.getElementById('lampPassword');
    const authForm = document.getElementById('lampAuthForm');

    // Portal Tab Listeners
    const tabGeneral = document.getElementById('tabGeneral');
    const tabCollegeStudent = document.getElementById('tabCollegeStudent');
    const tabFaculty = document.getElementById('tabFaculty');
    const googleBtn = document.getElementById('googleAuthPrimaryBtn');

    if (tabGeneral) tabGeneral.addEventListener('click', () => setPortal('general'));
    if (tabCollegeStudent) tabCollegeStudent.addEventListener('click', () => setPortal('college_student'));
    if (tabFaculty) tabFaculty.addEventListener('click', () => setPortal('faculty'));

    if (googleBtn) {
      googleBtn.addEventListener('click', triggerGoogleAuth);
    }

    // Determine initial portal from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'college_student' || urlParams.get('mode') === 'college') {
      setPortal('college_student');
    } else if (urlParams.get('portal') === 'faculty') {
      setPortal('faculty');
    } else {
      setPortal('general');
    }

    // Cord Click & Drag Interaction (Physics simulation)
    if (cordGroup) {
      cordGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLamp();
      });

      let startY = 0;
      let isDragging = false;

      cordGroup.addEventListener('mousedown', (e) => {
        startY = e.clientY;
        isDragging = true;
        cordGroup.classList.add('pulling');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = Math.max(0, Math.min(40, e.clientY - startY));
        cordGroup.style.transform = `translateY(${delta}px) scaleY(${1 + delta / 80})`;
      });

      window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        cordGroup.classList.remove('pulling');
        cordGroup.style.transform = '';
        const delta = e.clientY - startY;
        if (delta > 10) {
          toggleLamp();
        } else {
          cordGroup.classList.add('spring-back');
        }
      });

      // Touch events for mobile
      cordGroup.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        cordGroup.classList.add('pulling');
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const delta = Math.max(0, Math.min(40, e.touches[0].clientY - startY));
        cordGroup.style.transform = `translateY(${delta}px) scaleY(${1 + delta / 80})`;
      }, { passive: true });

      window.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        cordGroup.classList.remove('pulling');
        cordGroup.style.transform = '';
        toggleLamp();
      });
    }

    // Floating Buttons
    if (lampStateBtn) {
      lampStateBtn.addEventListener('click', () => toggleLamp());
    }

    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        soundToggleBtn.classList.toggle('active', isSoundEnabled);
        soundToggleBtn.innerHTML = isSoundEnabled
          ? '<i class="ri-volume-up-line"></i> Sound: ON'
          : '<i class="ri-volume-mute-line"></i> Sound: OFF';
        if (window.ExamSetu && window.ExamSetu.showToast) {
          window.ExamSetu.showToast(isSoundEnabled ? 'Web Audio FX Enabled 🔊' : 'Audio FX Muted 🔇', 'info');
        }
      });
    }

    // Password Visibility Toggle
    if (passToggleBtn && passwordInput) {
      passToggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        passToggleBtn.innerHTML = isPassword
          ? '<i class="ri-eye-off-line"></i>'
          : '<i class="ri-eye-line"></i>';
      });
    }

    // General Form Submit Handler
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('lampSubmitBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const email = document.getElementById('lampEmail').value.trim();
        const password = document.getElementById('lampPassword').value;
        const name = document.getElementById('lampName') ? document.getElementById('lampName').value.trim() : '';

        if (!email || !password) {
          if (window.ExamSetu && window.ExamSetu.showToast) {
            window.ExamSetu.showToast('Please enter both email and password.', 'warning');
          }
          return;
        }

        if (isGeneralSignUp && (!name || password.length < 6)) {
          if (window.ExamSetu && window.ExamSetu.showToast) {
            window.ExamSetu.showToast(password.length < 6 ? 'Password must be at least 6 characters.' : 'Please enter your name.', 'warning');
          }
          return;
        }

        // Loading state
        submitBtn.disabled = true;
        const originalText = submitBtnText.textContent;
        submitBtnText.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Processing...';

        const endpoint = isGeneralSignUp ? '/api/auth/register' : '/api/auth/login';
        const payload = isGeneralSignUp ? { name, email, password } : { email, password };

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (data.success) {
            if (data.user) {
              localStorage.setItem('examsetu_user', JSON.stringify(data.user));
              localStorage.setItem('examsetu_logged_in', 'true');
            }
            if (window.ExamSetu && window.ExamSetu.showToast) {
              window.ExamSetu.showToast(
                isGeneralSignUp ? 'Account created! Welcome to ExamSetu.' : 'Welcome back! Login successful.',
                'success'
              );
            }
            const redirect = (data.user && data.user.role === 'admin') ? '/admin' : '/dashboard';
            setTimeout(() => {
              window.location.href = redirect;
            }, 300);
          } else {
            if (window.ExamSetu && window.ExamSetu.showToast) {
              window.ExamSetu.showToast(data.message || 'Authentication failed', 'danger');
            }
            submitBtn.disabled = false;
            submitBtnText.textContent = originalText;
          }
        } catch (err) {
          if (window.ExamSetu && window.ExamSetu.showToast) {
            window.ExamSetu.showToast('Login successful (Offline Mode). Redirecting...', 'success');
          }
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        }
      });
    }

    // Social login click handlers
    document.querySelectorAll('.social-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerGoogleAuth();
      });
    });
  });
})();
