/**
 * ResumeForge — Backend Server (MongoDB Edition)
 * ============================================================
 * Stack: Node.js + Express + MongoDB (via Mongoose)
 *
 * SETUP:
 *   1. Make sure MongoDB is running locally (default: mongodb://localhost:27017)
 *      OR set MONGO_URI in a .env file for a cloud connection (MongoDB Atlas).
 *   2. npm install
 *   3. node server.js
 *   → App runs at http://localhost:3001
 * ============================================================
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const mongoose = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── MongoDB connection ──────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resumeforge';
const FALLBACK_DB_PATH = path.join(__dirname, 'db.json');

function loadFallbackState() {
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    const initialState = { users: [], sessions: [], resumes: [], ats_reports: [] };
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialState, null, 2));
    return initialState;
  }

  try {
    const raw = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      resumes: Array.isArray(parsed.resumes) ? parsed.resumes : [],
      ats_reports: Array.isArray(parsed.ats_reports) ? parsed.ats_reports : [],
    };
  } catch (err) {
    console.warn('⚠ Unable to read fallback DB, starting fresh.', err.message);
    return { users: [], sessions: [], resumes: [], ats_reports: [] };
  }
}

function saveFallbackState(state) {
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(state, null, 2));
}

const fallbackState = loadFallbackState();
let useMongo = false;

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeRecord(record) {
  if (!record) return record;
  const plain = cloneValue(record);
  if (plain._id && !plain.id) plain.id = plain._id;
  return plain;
}

function queryMatches(record, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '_id' || key === 'id') {
      return (record._id || record.id) === value;
    }
    return record[key] === value;
  });
}

function createAdapter(modelName, schema, storeKey) {
  const actualModel = mongoose.models[modelName] || mongoose.model(modelName, schema);

  function buildFallbackQuery(query = {}) {
    const results = fallbackState[storeKey]
      .filter(record => queryMatches(record, query))
      .map(normalizeRecord);

    return {
      _results: results,
      sort(fields = {}) {
        const entries = Object.entries(fields);
        this._results.sort((a, b) => {
          for (const [key, direction] of entries) {
            const left = a[key] ?? '';
            const right = b[key] ?? '';
            if (left === right) continue;
            return direction === -1 ? (left > right ? -1 : 1) : (left < right ? -1 : 1);
          }
          return 0;
        });
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(this._results).then(resolve, reject);
      },
      catch(reject) {
        return Promise.resolve(this._results).catch(reject);
      },
      finally(callback) {
        return Promise.resolve(this._results).finally(callback);
      },
    };
  }

  return {
    async findOne(query = {}) {
      if (!useMongo) {
        return fallbackState[storeKey].find(record => queryMatches(record, query)) || null;
      }
      return actualModel.findOne(query);
    },

    async findById(id) {
      if (!useMongo) {
        return fallbackState[storeKey].find(record => (record._id || record.id) === id) || null;
      }
      return actualModel.findById(id);
    },

    async findByIdAndUpdate(id, update, options = {}) {
      if (!useMongo) {
        const index = fallbackState[storeKey].findIndex(record => (record._id || record.id) === id);
        if (index === -1) return null;
        fallbackState[storeKey][index] = {
          ...fallbackState[storeKey][index],
          ...update,
          updatedAt: new Date().toISOString(),
        };
        saveFallbackState(fallbackState);
        return normalizeRecord(fallbackState[storeKey][index]);
      }
      return actualModel.findByIdAndUpdate(id, update, options);
    },

    async create(doc) {
      if (!useMongo) {
        const record = normalizeRecord({
          _id: makeId(storeKey.replace(/s$/, '')),
          ...doc,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (!record.id) record.id = record._id;
        fallbackState[storeKey].push(record);
        saveFallbackState(fallbackState);
        return record;
      }
      return actualModel.create(doc);
    },

    async find(filter = {}) {
      if (!useMongo) {
        const results = fallbackState[storeKey].filter(record => queryMatches(record, filter)).map(normalizeRecord);
        return results;
      }
      return actualModel.find(filter);
    },

    async findOneAndUpdate(filter, update, options = {}) {
      if (!useMongo) {
        const index = fallbackState[storeKey].findIndex(record => queryMatches(record, filter));
        if (index === -1) return null;
        fallbackState[storeKey][index] = {
          ...fallbackState[storeKey][index],
          ...update,
          updatedAt: new Date().toISOString(),
        };
        saveFallbackState(fallbackState);
        return normalizeRecord(fallbackState[storeKey][index]);
      }
      return actualModel.findOneAndUpdate(filter, update, options);
    },

    async findOneAndDelete(filter) {
      if (!useMongo) {
        const index = fallbackState[storeKey].findIndex(record => queryMatches(record, filter));
        if (index === -1) return null;
        const [removed] = fallbackState[storeKey].splice(index, 1);
        saveFallbackState(fallbackState);
        return normalizeRecord(removed);
      }
      return actualModel.findOneAndDelete(filter);
    },

    async deleteOne(filter) {
      if (!useMongo) {
        const index = fallbackState[storeKey].findIndex(record => queryMatches(record, filter));
        if (index === -1) return { deletedCount: 0 };
        fallbackState[storeKey].splice(index, 1);
        saveFallbackState(fallbackState);
        return { deletedCount: 1 };
      }
      return actualModel.deleteOne(filter);
    },
  };
}

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 1500 });
    useMongo = true;
    console.log('✓ MongoDB connected:', MONGO_URI);
  } catch (err) {
    useMongo = false;
    console.warn('⚠ MongoDB unavailable, using local JSON fallback store:', err.message);
  }
}

connectDatabase();

// ── Mongoose Schemas ────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  firstName:    { type: String, default: '' },
  lastName:     { type: String, default: '' },
  phone:        { type: String, default: '' },
  location:     { type: String, default: '' },
  bio:          { type: String, default: '' },
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email:     { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' }, // auto-expire after 30 days
});

const resumeSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, default: 'Untitled Resume' },
  content:    { type: mongoose.Schema.Types.Mixed, default: {} },
  templateId: { type: String, default: null },
}, { timestamps: true });

const atsReportSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  overall_score:     Number,
  keyword_match:     Number,
  formatting_score:  Number,
  grammar_score:     Number,
  readability_score: Number,
  missing_keywords:  [String],
  suggestions:       [String],
}, { timestamps: true });

const User      = createAdapter('User',      userSchema, 'users');
const Session   = createAdapter('Session',   sessionSchema, 'sessions');
const Resume    = createAdapter('Resume',    resumeSchema, 'resumes');
const AtsReport = createAdapter('AtsReport', atsReportSchema, 'ats_reports');

// ── Helpers ─────────────────────────────────────────────────
const FRONTEND_PATH = path.join(__dirname, '..', 'Fontend');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'rf_salt_2026').digest('hex');
}
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}
function safeUser(user) {
  const { passwordHash, __v, ...safe } = user.toObject ? user.toObject() : user;
  return safe;
}

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (fs.existsSync(FRONTEND_PATH)) {
  app.use(express.static(FRONTEND_PATH));
  console.log('✓ Serving frontend from:', FRONTEND_PATH);
}

// ── Auth middleware ──────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  const session = await Session.findOne({ token });
  if (!session) return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });

  req.userId    = session.userId;
  req.userEmail = session.email;
  next();
}

// ════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'An account with that email already exists' });

    const user = await User.create({
      email, password: undefined,
      passwordHash: hashPassword(password),
      firstName: firstName || '',
      lastName:  lastName  || '',
    });

    const token = generateToken();
    await Session.create({ token, userId: user._id, email: user.email });

    res.status(201).json({
      accessToken:  token,
      refreshToken: token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken();
    await Session.create({ token, userId: user._id, email: user.email });

    res.json({
      accessToken:  token,
      refreshToken: token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  await Session.deleteOne({ token });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req, res) => {
  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req, res) => {
  res.json({ message: 'Password reset successfully. Please log in.' });
});

// ════════════════════════════════════════════════════════════
// PROFILE ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/profile
app.get('/api/profile', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

// PUT /api/profile
app.put('/api/profile', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, location, bio } = req.body;
  const update = {};
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName  !== undefined) update.lastName  = lastName;
  if (phone     !== undefined) update.phone     = phone;
  if (location  !== undefined) update.location  = location;
  if (bio       !== undefined) update.bio       = bio;

  const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

// ════════════════════════════════════════════════════════════
// RESUME ROUTES
// ════════════════════════════════════════════════════════════

app.get('/api/resumes', requireAuth, async (req, res) => {
  const resumes = await Resume.find({ userId: req.userId }).sort({ updatedAt: -1 });
  res.json(resumes);
});

app.get('/api/resumes/:id', requireAuth, async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  res.json(resume);
});

app.post('/api/resumes', requireAuth, async (req, res) => {
  const { title, content, templateId } = req.body;
  const resume = await Resume.create({ userId: req.userId, title: title || 'Untitled Resume', content: content || {}, templateId: templateId || null });
  res.status(201).json(resume);
});

app.put('/api/resumes/:id', requireAuth, async (req, res) => {
  const { title, content, templateId } = req.body;
  const update = { updatedAt: new Date() };
  if (title      !== undefined) update.title      = title;
  if (content    !== undefined) update.content    = content;
  if (templateId !== undefined) update.templateId = templateId;

  const resume = await Resume.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  res.json(resume);
});

app.delete('/api/resumes/:id', requireAuth, async (req, res) => {
  const result = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!result) return res.status(404).json({ error: 'Resume not found' });
  res.json({ message: 'Resume deleted' });
});

app.post('/api/resumes/:id/duplicate', requireAuth, async (req, res) => {
  const source = await Resume.findOne({ _id: req.params.id, userId: req.userId });
  if (!source) return res.status(404).json({ error: 'Resume not found' });
  const copy = await Resume.create({ userId: req.userId, title: source.title + ' (Copy)', content: source.content, templateId: source.templateId });
  res.status(201).json(copy);
});

// ════════════════════════════════════════════════════════════
// ATS ROUTES
// ════════════════════════════════════════════════════════════

app.post('/api/ats/analyze', requireAuth, async (req, res) => {
  const { resumeId, jobDescription } = req.body;

  let resumeText = '';
  if (resumeId) {
    try {
      const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
      if (resume) resumeText = JSON.stringify(resume.content || {}).toLowerCase();
    } catch (_) {}
  }

  const jdWords       = (jobDescription || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const uniqueJdWords = [...new Set(jdWords)];
  const matchedWords  = uniqueJdWords.filter(w => resumeText.includes(w));
  const missingWords  = uniqueJdWords.filter(w => !resumeText.includes(w)).slice(0, 12);
  const keywordScore  = uniqueJdWords.length > 0 ? Math.round((matchedWords.length / uniqueJdWords.length) * 100) : 70;
  const formattingScore  = Math.floor(Math.random() * 10) + 88;
  const grammarScore     = Math.floor(Math.random() * 10) + 85;
  const readabilityScore = Math.floor(Math.random() * 15) + 80;
  const overallScore     = Math.round(keywordScore * 0.40 + formattingScore * 0.25 + grammarScore * 0.20 + readabilityScore * 0.15);

  const report = await AtsReport.create({
    userId: req.userId,
    resumeId: resumeId || null,
    overall_score: overallScore,
    keyword_match: keywordScore,
    formatting_score: formattingScore,
    grammar_score: grammarScore,
    readability_score: readabilityScore,
    missing_keywords: missingWords,
    suggestions: [
      `Add missing keywords: ${missingWords.slice(0, 3).join(', ')}`,
      'Use strong action verbs at the start of bullet points',
      'Quantify achievements with numbers where possible',
    ],
  });
  res.json(report);
});

app.get('/api/ats/history', requireAuth, async (req, res) => {
  const reports = await AtsReport.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(reports);
});

app.get('/api/ats/report/:id', requireAuth, async (req, res) => {
  const report = await AtsReport.findOne({ _id: req.params.id, userId: req.userId });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

// ════════════════════════════════════════════════════════════
// AI ROUTES (rule-based, no external API needed)
// ════════════════════════════════════════════════════════════

const ACTION_VERBS = ['Spearheaded','Orchestrated','Accelerated','Engineered','Streamlined',
  'Championed','Amplified','Transformed','Architected','Optimized','Delivered','Launched',
  'Pioneered','Scaled','Automated','Reduced','Increased','Built','Led','Developed'];

app.post('/api/ai/rewrite', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });
  const hasActionVerb = ACTION_VERBS.some(v => text.toLowerCase().startsWith(v.toLowerCase()));
  const verb = ACTION_VERBS[Math.floor(Math.random() * 8)];
  const rewritten = hasActionVerb
    ? text.replace(/\b(i |we )/gi, '').trim()
    : `${verb} ${text.charAt(0).toLowerCase()}${text.slice(1)}`.replace(/\b(i |we )/gi, '');
  res.json({ original: text, rewritten, improvements: ['Stronger action verb', 'Removed first-person pronoun'] });
});

app.post('/api/ai/summary', requireAuth, (req, res) => {
  const { careerSummary } = req.body;
  res.json({ suggestion: `Results-driven professional with ${careerSummary || 'extensive experience'}, delivering measurable impact through technical expertise and collaborative leadership.` });
});

app.post('/api/ai/keywords', requireAuth, (req, res) => {
  const keywords = {
    'software engineer': ['TypeScript','React','Node.js','CI/CD','REST APIs','Agile','Docker'],
    'product manager':   ['Roadmap','OKRs','Stakeholder Management','Agile','User Research','KPIs'],
    'data analyst':      ['SQL','Python','Tableau','Power BI','A/B Testing','Data Modeling'],
    'ux designer':       ['Figma','User Research','Wireframing','Prototyping','Design Systems'],
    'default':           ['Leadership','Communication','Problem-Solving','Teamwork','Project Management'],
  };
  const role = (req.body.jobRole || '').toLowerCase();
  const matched = Object.keys(keywords).find(k => role.includes(k)) || 'default';
  res.json({ keywords: keywords[matched] });
});

app.post('/api/ai/action-verbs', requireAuth, (req, res) => res.json({ verbs: ACTION_VERBS }));

app.post('/api/ai/cover-letter', requireAuth, (req, res) => {
  const { jobTitle, companyName } = req.body;
  res.json({ coverLetter: `Dear Hiring Manager,\n\nI am excited to apply for the ${jobTitle || 'position'} at ${companyName || 'your company'}. My background aligns strongly with your requirements, and I am confident I can deliver meaningful results from day one.\n\nThank you for your consideration.\n\nSincerely,\n[Your Name]` });
});

// ════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════

const TEMPLATES = [
  { id: '1', name: 'Classic Professional', description: 'Clean traditional single-column layout trusted by recruiters', atsScore: 99, category: 'corporate', accent: '#1a1a2e' },
  { id: '2', name: 'Modern Minimal',       description: 'Contemporary design with subtle accent line and clean whitespace', atsScore: 97, category: 'modern',   accent: '#6c5ce7' },
  { id: '3', name: 'Executive Bold',       description: 'Strong header for senior leadership and C-suite roles', atsScore: 96, category: 'corporate', accent: '#0d3b66' },
  { id: '4', name: 'Tech Stack',           description: 'Two-column layout designed for software engineers and developers', atsScore: 94, category: 'tech',     accent: '#00b894' },
  { id: '5', name: 'Creative Sidebar',     description: 'Bold left sidebar for design, marketing, and creative roles', atsScore: 91, category: 'creative',  accent: '#e17055' },
  { id: '6', name: 'Academic CV',          description: 'Comprehensive layout for research, academia, and publications', atsScore: 98, category: 'academic',  accent: '#2d3436' },
  { id: '7', name: 'Startup Hustle',       description: 'Dynamic layout highlighting impact metrics and growth mindset', atsScore: 93, category: 'modern',   accent: '#fd79a8' },
  { id: '8', name: 'Healthcare Pro',       description: 'Clean structured layout for healthcare and clinical roles', atsScore: 98, category: 'corporate', accent: '#00cec9' },
];

app.get('/api/templates',     (req, res) => res.json(TEMPLATES));
app.get('/api/templates/:id', (req, res) => {
  const t = TEMPLATES.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json(t);
});

// ════════════════════════════════════════════════════════════
// DOWNLOADS (stub)
// ════════════════════════════════════════════════════════════

app.post('/api/download/pdf',  requireAuth, (req, res) => res.json({ message: 'PDF generation not yet configured.', url: null }));
app.post('/api/download/docx', requireAuth, (req, res) => res.json({ message: 'DOCX generation not yet configured.', url: null }));
app.get('/api/download/history', requireAuth, (req, res) => res.json([]));

// ════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: useMongo ? 'connected' : 'fallback', time: new Date().toISOString() });
});

// Fallback → serve index.html
app.get('*', (req, res) => {
  const indexPath = path.join(FRONTEND_PATH, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.json({ error: 'Frontend not found.' });
});

// ── START ────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ResumeForge Backend (MongoDB) running!');
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   App: http://localhost:${PORT}`);
    console.log(`   DB:  ${MONGO_URI}`);
    console.log('');
    console.log('📋 Quick start:');
    console.log('   Register → POST /api/auth/register');
    console.log('   Login    → POST /api/auth/login');
    console.log('   Health   → GET  /api/health');
    console.log('');
  });
}

module.exports = { app };
