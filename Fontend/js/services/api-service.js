/**
 * ResumeForge API SERVICE
 * -----------------------------------------------------------------------
 * Production-ready API client with robust JWT token refresh queue,
 * explicit error propagation (no silent mock fallbacks), and typed endpoints.
 * -----------------------------------------------------------------------
 */

const ApiService = (() => {
  // Production vs Local API URL configuration
  const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
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

  // ── Error class ───────────────────────────────────────────────────────
  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  // ── Token Refresh Mutex Queue ─────────────────────────────────────────
  let refreshPromise = null;

  async function performTokenRefresh() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      clearTokens();
      throw new ApiError('Session expired. Please log in again.', 401);
    }

    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken })
      });

      if (!refreshRes.ok) {
        throw new Error('Refresh rejected');
      }

      const refreshData = await refreshRes.json();
      if (!refreshData.accessToken) {
        throw new Error('No access token in refresh response');
      }

      localStorage.setItem(TOKEN_KEY, refreshData.accessToken);
      return refreshData.accessToken;
    } catch (err) {
      clearTokens();
      if (
        window.location.pathname.includes('/pages/') &&
        !window.location.pathname.includes('login.html') &&
        !window.location.pathname.includes('register.html') &&
        !window.location.pathname.includes('forgot-password.html') &&
        !window.location.pathname.includes('reset-password.html')
      ) {
        window.location.href = 'login.html';
      }
      throw new ApiError('Session expired. Please log in again.', 401);
    } finally {
      refreshPromise = null;
    }
  }

  // ── Core request wrapper ──────────────────────────────────────────────
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
      console.error('[ApiService] Network error connecting to backend:', networkError);
      throw new ApiError('Unable to connect to the server. Please check your internet connection.', 0);
    }

    let data = null;
    try { data = await response.json(); } catch (_) { /* empty body */ }

    // Intercept 401 / 403 TOKEN_EXPIRED to perform single-flight silent refresh
    const isTokenExpired = response.status === 401 || (response.status === 403 && data?.code === 'TOKEN_EXPIRED');
    if (isTokenExpired && auth && localStorage.getItem(REFRESH_KEY) && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh();
      }

      try {
        const newToken = await refreshPromise;
        const retryHeaders = { ...finalHeaders, 'Authorization': `Bearer ${newToken}` };
        return request(path, { method, body, auth, headers: retryHeaders });
      } catch (refreshErr) {
        throw refreshErr;
      }
    }

    if (!response.ok) {
      throw new ApiError(data?.error || `Request failed with status ${response.status}`, response.status, data);
    }

    // Cache user info from login/register responses
    if (data?.accessToken) setTokens(data);
    return data;
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
      try { 
        if (refreshToken) {
          await request('/auth/logout', { method: 'POST', body: { token: refreshToken } });
        }
      } catch (_) {
        // Continue cleanup even if server logout call fails
      } finally { 
        clearTokens(); 
      }
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
        console.error('[ApiService] Upload analysis network failure:', err);
        throw new ApiError('Unable to connect to the server for resume analysis. Please try again.', 0);
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
    generateUpload: async (formData) => {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      try {
        res = await fetch(`${BASE_URL}/cover-letter/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } catch (err) {
        console.error('[ApiService] Cover letter upload network failure:', err);
        throw new ApiError('Unable to connect to the server for cover letter generation. Please try again.', 0);
      }

      let data = null;
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        throw new ApiError(data?.error || `Cover letter upload failed (${res.status})`, res.status, data);
      }
      return data;
    },
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
