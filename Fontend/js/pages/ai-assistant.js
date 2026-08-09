/**
 * DEDICATED AI ASSISTANT CHAT LOGIC
 * Connects to POST /api/ai/assistant via ApiService.ai.assistant
 */
(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let conversationHistory = [];
  let isThinking = false;

  function init() {
    if (initialized) return;
    const sendBtn = document.getElementById('sendBtn');
    if (!sendBtn) return;
    initialized = true;

    bindEvents();
    checkUrlPrompt();
  }

  function bindEvents() {
    const sendBtn  = document.getElementById('sendBtn');
    const input    = document.getElementById('chatInput');
    const clearBtn = document.getElementById('clearChatBtn');
    const chips    = document.querySelectorAll('.prompt-chip');

    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        input.value = '';
        sendMessage(text);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          input.value = '';
          sendMessage(text);
        }
      }
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear chat conversation?')) {
        conversationHistory = [];
        const container = document.getElementById('chatMessages');
        container.innerHTML = `
          <div class="msg-row assistant">
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-bubble">
              <p>Chat cleared! How can I help you next?</p>
            </div>
          </div>`;
      }
    });

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
          sendMessage(prompt);
        }
      });
    });
  }

  function checkUrlPrompt() {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get('prompt');
    const score = params.get('score');

    if (prompt) {
      const fullText = score ? `${prompt} (Current ATS Score: ${score}/100)` : prompt;
      setTimeout(() => sendMessage(fullText), 300);
    }
  }

  async function sendMessage(userText) {
    if (isThinking) return;
    const container = document.getElementById('chatMessages');
    const sendBtn   = document.getElementById('sendBtn');

    // Render User Message
    appendUserBubble(userText);
    conversationHistory.push({ role: 'user', content: userText });

    // Render Typing Indicator
    const typingId = showTypingIndicator();
    isThinking = true;
    sendBtn.disabled = true;

    try {
      const res = await ApiService.ai.assistant(conversationHistory);
      const reply = res.reply || res.message || 'I have analyzed your query. Let me know if you would like more details!';

      removeTypingIndicator(typingId);
      appendAssistantBubble(reply);
      conversationHistory.push({ role: 'assistant', content: reply });
    } catch (err) {
      removeTypingIndicator(typingId);
      const errorMsg = err.message || 'AI Assistant is currently unavailable. Please try again later.';
      appendErrorBubble(errorMsg, userText);
    } finally {
      isThinking = false;
      sendBtn.disabled = false;
      scrollToBottom();
    }
  }

  function appendUserBubble(text) {
    const container = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = 'msg-row user';
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="msg-bubble">
        <p>${escapeHtml(text)}</p>
      </div>`;
    container.appendChild(row);
    scrollToBottom();
  }

  function appendAssistantBubble(rawMarkdown) {
    const container = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="msg-bubble">
        ${formatMarkdown(rawMarkdown)}
      </div>`;
    container.appendChild(row);
    scrollToBottom();
  }

  function appendErrorBubble(errorMsg, originalPrompt) {
    const container = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.innerHTML = `
      <div class="msg-avatar" style="background:var(--score-low)"><i class="fa-solid fa-circle-exclamation"></i></div>
      <div class="msg-bubble" style="border-color:var(--score-low)">
        <p style="color:var(--score-low); font-weight:600;"><i class="fa-solid fa-plug-circle-xmark"></i> ${escapeHtml(errorMsg)}</p>
        <button type="button" class="btn btn-sm btn-ghost retry-btn" style="margin-top:6px; font-size:12px;"><i class="fa-solid fa-rotate-right"></i> Retry request</button>
      </div>`;

    container.appendChild(row);
    const retryBtn = row.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        row.remove();
        sendMessage(originalPrompt);
      });
    }
    scrollToBottom();
  }

  function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const id = 'typing_' + Date.now();
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.id = id;
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="typing-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>`;
    container.appendChild(row);
    scrollToBottom();
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet lists
    const lines = html.split('\n');
    let inList = false;
    let result = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) {
          inList = true;
          result.push('<ul>');
        }
        result.push(`<li>${trimmed.slice(2)}</li>`);
      } else {
        if (inList) {
          inList = false;
          result.push('</ul>');
        }
        if (trimmed) {
          result.push(`<p>${trimmed}</p>`);
        }
      }
    });

    if (inList) result.push('</ul>');
    return result.join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
