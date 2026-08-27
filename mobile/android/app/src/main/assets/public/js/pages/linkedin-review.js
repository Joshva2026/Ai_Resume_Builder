(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  function init() {
    if (initialized) return;
    const btn = document.getElementById('btnAudit');
    if (!btn) return;
    initialized = true;

    btn.addEventListener('click', runAudit);
  }

  async function runAudit() {
    const textEl = document.getElementById('profileText');
    const profileText = textEl.value.trim();
    const btn = document.getElementById('btnAudit');
    const results = document.getElementById('resultsPanel');
    const errorBox = document.getElementById('liErrorBox');

    if (!profileText) {
      errorBox.textContent = 'Please paste your LinkedIn profile text first.';
      errorBox.style.display = 'block';
      return;
    }
    errorBox.style.display = 'none';

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Auditing Profile…';

    try {
      const review = await ApiService.linkedin.review(profileText);
      
      const score = review.overall_score || 0;
      const strengths = review.strengths || [];
      const weaknesses = review.weaknesses || [];
      const priorityImprovements = review.priority_improvements || [];
      
      let ratingLabel = 'Good but needs improvement';
      if (score >= 90) ratingLabel = 'Excellent';
      else if (score >= 75) ratingLabel = 'Strong';
      else if (score >= 60) ratingLabel = 'Good but needs improvement';
      else if (score >= 40) ratingLabel = 'Needs significant improvement';
      else ratingLabel = 'Major profile improvements needed';

      let categoriesHtml = '';
      if (review.categories && Array.isArray(review.categories)) {
        categoriesHtml = review.categories.map(c => {
          let icon = 'fa-circle-question';
          if (c.name.includes('Headline')) icon = 'fa-heading';
          else if (c.name.includes('About') || c.name.includes('Summary')) icon = 'fa-address-card';
          else if (c.name.includes('Experience')) icon = 'fa-briefcase';
          else if (c.name.includes('Skills')) icon = 'fa-solid fa-list-check';
          else if (c.name.includes('Completeness')) icon = 'fa-solid fa-circle-check';
          else if (c.name.includes('Education') || c.name.includes('Certifications')) icon = 'fa-graduation-cap';
          else if (c.name.includes('Keyword') || c.name.includes('Optimization') || c.name.includes('Recruiter')) icon = 'fa-tags';

          const evidenceList = (c.evidence || []).map(e => `<li style="margin-bottom:3px">"${escapeHtml(e)}"</li>`).join('');

          return `
            <div class="review-item" style="border-left: 4px solid var(--primary); margin-bottom:var(--sp-4);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2)">
                <h4 style="margin:0"><i class="fa-solid ${icon}"></i> ${escapeHtml(c.name)}</h4>
                <strong style="font-size:var(--fs-sm); color:var(--primary)">${c.score}/${c.max_score}</strong>
              </div>
              <p style="margin-bottom:8px; color:var(--ink-800)"><strong>Feedback:</strong> ${escapeHtml(c.reason)}</p>
              ${evidenceList ? `
                <p style="margin-bottom:4px; font-weight:600; color:var(--ink-700)">Evidence from Profile:</p>
                <ul style="padding-left:18px; font-size:var(--fs-2xs); color:var(--ink-600); margin-bottom:8px">${evidenceList}</ul>
              ` : ''}
              <p style="margin-bottom:0; color:var(--primary); font-weight:600"><i class="fa-regular fa-lightbulb"></i> Recommended Action: <span style="font-weight:400; color:var(--ink-600)">${escapeHtml(c.improvement)}</span></p>
            </div>
          `;
        }).join('');
      }

      results.innerHTML = `
        <div style="border-bottom:1px solid var(--line); padding-bottom:var(--sp-4); margin-bottom:var(--sp-4)">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Audit Report</h3>
            <span style="font-size:var(--fs-2xs); color:var(--ink-600); font-weight:700;">AI PROFILE QUALITY SCORE</span>
          </div>
          <p style="font-size:var(--fs-3xs); color:var(--ink-500); margin-top:4px; line-height:1.2">This is an AI-assisted LinkedIn profile analysis based only on your submitted text. Not an official LinkedIn rating.</p>
        </div>

        <div class="score-circle-container" style="margin-bottom:var(--sp-6)">
          <div class="score-circle" style="border-color: ${score >= 90 ? 'var(--score-high)' : score >= 75 ? 'var(--signal-500)' : 'var(--score-low)'}">
            <span class="val">${score}</span>
            <span class="label">Index</span>
          </div>
          <div style="text-align:center; margin-top:var(--sp-2)">
            <span style="font-weight:700; color:${score >= 90 ? 'var(--score-high)' : score >= 75 ? 'var(--signal-600)' : 'var(--score-low)'}; font-size:var(--fs-sm)">${ratingLabel}</span>
          </div>
        </div>

        ${review.overall_summary ? `
          <div class="review-item" style="background:var(--paper-50); border-left:4px solid var(--ink-400)">
            <h4><i class="fa-solid fa-file-invoice"></i> Executive Evaluation</h4>
            <p style="font-style:italic">${escapeHtml(review.overall_summary)}</p>
          </div>
        ` : ''}

        <div style="margin-bottom:var(--sp-6)">
          <h3 style="margin-bottom:var(--sp-3); font-size:var(--fs-sm); border-bottom: 1px dashed var(--line); padding-bottom:4px">Category breakdown</h3>
          ${categoriesHtml}
        </div>

        ${strengths.length ? `
          <div class="review-item" style="border-left: 4px solid var(--score-high)">
            <h4><i class="fa-solid fa-circle-check" style="color:var(--score-high)"></i> Key Strengths</h4>
            <ul style="padding-left:16px; font-size:var(--fs-xs); color:var(--ink-600); margin-top:8px">
              ${strengths.map(s => `<li style="margin-bottom:4px">${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${weaknesses.length ? `
          <div class="review-item" style="border-left: 4px solid var(--score-low)">
            <h4><i class="fa-solid fa-triangle-exclamation" style="color:var(--score-low)"></i> Gaps & Weaknesses</h4>
            <ul style="padding-left:16px; font-size:var(--fs-xs); color:var(--ink-600); margin-top:8px">
              ${weaknesses.map(w => `<li style="margin-bottom:4px">${escapeHtml(w)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${priorityImprovements.length ? `
          <div class="review-item" style="border-left: 4px solid var(--signal-500)">
            <h4><i class="fa-solid fa-lightbulb" style="color:var(--signal-500)"></i> Priority Optimizations</h4>
            <ul style="padding-left:16px; font-size:var(--fs-xs); color:var(--ink-600); margin-top:8px">
              ${priorityImprovements.map(i => `<li style="margin-bottom:4px">${escapeHtml(i)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
    } catch (err) {
      errorBox.textContent = err.message || 'Audit analysis failed. Please try again.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }
})();
