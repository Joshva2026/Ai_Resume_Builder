/**
 * In-Memory Database Fallback Engine for AI Resume Builder
 * Provides an in-memory SQL execution layer when MySQL is offline or unconfigured.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

class InMemoryDatabase {
  constructor() {
    this.tables = {
      users: [],
      profiles: [],
      resumes: [],
      resume_versions: [],
      ats_reports: [],
      password_resets: [],
      cover_letters: [],
      templates: [],
      downloads: [],
      refresh_tokens: [],
      settings: [],
      portfolios: [],
      portfolio_projects: [],
      portfolio_skills: [],
      portfolio_experience: [],
      portfolio_education: [],
      job_matches: [],
      applications: [],
      linkedin_reviews: []
    };
    this.counters = {};
    for (const key of Object.keys(this.tables)) {
      this.counters[key] = 1;
    }
    
    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seedDefaults();
      this.saveToDisk();
    } else {
      this.ensureSeedUsers();
      this.saveToDisk();
    }
  }

  saveToDisk() {
    try {
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dataFile = path.join(dataDir, 'db-store.json');
      fs.writeFileSync(dataFile, JSON.stringify({
        tables: this.tables,
        counters: this.counters
      }, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[InMemoryDB] Could not save state to disk:', err.message);
    }
  }

  loadFromDisk() {
    try {
      const dataFile = path.join(__dirname, 'data', 'db-store.json');
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.tables && parsed.counters) {
          this.tables = Object.assign(this.tables, parsed.tables);
          this.counters = Object.assign(this.counters, parsed.counters);
          return true;
        }
      }
    } catch (err) {
      console.warn('[InMemoryDB] Could not load state from disk:', err.message);
    }
    return false;
  }

  ensureSeedUsers() {
    const demoPasswordHash = bcrypt.hashSync('Demo1234!', 10);
    if (!this.tables.users.some(u => (u.email || '').toLowerCase() === 'demo@resumeforge.dev')) {
      this.tables.users.push({
        id: this.counters.users++,
        email: 'demo@resumeforge.dev',
        password_hash: demoPasswordHash,
        first_name: 'Alex',
        last_name: 'Morgan',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: 1
      });
    }
    if (!this.tables.users.some(u => (u.email || '').toLowerCase() === 'joshva756@gmail.com')) {
      this.tables.users.push({
        id: this.counters.users++,
        email: 'joshva756@gmail.com',
        password_hash: demoPasswordHash,
        first_name: 'Joshva',
        last_name: 'Candidate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: 1
      });
    }
  }

  seedDefaults() {
    // Seed default demo user: demo@resumeforge.dev / Demo1234!
    const demoPasswordHash = bcrypt.hashSync('Demo1234!', 10);
    const demoUser = {
      id: 1,
      email: 'demo@resumeforge.dev',
      password_hash: demoPasswordHash,
      first_name: 'Alex',
      last_name: 'Morgan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: 1
    };

    // Seed joshva756 user: joshva756@gmail.com / Demo1234!
    const joshvaUser = {
      id: 2,
      email: 'joshva756@gmail.com',
      password_hash: demoPasswordHash,
      first_name: 'Joshva',
      last_name: 'Candidate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: 1
    };

    this.tables.users.push(demoUser, joshvaUser);
    this.counters.users = 3;

    this.tables.profiles.push({
      id: 1,
      user_id: 1,
      phone: '+1 (555) 234-5678',
      location: 'San Francisco, CA',
      bio: 'Senior Software Engineer specializing in modern web platforms and distributed cloud systems.',
      profile_image_url: '',
      linkedin_url: 'https://linkedin.com/in/alexmorgan-dev',
      portfolio_url: 'https://alexmorgan.dev',
      github_url: 'https://github.com/alexmorgan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    this.tables.profiles.push({
      id: 2,
      user_id: 2,
      phone: '+1 (555) 345-6789',
      location: 'New York, NY',
      bio: 'Full-Stack Software Engineer & AI Resume Creator.',
      profile_image_url: '',
      linkedin_url: 'https://linkedin.com/in/joshva',
      portfolio_url: 'https://joshva.dev',
      github_url: 'https://github.com/joshva756',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    this.counters.profiles = 3;

    // Seed default demo resume
    const demoResumeContent = {
      personal: {
        fullName: 'Alex Morgan',
        headline: 'Senior Full-Stack Engineer | React • Node.js • Cloud Architecture',
        email: 'alex.morgan@example.com',
        phone: '+1 (555) 234-5678',
        location: 'San Francisco, CA',
        link: 'https://alexmorgan.dev',
        github: 'https://github.com/alexmorgan'
      },
      summary: 'Results-driven Senior Full-Stack Engineer with 6+ years of experience designing, scaling, and maintaining high-throughput web applications. Expert in TypeScript, React, Node.js, and cloud deployments with a focus on latency reduction and developer productivity.',
      skills: 'JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MySQL, Redis, AWS, Docker, Git, REST APIs, GraphQL, Tailwind CSS, Jest, CI/CD',
      experience: [
        {
          company: 'CloudScale Technologies',
          position: 'Lead Full-Stack Engineer',
          role: 'Lead Full-Stack Engineer',
          title: 'Lead Full-Stack Engineer',
          location: 'San Francisco, CA',
          startDate: '2022-03',
          endDate: 'Present',
          start: '2022-03',
          end: 'Present',
          current: true,
          description: 'Spearheaded migration of legacy monolith to distributed microservices, reducing API response latency by 45%.\nArchitected real-time analytics dashboard used by over 50,000 active enterprise users.\nMentored a team of 8 engineers and instituted automated CI/CD quality gates, cutting regression defect rates by 35%.'
        },
        {
          company: 'Nexus Software Labs',
          position: 'Senior Software Engineer',
          role: 'Senior Software Engineer',
          title: 'Senior Software Engineer',
          location: 'Remote',
          startDate: '2019-06',
          endDate: '2022-02',
          start: '2019-06',
          end: '2022-02',
          current: false,
          description: 'Engineered responsive full-stack applications with React, Node.js, and PostgreSQL.\nOptimized database indexing and SQL query execution plans, improving throughput by 60%.'
        }
      ],
      education: [
        {
          institution: 'University of California, Berkeley',
          school: 'University of California, Berkeley',
          degree: 'Bachelor of Science in Computer Science',
          startDate: '2015-09',
          endDate: '2019-05',
          start: '2015',
          end: '2019',
          gpa: '3.85',
          description: 'Focus in Distributed Systems, Algorithms, and Software Engineering Principles.'
        }
      ],
      projects: [
        {
          title: 'Real-Time Resume Analytics Engine',
          name: 'Real-Time Resume Analytics Engine',
          description: 'Built high-concurrency ATS parsing engine analyzing keywords, formatting, and grammar scores in sub-200ms.',
          technologies: 'Node.js, Express, React, Tailwind CSS, Docker',
          link: 'https://github.com/alexmorgan/ats-engine',
          github: 'https://github.com/alexmorgan/ats-engine'
        }
      ],
      certifications: 'AWS Certified Solutions Architect – Associate, Certified Kubernetes Application Developer (CKAD)',
      achievements: 'Winner – Global Hackathon 2021 (1st Place out of 400 teams)',
      styling: {
        template: 'classic-ats',
        font: "'Inter', sans-serif",
        fontSize: 10,
        headingSize: 14,
        subheadingSize: 11,
        lineSpacing: 1.5,
        sectionSpacing: 12,
        pSpacing: 6,
        marginSize: 20
      }
    };

    this.tables.resumes.push({
      id: 1,
      user_id: 1,
      title: 'Senior Software Engineer Resume',
      content: JSON.stringify(demoResumeContent),
      template_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_primary: 1,
      original_filename: null,
      source: 'builder',
      raw_text: null
    });
    this.counters.resumes = 2;

    this.tables.resume_versions.push({
      id: 1,
      resume_id: 1,
      version_number: 1,
      content: JSON.stringify(demoResumeContent),
      created_at: new Date().toISOString()
    });
    this.counters.resume_versions = 2;

    // Seed templates
    const templatesList = [
      { id: 1, name: 'Classic ATS', description: 'Standard block layout, strictly parsed by automated recruitment scanners.', category: 'Classic ATS', structure: {} },
      { id: 2, name: 'Minimal ATS', description: 'Very clean, no borders, left-aligned standard layout.', category: 'Classic ATS', structure: {} },
      { id: 3, name: 'Corporate ATS', description: 'Heavy lines and clearly defined structured headers.', category: 'Classic ATS', structure: {} },
      { id: 4, name: 'Modern Professional', description: 'Left sidebar for skills/contact with clean right body layout.', category: 'Modern', structure: {} },
      { id: 5, name: 'Modern Minimal', description: 'Grid-based header with minimal structured body.', category: 'Modern', structure: {} },
      { id: 6, name: 'Technical', description: 'Monospace elements optimized for engineering and developer roles.', category: 'Technical', structure: {} },
      { id: 7, name: 'Software Engineer', description: 'Code-like brackets and clean developer layout.', category: 'Technical', structure: {} },
      { id: 8, name: 'Fresher', description: 'Focus on education, coursework, and academic projects.', category: 'Fresher', structure: {} },
      { id: 9, name: 'Executive', description: 'Authoritative, distinguished layout best suited for leadership and senior management.', category: 'Executive', structure: {} }
    ];

    for (const tmpl of templatesList) {
      this.tables.templates.push({
        id: tmpl.id,
        name: tmpl.name,
        description: tmpl.description,
        thumbnail_url: '',
        category: tmpl.category,
        structure: JSON.stringify(tmpl.structure),
        created_at: new Date().toISOString(),
        is_active: 1
      });
    }
    this.counters.templates = templatesList.length + 1;
  }

  async executeQuery(sql, params = []) {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // Table DDL / migrations
    if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE DATABASE') || upper.startsWith('ALTER TABLE') || upper.startsWith('SHOW COLUMNS')) {
      return [[]];
    }

    // 1. SELECT queries
    if (upper.startsWith('SELECT')) {
      return [this.handleSelect(trimmed, params)];
    }

    // 2. INSERT queries
    if (upper.startsWith('INSERT INTO')) {
      const res = this.handleInsert(trimmed, params);
      this.saveToDisk();
      return [res];
    }

    // 3. UPDATE queries
    if (upper.startsWith('UPDATE')) {
      const res = this.handleUpdate(trimmed, params);
      this.saveToDisk();
      return [res];
    }

    // 4. DELETE queries
    if (upper.startsWith('DELETE FROM')) {
      const res = this.handleDelete(trimmed, params);
      this.saveToDisk();
      return [res];
    }

    return [[]];
  }

  handleSelect(sql, params) {
    const upper = sql.toUpperCase();

    // Users by email or username
    if (upper.includes('FROM USERS WHERE EMAIL =') || upper.includes('FROM USERS WHERE EMAIL') || upper.includes('FROM USERS WHERE LOWER(EMAIL)')) {
      const input = (params[0] || '').toString().trim().toLowerCase();
      const user = this.tables.users.find(u => {
        const uEmail = (u.email || '').toLowerCase();
        if (uEmail === input) return true;
        const uName = uEmail.split('@')[0];
        if (uName === input) return true;
        const first = (u.first_name || '').toLowerCase();
        const full = `${first} ${(u.last_name || '').toLowerCase()}`.trim();
        if (first && first === input) return true;
        if (full && full === input) return true;
        return false;
      });
      return user ? [user] : [];
    }

    // Users by id
    if (upper.includes('FROM USERS WHERE ID =') || upper.includes('FROM USERS WHERE ID')) {
      const id = Number(params[0]);
      const user = this.tables.users.find(u => u.id === id);
      return user ? [user] : [];
    }

    // Combined profile + user query
    if (upper.includes('FROM USERS U') && upper.includes('LEFT JOIN PROFILES P')) {
      const id = Number(params[0]);
      const user = this.tables.users.find(u => u.id === id);
      if (!user) return [];
      const profile = this.tables.profiles.find(p => p.user_id === id) || {};
      return [{
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: profile.phone || '',
        location: profile.location || '',
        bio: profile.bio || '',
        profile_image_url: profile.profile_image_url || '',
        linkedin_url: profile.linkedin_url || '',
        portfolio_url: profile.portfolio_url || '',
        github_url: profile.github_url || ''
      }];
    }

    // Profiles by user_id
    if (upper.includes('FROM PROFILES WHERE USER_ID =') || upper.includes('FROM PROFILES WHERE USER_ID')) {
      const userId = Number(params[0]);
      const profile = this.tables.profiles.find(p => p.user_id === userId);
      return profile ? [profile] : [];
    }

    // Refresh tokens check
    if (upper.includes('FROM REFRESH_TOKENS WHERE TOKEN =') || upper.includes('FROM REFRESH_TOKENS WHERE TOKEN')) {
      const token = params[0];
      const rt = this.tables.refresh_tokens.find(r => r.token === token);
      return rt ? [rt] : [];
    }

    // Password resets check
    if (upper.includes('FROM PASSWORD_RESETS WHERE TOKEN_HASH =') || upper.includes('FROM PASSWORD_RESETS WHERE TOKEN_HASH')) {
      const tokenHash = params[0];
      const reset = this.tables.password_resets.find(r => r.token_hash === tokenHash && !r.used);
      return reset ? [reset] : [];
    }

    // Resumes list for user
    if (upper.includes('FROM RESUMES WHERE USER_ID =') && !upper.includes('ID = ? AND USER_ID = ?') && !upper.includes('WHERE ID = ? AND USER_ID = ?')) {
      const userId = Number(params[0]);
      const list = this.tables.resumes
        .filter(r => r.user_id === userId)
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      return list;
    }

    // Single resume for user
    if (upper.includes('FROM RESUMES WHERE ID = ? AND USER_ID = ?') || upper.includes('FROM RESUMES WHERE ID =') && upper.includes('USER_ID =')) {
      const resumeId = Number(params[0]);
      const userId = Number(params[1]);
      const resume = this.tables.resumes.find(r => r.id === resumeId && r.user_id === userId);
      return resume ? [resume] : [];
    }

    // Single resume by ID (e.g. for preview/pdf)
    if (upper.includes('FROM RESUMES WHERE ID = ?') || upper.includes('FROM RESUMES WHERE ID =')) {
      const resumeId = Number(params[0]);
      const resume = this.tables.resumes.find(r => r.id === resumeId);
      return resume ? [resume] : [];
    }

    // Resume versions list
    if (upper.includes('FROM RESUME_VERSIONS WHERE RESUME_ID =') && upper.includes('ORDER BY VERSION_NUMBER DESC')) {
      const resumeId = Number(params[0]);
      return this.tables.resume_versions
        .filter(v => v.resume_id === resumeId)
        .sort((a, b) => b.version_number - a.version_number);
    }

    // Resume version max
    if (upper.includes('MAX(VERSION_NUMBER)') && upper.includes('FROM RESUME_VERSIONS')) {
      const resumeId = Number(params[0]);
      const versions = this.tables.resume_versions.filter(v => v.resume_id === resumeId);
      const max_v = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) : 0;
      return [{ max_v }];
    }

    // Single resume version
    if (upper.includes('FROM RESUME_VERSIONS WHERE RESUME_ID =') && upper.includes('VERSION_NUMBER =')) {
      const resumeId = Number(params[0]);
      const versionNum = Number(params[1]);
      const v = this.tables.resume_versions.find(x => x.resume_id === resumeId && x.version_number === versionNum);
      return v ? [v] : [];
    }

    // Templates list
    if (upper.includes('FROM TEMPLATES')) {
      if (upper.includes('WHERE ID = ?')) {
        const id = Number(params[0]);
        const tmpl = this.tables.templates.find(t => t.id === id);
        return tmpl ? [tmpl] : [];
      }
      return this.tables.templates.filter(t => t.is_active);
    }

    // ATS Reports history
    if (upper.includes('FROM ATS_REPORTS') && upper.includes('JOIN RESUMES')) {
      const userId = Number(params[0]);
      const userResumes = new Set(this.tables.resumes.filter(r => r.user_id === userId).map(r => r.id));
      const reports = this.tables.ats_reports
        .filter(ar => userResumes.has(ar.resume_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return reports;
    }

    // Single ATS Report
    if (upper.includes('FROM ATS_REPORTS WHERE ID = ?') || upper.includes('FROM ATS_REPORTS WHERE RESUME_ID = ?')) {
      const id = Number(params[0]);
      const report = this.tables.ats_reports.find(r => r.id === id || r.resume_id === id);
      return report ? [report] : [];
    }

    // Cover letters list
    if (upper.includes('FROM COVER_LETTERS WHERE USER_ID =')) {
      const userId = Number(params[0]);
      if (upper.includes('WHERE ID = ? AND USER_ID = ?')) {
        const id = Number(params[0]);
        const uid = Number(params[1]);
        const cl = this.tables.cover_letters.find(c => c.id === id && c.user_id === uid);
        return cl ? [cl] : [];
      }
      return this.tables.cover_letters
        .filter(c => c.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Single cover letter
    if (upper.includes('FROM COVER_LETTERS WHERE ID = ? AND USER_ID = ?')) {
      const id = Number(params[0]);
      const uid = Number(params[1]);
      const cl = this.tables.cover_letters.find(c => c.id === id && c.user_id === uid);
      return cl ? [cl] : [];
    }

    // Applications list
    if (upper.includes('FROM APPLICATIONS WHERE USER_ID =')) {
      const userId = Number(params[0]);
      return this.tables.applications
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Single application
    if (upper.includes('FROM APPLICATIONS WHERE ID = ? AND USER_ID = ?')) {
      const id = Number(params[0]);
      const uid = Number(params[1]);
      const app = this.tables.applications.find(a => a.id === id && a.user_id === uid);
      return app ? [app] : [];
    }

    // LinkedIn reviews
    if (upper.includes('FROM LINKEDIN_REVIEWS WHERE USER_ID =')) {
      const userId = Number(params[0]);
      return this.tables.linkedin_reviews
        .filter(lr => lr.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    }

    // Job matches
    if (upper.includes('FROM JOB_MATCHES WHERE USER_ID =')) {
      const userId = Number(params[0]);
      return this.tables.job_matches
        .filter(jm => jm.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    }

    // Downloads history
    if (upper.includes('FROM DOWNLOADS') && upper.includes('JOIN RESUMES')) {
      const userId = Number(params[0]);
      const userResumes = new Set(this.tables.resumes.filter(r => r.user_id === userId).map(r => r.id));
      return this.tables.downloads
        .filter(d => userResumes.has(d.resume_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);
    }

    // Settings
    if (upper.includes('FROM SETTINGS WHERE USER_ID =')) {
      const userId = Number(params[0]);
      const s = this.tables.settings.find(st => st.user_id === userId);
      return s ? [s] : [];
    }

    // Generic fallback for any other table
    for (const [tblName, rows] of Object.entries(this.tables)) {
      if (upper.includes(`FROM ${tblName.toUpperCase()}`)) {
        return rows;
      }
    }

    return [];
  }

  handleInsert(sql, params) {
    const upper = sql.toUpperCase();

    // Users
    if (upper.includes('INTO USERS')) {
      const id = this.counters.users++;
      const user = {
        id,
        email: params[0],
        password_hash: params[1],
        first_name: params[2] || '',
        last_name: params[3] || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: 1
      };
      this.tables.users.push(user);
      return { insertId: id, affectedRows: 1 };
    }

    // Profiles
    if (upper.includes('INTO PROFILES')) {
      const userId = Number(params[0]);
      const existing = this.tables.profiles.find(p => p.user_id === userId);
      if (existing) {
        if (params.length >= 8) {
          existing.phone = params[1] || '';
          existing.location = params[2] || '';
          existing.bio = params[3] || '';
          existing.profile_image_url = params[4] || '';
          existing.linkedin_url = params[5] || '';
          existing.portfolio_url = params[6] || '';
          existing.github_url = params[7] || '';
        }
        existing.updated_at = new Date().toISOString();
        return { insertId: existing.id, affectedRows: 1 };
      }
      const id = this.counters.profiles++;
      const profile = {
        id,
        user_id: userId,
        phone: params[1] || '',
        location: params[2] || '',
        bio: params[3] || '',
        profile_image_url: params[4] || '',
        linkedin_url: params[5] || '',
        portfolio_url: params[6] || '',
        github_url: params[7] || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.tables.profiles.push(profile);
      return { insertId: id, affectedRows: 1 };
    }

    // Resumes
    if (upper.includes('INTO RESUMES')) {
      const id = this.counters.resumes++;
      let resume;
      if (upper.includes('ORIGINAL_FILENAME')) {
        // [req.user.id, resumeTitle, JSON.stringify(resumeContentObj), false, req.file.originalname, 'upload', textContent]
        resume = {
          id,
          user_id: Number(params[0]),
          title: params[1],
          content: params[2],
          template_id: null,
          is_primary: params[3] ? 1 : 0,
          original_filename: params[4] || null,
          source: params[5] || 'builder',
          raw_text: params[6] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else {
        // [req.user.id, title, JSON.stringify(content), templateId || null, true]
        resume = {
          id,
          user_id: Number(params[0]),
          title: params[1],
          content: params[2],
          template_id: params[3] || null,
          is_primary: params[4] ? 1 : 0,
          original_filename: null,
          source: 'builder',
          raw_text: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      this.tables.resumes.push(resume);
      return { insertId: id, affectedRows: 1 };
    }

    // Resume versions
    if (upper.includes('INTO RESUME_VERSIONS')) {
      const id = this.counters.resume_versions++;
      const v = {
        id,
        resume_id: Number(params[0]),
        version_number: Number(params[1]),
        content: params[2],
        created_at: new Date().toISOString()
      };
      this.tables.resume_versions.push(v);
      return { insertId: id, affectedRows: 1 };
    }

    // ATS Reports
    if (upper.includes('INTO ATS_REPORTS')) {
      const id = this.counters.ats_reports++;
      const report = {
        id,
        resume_id: params[0] ? Number(params[0]) : null,
        overall_score: Number(params[1] || 0),
        keyword_match: Number(params[2] || 0),
        formatting_score: Number(params[3] || 0),
        grammar_score: Number(params[4] || 0),
        readability_score: Number(params[5] || 0),
        missing_keywords: params[6] || null,
        suggestions: params[7] || null,
        detailed_feedback: params[8] || null,
        created_at: new Date().toISOString()
      };
      this.tables.ats_reports.push(report);
      return { insertId: id, affectedRows: 1 };
    }

    // Refresh Tokens
    if (upper.includes('INTO REFRESH_TOKENS')) {
      const id = this.counters.refresh_tokens++;
      const userId = Number(params[0]);
      const token = params[1];
      const existing = this.tables.refresh_tokens.find(r => r.user_id === userId);
      if (existing) {
        existing.token = token;
        existing.expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
        existing.is_revoked = 0;
        return { insertId: existing.id, affectedRows: 1 };
      }
      this.tables.refresh_tokens.push({
        id,
        user_id: userId,
        token,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        is_revoked: 0
      });
      return { insertId: id, affectedRows: 1 };
    }

    // Password resets
    if (upper.includes('INTO PASSWORD_RESETS')) {
      const id = this.counters.password_resets++;
      this.tables.password_resets.push({
        id,
        user_id: Number(params[0]),
        token_hash: params[1],
        expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
        used: 0,
        created_at: new Date().toISOString()
      });
      return { insertId: id, affectedRows: 1 };
    }

    // Cover letters
    if (upper.includes('INTO COVER_LETTERS')) {
      const id = this.counters.cover_letters++;
      const cl = {
        id,
        user_id: Number(params[0]),
        resume_id: params[1] ? Number(params[1]) : null,
        title: params[2],
        content: params[3],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.tables.cover_letters.push(cl);
      return { insertId: id, affectedRows: 1 };
    }

    // Applications
    if (upper.includes('INTO APPLICATIONS')) {
      const id = this.counters.applications++;
      const app = {
        id,
        user_id: Number(params[0]),
        company: params[1] || '',
        title: params[2] || '',
        url: params[3] || '',
        status: params[4] || 'Wishlist',
        applied_date: params[5] || null,
        interview_date: params[6] || null,
        notes: params[7] || '',
        resume_id: params[8] ? Number(params[8]) : null,
        created_at: new Date().toISOString()
      };
      this.tables.applications.push(app);
      return { insertId: id, affectedRows: 1 };
    }

    // LinkedIn Reviews
    if (upper.includes('INTO LINKEDIN_REVIEWS')) {
      const id = this.counters.linkedin_reviews++;
      this.tables.linkedin_reviews.push({
        id,
        user_id: Number(params[0]),
        score: Number(params[1] || 0),
        suggestions: params[2],
        details: params[3],
        created_at: new Date().toISOString()
      });
      return { insertId: id, affectedRows: 1 };
    }

    // Job matches
    if (upper.includes('INTO JOB_MATCHES')) {
      const id = this.counters.job_matches++;
      this.tables.job_matches.push({
        id,
        user_id: Number(params[0]),
        resume_id: Number(params[1]),
        job_title: params[2],
        company: params[3],
        match_percentage: Number(params[4] || 0),
        strong_matches: params[5],
        missing_matches: params[6],
        recommendations: params[7],
        created_at: new Date().toISOString()
      });
      return { insertId: id, affectedRows: 1 };
    }

    // Downloads
    if (upper.includes('INTO DOWNLOADS')) {
      const id = this.counters.downloads++;
      this.tables.downloads.push({
        id,
        resume_id: Number(params[0]),
        format: params[1] || 'pdf',
        file_url: params[2] || '',
        created_at: new Date().toISOString()
      });
      return { insertId: id, affectedRows: 1 };
    }

    return { insertId: 1, affectedRows: 1 };
  }

  handleUpdate(sql, params) {
    const upper = sql.toUpperCase();

    // Update users password
    if (upper.includes('UPDATE USERS SET PASSWORD_HASH =')) {
      const passwordHash = params[0];
      const userId = Number(params[1]);
      const user = this.tables.users.find(u => u.id === userId);
      if (user) {
        user.password_hash = passwordHash;
        user.updated_at = new Date().toISOString();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    // Update users email / names
    if (upper.includes('UPDATE USERS SET EMAIL =')) {
      const email = params[0];
      const firstName = params[1];
      const lastName = params[2];
      const userId = Number(params[3]);
      const user = this.tables.users.find(u => u.id === userId);
      if (user) {
        user.email = email;
        user.first_name = firstName;
        user.last_name = lastName;
        user.updated_at = new Date().toISOString();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    if (upper.includes('UPDATE USERS SET FIRST_NAME =')) {
      const firstName = params[0];
      const lastName = params[1];
      const userId = Number(params[2]);
      const user = this.tables.users.find(u => u.id === userId);
      if (user) {
        user.first_name = firstName;
        user.last_name = lastName;
        user.updated_at = new Date().toISOString();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    // Update password resets used
    if (upper.includes('UPDATE PASSWORD_RESETS SET USED = TRUE')) {
      if (upper.includes('WHERE USER_ID =')) {
        const userId = Number(params[0]);
        this.tables.password_resets
          .filter(r => r.user_id === userId)
          .forEach(r => { r.used = 1; });
        return { affectedRows: 1 };
      }
      if (upper.includes('WHERE ID =')) {
        const id = Number(params[0]);
        const r = this.tables.password_resets.find(x => x.id === id);
        if (r) r.used = 1;
        return { affectedRows: 1 };
      }
    }

    // Update resumes
    if (upper.includes('UPDATE RESUMES SET TITLE =') || upper.includes('UPDATE RESUMES SET')) {
      // [title, JSON.stringify(content), templateId || null, id, req.user.id]
      const title = params[0];
      const content = params[1];
      const templateId = params[2];
      const id = Number(params[3]);
      const userId = Number(params[4]);
      const resume = this.tables.resumes.find(r => r.id === id && r.user_id === userId);
      if (resume) {
        resume.title = title;
        resume.content = content;
        if (templateId !== undefined) resume.template_id = templateId;
        resume.updated_at = new Date().toISOString();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    // Update cover letters
    if (upper.includes('UPDATE COVER_LETTERS SET TITLE =')) {
      const title = params[0];
      const content = params[1];
      const id = Number(params[2]);
      const userId = Number(params[3]);
      const cl = this.tables.cover_letters.find(c => c.id === id && c.user_id === userId);
      if (cl) {
        cl.title = title;
        cl.content = content;
        cl.updated_at = new Date().toISOString();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    // Update applications
    if (upper.includes('UPDATE APPLICATIONS SET')) {
      if (upper.includes('SET STATUS =')) {
        const status = params[0];
        const id = Number(params[1]);
        const userId = Number(params[2]);
        const app = this.tables.applications.find(a => a.id === id && a.user_id === userId);
        if (app) {
          app.status = status;
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }
      const company = params[0];
      const title = params[1];
      const url = params[2];
      const status = params[3];
      const appliedDate = params[4];
      const interviewDate = params[5];
      const notes = params[6];
      const resumeId = params[7];
      const id = Number(params[8]);
      const userId = Number(params[9]);
      const app = this.tables.applications.find(a => a.id === id && a.user_id === userId);
      if (app) {
        app.company = company;
        app.title = title;
        app.url = url;
        app.status = status;
        app.applied_date = appliedDate;
        app.interview_date = interviewDate;
        app.notes = notes;
        app.resume_id = resumeId;
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    return { affectedRows: 1 };
  }

  handleDelete(sql, params) {
    const upper = sql.toUpperCase();

    // Delete refresh tokens
    if (upper.includes('FROM REFRESH_TOKENS WHERE TOKEN =')) {
      const token = params[0];
      this.tables.refresh_tokens = this.tables.refresh_tokens.filter(r => r.token !== token);
      return { affectedRows: 1 };
    }
    if (upper.includes('FROM REFRESH_TOKENS WHERE USER_ID =')) {
      const userId = Number(params[0]);
      this.tables.refresh_tokens = this.tables.refresh_tokens.filter(r => r.user_id !== userId);
      return { affectedRows: 1 };
    }

    // Delete resume
    if (upper.includes('FROM RESUMES WHERE ID = ? AND USER_ID = ?')) {
      const id = Number(params[0]);
      const userId = Number(params[1]);
      const beforeLen = this.tables.resumes.length;
      this.tables.resumes = this.tables.resumes.filter(r => !(r.id === id && r.user_id === userId));
      return { affectedRows: beforeLen - this.tables.resumes.length };
    }

    // Delete cover letter
    if (upper.includes('FROM COVER_LETTERS WHERE ID = ? AND USER_ID = ?')) {
      const id = Number(params[0]);
      const userId = Number(params[1]);
      const beforeLen = this.tables.cover_letters.length;
      this.tables.cover_letters = this.tables.cover_letters.filter(c => !(c.id === id && c.user_id === userId));
      return { affectedRows: beforeLen - this.tables.cover_letters.length };
    }

    // Delete application
    if (upper.includes('FROM APPLICATIONS WHERE ID = ? AND USER_ID = ?')) {
      const id = Number(params[0]);
      const userId = Number(params[1]);
      const beforeLen = this.tables.applications.length;
      this.tables.applications = this.tables.applications.filter(a => !(a.id === id && a.user_id === userId));
      return { affectedRows: beforeLen - this.tables.applications.length };
    }

    return { affectedRows: 1 };
  }
}

const inMemoryDbInstance = new InMemoryDatabase();

function createDatabaseProxy(realPool, hasConfiguredDb = false) {
  let isRealDbWorking = false;

  return {
    async getConnection() {
      if (hasConfiguredDb && realPool) {
        try {
          const conn = await realPool.getConnection();
          isRealDbWorking = true;
          return conn;
        } catch (err) {
          isRealDbWorking = false;
        }
      }

      // Return mock connection
      return {
        query: async (sql, params = []) => {
          return inMemoryDbInstance.executeQuery(sql, params);
        },
        release: () => {}
      };
    },

    async query(sql, params = []) {
      if (hasConfiguredDb && realPool && isRealDbWorking) {
        try {
          return await realPool.query(sql, params);
        } catch (err) {
          isRealDbWorking = false;
        }
      }
      return inMemoryDbInstance.executeQuery(sql, params);
    },

    get isUsingMock() {
      return !isRealDbWorking;
    }
  };
}

module.exports = {
  InMemoryDatabase,
  inMemoryDbInstance,
  createDatabaseProxy
};
