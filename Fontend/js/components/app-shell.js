/**
 * APP SHELL COMPONENT
 * Renders the sidebar + topbar into any authenticated page.
 * Usage: <div id="appShellRoot"></div>  then AppShell.render({ active: 'dashboard', title: 'Dashboard' })
 */
const AppShell = (() => {
  const NAV_ITEMS = [
    { group: 'Workspace' },
    { key: 'dashboard', icon: 'fa-table-columns', label: 'Dashboard', href: 'dashboard' },
    { key: 'resume-builder', icon: 'fa-pen-ruler', label: 'Resume Builder', href: 'resume-builder' },
    { key: 'cover-letter', icon: 'fa-envelope-open-text', label: 'Cover Letter', href: 'cover-letter' },
    { key: 'applications', icon: 'fa-list-check', label: 'Application Tracker', href: 'applications' },
    
    { group: 'AI & Career Tools' },
    { key: 'ats-checker', icon: 'fa-gauge-high', label: 'ATS Score Checker', href: 'ats-checker' },
    { key: 'job-match', icon: 'fa-shuffle', label: 'Job Match Analyzer', href: 'job-match' },
    { key: 'linkedin-review', icon: 'fa-brands fa-linkedin', label: 'LinkedIn Reviewer', href: 'linkedin-review' },
    { key: 'ai-assistant', icon: 'fa-robot', label: 'AI Career Chat', href: 'ai-assistant' },
    
    { group: 'System' },
    { key: 'job-search', icon: 'fa-briefcase', label: 'Find Jobs', href: 'job-search' },
    { key: 'profile', icon: 'fa-user', label: 'Profile', href: 'profile' },
  ];

  function navHtml(active) {
    return NAV_ITEMS.map((item) => {
      if (item.group) return `<div class="nav-group-label">${item.group}</div>`;
      const cls = item.key === active ? 'active' : '';
      const iconClass = item.icon.startsWith('fa-') && !item.icon.includes(' ') ? `fa-solid ${item.icon}` : item.icon;
      return `<a href="${item.href}" class="${cls}"><i class="${iconClass}"></i> ${item.label}</a>`;
    }).join('');
  }

  function render({ active = '', title = 'Dashboard' } = {}) {
    const root = document.getElementById('appShellRoot');
    if (!root) return;

    // Apply saved theme immediately
    const savedTheme = localStorage.getItem('rf_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }

    const currentThemeIcon = savedTheme === 'light' ? 'fa-moon' : 'fa-sun';

    root.innerHTML = `
      <div class="app-shell">
        <aside class="app-sidebar" id="appSidebar">
          <a href="../index.html" class="brand"><span class="brand-mark">RF</span>ResumeForge</a>
          <nav class="side-nav">${navHtml(active)}</nav>
          <div class="sidebar-upgrade">
            <p><strong style="color:var(--ink-100)">Pro Account</strong><br>Access unlimited AI insights.</p>
            <a href="../index.html#pricing" class="btn btn-accent btn-block" style="text-align:center; display:block; padding:10px 0; margin-top:8px;">Plan details</a>
          </div>
        </aside>
 
        <div class="app-main">
          <header class="app-topbar">
            <div style="display:flex; align-items:center; gap:14px;">
              <button class="icon-btn mobile-sidebar-toggle" id="sidebarToggle" aria-label="Toggle menu"><i class="fa-solid fa-bars"></i></button>
              <h1>${title}</h1>
            </div>
            <div class="topbar-actions">
              <button class="icon-btn" id="themeToggleBtn" aria-label="Toggle Theme"><i class="fa-solid ${currentThemeIcon}"></i></button>
              <button class="icon-btn" aria-label="Notifications"><i class="fa-regular fa-bell"></i><span class="badge"></span></button>
              <div class="user-menu" id="userMenuTrigger">
                <div class="avatar" id="userAvatar">··</div>
                <div>
                  <div class="name" id="userName">Loading…</div>
                  <div class="role">Pro plan</div>
                </div>
                <i class="fa-solid fa-chevron-down" style="font-size:11px; color:var(--ink-600)"></i>
              </div>
            </div>
          </header>
          <main class="app-content" id="appContent"></main>
        </div>
 
        <div class="mobile-bottom-dock">
          <a href="dashboard" class="${active === 'dashboard' ? 'active' : ''}"><i class="fa-solid fa-table-columns"></i><span>Dash</span></a>
          <a href="resume-builder" class="${active === 'resume-builder' ? 'active' : ''}"><i class="fa-solid fa-pen-ruler"></i><span>Builder</span></a>
          <a href="ats-checker" class="${active === 'ats-checker' ? 'active' : ''}"><i class="fa-solid fa-gauge-high"></i><span>ATS</span></a>
          <a href="ai-assistant" class="${active === 'ai-assistant' ? 'active' : ''}"><i class="fa-solid fa-robot"></i><span>AI</span></a>
          <a href="profile" class="${active === 'profile' ? 'active' : ''}"><i class="fa-solid fa-user"></i><span>Profile</span></a>
        </div>
      </div>
    `;

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('appSidebar').classList.toggle('is-open');
    });

    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('rf_theme', isLight ? 'light' : 'dark');
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
      }
    });

    document.getElementById('userMenuTrigger')?.addEventListener('click', () => {
      if (confirm('Log out of ResumeForge?')) {
        ApiService.auth.logout().finally(() => (window.location.href = 'login.html'));
      }
    });

    loadUser();
  }

  async function loadUser() {
    try {
      const { user } = await ApiService.auth.me();
      const nameEl = document.getElementById('userName');
      const avatarEl = document.getElementById('userAvatar');
      const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Guest';
      const initials = `${(user?.firstName?.[0] || '').toUpperCase()}${(user?.lastName?.[0] || '').toUpperCase()}` || (user?.email?.[0] || 'U').toUpperCase();
      if (nameEl) nameEl.textContent = fullName;
      if (avatarEl) avatarEl.textContent = initials;
    } catch (err) {
      console.warn('Could not load user:', err.message);
    }
  }

  return { render };
})();
