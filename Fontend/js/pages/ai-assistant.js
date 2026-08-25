/**
 * AI CAREER ASSISTANT & RESUME IMPROVEMENT WORKFLOW
 * Analyzes uploaded / selected resumes, presents structured improvements,
 * and allows 1-click application into Resume Builder without automatic server saves.
 */
(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let currentAnalysisData = null;
  let currentAnalysisMode = null;
  let currentAnalysisResumeId = null;
  let workingResumeState = null;
  let appliedModifications = {
    summary: false,
    skills: false,
    experience: {},
    projects: {},
    template: false
  };

  // Chat state
  let conversationHistory = [];
  let isThinking = false;
  let abortController = null;

  function init() {
    if (initialized) return;
    if (!document.getElementById('dropzone')) return;
    initialized = true;

    bindTabs();
    bindUploadAndDropzone();
    bindSavedResumeSelector();
    bindChatEvents();
    loadSavedResumesList();
    checkUrlParams();
  }

  /* ---------------------------------------------------------------------
     Tab Switching
  --------------------------------------------------------------------- */
  function bindTabs() {
    const tabAnalysisBtn = document.getElementById('tabAnalysisBtn');
    const tabChatBtn = document.getElementById('tabChatBtn');
    const viewAnalysisTab = document.getElementById('viewAnalysisTab');
    const viewChatTab = document.getElementById('viewChatTab');

    tabAnalysisBtn?.addEventListener('click', () => {
      tabAnalysisBtn.classList.add('active');
      tabChatBtn?.classList.remove('active');
      if (viewAnalysisTab) viewAnalysisTab.style.display = 'block';
      if (viewChatTab) viewChatTab.style.display = 'none';
    });

    tabChatBtn?.addEventListener('click', () => {
      tabChatBtn.classList.add('active');
      tabAnalysisBtn?.classList.remove('active');
      if (viewChatTab) viewChatTab.style.display = 'block';
      if (viewAnalysisTab) viewAnalysisTab.style.display = 'none';
    });
  }

  /* ---------------------------------------------------------------------
     Resume Upload & Dropzone Handling
  --------------------------------------------------------------------- */
  function bindUploadAndDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('resumeFileInput');
    const browseBtn = document.getElementById('browseBtn');

    if (!dropzone || !fileInput) return;

    browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    let activeInputMode = null; // 'upload' or 'saved'

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFileSelection(fileInput.files[0]);
      }
    });

    function handleFileSelection(file) {
      const validExtensions = ['pdf', 'doc', 'docx', 'txt'];
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!validExtensions.includes(ext)) {
        if (typeof window.showToast === 'function') window.showToast('Please upload a supported PDF, DOCX, or TXT resume.', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (typeof window.showToast === 'function') window.showToast('File size limit exceeded (maximum 5MB allowed).', 'error');
        return;
      }
      
      activeInputMode = 'upload';
      
      // Reset select dropdown if it exists
      const sel = document.getElementById('selExistingResume');
      if (sel) sel.value = '';
      
      const btn = document.getElementById('btnAnalyzeResume');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze ${escapeHtml(file.name)}`;
      }
    }
  }

  async function loadSavedResumesList() {
    const sel = document.getElementById('selExistingResume');
    if (!sel) return;

    try {
      const resumes = await ApiService.resumes.list();
      sel.innerHTML = '<option value="">Select a saved resume...</option>';
      if (resumes && resumes.length) {
        resumes.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `${r.title} (ID: ${r.id})`;
          sel.appendChild(opt);
        });
      }
    } catch (_) {}

    sel.addEventListener('change', () => {
      activeInputMode = sel.value ? 'saved' : null;
      
      if (activeInputMode === 'saved') {
        const fileInput = document.getElementById('resumeFileInput');
        if (fileInput) fileInput.value = '';
        
        const btn = document.getElementById('btnAnalyzeResume');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Selected Resume`;
        }
      } else {
        const btn = document.getElementById('btnAnalyzeResume');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Resume`;
        }
      }
    });

    const btnAnalyzeResume = document.getElementById('btnAnalyzeResume');
    btnAnalyzeResume?.addEventListener('click', async () => {
      if (btnAnalyzeResume.disabled) return;
      
      const jobDescription = document.getElementById('targetJobDesc')?.value.trim() || '';
      
      if (activeInputMode === 'upload') {
        const fileInput = document.getElementById('resumeFileInput');
        const file = (fileInput.files && fileInput.files.length > 0) ? fileInput.files[0] : null;
        if (!file) {
          if (typeof window.showToast === 'function') window.showToast('Please upload a resume first.', 'error');
          return;
        }
        await processUploadedFile(file, jobDescription);
      } else if (activeInputMode === 'saved') {
        const resumeId = sel.value;
        if (!resumeId) {
          if (typeof window.showToast === 'function') window.showToast('Please select a created resume.', 'error');
          return;
        }
        await processSavedResume(resumeId, jobDescription);
      }
    });
  }

  async function processUploadedFile(file, jobDescription) {
    const formData = new FormData();
    formData.append('resume', file);
    if (jobDescription) formData.append('jobDescription', jobDescription);

    showLoading(true, 'Extracting & Analyzing Resume...', 'Extracting structured sections and generating targeted AI improvements.');
    const btn = document.getElementById('btnAnalyzeResume');
    const originalBtnHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...'; }

    try {
      const response = await fetch(`${ApiService.BASE_URL}/ai/analyze-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ApiService.getToken()}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze uploaded resume.');
      }

      renderAnalysisResults(data, 'upload', null);
      if (typeof window.showToast === 'function') {
        window.showToast('Resume analyzed successfully!', 'success');
      }
    } catch (err) {
      console.error('Analyze upload error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast(`Resume analysis failed: ${err.message || 'Unable to analyze this resume. Please try again.'}`, 'error');
      }
    } finally {
      showLoading(false);
      if (btn) { btn.disabled = false; btn.innerHTML = originalBtnHtml; }
    }
  }

  async function processSavedResume(resumeId, jobDescription) {
    showLoading(true, 'Analyzing Saved Resume...', 'Evaluating ATS match and generating structured recommendations.');
    const btn = document.getElementById('btnAnalyzeResume');
    const originalBtnHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...'; }

    try {
      const response = await fetch(`${ApiService.BASE_URL}/ai/analyze-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ApiService.getToken()}`
        },
        body: JSON.stringify({ resumeId, jobDescription })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');

      renderAnalysisResults(data, 'saved', resumeId);
      if (typeof window.showToast === 'function') {
        window.showToast('Analysis complete!', 'success');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast(`Resume analysis failed: ${err.message || 'Unable to analyze selected resume.'}`, 'error');
      }
    } finally {
      showLoading(false);
      if (btn) { btn.disabled = false; btn.innerHTML = originalBtnHtml; }
    }
  }

  function showLoading(show, title, sub) {
    const box = document.getElementById('aiLoadingBox');
    const titleEl = document.getElementById('loadingTitle');
    const subEl = document.getElementById('loadingSub');
    if (!box) return;

    if (show) {
      if (title && titleEl) titleEl.textContent = title;
      if (sub && subEl) subEl.textContent = sub;
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }

  /* ---------------------------------------------------------------------
     Render Analysis Dashboard & Structured Improvements
  --------------------------------------------------------------------- */
  function renderAnalysisResults(data, mode, resumeId) {
    currentAnalysisData = data;
    currentAnalysisMode = mode;
    currentAnalysisResumeId = resumeId;
    workingResumeState = JSON.parse(JSON.stringify(data.structuredResume || {}));
    appliedModifications = { summary: false, skills: false, experience: {}, projects: {}, template: false };

    const dashboard = document.getElementById('analysisDashboard');
    if (!dashboard) return;
    dashboard.style.display = 'block';

    // 1. Top Metrics
    const atsScore = data.analysis?.atsScore || 75;
    const strength = data.analysis?.resumeStrength || (atsScore >= 80 ? 'Strong' : atsScore >= 60 ? 'Good' : 'Needs Work');
    const keywordMatch = data.analysis?.keywordMatch || 70;
    const readability = data.analysis?.readability || 88;
    const detectedSecs = data.analysis?.sectionsDetected || [];
    const missingSecs = data.analysis?.missingSections || [];

    document.getElementById('dashAtsScore').textContent = `${atsScore}`;
    const strengthBadge = document.getElementById('dashStrengthBadge');
    if (strengthBadge) {
      strengthBadge.textContent = strength;
      strengthBadge.className = `strength-badge ${strength.toLowerCase().replace(/\s+/g, '-')}`;
    }
    document.getElementById('dashKeywordMatch').textContent = `${keywordMatch}%`;
    document.getElementById('dashReadability').textContent = `${readability}%`;
    document.getElementById('dashSectionsCount').textContent = `${detectedSecs.length}/7`;

    // 2. Sections Checklist
    const secContainer = document.getElementById('sectionsChecklist');
    if (secContainer) {
      secContainer.innerHTML = '';
      detectedSecs.forEach(s => {
        secContainer.innerHTML += `<span class="sec-chip detected"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(s)}</span>`;
      });
      missingSecs.forEach(s => {
        secContainer.innerHTML += `<span class="sec-chip missing"><i class="fa-solid fa-triangle-exclamation"></i> Missing ${escapeHtml(s)}</span>`;
      });
    }

    // 3. Recommended Template
    const recTemplate = data.templateRecommendation || { name: 'Modern Professional', templateId: 'modern', reason: 'Balanced ATS structure.' };
    document.getElementById('recTemplateName').textContent = recTemplate.name;
    document.getElementById('recTemplateReason').textContent = recTemplate.reason;

    const btnApplyTpl = document.getElementById('btnApplyTemplate');
    if (btnApplyTpl) {
      btnApplyTpl.className = 'apply-btn btn-outline';
      btnApplyTpl.innerHTML = '<i class="fa-solid fa-check"></i> Apply Template';
      btnApplyTpl.onclick = () => applyTemplateSuggestion(recTemplate);
    }

    // 4. Structured Improvement Cards
    renderImprovementCards(data.improvements || {});
    updateAppliedCountUI();

    // Scroll to analysis dashboard smoothly
    dashboard.scrollIntoView({ behavior: 'smooth' });
  }

  function renderImprovementCards(improvements) {
    const container = document.getElementById('improvementsContainer');
    if (!container) return;
    container.innerHTML = '';

    // A. Professional Summary Improvement
    if (improvements.summary) {
      const s = improvements.summary;
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      card.innerHTML = `
        <div class="suggestion-header">
          <h4><i class="fa-solid fa-pen-nib" style="color:var(--primary);"></i> Professional Summary Recommendation</h4>
          <button type="button" class="apply-btn btn-outline" id="btnApplySummary">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Apply Improvement
          </button>
        </div>
        <div class="suggestion-content">
          <p style="margin:0 0 6px 0; color:var(--ink-600); font-style:italic;"><strong>Why:</strong> ${escapeHtml(s.reason)}</p>
          <div class="suggestion-diff">
            <div class="diff-box original">
              <span class="diff-title">Current Summary</span>
              <div>${escapeHtml(s.current || 'No summary currently defined.')}</div>
            </div>
            <div class="diff-box improved">
              <span class="diff-title">AI Recommendation</span>
              <div>${escapeHtml(s.improved)}</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);

      card.querySelector('#btnApplySummary').addEventListener('click', () => {
        applySummarySuggestion(s.improved, card.querySelector('#btnApplySummary'));
      });
    }

    // B. Skills Improvement
    if (improvements.skills && improvements.skills.add && improvements.skills.add.length > 0) {
      const sk = improvements.skills;
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      card.innerHTML = `
        <div class="suggestion-header">
          <h4><i class="fa-solid fa-key" style="color:var(--primary);"></i> Technical Skills & Keyword Additions</h4>
          <button type="button" class="apply-btn btn-outline" id="btnApplySkills">
            <i class="fa-solid fa-plus"></i> Add Recommended Skills
          </button>
        </div>
        <div class="suggestion-content">
          <p style="margin:0 0 8px 0; color:var(--ink-600); font-style:italic;"><strong>Why:</strong> ${escapeHtml(sk.reason || 'Adds high-demand keywords detected in target job profiles.')}</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${sk.add.map(skill => `<span style="background:var(--signal-100); border:1px solid rgba(37,99,235,0.25); color:var(--primary); padding:4px 10px; border-radius:var(--radius-pill); font-size:11px; font-weight:700;"><i class="fa-solid fa-plus"></i> ${escapeHtml(skill)}</span>`).join('')}
          </div>
        </div>
      `;
      container.appendChild(card);

      card.querySelector('#btnApplySkills').addEventListener('click', () => {
        applySkillsSuggestion(sk.add, card.querySelector('#btnApplySkills'));
      });
    }

    // C. Experience Improvements
    if (improvements.experience && Array.isArray(improvements.experience) && improvements.experience.length > 0) {
      improvements.experience.forEach((exp, idx) => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        const improvedBullets = Array.isArray(exp.improvedBullets) ? exp.improvedBullets : [];
        card.innerHTML = `
          <div class="suggestion-header">
            <h4><i class="fa-solid fa-briefcase" style="color:var(--primary);"></i> Experience #${idx + 1}: ${escapeHtml(exp.position || 'Role')} at ${escapeHtml(exp.company || 'Company')}</h4>
            <button type="button" class="apply-btn btn-outline btn-apply-exp" data-index="${idx}">
              <i class="fa-solid fa-arrow-up-right-dots"></i> Improve Experience
            </button>
          </div>
          <div class="suggestion-content">
            <p style="margin:0 0 6px 0; color:var(--ink-600); font-style:italic;"><strong>Why:</strong> ${escapeHtml(exp.reason || 'Strengthens action verbs and measurable performance outcomes.')}</p>
            <div class="diff-box improved" style="margin-top:8px;">
              <span class="diff-title">AI Enhanced Bullet Points</span>
              <ul style="margin:4px 0 0 16px; padding:0;">
                ${improvedBullets.map(b => `<li style="margin-bottom:4px;">${escapeHtml(b)}</li>`).join('')}
              </ul>
            </div>
          </div>
        `;
        container.appendChild(card);

        card.querySelector('.btn-apply-exp').addEventListener('click', (e) => {
          applyExperienceSuggestion(idx, exp, e.currentTarget);
        });
      });
    }

    // D. Projects Improvements
    if (improvements.projects && Array.isArray(improvements.projects) && improvements.projects.length > 0) {
      improvements.projects.forEach((proj, idx) => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.innerHTML = `
          <div class="suggestion-header">
            <h4><i class="fa-solid fa-diagram-project" style="color:var(--primary);"></i> Project #${idx + 1}: ${escapeHtml(proj.title || 'Project')}</h4>
            <button type="button" class="apply-btn btn-outline btn-apply-proj" data-index="${idx}">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Improve Project
            </button>
          </div>
          <div class="suggestion-content">
            <p style="margin:0 0 6px 0; color:var(--ink-600); font-style:italic;"><strong>Why:</strong> ${escapeHtml(proj.reason || 'Highlights modern technologies and measurable outcomes.')}</p>
            <div class="diff-box improved" style="margin-top:8px;">
              <span class="diff-title">Enhanced Project Description & Tech Stack</span>
              <p style="margin:0 0 6px 0;">${escapeHtml(proj.improvedDescription || '')}</p>
              ${proj.technologiesToAdd && proj.technologiesToAdd.length ? `<div style="font-size:11px; color:var(--primary); font-weight:600;">Technologies: ${escapeHtml(proj.technologiesToAdd.join(', '))}</div>` : ''}
            </div>
          </div>
        `;
        container.appendChild(card);

        card.querySelector('.btn-apply-proj').addEventListener('click', (e) => {
          applyProjectSuggestion(idx, proj, e.currentTarget);
        });
      });
    }

    // Bind Apply All & Edit Resume buttons
    document.getElementById('btnApplyAll')?.addEventListener('click', applyAllImprovements);
    const btnEditResume = document.getElementById('btnEditResume');
    if (btnEditResume) {
      if (currentAnalysisMode === 'upload') {
        btnEditResume.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Create / Edit Resume';
      } else {
        btnEditResume.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit in Resume Builder';
      }
      btnEditResume.onclick = navigateToResumeBuilder;
    }
  }

  /* ---------------------------------------------------------------------
     Suggestion Application Logic (Purely In-Memory / Local State)
  --------------------------------------------------------------------- */
  function applySummarySuggestion(improvedText, btn) {
    if (!workingResumeState) return;
    workingResumeState.summary = improvedText;
    appliedModifications.summary = true;

    if (btn) {
      btn.className = 'apply-btn applied';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Applied';
    }

    persistWorkingDraft();
    updateAppliedCountUI();
  }

  function applySkillsSuggestion(skillsToAdd, btn) {
    if (!workingResumeState) return;
    let currentSkills = typeof workingResumeState.skills === 'string' ? workingResumeState.skills : '';
    const currentList = currentSkills.split(',').map(s => s.trim()).filter(Boolean);
    const currentLower = currentList.map(s => s.toLowerCase());

    skillsToAdd.forEach(s => {
      if (!currentLower.includes(s.toLowerCase())) {
        currentList.push(s);
      }
    });

    workingResumeState.skills = currentList.join(', ');
    appliedModifications.skills = true;

    if (btn) {
      btn.className = 'apply-btn applied';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Added to Draft';
    }

    persistWorkingDraft();
    updateAppliedCountUI();
  }

  function applyExperienceSuggestion(index, expData, btn) {
    if (!workingResumeState) return;
    workingResumeState.experience = workingResumeState.experience || [];
    if (workingResumeState.experience[index]) {
      const improvedBullets = Array.isArray(expData.improvedBullets) ? expData.improvedBullets : [];
      workingResumeState.experience[index].bullets = improvedBullets;
      workingResumeState.experience[index].description = improvedBullets.join('\n');
      appliedModifications.experience[index] = true;
    }

    if (btn) {
      btn.className = 'apply-btn applied';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Applied';
    }

    persistWorkingDraft();
    updateAppliedCountUI();
  }

  function applyProjectSuggestion(index, projData, btn) {
    if (!workingResumeState) return;
    workingResumeState.projects = workingResumeState.projects || [];
    if (workingResumeState.projects[index]) {
      workingResumeState.projects[index].description = projData.improvedDescription || workingResumeState.projects[index].description;
      if (projData.technologiesToAdd && projData.technologiesToAdd.length) {
        const existingTech = workingResumeState.projects[index].technologies || '';
        const techArr = existingTech.split(',').map(t => t.trim()).filter(Boolean);
        projData.technologiesToAdd.forEach(t => {
          if (!techArr.some(x => x.toLowerCase() === t.toLowerCase())) techArr.push(t);
        });
        workingResumeState.projects[index].technologies = techArr.join(', ');
      }
      appliedModifications.projects[index] = true;
    }

    if (btn) {
      btn.className = 'apply-btn applied';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Applied';
    }

    persistWorkingDraft();
    updateAppliedCountUI();
  }

  function applyTemplateSuggestion(recTemplate) {
    if (!workingResumeState) return;
    workingResumeState.styling = workingResumeState.styling || {};
    workingResumeState.styling.template = recTemplate.templateId || 'modern';
    appliedModifications.template = true;

    const btn = document.getElementById('btnApplyTemplate');
    if (btn) {
      btn.className = 'apply-btn applied';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Template Applied';
    }

    persistWorkingDraft();
    updateAppliedCountUI();
  }

  function applyAllImprovements() {
    if (!currentAnalysisData || !currentAnalysisData.improvements) return;
    const imps = currentAnalysisData.improvements;

    if (imps.summary) {
      applySummarySuggestion(imps.summary.improved, document.getElementById('btnApplySummary'));
    }
    if (imps.skills && imps.skills.add) {
      applySkillsSuggestion(imps.skills.add, document.getElementById('btnApplySkills'));
    }
    if (imps.experience && Array.isArray(imps.experience)) {
      imps.experience.forEach((exp, idx) => {
        const btn = document.querySelector(`.btn-apply-exp[data-index="${idx}"]`);
        applyExperienceSuggestion(idx, exp, btn);
      });
    }
    if (imps.projects && Array.isArray(imps.projects)) {
      imps.projects.forEach((proj, idx) => {
        const btn = document.querySelector(`.btn-apply-proj[data-index="${idx}"]`);
        applyProjectSuggestion(idx, proj, btn);
      });
    }
    if (currentAnalysisData.templateRecommendation) {
      applyTemplateSuggestion(currentAnalysisData.templateRecommendation);
    }

    if (typeof window.showToast === 'function') {
      window.showToast('All improvements applied to temporary draft!', 'success');
    }
  }

  function persistWorkingDraft() {
    if (!workingResumeState) return;
    try {
      localStorage.setItem('rf_ai_improved_resume', JSON.stringify(workingResumeState));
    } catch (_) {}
  }

  function updateAppliedCountUI() {
    const indicator = document.getElementById('appliedCountIndicator');
    if (!indicator) return;

    let count = 0;
    if (appliedModifications.summary) count++;
    if (appliedModifications.skills) count++;
    if (appliedModifications.template) count++;
    count += Object.keys(appliedModifications.experience).length;
    count += Object.keys(appliedModifications.projects).length;

    indicator.textContent = `${count} improvement${count === 1 ? '' : 's'} applied to local draft`;
  }

  /* ---------------------------------------------------------------------
     Navigate into Resume Builder in Edit Mode
  --------------------------------------------------------------------- */
  function navigateToResumeBuilder() {
    if (!workingResumeState) {
      window.location.href = 'resume-builder.html';
      return;
    }

    // Determine first modified section
    let firstSection = 'summary';
    const modifiedSectionsList = [];

    if (appliedModifications.summary) modifiedSectionsList.push('summary');
    if (appliedModifications.skills) modifiedSectionsList.push('skills');
    if (Object.keys(appliedModifications.experience).length > 0) modifiedSectionsList.push('experience');
    if (Object.keys(appliedModifications.projects).length > 0) modifiedSectionsList.push('projects');

    if (modifiedSectionsList.length > 0) {
      firstSection = modifiedSectionsList[0];
    }

    // Save temporary improved state + metadata for builder highlighting
    try {
      localStorage.setItem('rf_ai_improved_resume', JSON.stringify(workingResumeState));
      localStorage.setItem('rf_ai_improved_meta', JSON.stringify({
        modifiedSections: modifiedSectionsList,
        modifiedFields: {
          summary: appliedModifications.summary,
          skills: appliedModifications.skills,
          experience: Object.keys(appliedModifications.experience).length > 0,
          projects: Object.keys(appliedModifications.projects).length > 0,
          template: appliedModifications.template
        }
      }));
    } catch (_) {}

    if (currentAnalysisMode === 'saved' && currentAnalysisResumeId) {
      window.location.href = `resume-builder.html?id=${currentAnalysisResumeId}&from=ai_improve&section=${firstSection}`;
    } else {
      window.location.href = `resume-builder.html?from=ai_improve&section=${firstSection}`;
    }
  }

  /* ---------------------------------------------------------------------
     Chat Assistant Event Binding & Streaming Response
  --------------------------------------------------------------------- */
  function bindChatEvents() {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('chatInput');
    const clearBtn = document.getElementById('clearChatBtn');
    const chips = document.querySelectorAll('.prompt-chip');

    if (!sendBtn || !input) return;

    sendBtn.addEventListener('click', () => {
      console.log('[AI CHAT] Send clicked');
      if (isThinking) {
        stopGeneration();
      } else {
        const text = input.value.trim();
        if (text) {
          input.value = '';
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
          sendMessage(text);
        }
      }
    });

    clearBtn?.addEventListener('click', async () => {
      if (typeof window.confirmModal === 'function') {
        const ok = await window.confirmModal({
          title: 'Clear Conversation',
          message: 'Are you sure you want to clear your current chat history?',
          confirmText: 'Clear Chat',
          isDanger: true
        });
        if (!ok) return;
      }
      stopGeneration();
      conversationHistory = [];
      const container = document.getElementById('chatMessages');
      if (container) {
        container.innerHTML = `
          <div class="msg-row assistant">
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-bubble">
              <p>Chat cleared! How can I assist with your career and resume optimization?</p>
            </div>
          </div>`;
      }
    });

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (isThinking) return;
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) sendMessage(prompt);
      });
    });
  }

  function stopGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function sendMessage(userText) {
    if (isThinking) return;
    const container = document.getElementById('chatMessages');
    const sendBtn = document.getElementById('sendBtn');

    // Append user message
    const userRow = document.createElement('div');
    userRow.className = 'msg-row user';
    userRow.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="msg-bubble"><p>${escapeHtml(userText)}</p></div>`;
    container.appendChild(userRow);
    conversationHistory.push({ role: 'user', content: userText });

    // Typing bubble
    const typingRow = document.createElement('div');
    typingRow.className = 'msg-row assistant';
    typingRow.id = 'chatTypingIndicator';
    typingRow.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="msg-bubble"><i class="fa-solid fa-circle-notch fa-spin"></i> Thinking...</div>`;
    container.appendChild(typingRow);
    container.scrollTop = container.scrollHeight;

    isThinking = true;
    if (sendBtn) {
      sendBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
      sendBtn.style.background = 'var(--score-low, #ef4444)';
    }

    abortController = new AbortController();
    let replyText = '';

    console.log('[AI CHAT] Sending request');
    try {
      const response = await fetch(`${ApiService.BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ApiService.getToken()}`
        },
        body: JSON.stringify({
          message: userText,
          conversation: conversationHistory.slice(0, -1),
          stream: true
        }),
        signal: abortController.signal
      });

      typingRow.remove();

      const assistantRow = document.createElement('div');
      assistantRow.className = 'msg-row assistant';
      assistantRow.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble"><p id="liveAssistantText"></p></div>`;
      container.appendChild(assistantRow);
      const textEl = assistantRow.querySelector('#liveAssistantText');

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to connect to AI service.');
      }
      
      console.log('[AI CHAT] Response received (stream)', response.status);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const clean = line.trim();
          if (clean.startsWith('data: ')) {
            const dataStr = clean.slice(6).trim();
            if (dataStr === '[DONE]') break;
            let parsed = null;
            try {
              parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                replyText += parsed.text;
                textEl.innerHTML = formatMarkdown(replyText);
                container.scrollTop = container.scrollHeight;
              }
            } catch (parseErr) {
              if (parsed && parseErr.message === parsed.error || parseErr.message.includes('Stream failed') || parseErr.message.includes('JSON')) {
                 if (parsed && parsed.error) throw parseErr; 
                 // otherwise ignore JSON parse error on incomplete chunks
              }
            }
          }
        }
      }
      console.log('[AI CHAT] Stream finished normally');

      if (replyText) {
        conversationHistory.push({ role: 'assistant', content: replyText });
      }
    } catch (err) {
      if (document.getElementById('chatTypingIndicator')) {
        document.getElementById('chatTypingIndicator').remove();
      }
      if (err.name !== 'AbortError') {
        const errRow = document.createElement('div');
        errRow.className = 'msg-row assistant';
        errRow.innerHTML = `
          <div class="msg-avatar" style="background:var(--score-low);"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="msg-bubble" style="border-left:3px solid var(--score-low); color:var(--score-low);">
            <p>${escapeHtml(err.message || 'AI service is temporarily unavailable.')}</p>
          </div>`;
        container.appendChild(errRow);
      }
    } finally {
      isThinking = false;
      if (sendBtn) {
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
        sendBtn.style.background = '';
      }
      abortController = null;
      container.scrollTop = container.scrollHeight;
    }
  }

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'chat') {
      document.getElementById('tabChatBtn')?.click();
    }
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
