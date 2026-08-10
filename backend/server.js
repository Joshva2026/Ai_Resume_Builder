/**
 * AI Resume Builder with ATS Score Checker
 * Backend Setup - Node.js + Express
 * 
 * PRODUCTION-READY BACKEND ARCHITECTURE
 * Includes: Authentication, Resume Management, ATS Analysis, AI Enhancement
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const aiService = require('./ai-service');
const atsEngine = require('./ats-engine');

dotenv.config();

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

const app = express();
const PORT = process.env.PORT || 5000;

// Initial connection without database to create it if it doesn't exist
const adminPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 10,
  idleTimeout: 30000
});

// Main database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 10,
  idleTimeout: 30000
});

// Validate environment variables on startup (names only)
function validateEnvironmentVariables() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`[SECURITY WARNING] Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[SECURITY INFO] GEMINI_API_KEY is not set. AI qualitative features will return fallback recommendations.');
  }
}
validateEnvironmentVariables();

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

// Security
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://ai-resume-builder-puce-one.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy Error: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Specific Rate Limiting for AI & ATS Endpoints to prevent API key abuse
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 AI calls per IP per 15 minutes
  message: { error: 'Too many requests to AI services. Please try again in 15 minutes.' }
});
app.use('/api/ai', aiLimiter);
app.use('/api/ats', aiLimiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ==========================================
// JWT AUTHENTICATION MIDDLEWARE
// ==========================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// ==========================================
// DATABASE INITIALIZATION
// ==========================================

const initializeDatabase = async () => {
  try {
    const dbName = process.env.DB_NAME || 'resume_builder';
    const adminConnection = await adminPool.getConnection();
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    adminConnection.release();

    const connection = await pool.getConnection();

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        INDEX idx_email (email)
      )
    `);

    // Create profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        phone VARCHAR(20),
        location VARCHAR(255),
        bio TEXT,
        profile_image_url VARCHAR(500),
        linkedin_url VARCHAR(255),
        portfolio_url VARCHAR(255),
        github_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    // Create resumes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content JSON,
        template_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_primary BOOLEAN DEFAULT false,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create resume_versions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS resume_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resume_id INT NOT NULL,
        version_number INT NOT NULL,
        content JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
        UNIQUE KEY unique_version (resume_id, version_number),
        INDEX idx_resume_id (resume_id)
      )
    `);

    // Create ATS reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ats_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resume_id INT NOT NULL,
        overall_score INT,
        keyword_match INT,
        formatting_score INT,
        grammar_score INT,
        readability_score INT,
        missing_keywords JSON,
        suggestions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
        INDEX idx_resume_id (resume_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create cover_letters table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cover_letters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        resume_id INT NOT NULL,
        title VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    // Create templates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(500),
        category VARCHAR(100),
        structure JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        INDEX idx_category (category)
      )
    `);

    // Create downloads table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resume_id INT NOT NULL,
        format VARCHAR(10),
        file_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
        INDEX idx_resume_id (resume_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create refresh_tokens table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL UNIQUE,
        expires_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    // Create settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        theme VARCHAR(20) DEFAULT 'light',
        notifications_enabled BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        two_factor_enabled BOOLEAN DEFAULT false,
        privacy_level VARCHAR(20) DEFAULT 'private',
        language VARCHAR(10) DEFAULT 'en',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    // Create portfolios table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        username VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255),
        about_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        accent_color VARCHAR(20) DEFAULT '#0ea5e9',
        typography VARCHAR(50) DEFAULT 'inter',
        is_published BOOLEAN DEFAULT false,
        hero_image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_username (username),
        INDEX idx_is_published (is_published)
      )
    `);

    // Create portfolio_projects table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        project_url VARCHAR(500),
        github_url VARCHAR(500),
        technologies JSON,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        INDEX idx_portfolio_id (portfolio_id)
      )
    `);

    // Create portfolio_skills table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio_skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_id INT NOT NULL,
        category VARCHAR(100),
        name VARCHAR(100) NOT NULL,
        proficiency INT DEFAULT 0,
        display_order INT DEFAULT 0,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        INDEX idx_portfolio_id (portfolio_id)
      )
    `);

    // Create portfolio_experience table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio_experience (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_id INT NOT NULL,
        company VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        description TEXT,
        display_order INT DEFAULT 0,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        INDEX idx_portfolio_id (portfolio_id)
      )
    `);

    // Create portfolio_education table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio_education (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_id INT NOT NULL,
        institution VARCHAR(255) NOT NULL,
        degree VARCHAR(255) NOT NULL,
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        description TEXT,
        display_order INT DEFAULT 0,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        INDEX idx_portfolio_id (portfolio_id)
      )
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await connection.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, firstName || '', lastName || '']
    );

    const userId = result.insertId;

    // Create user profile
    await connection.query(
      'INSERT INTO profiles (user_id) VALUES (?)',
      [userId]
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: userId, email },
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: '7d' }
    );

    // Store refresh token
    await connection.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [userId, refreshToken]
    );

    connection.release();

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: { id: userId, email, firstName, lastName },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const connection = await pool.getConnection();

    const [users] = await connection.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      connection.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: '7d' }
    );

    await connection.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [user.id, refreshToken]
    );

    connection.release();

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const { token } = req.body;

    await connection.query(
      'DELETE FROM refresh_tokens WHERE token = ?',
      [token]
    );

    connection.release();
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const connection = await pool.getConnection();

    const [users] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In production, send email with reset token
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const userId = decoded.id;

    const connection = await pool.getConnection();

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    connection.release();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [users] = await connection.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
      [req.user.id]
    );

    const [profiles] = await connection.query(
      'SELECT * FROM profiles WHERE user_id = ?',
      [req.user.id]
    );

    connection.release();

    const user = users[0];
    const profile = profiles[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        ...profile,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ==========================================
// PROFILE ROUTES
// ==========================================

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT 
        u.id as user_id, u.email, u.first_name, u.last_name,
        p.phone, p.location, p.bio, p.profile_image_url, p.linkedin_url, p.portfolio_url, p.github_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?`,
      [req.user.id]
    );

    connection.release();

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = rows[0];
    res.json({
      id: row.user_id,
      email: row.email || '',
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      phone: row.phone || '',
      location: row.location || '',
      bio: row.bio || '',
      profileImageUrl: row.profile_image_url || '',
      linkedinUrl: row.linkedin_url || '',
      portfolioUrl: row.portfolio_url || '',
      githubUrl: row.github_url || ''
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      email, firstName, lastName, phone, location, bio, 
      profileImageUrl, linkedinUrl, portfolioUrl, githubUrl 
    } = req.body;

    const connection = await pool.getConnection();

    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        connection.release();
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [trimmedEmail, req.user.id]
      );

      if (existing.length > 0) {
        connection.release();
        return res.status(409).json({ error: 'Email already belongs to another account' });
      }

      await connection.query(
        'UPDATE users SET email = ?, first_name = ?, last_name = ? WHERE id = ?',
        [trimmedEmail, firstName || '', lastName || '', req.user.id]
      );
    } else if (firstName !== undefined || lastName !== undefined) {
      await connection.query(
        'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
        [firstName || '', lastName || '', req.user.id]
      );
    }

    await connection.query(
      `INSERT INTO profiles (user_id, phone, location, bio, profile_image_url, linkedin_url, portfolio_url, github_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone),
         location = VALUES(location),
         bio = VALUES(bio),
         profile_image_url = VALUES(profile_image_url),
         linkedin_url = VALUES(linkedin_url),
         portfolio_url = VALUES(portfolio_url),
         github_url = VALUES(github_url)`,
      [
        req.user.id,
        phone || '',
        location || '',
        bio || '',
        profileImageUrl || '',
        linkedinUrl || '',
        portfolioUrl || '',
        githubUrl || ''
      ]
    );

    const [rows] = await connection.query(
      `SELECT 
        u.id as user_id, u.email, u.first_name, u.last_name,
        p.phone, p.location, p.bio, p.profile_image_url, p.linkedin_url, p.portfolio_url, p.github_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?`,
      [req.user.id]
    );

    connection.release();

    const row = rows[0];
    const profile = {
      id: row.user_id,
      email: row.email || '',
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      phone: row.phone || '',
      location: row.location || '',
      bio: row.bio || '',
      profileImageUrl: row.profile_image_url || '',
      linkedinUrl: row.linkedin_url || '',
      portfolioUrl: row.portfolio_url || '',
      githubUrl: row.github_url || ''
    };

    res.json({ message: 'Profile updated', profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// RESUME ROUTES
// ==========================================

app.get('/api/resumes', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [resumes] = await connection.query(
      'SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );

    connection.release();

    res.json(resumes);
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

app.post('/api/resumes', authenticateToken, async (req, res) => {
  try {
    const { title, content, templateId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const connection = await pool.getConnection();

    const [result] = await connection.query(
      'INSERT INTO resumes (user_id, title, content, template_id, is_primary) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title, JSON.stringify(content), templateId || null, true]
    );

    const resumeId = result.insertId;

    // Create initial version
    await connection.query(
      'INSERT INTO resume_versions (resume_id, version_number, content) VALUES (?, ?, ?)',
      [resumeId, 1, JSON.stringify(content)]
    );

    connection.release();

    res.status(201).json({
      message: 'Resume created',
      resume: { id: resumeId, title, content, templateId },
    });
  } catch (error) {
    console.error('Create resume error:', error);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

app.get('/api/resumes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    const [resumes] = await connection.query(
      'SELECT * FROM resumes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = resumes[0];
    resume.content = JSON.parse(resume.content);

    connection.release();

    res.json(resume);
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

app.put('/api/resumes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const connection = await pool.getConnection();

    // Verify ownership
    const [existing] = await connection.query(
      'SELECT id FROM resumes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Get current version number
    const [versions] = await connection.query(
      'SELECT MAX(version_number) as maxVersion FROM resume_versions WHERE resume_id = ?',
      [id]
    );

    const nextVersion = (versions[0].maxVersion || 0) + 1;

    // Update resume
    await connection.query(
      'UPDATE resumes SET title = ?, content = ?, updated_at = NOW() WHERE id = ?',
      [title, JSON.stringify(content), id]
    );

    // Create new version
    await connection.query(
      'INSERT INTO resume_versions (resume_id, version_number, content) VALUES (?, ?, ?)',
      [id, nextVersion, JSON.stringify(content)]
    );

    connection.release();

    res.json({ message: 'Resume updated', resume: { id, title, content } });
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

app.delete('/api/resumes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    const [existing] = await connection.query(
      'SELECT id FROM resumes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    await connection.query('DELETE FROM resumes WHERE id = ?', [id]);

    connection.release();

    res.json({ message: 'Resume deleted' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

app.post('/api/resumes/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    const [existing] = await connection.query(
      'SELECT title, content, template_id FROM resumes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    const original = existing[0];
    const newTitle = `${original.title} (Copy)`;

    const [result] = await connection.query(
      'INSERT INTO resumes (user_id, title, content, template_id) VALUES (?, ?, ?, ?)',
      [req.user.id, newTitle, original.content, original.template_id]
    );

    const newResume = {
      id: result.insertId,
      title: newTitle,
      content: JSON.parse(original.content),
      templateId: original.template_id,
    };

    connection.release();

    res.status(201).json({ message: 'Resume duplicated', resume: newResume });
  } catch (error) {
    console.error('Duplicate resume error:', error);
    res.status(500).json({ error: 'Failed to duplicate resume' });
  }
});

// ==========================================
// ATS ROUTES
// ==========================================

app.post('/api/ats/analyze', authenticateToken, async (req, res) => {
  try {
    const { resumeId, jobDescription } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    const connection = await pool.getConnection();

    const [resumes] = await connection.query(
      'SELECT content FROM resumes WHERE id = ? AND user_id = ?',
      [resumeId, req.user.id]
    );

    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resumeContent = resumes[0].content;
    const textContent = typeof resumeContent === 'string' ? resumeContent : JSON.stringify(resumeContent); 

    // Deterministic ATS Engine
    const atsScore = atsEngine.calculateDeterministicScore(textContent, jobDescription || '');

    // Qualitative feedback (Gemini or Fallback)
    let aiFeedback = { suggestions: [], detailed_feedback: {} };
    if (jobDescription && process.env.GEMINI_API_KEY) {
      try {
        aiFeedback = await aiService.getAtsQualitativeFeedback(jobDescription, textContent, atsScore.missing_keywords);
      } catch (e) {
        console.error('Qualitative feedback warning:', e.message);
      }
    }

    if (!aiFeedback.suggestions || !aiFeedback.suggestions.length) {
      aiFeedback.suggestions = [
        'Include exact skill keywords from the job posting in your experience bullets.',
        'Quantify your accomplishments using specific metrics, percentages, or dollar amounts.',
        'Ensure standard section headings like Experience, Education, and Skills.'
      ];
    }

    const [result] = await connection.query(
      'INSERT INTO ats_reports (resume_id, overall_score, keyword_match, formatting_score, grammar_score, readability_score, missing_keywords, suggestions, detailed_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        resumeId,
        atsScore.overall_score,
        atsScore.keyword_match,
        atsScore.formatting_score,
        atsScore.grammar_score || 90,
        atsScore.readability_score || 85,
        JSON.stringify(atsScore.missing_keywords || []),
        JSON.stringify(aiFeedback.suggestions || []),
        JSON.stringify(aiFeedback.detailed_feedback || {})
      ]
    );

    connection.release();

    res.json({ message: 'ATS analysis complete', report: { ...atsScore, ...aiFeedback, id: result.insertId } });
  } catch (error) {
    console.error('ATS analysis error:', error);
    res.status(500).json({ error: 'ATS analysis failed' });
  }
});

// Upload endpoint for Hybrid ATS Pipeline (Supports PDF, DOC, DOCX, TXT for guests & logged in users)
app.post('/api/ats/analyze-upload', optionalAuthenticateToken, upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required (PDF, DOC, DOCX, or TXT)' });
  }

  const fs = require('fs');
  const tempPath = req.file.path;

  try {
    const { jobDescription } = req.body;
    
    // File validation
    const validExtensions = ['pdf', 'doc', 'docx', 'txt'];
    const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
    if (!validExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are supported.' });
    }

    // Extract text from uploaded file
    const textContent = await atsEngine.extractText(tempPath, req.file.mimetype, req.file.originalname);

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ error: 'Could not extract text from the file. The file may be empty or image-based.' });
    }

    // Deterministic ATS Engine
    const atsScore = atsEngine.calculateDeterministicScore(textContent, jobDescription || '');

    // Qualitative feedback (Gemini or Fallback)
    let aiFeedback = { suggestions: [], detailed_feedback: {} };
    if (jobDescription && process.env.GEMINI_API_KEY) {
      try {
        aiFeedback = await aiService.getAtsQualitativeFeedback(jobDescription, textContent, atsScore.missing_keywords);
      } catch (e) {
        console.error('Qualitative feedback warning:', e.message);
      }
    }

    if (!aiFeedback.suggestions || !aiFeedback.suggestions.length) {
      aiFeedback.suggestions = [
        'Include exact skill keywords from the job posting in your experience section.',
        'Use bullet points to highlight measurable achievements and results.',
        'Keep formatting clean and readable for ATS parsers.'
      ];
    }

    let reportId = null;
    let resumeId = null;

    // Save report to DB only if user is authenticated (without creating dummy resumes)
    if (req.user && req.user.id) {
      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
          'INSERT INTO ats_reports (resume_id, overall_score, keyword_match, formatting_score, grammar_score, readability_score, missing_keywords, suggestions, detailed_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            null,
            atsScore.overall_score,
            atsScore.keyword_match,
            atsScore.formatting_score,
            atsScore.grammar_score || 90,
            atsScore.readability_score || 85,
            JSON.stringify(atsScore.missing_keywords || []),
            JSON.stringify(aiFeedback.suggestions || []),
            JSON.stringify(aiFeedback.detailed_feedback || {})
          ]
        );
        reportId = result.insertId;
        connection.release();
      } catch (dbError) {
        console.error('Optional DB persistence error:', dbError.message);
      }
    }

    res.json({
      message: 'ATS analysis complete',
      report: {
        ...atsScore,
        ...aiFeedback,
        id: reportId,
        resumeId,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('ATS upload analysis error:', error);
    res.status(500).json({ error: error.message || 'ATS analysis failed' });
  } finally {
    // Delete temp file after processing
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (_) {}
  }
});

app.get('/api/ats/history', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [reports] = await connection.query(`
      SELECT ar.* FROM ats_reports ar
      JOIN resumes r ON ar.resume_id = r.id
      WHERE r.user_id = ?
      ORDER BY ar.created_at DESC
      LIMIT 10
    `, [req.user.id]);

    connection.release();

    res.json(reports);
  } catch (error) {
    console.error('Get ATS history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/ats/report/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    const [reports] = await connection.query(`
      SELECT ar.* FROM ats_reports ar
      JOIN resumes r ON ar.resume_id = r.id
      WHERE ar.id = ? AND r.user_id = ?
    `, [id, req.user.id]);

    connection.release();

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reports[0];
    report.missingKeywords = JSON.parse(report.missingKeywords);
    report.suggestions = JSON.parse(report.suggestions);

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ==========================================
// AI ENHANCEMENT ROUTES
// ==========================================

app.post('/api/ai/assistant', optionalAuthenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let userContext = null;
    if (req.user && req.user.id) {
      try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
          `SELECT u.first_name, u.last_name, u.email, p.location, p.bio
           FROM users u
           LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.id = ?`,
          [req.user.id]
        );

        const [resumes] = await connection.query(
          `SELECT title, content FROM resumes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
          [req.user.id]
        );

        const [atsReports] = await connection.query(
          `SELECT ar.overall_score, ar.missing_keywords, ar.suggestions
           FROM ats_reports ar
           JOIN resumes r ON ar.resume_id = r.id
           WHERE r.user_id = ? ORDER BY ar.created_at DESC LIMIT 1`,
          [req.user.id]
        );

        connection.release();

        if (rows.length) {
          userContext = {
            firstName: rows[0].first_name,
            lastName: rows[0].last_name,
            email: rows[0].email,
            location: rows[0].location,
            bio: rows[0].bio,
            latestResume: resumes.length ? {
              title: resumes[0].title,
              content: typeof resumes[0].content === 'string' ? resumes[0].content : JSON.stringify(resumes[0].content)
            } : null,
            latestAtsReport: atsReports.length ? {
              score: atsReports[0].overall_score,
              missingKeywords: atsReports[0].missing_keywords,
              suggestions: atsReports[0].suggestions
            } : null
          };
        }
      } catch (dbErr) {
        console.error('User context fetch warning:', dbErr.message);
      }
    }

    const result = await aiService.assistantChat(messages, userContext);
    res.json(result);
  } catch (error) {
    console.error('AI assistant route error:', error.message);
    if (error.message === 'AI service is not configured.') {
      return res.status(503).json({ error: 'AI Assistant is currently unavailable. Please try again later.' });
    }
    res.status(500).json({ error: 'AI Assistant failed to respond' });
  }
});

app.post('/api/ai/rewrite', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const improvements = await aiService.rewriteText(text);

    res.json({ message: 'Text enhanced', improvements: { original: improvements.original, enhanced: improvements.rewritten } });
  } catch (error) {
    console.error('AI rewrite error:', error);
    if (error.message === 'AI service is not configured.') {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Enhancement failed' });
  }
});

app.post('/api/ai/summary', authenticateToken, async (req, res) => {
  try {
    const { careerSummary } = req.body;

    const result = await aiService.generateSummary(careerSummary);

    res.json({ message: 'Summary enhanced', enhanced: result.suggestion });
  } catch (error) {
    console.error('AI summary error:', error);
    if (error.message === 'AI service is not configured.') {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Summary enhancement failed' });
  }
});

app.post('/api/ai/keywords', authenticateToken, async (req, res) => {
  try {
    const { jobRole } = req.body;

    const result = await aiService.getKeywords(jobRole);

    res.json({ message: 'Keywords suggested', keywords: result.keywords });
  } catch (error) {
    console.error('AI keywords error:', error);
    if (error.message === 'AI service is not configured.') {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Keyword suggestion failed' });
  }
});

app.post('/api/ai/action-verbs', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'Action verbs provided', verbs: aiService.ACTION_VERBS });
  } catch (error) {
    console.error('Action verbs error:', error);
    res.status(500).json({ error: 'Failed to fetch action verbs' });
  }
});

app.post('/api/ai/cover-letter', authenticateToken, async (req, res) => {
  try {
    const { resumeData, jobTitle, companyName } = req.body;
    
    const resumeContext = typeof resumeData === 'object' ? JSON.stringify(resumeData) : resumeData;
    const result = await aiService.generateCoverLetter(jobTitle, companyName, resumeContext);

    res.json({ message: 'Cover letter generated', coverLetter: result.coverLetter });
  } catch (error) {
    console.error('Cover letter error:', error);
    if (error.message === 'AI service is not configured.') {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Cover letter generation failed' });
  }
});

// ==========================================
// TEMPLATE ROUTES
// ==========================================

app.get('/api/templates', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [templates] = await connection.query(
      'SELECT * FROM templates WHERE is_active = true'
    );

    connection.release();

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    const [templates] = await connection.query(
      'SELECT * FROM templates WHERE id = ? AND is_active = true',
      [id]
    );

    connection.release();

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];
    template.structure = JSON.parse(template.structure);

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// ==========================================
// DOWNLOAD ROUTES
// ==========================================

const puppeteer = require('puppeteer');
const fs = require('fs');

app.post('/api/download/pdf', authenticateToken, async (req, res) => {
  try {
    const { resumeId } = req.body;

    const connection = await pool.getConnection();

    const [resumes] = await connection.query(
      'SELECT content FROM resumes WHERE id = ? AND user_id = ?',
      [resumeId, req.user.id]
    );

    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resumeContent = resumes[0].content;

    const templateGenerator = require('./resume-pdf-template');
    const htmlContent = templateGenerator.generateResumeHtml(resumeContent, 'classic');

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    const fileName = `resume-${resumeId}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const fileUrl = `/uploads/${fileName}`;

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: filePath, format: 'A4', printBackground: true });
    await browser.close();

    await connection.query(
      'INSERT INTO downloads (resume_id, format, file_url) VALUES (?, ?, ?)',
      [resumeId, 'pdf', fileUrl]
    );

    connection.release();

    res.json({ message: 'PDF generated', downloadUrl: fileUrl });
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

app.post('/api/download/docx', authenticateToken, async (req, res) => {
  try {
    const { resumeId } = req.body;

    const fileName = `resume-${resumeId}-${Date.now()}.docx`;
    const fileUrl = `/downloads/${fileName}`;

    const connection = await pool.getConnection();

    await connection.query(
      'INSERT INTO downloads (resume_id, format, file_url) VALUES (?, ?, ?)',
      [resumeId, 'docx', fileUrl]
    );

    connection.release();

    res.json({ message: 'DOCX generated', downloadUrl: fileUrl });
  } catch (error) {
    console.error('DOCX download error:', error);
    res.status(500).json({ error: 'DOCX generation failed' });
  }
});

app.get('/api/download/history', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [downloads] = await connection.query(`
      SELECT d.* FROM downloads d
      JOIN resumes r ON d.resume_id = r.id
      WHERE r.user_id = ?
      ORDER BY d.created_at DESC
      LIMIT 20
    `, [req.user.id]);

    connection.release();

    res.json(downloads);
  } catch (error) {
    console.error('Get download history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// ==========================================
// PORTFOLIO ROUTES
// ==========================================

app.post('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const { username, title, aboutText, theme, accentColor, typography, isPublished, heroImageUrl, projects } = req.body;
    const userId = req.user.id;

    const connection = await pool.getConnection();

    // Check if portfolio already exists for user
    const [existing] = await connection.query('SELECT id FROM portfolios WHERE user_id = ?', [userId]);

    let portfolioId;

    if (existing.length > 0) {
      portfolioId = existing[0].id;
      await connection.query(
        'UPDATE portfolios SET username = ?, title = ?, about_text = ?, theme = ?, accent_color = ?, typography = ?, is_published = ?, hero_image_url = ? WHERE id = ?',
        [username, title, aboutText, theme, accentColor, typography, isPublished, heroImageUrl, portfolioId]
      );
    } else {
      const [result] = await connection.query(
        'INSERT INTO portfolios (user_id, username, title, about_text, theme, accent_color, typography, is_published, hero_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, username, title, aboutText, theme, accentColor, typography, isPublished, heroImageUrl]
      );
      portfolioId = result.insertId;
    }

    // Update projects (simple approach: delete and re-insert)
    await connection.query('DELETE FROM portfolio_projects WHERE portfolio_id = ?', [portfolioId]);
    
    if (projects && projects.length > 0) {
      for (const [index, p] of projects.entries()) {
        await connection.query(
          'INSERT INTO portfolio_projects (portfolio_id, title, description, technologies, display_order) VALUES (?, ?, ?, ?, ?)',
          [portfolioId, p.title, p.description, JSON.stringify(p.tech ? p.tech.split(',') : []), index]
        );
      }
    }

    connection.release();
    res.json({ message: 'Portfolio saved successfully', portfolioId });
  } catch (error) {
    console.error('Save portfolio error:', error);
    res.status(500).json({ error: 'Failed to save portfolio' });
  }
});

app.get('/api/portfolio/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const connection = await pool.getConnection();

    const [portfolios] = await connection.query('SELECT * FROM portfolios WHERE username = ? AND is_published = true', [username]);

    if (portfolios.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Portfolio not found or not published' });
    }

    const portfolio = portfolios[0];

    const [projects] = await connection.query('SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY display_order ASC', [portfolio.id]);

    connection.release();

    res.json({
      ...portfolio,
      projects: projects.map(p => ({ ...p, tech: JSON.parse(p.technologies || '[]').join(', ') }))
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==========================================
// SERVER START
// ==========================================

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
