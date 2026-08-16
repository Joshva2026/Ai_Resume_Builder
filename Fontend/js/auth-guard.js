/**
 * AUTH GUARD
 * Include on every page. Protected pages redirect to login if no token
 * exists; auth pages (login/register) redirect straight to the dashboard
 * if the user is already signed in.
 */
(function () {
  const rawPage = window.location.pathname.split('/').pop() || '';
  const page = rawPage.replace(/\.html$/, '');

  const PROTECTED_PAGES = [
    'dashboard', 'profile', 'resume-builder', 'resume-preview',
    'ats-checker', 'ai-assistant', 'cover-letter', 'my-resumes',
    'download-center', 'settings', 'linkedin-review',
    'job-match', 'job-search', 'applications',
  ];
  const AUTH_PAGES = ['login', 'register'];

  const authed = typeof ApiService !== 'undefined' && ApiService.isAuthenticated();

  if (PROTECTED_PAGES.includes(page) && !authed) {
    window.location.href = 'login.html';
  }
  if (AUTH_PAGES.includes(page) && authed) {
    window.location.href = 'dashboard.html';
  }
})();
