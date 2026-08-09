(function () {
  setTimeout(init, 0);
  let initialized = false;
  let activeMode = 'upload'; // 'upload' or 'saved'
  let selectedFile = null;
  let currentReport = null;

  function init() {
    if (initialized) return;
    const runBtn = document.getElementById('runScan');
    if (!runBtn) return;
    initialized = true;

    bindEvents();
    loadResumes();
  }

  function bindEvents() {
    const cardUpload = document.getElementById('cardOptionUpload');
    const cardSaved  = document.getElementById('cardOptionSaved');
    const fileContainer  = document.getElementById('fileUploadContainer');
    const savedContainer = document.getElementById('savedResumeContainer');

    cardUpload.addEventListener('click', () => {
      activeMode = 'upload';
      cardUpload.classList.add('active');
      cardSaved.classList.remove('active');
      fileContainer.style.display = 'block';
      savedContainer.style.display = 'none';
      hideError();
    });

    cardSaved.addEventListener('click', () => {
      activeMode = 'saved';
      cardSaved.classList.add('active');
      cardUpload.classList.remove('active');
      savedContainer.style.display = 'block';
      fileContainer.style.display = 'none';
      hideError();
    });

    // File Drag & Drop
    const dropZone  = document.getElementById('dropZone');
    const fileInput = document.getElementById('resumeFileInput');
    const removeBtn = document.getElementById('removeFileBtn');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      ['dragleave', 'dragend'].forEach(evt => {
        dropZone.addEventListener(evt, () => dropZone.classList.remove('dragover'));
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

    document.getElementById('runScan').addEventListener('click', runScan);
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

  async function loadResumes() {
    const select = document.getElementById('resumeSelect');
    if (!select) return;
    try {
      const resumes = await ApiService.resumes.list();
      if (!resumes || !resumes.length) {
        select.innerHTML = '<option value="">No created resumes — upload a file instead</option>';
        return;
      }
      select.innerHTML = resumes.map((r) => `<option value="${r.id}">${escapeHtml(r.title)}</option>`).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Could not load created resumes</option>';
    }
  }

  async function runScan() {
    hideError();
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const btn = document.getElementById('runScan');
    const results = document.getElementById('atsResults');

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Resume…';

    try {
      let reportData;

      if (activeMode === 'upload') {
        if (!selectedFile) {
          showError('Please select or drop a resume file first.');
          btn.disabled = false;
          btn.innerHTML = originalText;
          return;
        }

        const formData = new FormData();
        formData.append('resume', selectedFile);
        if (jobDescription) {
          formData.append('jobDescription', jobDescription);
        }

        const res = await ApiService.ats.analyzeUpload(formData);
        reportData = res.report || res;
      } else {
        const select = document.getElementById('resumeSelect');
        const resumeId = select ? select.value : null;

        if (!resumeId) {
          showError('Please select a created resume, or switch to Upload Resume mode.');
          btn.disabled = false;
          btn.innerHTML = originalText;
          return;
        }

        const res = await ApiService.ats.analyze(resumeId, jobDescription);
        reportData = res.report || res;
      }

      currentReport = reportData;
      renderResults(reportData);
    } catch (err) {
      showError(err.message || 'ATS scan failed. Please check your connection and try again.');
      results.innerHTML = `
        <div class="ats-empty">
          <i class="fa-solid fa-plug-circle-xmark"></i>
          <h3>Scan failed</h3>
          <p>${escapeHtml(err.message || 'An error occurred during analysis.')}</p>
        </div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  function renderResults(report) {
    const results = document.getElementById('atsResults');
    const score = report.overallScore ?? report.overall_score ?? 0;
    const verdict = score >= 85 ? { label: 'Excellent Match', color: 'var(--score-high)', bg: 'var(--score-high-bg)' }
      : score >= 65 ? { label: 'Good Match', color: 'var(--signal-600)', bg: 'var(--signal-100)' }
      : { label: 'Needs Work', color: 'var(--score-low)', bg: 'var(--score-low-bg)' };

    const circumference = 2 * Math.PI * 78;
    const offset = circumference * (1 - score / 100);

    const matchedKeywords = report.matchedKeywords || report.matched_keywords || [];
    const missingKeywords = report.missingKeywords || report.missing_keywords || [];
    const suggestions     = report.suggestions || [];
    const feedback        = report.detailed_feedback || report.detailedFeedback || {};
    const strengths       = feedback.strengths || [];
    const weaknesses      = feedback.weaknesses || [];

    results.innerHTML = `
      <div class="big-gauge-card">
        <div class="big-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="78" fill="none" stroke="var(--paper-100)" stroke-width="14"/>
            <circle cx="90" cy="90" r="78" fill="none" stroke="${verdict.color}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"/>
          </svg>
          <div class="num"><span class="n">${score}</span><span class="l">out of 100</span></div>
        </div>
        <div class="gauge-verdict">
          <span class="verdict-tag" style="background:${verdict.bg}; color:${verdict.color}">${verdict.label}</span>
          <h2>Your resume scored ${score}/100</h2>
          <p>${report.fileName ? `File analyzed: <strong>${escapeHtml(report.fileName)}</strong>.` : 'Analyzed against industry ATS parsing standards.'}</p>
        </div>
      </div>

      <div class="category-grid">
        ${categoryCard('Keyword Match', report.keywordMatch ?? report.keyword_match ?? 0, 'fa-key')}
        ${categoryCard('Formatting', report.formattingScore ?? report.formatting_score ?? 0, 'fa-table-cells')}
        ${categoryCard('Grammar', report.grammarScore ?? report.grammar_score ?? 90, 'fa-spell-check')}
        ${categoryCard('Readability', report.readabilityScore ?? report.readability_score ?? 88, 'fa-book-open')}
      </div>

      <div class="two-col">
        <div class="result-panel">
          <h4><i class="fa-solid fa-check-circle" style="color:var(--score-high)"></i> Matched Keywords</h4>
          <div class="keyword-chips">
            ${matchedKeywords.map((k) => `<span class="chip" style="background:var(--score-high-bg); color:var(--score-high)">${escapeHtml(k)}</span>`).join('') || '<span style="color:var(--ink-600); font-size:13px">General keywords detected.</span>'}
          </div>
        </div>
        <div class="result-panel">
          <h4><i class="fa-solid fa-triangle-exclamation" style="color:var(--score-low)"></i> Missing Keywords</h4>
          <div class="keyword-chips">
            ${missingKeywords.map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join('') || '<span style="color:var(--ink-600); font-size:13px">None missing — great match!</span>'}
          </div>
        </div>
      </div>

      <div class="result-panel" style="margin-top: var(--sp-4);">
        <h4><i class="fa-solid fa-lightbulb" style="color:var(--signal-500)"></i> AI Recommendations</h4>
        <ul class="suggestion-list">
          ${suggestions.map((s) => `<li><i class="fa-solid fa-arrow-right"></i> ${escapeHtml(s)}</li>`).join('') || '<li>Keep layout clean and use strong action verbs.</li>'}
        </ul>
      </div>

      <!-- Action Buttons Bar -->
      <div class="ats-actions-bar">
        <button type="button" class="btn btn-accent btn-lg" id="btnAskAiAssistant">
          <i class="fa-solid fa-robot"></i> Ask AI Assistant
        </button>
        <a href="resume-builder.html" class="btn btn-primary btn-lg">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Improve with AI
        </a>
        <button type="button" class="btn btn-ghost btn-lg" id="btnCheckAnother">
          <i class="fa-solid fa-rotate-left"></i> Check Another Resume
        </button>
      </div>
    `;

    // Bind action buttons
    const btnAskAi = document.getElementById('btnAskAiAssistant');
    if (btnAskAi) {
      btnAskAi.addEventListener('click', () => {
        const promptText = encodeURIComponent(`Please review my ATS score (${score}/100) and explain how I can fix missing keywords: ${missingKeywords.join(', ')}`);
        window.location.href = `ai-assistant.html?prompt=${promptText}&score=${score}`;
      });
    }

    const btnAnother = document.getElementById('btnCheckAnother');
    if (btnAnother) {
      btnAnother.addEventListener('click', () => {
        clearSelectedFile();
        results.innerHTML = `
          <div class="ats-empty">
            <i class="fa-solid fa-gauge-high"></i>
            <h3>No scan yet</h3>
            <p>Upload a resume file or select a created resume, then click Check ATS Score to view your full match dashboard.</p>
          </div>`;
      });
    }
  }

  function categoryCard(label, value, icon) {
    const color = value >= 85 ? 'var(--score-high)' : value >= 65 ? 'var(--signal-500)' : 'var(--score-low)';
    return `
      <div class="category-card">
        <div class="cat-top"><span><i class="fa-solid ${icon}"></i> ${label}</span><span style="color:${color}">${value}</span></div>
        <div class="bar"><span style="width:${value}%; background:${color}"></span></div>
      </div>`;
  }

  function showError(msg) {
    const errBox = document.getElementById('scanErrorBox');
    if (errBox) {
      errBox.textContent = msg;
      errBox.style.display = 'block';
    }
  }

  function hideError() {
    const errBox = document.getElementById('scanErrorBox');
    if (errBox) {
      errBox.textContent = '';
      errBox.style.display = 'none';
    }
  }

  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
