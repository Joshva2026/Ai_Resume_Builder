function generateResumeHtml(resumeContent, theme = 'classic') {
  // Extract fields
  const p = resumeContent.personal || {};
  const exp = resumeContent.experience || [];
  const edu = resumeContent.education || [];
  const proj = resumeContent.projects || [];
  const skills = resumeContent.skills || '';
  const certs = resumeContent.certifications || '';
  
  // Format skills and certs
  const skillList = skills.split(',').map(s => s.trim()).filter(Boolean).map(s => `<li>${s}</li>`).join('');
  const certList = certs.split('\n').map(c => c.trim()).filter(Boolean).map(c => `<li>${c}</li>`).join('');

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      body {
        font-family: 'Inter', -apple-system, sans-serif;
        color: #333;
        line-height: 1.5;
        margin: 0;
        padding: 40px;
        background: white;
      }
      
      .header {
        text-align: center;
        margin-bottom: 24px;
      }
      
      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 600;
        color: #111;
        letter-spacing: -0.5px;
      }
      
      .contact-info {
        font-size: 13px;
        color: #555;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .contact-info span {
        display: inline-flex;
        align-items: center;
      }
      
      .contact-info span:not(:last-child)::after {
        content: "•";
        margin-left: 12px;
        color: #ccc;
      }

      .section {
        margin-bottom: 20px;
      }
      
      .section-title {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
        color: #111;
        border-bottom: 1px solid #ddd;
        padding-bottom: 6px;
        margin-top: 0;
        margin-bottom: 12px;
      }
      
      .summary-text {
        font-size: 13px;
        color: #444;
      }
      
      .item {
        margin-bottom: 16px;
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
      }
      
      .item-title {
        font-weight: 600;
        font-size: 14px;
        color: #111;
      }
      
      .item-subtitle {
        font-weight: 500;
        font-size: 13px;
        color: #444;
      }
      
      .item-date {
        font-size: 13px;
        color: #666;
        text-align: right;
        white-space: nowrap;
      }
      
      .item-desc {
        font-size: 13px;
        color: #444;
        margin: 0;
      }
      
      .item-bullets {
        margin: 6px 0 0 0;
        padding-left: 20px;
        font-size: 13px;
        color: #444;
      }
      
      .item-bullets li {
        margin-bottom: 4px;
      }

      .skills-list, .certs-list {
        margin: 0;
        padding-left: 20px;
        font-size: 13px;
        color: #444;
      }
      
      .skills-list li, .certs-list li {
        display: inline-block;
        margin-right: 16px;
        margin-bottom: 4px;
        list-style-type: disc;
      }
      
      /* Print specific fixes for A4 */
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
      <h1>${p.fullName || 'Your Name'}</h1>
      <div class="contact-info">
  `;

  if (p.email) html += `<span>${p.email}</span>`;
  if (p.phone) html += `<span>${p.phone}</span>`;
  if (p.location) html += `<span>${p.location}</span>`;
  if (p.link) html += `<span>${p.link}</span>`;

  html += `
      </div>
    </div>
  `;

  if (resumeContent.summary) {
    html += `
    <div class="section">
      <h2 class="section-title">Professional Summary</h2>
      <div class="summary-text">${resumeContent.summary}</div>
    </div>
    `;
  }

  if (exp.length > 0) {
    html += `
    <div class="section">
      <h2 class="section-title">Experience</h2>
    `;
    exp.forEach(e => {
      html += `
        <div class="item">
          <div class="item-header">
            <div>
              <span class="item-title">${e.role || 'Role'}</span>
              ${e.company ? `<span class="item-subtitle">, ${e.company}</span>` : ''}
            </div>
            <span class="item-date">${e.start || e.startDate || ''} ${e.end || e.endDate ? '- ' + (e.end || e.endDate) : ''}</span>
          </div>
      `;
      if (e.description) {
        html += `
          <ul class="item-bullets">
            ${e.description.split('\n').filter(Boolean).map(bullet => `<li>${bullet.trim()}</li>`).join('')}
          </ul>
        `;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }

  if (edu.length > 0) {
    html += `
    <div class="section">
      <h2 class="section-title">Education</h2>
    `;
    edu.forEach(e => {
      html += `
        <div class="item">
          <div class="item-header">
            <div>
              <span class="item-title">${e.degree || 'Degree'}</span>
              ${e.school ? `<span class="item-subtitle">, ${e.school}</span>` : ''}
            </div>
            <span class="item-date">${e.start || e.end || e.year || ''}</span>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (proj.length > 0) {
    html += `
    <div class="section">
      <h2 class="section-title">Projects</h2>
    `;
    proj.forEach(pr => {
      html += `
        <div class="item">
          <div class="item-header">
            <span class="item-title">${pr.name || pr.title || 'Project Name'} ${pr.link ? ` - ${pr.link}` : ''}</span>
          </div>
      `;
      if (pr.description) {
        html += `
          <ul class="item-bullets">
            ${pr.description.split('\n').filter(Boolean).map(bullet => `<li>${bullet.trim()}</li>`).join('')}
          </ul>
        `;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }

  if (skillList) {
    html += `
    <div class="section">
      <h2 class="section-title">Skills</h2>
      <ul class="skills-list">
        ${skillList}
      </ul>
    </div>
    `;
  }

  if (certList) {
    html += `
    <div class="section">
      <h2 class="section-title">Certifications</h2>
      <ul class="certs-list">
        ${certList}
      </ul>
    </div>
    `;
  }

  html += `
  </body>
  </html>
  `;

  return html;
}

module.exports = { generateResumeHtml };
