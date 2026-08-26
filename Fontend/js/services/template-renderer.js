/**
 * RESUME TEMPLATE RENDERER
 * Shared template definitions and HTML generation logic matching the backend PDF generator.
 */

const TemplateRenderer = (() => {
  const templatesList = [
    // Classic ATS
    { id: 'classic-ats',              name: 'Classic ATS',              description: 'Standard block layout, strictly parsed.',                     category: 'Classic ATS' },
    { id: 'minimal-ats',              name: 'Minimal ATS',              description: 'Very clean, no borders, left-aligned standard layout.',         category: 'Classic ATS' },
    { id: 'corporate-ats',            name: 'Corporate ATS',            description: 'Heavy lines and clearly defined structured headers.',           category: 'Classic ATS' },
    { id: 'clean-ats',                name: 'Clean ATS',                description: 'Spacious, light lines, and ATS parsed safely.',                 category: 'Classic ATS' },
    { id: 'professional-ats',         name: 'Professional ATS',         description: 'Centered header with standard structured body.',                category: 'Classic ATS' },
    { id: 'professional-ats-compact', name: 'Professional ATS Compact', description: 'Compact single-page ATS layout with skill categories & coursework.', category: 'Classic ATS' },
    // Modern
    { id: 'modern-professional', name: 'Modern Professional', description: 'Left sidebar for skills/contact with clean right body.', category: 'Modern' },
    { id: 'modern-minimal',      name: 'Modern Minimal',      description: 'Grid-based header with minimal structured body.',      category: 'Modern' },
    { id: 'contemporary',        name: 'Contemporary',        description: 'Right sidebar layout for a fresh look.',               category: 'Modern' },
    { id: 'clean-modern',        name: 'Clean Modern',        description: 'Compact right-aligned header with inline skills.',     category: 'Modern' },
    // Technical
    { id: 'technical',          name: 'Technical',          description: 'Monospace elements optimized for tech roles.',              category: 'Technical' },
    { id: 'software-engineer',  name: 'Software Engineer',  description: 'Code-like brackets and clean developer layout.',           category: 'Technical' },
    { id: 'developer',          name: 'Developer',          description: 'Compact layout optimized for long tech stacks.',           category: 'Technical' },
    { id: 'data-analytics',     name: 'Data/Analytics',     description: 'Table-like grid structure for analytical skills.',         category: 'Technical' },
    { id: 'engineering',        name: 'Engineering',        description: 'Strict block layout for traditional engineering.',          category: 'Technical' },
    // Fresher / Student
    { id: 'fresher',             name: 'Fresher',             description: 'Focus on education and academic projects.', category: 'Fresher' },
    { id: 'graduate',            name: 'Graduate',            description: 'Academic style for recent grads.',           category: 'Fresher' },
    { id: 'student-professional',name: 'Student Professional',description: 'Compact clean layout bridging school to work.', category: 'Fresher' },
    // Executive
    { id: 'executive',          name: 'Executive',          description: 'Heavy serif, conservative classic layout.',              category: 'Executive' },
    { id: 'senior-professional',name: 'Senior Professional',description: 'Two column top header for dense experience.',            category: 'Executive' },
    { id: 'leadership',         name: 'Leadership',         description: 'Bold, authoritative layout for management.',             category: 'Executive' }
  ];

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
    return `<ul class="cv-list">${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
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

    const sections = {
      summary: () => {
        if (!state.summary || !state.summary.trim()) return '';
        return `<div class="cv-section"><div class="cv-section-title">Professional Summary</div><div class="cv-item-desc">${escapeHtml(state.summary)}</div></div>`;
      },
      experience: () => {
        const arr = (Array.isArray(state.experience) ? state.experience : [])
          .filter(e => (e.company && e.company.trim()) || (e.role && e.role.trim()) || (e.bullets && e.bullets.trim()) || (e.description && e.description.trim()));
        if (arr.length === 0) return '';
        const items = arr.map(e => `
          <div class="cv-item">
            <div class="cv-item-header">
              <div class="cv-item-title">${escapeHtml(e.title || e.role)}</div>
              <div class="cv-item-meta">${escapeHtml(e.startDate || e.start)} - ${escapeHtml(e.endDate || e.end)}</div>
            </div>
            <div class="cv-item-subtitle">${escapeHtml(e.company)}${e.location ? ` | ${escapeHtml(e.location)}` : ''}</div>
            <div class="cv-item-desc">${renderBullets(e.description || e.bullets)}</div>
          </div>
        `).join('');
        return `<div class="cv-section"><div class="cv-section-title">Experience</div>${items}</div>`;
      },
      education: () => {
        const arr = (Array.isArray(state.education) ? state.education : [])
          .filter(e => (e.school && e.school.trim()) || (e.degree && e.degree.trim()) || (e.institution && e.institution.trim()));
        if (arr.length === 0) return '';
        const items = arr.map(e => `
          <div class="cv-item">
            <div class="cv-item-header">
              <div class="cv-item-title">${escapeHtml(e.degree)}</div>
              <div class="cv-item-meta">${escapeHtml(e.graduationDate || e.year || e.end)}</div>
            </div>
            <div class="cv-item-subtitle">${escapeHtml(e.school || e.institution)}${e.location ? ` | ${escapeHtml(e.location)}` : ''}</div>
          </div>
        `).join('');
        return `<div class="cv-section"><div class="cv-section-title">Education</div>${items}</div>`;
      },
      projects: () => {
        const arr = (Array.isArray(state.projects) ? state.projects : [])
          .filter(e => (e.name && e.name.trim()) || (e.description && e.description.trim()) || (e.title && e.title.trim()));
        if (arr.length === 0) return '';
        const items = arr.map(e => `
          <div class="cv-item">
            <div class="cv-item-header">
              <div class="cv-item-title">${escapeHtml(e.name || e.title)}</div>
              <div class="cv-item-meta">${escapeHtml(e.date)}</div>
            </div>
            ${e.link ? `<div class="cv-item-subtitle">${escapeHtml(e.link)}</div>` : ''}
            <div class="cv-item-desc">${renderBullets(e.description)}</div>
          </div>
        `).join('');
        return `<div class="cv-section"><div class="cv-section-title">Projects</div>${items}</div>`;
      },
      skills: () => {
        const skillsArr = parseList(state.skills, true).map(s => s.trim()).filter(Boolean);
        if (skillsArr.length === 0) return '';
        const items = skillsArr.map(s => `<span class="cv-skill-tag">${escapeHtml(s)}</span>`).join('');
        return `<div class="cv-section"><div class="cv-section-title">Skills</div><div class="cv-skills-list">${items}</div></div>`;
      },
      certifications: () => {
        const certsArr = parseList(state.certifications, true).map(s => s.trim()).filter(Boolean);
        if (certsArr.length === 0) return '';
        const items = certsArr.map(s => `<li>${escapeHtml(s)}</li>`).join('');
        return `<div class="cv-section"><div class="cv-section-title">Certifications</div><ul class="cv-list">${items}</ul></div>`;
      },
      languages: () => {
        const arr = (Array.isArray(state.languages) ? state.languages : [])
          .filter(e => e.language && e.language.trim());
        if (arr.length === 0) return '';
        const items = arr.map(e => `<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">${escapeHtml(e.language)}</div><div class="cv-item-meta">${escapeHtml(e.proficiency)}</div></div></div>`).join('');
        return `<div class="cv-section"><div class="cv-section-title">Languages</div>${items}</div>`;
      },
      volunteer: () => {
        const arr = (Array.isArray(state.volunteer) ? state.volunteer : [])
          .filter(e => (e.organization && e.organization.trim()) || (e.role && e.role.trim()));
        if (arr.length === 0) return '';
        const items = arr.map(e => `<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">${escapeHtml(e.role)}</div><div class="cv-item-meta">${escapeHtml(e.date || e.period)}</div></div><div class="cv-item-subtitle">${escapeHtml(e.organization)}</div><div class="cv-item-desc">${renderBullets(e.description)}</div></div>`).join('');
        return `<div class="cv-section"><div class="cv-section-title">Volunteer Work</div>${items}</div>`;
      },
      awards: () => {
        const arr = (Array.isArray(state.awards) ? state.awards : [])
          .filter(e => (e.title && e.title.trim()) || (e.issuer && e.issuer.trim()));
        if (arr.length === 0) return '';
        const items = arr.map(e => `<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">${escapeHtml(e.title)}</div><div class="cv-item-meta">${escapeHtml(e.date || e.year)}</div></div><div class="cv-item-subtitle">${escapeHtml(e.issuer)}</div></div>`).join('');
        return `<div class="cv-section"><div class="cv-section-title">Awards & Honors</div>${items}</div>`;
      },
      publications: () => {
        const arr = (Array.isArray(state.publications) ? state.publications : [])
          .filter(e => e.title && e.title.trim());
        if (arr.length === 0) return '';
        const items = arr.map(e => `<div class="cv-item"><div class="cv-item-header"><div class="cv-item-title">${escapeHtml(e.title)}</div><div class="cv-item-meta">${escapeHtml(e.date || e.year)}</div></div><div class="cv-item-subtitle">${escapeHtml(e.publisher || e.journal)}${e.url || e.link ? ` | ${escapeHtml(e.url || e.link)}` : ''}</div></div>`).join('');
        return `<div class="cv-section"><div class="cv-section-title">Publications</div>${items}</div>`;
      }
    };

    let contactHtml = '';
    if (p.location)  contactHtml += `<span>${escapeHtml(p.location)}</span>`;
    if (p.phone)     contactHtml += `<span>${escapeHtml(p.phone)}</span>`;
    if (p.email)     contactHtml += `<span>${escapeHtml(p.email)}</span>`;
    if (p.link)      contactHtml += `<span>${escapeHtml(p.link)}</span>`;
    if (p.github)    contactHtml += `<span>${escapeHtml(p.github)}</span>`;
    if (p.portfolio) contactHtml += `<span>${escapeHtml(p.portfolio)}</span>`;

    // ── PROFESSIONAL ATS COMPACT template ────────────────────────────────────
    if (st.template === 'professional-ats-compact') {
      const e = escapeHtml;
      const rb = renderBullets;

      // Header contact row — pipe separated, compact
      const contactParts = [];
      if (p.location)  contactParts.push(e(p.location));
      if (p.phone)     contactParts.push(e(p.phone));
      if (p.email)     contactParts.push(e(p.email));
      if (p.link)      contactParts.push(e(p.link));
      if (p.portfolio) contactParts.push(e(p.portfolio));

      // Profile Summary
      const summaryHtml = state.summary && state.summary.trim() ? `
        <div class="pac-section">
          <div class="pac-section-title">PROFILE SUMMARY</div>
          <div class="pac-section-divider"></div>
          <p class="pac-summary">${e(state.summary)}</p>
        </div>` : '';

      // Relevant Coursework
      const courseworkList = parseList(state.coursework || '', false).filter(Boolean);
      const courseworkHtml = courseworkList.length > 0 ? `
        <div class="pac-section">
          <div class="pac-section-title">RELEVANT COURSEWORK</div>
          <div class="pac-section-divider"></div>
          <div class="pac-coursework">${courseworkList.map(c => `<span class="pac-course">${e(c)}</span>`).join('')}</div>
        </div>` : '';

      // Experience
      const expItems = (Array.isArray(state.experience) ? state.experience : [])
        .filter(ex => (ex.company && ex.company.trim()) || (ex.role && ex.role.trim()));
      const expHtml = expItems.length > 0 ? `
        <div class="pac-section">
          <div class="pac-section-title">EXPERIENCE</div>
          <div class="pac-section-divider"></div>
          ${expItems.map(ex => `
            <div class="pac-item">
              <div class="pac-item-header">
                <span class="pac-item-title">${e(ex.title || ex.role)}</span>
                <span class="pac-item-meta">${[e(ex.company), e(ex.location)].filter(Boolean).join(' | ')} | ${e(ex.start || ex.startDate)} – ${e(ex.end || ex.endDate)}</span>
              </div>
              ${rb(ex.description || ex.bullets)}
            </div>`).join('')}
        </div>` : '';

      // Projects
      const projItems = (Array.isArray(state.projects) ? state.projects : [])
        .filter(pr => pr.name && pr.name.trim());
      const projHtml = projItems.length > 0 ? `
        <div class="pac-section">
          <div class="pac-section-title">PROJECTS</div>
          <div class="pac-section-divider"></div>
          ${projItems.map(pr => {
            const techLine = pr.tech ? `<span class="pac-tech">${e(pr.tech)}</span>` : '';
            const linkLine = pr.link ? ` | <a class="pac-link" href="${e(pr.link)}">${e(pr.link)}</a>` : '';
            const dateLine = pr.date ? `<span class="pac-item-date">${e(pr.date)}</span>` : '';
            return `
              <div class="pac-item">
                <div class="pac-item-header">
                  <span class="pac-item-title">${e(pr.name)}${techLine ? ' — ' : ''}${techLine}${linkLine}</span>
                  ${dateLine}
                </div>
                ${rb(pr.description)}
              </div>`;
          }).join('')}
        </div>` : '';

      // Technical Skills — categories first, then flat skills
      const skillCats = (Array.isArray(state.skillCategories) ? state.skillCategories : [])
        .filter(sc => sc.label && sc.label.trim() && sc.items && sc.items.trim());
      const flatSkills = parseList(state.skills || '', false).filter(Boolean);
      let skillsHtml = '';
      if (skillCats.length > 0 || flatSkills.length > 0) {
        skillsHtml = `
          <div class="pac-section">
            <div class="pac-section-title">TECHNICAL SKILLS</div>
            <div class="pac-section-divider"></div>
            <div class="pac-skills-grid">
              ${skillCats.map(sc => `<div class="pac-skill-row"><span class="pac-skill-cat">${e(sc.label)}:</span> <span class="pac-skill-vals">${e(sc.items)}</span></div>`).join('')}
              ${flatSkills.length > 0 ? `<div class="pac-skill-row"><span class="pac-skill-vals">${flatSkills.map(s => e(s)).join(' · ')}</span></div>` : ''}
            </div>
          </div>`;
      }

      // Education
      const eduItems = (Array.isArray(state.education) ? state.education : [])
        .filter(ed => (ed.school && ed.school.trim()) || (ed.degree && ed.degree.trim()));
      const eduHtml = eduItems.length > 0 ? `
        <div class="pac-section">
          <div class="pac-section-title">EDUCATION</div>
          <div class="pac-section-divider"></div>
          ${eduItems.map(ed => `
            <div class="pac-item">
              <div class="pac-item-header">
                <span class="pac-item-title">${e(ed.degree)}</span>
                <span class="pac-item-meta">${e(ed.school || ed.institution)}${ed.location ? ` | ${e(ed.location)}` : ''} | ${e(ed.start)} – ${e(ed.end)}</span>
              </div>
            </div>`).join('')}
        </div>` : '';

      // Extracurricular & Certifications
      const certList = parseList(state.certifications || '', false).filter(Boolean);
      const certHtml = certList.length > 0 ? `
        <div class="pac-section">
          <div class="pac-section-title">EXTRACURRICULAR &amp; CERTIFICATIONS</div>
          <div class="pac-section-divider"></div>
          <ul class="pac-cert-list">${certList.map(c => `<li>${e(c)}</li>`).join('')}</ul>
        </div>` : '';

      const pacInner = `
        <div class="pac-header">
          <div class="pac-name">${e(p.fullName || 'Full Name')}</div>
          <div class="pac-contact">${contactParts.join(' <span class="pac-sep">|</span> ')}</div>
        </div>
        <div class="pac-body">
          ${summaryHtml}
          ${courseworkHtml}
          ${expHtml}
          ${projHtml}
          ${skillsHtml}
          ${eduHtml}
          ${certHtml}
        </div>
      `;
      return { html: pacInner, styling: { ...st, template: 'professional-ats-compact' } };
    }
    // ── END PROFESSIONAL ATS COMPACT ─────────────────────────────────────────

    let mainContentHtml = '';
    const order = Array.isArray(state.sectionOrder) && state.sectionOrder.length > 0 ? state.sectionOrder : ['summary', 'experience', 'education', 'projects', 'skills'];
    
    order.forEach(secName => {
      if (secName === 'personal' || secName === 'type') return;
      if (sections[secName]) mainContentHtml += sections[secName]();
    });

    const isSideBarLayout = ['modern-professional', 'contemporary'].includes(st.template);
    
    let innerHtml = '';
    if (isSideBarLayout) {
      innerHtml = `
        <div class="cv-header">
          <div class="cv-name">${escapeHtml(p.fullName || 'Full Name')}</div>
          ${p.headline ? `<div class="cv-headline">${escapeHtml(p.headline)}</div>` : ''}
          <div class="cv-contact">${contactHtml}</div>
        </div>
        <div class="cv-layout">
          <div class="cv-main">${mainContentHtml}</div>
          <div class="cv-sidebar">
             ${sections.skills()}
             ${sections.languages()}
             ${sections.certifications()}
          </div>
        </div>
      `;
    } else {
      innerHtml = `
        <div class="cv-header">
          <div class="cv-name">${escapeHtml(p.fullName || 'Full Name')}</div>
          ${p.headline ? `<div class="cv-headline">${escapeHtml(p.headline)}</div>` : ''}
          <div class="cv-contact">${contactHtml}</div>
        </div>
        <div class="cv-body">${mainContentHtml}</div>
      `;
    }

    return {
      html: innerHtml,
      styling: st
    };
  }

  return { templatesList, generateResumeHtml };
})();
