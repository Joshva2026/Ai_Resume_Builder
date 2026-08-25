
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBullets(text) {
  if (!text) return '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  return \`<ul class="cv-list">\${lines.map(l => \`<li>\${escapeHtml(l)}</li>\`).join('')}</ul>\`;
}

function parseList(text, isArray = false) {
  if (isArray && Array.isArray(text)) return text;
  if (!text) return [];
  if (text.includes('\n')) return text.split('\n').map(l => l.trim()).filter(Boolean);
  return text.split(',').map(l => l.trim()).filter(Boolean);
}

function generateResumeHtml(resumeContent, theme = 'classic-ats') {
  const state = typeof resumeContent === 'object' && resumeContent !== null ? resumeContent : {};
  const p = state.personal || {};
  
  // Default styling matching frontend defaults
  const st = state.styling || { 
    template: theme || 'classic-ats', 
    font: "'Inter', sans-serif", 
    fontSize: 10, 
    headingSize: 14, 
    subheadingSize: 11, 
    lineSpacing: 1.5, 
    sectionSpacing: 12, 
    pSpacing: 6, 
    marginSize: 20 
  };
  
  // Clean up font URL injection
  let fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap';
  if (st.font && st.font.includes("'")) {
    const cleanFontName = st.font.split("'")[1];
    if (cleanFontName !== 'Arial' && cleanFontName !== 'Helvetica' && cleanFontName !== 'Times New Roman' && cleanFontName !== 'Georgia') {
      fontUrl = \`https://fonts.googleapis.com/css2?family=\${cleanFontName.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap\`;
    }
  }

  const sections = {
    summary: () => {
      if (!state.summary) return '';
      return \`<div class="cv-section"><div class="cv-section-title">Professional Summary</div><div class="cv-item-desc">\${escapeHtml(state.summary)}</div></div>\`;
    },
    experience: () => {
      const arr = Array.isArray(state.experience) ? state.experience : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`
        <div class="cv-item">
          <div class="cv-item-header">
            <div class="cv-item-title">\${escapeHtml(e.title || e.role)}</div>
            <div class="cv-item-meta">\${escapeHtml(e.startDate || e.start)} - \${escapeHtml(e.endDate || e.end)}</div>
          </div>
          <div class="cv-item-subtitle">\${escapeHtml(e.company)}\${e.location ? \` | \${escapeHtml(e.location)}\` : ''}</div>
          <div class="cv-item-desc">\${renderBullets(e.description)}</div>
        </div>
      \`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Experience</div>\${items}</div>\`;
    },
    education: () => {
      const arr = Array.isArray(state.education) ? state.education : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`
        <div class="cv-item">
          <div class="cv-item-header">
            <div class="cv-item-title">\${escapeHtml(e.degree)}</div>
            <div class="cv-item-meta">\${escapeHtml(e.graduationDate || e.year || e.end)}</div>
          </div>
          <div class="cv-item-subtitle">\${escapeHtml(e.school || e.institution)}\${e.location ? \` | \${escapeHtml(e.location)}\` : ''}</div>
        </div>
      \`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Education</div>\${items}</div>\`;
    },
    projects: () => {
      const arr = Array.isArray(state.projects) ? state.projects : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`
        <div class="cv-item">
          <div class="cv-item-header">
            <div class="cv-item-title">\${escapeHtml(e.name || e.title)}</div>
            <div class="cv-item-meta">\${escapeHtml(e.date)}</div>
          </div>
          \${e.link ? \`<div class="cv-item-subtitle">\${escapeHtml(e.link)}</div>\` : ''}
          <div class="cv-item-desc">\${renderBullets(e.description)}</div>
        </div>
      \`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Projects</div>\${items}</div>\`;
    },
    skills: () => {
      const skillsArr = parseList(state.skills, true);
      if (skillsArr.length === 0) return '';
      const items = skillsArr.map(s => \`<span class="cv-skill-tag">\${escapeHtml(s)}</span>\`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Skills</div><div class="cv-skills-list">\${items}</div></div>\`;
    },
    certifications: () => {
      const certsArr = parseList(state.certifications, true);
      if (certsArr.length === 0) return '';
      const items = certsArr.map(s => \`<li>\${escapeHtml(s)}</li>\`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Certifications</div><ul class="cv-list">\${items}</ul></div>\`;
    },
    languages: () => {
      const arr = Array.isArray(state.languages) ? state.languages : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">\${escapeHtml(e.language)}</div><div class="cv-item-meta">\${escapeHtml(e.proficiency)}</div></div></div>\`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Languages</div>\${items}</div>\`;
    },
    volunteer: () => {
      const arr = Array.isArray(state.volunteer) ? state.volunteer : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">\${escapeHtml(e.role)}</div><div class="cv-item-meta">\${escapeHtml(e.date)}</div></div><div class="cv-item-subtitle">\${escapeHtml(e.organization)}</div><div class="cv-item-desc">\${renderBullets(e.description)}</div></div>\`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Volunteer Work</div>\${items}</div>\`;
    },
    awards: () => {
      const arr = Array.isArray(state.awards) ? state.awards : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">\${escapeHtml(e.title)}</div><div class="cv-item-meta">\${escapeHtml(e.date)}</div></div><div class="cv-item-subtitle">\${escapeHtml(e.issuer)}</div></div>\`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Awards & Honors</div>\${items}</div>\`;
    },
    publications: () => {
      const arr = Array.isArray(state.publications) ? state.publications : [];
      if (arr.length === 0) return '';
      const items = arr.map(e => \`<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">\${escapeHtml(e.title)}</div><div class="cv-item-meta">\${escapeHtml(e.date)}</div></div><div class="cv-item-subtitle">\${escapeHtml(e.publisher)}\${e.link ? \` | \${escapeHtml(e.link)}\` : ''}</div></div>\`).join('');
      return \`<div class="cv-section"><div class="cv-section-title">Publications</div>\${items}</div>\`;
    }
  };

  let contactHtml = '';
  if (p.email) contactHtml += \`<span>\${escapeHtml(p.email)}</span>\`;
  if (p.phone) contactHtml += \`<span>\${escapeHtml(p.phone)}</span>\`;
  if (p.location) contactHtml += \`<span>\${escapeHtml(p.location)}</span>\`;
  if (p.link) contactHtml += \`<span>\${escapeHtml(p.link)}</span>\`;
  if (p.github) contactHtml += \`<span>\${escapeHtml(p.github)}</span>\`;

  let mainContentHtml = '';
  const order = Array.isArray(state.sectionOrder) && state.sectionOrder.length > 0 ? state.sectionOrder : ['summary', 'experience', 'education', 'projects', 'skills'];
  
  order.forEach(secName => {
    if (secName === 'personal' || secName === 'type') return;
    if (sections[secName]) mainContentHtml += sections[secName]();
  });

  const isSideBarLayout = ['modern-professional', 'contemporary'].includes(st.template);
  
  let paperInnerHtml = '';
  if (isSideBarLayout) {
    paperInnerHtml = \`
      <div class="cv-header">
        <div class="cv-name">\${escapeHtml(p.fullName || 'Full Name')}</div>
        \${p.headline ? \`<div class="cv-headline">\${escapeHtml(p.headline)}</div>\` : ''}
        <div class="cv-contact">\${contactHtml}</div>
      </div>
      <div class="cv-layout">
        <div class="cv-main">\${mainContentHtml}</div>
        <div class="cv-sidebar">
           \${sections.skills()}
           \${sections.languages()}
           \${sections.certifications()}
        </div>
      </div>
    \`;
  } else {
    paperInnerHtml = \`
      <div class="cv-header">
        <div class="cv-name">\${escapeHtml(p.fullName || 'Full Name')}</div>
        \${p.headline ? \`<div class="cv-headline">\${escapeHtml(p.headline)}</div>\` : ''}
        <div class="cv-contact">\${contactHtml}</div>
      </div>
      <div class="cv-body">\${mainContentHtml}</div>
    \`;
  }

  // Calculate CSS Variables
  const cssVars = \`
    --cv-font: \${st.font};
    --cv-font-size: \${st.fontSize}pt;
    --cv-h1-size: \${st.headingSize + 8}pt;
    --cv-h2-size: \${st.headingSize}pt;
    --cv-h3-size: \${st.subheadingSize}pt;
    --cv-line-height: \${st.lineSpacing};
    --cv-margin: \${st.marginSize}mm;
    --cv-section-spacing: \${st.sectionSpacing}pt;
    --cv-p-spacing: \${st.pSpacing}pt;
  \`;

  return \`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>\${escapeHtml(p.fullName || 'Resume')}</title>
<style>
  @import url('\${fontUrl}');
  
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  
  * { box-sizing: border-box; }
  
  @page {
    size: A4;
    margin: 0;
  }
  
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  .paper {
    \${cssVars}
    color: #000000;
  }

  \${"/* Strict A4 Form Factor */\n.paper {\n  background: #ffffff;\n  width: 210mm; /* A4 Width */\n  min-height: 297mm; /* A4 Height */\n  box-shadow: 0 4px 12px rgba(0,0,0,0.2);\n  position: relative;\n  \n  /* Strictly Grayscale */\n  color: #000000;\n  \n  /* CV System Variables populated dynamically by JS */\n  --cv-font: 'Inter', sans-serif;\n  --cv-font-size: 10pt;\n  --cv-h1-size: 24pt;\n  --cv-h2-size: 14pt;\n  --cv-h3-size: 11pt;\n  --cv-line-height: 1.5;\n  --cv-margin: 20mm;\n  --cv-section-spacing: 12pt;\n  --cv-p-spacing: 6pt;\n  --cv-letter-spacing: 0px;\n  \n  font-family: var(--cv-font);\n  font-size: var(--cv-font-size);\n  line-height: var(--cv-line-height);\n  padding: var(--cv-margin);\n  \n  /* Block colorful text */\n  * { color: #111111; }\n}\n\n.paper h1, .paper h2, .paper h3, .paper h4 {\n  color: #000000;\n  letter-spacing: var(--cv-letter-spacing);\n  margin: 0;\n  font-weight: 700;\n}\n\n/* Shared structural elements */\n.cv-header { margin-bottom: var(--cv-section-spacing); }\n.cv-name { font-size: var(--cv-h1-size); line-height: 1.1; margin-bottom: 4px; }\n.cv-headline { font-size: calc(var(--cv-font-size) + 2pt); font-weight: 500; margin-bottom: 8px; }\n.cv-contact { font-size: calc(var(--cv-font-size) - 1pt); display: flex; flex-wrap: wrap; gap: 12px; }\n\n.cv-section { margin-bottom: var(--cv-section-spacing); }\n.cv-section-title { \n  font-size: var(--cv-h2-size); \n  text-transform: uppercase; \n  border-bottom: 1px solid #000000; \n  padding-bottom: 4px; \n  margin-bottom: var(--cv-p-spacing); \n}\n.cv-item { margin-bottom: var(--cv-p-spacing); }\n.cv-item-header { display: flex; justify-content: space-between; align-items: baseline; }\n.cv-item-title { font-size: var(--cv-h3-size); font-weight: bold; }\n.cv-item-meta { font-size: calc(var(--cv-font-size) - 1pt); }\n.cv-item-subtitle { font-style: italic; font-weight: 500; margin-bottom: 4px; }\n.cv-item-desc ul { margin: 4px 0 0 0; padding-left: 20px; }\n.cv-item-desc li { margin-bottom: 2px; }\n\n.cv-skills-list { display: flex; flex-wrap: wrap; gap: 6px; }\n.cv-skill-tag { \n  font-size: calc(var(--cv-font-size) - 1pt); \n  font-weight: 500;\n}\n\n/* ==========================================================================\n   20 TEMPLATE STRUCTURAL VARIATIONS (Grayscale Only)\n   ========================================================================== */\n\n/* 1. Classic ATS (Standard block layout) */\n.template-classic-ats .cv-header { text-align: center; }\n.template-classic-ats .cv-contact { justify-content: center; }\n.template-classic-ats .cv-skill-tag { display: inline; }\n.template-classic-ats .cv-skill-tag::after { content: \", \"; }\n.template-classic-ats .cv-skill-tag:last-child::after { content: \"\"; }\n\n/* 2. Minimal ATS (Very clean, no borders, left aligned) */\n.template-minimal-ats .cv-header { text-align: left; }\n.template-minimal-ats .cv-section-title { border-bottom: none; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }\n.template-minimal-ats .cv-skill-tag { display: inline; }\n.template-minimal-ats .cv-skill-tag::after { content: \" • \"; color: #999; }\n.template-minimal-ats .cv-skill-tag:last-child::after { content: \"\"; }\n\n/* 3. Corporate ATS (Heavy lines, structured) */\n.template-corporate-ats .cv-header { border-bottom: 2px solid #000; padding-bottom: var(--cv-p-spacing); }\n.template-corporate-ats .cv-section-title { border-bottom: 2px solid #000; }\n.template-corporate-ats .cv-skill-tag { border: 1px solid #000; padding: 2px 6px; border-radius: 4px; }\n\n/* 4. Clean ATS (Spacious, light lines) */\n.template-clean-ats .cv-section-title { border-bottom: 1px solid #ccc; text-transform: none; font-weight: 600; }\n.template-clean-ats .cv-contact { flex-direction: column; gap: 2px; }\n\n/* 5. Professional ATS (Centered header, standard body) */\n.template-professional-ats .cv-header { text-align: center; margin-bottom: calc(var(--cv-section-spacing) * 1.5); }\n.template-professional-ats .cv-contact { justify-content: center; }\n.template-professional-ats .cv-section-title { text-align: center; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 4px 0; }\n\n/* 6. Modern Professional (Left sidebar for skills/contact) */\n.template-modern-professional .cv-layout { display: flex; gap: var(--cv-margin); }\n.template-modern-professional .cv-main { flex: 2; }\n.template-modern-professional .cv-sidebar { flex: 1; border-left: 1px solid #ddd; padding-left: var(--cv-margin); }\n.template-modern-professional .cv-header { border-bottom: 1px solid #000; padding-bottom: 8px; }\n\n/* 7. Modern Minimal (Grid-based header) */\n.template-modern-minimal .cv-header { display: grid; grid-template-columns: 1fr 1fr; align-items: end; border-bottom: 1px solid #000; padding-bottom: 12px; }\n.template-modern-minimal .cv-contact { flex-direction: column; align-items: flex-end; gap: 4px; }\n.template-modern-minimal .cv-section-title { font-size: var(--cv-h3-size); border-bottom: none; }\n\n/* 8. Contemporary (Right sidebar layout) */\n.template-contemporary .cv-layout { display: flex; flex-direction: row-reverse; gap: var(--cv-margin); }\n.template-contemporary .cv-main { flex: 2; }\n.template-contemporary .cv-sidebar { flex: 1; border-right: 1px solid #000; padding-right: var(--cv-margin); }\n\n/* 9. Clean Modern (Compact header, inline skills) */\n.template-clean-modern .cv-header { text-align: right; }\n.template-clean-modern .cv-contact { justify-content: flex-end; }\n.template-clean-modern .cv-section-title { padding-left: 8px; border-left: 4px solid #000; border-bottom: none; }\n\n/* 10. Technical (Monospace elements) */\n.template-technical .cv-section-title { font-family: 'IBM Plex Mono', monospace; font-size: calc(var(--cv-h2-size) - 2pt); background: #f0f0f0; padding: 4px 8px; border: none; }\n.template-technical .cv-skill-tag { font-family: 'IBM Plex Mono', monospace; background: #eee; padding: 2px 6px; }\n\n/* 11. Software Engineer (Code-like brackets for titles) */\n.template-software-engineer .cv-section-title::before { content: \"{ \"; color: #666; }\n.template-software-engineer .cv-section-title::after { content: \" }\"; color: #666; }\n.template-software-engineer .cv-section-title { border-bottom: none; }\n\n/* 12. Developer (Compact tech layout) */\n.template-developer .cv-item-header { flex-direction: column; align-items: flex-start; }\n.template-developer .cv-item-meta { font-family: 'IBM Plex Mono', monospace; color: #555; margin-bottom: 4px; }\n\n/* 13. Data/Analytics (Table-like grid structure for skills) */\n.template-data-analytics .cv-skills-list { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }\n.template-data-analytics .cv-section-title { border-bottom: 2px solid #333; }\n\n/* 14. Engineering (Strict block layout) */\n.template-engineering .cv-header { border: 1px solid #000; padding: 12px; text-align: center; }\n.template-engineering .cv-section-title { background: #000; color: #fff; padding: 4px 8px; }\n\n/* 15. Fresher (Focus on education) */\n.template-fresher .cv-section-title { text-transform: capitalize; border-bottom: 1px dashed #ccc; }\n.template-fresher .cv-header { text-align: center; margin-bottom: 24px; }\n\n/* 16. Graduate (Academic style) */\n.template-graduate .cv-name { text-align: center; font-variant: small-caps; }\n.template-graduate .cv-contact { justify-content: center; }\n.template-graduate .cv-section-title { text-align: center; border-bottom: 1px solid #000; border-top: 1px solid #000; }\n\n/* 17. Student Professional (Compact clean) */\n.template-student-professional .cv-item-meta { display: block; width: 100%; text-align: right; }\n.template-student-professional .cv-section-title { border-bottom: 2px solid #ccc; }\n\n/* 18. Executive (Heavy serif, conservative) */\n.template-executive .cv-name { font-family: 'Times New Roman', serif; font-size: calc(var(--cv-h1-size) + 4pt); text-align: center; }\n.template-executive .cv-section-title { font-family: 'Times New Roman', serif; border-bottom: 1px solid #000; text-align: center; }\n\n/* 19. Senior Professional (Two column top header) */\n.template-senior-professional .cv-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; }\n.template-senior-professional .cv-contact { flex-direction: column; align-items: flex-end; }\n\n/* 20. Leadership (Bold, authoritative) */\n.template-leadership .cv-name { text-transform: uppercase; letter-spacing: 2px; }\n.template-leadership .cv-section-title { background: #333; color: #fff; padding: 4px 8px; }\n.template-leadership .cv-skill-tag { border-bottom: 1px solid #333; }\n"}
</style>
</head>
<body>
  <div class="paper template-\${st.template}">
    \${paperInnerHtml}
  </div>
</body>
</html>\`;
}

module.exports = { generateResumeHtml };
