/**
 * APP SHELL COMPONENT
 * Renders the sidebar + topbar into any authenticated page.
 * Usage: <div id="appShellRoot"></div> then AppShell.render({ active: 'dashboard', title: 'Dashboard' })
 */
const AppShell = (() => {
  const NAV_ITEMS = [
    { group: 'Workspace' },
    { key: 'dashboard', icon: 'fa-table-columns', label: 'Dashboard', href: 'dashboard.html' },
    { key: 'resume-builder', icon: 'fa-pen-ruler', label: 'Resume Builder', href: 'resume-builder.html' },
    { key: 'templates', icon: 'fa-cubes', label: 'Templates', href: 'templates.html' },
    { key: 'cover-letter', icon: 'fa-envelope-open-text', label: 'Cover Letters', href: 'cover-letter.html' },
    { key: 'applications', icon: 'fa-list-check', label: 'Application Tracker', href: 'applications.html' },

    { group: 'AI & Career Tools' },
    { key: 'ats-checker', icon: 'fa-gauge-high', label: 'ATS Checker', href: 'ats-checker.html' },
    { key: 'job-match', icon: 'fa-shuffle', label: 'Job Match Analyzer', href: 'job-match.html' },
    { key: 'linkedin-review', icon: 'fa-brands fa-linkedin', label: 'LinkedIn Auditor', href: 'linkedin-review.html' },
    { key: 'ai-assistant', icon: 'fa-robot', label: 'AI Assistant', href: 'ai-assistant.html' },

    { group: 'System' },
    { key: 'profile', icon: 'fa-user', label: 'Profile', href: 'profile.html' },
    { key: 'settings', icon: 'fa-gear', label: 'Settings', href: 'settings.html' }
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
    const savedTheme = localStorage.getItem('rf_theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    const currentThemeIcon = savedTheme === 'dark' ? 'fa-sun' : 'fa-moon';

    root.innerHTML = `
      <div class="app-shell">
        <aside class="app-sidebar" id="appSidebar">
          <a href="../index.html" class="brand">
            <span class="brand-mark">RF</span>
            ResumeForge
          </a>
          <nav class="side-nav">
            ${navHtml(active)}
            <div class="sidebar-upgrade">
              <h4>Upgrade to Pro</h4>
              <p>Get unlimited templates, AI tools & more.</p>
              <a href="upgrade.html" class="btn btn-primary btn-sm btn-block">Upgrade Now</a>
            </div>
          </nav>
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
              <div class="user-menu-wrapper">
                <div class="user-menu" id="userMenuTrigger" role="button" aria-haspopup="true" aria-expanded="false" tabindex="0">
                  <div class="avatar" id="userAvatar">··</div>
                  <div>
                    <div class="name" id="userName">Loading…</div>
                    <div class="role" style="font-size: 10px; font-weight: 500; color: var(--ink-500);">Candidate</div>
                  </div>
                  <i class="fa-solid fa-chevron-down" style="font-size:10px; color:var(--ink-400)"></i>
                </div>
                <div class="user-dropdown-menu" id="userDropdownMenu" role="menu">
                  <div class="user-dropdown-header">
                    <div class="dropdown-user-name" id="dropdownUserName">User Account</div>
                    <div class="dropdown-user-email" id="dropdownUserEmail">Candidate</div>
                  </div>
                  <a href="profile.html" class="user-dropdown-item" role="menuitem">
                    <i class="fa-solid fa-user"></i> My Profile
                  </a>
                  <a href="settings.html" class="user-dropdown-item" role="menuitem">
                    <i class="fa-solid fa-gear"></i> Settings
                  </a>
                  <div class="user-dropdown-divider"></div>
                  <button type="button" class="user-dropdown-item logout-item" id="userMenuLogoutBtn" role="menuitem">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main class="app-content" id="appContent"></main>
        </div>

        <div class="mobile-bottom-dock">
          <a href="dashboard.html" class="${active === 'dashboard' ? 'active' : ''}"><i class="fa-solid fa-table-columns"></i><span>Dash</span></a>
          <a href="resume-builder.html" class="${active === 'resume-builder' ? 'active' : ''}"><i class="fa-solid fa-pen-ruler"></i><span>Builder</span></a>
          <a href="ats-checker.html" class="${active === 'ats-checker' ? 'active' : ''}"><i class="fa-solid fa-gauge-high"></i><span>ATS</span></a>
          <a href="ai-assistant.html" class="${active === 'ai-assistant' ? 'active' : ''}"><i class="fa-solid fa-robot"></i><span>AI</span></a>
          <a href="profile.html" class="${active === 'profile' ? 'active' : ''}"><i class="fa-solid fa-user"></i><span>Profile</span></a>
        </div>
      </div>
      <div id="rfToastContainer"></div>
      <div id="rfModalRoot"></div>
    `;

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('appSidebar').classList.toggle('is-open');
    });

    // Theme Toggle Initialization
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('rf_theme', isDark ? 'dark' : 'light');
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      }
    });

    setupUserDropdown();
    loadUser();
  }

  function setupUserDropdown() {
    const trigger = document.getElementById('userMenuTrigger');
    const dropdown = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('userMenuLogoutBtn');

    if (!trigger || !dropdown) return;

    const toggle = (show) => {
      const isOpen = show !== undefined ? show : !dropdown.classList.contains('is-open');
      dropdown.classList.toggle('is-open', isOpen);
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        toggle(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toggle(false);
      }
    });

    logoutBtn?.addEventListener('click', () => {
      toggle(false);
      confirmModal({
        title: 'Log out of ResumeForge?',
        message: 'Are you sure you want to log out of your account and end your current session?',
        confirmText: 'Log Out',
        cancelText: 'Cancel',
        isDanger: true,
        onConfirm: () => {
          ApiService.auth.logout().finally(() => {
            window.location.href = 'login.html';
          });
        }
      });
    });
  }

  async function loadUser() {
    try {
      const { user } = await ApiService.auth.me();
      const nameEl = document.getElementById('userName');
      const avatarEl = document.getElementById('userAvatar');
      const dropNameEl = document.getElementById('dropdownUserName');
      const dropEmailEl = document.getElementById('dropdownUserEmail');
      const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Guest';
      const initials = `${(user?.firstName?.[0] || '').toUpperCase()}${(user?.lastName?.[0] || '').toUpperCase()}` || (user?.email?.[0] || 'U').toUpperCase();
      if (nameEl) nameEl.textContent = fullName;
      if (avatarEl) avatarEl.textContent = initials;
      if (dropNameEl) dropNameEl.textContent = fullName;
      if (dropEmailEl) dropEmailEl.textContent = user?.email || 'Registered Candidate';
    } catch (err) {
      console.warn('Could not load user:', err.message);
    }
  }

  /* ---------------------------------------------------------------------
     Custom Accessible Confirmation Modal
  --------------------------------------------------------------------- */
  function confirmModal({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false,
    onConfirm = null,
    onCancel = null
  } = {}) {
    return new Promise((resolve) => {
      const modalRoot = document.getElementById('rfModalRoot') || document.body;
      const backdrop = document.createElement('div');
      backdrop.className = 'rf-modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');

      const iconClass = isDanger ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-question';
      const iconType = isDanger ? 'danger' : 'info';
      const confirmBtnClass = isDanger ? 'confirm-danger' : 'confirm-primary';

      backdrop.innerHTML = `
        <div class="rf-modal-card">
          <div class="rf-modal-header">
            <div class="rf-modal-icon ${iconType}">
              <i class="${iconClass}"></i>
            </div>
            <div>
              <h3 class="rf-modal-title">${escapeHtml(title)}</h3>
              <p class="rf-modal-message">${escapeHtml(message)}</p>
            </div>
          </div>
          <div class="rf-modal-actions">
            <button type="button" class="rf-modal-btn cancel" id="rfModalCancel">${escapeHtml(cancelText)}</button>
            <button type="button" class="rf-modal-btn ${confirmBtnClass}" id="rfModalConfirm">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      const cleanup = () => {
        document.removeEventListener('keydown', handleKey);
        backdrop.remove();
      };

      const handleConfirm = () => {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        if (typeof onCancel === 'function') onCancel();
        resolve(false);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      };

      backdrop.querySelector('#rfModalConfirm').addEventListener('click', handleConfirm);
      backdrop.querySelector('#rfModalCancel').addEventListener('click', handleCancel);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) handleCancel();
      });

      document.addEventListener('keydown', handleKey);
      modalRoot.appendChild(backdrop);
      backdrop.querySelector('#rfModalConfirm').focus();
    });
  }

  /* ---------------------------------------------------------------------
     Global Toast Notification Helper
  --------------------------------------------------------------------- */
  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('rfToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'rfToastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `rf-toast ${type}`;

    let icon = 'fa-solid fa-circle-info';
    if (type === 'success') icon = 'fa-solid fa-circle-check';
    if (type === 'error') icon = 'fa-solid fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="${icon}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Attach helpers to global window object
  window.showToast = showToast;
  window.confirmModal = confirmModal;

  return {
    render,
    showToast,
    confirmModal
  };
})();

