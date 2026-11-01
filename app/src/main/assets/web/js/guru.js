const GuruAI = {
  addMessage(label, text, type) {
    const box = document.getElementById('guruMessages');
    const item = document.createElement('div');
    item.className = type === 'user' ? 'card' : 'explanation-box';
    item.style.cssText = 'margin:10px 0;padding:14px;white-space:pre-wrap;';
    item.innerHTML = `<strong>${escapeHTML(label)}:</strong><div style="margin-top:6px;">${escapeHTML(text)}</div>`;
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;
  },

  async init() {
    const status = document.getElementById('guruStatus');
    try {
      const response = await fetch('/api/guru/health');
      const data = await response.json();
      status.innerHTML = data.configured
        ? `<i class="ri-checkbox-circle-line" style="color:var(--success);"></i> Guru AI is ready (${escapeHTML(data.model)}).`
        : '<i class="ri-error-warning-line" style="color:var(--warning);"></i> Guru AI is not configured on this server yet.';
    } catch (error) {
      status.textContent = 'Could not check Guru AI availability.';
    }

    document.getElementById('guruForm')?.addEventListener('submit', (event) => this.ask(event));
  },

  async ask(event) {
    event.preventDefault();
    const input = document.getElementById('guruInput');
    const button = document.getElementById('guruSubmit');
    const message = input.value.trim();
    if (!message) return;

    this.addMessage('You', message, 'user');
    input.value = '';
    input.disabled = true;
    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Thinking...';

    try {
      const response = await fetch('/api/guru/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Guru AI request failed.');
      this.addMessage('Guru', data.answer, 'assistant');
    } catch (error) {
      this.addMessage('Guru', error.message, 'assistant');
      ExamSetu.showToast(error.message, 'danger');
    } finally {
      input.disabled = false;
      button.disabled = false;
      button.innerHTML = '<i class="ri-send-plane-fill"></i> Ask Guru';
      input.focus();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => GuruAI.init());
