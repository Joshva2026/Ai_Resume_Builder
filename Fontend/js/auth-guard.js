/**
 * AUTH GUARD
 * Include on every page. Protected pages redirect to login if no token
 * exists; auth pages (login/register) redirect straight to the dashboard
 * if the user is already signed in.
 */
(function () {
  const PROTECTED_PAGES = [
    'dashboard.html', 'profile.html', 'resume-builder.html', 'resume-preview.html',
    'ats-checker.html', 'ai-assistant.html', 'cover-letter.html', 'my-resumes.html',
    'download-center.html', 'settings.html',
  ];
  const AUTH_PAGES = ['login.html', 'register.html'];

  const page = window.location.pathname.split('/').pop();
  const authed = typeof ApiService !== 'undefined' && ApiService.isAuthenticated();

  if (PROTECTED_PAGES.includes(page) && !authed) {
    window.location.href = 'login.html';
  }
  if (AUTH_PAGES.includes(page) && authed) {
    window.location.href = 'dashboard.html';
  }
})();
