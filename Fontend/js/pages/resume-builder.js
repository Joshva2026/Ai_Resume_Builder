/**
 * RESUME BUILDER PAGE LOGIC
 * All resume content in this page comes only from what the user types.
 * Nothing here fabricates experience, education, or skills.
 */

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const resumeId = urlParams.get('id');

  let state = {
    personal: { fullName: '', headline: '', email: '', phone: '', location: '', link: '', github: '' },
    summary: '',
    experience: [],
    education: [],
    projects: [],
    skills: '',
    certifications: '',
    languages: [],
    volunteer: [],
    awards: [],
    publications: [],
    sectionOrder: ['personal', 'summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages', 'volunteer', 'awards', 'publications'],
    styling: { template: 'modern', font: 'sans', spacing: 1.4, accent: '#4F46E5' },
    experienceLevel: 'fresher'
  };

  // let saveTimer = null; // Auto-save timer disabled

  document.addEventListener('DOMContentLoaded', init);
  // Since app-shell injects the template synchronously right after render, run init on next tick too
  setTimeout(init, 0);

  let initialized = false;
  function init() {
    if (initialized) return;
    if (!document.getElementById('experienceBlocks')) return; // template not yet injected
    initialized = true;

    bindSectionNav();
    bindStepsNav();
    bindDragReorder();
    bindPersonalFields();
    bindRepeatBlocks();
    bindAiButtons();
    bindUndo();
    bindToolbar();
    bindStylingControls();
    bindExperienceTier();

    const fromAi = urlParams.get('from') === 'ai_improve';
    const aiDraftStr = localStorage.getItem('rf_ai_improved_resume');

    if (fromAi && aiDraftStr) {
      try {
        const aiDraft = JSON.parse(aiDraftStr);
        state = { ...state, ...aiDraft };
        if (resumeId) currentResumeId = resumeId;
        populateStateAndUI(state);
        highlightAiModifiedFields();
        if (typeof window.showToast === 'function') {
          window.showToast('AI improvements loaded! Review your fields and click Save Resume when ready.', 'success');
        }
      } catch (e) {
        console.warn('Error loading AI improved draft:', e);
      }
    } else if (resumeId) {
      loadExistingResume(resumeId);
    } else {
      const draft = loadDraftFromLocalStorage();
      if (draft) {
        state = draft;
        populateStateAndUI(state);
      } else {
        addExperienceBlock();
        addEducationBlock();
        renderPreview();
      }
    }
    
    renderSectionRail();
    updateExperienceTierUI();
    setupAiSuggestionsDrawer();

    // Auto-navigate to requested section
    const targetSec = urlParams.get('section');
    if (targetSec) {
      setTimeout(() => navigateToSection(targetSec), 100);
    }

    // Apply template from query parameter if provided
    const tplParam = urlParams.get('template');
    if (tplParam) {
      const templateMap = {
        '1': 'modern',
        '2': 'executive',
        '3': 'minimal',
        '4': 'academic',
        'modern': 'modern',
        'executive': 'executive',
        'minimal': 'minimal',
        'academic': 'academic'
      };
      const tplName = templateMap[tplParam] || tplParam;
      state.styling = state.styling || {};
      state.styling.template = tplName;
      saveDraftToLocalStorage();
      renderPreview();
      const sel = document.getElementById('selTemplate');
      if (sel) sel.value = tplName;
    }
  }

  function navigateToSection(secName) {
    const item = document.querySelector(`.rail-item[data-section="${secName}"]`);
    if (item) item.click();
  }

  function highlightAiModifiedFields() {
    const metaStr = localStorage.getItem('rf_ai_improved_meta');
    if (!metaStr) return;
    try {
      const meta = JSON.parse(metaStr);
      const modifiedFields = meta.modifiedFields || {};

      if (modifiedFields.summary) {
        addAiBadgeToField('f_summary');
      }
      if (modifiedFields.skills) {
        addAiBadgeToField('f_skills');
      }
      if (modifiedFields.experience) {
        document.querySelectorAll('#experienceBlocks .repeat-block').forEach(b => addAiBadgeToBlock(b));
      }
      if (modifiedFields.projects) {
        document.querySelectorAll('#projectBlocks .repeat-block').forEach(b => addAiBadgeToBlock(b));
      }
    } catch (_) {}
  }

  function addAiBadgeToField(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    input.classList.add('ai-improved-field-highlight');
    const label = input.closest('.field')?.querySelector('label');
    if (label && !label.querySelector('.ai-improved-badge')) {
      const badge = document.createElement('span');
      badge.className = 'ai-improved-badge';
      badge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Improved';
      label.appendChild(badge);
    }
  }

  function addAiBadgeToBlock(block) {
    block.classList.add('ai-improved-field-highlight');
    const label = block.querySelector('.field label');
    if (label && !label.querySelector('.ai-improved-badge')) {
      const badge = document.createElement('span');
      badge.className = 'ai-improved-badge';
      badge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Improved';
      label.appendChild(badge);
    }
  }

  /* ---------------------------------------------------------------------
     Section navigation (rail -> editor pane)
  --------------------------------------------------------------------- */
  let stateHistory = [];
  function pushState() {
    // Deep clone and keep last 20 states
    const copy = JSON.parse(JSON.stringify(state));
    stateHistory.push(copy);
    if (stateHistory.length > 20) stateHistory.shift();
    // Persist draft locally after each change
    saveDraftToLocalStorage();
  }
function undo() {
  if (stateHistory.length === 0) {
    if (typeof window.showToast === 'function') window.showToast('Nothing to undo', 'info');
    return;
  }
  state = stateHistory.pop();
  populateStateAndUI(state);
}

function bindUndo() {
  const btn = document.getElementById('btnUndo');
  btn && btn.addEventListener('click', undo);
}


  /* ---------------------------------------------------------------------
     Drag & drop reordering of the section rail
  --------------------------------------------------------------------- */
  function bindDragReorder() {
    const rail = document.getElementById('sectionRail');
    let dragged = null;

    rail.querySelectorAll('.rail-item').forEach((item) => {
      item.addEventListener('dragstart', () => { dragged = item; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); /* auto‑save disabled */ });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const after = getDragAfterElement(rail, e.clientY);
        if (after == null) rail.appendChild(dragged);
        else rail.insertBefore(dragged, after);
      });
    });
  }

  function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll('.rail-item:not(.dragging)')];
    return items.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /* ---------------------------------------------------------------------
     Personal info + summary + skills + certs fields
  --------------------------------------------------------------------- */
  function bindPersonalFields() {
    const map = {
      f_fullName: (v) => (state.personal.fullName = v),
      f_headline: (v) => (state.personal.headline = v),
      f_email: (v) => (state.personal.email = v),
      f_phone: (v) => (state.personal.phone = v),
      f_location: (v) => (state.personal.location = v),
      f_link: (v) => (state.personal.link = v),
      f_summary: (v) => (state.summary = v),
      f_skills: (v) => (state.skills = v),
      f_certs: (v) => (state.certifications = v),
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        map[id](el.value);
        pushState();
        renderPreview();
      });
    });
    // GitHub field (optional, may not exist on older saved resumes)
    const ghEl = document.getElementById('f_github');
    if (ghEl) {
      ghEl.addEventListener('input', () => {
        state.personal.github = ghEl.value;
        pushState();
        renderPreview();
      });
    }
  }

  function bindStylingControls() {
    state.styling = state.styling || { template: 'modern', font: 'sans', spacing: 1.4, accent: '#4F46E5' };
    
    const selTemplate = document.getElementById('selTemplate');
    const selFont = document.getElementById('selFont');
    const rngSpacing = document.getElementById('rngSpacing');
    
    if (selTemplate) {
      // Populate templates from TemplateRenderer
      selTemplate.innerHTML = '';
      if (typeof TemplateRenderer !== 'undefined') {
        const categories = {};
        TemplateRenderer.templatesList.forEach(t => {
          if (!categories[t.category]) categories[t.category] = [];
          categories[t.category].push(t);
        });
        
        for (const cat in categories) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = cat;
          categories[cat].forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.name;
            optgroup.appendChild(option);
          });
          selTemplate.appendChild(optgroup);
        }
      }

      selTemplate.addEventListener('change', () => {
        pushState();
        state.styling.template = selTemplate.value;
        renderPreview();
        updateTemplateGridSelection();
      });
    }
    
    // Setup Template Grid
    const templateGrid = document.getElementById('templateGrid');
    if (templateGrid && typeof TemplateRenderer !== 'undefined') {
      templateGrid.innerHTML = TemplateRenderer.templatesList.map(t => `
        <div class="template-card" data-template="${t.id}" style="border:1px solid var(--line); border-radius:8px; padding:12px; cursor:pointer; background:var(--paper-0);">
          <div style="font-weight:600; font-size:14px; margin-bottom:4px; color:var(--ink-950);">${t.name}</div>
          <div style="font-size:11px; color:var(--ink-600);">${t.category} &bull; ${t.description}</div>
        </div>
      `).join('');

      templateGrid.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
          pushState();
          state.styling.template = card.dataset.template;
          if (selTemplate) selTemplate.value = card.dataset.template;
          renderPreview();
          updateTemplateGridSelection();
        });
      });
      updateTemplateGridSelection();
    }

    if (selFont) {
      selFont.addEventListener('change', () => {
        pushState();
        state.styling.font = selFont.value;
        renderPreview();
        updateFontGridSelection();
      });
    }

    // Setup Font Grid
    const fontCards = document.querySelectorAll('.font-card');
    fontCards.forEach(card => {
      card.addEventListener('click', () => {
        pushState();
        state.styling.font = card.dataset.font;
        if (selFont) selFont.value = card.dataset.font;
        renderPreview();
        updateFontGridSelection();
      });
    });
    updateFontGridSelection();

    if (rngSpacing) {
      rngSpacing.addEventListener('input', () => {
        state.styling.spacing = rngSpacing.value;
        renderPreview();
      });
    }
  }

  function updateTemplateGridSelection() {
    document.querySelectorAll('.template-card').forEach(c => {
      if (c.dataset.template === state.styling.template) {
        c.style.borderColor = 'var(--primary)';
        c.style.backgroundColor = 'var(--primary-50)';
      } else {
        c.style.borderColor = 'var(--line)';
        c.style.backgroundColor = 'var(--paper-0)';
      }
    });
  }

  function updateFontGridSelection() {
    document.querySelectorAll('.font-card').forEach(c => {
      if (c.dataset.font === state.styling.font) {
        c.style.borderColor = 'var(--primary)';
        c.style.borderWidth = '2px';
      } else {
        c.style.borderColor = 'var(--line)';
        c.style.borderWidth = '1px';
      }
    });
  }

  /* ---------------------------------------------------------------------
     Repeating blocks: Experience / Education / Projects
  --------------------------------------------------------------------- */
  function bindRepeatBlocks() {
    document.getElementById('addExperience').addEventListener('click', addExperienceBlock);
    document.getElementById('addEducation').addEventListener('click', addEducationBlock);
    document.getElementById('addProject').addEventListener('click', addProjectBlock);
    document.getElementById('addLanguage').addEventListener('click', addLanguageBlock);
    document.getElementById('addVolunteer').addEventListener('click', addVolunteerBlock);
    document.getElementById('addAward').addEventListener('click', addAwardBlock);
    document.getElementById('addPublication').addEventListener('click', addPublicationBlock);
  }

  function addExperienceBlock(data = {}) {
    const id = 'exp_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, company: '', role: '', start: '', end: '', bullets: '', ...data };
    state.experience.push(entry);

    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field-row">
        <div class="field"><label>Company</label><input type="text" class="i-company" placeholder="Acme Corp"></div>
        <div class="field"><label>Role / Title</label><input type="text" class="i-role" placeholder="Software Engineer"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Start date</label><input type="text" class="i-start" placeholder="Jan 2022"></div>
        <div class="field"><label>End date</label><input type="text" class="i-end" placeholder="Present"></div>
      </div>
      <div class="field">
        <label>Key achievements (one per line)</label>
        <textarea class="i-bullets" rows="4" placeholder="Led migration to microservices, reducing deploy time 40%"></textarea>
        <button class="ai-inline-btn" data-ai="rewrite" data-target="bullets"><i class="fa-solid fa-wand-magic-sparkles"></i> Rewrite professionally</button>
      </div>
    `;
    document.getElementById('experienceBlocks').appendChild(wrap);
    bindRepeatBlockEvents(wrap, entry, ['company', 'role', 'start', 'end', 'bullets'], state.experience);
  }

  function addEducationBlock(data = {}) {
    const id = 'edu_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, school: '', degree: '', start: '', end: '', ...data };
    state.education.push(entry);

    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field-row">
        <div class="field"><label>School</label><input type="text" class="i-school" placeholder="State University"></div>
        <div class="field"><label>Degree</label><input type="text" class="i-degree" placeholder="B.S. Computer Science"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Start year</label><input type="text" class="i-start" placeholder="2018"></div>
        <div class="field"><label>End year</label><input type="text" class="i-end" placeholder="2022"></div>
      </div>
    `;
    document.getElementById('educationBlocks').appendChild(wrap);
    bindRepeatBlockEvents(wrap, entry, ['school', 'degree', 'start', 'end'], state.education);
  }

  function addProjectBlock(data = {}) {
    const id = 'proj_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, name: '', description: '', ...data };
    state.projects.push(entry);

    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field"><label>Project name</label><input type="text" class="i-name" placeholder="Internal Analytics Dashboard"></div>
      <div class="field">
        <label>Description</label>
        <textarea class="i-description" rows="3" placeholder="What you built and the impact it had"></textarea>
        <button class="ai-inline-btn" data-ai="rewrite" data-target="description"><i class="fa-solid fa-wand-magic-sparkles"></i> Improve wording</button>
      </div>
    `;
    document.getElementById('projectBlocks').appendChild(wrap);
    bindRepeatBlockEvents(wrap, entry, ['name', 'description'], state.projects);
  }

  function addLanguageBlock(data = {}) {
    const id = 'lang_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, language: '', proficiency: 'Conversational', ...data };
    state.languages.push(entry);
    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field-row">
        <div class="field"><label>Language</label><input type="text" class="i-language" placeholder="Spanish"></div>
        <div class="field"><label>Proficiency</label>
          <select class="i-proficiency">
            <option>Native / Bilingual</option>
            <option>Full Professional</option>
            <option selected>Conversational</option>
            <option>Elementary</option>
          </select>
        </div>
      </div>`;
    document.getElementById('languageBlocks').appendChild(wrap);
    if (data.language) wrap.querySelector('.i-language').value = data.language;
    if (data.proficiency) wrap.querySelector('.i-proficiency').value = data.proficiency;
    bindRepeatBlockEvents(wrap, entry, ['language', 'proficiency'], state.languages);
  }

  function addVolunteerBlock(data = {}) {
    const id = 'vol_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, organization: '', role: '', period: '', description: '', ...data };
    state.volunteer.push(entry);
    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field-row">
        <div class="field"><label>Organization</label><input type="text" class="i-organization" placeholder="Red Cross"></div>
        <div class="field"><label>Role</label><input type="text" class="i-role" placeholder="Event Coordinator"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Period</label><input type="text" class="i-period" placeholder="Jan 2023 – Present"></div>
      </div>
      <div class="field"><label>Description</label><textarea class="i-description" rows="3" placeholder="What you did and the impact it had"></textarea></div>`;
    document.getElementById('volunteerBlocks').appendChild(wrap);
    bindRepeatBlockEvents(wrap, entry, ['organization', 'role', 'period', 'description'], state.volunteer);
  }

  function addAwardBlock(data = {}) {
    const id = 'award_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, title: '', issuer: '', year: '', ...data };
    state.awards.push(entry);
    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field-row">
        <div class="field"><label>Award Title</label><input type="text" class="i-title" placeholder="Best Innovation Award"></div>
        <div class="field"><label>Issued By</label><input type="text" class="i-issuer" placeholder="TechConf 2024"></div>
      </div>
      <div class="field"><label>Year</label><input type="text" class="i-year" placeholder="2024"></div>`;
    document.getElementById('awardBlocks').appendChild(wrap);
    bindRepeatBlockEvents(wrap, entry, ['title', 'issuer', 'year'], state.awards);
  }

  function addPublicationBlock(data = {}) {
    const id = 'pub_' + Math.random().toString(36).slice(2, 8);
    const entry = { id, title: '', journal: '', year: '', url: '', ...data };
    state.publications.push(entry);
    const wrap = document.createElement('div');
    wrap.className = 'repeat-block';
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <button class="remove-block" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      <div class="field"><label>Publication Title</label><input type="text" class="i-title" placeholder="Deep Learning in Medical Imaging"></div>
      <div class="field-row">
        <div class="field"><label>Journal / Publisher</label><input type="text" class="i-journal" placeholder="Nature Medicine"></div>
        <div class="field"><label>Year</label><input type="text" class="i-year" placeholder="2024"></div>
      </div>
      <div class="field"><label>URL (optional)</label><input type="url" class="i-url" placeholder="https://doi.org/..."></div>`;
    document.getElementById('publicationBlocks').appendChild(wrap);
    bindRepeatBlockEvents(wrap, entry, ['title', 'journal', 'year', 'url'], state.publications);
  }

  function bindRepeatBlockEvents(wrap, entry, fields, collection) {
    fields.forEach((f) => {
      const input = wrap.querySelector(`.i-${f}`);
      input.addEventListener('input', () => {
        pushState();
          entry[f] = input.value;
          renderPreview();
      });
    });
    wrap.querySelector('.remove-block').addEventListener('click', () => {
      const idx = collection.findIndex((e) => e.id === entry.id);
      if (idx > -1) collection.splice(idx, 1);
      wrap.remove();
          renderPreview();
    });
    wrap.querySelectorAll('[data-ai="rewrite"]').forEach((btn) => {
      btn.addEventListener('click', () => runInlineRewrite(btn, wrap));
    });
  }

  /* ---------------------------------------------------------------------
     AI assistant inline actions
  --------------------------------------------------------------------- */
  function bindAiButtons() {
    document.querySelectorAll('.ai-inline-btn[data-ai="summary"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const textarea = document.getElementById('f_summary');
        
        // Handling empty resume case
        const hasContent = state.experience.length > 0 || state.education.length > 0 || state.skills.trim().length > 0;
        if (!textarea.value.trim() && !hasContent) {
          if (window.showToast) window.showToast('Please add some experience, education, or skills first so AI can generate a relevant summary.', 'warning');
          return;
        }

        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Improving...';
        btn.disabled = true;

        try {
          const result = await ApiService.ai.summary(textarea.value, state, state.experienceLevel || 'fresher');
          const enhanced = result.enhanced || result.suggestion || textarea.value;
          
          document.getElementById('aiSummaryOriginal').textContent = textarea.value.trim() || "(No summary provided)";
          document.getElementById('aiSummaryGenerated').textContent = enhanced;
          
          const modal = document.getElementById('aiSummaryModal');
          if (modal) modal.style.display = 'flex';
          
          const applyBtn = document.getElementById('btnApplyAiSummary');
          const keepBtn = document.getElementById('btnKeepOriginalSummary');
          const closeBtn = document.getElementById('closeAiSummaryModal');
          
          const cleanup = () => {
            if (modal) modal.style.display = 'none';
            applyBtn.replaceWith(applyBtn.cloneNode(true));
            keepBtn.replaceWith(keepBtn.cloneNode(true));
            closeBtn.replaceWith(closeBtn.cloneNode(true));
          };

          document.getElementById('btnApplyAiSummary').addEventListener('click', () => {
            textarea.value = enhanced;
            state.summary = enhanced;
            renderPreview();
            cleanup();
          });
          
          document.getElementById('btnKeepOriginalSummary').addEventListener('click', cleanup);
          document.getElementById('closeAiSummaryModal').addEventListener('click', cleanup);
          
        } catch (err) {
          if (window.showToast) window.showToast('AI improvement is temporarily unavailable. Please try again.', 'error');
        } finally {
          btn.innerHTML = originalBtnText;
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.ai-inline-btn[data-ai="keywords"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const textarea = document.getElementById('f_skills');
        await withLoading(btn, async () => {
          const { keywords = [] } = await ApiService.ai.keywords(state.personal.headline || 'Software Engineer');
          const existing = textarea.value.split(',').map((s) => s.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...keywords])].join(', ');
          textarea.value = merged;
          state.skills = merged;
          renderPreview();
          // scheduleSave removed — autosave is disabled; use Save Resume button
        });
      });
    });
  }

  async function runInlineRewrite(btn, wrap) {
    const target = btn.dataset.target;
    const textarea = wrap.querySelector(`.i-${target}`);
    if (!textarea || !textarea.value.trim()) return;
    await withLoading(btn, async () => {
      const response = await ApiService.ai.rewrite(textarea.value);
      const rewritten = response.rewritten || response.improvements?.enhanced || textarea.value;
      textarea.value = rewritten;
      textarea.dispatchEvent(new Event('input'));
    });
  }

  async function withLoading(btn, fn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Working…';
    try {
      await fn();
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast(err.message || 'AI request failed. Is the backend running?', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  /* ---------------------------------------------------------------------
     Live preview rendering
  --------------------------------------------------------------------- */
  function updateNavProgress() {
    const sections = Array.from(document.querySelectorAll('.step-nav-item'));
    const currentIdx = sections.findIndex((s) => s.classList.contains('active'));
    if (currentIdx > -1) {
      const w = ((currentIdx + 1) / sections.length) * 100;
      document.getElementById('wizardProgress').style.width = w + '%';
    }
  }

  function renderCompletenessChecklist() {
    let completedCount = 0;
    let totalCount = 6;
    const isProfessional = state.experienceLevel === 'experienced';
    
    const checklist = [
      { id: 'personal', label: 'Personal Information', isComplete: !!(state.personal.fullName && state.personal.email), req: true },
      { id: 'summary', label: 'Professional Summary', isComplete: !!state.summary.trim(), req: true },
      { id: 'education', label: 'Education', isComplete: state.education.length > 0, req: true },
      { id: 'skills', label: 'Skills', isComplete: !!state.skills.trim(), req: true },
      { id: 'experience', label: 'Work Experience', isComplete: state.experience.length > 0, req: isProfessional },
      { id: 'projects', label: 'Projects', isComplete: state.projects.length > 0, req: true }
    ];

    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    
    checklist.forEach(item => {
      let statusIcon = '<i class="fa-solid fa-circle-exclamation" style="color:var(--score-low);"></i>';
      let statusText = 'Missing';
      
      if (item.isComplete) {
        statusIcon = '<i class="fa-solid fa-circle-check" style="color:var(--score-high);"></i>';
        statusText = 'Complete';
        completedCount++;
      } else if (!item.req) {
        statusIcon = '<i class="fa-solid fa-circle-info" style="color:var(--signal-500);"></i>';
        statusText = 'Optional';
        // Treat optional as 'completed' for percentage, or don't count towards total
        totalCount--;
      }
      
      html += `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--line); font-size:var(--fs-sm);">
          <span style="font-weight:600; color:var(--ink-800);">${item.label} ${!item.req ? '<span style="font-size:var(--fs-2xs); color:var(--ink-500); font-weight:normal;">(Optional for Fresher)</span>' : ''}</span>
          <span style="display:flex; align-items:center; gap:6px; font-size:var(--fs-xs);">${statusIcon} <span style="color:var(--ink-600);">${statusText}</span></span>
        </li>
      `;
    });
    
    html += '</ul>';

    const completionPercent = Math.round((completedCount / totalCount) * 100);
    const circle = document.getElementById('completionCircle');
    const val = document.getElementById('completionCircleVal');
    if (circle && val) {
      const offset = 213.6 - (percent / 100) * 213.6;
      circle.style.strokeDashoffset = offset;
      val.textContent = percent + '%';
    }

    // Sync top wizard step item
    const activeItem = railItems[activeIndex];
    if (activeItem) {
      const activeSectionKey = activeItem.dataset.section;
      document.querySelectorAll('.step-nav-item').forEach((step) => {
        if (step.dataset.step === activeSectionKey) {
          step.classList.add('active');
        } else {
          step.classList.remove('active');
        }
      });
    }
  }

  function bindSectionNav() {
    document.querySelectorAll('.rail-item').forEach((item) => {
      item.addEventListener('click', () => {
        const key = item.dataset.section;
        document.querySelectorAll('.rail-item').forEach((i) => i.classList.remove('active'));
        document.querySelectorAll('.editor-section').forEach((s) => s.classList.remove('active'));
        item.classList.add('active');
        const targetSec = document.querySelector(`.editor-section[data-section="${key}"]`);
        if (targetSec) targetSec.classList.add('active');
        updateProgressBar();
      });
    });
  }

  function bindStepsNav() {
    document.querySelectorAll('.step-nav-item').forEach((step) => {
      step.addEventListener('click', () => {
        const key = step.dataset.step;
        const matchingRailItem = document.querySelector(`.rail-item[data-section="${key}"]`);
        if (matchingRailItem) {
          matchingRailItem.click();
        }
      });
    });
  }
  function renderPreview() {
    const el = document.getElementById('livePreview');
    if (!el) return;
    
    state.styling = state.styling || { template: 'classic-ats', font: 'sans', spacing: 1.4 };
    const st = state.styling;

    if (typeof TemplateRenderer !== 'undefined') {
      const result = TemplateRenderer.generateResumeHtml(state, st.template);
      
      // Map spacing to lineSpacing for backend compatibility
      if (!result.styling.lineSpacing) result.styling.lineSpacing = st.spacing || 1.4;
      
      el.innerHTML = result.html;
      el.className = `paper template-${result.styling.template}`;
      
      // Update CSS vars for rendering
      const fontStr = result.styling.font === 'serif' ? 'Georgia, serif' : result.styling.font === 'mono' ? '"IBM Plex Mono", monospace' : 'Inter, sans-serif';
      
      el.style.setProperty('--cv-font', fontStr);
      el.style.setProperty('--cv-font-size', (result.styling.fontSize || 10) + 'pt');
      el.style.setProperty('--cv-h1-size', ((result.styling.headingSize || 14) + 8) + 'pt');
      el.style.setProperty('--cv-h2-size', (result.styling.headingSize || 14) + 'pt');
      el.style.setProperty('--cv-h3-size', (result.styling.subheadingSize || 11) + 'pt');
      el.style.setProperty('--cv-line-height', result.styling.lineSpacing || 1.5);
      el.style.setProperty('--cv-margin', (result.styling.marginSize || 20) + 'mm');
      el.style.setProperty('--cv-section-spacing', (result.styling.sectionSpacing || 12) + 'pt');
      el.style.setProperty('--cv-p-spacing', (result.styling.pSpacing || 6) + 'pt');
    }
  }
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  /* ---------------------------------------------------------------------
     Local Draft Persistence (Session Safety)
  --------------------------------------------------------------------- */
function saveDraftToLocalStorage() {
  const key = `resume_builder_draft_${currentResumeId || 'new'}`;
  try { localStorage.setItem(key, JSON.stringify(state)); } catch(e) { console.warn('Draft save failed', e); }
}
function loadDraftFromLocalStorage() {
  const key = `resume_builder_draft_${currentResumeId || 'new'}`;
  const data = localStorage.getItem(key);
  if (data) {
    try { return JSON.parse(data); } catch(e) { console.warn('Draft parse error', e); }
  }
  return null;
}

  let currentResumeId = resumeId || null;

  async function saveResume() {
    const p = state.personal || {};
    const hasName = p.fullName && p.fullName.trim().length > 0;
    const hasEmail = p.email && p.email.trim().length > 0;
    const hasSummary = state.summary && state.summary.trim().length > 0;
    const hasEducation = state.education && state.education.length > 0;
    const hasSkills = state.skills && state.skills.trim().length > 0;
    const hasExperience = state.experience && state.experience.length > 0;

    const tier = state.experienceLevel || 'fresher';

    if (!hasName || !hasEmail || !hasSummary || !hasEducation || !hasSkills) {
      if (typeof window.showToast === 'function') {
        window.showToast('Please complete Name, Email, Summary, Education, and Skills before saving.', 'error');
      }
      return;
    }

    if (tier === 'experienced' && !hasExperience) {
      if (typeof window.showToast === 'function') {
        window.showToast('Professional resumes require at least one Work Experience entry.', 'error');
      }
      return;
    }

    const indicator = document.getElementById('saveIndicator');
    const titleEl = document.getElementById('resumeTitle');
    const title = (titleEl && titleEl.value.trim()) || 'Untitled Resume';
    const payload = { title, content: state };

    try {
      if (indicator) {
        indicator.innerHTML = '<span class="dot" style="background:var(--primary-400, #3b82f6)"></span> Saving...';
      }

      if (currentResumeId) {
        await ApiService.resumes.update(currentResumeId, payload);
      } else {
        const resume = await ApiService.resumes.create(payload);
        currentResumeId = resume.id;
        window.history.replaceState({}, '', `resume-builder?id=${resume.id}`);
      }

      if (indicator) {
        indicator.innerHTML = '<span class="dot" style="background:#10b981"></span> All changes saved';
      }

      // Clear undo history and local draft after successful save
      stateHistory = [];
      const draftKey = `resume_builder_draft_${currentResumeId || 'new'}`;
      try { localStorage.removeItem(draftKey); } catch(e) {}

      if (typeof window.showToast === 'function') {
        window.showToast('Resume saved successfully', 'success');
      }
    } catch (err) {
      console.error('Save resume error:', err);
      if (indicator) {
        indicator.innerHTML = `<span class="dot" style="background:#ef4444"></span> Save failed`;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(err.message || 'Failed to save resume. Please try again.', 'error');
      }
    }
  }

  function populateStateAndUI(targetState) {
    state = { ...state, ...targetState };

    const p = state.personal || {};
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('f_fullName', p.fullName);
    setVal('f_headline', p.headline);
    setVal('f_email', p.email);
    setVal('f_phone', p.phone);
    setVal('f_location', p.location);
    setVal('f_link', p.link);
    setVal('f_github', p.github);
    setVal('f_summary', state.summary);
    setVal('f_skills', state.skills);
    setVal('f_certs', state.certifications);

    if (state.styling) {
      setVal('selTemplate', state.styling.template || 'modern');
      setVal('selFont', state.styling.font || 'sans');
      setVal('rngSpacing', state.styling.spacing || 1.4);
      
      updateTemplateGridSelection();
      updateFontGridSelection();

      document.querySelectorAll('.accent-dot').forEach(dot => {
        if (dot.dataset.color === state.styling.accent) {
          document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
        }
      });
    }

    const clearAndPopulate = (containerId, items, addFn) => {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = '';
      const copy = [...(items || [])];
      items.length = 0;
      copy.forEach(item => addFn(item));
    };

    clearAndPopulate('experienceBlocks', state.experience, addExperienceBlock);
    clearAndPopulate('educationBlocks', state.education, addEducationBlock);
    clearAndPopulate('projectBlocks', state.projects, addProjectBlock);
    clearAndPopulate('languageBlocks', state.languages, addLanguageBlock);
    clearAndPopulate('volunteerBlocks', state.volunteer, addVolunteerBlock);
    clearAndPopulate('awardBlocks', state.awards, addAwardBlock);
    clearAndPopulate('publicationBlocks', state.publications, addPublicationBlock);

    renderPreview();
    renderSectionRail();
    updateExperienceTierUI();
  }

  async function loadExistingResume(id) {
    try {
      const resume = await ApiService.resumes.get(id);
      const titleEl = document.getElementById('resumeTitle');
      if (titleEl) titleEl.value = resume.title || 'Untitled Resume';
      currentResumeId = id;
      populateStateAndUI(resume.content || {});
    } catch (err) {
      console.warn('Could not load resume:', err.message);
      addExperienceBlock();
      addEducationBlock();
      renderPreview();
    }
  }

  /* ---------------------------------------------------------------------
     Toolbar: title rename, download, version history
  --------------------------------------------------------------------- */
  function bindToolbar() {
    const undoBtn = document.getElementById('btnUndo');
    undoBtn && undoBtn.addEventListener('click', undo);
    const backBtn = document.getElementById('btnBackTop');
    backBtn && backBtn.addEventListener('click', goBack);
    const titleInput = document.getElementById('resumeTitle');
    titleInput && titleInput.addEventListener('input', () => {
      pushState();
    });

    document.getElementById('btnDownload')?.addEventListener('click', async () => {
      if (!currentResumeId) {
        await saveResume();
      }
      if (!currentResumeId) {
        if (typeof window.showToast === 'function') window.showToast('Please save your resume first before downloading.', 'warning');
        return;
      }
      try {
        if (typeof window.showToast === 'function') window.showToast('Generating PDF — this may take a moment...', 'info');
        await ApiService.downloads.pdf(currentResumeId);
        if (typeof window.showToast === 'function') window.showToast('PDF downloaded successfully!', 'success');
      } catch (err) {
        if (typeof window.showToast === 'function') window.showToast(err.message || 'PDF generation failed.', 'error');
      }
    });

    document.getElementById('btnHistory')?.addEventListener('click', async () => {
      if (!currentResumeId) {
        if (typeof window.showToast === 'function') window.showToast('Please save your resume first to view version checkpoints.', 'warning');
        return;
      }
      try {
        const versions = await ApiService.resumes.getVersions(currentResumeId);
        if (!versions || versions.length === 0) {
          if (typeof window.showToast === 'function') window.showToast('No saved versions found. Version checkpoints are created automatically upon restoring.', 'info');
          return;
        }

        const latestVersion = versions[0];
        if (typeof window.confirmModal === 'function') {
          const restore = await window.confirmModal({
            title: `Restore Version ${latestVersion.version_number}?`,
            message: `Would you like to restore Version ${latestVersion.version_number} (saved on ${new Date(latestVersion.created_at).toLocaleString()})? Your current state will be archived as a new version checkpoint.`,
            confirmText: 'Restore Version',
            cancelText: 'Cancel'
          });

          if (restore) {
            await ApiService.resumes.restoreVersion(currentResumeId, latestVersion.id);
            if (typeof window.showToast === 'function') window.showToast('Resume restored successfully.', 'success');
            window.location.reload();
          }
        }
      } catch (err) {
        if (typeof window.showToast === 'function') window.showToast('Failed to load version history: ' + err.message, 'error');
      }
    });
  }
  function bindNavigationButtons() {
    const nextBtn = document.getElementById('btnNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const items = Array.from(document.querySelectorAll('.rail-item'));
        const activeIdx = items.findIndex(i => i.classList.contains('active'));
        if (activeIdx >= 0 && activeIdx < items.length - 1) {
          items[activeIdx + 1].click();
        }
      });
    }

    const backBtn = document.getElementById('btnBack');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const items = Array.from(document.querySelectorAll('.rail-item'));
        const activeIdx = items.findIndex(i => i.classList.contains('active'));
        if (activeIdx > 0) {
          items[activeIdx - 1].click();
        }
      });
    }
  }
  function goBack() {
    const items = Array.from(document.querySelectorAll('.rail-item'));
    const activeIdx = items.findIndex(i => i.classList.contains('active'));
    if (activeIdx > 0) {
      items[activeIdx - 1].click();
    } else {
      window.location.href = 'dashboard.html';
    }
  }
  function bindTopNav() {
    const backBtn = document.getElementById('btnBackTop');
    backBtn && backBtn.addEventListener('click', goBack);
    // Undo already bound in bindUndo
    // Next already bound via bindNextButton
  }

  function bindBottomNav() {
    const undoBottom = document.getElementById('btnUndoBottom');
    const nextBottom = document.getElementById('btnNextBottom');
    undoBottom && undoBottom.addEventListener('click', undo);
    nextBottom && nextBottom.addEventListener('click', () => {
      const items = Array.from(document.querySelectorAll('.rail-item'));
      const activeIdx = items.findIndex(i => i.classList.contains('active'));
      if (activeIdx >= 0 && activeIdx < items.length - 1) {
        items[activeIdx + 1].click();
      }
    });
  }

  function bindSaveButtons() {
    const saveBtn = document.getElementById('btnSave');
    const retryBtn = document.getElementById('btnRetry');
    saveBtn && saveBtn.addEventListener('click', saveResume);
    retryBtn && retryBtn.addEventListener('click', saveResume);
  }

  function bindEditAndBack() {
    const editBtn = document.getElementById('btnEdit');
    const backPreviewBtn = document.getElementById('btnBackPreview');
    editBtn && editBtn.addEventListener('click', () => {
      // Go to first section (Personal)
      const first = document.querySelector('.rail-item[data-section="personal"]');
      first && first.click();
    });
    backPreviewBtn && backPreviewBtn.addEventListener('click', () => {
      const railItems = document.querySelectorAll('.rail-item');
      const last = railItems[railItems.length - 1];
      last && last.click();
    });
  }

  function bindExperienceTier() {
    const btnFresher = document.getElementById('btnFresher');
    const btnExperienced = document.getElementById('btnExperienced');
    if (!btnFresher || !btnExperienced) return;

    btnFresher.addEventListener('click', () => {
      setExperienceTier('fresher');
    });

    btnExperienced.addEventListener('click', () => {
      setExperienceTier('experienced');
    });
  }

  function setExperienceTier(tier) {
    state.experienceLevel = tier;
    pushState();
    updateExperienceTierUI();

    if (tier === 'fresher') {
      state.sectionOrder = ['personal', 'summary', 'education', 'projects', 'skills', 'experience', 'certifications', 'languages', 'volunteer', 'awards', 'publications'];
    } else {
      state.sectionOrder = ['personal', 'summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'languages', 'volunteer', 'awards', 'publications'];
    }

    renderSectionRail();
    renderPreview();
  }

  function updateExperienceTierUI() {
    const btnFresher = document.getElementById('btnFresher');
    const btnExperienced = document.getElementById('btnExperienced');
    if (!btnFresher || !btnExperienced) return;

    const tier = state.experienceLevel || 'fresher';
    if (tier === 'fresher') {
      btnFresher.className = 'btn btn-primary';
      btnExperienced.className = 'btn btn-ghost';
    } else {
      btnExperienced.className = 'btn btn-primary';
      btnFresher.className = 'btn btn-ghost';
    }
  }

  function setupAiSuggestionsDrawer() {
    const toggleBtn = document.getElementById('btnToggleSuggestions');
    const sidebar = document.getElementById('aiSuggestionsSidebar');
    const closeBtn = document.getElementById('btnCloseSuggestions');
    
    if (!toggleBtn || !sidebar) return;

    const planStr = localStorage.getItem('rf_active_optimization_plan');
    if (!planStr) {
      toggleBtn.style.display = 'none';
      sidebar.style.display = 'none';
      return;
    }

    let plan;
    try {
      plan = JSON.parse(planStr);
    } catch (e) {
      toggleBtn.style.display = 'none';
      sidebar.style.display = 'none';
      return;
    }

    toggleBtn.style.display = 'flex';

    toggleBtn.addEventListener('click', () => {
      const isVisible = sidebar.style.display === 'flex';
      sidebar.style.display = isVisible ? 'none' : 'flex';
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sidebar.style.display = 'none';
      });
    }

    renderAiSuggestions(plan);
    highlightSuggestedSections(plan);
  }

  function highlightSuggestedSections(plan) {
    const sections = plan.sections_to_improve || [];
    sections.forEach(sectionName => {
      const normalName = sectionName.toLowerCase().trim();
      const railItem = document.querySelector(`.rail-item[data-section="${normalName}"]`);
      if (railItem) {
        if (!railItem.querySelector('.suggest-indicator')) {
          const dot = document.createElement('span');
          dot.className = 'suggest-indicator';
          dot.style.cssText = 'width:6px; height:6px; border-radius:50%; background:var(--primary); box-shadow:0 0 8px var(--primary); display:inline-block; margin-left:8px;';
          railItem.appendChild(dot);
        }
      }
    });
  }

  function renderAiSuggestions(plan) {
    const container = document.getElementById('aiSuggestionsContent');
    if (!container) return;

    let keywordsHtml = '';
    if (plan.missing_keywords && plan.missing_keywords.length) {
      keywordsHtml = `
        <div>
          <strong style="color:var(--primary); font-size:11px;"><i class="fa-solid fa-key"></i> Missing Keywords</strong>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
            ${plan.missing_keywords.map((k, idx) => `
              <span class="chip-action" id="kw_${idx}" style="background:var(--paper-100); border:1px solid var(--line); border-radius:var(--radius-pill); padding:4px 10px; font-size:10px; display:inline-flex; align-items:center; gap:6px; color:var(--ink-950);">
                ${esc(k)} 
                <button type="button" class="kw-add-btn" data-keyword="${esc(k)}" data-target="kw_${idx}" style="background:none; border:none; color:var(--primary); font-weight:700; cursor:pointer; padding:0; font-size:10px;">+ Add</button>
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }

    let bulletsHtml = '';
    if (plan.weak_bullets && plan.weak_bullets.length) {
      bulletsHtml = `
        <div>
          <strong style="color:var(--primary); font-size:11px;"><i class="fa-solid fa-feather-pointed"></i> Bullets to Improve</strong>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
            ${plan.weak_bullets.map((b, idx) => `
              <div class="bullet-suggestion-card" id="bl_${idx}" style="background:var(--paper-0); border:1px solid var(--line); border-radius:var(--radius-md); padding:10px; font-size:10px; color:var(--ink-950);">
                <div style="color:var(--score-low); text-decoration:line-through; margin-bottom:4px;">"${esc(b.original)}"</div>
                <div style="color:var(--score-high); font-weight:600; margin-bottom:6px;">"${esc(b.enhanced)}"</div>
                <button type="button" class="btn btn-primary btn-xs btn-block apply-bullet-btn" data-original="${esc(b.original)}" data-enhanced="${esc(b.enhanced)}" data-target="bl_${idx}"><i class="fa-solid fa-wand-magic-sparkles"></i> Apply Improvement</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="background:var(--signal-100); border-left:3px solid var(--primary); padding:10px; border-radius:var(--radius-sm);">
        <strong style="color:var(--primary); font-size:11px;">Summary</strong>
        <p style="margin:4px 0 0 0; color:var(--ink-800);">${esc(plan.summary)}</p>
      </div>

      ${keywordsHtml}
      ${bulletsHtml}

      ${plan.formatting_suggestions && plan.formatting_suggestions.length ? `
        <div>
          <strong style="color:var(--primary); font-size:11px;"><i class="fa-solid fa-file-signature"></i> Formatting Tips</strong>
          <ul style="margin:6px 0 0 16px; padding:0; display:grid; gap:4px; color:var(--ink-950);">
            ${plan.formatting_suggestions.map(s => `<li>${esc(s)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    container.querySelectorAll('.kw-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kw = btn.dataset.keyword;
        const targetId = btn.dataset.target;
        
        let currentSkills = state.skills.trim();
        if (currentSkills) {
          if (!currentSkills.toLowerCase().includes(kw.toLowerCase())) {
            state.skills = currentSkills + ', ' + kw;
          }
        } else {
          state.skills = kw;
        }

        const skillsTextarea = document.getElementById('f_skills');
        if (skillsTextarea) {
          skillsTextarea.value = state.skills;
        }

        pushState();
        renderPreview();

        const chip = document.getElementById(targetId);
        if (chip) {
          chip.style.borderColor = 'var(--score-high)';
          chip.style.background = 'var(--score-high-bg)';
          chip.style.color = 'var(--score-high)';
          chip.innerHTML = `${esc(kw)} <i class="fa-solid fa-check"></i>`;
        }
      });
    });

    container.querySelectorAll('.apply-bullet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const original = btn.dataset.original.trim().toLowerCase();
        const enhanced = btn.dataset.enhanced;
        const targetId = btn.dataset.target;

        let replaced = false;
        
        state.experience.forEach(exp => {
          if (exp.bullets) {
            let bullets = exp.bullets.split('\n');
            const matchIdx = bullets.findIndex(b => b.trim().toLowerCase().includes(original) || original.includes(b.trim().toLowerCase()));
            if (matchIdx > -1) {
              bullets[matchIdx] = enhanced;
              exp.bullets = bullets.join('\n');
              replaced = true;
            }
          }
        });

        if (replaced) {
          const exp = [...state.experience]; state.experience = [];
          document.getElementById('experienceBlocks').innerHTML = '';
          exp.forEach(e => addExperienceBlock(e));

          pushState();
          renderPreview();

          const card = document.getElementById(targetId);
          if (card) {
            card.innerHTML = `
              <div style="color:var(--score-high); font-weight:600; text-align:center; padding:8px 0;">
                <i class="fa-solid fa-circle-check" style="font-size:16px;"></i> Improvement Applied
              </div>
            `;
            card.style.borderColor = 'var(--score-high)';
            card.style.background = 'var(--score-high-bg)';
          }
        } else {
          if (typeof window.showToast === 'function') {
            window.showToast('Could not find the original bullet point text in your resume Experience section to replace.', 'warning');
          }
        }
      });
    });
  }

  function renderSectionRail() {
    const rail = document.getElementById('sectionRail');
    if (!rail) return;

    const itemsMap = {};
    const items = Array.from(rail.querySelectorAll('.rail-item'));
    items.forEach(item => {
      const sec = item.dataset.section;
      if (sec) itemsMap[sec] = item;
    });

    // First item is always 'type'
    const typeItem = itemsMap['type'];
    if (typeItem) rail.appendChild(typeItem);

    // Then reorder according to state.sectionOrder
    const order = state.sectionOrder || ['personal', 'summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages', 'volunteer', 'awards', 'publications'];
    order.forEach(sec => {
      const item = itemsMap[sec];
      if (item) rail.appendChild(item);
    });
  }

  // call in init after other bindings
  bindTopNav();
  bindBottomNav();
  bindSaveButtons();
  bindEditAndBack();

  // after existing bindToolbar call
  bindNavigationButtons();
})();
