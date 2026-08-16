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
      
      const score = review.overall_score || 70;
      const suggestions = review.suggestions || [];
      const density = review.keyword_density || [];
      
      results.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:var(--sp-4); margin-bottom:var(--sp-4)">
          <h3>Analysis Results</h3>
          <span style="font-size:var(--fs-2xs); color:var(--ink-600)">Recruiter Friendly Index</span>
        </div>

        <div class="score-circle-container">
          <div class="score-circle" style="border-color: ${score >= 85 ? 'var(--score-high)' : score >= 65 ? 'var(--signal-500)' : 'var(--score-low)'}">
            <span class="val">${score}</span>
            <span class="label">Index</span>
          </div>
        </div>

        <div class="review-item">
          <h4><i class="fa-solid fa-heading"></i> Headline Audit</h4>
          <p>${escapeHtml(review.headline_review || 'Headline analysis was not generated.')}</p>
        </div>

        <div class="review-item">
          <h4><i class="fa-solid fa-address-card"></i> About Section (Summary)</h4>
          <p>${escapeHtml(review.about_review || 'Summary analysis was not generated.')}</p>
        </div>

        <div class="review-item">
          <h4><i class="fa-solid fa-briefcase"></i> Work Experience</h4>
          <p>${escapeHtml(review.experience_review || 'Experience layout review was not generated.')}</p>
        </div>

        ${suggestions.length ? `
          <div class="review-item">
            <h4><i class="fa-solid fa-lightbulb"></i> Optimization Steps</h4>
            <ul style="margin-top:8px; padding-left:16px; font-size:var(--fs-xs); color:var(--ink-500)">
              ${suggestions.map(s => `<li style="margin-bottom:6px">${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${density.length ? `
          <div class="review-item">
            <h4><i class="fa-solid fa-tags"></i> Core Keyword Density</h4>
            <div class="chip-container">
              ${density.map(d => `<span class="keyword-chip" style="border: 1px solid var(--line)">${escapeHtml(d.keyword)} (${d.count}x — ${escapeHtml(d.density)})</span>`).join('')}
            </div>
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
