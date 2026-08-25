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
    state.styling = state.styling || { template: 'classic-ats', font: "'Inter', sans-serif", fontSize: 10, headingSize: 14, subheadingSize: 11, lineSpacing: 1.5, sectionSpacing: 12, pSpacing: 6, marginSize: 20 };
    
    const fields = [
      { id: 'selTemplate', key: 'template' },
      { id: 'selFontFamily', key: 'font' },
      { id: 'rngFontSize', key: 'fontSize', isFloat: true, label: 'lblFontSize', unit: 'pt' },
      { id: 'rngHeadingSize', key: 'headingSize', isFloat: true, label: 'lblHeadingSize', unit: 'pt' },
      { id: 'rngSubheadingSize', key: 'subheadingSize', isFloat: true, label: 'lblSubheadingSize', unit: 'pt' },
      { id: 'rngLineHeight', key: 'lineSpacing', isFloat: true, label: 'lblLineHeight', unit: '' },
      { id: 'rngSectionSpacing', key: 'sectionSpacing', isFloat: true, label: 'lblSectionSpacing', unit: 'pt' },
      { id: 'rngParagraphSpacing', key: 'pSpacing', isFloat: true, label: 'lblParagraphSpacing', unit: 'pt' },
      { id: 'rngMargins', key: 'marginSize', isFloat: true, label: 'lblMargins', unit: 'mm' }
    ];

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        el.addEventListener('input', (e) => {
          pushState();
          const val = f.isFloat ? parseFloat(e.target.value) : e.target.value;
          state.styling[f.key] = val;
          if (f.label) {
            const lbl = document.getElementById(f.label);
            if (lbl) lbl.textContent = val + f.unit;
          }
          renderPreview();
        });
      }
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
  bindNextButton();
})();
