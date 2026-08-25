function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateResumeHtml(resumeContent, theme = 'modern') {
  const content = typeof resumeContent === 'object' && resumeContent !== null ? resumeContent : {};
  const p = content.personal || {};
  const exp = Array.isArray(content.experience) ? content.experience : [];
  const edu = Array.isArray(content.education) ? content.education : [];
  const proj = Array.isArray(content.projects) ? content.projects : [];
  const skills = content.skills || '';
  const certs = content.certifications || '';
  const achievements = content.achievements || '';

  const styling = content.styling || {};
  const accentColor = styling.accentColor || (theme === 'executive' ? '#0f172a' : theme === 'minimal' ? '#18181b' : '#2563eb');
  const fontFamily = theme === 'academic' || theme === 'executive' ? "'Merriweather', Georgia, serif" : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  // Format skills
  let skillItems = [];
  if (Array.isArray(skills)) {
    skillItems = skills.map(s => typeof s === 'object' ? s.name || '' : String(s)).filter(Boolean);
  } else if (typeof skills === 'string') {
    skillItems = skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  const skillListHtml = skillItems.map(s => `<li>${escapeHtml(s)}</li>`).join('');

  // Format certs
  let certItems = [];
  if (Array.isArray(certs)) {
    certItems = certs.map(c => typeof c === 'object' ? c.name || '' : String(c)).filter(Boolean);
  } else if (typeof certs === 'string') {
    certItems = certs.split('\n').map(c => c.trim()).filter(Boolean);
  }
  const certListHtml = certItems.map(c => `<li>${escapeHtml(c)}</li>`).join('');

  // Format achievements
  let achItems = [];
  if (Array.isArray(achievements)) {
    achItems = achievements.map(a => typeof a === 'object' ? a.name || '' : String(a)).filter(Boolean);
  } else if (typeof achievements === 'string') {
    achItems = achievements.split('\n').map(a => a.trim()).filter(Boolean);
  }
  const achListHtml = achItems.map(a => `<li>${escapeHtml(a)}</li>`).join('');

  // Helper for bullet points
  function renderBullets(item) {
    let bullets = [];
    if (Array.isArray(item.bullets) && item.bullets.length > 0) {
      bullets = item.bullets;
    } else if (item.description) {
      bullets = String(item.description).split('\n').map(b => b.trim()).filter(Boolean);
    }
    if (bullets.length === 0) return '';
    return `
      <ul class="item-bullets">
        ${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
      </ul>
    `;
  }

  let contactSpans = [];
  if (p.email) contactSpans.push(`<span>${escapeHtml(p.email)}</span>`);
  if (p.phone) contactSpans.push(`<span>${escapeHtml(p.phone)}</span>`);
  if (p.location) contactSpans.push(`<span>${escapeHtml(p.location)}</span>`);
  if (p.link || p.website || p.portfolio) contactSpans.push(`<span>${escapeHtml(p.link || p.website || p.portfolio)}</span>`);
  if (p.linkedin) contactSpans.push(`<span>${escapeHtml(p.linkedin)}</span>`);
  if (p.github) contactSpans.push(`<span>${escapeHtml(p.github)}</span>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(p.fullName || 'Resume')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@300;400;700&display=swap');
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: ${fontFamily};
      color: #1e293b;
      line-height: 1.5;
      margin: 0;
      padding: 32px 40px;
      background: #ffffff;
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }
    
    .header {
      text-align: ${theme === 'minimal' ? 'left' : 'center'};
      margin-bottom: 20px;
      border-bottom: ${theme === 'modern' ? `2px solid ${accentColor}` : '1px solid #e2e8f0'};
      padding-bottom: 16px;
    }
    
    h1 {
      margin: 0 0 6px 0;
      font-size: 26px;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: -0.5px;
    }
    
    .contact-info {
      font-size: 12px;
      color: #64748b;
      display: flex;
      justify-content: ${theme === 'minimal' ? 'flex-start' : 'center'};
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .contact-info span {
      display: inline-flex;
      align-items: center;
    }
    
    .contact-info span:not(:last-child)::after {
      content: "•";
      margin-left: 10px;
      color: #cbd5e1;
    }

    .section {
      margin-bottom: 18px;
    }
    
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      color: ${accentColor};
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 0;
      margin-bottom: 10px;
    }
    
    .summary-text {
      font-size: 12.5px;
      color: #334155;
      line-height: 1.6;
    }
    
    .item {
      margin-bottom: 12px;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    
    .item-title {
      font-weight: 600;
      font-size: 13.5px;
      color: #0f172a;
    }
    
    .item-subtitle {
      font-weight: 500;
      font-size: 12.5px;
      color: #475569;
    }
    
    .item-date {
      font-size: 12px;
      color: #64748b;
      text-align: right;
      white-space: nowrap;
      font-weight: 500;
    }
    
    .item-bullets {
      margin: 4px 0 0 0;
      padding-left: 18px;
      font-size: 12.5px;
      color: #334155;
    }
    
    .item-bullets li {
      margin-bottom: 3px;
      line-height: 1.45;
    }

    .skills-list, .certs-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      font-size: 12.5px;
      color: #334155;
    }
    
    .skills-list li {
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 500;
      color: #1e293b;
    }
    
    .certs-list li {
      padding-left: 14px;
      position: relative;
    }
    .certs-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: ${accentColor};
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(p.fullName || 'Your Name')}</h1>
    ${p.title || p.designation ? `<div style="font-size: 14px; font-weight: 500; color: #475569; margin-bottom: 6px;">${escapeHtml(p.title || p.designation)}</div>` : ''}
    <div class="contact-info">
      ${contactSpans.join('')}
    </div>
  </div>

  ${content.summary ? `
  <div class="section">
    <h2 class="section-title">Professional Summary</h2>
    <div class="summary-text">${escapeHtml(content.summary)}</div>
  </div>
  ` : ''}

  ${exp.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Experience</h2>
    ${exp.map(e => `
      <div class="item">
        <div class="item-header">
          <div>
            <span class="item-title">${escapeHtml(e.role || e.title || 'Role')}</span>
            ${e.company ? `<span class="item-subtitle"> · ${escapeHtml(e.company)}</span>` : ''}
          </div>
          <span class="item-date">${escapeHtml(e.start || e.startDate || '')} ${e.end || e.endDate ? '– ' + escapeHtml(e.end || e.endDate) : ''}</span>
        </div>
        ${renderBullets(e)}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${edu.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Education</h2>
    ${edu.map(e => {
      const eduStart = e.start || e.startDate || '';
      const eduEnd = e.end || e.endDate || '';
      const eduYear = e.year || '';
      const dateStr = eduStart && eduEnd ? `${eduStart} – ${eduEnd}` : (eduYear || eduStart || eduEnd);
      return `
        <div class="item">
          <div class="item-header">
            <div>
              <span class="item-title">${escapeHtml(e.degree || 'Degree')}</span>
              ${e.school || e.institution ? `<span class="item-subtitle"> · ${escapeHtml(e.school || e.institution)}</span>` : ''}
            </div>
            <span class="item-date">${escapeHtml(dateStr)}</span>
          </div>
          ${e.grade || e.gpa ? `<div style="font-size: 12px; color: #64748b;">GPA/Grade: ${escapeHtml(e.grade || e.gpa)}</div>` : ''}
        </div>
      `;
    }).join('')}
  </div>
  ` : ''}

  ${proj.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Projects</h2>
    ${proj.map(pr => `
      <div class="item">
        <div class="item-header">
          <div>
            <span class="item-title">${escapeHtml(pr.name || pr.title || 'Project')}</span>
            ${pr.link ? `<span class="item-subtitle"> · <a href="${escapeHtml(pr.link)}" style="color: ${accentColor}; text-decoration: none;">${escapeHtml(pr.link)}</a></span>` : ''}
          </div>
        </div>
        ${renderBullets(pr)}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${skillListHtml ? `
  <div class="section">
    <h2 class="section-title">Skills</h2>
    <ul class="skills-list">
      ${skillListHtml}
    </ul>
  </div>
  ` : ''}

  ${certListHtml ? `
  <div class="section">
    <h2 class="section-title">Certifications</h2>
    <ul class="certs-list">
      ${certListHtml}
    </ul>
  </div>
  ` : ''}

  ${achListHtml ? `
  <div class="section">
    <h2 class="section-title">Achievements</h2>
    <ul class="certs-list">
      ${achListHtml}
    </ul>
  </div>
  ` : ''}

</body>
</html>`;
}

module.exports = { generateResumeHtml };
