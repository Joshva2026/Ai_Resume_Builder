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

    if (resumeId) {
      loadExistingResume(resumeId);
    } else {
      const draft = loadDraftFromLocalStorage();
      if (draft && confirm('Restore unsaved draft?')) {
        state = draft;
        renderPreview();
      } else {
        addExperienceBlock();
        addEducationBlock();
        renderPreview();
      }
    }
    
    renderSectionRail();
    updateExperienceTierUI();
    setupAiSuggestionsDrawer();

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
      // Re-sync selector
      const sel = document.getElementById('selTemplate');
      if (sel) sel.value = tplName;
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
  if (stateHistory.length === 0) return alert('Nothing to undo');
  state = stateHistory.pop();
  renderPreview();
  // Re-sync fields for simple inputs
  document.getElementById('f_fullName').value = state.personal.fullName || '';
  document.getElementById('f_headline').value = state.personal.headline || '';
  document.getElementById('f_email').value = state.personal.email || '';
  document.getElementById('f_phone').value = state.personal.phone || '';
  document.getElementById('f_location').value = state.personal.location || '';
  document.getElementById('f_link').value = state.personal.link || '';
  const ghEl = document.getElementById('f_github');
  if (ghEl) ghEl.value = state.personal.github || '';
  document.getElementById('f_summary').value = state.summary || '';
  document.getElementById('f_skills').value = state.skills || '';
  document.getElementById('f_certs').value = state.certifications || '';
  // Note: repeat blocks not fully restored here for brevity.
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
      selTemplate.addEventListener('change', () => {
        pushState();
        state.styling.template = selTemplate.value;
        renderPreview();
        // scheduleSave(); // Auto-save disabled
      });
    }
    if (selFont) {
      document.getElementById('selFont').addEventListener('change', () => {
          pushState();
          state.styling.font = selFont.value;
          renderPreview();
        });
    }
    if (rngSpacing) {
      rngSpacing.addEventListener('input', () => {
          pushState();
          state.styling.spacing = parseFloat(rngSpacing.value);
          renderPreview();
        });
    }
    
    document.querySelectorAll('.accent-dot').forEach(dot => {
      dot.addEventListener('click', () => {
          document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          pushState();
          state.styling.accent = dot.dataset.color;
          renderPreview();
        });
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
        await withLoading(btn, async () => {
          const { suggestion } = await ApiService.ai.summary(textarea.value);
          const enhanced = suggestion || textarea.value;
          textarea.value = enhanced;
          state.summary = enhanced;
          renderPreview();
          scheduleSave();
        });
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
          scheduleSave();
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
      alert(err.message || 'AI request failed. Is the backend running?');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  /* ---------------------------------------------------------------------
     Live preview rendering
  --------------------------------------------------------------------- */
  function updateProgressBar() {
    const railItems = Array.from(document.querySelectorAll('.rail-item'));
    const activeIndex = railItems.findIndex(i => i.classList.contains('active'));
    const percent = Math.round(((activeIndex + 1) / railItems.length) * 100);
    const bar = document.getElementById('wizardProgress');
    if (bar) bar.style.width = percent + '%';

    // Update circular progress gauge
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
    const p = state.personal;
    const el = document.getElementById('livePreview');
    if (!el) return;

    state.styling = state.styling || { template: 'modern', font: 'sans', spacing: 1.4, accent: '#4F46E5' };
    const st = state.styling;

    // ─── CLASSIC ACADEMIC TEMPLATE ────────────────────────────────────────
    if (st.template === 'classic-academic') {
      el.style.fontFamily = '"Times New Roman", Times, Georgia, serif';
      el.style.lineHeight = '1.45';
      el.style.color = '#111';
      el.style.fontSize = '11px';
      el.style.background = '#fff';

      const skillsArr = state.skills.split(',').map(s => s.trim()).filter(Boolean);
      const certsArr  = state.certifications.split('\n').map(s => s.trim()).filter(Boolean);

      // Section heading — bold text with solid bottom border
      function caHeading(text) {
        return `<div style="font-size:12px;font-weight:700;color:#111;border-bottom:1.5px solid #111;padding-bottom:2px;margin:12px 0 6px 0;letter-spacing:0.01em;">${esc(text)}</div>`;
      }

      // Contact items with inline icons — only shown if data exists
      const contactParts = [];
      if (p.phone)    contactParts.push(`<span>&#9990;&nbsp;${esc(p.phone)}</span>`);
      if (p.email)    contactParts.push(`<span>&#9993;&nbsp;${esc(p.email)}</span>`);
      if (p.link) {
        const linkedInDisplay = p.link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        contactParts.push(`<span>&#128279;&nbsp;${esc(linkedInDisplay)}</span>`);
      }
      if (p.github) {
        const githubDisplay = p.github.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        contactParts.push(`<span>&#9729;&nbsp;${esc(githubDisplay)}</span>`);
      }
      if (p.location) contactParts.push(`<span>&#128205;&nbsp;${esc(p.location)}</span>`);

      // Header block — large centered spaced uppercase name
      const caHeader = `
        <div style="text-align:center;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #111;">
          <div style="font-size:22px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#111;margin-bottom:4px;">
            ${esc(p.fullName) || 'YOUR NAME'}
          </div>
          ${p.headline ? `<div style="font-size:11px;color:#444;font-style:italic;margin-bottom:5px;">${esc(p.headline)}</div>` : ''}
          <div style="font-size:9.5px;color:#333;display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:3px;">
            ${contactParts.join('') || '<span style="color:#999">Add contact info in Personal Info section</span>'}
          </div>
        </div>`;

      // Profile Summary
      const caSummary = state.summary ? `
        <div>
          ${caHeading('Profile Summary')}
          <ul style="margin:0 0 0 18px;padding:0;">
            ${state.summary.split('\n').filter(Boolean).map(line =>
              `<li style="list-style-type:disc;margin-bottom:3px;">${esc(line)}</li>`
            ).join('') || `<li style="list-style-type:disc;">${esc(state.summary)}</li>`}
          </ul>
        </div>` : '';

      // Experience
      const caExperience = state.experience && state.experience.length ? `
        <div>
          ${caHeading('Experience')}
          ${state.experience.map(e => `
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span style="font-weight:700;font-size:11px;">${esc(e.company) || 'Company'} &mdash; <span style="font-weight:600;font-style:italic;">${esc(e.role) || 'Role'}</span></span>
                <span style="font-size:10px;color:#444;white-space:nowrap;margin-left:8px;">${esc(e.start)}${e.end ? ` &ndash; ${esc(e.end)}` : ''}</span>
              </div>
              ${e.bullets ? `<ul style="margin:3px 0 0 18px;padding:0;">
                ${e.bullets.split('\n').filter(Boolean).map(b => `<li style="list-style-type:disc;margin-bottom:2px;">${esc(b)}</li>`).join('')}
              </ul>` : ''}
            </div>`).join('')}
        </div>` : '';

      // Projects
      const caProjects = state.projects && state.projects.length ? `
        <div>
          ${caHeading('Projects')}
          ${state.projects.map(pr => `
            <div style="margin-bottom:8px;">
              <div style="font-weight:700;font-size:11px;">${esc(pr.name)}</div>
              ${pr.description ? `<ul style="margin:3px 0 0 18px;padding:0;">
                ${pr.description.split('\n').filter(Boolean).map(line => `<li style="list-style-type:disc;margin-bottom:2px;">${esc(line)}</li>`).join('')
                  || `<li style="list-style-type:disc;">${esc(pr.description)}</li>`}
              </ul>` : ''}
            </div>`).join('')}
        </div>` : '';

      // Skills — 4-column grid matching reference
      const caSkills = skillsArr.length ? `
        <div>
          ${caHeading('Technical Skills')}
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px 8px;margin:0;">
            ${skillsArr.map(s => `<span style="font-size:10.5px;">&#8226; ${esc(s)}</span>`).join('')}
          </div>
        </div>` : '';

      // Education
      const caEducation = state.education && state.education.length ? `
        <div>
          ${caHeading('Education')}
          ${state.education.map(e => `
            <div style="margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span style="font-weight:700;">${esc(e.school) || 'Institution'}</span>
                <span style="font-size:10px;color:#444;white-space:nowrap;margin-left:8px;">${esc(e.start)}${e.end ? ` &ndash; ${esc(e.end)}` : ''}</span>
              </div>
              <div style="color:#333;font-size:10.5px;font-style:italic;">
                ${esc(e.degree) || 'Degree'}
                ${e.gpa ? ` &mdash; <strong>CGPA: ${esc(e.gpa)}</strong>` : ''}
              </div>
              ${e.location ? `<div style="color:#555;font-size:10px;">${esc(e.location)}</div>` : ''}
            </div>`).join('')}
        </div>` : '';

      // Certifications / Extracurricular
      const caCerts = certsArr.length ? `
        <div>
          ${caHeading('Extracurricular / Certifications')}
          <ul style="margin:0 0 0 18px;padding:0;">
            ${certsArr.map(c => `<li style="list-style-type:disc;margin-bottom:3px;">${esc(c)}</li>`).join('')}
          </ul>
        </div>` : '';

      // Languages
      const caLanguages = state.languages && state.languages.length ? `
        <div>
          ${caHeading('Languages')}
          <div>${state.languages.map(l => `<span style="margin-right:20px;"><strong>${esc(l.language)}</strong>${l.proficiency ? ` (${esc(l.proficiency)})` : ''}</span>`).join('')}</div>
        </div>` : '';

      // Volunteer
      const caVolunteer = state.volunteer && state.volunteer.length ? `
        <div>
          ${caHeading('Volunteer Work')}
          ${state.volunteer.map(v => `
            <div style="margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span style="font-weight:700;">${esc(v.role)}${v.organization ? ` &mdash; ${esc(v.organization)}` : ''}</span>
                <span style="font-size:10px;color:#444;">${esc(v.period)}</span>
              </div>
              ${v.description ? `<div>${esc(v.description)}</div>` : ''}
            </div>`).join('')}
        </div>` : '';

      // Awards
      const caAwards = state.awards && state.awards.length ? `
        <div>
          ${caHeading('Awards & Honours')}
          <ul style="margin:0 0 0 18px;padding:0;">
            ${state.awards.map(a => `<li style="list-style-type:disc;margin-bottom:3px;"><strong>${esc(a.title)}</strong>${a.issuer ? ` &mdash; ${esc(a.issuer)}` : ''}${a.year ? `, ${esc(a.year)}` : ''}</li>`).join('')}
          </ul>
        </div>` : '';

      // Publications
      const caPublications = state.publications && state.publications.length ? `
        <div>
          ${caHeading('Publications')}
          <ul style="margin:0 0 0 18px;padding:0;">
            ${state.publications.map(pub => `<li style="list-style-type:disc;margin-bottom:3px;"><em>${esc(pub.title)}</em>${pub.journal ? `, ${esc(pub.journal)}` : ''}${pub.year ? ` (${esc(pub.year)})` : ''}</li>`).join('')}
          </ul>
        </div>` : '';

      // Ordered sections map for classic-academic
      const caMap = {
        summary: caSummary,
        experience: caExperience,
        projects: caProjects,
        skills: caSkills,
        education: caEducation,
        certifications: caCerts,
        languages: caLanguages,
        volunteer: caVolunteer,
        awards: caAwards,
        publications: caPublications,
      };

      const orderedOrder = state.sectionOrder || ['personal','summary','experience','education','projects','skills','certifications','languages','volunteer','awards','publications'];
      const caBody = orderedOrder.map(k => caMap[k] || '').filter(Boolean).join('\n');

      el.innerHTML = `
        <div style="padding:20px 24px;font-family:'Times New Roman',Times,Georgia,serif;font-size:11px;line-height:1.45;color:#111;background:#fff;max-width:100%;">
          ${caHeader}
          ${caBody}
        </div>`;
      return; // early return — no further rendering needed for this template
    }
    // ─── END CLASSIC ACADEMIC ─────────────────────────────────────────────

    // Apply basic font settings
    el.style.fontFamily = st.font === 'serif' ? 'Georgia, serif' : st.font === 'mono' ? '"IBM Plex Mono", monospace' : 'Inter, sans-serif';
    el.style.lineHeight = st.spacing;
    el.style.color = '#333';
    el.style.fontSize = '12px';

    const skillsArr = state.skills.split(',').map((s) => s.trim()).filter(Boolean);
    const certsArr = state.certifications.split('\n').map((s) => s.trim()).filter(Boolean);

    function headingHtml(text) {
      if (st.template === 'executive') {
        return `<div class="p-heading" style="text-align: center; border-bottom: 2px double ${st.accent}; color: ${st.accent}; text-transform: uppercase; font-weight: 700; margin-top: 16px; margin-bottom: 8px; font-size: 13px">${esc(text)}</div>`;
      } else if (st.template === 'minimal') {
        return `<div class="p-heading" style="border: none; color: #111; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-top: 14px; margin-bottom: 4px; font-size: 11px">${esc(text)}</div>`;
      } else if (st.template === 'academic') {
        return `<div class="p-heading" style="border-bottom: 1px solid #333; color: #111; font-weight: 700; margin-top: 12px; margin-bottom: 6px; font-size: 12px">${esc(text)}</div>`;
      } else { // modern
        return `<div class="p-heading" style="border-bottom: 1px solid ${st.accent}; color: ${st.accent}; font-weight: 700; margin-top: 16px; margin-bottom: 8px; font-size: 13px">${esc(text)}</div>`;
      }
    }

    let headerHtml = '';
    if (st.template === 'executive') {
      headerHtml = `
        <div style="text-align: center; margin-bottom: 16px">
          <div class="p-name" style="font-size: 24px; font-weight: 700; color: #111">${esc(p.fullName) || 'Your Name'}</div>
          <div class="p-title" style="font-style: italic; color: #444; font-size: 14px; margin-top: 4px">${esc(p.headline) || 'Professional Title'}</div>
          <div class="p-contact" style="font-size: 11px; color: #666; margin-top: 6px">${[p.email, p.phone, p.location, p.link, p.github].filter(Boolean).map(esc).join('  |  ') || 'email | phone | location'}</div>
        </div>
      `;
    } else {
      headerHtml = `
        <div class="p-name" style="font-size: 22px; font-weight: 700; color: ${st.template === 'modern' ? st.accent : '#111'}">${esc(p.fullName) || 'Your Name'}</div>
        <div class="p-title" style="font-size: 14px; font-weight: 600; color: #555">${esc(p.headline) || 'Professional Title'}</div>
        <div class="p-contact" style="font-size: 11px; color: #666; margin-top: 4px; margin-bottom: 12px">${[p.email, p.phone, p.location, p.link, p.github].filter(Boolean).map(esc).join('  ·  ') || 'email · phone · location'}</div>
      `;
    }

    const sectionsHtml = {
      summary: state.summary ? `<div class="p-section">${headingHtml('Summary')}<div>${esc(state.summary)}</div></div>` : '',
      experience: `<div class="p-section">
        ${headingHtml('Experience')}
        ${state.experience && state.experience.length ? state.experience.map((e) => `
          <div class="p-entry" style="margin-bottom: 10px">
            <div class="p-entry-head" style="display:flex; justify-content:space-between; font-weight: 600; color: #222"><span>${esc(e.role) || 'Role'} · ${esc(e.company) || 'Company'}</span><span style="font-weight: 500">${esc(e.start)} – ${esc(e.end)}</span></div>
            ${e.bullets ? `<ul style="margin: 4px 0 0 18px; padding: 0">${e.bullets.split('\n').filter(Boolean).map((b) => `<li style="list-style-type: disc">${esc(b)}</li>`).join('')}</ul>` : ''}
          </div>`).join('') : '<div class="p-empty">No experience added yet</div>'}
      </div>`,
      education: `<div class="p-section">
        ${headingHtml('Education')}
        ${state.education && state.education.length ? state.education.map((e) => `
          <div class="p-entry" style="margin-bottom: 10px">
            <div class="p-entry-head" style="display:flex; justify-content:space-between; font-weight: 600; color: #222"><span>${esc(e.degree) || 'Degree'}</span><span style="font-weight: 500">${esc(e.start)} – ${esc(e.end)}</span></div>
            <div class="p-entry-sub" style="color: #666">${esc(e.school)}</div>
          </div>`).join('') : '<div class="p-empty">No education added yet</div>'}
      </div>`,
      projects: state.projects && state.projects.length ? `<div class="p-section">${headingHtml('Projects')}${state.projects.map((pr) => `
          <div class="p-entry" style="margin-bottom: 8px"><div class="p-entry-head" style="font-weight: 600; color: #222">${esc(pr.name)}</div><div>${esc(pr.description)}</div></div>`).join('')}</div>` : '',
      skills: skillsArr.length ? `<div class="p-section">${headingHtml('Skills')}<div>${skillsArr.map(esc).join(' · ')}</div></div>` : '',
      certifications: certsArr.length ? `<div class="p-section">${headingHtml('Certifications')}<ul style="margin: 4px 0 0 18px; padding: 0">${certsArr.map((c) => `<li style="list-style-type: disc">${esc(c)}</li>`).join('')}</ul></div>` : '',
      languages: state.languages && state.languages.length ? `<div class="p-section">${headingHtml('Languages')}<div>${state.languages.map(l => `<span style="margin-right:16px"><strong>${esc(l.language)}</strong> — ${esc(l.proficiency)}</span>`).join('')}</div></div>` : '',
      volunteer: state.volunteer && state.volunteer.length ? `<div class="p-section">${headingHtml('Volunteer Work')}${state.volunteer.map(v => `
          <div class="p-entry" style="margin-bottom: 8px"><div class="p-entry-head" style="display:flex; justify-content:space-between; font-weight: 600"><span>${esc(v.role)} · ${esc(v.organization)}</span><span style="font-weight: 500">${esc(v.period)}</span></div>${v.description ? `<div>${esc(v.description)}</div>` : ''}</div>`).join('')}</div>` : '',
      awards: state.awards && state.awards.length ? `<div class="p-section">${headingHtml('Awards &amp; Honours')}<ul style="margin: 4px 0 0 18px; padding: 0">${state.awards.map(a => `<li style="list-style-type: disc"><strong>${esc(a.title)}</strong>${a.issuer ? ` — ${esc(a.issuer)}` : ''}${a.year ? `, ${esc(a.year)}` : ''}</li>`).join('')}</ul></div>` : '',
      publications: state.publications && state.publications.length ? `<div class="p-section">${headingHtml('Publications')}<ul style="margin: 4px 0 0 18px; padding: 0">${state.publications.map(p => `<li style="list-style-type: disc"><em>${esc(p.title)}</em>${p.journal ? `, ${esc(p.journal)}` : ''}${p.year ? ` (${esc(p.year)})` : ''}${p.url ? ` <a href="${esc(p.url)}" style="color:var(--signal-600)">[link]</a>` : ''}</li>`).join('')}</ul></div>` : ''
    };

    const orderedOrder = state.sectionOrder || ['personal', 'summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages', 'volunteer', 'awards', 'publications'];
    const orderedHtml = orderedOrder
      .map(key => sectionsHtml[key] || '')
      .filter(Boolean)
      .join('\n');

    el.innerHTML = `
      ${headerHtml}
      ${orderedHtml}
    `;
  }

  function esc(str) {
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

  async function loadExistingResume(id) {
    try {
      const resume = await ApiService.resumes.get(id);
      document.getElementById('resumeTitle').value = resume.title;
      state = { ...state, ...resume.content };
      currentResumeId = id;

      // Repopulate fields
      document.getElementById('f_fullName').value = state.personal.fullName || '';
      document.getElementById('f_headline').value = state.personal.headline || '';
      document.getElementById('f_email').value = state.personal.email || '';
      document.getElementById('f_phone').value = state.personal.phone || '';
      document.getElementById('f_location').value = state.personal.location || '';
      document.getElementById('f_link').value = state.personal.link || '';
      const ghLoadEl = document.getElementById('f_github');
      if (ghLoadEl) ghLoadEl.value = state.personal.github || '';
      document.getElementById('f_summary').value = state.summary || '';
      document.getElementById('f_skills').value = state.skills || '';
      document.getElementById('f_certs').value = state.certifications || '';

      // Repopulate style selections
      if (state.styling) {
        document.getElementById('selTemplate').value = state.styling.template || 'modern';
        document.getElementById('selFont').value = state.styling.font || 'sans';
        document.getElementById('rngSpacing').value = state.styling.spacing || 1.4;
        
        document.querySelectorAll('.accent-dot').forEach(dot => {
          if (dot.dataset.color === state.styling.accent) {
            document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
          }
        });
      }

      document.getElementById('experienceBlocks').innerHTML = '';
      document.getElementById('educationBlocks').innerHTML = '';
      document.getElementById('projectBlocks').innerHTML = '';
      document.getElementById('languageBlocks').innerHTML = '';
      document.getElementById('volunteerBlocks').innerHTML = '';
      document.getElementById('awardBlocks').innerHTML = '';
      document.getElementById('publicationBlocks').innerHTML = '';
      const exp = [...state.experience]; state.experience = [];
      exp.forEach((e) => addExperienceBlock(e));
      const edu = [...state.education]; state.education = [];
      edu.forEach((e) => addEducationBlock(e));
      const proj = [...state.projects]; state.projects = [];
      proj.forEach((e) => addProjectBlock(e));
      const lang = [...(state.languages||[])]; state.languages = [];
      lang.forEach((e) => addLanguageBlock(e));
      const vol = [...(state.volunteer||[])]; state.volunteer = [];
      vol.forEach((e) => addVolunteerBlock(e));
      const awd = [...(state.awards||[])]; state.awards = [];
      awd.forEach((e) => addAwardBlock(e));
      const pub = [...(state.publications||[])]; state.publications = [];
      pub.forEach((e) => addPublicationBlock(e));

      renderPreview();
      renderSectionRail();
      updateExperienceTierUI();
    } catch (err) {
      console.warn('Could not load resume:', err.message);
      addExperienceBlock();
      addEducationBlock();
      renderPreview();
    }
  }

  /* ---------------------------------------------------------------------
     Toolbar: title rename, download
  --------------------------------------------------------------------- */
  function bindToolbar() {
    const undoBtn = document.getElementById('btnUndo');
    undoBtn && undoBtn.addEventListener('click', undo);
    const backBtn = document.getElementById('btnBackTop');
    backBtn && backBtn.addEventListener('click', goBack);
    const titleInput = document.getElementById('resumeTitle');
    titleInput && titleInput.addEventListener('input', () => {
      pushState();
      // No auto‑save
    });

    document.getElementById('btnDownload').addEventListener('click', async () => {
      if (!currentResumeId) {
        await saveResume();
      }
      if (!currentResumeId) return alert('Save your resume first.');
      try {
        const download = await ApiService.downloads.pdf(currentResumeId);
        const downloadUrl = download.downloadUrl || download.url || 'Not available yet';
        alert('PDF ready: ' + downloadUrl + '\n(Wire this to the actual file host in production.)');
      } catch (err) {
        alert(err.message);
      }
    });

    document.getElementById('btnHistory').addEventListener('click', async () => {
      if (!currentResumeId) {
        return alert('Save your resume first.');
      }
      try {
        const versions = await ApiService.resumes.getVersions(currentResumeId);
        if (versions.length === 0) {
          alert('No saved versions found for this resume. Version checkpoints are generated automatically upon restoring.');
          return;
        }
        
        const listStr = versions.map(v => 
          `Version ${v.version_number} - Saved on ${new Date(v.created_at).toLocaleString()}`
        ).join('\n');
        
        const choice = prompt(
          `Versions found for this resume:\n\n${listStr}\n\nEnter a Version Number to restore (e.g. 1):`
        );
        
        if (choice) {
          const verNo = parseInt(choice);
          const targetVersion = versions.find(v => v.version_number === verNo);
          if (!targetVersion) {
            alert('Invalid version number selected.');
            return;
          }
          if (confirm(`Are you sure you want to restore Version ${verNo}? Your current resume state will be safely saved as a new version checkpoint.`)) {
            await ApiService.resumes.restoreVersion(currentResumeId, targetVersion.id);
            alert('Resume restored successfully.');
            window.location.reload();
          }
        }
      } catch (err) {
        alert('Failed to load version history: ' + err.message);
      }
    });
  }
  function bindNextButton() {
    const nextBtn = document.getElementById('btnNext');
    if (!nextBtn) return;
    nextBtn.addEventListener('click', () => {
      const items = Array.from(document.querySelectorAll('.rail-item'));
      const activeIdx = items.findIndex(i => i.classList.contains('active'));
      if (activeIdx >= 0 && activeIdx < items.length - 1) {
        items[activeIdx + 1].click();
      }
    });
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
          alert('Could not find the original bullet point text in your resume Experience section to replace.');
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
  bindNextButton();
})();
