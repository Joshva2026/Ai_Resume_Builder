(function () {
  setTimeout(init, 0);
  let initialized = false;

  function init() {
    if (initialized) return;
    const select = document.getElementById('resumeSelect');
    if (!select) return;
    initialized = true;

    loadResumes();
    document.getElementById('runScan').addEventListener('click', runScan);
  }

  async function loadResumes() {
    const select = document.getElementById('resumeSelect');
    try {
      const resumes = await ApiService.resumes.list();
      if (!resumes.length) {
        select.innerHTML = '<option value="">No resumes yet — create one first</option>';
        return;
      }
      select.innerHTML = resumes.map((r) => `<option value="${r.id}">${escapeHtml(r.title)}</option>`).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Could not load resumes</option>';
    }
  }

  async function runScan() {
    const select = document.getElementById('resumeSelect');
    const resumeId = select.value;
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const btn = document.getElementById('runScan');
    const results = document.getElementById('atsResults');

    if (!resumeId) return alert('Select a resume first, or create one in the Resume Builder.');

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning…';

    try {
      const report = await ApiService.ats.analyze(resumeId, jobDescription);
      renderResults(report);
    } catch (err) {
      results.innerHTML = `
        <div class="ats-empty">
          <i class="fa-solid fa-plug-circle-xmark"></i>
          <h3>Scan failed</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  function renderResults(report) {
    const results = document.getElementById('atsResults');
    const score = report.overallScore ?? report.overall_score ?? 0;
    const verdict = score >= 85 ? { label: 'Excellent Match', color: 'var(--score-high)', bg: 'var(--score-high-bg)' }
      : score >= 65 ? { label: 'Good Match', color: 'var(--signal-600)', bg: 'var(--signal-100)' }
      : { label: 'Needs Work', color: 'var(--score-low)', bg: 'var(--score-low-bg)' };

    const circumference = 2 * Math.PI * 78;
    const offset = circumference * (1 - score / 100);

    results.innerHTML = `
      <div class="big-gauge-card">
        <div class="big-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="78" fill="none" stroke="var(--paper-100)" stroke-width="14"/>
            <circle cx="90" cy="90" r="78" fill="none" stroke="${verdict.color}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"/>
          </svg>
          <div class="num"><span class="n">${score}</span><span class="l">out of 100</span></div>
        </div>
        <div class="gauge-verdict">
          <span class="verdict-tag" style="background:${verdict.bg}; color:${verdict.color}">${verdict.label}</span>
          <h2>Your resume scored ${score}/100 against this job</h2>
          <p>This score models how major applicant-tracking systems would parse and rank your resume for the job description provided.</p>
        </div>
      </div>

      <div class="category-grid">
        ${categoryCard('Keyword Match', report.keywordMatch ?? report.keyword_match ?? 0, 'fa-key')}
        ${categoryCard('Formatting', report.formattingScore ?? report.formatting_score ?? 0, 'fa-table-cells')}
        ${categoryCard('Grammar', report.grammarScore ?? report.grammar_score ?? 0, 'fa-spell-check')}
        ${categoryCard('Readability', report.readabilityScore ?? report.readability_score ?? 0, 'fa-book-open')}
      </div>

      <div class="two-col">
        <div class="result-panel">
          <h4><i class="fa-solid fa-triangle-exclamation" style="color:var(--score-low)"></i> Missing Keywords</h4>
          <div class="keyword-chips">
            ${(report.missingKeywords || report.missing_keywords || []).map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join('') || '<span style="color:var(--ink-600); font-size:13px">None found — nice work.</span>'}
          </div>
        </div>
        <div class="result-panel">
          <h4><i class="fa-solid fa-lightbulb" style="color:var(--signal-500)"></i> Suggestions</h4>
          <ul class="suggestion-list">
            ${(report.suggestions || []).map((s) => `<li><i class="fa-solid fa-arrow-right"></i> ${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  function categoryCard(label, value, icon) {
    const color = value >= 85 ? 'var(--score-high)' : value >= 65 ? 'var(--signal-500)' : 'var(--score-low)';
    return `
      <div class="category-card">
        <div class="cat-top"><span><i class="fa-solid ${icon}"></i> ${label}</span><span style="color:${color}">${value}</span></div>
        <div class="bar"><span style="width:${value}%; background:${color}"></span></div>
      </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
