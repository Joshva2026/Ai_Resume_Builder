/**
 * API SERVICE
 * -----------------------------------------------------------------------
 * Points at the new simple backend (server.js) running on port 3001.
 * Falls back to localStorage mock mode when the backend is unreachable,
 * so the UI still works during development without a running server.
 * -----------------------------------------------------------------------
 */

const ApiService = (() => {
  // Production vs Local API URL configuration
  const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  // Fallback to a placeholder that should be replaced during actual deployment or via env vars in build step
  const PROD_API_URL = "https://ai-resume-builder-rb1m.onrender.com/api";
  const BASE_URL = IS_PROD ? PROD_API_URL : `http://${window.location.hostname}:5000/api`;

  const TOKEN_KEY = 'rf_access_token';
  const REFRESH_KEY = 'rf_refresh_token';
  const USER_KEY = 'rf_user';

  // ── Token helpers ─────────────────────────────────────────────────────
  function getToken() { return localStorage.getItem(TOKEN_KEY); }

  function setTokens({ accessToken, refreshToken, user }) {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() { return Boolean(getToken()); }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  }

  // ── Core request wrapper ──────────────────────────────────────────────
  let isRefreshing = false;
  let refreshSubscribers = [];

  function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
  }

  function onRefreshed(token) {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
  }

  async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };

    if (auth) {
      const token = getToken();
      if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      console.error('[ApiService] Backend unreachable');
      throw new ApiError('Backend unreachable. Please start the server.', 503);
    }

    let data = null;
    try { data = await response.json(); } catch (_) { /* empty body */ }

    // Intercept 403 (Invalid/Expired token) to perform silent refresh
    if (response.status === 403 && auth && localStorage.getItem(REFRESH_KEY)) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: localStorage.getItem(REFRESH_KEY) })
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.accessToken) {
              localStorage.setItem(TOKEN_KEY, refreshData.accessToken);
              onRefreshed(refreshData.accessToken);
              isRefreshing = false;
            } else {
              throw new Error('Refresh failed');
            }
          } else {
            throw new Error('Refresh failed');
          }
        } catch (refreshErr) {
          isRefreshing = false;
          clearTokens();
          if (window.location.pathname.includes('/pages/') && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
            window.location.href = 'login.html';
          }
          throw new ApiError('Session expired. Please log in again.', 401);
        }
      }

      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          finalHeaders['Authorization'] = `Bearer ${newToken}`;
          resolve(request(path, { method, body, auth, headers: finalHeaders }));
        });
      });
    }

    if (!response.ok) {
      throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data);
    }

    // Cache user info from login/register responses
    if (data?.accessToken) setTokens(data);
    return data;
  }

  // ── LocalStorage mock (runs when backend is offline) ─────────────────
  function mockRequest(path, method, body) {
    const db = JSON.parse(localStorage.getItem('rf_mock_db') || '{"users":[],"resumes":[],"ats_reports":[]}');

    const save = () => localStorage.setItem('rf_mock_db', JSON.stringify(db));
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const now = () => new Date().toISOString();

    // Register
    if (path === '/auth/register' && method === 'POST') {
      const { email, password, firstName, lastName } = body;
      if (db.users.find(u => u.email === email)) throw new ApiError('Email already exists', 409);
      const user = { id: newId(), email, firstName: firstName || '', lastName: lastName || '', password, createdAt: now() };
      db.users.push(user);
      const token = 'mock_' + newId();
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('rf_mock_uid', user.id);
      save();
      return { accessToken: token, refreshToken: token, user };
    }

    // Login
    if (path === '/auth/login' && method === 'POST') {
      const user = db.users.find(u => u.email === body.email && u.password === body.password);
      if (!user) throw new ApiError('Invalid email or password', 401);
      const token = 'mock_' + newId();
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('rf_mock_uid', user.id);
      save();
      return { accessToken: token, refreshToken: token, user };
    }

    const userId = localStorage.getItem('rf_mock_uid');

    // Logout
    if (path === '/auth/logout') { clearTokens(); localStorage.removeItem('rf_mock_uid'); return { message: 'Logged out' }; }

    // Resumes list
    if (path === '/resumes' && method === 'GET') {
      return db.resumes.filter(r => r.userId === userId);
    }
    // Create resume
    if (path === '/resumes' && method === 'POST') {
      const r = { id: newId(), userId, ...body, createdAt: now(), updatedAt: now() };
      db.resumes.push(r); save(); return r;
    }
    // Get / update / delete resume
    const resumeMatch = path.match(/^\/resumes\/([^/]+)$/);
    if (resumeMatch) {
      const id = resumeMatch[1];
      const idx = db.resumes.findIndex(r => r.id === id && r.userId === userId);
      if (method === 'GET') return idx >= 0 ? db.resumes[idx] : (() => { throw new ApiError('Not found', 404); })();
      if (method === 'PUT') { Object.assign(db.resumes[idx], body, { updatedAt: now() }); save(); return db.resumes[idx]; }
      if (method === 'DELETE') { db.resumes.splice(idx, 1); save(); return { message: 'Deleted' }; }
    }

    // ATS history
    if (path === '/ats/history') return db.ats_reports.filter(r => r.userId === userId);
    // ATS analyze
    if (path === '/ats/analyze' && method === 'POST') {
      const report = {
        id: newId(), userId, ...body,
        overall_score: Math.floor(Math.random() * 20) + 75,
        keyword_match: Math.floor(Math.random() * 20) + 70,
        formatting_score: Math.floor(Math.random() * 10) + 88,
        grammar_score: Math.floor(Math.random() * 10) + 85,
        readability_score: Math.floor(Math.random() * 15) + 80,
        missing_keywords: ['Docker', 'CI/CD', 'Kubernetes'],
        suggestions: ['Add missing keywords', 'Use stronger action verbs'],
        createdAt: now(),
      };
      db.ats_reports.push(report); save(); return report;
    }

    // Templates
    if (path === '/templates') return [
      { id: '1', name: 'Professional', atsScore: 98 },
      { id: '2', name: 'Modern', atsScore: 95 },
      { id: '3', name: 'Creative', atsScore: 90 },
      { id: '4', name: 'Academic', atsScore: 97 },
    ];

    // Auth me
    if (path === '/auth/me') {
      const user = db.users.find(u => u.id === userId);
      if (!user) throw new ApiError('Not found', 404);
      return user;
    }

    // Default stub
    return { message: 'Mock response — backend not running', mock: true };
  }

  // ── Error class ───────────────────────────────────────────────────────
  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  }

  // ── AUTH ─────────────────────────────────────────────────────────────
  const auth = {
    async register({ email, password, firstName, lastName }) {
      const data = await request('/auth/register', {
        method: 'POST', auth: false, body: { email, password, firstName, lastName },
      });
      setTokens(data);
      return data;
    },

    async login({ email, password }) {
      const data = await request('/auth/login', {
        method: 'POST', auth: false, body: { email, password },
      });
      setTokens(data);
      return data;
    },

    async logout() {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      try { await request('/auth/logout', { method: 'POST', body: { token: refreshToken } }); }
      finally { clearTokens(); }
    },

    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', auth: false, body: { email } }),
    resetPassword: (token, newPassword) => request('/auth/reset-password', { method: 'POST', auth: false, body: { token, newPassword } }),
    me: () => request('/auth/me'),
  };

  // ── PROFILE ──────────────────────────────────────────────────────────
  const profile = {
    get: () => request('/profile'),
    update: (data) => request('/profile', { method: 'PUT', body: data }),
  };

  // ── RESUMES ──────────────────────────────────────────────────────────
  const resumes = {
    list: () => request('/resumes'),
    get: (id) => request(`/resumes/${id}`),
    create: (data) => request('/resumes', { method: 'POST', body: data }),
    update: (id, data) => request(`/resumes/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/resumes/${id}`, { method: 'DELETE' }),
    duplicate: (id) => request(`/resumes/${id}/duplicate`, { method: 'POST' }),
    getVersions: (id) => request(`/resumes/${id}/versions`),
    getVersion: (id, versionId) => request(`/resumes/${id}/versions/${versionId}`),
    saveVersion: (id) => request(`/resumes/${id}/versions`, { method: 'POST' }),
    restoreVersion: (id, versionId) => request(`/resumes/${id}/versions/${versionId}/restore`, { method: 'POST' }),
  };

  // ── ATS ──────────────────────────────────────────────────────────────
  const ats = {
    analyze: (resumeId, jobDescription) =>
      request('/ats/analyze', { method: 'POST', body: { resumeId, jobDescription } }),
    analyzeUpload: async (formData) => {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      try {
        res = await fetch(`${BASE_URL}/ats/analyze-upload`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } catch (err) {
        throw new ApiError('Backend unreachable. Please check your connection.', 503);
      }

      let data = null;
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        throw new ApiError(data?.error || `Upload analysis failed (${res.status})`, res.status, data);
      }
      return data;
    },
    history: () => request('/ats/history'),
    report: (id) => request(`/ats/report/${id}`),
  };

  // ── AI ───────────────────────────────────────────────────────────────
  const ai = {
    assistant: (messages) => request('/ai/assistant', { method: 'POST', body: { messages } }),
    chat: (message, conversation = [], resumeContext = null, stream = false) => 
      request('/ai/chat', { method: 'POST', body: { message, conversation, resumeContext, stream } }),
    rewrite: (text) => request('/ai/rewrite', { method: 'POST', body: { text } }),
    summary: (careerSummary) => request('/ai/summary', { method: 'POST', body: { careerSummary } }),
    keywords: (jobRole) => request('/ai/keywords', { method: 'POST', body: { jobRole } }),
    actionVerbs: () => request('/ai/action-verbs', { method: 'POST' }),
    optimize: (resumeId) => request('/ai/optimize', { method: 'POST', body: { resumeId } }),
  };



  // ── LINKEDIN ─────────────────────────────────────────────────────────
  const linkedin = {
    review: (profileText) => request('/linkedin/review', { method: 'POST', body: { profileText } }),
    history: () => request('/linkedin/history'),
  };



  // ── JOB MATCH ────────────────────────────────────────────────────────
  const jobMatch = {
    analyze: (resumeId, jobDescription, jobTitle, company) => request('/job-match', { method: 'POST', body: { resumeId, jobDescription, jobTitle, company } }),
    history: () => request('/job-match/history'),
  };

  // ── JOBS ─────────────────────────────────────────────────────────────
  const jobs = {
    search: (q, l) => request(`/jobs/search?q=${encodeURIComponent(q || '')}&l=${encodeURIComponent(l || '')}`),
    saved: {
      list: () => request('/jobs/saved'),
      save: (job) => request('/jobs/saved', { method: 'POST', body: job }),
      remove: (id) => request(`/jobs/saved/${id}`, { method: 'DELETE' }),
    }
  };

  // ── APPLICATIONS ─────────────────────────────────────────────────────
  const applications = {
    list: () => request('/applications'),
    create: (appData) => request('/applications', { method: 'POST', body: appData }),
    update: (id, appData) => request(`/applications/${id}`, { method: 'PUT', body: appData }),
    updateStatus: (id, status) => request(`/applications/${id}/status`, { method: 'PATCH', body: { status } }),
    remove: (id) => request(`/applications/${id}`, { method: 'DELETE' }),
  };

  // ── COVER LETTERS ────────────────────────────────────────────────────
  const coverLetters = {
    generate: (resumeId, jobTitle, companyName, jobDescription) => request('/cover-letter', { method: 'POST', body: { resumeId, jobTitle, companyName, jobDescription } }),
    list: () => request('/cover-letter'),
    get: (id) => request(`/cover-letter/${id}`),
    update: (id, data) => request(`/cover-letter/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/cover-letter/${id}`, { method: 'DELETE' }),
  };

  // ── TEMPLATES ─────────────────────────────────────────────────────────
  const templates = {
    list: () => request('/templates', { auth: false }),
    get: (id) => request(`/templates/${id}`, { auth: false }),
  };

  // ── DOWNLOADS ─────────────────────────────────────────────────────────
  const downloads = {
    pdf: (resumeId) => request('/download/pdf', { method: 'POST', body: { resumeId } }),
    docx: (resumeId) => request('/download/docx', { method: 'POST', body: { resumeId } }),
    history: () => request('/download/history'),
  };

  return {
    BASE_URL,
    isAuthenticated,
    getToken,
    getUser,
    clearTokens,
    ApiError,
    auth,
    profile,
    resumes,
    ats,
    ai,
    linkedin,
    jobMatch,
    jobs,
    applications,
    coverLetters,
    templates,
    downloads,
  };
})();
