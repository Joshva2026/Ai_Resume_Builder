(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let activeMode = 'upload'; // Default to upload as it matches the default HTML active tab

  function init() {
    if (initialized) return;
    const btn = document.getElementById('btnMatch');
    if (!btn) return;
    initialized = true;

    bindEvents();
    loadSavedResumes();
  }

  function bindEvents() {
    const tabUpload = document.getElementById('tabUpload');
    const tabSaved = document.getElementById('tabSaved');
    const uploadContainer = document.getElementById('fileUploadContainer');
    const savedContainer = document.getElementById('savedResumeContainer');

    tabUpload.addEventListener('click', () => {
      activeMode = 'upload';
      tabUpload.classList.add('active');
      tabSaved.classList.remove('active');
      uploadContainer.style.display = 'block';
      savedContainer.style.display = 'none';
    });

    tabSaved.addEventListener('click', () => {
      activeMode = 'saved';
      tabSaved.classList.add('active');
      tabUpload.classList.remove('active');
      savedContainer.style.display = 'block';
      uploadContainer.style.display = 'none';
    });

    document.getElementById('btnMatch').addEventListener('click', runComparison);
  }

  async function loadSavedResumes() {
    const select = document.getElementById('resumeSelect');
    if (!select) return;
    try {
      const list = await ApiService.resumes.list();
      if (!list.length) {
        select.innerHTML = '<option value="">No created resumes found. Build one first!</option>';
        return;
      }
      select.innerHTML = '<option value="">Select a saved resume...</option>' + list.map(r => `<option value="${r.id}">${escapeHtml(r.title || 'Untitled Resume')}</option>`).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Could not load saved resumes.</option>';
    }
  }

  async function runComparison() {
    const btn = document.getElementById('btnMatch');
    const errorBox = document.getElementById('matchErrorBox');
    const results = document.getElementById('resultsPanel');
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const jobTitle = document.getElementById('jobTitle').value.trim() || 'Software Engineer';
    const company = document.getElementById('companyName').value.trim() || 'TechCorp';

    if (!jobDescription) {
      errorBox.textContent = 'Please paste the Job Description requirements.';
      errorBox.style.display = 'block';
      return;
    }

    let resumeId = null;
    let fileToUpload = null;
    
    if (activeMode === 'upload') {
      const fileInput = document.getElementById('resumeFileInput');
      if (!fileInput.files || fileInput.files.length === 0) {
        errorBox.textContent = 'Please upload a resume first.';
        errorBox.style.display = 'block';
        return;
      }
      fileToUpload = fileInput.files[0];
    } else {
      resumeId = document.getElementById('resumeSelect').value;
      if (!resumeId) {
        errorBox.textContent = 'Please select a created resume first.';
        errorBox.style.display = 'block';
        return;
      }
    }

    errorBox.style.display = 'none';
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Job Match…';

    try {
      let match;
      if (activeMode === 'upload') {
        const formData = new FormData();
        formData.append('resume', fileToUpload);
        formData.append('resumeSource', 'upload');
        formData.append('jobDescription', jobDescription);
        formData.append('jobTitle', jobTitle);
        formData.append('company', company);
        match = await ApiService.jobMatch.analyzeUpload(formData);
      } else {
        match = await ApiService.jobMatch.analyze(resumeId, jobDescription, jobTitle, company);
      }
      
      const pct = match.match_percentage || 0;
      const verdict = pct >= 85 ? { label: 'Excellent Match', color: 'var(--score-high)' }
        : pct >= 65 ? { label: 'Good Match', color: 'var(--signal-500)' }
        : { label: 'Needs Improvement', color: 'var(--score-low)' };

      results.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:var(--sp-4); margin-bottom:var(--sp-4)">
          <h3>Job Match Report</h3>
          <span style="font-size:var(--fs-2xs); color:var(--ink-600)">ATS Overlap Index</span>
        </div>

        <div class="score-circle-container">
          <div class="score-circle" style="border-color: ${verdict.color}">
            <span class="val">${pct}%</span>
            <span class="label">Match</span>
          </div>
        </div>

        <div style="text-align:center; margin-bottom:var(--sp-5)">
          <span class="badge" style="background:var(--line); color:${verdict.color}; font-size:var(--fs-xs); padding:6px 14px; border-radius:var(--radius-pill); font-weight:700">${verdict.label}</span>
          <p style="margin-top:8px; font-size:var(--fs-xs); color:var(--ink-500)">Analyzed against requirements for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(company)}</strong>.</p>
        </div>

        <div class="details-panel">
          <h4><i class="fa-solid fa-circle-check" style="color:var(--score-high); margin-right:6px"></i> Strong Skills Overlap</h4>
          <div class="chip-container">
            ${(match.strong_matches || []).map(m => `<span class="match-chip" style="background:var(--score-high-bg); color:var(--score-high)">${escapeHtml(m)}</span>`).join('') || '<span style="color:var(--ink-600); font-size:13px">No major overlaps found.</span>'}
          </div>
        </div>

        <div class="details-panel">
          <h4><i class="fa-solid fa-triangle-exclamation" style="color:var(--score-low); margin-right:6px"></i> Missing Overlap Skills</h4>
          <div class="chip-container">
            ${(match.missing_matches || []).map(m => `<span class="match-chip" style="background:var(--score-low-bg); color:var(--score-low)">${escapeHtml(m)}</span>`).join('') || '<span style="color:var(--ink-600); font-size:13px">None missing! You match all major keywords.</span>'}
          </div>
        </div>

        <div class="details-panel">
          <h4><i class="fa-solid fa-lightbulb" style="color:var(--signal-500); margin-right:6px"></i> Tailored Recommendations</h4>
          <ul style="margin-top:8px; padding-left:16px; font-size:var(--fs-xs); color:var(--ink-500)">
            ${(match.recommendations || []).map(r => `<li style="margin-bottom:6px">${escapeHtml(r)}</li>`).join('') || '<li>Keep design professional and customize summaries for this role.</li>'}
          </ul>
        </div>
      `;
    } catch (err) {
      errorBox.textContent = err.message || 'Job matching failed. Please try again.';
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
