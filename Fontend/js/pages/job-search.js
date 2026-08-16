(function () {
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 0);

  let initialized = false;
  let savedJobs = [];

  function init() {
    if (initialized) return;
    const btn = document.getElementById('btnSearch');
    if (!btn) return;
    initialized = true;

    btn.addEventListener('click', runSearch);
    loadSavedJobs();
  }

  async function loadSavedJobs() {
    const listEl = document.getElementById('savedJobsList');
    try {
      savedJobs = await ApiService.jobs.saved.list();
      if (!savedJobs.length) {
        listEl.innerHTML = '<p style="color:var(--ink-600); font-size:var(--fs-xs)">No saved job listings yet.</p>';
        return;
      }
      
      listEl.innerHTML = savedJobs.map(job => `
        <div class="saved-job-item">
          <div>
            <div class="title">${escapeHtml(job.title)}</div>
            <div class="company">${escapeHtml(job.company)} · ${escapeHtml(job.location || 'Remote')}</div>
          </div>
          <button class="icon-btn" onclick="removeBookmark(${job.id})" style="color:var(--score-low)" title="Remove Bookmark"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = '<p style="color:var(--score-low); font-size:var(--fs-xs)">Failed to load bookmarks.</p>';
    }
  }

  async function runSearch() {
    const query = document.getElementById('searchQuery').value.trim();
    const location = document.getElementById('searchLocation').value.trim();
    const btn = document.getElementById('btnSearch');
    const listEl = document.getElementById('jobResultsList');

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching…';

    try {
      const result = await ApiService.jobs.search(query, location);
      
      if (!result.providerConfigured) {
        listEl.innerHTML = `
          <div class="empty-config-state">
            <i class="fa-solid fa-circle-exclamation"></i>
            <h4>Job Search Provider (Adzuna) is not configured</h4>
            <p style="margin-top:6px; line-height:1.5">${escapeHtml(result.message)}</p>
          </div>
        `;
        return;
      }

      const jobs = result.jobs || [];
      if (!jobs.length) {
        listEl.innerHTML = `
          <div class="empty-results" style="text-align:center; padding:var(--sp-6)">
            <i class="fa-solid fa-folder-open" style="font-size:var(--fs-2xl); color:var(--ink-600)"></i>
            <h4 style="color:var(--ink-200); margin-top:12px">No jobs found</h4>
            <p style="color:var(--ink-600); font-size:var(--fs-xs)">Try broadening your search term or location.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = jobs.map(job => {
        // Check if already bookmarked
        const isSaved = savedJobs.some(s => s.title === job.title && s.company === job.company);
        const saveButtonHtml = isSaved 
          ? `<span style="color:var(--score-high); font-size:var(--fs-2xs); font-weight:600"><i class="fa-solid fa-circle-check"></i> Saved</span>`
          : `<button class="btn btn-sm btn-ghost" onclick="bookmarkJob(${escapeAttr(JSON.stringify(job))})"><i class="fa-regular fa-bookmark"></i> Bookmark</button>`;

        return `
          <div class="job-item">
            <div class="job-details">
              <h4>${escapeHtml(job.title)}</h4>
              <p><strong>${escapeHtml(job.company)}</strong> · ${escapeHtml(job.location)}</p>
              <div class="job-meta-row">
                <span><i class="fa-solid fa-clock"></i> ${escapeHtml(job.posted_date)}</span>
                <span><i class="fa-solid fa-briefcase"></i> ${escapeHtml(job.type)}</span>
                <span style="color:var(--signal-500)"><i class="fa-solid fa-compress"></i> Est. Match: ${job.match_pct}%</span>
              </div>
            </div>
            <div>
              ${saveButtonHtml}
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      listEl.innerHTML = `
        <div class="empty-results" style="text-align:center; color:var(--score-low)">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <h4>Search failed</h4>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // Define bookmark actions globally for inline html triggers
  window.bookmarkJob = async function (job) {
    try {
      await ApiService.jobs.saved.save({
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        url: job.url,
        posted_date: job.posted_date,
        match_pct: job.match_pct
      });
      loadSavedJobs();
      runSearch(); // Refresh list to update bookmark button status
    } catch (err) {
      alert('Failed to bookmark job: ' + err.message);
    }
  };

  window.removeBookmark = async function (id) {
    if (confirm('Remove this job bookmark?')) {
      try {
        await ApiService.jobs.saved.remove(id);
        loadSavedJobs();
        runSearch();
      } catch (err) {
        alert('Failed to remove bookmark: ' + err.message);
      }
    }
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/"/g, '&quot;');
  }
})();
