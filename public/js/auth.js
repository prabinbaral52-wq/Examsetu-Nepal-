// ==========================================================================
// ExamSetu Nepal - Authentication Form Handler
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        ExamSetu.showToast('Please fill in both email and password.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Signing In...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          ExamSetu.showToast('Welcome back! Login successful.', 'success');
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect') || (data.user.role === 'admin' ? '/admin' : '/dashboard');
          setTimeout(() => {
            ExamSetu.navigateTo(redirect);
          }, 400);
        } else {
          ExamSetu.showToast(data.message || 'Login failed', 'danger');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In to ExamSetu';
        }
      } catch (err) {
        ExamSetu.showToast('Network error. Please try again.', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to ExamSetu';
      }
    });
  }

  // Handle Registration
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!name || !email || !password) {
        ExamSetu.showToast('All fields are required.', 'warning');
        return;
      }

      if (password.length < 6) {
        ExamSetu.showToast('Password must be at least 6 characters.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Creating Account...';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (data.success) {
          ExamSetu.showToast('Account created successfully! Welcome.', 'success');
          setTimeout(() => {
            ExamSetu.navigateTo('/dashboard');
          }, 400);
        } else {
          ExamSetu.showToast(data.message || 'Registration failed.', 'danger');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Create Free Account';
        }
      } catch (err) {
        ExamSetu.showToast('Network error during registration.', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Free Account';
      }
    });
  }
});

// Quick-fill credentials for testing
function fillCredentials(email, password) {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  if (emailInput && passwordInput) {
    emailInput.value = email;
    passwordInput.value = password;
    ExamSetu.showToast(`Auto-filled ${email}`, 'info');
  }
}
