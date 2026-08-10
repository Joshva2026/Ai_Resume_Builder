/**
 * DEDICATED REAL MODEL-BASED AI ASSISTANT CHAT LOGIC
 * Connects to POST /api/ai/chat with streaming support
 */
(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let conversationHistory = [];
  let isThinking = false;
  let abortController = null;

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
      if (isThinking) {
        stopGeneration();
      } else {
        const text = input.value.trim();
        if (text) {
          input.value = '';
          input.style.height = 'auto'; // Reset height after send
          sendMessage(text);
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isThinking) return;
        const text = input.value.trim();
        if (text) {
          input.value = '';
          input.style.height = 'auto'; // Reset height after send
          sendMessage(text);
        }
      }
    });

    // Auto-grow textarea height
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear chat conversation?')) {
        stopGeneration();
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
        if (isThinking) return;
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

  function stopGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function sendMessage(userText, isRegeneration = false) {
    if (isThinking && !isRegeneration) return;
    
    const container = document.getElementById('chatMessages');
    const sendBtn   = document.getElementById('sendBtn');
    
    let lastUserMsg = userText;
    let previousHistory = [...conversationHistory];

    if (isRegeneration) {
      // Find the last user message in history
      let lastUserMsgIdx = -1;
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        if (conversationHistory[i].role === 'user') {
          lastUserMsgIdx = i;
          break;
        }
      }

      if (lastUserMsgIdx === -1) return; // Nothing to regenerate

      // Remove items starting from the index after the last user message
      conversationHistory.splice(lastUserMsgIdx + 1);

      // Get user message and history before it
      lastUserMsg = conversationHistory[lastUserMsgIdx].content;
      previousHistory = conversationHistory.slice(0, lastUserMsgIdx);

      // Remove the last assistant bubble in DOM
      const assistantBubbles = container.querySelectorAll('.msg-row.assistant');
      if (assistantBubbles.length > 1) {
        // Keep the greeting (index 0), remove the last response
        assistantBubbles[assistantBubbles.length - 1].remove();
      }
    } else {
      // Render User Message bubble for new inputs
      appendUserBubble(userText);
      conversationHistory.push({ role: 'user', content: userText });
    }

    // Render Typing Indicator
    const typingId = showTypingIndicator();
    isThinking = true;
    
    // Toggle send button to Stop mode
    sendBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
    sendBtn.classList.add('stop-state');
    sendBtn.style.background = 'var(--score-low, #ef4444)';

    abortController = new AbortController();
    let replyText = '';
    let assistantBubbleId = null;

    try {
      const response = await fetch(`${ApiService.BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ApiService.getToken()}`
        },
        body: JSON.stringify({
          message: lastUserMsg,
          conversation: previousHistory,
          stream: true
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        let errData = {};
        try { errData = await response.json(); } catch(_) {}
        throw new Error(errData.error || `Server returned error status ${response.status}`);
      }

      removeTypingIndicator(typingId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          buffer += chunkStr;

          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data: ')) {
              const dataContent = cleanLine.slice(6).trim();
              if (dataContent === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.text) {
                  replyText += parsed.text;

                  if (!assistantBubbleId) {
                    assistantBubbleId = appendEmptyAssistantBubble();
                  }
                  updateAssistantBubble(assistantBubbleId, replyText);
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Ignore chunk parse errors
              }
            }
          }
        }
      }

      if (!assistantBubbleId && replyText) {
        assistantBubbleId = appendEmptyAssistantBubble();
        updateAssistantBubble(assistantBubbleId, replyText);
      }

      if (replyText) {
        conversationHistory.push({ role: 'assistant', content: replyText });
        finalizeAssistantBubble(assistantBubbleId, replyText);
      }

    } catch (err) {
      removeTypingIndicator(typingId);

      if (err.name === 'AbortError') {
        if (replyText) {
          const finishedText = replyText + '\n\n*(Generation stopped by user)*';
          if (!assistantBubbleId) {
            assistantBubbleId = appendEmptyAssistantBubble();
          }
          updateAssistantBubble(assistantBubbleId, finishedText);
          conversationHistory.push({ role: 'assistant', content: replyText });
          finalizeAssistantBubble(assistantBubbleId, replyText);
        } else {
          const stopBubbleId = appendEmptyAssistantBubble();
          updateAssistantBubble(stopBubbleId, '*(Generation stopped)*');
          conversationHistory.push({ role: 'assistant', content: '(Generation stopped)' });
          finalizeAssistantBubble(stopBubbleId, '(Generation stopped)');
        }
      } else {
        const errorMsg = err.message || 'Sorry, I couldn\'t connect to the AI service right now. Please try again.';
        appendErrorBubble(errorMsg, lastUserMsg);
      }
    } finally {
      isThinking = false;
      sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
      sendBtn.classList.remove('stop-state');
      sendBtn.style.background = ''; // restore original background
      abortController = null;
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

  function appendEmptyAssistantBubble() {
    const container = document.getElementById('chatMessages');
    const id = 'assistant_msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.id = id;
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="msg-bubble">
        <div class="msg-content"></div>
      </div>`;
    container.appendChild(row);
    scrollToBottom();
    return id;
  }

  function updateAssistantBubble(id, rawMarkdown) {
    const row = document.getElementById(id);
    if (row) {
      const contentDiv = row.querySelector('.msg-content');
      if (contentDiv) {
        contentDiv.innerHTML = formatMarkdown(rawMarkdown);
      }
    }
  }

  function finalizeAssistantBubble(id, rawMarkdown) {
    const row = document.getElementById(id);
    if (!row) return;
    const bubble = row.querySelector('.msg-bubble');
    if (!bubble) return;

    if (bubble.querySelector('.msg-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.style.cssText = 'margin-top:8px; text-align:right; display:flex; gap:8px; justify-content:flex-end;';
    actions.innerHTML = `
      <button type="button" class="btn btn-sm btn-ghost copy-msg-btn" style="font-size:11px; padding:3px 8px; color:var(--ink-500); border:1px solid var(--line); border-radius:4px; background:white; cursor:pointer;"><i class="fa-regular fa-copy"></i> Copy</button>
      <button type="button" class="btn btn-sm btn-ghost regenerate-msg-btn" style="font-size:11px; padding:3px 8px; color:var(--ink-500); border:1px solid var(--line); border-radius:4px; background:white; cursor:pointer;"><i class="fa-solid fa-rotate-right"></i> Regenerate</button>
    `;
    bubble.appendChild(actions);

    const copyBtn = actions.querySelector('.copy-msg-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(rawMarkdown).then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy'; }, 2000);
      }).catch(() => {});
    });

    const regenBtn = actions.querySelector('.regenerate-msg-btn');
    regenBtn.addEventListener('click', () => {
      sendMessage('', true);
    });
  }

  function appendErrorBubble(errorMsg, originalPrompt) {
    const container = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.innerHTML = `
      <div class="msg-avatar" style="background:var(--score-low, #ef4444); color:white;"><i class="fa-solid fa-circle-exclamation"></i></div>
      <div class="msg-bubble" style="border-color:var(--score-low, #ef4444)">
        <p style="color:var(--score-low, #ef4444); font-weight:600;"><i class="fa-solid fa-plug-circle-xmark"></i> ${escapeHtml(errorMsg)}</p>
        <button type="button" class="btn btn-sm btn-ghost retry-btn" style="margin-top:6px; font-size:12px; border:1px solid var(--line); border-radius:4px; padding:4px 8px; cursor:pointer;"><i class="fa-solid fa-rotate-right"></i> Retry request</button>
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
    
    // 1. Handle code blocks: ```lang ... ```
    const codeBlocks = [];
    let formatted = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      const firstNewline = code.indexOf('\n');
      let lang = 'code';
      let codeContent = code;
      if (firstNewline !== -1) {
        const possibleLang = code.slice(0, firstNewline).trim();
        if (possibleLang && possibleLang.length < 15) {
          lang = possibleLang;
          codeContent = code.slice(firstNewline + 1);
        }
      }
      const token = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
      codeBlocks.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(codeContent.trim())}</code></pre>`);
      return token;
    });

    // 2. Escape HTML to prevent injection (keeps placeholders intact)
    formatted = escapeHtml(formatted);

    // 3. Restore code blocks
    codeBlocks.forEach((htmlCode, index) => {
      const token = `__CODE_BLOCK_PLACEHOLDER_${index}__`;
      formatted = formatted.replace(token, htmlCode);
    });

    // 4. Handle Inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 5. Handle Bold: **text**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 6. Handle Italic: *text* or _text_
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 7. Handle Headers: ### Title, ## Title, # Title
    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 8. Handle Lists (ordered and unordered)
    const lines = formatted.split('\n');
    let inUl = false;
    let inOl = false;
    const result = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      const ulMatch = line.match(/^([*\-+])\s+(.*)$/);
      const olMatch = line.match(/^(\d+)\.\s+(.*)$/);

      if (ulMatch) {
        if (inOl) {
          result.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          result.push('<ul style="margin: 8px 0 8px 20px; padding-left:0;">');
          inUl = true;
        }
        result.push(`<li style="margin-bottom: 4px;">${ulMatch[2]}</li>`);
      } else if (olMatch) {
        if (inUl) {
          result.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          result.push('<ol style="margin: 8px 0 8px 20px; padding-left:0;">');
          inOl = true;
        }
        result.push(`<li style="margin-bottom: 4px;">${olMatch[2]}</li>`);
      } else {
        if (inUl) {
          result.push('</ul>');
          inUl = false;
        }
        if (inOl) {
          result.push('</ol>');
          inOl = false;
        }
        
        if (trimmed) {
          if (/^<h[1-6]|<pre|<ul|<ol|<li|<code/.test(trimmed)) {
            result.push(line);
          } else {
            result.push(`<p style="margin-bottom: 8px;">${line}</p>`);
          }
        }
      }
    });

    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('\n');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
