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
    const btnSelectFileOption = document.getElementById('btnSelectFileOption');
    const btnSelectCreatedOption = document.getElementById('btnSelectCreatedOption');

    const selectUploadMode = () => {
      activeMode = 'upload';
      cardUpload.classList.add('active');
      cardSaved.classList.remove('active');
      fileContainer.style.display = 'block';
      savedContainer.style.display = 'none';
      hideError();
    };

    const selectSavedMode = () => {
      activeMode = 'saved';
      cardSaved.classList.add('active');
      cardUpload.classList.remove('active');
      savedContainer.style.display = 'block';
      fileContainer.style.display = 'none';
      hideError();
    };

    cardUpload.addEventListener('click', selectUploadMode);
    cardSaved.addEventListener('click', selectSavedMode);

    if (btnSelectFileOption) {
      btnSelectFileOption.addEventListener('click', (e) => {
        e.stopPropagation();
        selectUploadMode();
        const fileInput = document.getElementById('resumeFileInput');
        if (fileInput) fileInput.click();
      });
    }

    if (btnSelectCreatedOption) {
      btnSelectCreatedOption.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSavedMode();
        const resumeSelect = document.getElementById('resumeSelect');
        if (resumeSelect) resumeSelect.focus();
      });
    }

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

    // AI Suggestions Modal bindings
    const modal = document.getElementById('aiImprovementsModal');
    const closeBtn = document.getElementById('closeImprovementsModal');
    const cancelBtn = document.getElementById('cancelImprovements');
    const confirmEditBtn = document.getElementById('btnConfirmEditResume');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    }
    if (confirmEditBtn) {
      confirmEditBtn.addEventListener('click', async () => {
        const resumeId = currentReport.resumeId || currentReport.id;
        if (!resumeId) {
          if (typeof window.showToast === 'function') {
            window.showToast('No active resume found to edit.', 'warning');
          }
          return;
        }
        
        let existingResume = null;
        try {
          existingResume = await ApiService.resumes.get(resumeId);
        } catch (_) {}

        const originalContent = existingResume?.content || {};
        const missingKeywords = Array.isArray(currentReport.missingKeywords) ? currentReport.missingKeywords : [];
        
        // Construct improved content with ATS recommendations
        let currentSkills = typeof originalContent.skills === 'string' ? originalContent.skills : '';
        if (missingKeywords.length > 0) {
          const currentSkillsArr = currentSkills.split(',').map(s => s.trim().toLowerCase());
          const toAdd = missingKeywords.filter(k => !currentSkillsArr.includes(k.toLowerCase()));
          if (toAdd.length > 0) {
            currentSkills = currentSkills ? `${currentSkills}, ${toAdd.join(', ')}` : toAdd.join(', ');
          }
        }

        const improvedResume = {
          ...originalContent,
          skills: currentSkills,
          styling: originalContent.styling || { template: 'modern' }
        };

        // Store temporary improved resume state
        try {
          localStorage.setItem('rf_ai_improved_resume', JSON.stringify(improvedResume));
          localStorage.setItem('rf_ai_improved_meta', JSON.stringify({
            modifiedSections: ['skills'],
            modifiedFields: { skills: true }
          }));
        } catch (_) {}

        if (typeof window.confirmModal === 'function') {
          const makeDuplicate = await window.confirmModal({
            title: 'Edit Resume with ATS Improvements',
            message: 'Would you like to duplicate this resume to keep your original version intact before editing?',
            confirmText: 'Duplicate & Edit',
            cancelText: 'Edit Original'
          });

          if (makeDuplicate) {
            try {
              const duplicate = await ApiService.resumes.duplicate(resumeId);
              const newId = duplicate.resume ? duplicate.resume.id : duplicate.id;
              window.location.href = `resume-builder.html?from=ai_improve&section=skills&id=${newId}`;
              return;
            } catch (err) {
              console.warn('Duplicate error:', err.message);
            }
          }
        }

        window.location.href = `resume-builder.html?from=ai_improve&section=skills&id=${resumeId}`;
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

  async function loadResumes() {
    const select = document.getElementById('resumeSelect');
    if (!select) return;
    try {
      const resumes = await ApiService.resumes.list();
      if (!Array.isArray(resumes) || !resumes.length) {
        select.innerHTML = '<option value="">No created resumes — upload a file instead</option>';
        return;
      }
      select.innerHTML = resumes.map((r) => `<option value="${r.id}">${escapeHtml(r.title || r.name || 'Untitled Resume')}</option>`).join('');
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

    const keywordScore = report.keywordMatch ?? report.keyword_match ?? 0;
    const completenessScore = report.sectionCompleteness ?? report.section_completeness ?? 0;
    const formattingScore = report.formattingScore ?? report.formatting_score ?? 0;
    const actionVerbScore = report.actionVerbScore ?? report.action_verb_score ?? 0;
    const achievementsScore = report.achievementsScore ?? report.achievements_score ?? 0;

    let strengths = [];
    let weaknesses = [];

    // Analyze Formatting
    if (formattingScore >= 85) strengths.push('✓ Excellent resume formatting detected');
    else weaknesses.push('⚠ Formatting lacks standard bullet points');

    // Analyze Keywords
    if (keywordScore >= 80) strengths.push('✓ Strong keyword coverage for this role');
    else if (keywordScore > 0) weaknesses.push('⚠ Weak keyword match against job description');

    // Analyze Completeness
    if (completenessScore >= 90) strengths.push('✓ Core sections are complete');
    else weaknesses.push('⚠ Missing important resume sections (e.g. Education, Experience)');

    // Analyze Content (Action verbs / Achievements)
    if (actionVerbScore >= 80) strengths.push('✓ Good use of strong action verbs');
    else weaknesses.push('⚠ Use more action verbs to start bullet points');

    if (achievementsScore >= 80) strengths.push('✓ Measurable achievements detected');
    else weaknesses.push('⚠ Missing quantifiable achievements (numbers, metrics)');

    results.innerHTML = `
      <div class="big-gauge-card">
        <div class="big-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="14"/>
            <circle id="gaugeProgressCircle" cx="90" cy="90" r="78" fill="none" stroke="${verdict.color}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" style="transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"/>
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
        ${categoryCard('Keyword Match', keywordScore, 'fa-key')}
        ${categoryCard('Formatting', formattingScore, 'fa-table-cells')}
        ${categoryCard('Completeness', completenessScore, 'fa-list-check')}
        ${categoryCard('Best Practices', Math.round((actionVerbScore + achievementsScore) / 2), 'fa-star')}
      </div>

      <div class="two-col">
        <div class="result-panel">
          <h4><i class="fa-solid fa-arrow-up-right-dots" style="color:var(--score-high)"></i> Strengths</h4>
          <ul class="suggestion-list" style="margin-top:12px;">
            ${strengths.map(s => `<li style="color:var(--ink-800);">${escapeHtml(s)}</li>`).join('') || '<li style="color:var(--ink-600);">No significant strengths identified yet.</li>'}
          </ul>
        </div>
        <div class="result-panel">
          <h4><i class="fa-solid fa-triangle-exclamation" style="color:var(--score-low)"></i> Needs Improvement</h4>
          <ul class="suggestion-list" style="margin-top:12px;">
            ${weaknesses.map(s => `<li style="color:var(--ink-800);">${escapeHtml(s)}</li>`).join('') || '<li style="color:var(--ink-600);">Great job! No major improvements needed.</li>'}
          </ul>
        </div>
      </div>

      <div class="two-col" style="margin-top: var(--sp-4);">
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


      <!-- Action Buttons Bar -->
      <div class="ats-actions-bar">
        <button type="button" class="btn btn-accent btn-lg" id="btnAskAiAssistant">
          <i class="fa-solid fa-robot"></i> Ask AI Assistant
        </button>
        <button type="button" class="btn btn-primary btn-lg" id="btnImproveWithAi">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Improve with AI
        </button>
        <button type="button" class="btn btn-ghost btn-lg" id="btnCheckAnother">
          <i class="fa-solid fa-rotate-left"></i> Check Another Resume
        </button>
      </div>
    `;

    // Trigger smooth SVG gauge animation
    requestAnimationFrame(() => {
      const circle = document.getElementById('gaugeProgressCircle');
      if (circle) {
        circle.style.strokeDashoffset = `${offset}`;
      }
    });

    // Bind action buttons
    const btnAskAi = document.getElementById('btnAskAiAssistant');
    if (btnAskAi) {
      btnAskAi.addEventListener('click', () => {
        const promptText = encodeURIComponent(`Please review my ATS score (${score}/100) and explain how I can fix missing keywords: ${missingKeywords.join(', ')}`);
        window.location.href = `ai-assistant.html?prompt=${promptText}&score=${score}`;
      });
    }

    const btnImprove = document.getElementById('btnImproveWithAi');
    if (btnImprove) {
      btnImprove.addEventListener('click', async () => {
        const modal = document.getElementById('aiImprovementsModal');
        const modalBody = document.getElementById('improvementsModalBody');
        
        if (!modal) return;
        modal.style.display = 'flex';
        modalBody.innerHTML = `
          <div style="text-align:center; padding:var(--sp-8) 0; color:var(--ink-700);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:var(--primary); margin-bottom:12px;"></i>
            <p style="font-weight:600;">Analyzing resume against job description using Gemini AI...</p>
          </div>
        `;
        
        try {
          const jobDescription = document.getElementById('jobDescription').value.trim();
          const resumeId = currentReport.resumeId || currentReport.id;
          
          if (!resumeId) {
            throw new Error('Could not find active resume ID to optimize. Please save or select a resume first.');
          }
          
          const plan = await ApiService.ai.optimize(resumeId, jobDescription);
          localStorage.setItem('rf_active_optimization_plan', JSON.stringify(plan));
          
          let weakBulletsHtml = '';
          if (plan.weak_bullets && plan.weak_bullets.length) {
            weakBulletsHtml = `
              <h4 style="margin-top:var(--sp-4); font-weight:700;"><i class="fa-solid fa-feather-pointed" style="color:var(--primary); margin-right:6px;"></i> Weak Bullet Points & Enhancements</h4>
              <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
                ${plan.weak_bullets.map((b) => `
                  <div style="background:var(--paper-50); border:1px solid var(--line); border-radius:var(--radius-md); padding:12px; font-size:11px;">
                    <div style="color:var(--score-low); text-decoration:line-through; margin-bottom:4px;"><strong>Original:</strong> "${escapeHtml(b.original)}"</div>
                    <div style="color:var(--score-high); font-weight:600; margin-bottom:4px;"><strong>AI Enhanced:</strong> "${escapeHtml(b.enhanced)}"</div>
                    <div style="font-style:italic; color:var(--ink-600);"><strong>Reason:</strong> ${escapeHtml(b.reason)}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          let missingKeywordsHtml = '';
          if (plan.missing_keywords && plan.missing_keywords.length) {
            missingKeywordsHtml = `
              <h4 style="margin-top:var(--sp-4); font-weight:700;"><i class="fa-solid fa-key" style="color:var(--primary); margin-right:6px;"></i> Missing Target Keywords</h4>
              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                ${plan.missing_keywords.map(k => `<span class="chip" style="background:var(--paper-100); padding:4px 8px; border-radius:var(--radius-pill); font-size:10px; font-weight:600; border:1px solid var(--line); color:var(--ink-950);">${escapeHtml(k)}</span>`).join('')}
              </div>
            `;
          }

          modalBody.innerHTML = `
            <div style="background:var(--signal-100); border-left:4px solid var(--primary); padding:12px; border-radius:var(--radius-sm); margin-bottom:16px;">
              <strong style="color:var(--primary);">Optimization Summary</strong>
              <p style="margin:6px 0 0 0; color:var(--ink-800);">${escapeHtml(plan.summary)}</p>
            </div>
            
            ${missingKeywordsHtml}
            ${weakBulletsHtml}
            
            <div style="margin-top:var(--sp-4);">
              <h4 style="font-weight:700;"><i class="fa-solid fa-file-signature" style="color:var(--primary); margin-right:6px;"></i> Formatting & Content Suggestions</h4>
              <ul style="margin:8px 0 0 16px; padding:0; display:grid; gap:6px;">
                ${(plan.formatting_suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>Formatting fits standard applicant tracking models.</li>'}
              </ul>
            </div>

            <div style="margin-top:var(--sp-4);">
              <h4 style="font-weight:700;"><i class="fa-solid fa-chart-line" style="color:var(--primary); margin-right:6px;"></i> Job Description Alignment</h4>
              <ul style="margin:8px 0 0 16px; padding:0; display:grid; gap:6px;">
                ${(plan.alignment_suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>No specific alignment suggestions.</li>'}
              </ul>
            </div>

            <div style="margin-top:var(--sp-4);">
              <h4 style="font-weight:700;"><i class="fa-solid fa-layer-group" style="color:var(--primary); margin-right:6px;"></i> Target Areas / Sections to Improve</h4>
              <div style="display:flex; gap:8px; margin-top:8px;">
                ${(plan.sections_to_improve || []).map(sec => `<span class="badge" style="background:var(--score-mid-bg); color:var(--score-mid); border:1px solid var(--score-mid); font-size:10px; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700;">${escapeHtml(sec)}</span>`).join('') || '<span style="color:var(--ink-600);">No specific sections highlighted.</span>'}
              </div>
            </div>
          `;
        } catch (err) {
          modalBody.innerHTML = `
            <div style="text-align:center; padding:var(--sp-6) 0; color:var(--score-low);">
              <i class="fa-solid fa-circle-exclamation" style="font-size:32px; margin-bottom:12px;"></i>
              <p style="font-weight:600;">Failed to generate AI suggestions</p>
              <p style="font-size:11px; color:var(--ink-600);">${escapeHtml(err.message)}</p>
            </div>
          `;
        }
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
  // Improve ATS flow and redesign UI
})();
