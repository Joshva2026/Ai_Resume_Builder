(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let activeLetterId = null;
  let allLetters = [];
  let selectedFile = null;

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

    // Source radios
    const radios = document.querySelectorAll('input[name="contextSource"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const value = e.target.value;
        const savedWrapper = document.getElementById('savedResumeWrapper');
        const uploadWrapper = document.getElementById('fileUploadWrapper');

        if (value === 'saved') {
          savedWrapper.style.display = 'block';
          uploadWrapper.style.display = 'none';
        } else {
          savedWrapper.style.display = 'none';
          uploadWrapper.style.display = 'block';
        }
        hideError();
      });
    });

    // File upload elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('resumeFileInput');
    const removeBtn = document.getElementById('removeFileBtn');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleFileSelect(e.target.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSelectedFile();
      });
    }
  }

  function handleFileSelect(file) {
    hideError();
    const validExtensions = ['pdf', 'doc', 'docx', 'txt'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (!validExtensions.includes(ext)) {
      showError('Unsupported file type. Please select a PDF, DOC, DOCX, or TXT file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File size exceeds the 10MB limit.');
      return;
    }

    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatBytes(file.size);
    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'flex';
  }

  function clearSelectedFile() {
    selectedFile = null;
    const fileInput = document.getElementById('resumeFileInput');
    if (fileInput) fileInput.value = '';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    hideError();
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showError(msg) {
    const errorBox = document.getElementById('clErrorBox');
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }
  }

  function hideError() {
    const errorBox = document.getElementById('clErrorBox');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.style.display = 'none';
    }
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
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const source = document.querySelector('input[name="contextSource"]:checked').value;

    if (!jobTitle || !companyName) {
      showError('Job Title and Company Name are required.');
      return;
    }

    if (source === 'saved') {
      const resumeSelect = document.getElementById('resumeSelect');
      const resumeId = resumeSelect ? resumeSelect.value : null;
      if (!resumeId) {
        showError('Please select a resume context.');
        return;
      }

      hideError();
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
        showError(err.message || 'Generation failed. Please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    } else {
      if (!selectedFile) {
        showError('Please upload a resume file.');
        return;
      }

      hideError();
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Extracting and generating letter…';

      try {
        const formData = new FormData();
        formData.append('resume', selectedFile);
        formData.append('jobTitle', jobTitle);
        formData.append('companyName', companyName);
        if (jobDescription) {
          formData.append('jobDescription', jobDescription);
        }

        const res = await ApiService.coverLetters.generateUpload(formData);
        activeLetterId = res.id;
        document.getElementById('clContent').value = res.content;
        document.getElementById('btnSave').style.display = 'inline-block';
        loadLetters();
      } catch (err) {
        showError(err.message || 'Generation failed. Please check file format and try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
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
