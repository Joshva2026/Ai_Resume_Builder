/**
 * RESUME PREVIEW PAGE SCRIPT
 * Loads a resume from the database and renders a full-page A4 print layout.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const resumeId = params.get('id');

  if (!resumeId) {
    alert('No resume specified for preview.');
    window.location.href = 'dashboard.html';
    return;
  }

  const paper = document.getElementById('previewPaper');
  const titleEl = document.getElementById('previewResumeTitle');
  const btnPrint = document.getElementById('btnPrintResume');
  const btnBack = document.getElementById('btnBackToBuilder');

  // Back button binding
  btnBack.addEventListener('click', () => {
    window.location.href = `resume-builder.html?id=${resumeId}`;
  });

  // Print button binding
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  try {
    const resume = await ApiService.resumes.get(resumeId);
    titleEl.textContent = resume.title || 'Untitled Resume';

    const state = resume.content || {};
    state.personal = state.personal || {};
    state.styling = state.styling || {};
    state.experience = state.experience || [];
    state.education = state.education || [];
    state.projects = state.projects || [];
    state.languages = state.languages || [];
    state.volunteer = state.volunteer || [];
    state.awards = state.awards || [];
    state.publications = state.publications || [];
    state.skills = state.skills || '';
    state.certifications = state.certifications || '';

    renderPreview(state, paper);
  } catch (err) {
    console.error('Error loading resume preview:', err);
    paper.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h4>Failed to load preview</h4>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn btn-primary" onclick="window.location.reload()"><i class="fa-solid fa-arrows-rotate"></i> Retry</button>
      </div>`;
  }
});

function renderPreview(state, el) {
  const p = state.personal;
  const st = state.styling || {};
  st.template = st.template || 'modern';
  st.font = st.font || 'sans';
  st.spacing = st.spacing || '1.4';
  st.accent = st.accent || '#2563EB';

  // Apply fonts
  if (st.font === 'serif') {
    el.style.fontFamily = 'Georgia, serif';
  } else if (st.font === 'mono') {
    el.style.fontFamily = "'IBM Plex Mono', monospace";
  } else {
    el.style.fontFamily = "'Inter', sans-serif";
  }

  // Apply spacing
  el.style.lineHeight = st.spacing;
  el.style.color = '#1e293b';

  const skillsArr = state.skills.split(',').map((s) => s.trim()).filter(Boolean);
  const certsArr = state.certifications.split('\n').map((s) => s.trim()).filter(Boolean);

  function headingHtml(text) {
    if (st.template === 'executive') {
      return `<div class="p-heading" style="text-align: center; border-bottom: 2px double ${st.accent}; color: ${st.accent}; text-transform: uppercase; font-weight: 700; margin-top: 16px; margin-bottom: 8px; font-size: 12px">${escapeHtml(text)}</div>`;
    } else if (st.template === 'minimal') {
      return `<div class="p-heading" style="border: none; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-top: 14px; margin-bottom: 4px; font-size: 10px">${escapeHtml(text)}</div>`;
    } else if (st.template === 'academic') {
      return `<div class="p-heading" style="border-bottom: 1px solid #1e293b; color: #0f172a; font-weight: 700; margin-top: 12px; margin-bottom: 6px; font-size: 11px">${escapeHtml(text)}</div>`;
    } else { // modern
      return `<div class="p-heading" style="border-bottom: 1px solid ${st.accent}; color: ${st.accent}; font-weight: 700; margin-top: 16px; margin-bottom: 8px; font-size: 12px">${escapeHtml(text)}</div>`;
    }
  }

  let headerHtml = '';
  if (st.template === 'executive') {
    headerHtml = `
      <div style="text-align: center; margin-bottom: 16px">
        <div class="p-name" style="font-size: 22px; font-weight: 800; color: #0f172a">${escapeHtml(p.fullName) || 'Your Name'}</div>
        <div class="p-title" style="font-style: italic; color: #475569; font-size: 12px; margin-top: 4px">${escapeHtml(p.headline) || 'Professional Title'}</div>
        <div class="p-contact" style="font-size: 10px; color: #475569; margin-top: 6px; display: flex; justify-content: center; gap: 10px">${[p.email, p.phone, p.location, p.link].filter(Boolean).map(escapeHtml).join('  |  ') || 'email | phone | location'}</div>
      </div>
    `;
  } else {
    headerHtml = `
      <div class="p-name" style="font-size: 20px; font-weight: 800; color: ${st.template === 'modern' ? st.accent : '#0f172a'}">${escapeHtml(p.fullName) || 'Your Name'}</div>
      <div class="p-title" style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px;">${escapeHtml(p.headline) || 'Professional Title'}</div>
      <div class="p-contact" style="font-size: 9.5px; color: #475569; margin-top: 6px; margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">${[p.email, p.phone, p.location, p.link].filter(Boolean).map(escapeHtml).join('  ·  ') || 'email · phone · location'}</div>
    `;
  }

  el.innerHTML = `
    ${headerHtml}

    ${state.summary ? `${headingHtml('Summary')}<div>${escapeHtml(state.summary)}</div>` : ''}

    <div class="p-section">
      ${headingHtml('Experience')}
      ${state.experience.length ? state.experience.map((e) => `
        <div class="p-entry" style="margin-bottom: 10px">
          <div class="p-entry-head" style="display:flex; justify-content:space-between; font-weight: 700; color: #0f172a"><span>${escapeHtml(e.role) || 'Role'} · ${escapeHtml(e.company) || 'Company'}</span><span style="font-weight: 500">${escapeHtml(e.start)} – ${escapeHtml(e.end)}</span></div>
          ${e.bullets ? `<ul style="margin: 4px 0 0 16px; padding: 0">${e.bullets.split('\n').filter(Boolean).map((b) => `<li style="list-style-type: disc">${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
        </div>`).join('') : '<div class="p-empty">No work experience listed</div>'}
    </div>

    <div class="p-section">
      ${headingHtml('Education')}
      ${state.education.length ? state.education.map((e) => `
        <div class="p-entry" style="margin-bottom: 10px">
          <div class="p-entry-head" style="display:flex; justify-content:space-between; font-weight: 700; color: #0f172a"><span>${escapeHtml(e.degree) || 'Degree'}</span><span style="font-weight: 500">${escapeHtml(e.start)} – ${escapeHtml(e.end)}</span></div>
          <div class="p-entry-sub" style="color: #475569">${escapeHtml(e.school)}</div>
        </div>`).join('') : '<div class="p-empty">No education listed</div>'}
    </div>

    ${state.projects.length ? `<div class="p-section">${headingHtml('Projects')}${state.projects.map((pr) => `
        <div class="p-entry" style="margin-bottom: 8px"><div class="p-entry-head" style="font-weight: 700; color: #0f172a">${escapeHtml(pr.name)}</div><div>${escapeHtml(pr.description)}</div></div>`).join('')}</div>` : ''}

    ${skillsArr.length ? `<div class="p-section">${headingHtml('Skills')}<div>${skillsArr.map(escapeHtml).join(' · ')}</div></div>` : ''}

    ${certsArr.length ? `<div class="p-section">${headingHtml('Certifications')}<ul style="margin: 4px 0 0 16px; padding: 0">${certsArr.map((c) => `<li style="list-style-type: disc">${escapeHtml(c)}</li>`).join('')}</ul></div>` : ''}

    ${state.languages && state.languages.length ? `<div class="p-section">${headingHtml('Languages')}<div>${state.languages.map(l => `<span style="margin-right:16px"><strong>${escapeHtml(l.language)}</strong> — ${escapeHtml(l.proficiency)}</span>`).join('')}</div></div>` : ''}

    ${state.volunteer && state.volunteer.length ? `<div class="p-section">${headingHtml('Volunteer Work')}${state.volunteer.map(v => `
        <div class="p-entry" style="margin-bottom: 8px"><div class="p-entry-head" style="display:flex; justify-content:space-between; font-weight: 700"><span>${escapeHtml(v.role)} · ${escapeHtml(v.organization)}</span><span style="font-weight: 500">${escapeHtml(v.period)}</span></div>${v.description ? `<div>${escapeHtml(v.description)}</div>` : ''}</div>`).join('')}</div>` : ''}

    ${state.awards && state.awards.length ? `<div class="p-section">${headingHtml('Awards & Honours')}<ul style="margin: 4px 0 0 16px; padding: 0">${state.awards.map(a => `<li style="list-style-type: disc"><strong>${escapeHtml(a.title)}</strong>${a.issuer ? ` — ${escapeHtml(a.issuer)}` : ''}${a.year ? `, ${escapeHtml(a.year)}` : ''}</li>`).join('')}</ul></div>` : ''}

    ${state.publications && state.publications.length ? `<div class="p-section">${headingHtml('Publications')}<ul style="margin: 4px 0 0 16px; padding: 0">${state.publications.map(p => `<li style="list-style-type: disc"><em>${escapeHtml(p.title)}</em>${p.journal ? `, ${escapeHtml(p.journal)}` : ''}${p.year ? ` (${escapeHtml(p.year)})` : ''}${p.url ? ` <a href="${escapeHtml(p.url)}" style="color:var(--primary)">[link]</a>` : ''}</li>`).join('')}</ul></div>` : ''}
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
