(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let activeLetterId = null;
  let allLetters = [];

  function init() {
    if (initialized) return;
    const btn = document.getElementById('btnGenerate');
    if (!btn) return;
    initialized = true;

    bindEvents();
    loadResumes();
    loadLetters();
  }

  function bindEvents() {
    document.getElementById('btnGenerate').addEventListener('click', runGeneration);
    document.getElementById('btnCopy').addEventListener('click', copyLetter);
    document.getElementById('btnPrint').addEventListener('click', printLetter);
    document.getElementById('btnSave').addEventListener('click', saveLetterChanges);
  }

  async function loadResumes() {
    const select = document.getElementById('resumeSelect');
    if (!select) return;
    try {
      const list = await ApiService.resumes.list();
      if (!list.length) {
        select.innerHTML = '<option value="">No created resumes found. Build one first!</option>';
        return;
      }
      select.innerHTML = list.map(r => `<option value="${r.id}">${escapeHtml(r.title || 'Untitled Resume')}</option>`).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Could not load resumes.</option>';
    }
  }

  async function loadLetters() {
    const listEl = document.getElementById('letterHistory');
    try {
      allLetters = await ApiService.coverLetters.list();
      if (!allLetters.length) {
        listEl.innerHTML = '<p style="color:var(--ink-600); font-size:var(--fs-xs)">No saved cover letters yet.</p>';
        return;
      }
      
      listEl.innerHTML = allLetters.map(letter => `
        <div class="letter-history-item" onclick="loadLetterIntoEditor(${letter.id})">
          <div>
            <div class="title">${escapeHtml(letter.title)}</div>
            <div class="date">${new Date(letter.created_at).toLocaleDateString()}</div>
          </div>
          <button class="icon-btn" onclick="deleteLetter(${letter.id}, event)" style="color:var(--score-low)" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = '<p style="color:var(--score-low); font-size:var(--fs-xs)">Failed to load letter history.</p>';
    }
  }

  async function runGeneration() {
    const btn = document.getElementById('btnGenerate');
    const errorBox = document.getElementById('clErrorBox');
    const resumeId = document.getElementById('resumeSelect').value;
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();

    if (!resumeId) {
      errorBox.textContent = 'Please select a resume context.';
      errorBox.style.display = 'block';
      return;
    }
    if (!jobTitle || !companyName) {
      errorBox.textContent = 'Job Title and Company Name are required.';
      errorBox.style.display = 'block';
      return;
    }

    errorBox.style.display = 'none';
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating tailored cover letter…';

    try {
      const res = await ApiService.coverLetters.generate(resumeId, jobTitle, companyName, jobDescription);
      
      activeLetterId = res.id;
      document.getElementById('clContent').value = res.content;
      document.getElementById('btnSave').style.display = 'inline-block';
      
      loadLetters();
    } catch (err) {
      errorBox.textContent = err.message || 'Generation failed. Please try again.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  window.loadLetterIntoEditor = function (id) {
    const letter = allLetters.find(l => l.id === id);
    if (!letter) return;
    
    activeLetterId = id;
    document.getElementById('clContent').value = letter.content;
    document.getElementById('btnSave').style.display = 'inline-block';
  };

  async function saveLetterChanges() {
    if (!activeLetterId) return;
    const btn = document.getElementById('btnSave');
    const content = document.getElementById('clContent').value;
    
    const letter = allLetters.find(l => l.id === activeLetterId);
    const title = letter ? letter.title : 'Cover Letter';

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
      await ApiService.coverLetters.update(activeLetterId, { title, content });
      loadLetters();
      alert('Cover letter saved successfully.');
    } catch (err) {
      alert('Failed to save changes: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  window.deleteLetter = async function (id, event) {
    event.stopPropagation();
    if (confirm('Delete this saved cover letter?')) {
      try {
        await ApiService.coverLetters.remove(id);
        if (activeLetterId === id) {
          activeLetterId = null;
          document.getElementById('clContent').value = '';
          document.getElementById('btnSave').style.display = 'none';
        }
        loadLetters();
      } catch (err) {
        alert('Failed to delete letter: ' + err.message);
      }
    }
  };

  function copyLetter() {
    const content = document.getElementById('clContent').value;
    if (!content) return alert('No cover letter content to copy.');
    navigator.clipboard.writeText(content).then(() => {
      alert('Cover letter copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy text: ' + err.message);
    });
  }

  function printLetter() {
    const content = document.getElementById('clContent').value;
    if (!content) return alert('No cover letter content to print.');

    const printWin = window.open('', '', 'width=800,height=600');
    printWin.document.write(`
      <html>
        <head>
          <title>Print Cover Letter</title>
          <style>
            body { font-family: Georgia, serif; line-height: 1.6; padding: 40px; color: #222; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <pre>${escapeHtml(content)}</pre>
        </body>
      </html>
    `);
    printWin.document.close();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
