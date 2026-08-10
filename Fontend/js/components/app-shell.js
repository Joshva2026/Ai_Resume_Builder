/**
 * APP SHELL COMPONENT
 * Renders the sidebar + topbar into any authenticated page.
 * Usage: <div id="appShellRoot"></div>  then AppShell.render({ active: 'dashboard', title: 'Dashboard' })
 */
const AppShell = (() => {
  const NAV_ITEMS = [
    { group: 'Workspace' },
    { key: 'dashboard', icon: 'fa-grid-2', label: 'Dashboard', href: 'dashboard' },
    { key: 'resume-builder', icon: 'fa-pen-ruler', label: 'Resume Builder', href: 'resume-builder' },
    { key: 'ats-checker', icon: 'fa-gauge-high', label: 'ATS Checker', href: 'ats-checker' },
    { key: 'ai-assistant', icon: 'fa-robot', label: 'AI Assistant', href: 'ai-assistant' },
    { key: 'profile', icon: 'fa-user', label: 'Profile', href: 'profile' },
    { group: 'Explore' },
    { key: 'about', icon: 'fa-circle-info', label: 'About', href: 'about' },
    { key: 'contact', icon: 'fa-envelope-open-text', label: 'Contact', href: 'contact' },
  ];

  function navHtml(active) {
    return NAV_ITEMS.map((item) => {
      if (item.group) return `<div class="nav-group-label">${item.group}</div>`;
      const cls = item.key === active ? 'active' : '';
      return `<a href="${item.href}" class="${cls}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a>`;
    }).join('');
  }

  function render({ active = '', title = 'Dashboard' } = {}) {
    const root = document.getElementById('appShellRoot');
    if (!root) return;

    root.innerHTML = `
      <div class="app-shell">
        <aside class="app-sidebar" id="appSidebar">
          <a href="../index.html" class="brand"><span class="brand-mark">RF</span>ResumeForge</a>
          <nav class="side-nav">${navHtml(active)}</nav>
          <div class="sidebar-upgrade">
            <p><strong style="color:white">Free plan</strong><br>Upgrade for unlimited scans &amp; exports.</p>
            <a href="../index.html#pricing" class="btn btn-accent">Upgrade to Pro</a>
          </div>
        </aside>

        <div class="app-main">
          <header class="app-topbar">
            <div style="display:flex; align-items:center; gap:14px;">
              <button class="icon-btn mobile-sidebar-toggle" id="sidebarToggle" aria-label="Toggle menu"><i class="fa-solid fa-bars"></i></button>
              <h1>${title}</h1>
            </div>
            <div class="topbar-actions">
              <button class="icon-btn" aria-label="Notifications"><i class="fa-regular fa-bell"></i><span class="badge"></span></button>
              <div class="user-menu" id="userMenuTrigger">
                <div class="avatar" id="userAvatar">··</div>
                <div>
                  <div class="name" id="userName">Loading…</div>
                  <div class="role">Free plan</div>
                </div>
                <i class="fa-solid fa-chevron-down" style="font-size:11px; color:var(--ink-600)"></i>
              </div>
            </div>
          </header>
          <main class="app-content" id="appContent"></main>
        </div>
      </div>
    `;

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('appSidebar').classList.toggle('is-open');
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
      // Non-fatal on dashboard shell — backend may not be running yet
      console.warn('Could not load user:', err.message);
    }
  }

  return { render };
})();
