/**
 * RESUME BUILDER PAGE LOGIC
 * All resume content in this page comes only from what the user types.
 * Nothing here fabricates experience, education, or skills.
 */

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const resumeId = urlParams.get('id');

  let state = {
    personal: { fullName: '', headline: '', email: '', phone: '', location: '', link: '' },
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
  };

  let saveTimer = null;

  document.addEventListener('DOMContentLoaded', init);
  // Since app-shell injects the template synchronously right after render, run init on next tick too
  setTimeout(init, 0);

  let initialized = false;
  function init() {
    if (initialized) return;
    if (!document.getElementById('experienceBlocks')) return; // template not yet injected
    initialized = true;

    bindSectionNav();
    bindDragReorder();
    bindPersonalFields();
    bindRepeatBlocks();
    bindAiButtons();
    bindToolbar();

    if (resumeId) loadExistingResume(resumeId);
    else {
      addExperienceBlock();
      addEducationBlock();
      renderPreview();
    }
  }

  /* ---------------------------------------------------------------------
     Section navigation (rail -> editor pane)
  --------------------------------------------------------------------- */
  function bindSectionNav() {
    document.querySelectorAll('.rail-item').forEach((item) => {
      item.addEventListener('click', () => {
        const key = item.dataset.section;
        document.querySelectorAll('.rail-item').forEach((i) => i.classList.remove('active'));
        document.querySelectorAll('.editor-section').forEach((s) => s.classList.remove('active'));
        item.classList.add('active');
        document.querySelector(`.editor-section[data-section="${key}"]`).classList.add('active');
      });
    });
  }

  /* ---------------------------------------------------------------------
     Drag & drop reordering of the section rail
  --------------------------------------------------------------------- */
  function bindDragReorder() {
    const rail = document.getElementById('sectionRail');
    let dragged = null;

    rail.querySelectorAll('.rail-item').forEach((item) => {
      item.addEventListener('dragstart', () => { dragged = item; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); scheduleSave(); });
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
      el.addEventListener('input', () => {
        map[id](el.value);
        renderPreview();
        scheduleSave();
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
        entry[f] = input.value;
        renderPreview();
        scheduleSave();
      });
    });
    wrap.querySelector('.remove-block').addEventListener('click', () => {
      const idx = collection.findIndex((e) => e.id === entry.id);
      if (idx > -1) collection.splice(idx, 1);
      wrap.remove();
      renderPreview();
      scheduleSave();
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
  function renderPreview() {
    const p = state.personal;
    const el = document.getElementById('livePreview');
    if (!el) return;

    const skillsArr = state.skills.split(',').map((s) => s.trim()).filter(Boolean);
    const certsArr = state.certifications.split('\n').map((s) => s.trim()).filter(Boolean);

    el.innerHTML = `
      <div class="p-name">${esc(p.fullName) || 'Your Name'}</div>
      <div class="p-title">${esc(p.headline) || 'Professional Title'}</div>
      <div class="p-contact">${[p.email, p.phone, p.location, p.link].filter(Boolean).map(esc).join('  ·  ') || 'email · phone · location'}</div>

      ${state.summary ? `<div class="p-section"><div class="p-heading">Summary</div><div>${esc(state.summary)}</div></div>` : ''}

      <div class="p-section">
        <div class="p-heading">Experience</div>
        ${state.experience.length ? state.experience.map((e) => `
          <div class="p-entry">
            <div class="p-entry-head"><span>${esc(e.role) || 'Role'} · ${esc(e.company) || 'Company'}</span><span>${esc(e.start)} – ${esc(e.end)}</span></div>
            ${e.bullets ? `<ul>${e.bullets.split('\n').filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
          </div>`).join('') : '<div class="p-empty">No experience added yet</div>'}
      </div>

      <div class="p-section">
        <div class="p-heading">Education</div>
        ${state.education.length ? state.education.map((e) => `
          <div class="p-entry">
            <div class="p-entry-head"><span>${esc(e.degree) || 'Degree'}</span><span>${esc(e.start)} – ${esc(e.end)}</span></div>
            <div class="p-entry-sub">${esc(e.school)}</div>
          </div>`).join('') : '<div class="p-empty">No education added yet</div>'}
      </div>

      ${state.projects.length ? `<div class="p-section"><div class="p-heading">Projects</div>${state.projects.map((pr) => `
          <div class="p-entry"><div class="p-entry-head">${esc(pr.name)}</div><div>${esc(pr.description)}</div></div>`).join('')}</div>` : ''}

      ${skillsArr.length ? `<div class="p-section"><div class="p-heading">Skills</div><div>${skillsArr.map(esc).join(' · ')}</div></div>` : ''}

      ${certsArr.length ? `<div class="p-section"><div class="p-heading">Certifications</div><ul>${certsArr.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}

      ${state.languages && state.languages.length ? `<div class="p-section"><div class="p-heading">Languages</div><div>${state.languages.map(l => `<span style="margin-right:16px"><strong>${esc(l.language)}</strong> — ${esc(l.proficiency)}</span>`).join('')}</div></div>` : ''}

      ${state.volunteer && state.volunteer.length ? `<div class="p-section"><div class="p-heading">Volunteer Work</div>${state.volunteer.map(v => `
          <div class="p-entry"><div class="p-entry-head"><span>${esc(v.role)} · ${esc(v.organization)}</span><span>${esc(v.period)}</span></div>${v.description ? `<div>${esc(v.description)}</div>` : ''}</div>`).join('')}</div>` : ''}

      ${state.awards && state.awards.length ? `<div class="p-section"><div class="p-heading">Awards &amp; Honours</div><ul>${state.awards.map(a => `<li><strong>${esc(a.title)}</strong>${a.issuer ? ` — ${esc(a.issuer)}` : ''}${a.year ? `, ${esc(a.year)}` : ''}</li>`).join('')}</ul></div>` : ''}

      ${state.publications && state.publications.length ? `<div class="p-section"><div class="p-heading">Publications</div><ul>${state.publications.map(p => `<li><em>${esc(p.title)}</em>${p.journal ? `, ${esc(p.journal)}` : ''}${p.year ? ` (${esc(p.year)})` : ''}${p.url ? ` <a href="${esc(p.url)}" style="color:var(--signal-600)">[link]</a>` : ''}</li>`).join('')}</ul></div>` : ''}
    `;
  }

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  /* ---------------------------------------------------------------------
     Autosave
  --------------------------------------------------------------------- */
  function scheduleSave() {
    const indicator = document.getElementById('saveIndicator');
    indicator.innerHTML = '<span class="dot" style="background:var(--score-low)"></span> Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveResume, 1200);
  }

  let currentResumeId = resumeId || null;

  async function saveResume() {
    const indicator = document.getElementById('saveIndicator');
    const title = document.getElementById('resumeTitle').value || 'Untitled Resume';
    const payload = { title, content: state };

    try {
      if (currentResumeId) {
        await ApiService.resumes.update(currentResumeId, payload);
      } else {
        const resume = await ApiService.resumes.create(payload);
        currentResumeId = resume.id;
        window.history.replaceState({}, '', `resume-builder?id=${resume.id}`);
      }
      indicator.innerHTML = '<span class="dot"></span> All changes saved';
    } catch (err) {
      indicator.innerHTML = `<span class="dot" style="background:#D64545"></span> Save failed — backend offline?`;
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
      document.getElementById('f_summary').value = state.summary || '';
      document.getElementById('f_skills').value = state.skills || '';
      document.getElementById('f_certs').value = state.certifications || '';

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
    document.getElementById('resumeTitle').addEventListener('input', scheduleSave);

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

    document.getElementById('btnHistory').addEventListener('click', () => {
      alert('Version history is available once this resume has been saved with the backend connected.');
    });
  }
})();
