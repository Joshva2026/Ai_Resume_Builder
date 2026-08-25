/**
 * RESUME PREVIEW PAGE SCRIPT
 * Loads a resume from the database and renders a full-page A4 print layout.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const resumeId = params.get('id');

  if (!resumeId) {
    if (typeof window.showToast === 'function') window.showToast('No resume specified for preview.', 'warning');
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
  if (!el) return;
  const st = state.styling || { template: 'classic-ats', font: 'sans', spacing: 1.4 };

  if (typeof TemplateRenderer !== 'undefined') {
    const result = TemplateRenderer.generateResumeHtml(state, st.template);
    
    if (!result.styling.lineSpacing) result.styling.lineSpacing = st.spacing || 1.4;
    
    el.innerHTML = result.html;
    el.className = `paper template-${result.styling.template}`;
    
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
