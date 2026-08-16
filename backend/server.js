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

dotenv.config({ path: path.join(__dirname, '.env') });

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

const app = express();
app.set('trust proxy', 1);
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
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use('/pages', express.static(path.join(__dirname, '../Fontend/pages'), { extensions: ['html'] }));
app.use(express.static(path.join(__dirname, '../Fontend/pages'), { extensions: ['html'] }));
app.use(express.static(path.join(__dirname, '../Fontend')));

// File upload configuration
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx' && ext !== '.doc' && ext !== '.txt') {
      return cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
    }
    cb(null, true);
  }
});

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
        original_filename VARCHAR(500) NULL,
        source ENUM('builder','upload') DEFAULT 'builder',
        raw_text LONGTEXT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Ensure columns exist (for existing tables)
    try {
      const [resumesCols] = await connection.query(`SHOW COLUMNS FROM resumes LIKE 'original_filename'`);
      if (resumesCols.length === 0) {
        await connection.query(`ALTER TABLE resumes ADD COLUMN original_filename VARCHAR(500) NULL`);
      }
      const [sourceCols] = await connection.query(`SHOW COLUMNS FROM resumes LIKE 'source'`);
      if (sourceCols.length === 0) {
        await connection.query(`ALTER TABLE resumes ADD COLUMN source ENUM('builder','upload') DEFAULT 'builder'`);
      }
      const [rawTextCols] = await connection.query(`SHOW COLUMNS FROM resumes LIKE 'raw_text'`);
      if (rawTextCols.length === 0) {
        await connection.query(`ALTER TABLE resumes ADD COLUMN raw_text LONGTEXT NULL`);
      }
    } catch (colErr) {
      console.error('Error migrating resumes table columns:', colErr.message);
    }

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
        resume_id INT NULL,
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
        is_revoked BOOLEAN DEFAULT false,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);

    try {
      const [revokedCols] = await connection.query(`SHOW COLUMNS FROM refresh_tokens LIKE 'is_revoked'`);
      if (revokedCols.length === 0) {
        await connection.query(`ALTER TABLE refresh_tokens ADD COLUMN is_revoked BOOLEAN DEFAULT false`);
      }
    } catch (colErr) {
      console.error('Error migrating refresh_tokens table columns:', colErr.message);
    }

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



    // Create job_matches table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS job_matches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        resume_id INT NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        match_percentage INT DEFAULT 0,
        strong_matches JSON,
        missing_matches JSON,
        recommendations JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_resume_id (resume_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create saved_jobs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        type VARCHAR(100),
        url VARCHAR(500),
        posted_date VARCHAR(100),
        match_pct INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create applications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        company VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        url VARCHAR(500),
        status VARCHAR(100) DEFAULT 'Wishlist',
        applied_date DATE,
        interview_date DATETIME,
        notes TEXT,
        resume_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create linkedin_reviews table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS linkedin_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        score INT DEFAULT 0,
        suggestions JSON,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY)) ON DUPLICATE KEY UPDATE expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)',
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
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY)) ON DUPLICATE KEY UPDATE expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)',
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

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const connection = await pool.getConnection();

    // Check if token exists in DB
    const [tokens] = await connection.query(
      'SELECT user_id, expires_at, is_revoked FROM refresh_tokens WHERE token = ?',
      [token]
    );

    if (tokens.length === 0 || tokens[0].is_revoked || new Date(tokens[0].expires_at) < new Date()) {
      connection.release();
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const userId = tokens[0].user_id;

    // Get user details
    const [users] = await connection.query(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = users[0].email;

    // Verify token using JWT library
    jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret', (err) => {
      if (err) {
        connection.release();
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: userId, email: userEmail },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '1h' }
      );

      connection.release();

      res.json({
        accessToken,
        message: 'Token refreshed successfully'
      });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
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
    if (typeof resume.content === 'string') {
      try { resume.content = JSON.parse(resume.content); } catch (e) {}
    }

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

    // Update resume
    await connection.query(
      'UPDATE resumes SET title = ?, content = ?, updated_at = NOW() WHERE id = ?',
      [title, JSON.stringify(content), id]
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
      content: typeof original.content === 'string' ? JSON.parse(original.content) : original.content,
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

    const parsedResumeId = parseInt(resumeId, 10);
    if (isNaN(parsedResumeId)) {
      return res.status(400).json({ error: 'Invalid Resume ID format.' });
    }

    const connection = await pool.getConnection();

    const [resumes] = await connection.query(
      'SELECT content FROM resumes WHERE id = ? AND user_id = ?',
      [parsedResumeId, req.user.id]
    );

    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resumeContent = resumes[0].content;
    const textContent = typeof resumeContent === 'string' ? resumeContent : JSON.stringify(resumeContent); 

    // Deterministic ATS Engine
    const atsScore = atsEngine.calculateDeterministicScore(textContent, jobDescription || '');

    // Qualitative feedback (Gemini)
    let aiFeedback = { suggestions: [], detailed_feedback: {} };
    if (jobDescription) {
      try {
        aiFeedback = await aiService.getAtsQualitativeFeedback(jobDescription, textContent, atsScore.missing_keywords);
      } catch (e) {
        console.error('Qualitative feedback error:', e.message);
        connection.release();
        return res.status(503).json({ error: "I couldn't process that request right now. Please try again." });
      }
    }

    const [result] = await connection.query(
      'INSERT INTO ats_reports (resume_id, overall_score, keyword_match, formatting_score, grammar_score, readability_score, missing_keywords, suggestions, detailed_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        parsedResumeId,
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

    // Qualitative feedback (Gemini)
    let aiFeedback = { suggestions: [], detailed_feedback: {} };
    if (jobDescription) {
      try {
        aiFeedback = await aiService.getAtsQualitativeFeedback(jobDescription, textContent, atsScore.missing_keywords);
      } catch (e) {
        console.error('Qualitative feedback error in upload-analyze:', e.message);
        return res.status(503).json({ error: "I couldn't process that request right now. Please try again." });
      }
    }

    let reportId = null;
    let resumeId = null;

    // Save report and resume to DB only if user is authenticated
    if (req.user && req.user.id) {
      const connection = await pool.getConnection();
      try {
        // 1. Create a resumes record for this uploaded resume text content
        const resumeTitle = `Uploaded: ${req.file.originalname}`;
        const resumeContentObj = {
          rawText: textContent,
          personal: { fullName: req.user.email ? req.user.email.split('@')[0] : 'Scanned User' },
          summary: textContent.slice(0, 1000),
          experience: [],
          skills: '',
          education: [],
          projects: []
        };

        const [resumeResult] = await connection.query(
          'INSERT INTO resumes (user_id, title, content, is_primary, original_filename, source, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.id, resumeTitle, JSON.stringify(resumeContentObj), false, req.file.originalname, 'upload', textContent]
        );
        resumeId = resumeResult.insertId;

        if (!resumeId) {
          connection.release();
          return res.status(500).json({ error: 'Failed to create resume record in database.' });
        }

        // 2. Save the ATS report linked to the new resume ID
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
        reportId = result.insertId;
        connection.release();
      } catch (dbError) {
        connection.release();
        console.error('DB persistence error in analyze-upload:', dbError);
        return res.status(500).json({ error: 'Failed to save analysis report to database.' });
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
      LEFT JOIN resumes r ON ar.resume_id = r.id
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
      LEFT JOIN resumes r ON ar.resume_id = r.id
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

app.post('/api/ai/chat', optionalAuthenticateToken, async (req, res) => {
  try {
    const { message, conversation, resumeContext, resumeId, stream } = req.body;

    if (!message && (!conversation || conversation.length === 0)) {
      return res.status(400).json({ error: 'Message or conversation history is required' });
    }

    const messages = [];
    if (conversation && Array.isArray(conversation)) {
      messages.push(...conversation);
    }
    if (message) {
      messages.push({ role: 'user', content: message });
    }

    let userContext = null;
    if (resumeContext && typeof resumeContext === 'object' && Object.keys(resumeContext).length > 0) {
      userContext = {
        latestResume: {
          title: resumeContext.title || 'Provided Resume',
          content: resumeContext
        }
      };
    } else if (req.user && req.user.id) {
      try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
          `SELECT u.first_name, u.last_name, u.email, p.location, p.bio
           FROM users u
           LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.id = ?`,
          [req.user.id]
        );

        let resumes = [];
        if (resumeId) {
          [resumes] = await connection.query(
            `SELECT id, title, content FROM resumes WHERE id = ? AND user_id = ?`,
            [resumeId, req.user.id]
          );
        } else {
          [resumes] = await connection.query(
            `SELECT id, title, content FROM resumes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
            [req.user.id]
          );
        }

        let atsReports = [];
        if (resumes.length > 0) {
          const actualResumeId = resumes[0].id;
          [atsReports] = await connection.query(
            `SELECT overall_score, missing_keywords, suggestions
             FROM ats_reports
             WHERE resume_id = ? ORDER BY created_at DESC LIMIT 1`,
            [actualResumeId]
          );
        }

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
        console.error('User context fetch warning inside chat route:', dbErr.message);
      }
    }

    if (stream === true) {
      const responseStream = await aiService.assistantChat(messages, userContext, true);
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      try {
        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (streamErr) {
        console.error('Error during AI streaming:', streamErr);
        res.write(`data: ${JSON.stringify({ error: 'Stream failed midway.' })}\n\n`);
        res.end();
      }
    } else {
      const result = await aiService.assistantChat(messages, userContext, false);
      res.json({
        success: true,
        message: result.reply
      });
    }
  } catch (error) {
    console.error('AI Chat route error:', error.message);
    res.status(500).json({ error: 'Sorry, I couldn\'t connect to the AI service right now. Please try again.' });
  }
});

app.post('/api/ai/assistant', optionalAuthenticateToken, async (req, res) => {
  try {
    const { messages, resumeId } = req.body;

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

        let resumes = [];
        if (resumeId) {
          [resumes] = await connection.query(
            `SELECT id, title, content FROM resumes WHERE id = ? AND user_id = ?`,
            [resumeId, req.user.id]
          );
        } else {
          [resumes] = await connection.query(
            `SELECT id, title, content FROM resumes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
            [req.user.id]
          );
        }

        let atsReports = [];
        if (resumes.length > 0) {
          const actualResumeId = resumes[0].id;
          [atsReports] = await connection.query(
            `SELECT overall_score, missing_keywords, suggestions
             FROM ats_reports
             WHERE resume_id = ? ORDER BY created_at DESC LIMIT 1`,
            [actualResumeId]
          );
        }

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
        console.error('User context fetch warning inside assistant route:', dbErr.message);
      }
    }

    const result = await aiService.assistantChat(messages, userContext, false);
    res.json(result);
  } catch (error) {
    console.error('AI assistant route error:', error.message);
    res.status(500).json({ error: 'Sorry, I couldn\'t connect to the AI service right now. Please try again.' });
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
  res.json({ message: 'DOCX generation not yet configured.', url: null });
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
// LINKEDIN REVIEW ROUTES
// ==========================================

app.post('/api/linkedin/review', authenticateToken, async (req, res) => {
  const { profileText } = req.body;
  if (!profileText || !profileText.trim()) {
    return res.status(400).json({ error: 'LinkedIn profile text is required' });
  }
  try {
    const review = await aiService.generateLinkedInReview(profileText);
    
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO linkedin_reviews (user_id, score, suggestions, details) VALUES (?, ?, ?, ?)',
      [req.user.id, review.overall_score, JSON.stringify(review.suggestions), JSON.stringify(review)]
    );
    connection.release();
    
    res.json(review);
  } catch (error) {
    console.error('LinkedIn Review API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze LinkedIn profile' });
  }
});

app.get('/api/linkedin/history', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [reviews] = await connection.query(
      'SELECT id, score, suggestions, created_at FROM linkedin_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [req.user.id]
    );
    connection.release();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch LinkedIn review history' });
  }
});


// ==========================================
// JOB MATCH ROUTES
// ==========================================

app.post('/api/job-match', authenticateToken, async (req, res) => {
  const { resumeId, jobDescription, jobTitle = 'Unknown Role', company = 'Unknown Company' } = req.body;
  if (!resumeId || !jobDescription || !jobDescription.trim()) {
    return res.status(400).json({ error: 'Resume ID and Job Description are required' });
  }
  try {
    const connection = await pool.getConnection();
    const [resumes] = await connection.query(
      'SELECT content, raw_text FROM resumes WHERE id = ? AND user_id = ?',
      [resumeId, req.user.id]
    );
    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }
    const resume = resumes[0];
    let resumeText = resume.raw_text;
    if (!resumeText && resume.content) {
      resumeText = aiService.getResumeContext(resume.content);
    }
    if (!resumeText) {
      connection.release();
      return res.status(400).json({ error: 'Resume has no content' });
    }
    
    const match = await aiService.generateJobMatch(resumeText, jobDescription);
    
    await connection.query(
      'INSERT INTO job_matches (user_id, resume_id, job_title, company, match_percentage, strong_matches, missing_matches, recommendations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        resumeId,
        jobTitle,
        company,
        match.match_percentage,
        JSON.stringify(match.strong_matches),
        JSON.stringify(match.missing_matches),
        JSON.stringify(match.recommendations)
      ]
    );
    connection.release();
    res.json(match);
  } catch (error) {
    console.error('Job Match API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to match job description' });
  }
});

app.get('/api/job-match/history', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [history] = await connection.query(
      'SELECT jm.*, r.title as resume_title FROM job_matches jm LEFT JOIN resumes r ON jm.resume_id = r.id WHERE jm.user_id = ? ORDER BY jm.created_at DESC',
      [req.user.id]
    );
    connection.release();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

// ==========================================
// RESUME OPTIMIZER ROUTE
// ==========================================

app.post('/api/ai/optimize', authenticateToken, async (req, res) => {
  const { resumeId } = req.body;
  if (!resumeId) {
    return res.status(400).json({ error: 'Resume ID is required' });
  }
  try {
    const connection = await pool.getConnection();
    const [resumes] = await connection.query(
      'SELECT content, raw_text FROM resumes WHERE id = ? AND user_id = ?',
      [resumeId, req.user.id]
    );
    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }
    const resume = resumes[0];
    let resumeText = resume.raw_text;
    if (!resumeText && resume.content) {
      resumeText = aiService.getResumeContext(resume.content);
    }
    if (!resumeText) {
      connection.release();
      return res.status(400).json({ error: 'Resume has no content' });
    }
    
    const optimizationPlan = await aiService.generateOptimizationPlan(resumeText);
    connection.release();
    res.json(optimizationPlan);
  } catch (error) {
    console.error('Optimize API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate resume optimization plan' });
  }
});

// ==========================================
// JOB SEARCH & SAVED JOBS ROUTES
// ==========================================

app.get('/api/jobs/search', authenticateToken, async (req, res) => {
  const { q, l } = req.query;
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  
  if (!appId || !appKey) {
    return res.json({
      jobs: [],
      providerConfigured: false,
      message: 'External Job Search Provider (Adzuna) is not configured. Please set ADZUNA_APP_ID and ADZUNA_APP_KEY in your .env file to enable real-time job searching.'
    });
  }
  
  try {
    const axios = require('axios');
    const response = await axios.get(`https://api.adzuna.com/v1/api/jobs/gb/search/1`, {
      params: {
        app_id: appId,
        app_key: appKey,
        what: q || 'software engineer',
        where: l || '',
        results_per_page: 20
      }
    });
    
    const jobs = (response.data.results || []).map(job => ({
      id: job.id,
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      type: job.contract_type || 'Full Time',
      url: job.redirect_url,
      posted_date: new Date(job.created).toLocaleDateString(),
      match_pct: 75
    }));
    
    res.json({
      jobs,
      providerConfigured: true
    });
  } catch (error) {
    console.error('Job Search API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch jobs from provider' });
  }
});

app.get('/api/jobs/saved', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [saved] = await connection.query(
      'SELECT * FROM saved_jobs WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    connection.release();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved jobs' });
  }
});

app.post('/api/jobs/saved', authenticateToken, async (req, res) => {
  const { title, company, location, type, url, posted_date, match_pct } = req.body;
  if (!title || !company) {
    return res.status(400).json({ error: 'Job title and company are required' });
  }
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO saved_jobs (user_id, title, company, location, type, url, posted_date, match_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, company, location, type, url, posted_date, match_pct || 0]
    );
    connection.release();
    res.status(201).json({ message: 'Job bookmarked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save job' });
  }
});

app.delete('/api/jobs/saved/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'DELETE FROM saved_jobs WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    connection.release();
    res.json({ message: 'Job bookmark removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove bookmarked job' });
  }
});

// ==========================================
// APPLICATION TRACKER ROUTES
// ==========================================

app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [apps] = await connection.query(
      'SELECT a.*, r.title as resume_title FROM applications a LEFT JOIN resumes r ON a.resume_id = r.id WHERE a.user_id = ? ORDER BY a.applied_date DESC',
      [req.user.id]
    );
    connection.release();
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job applications' });
  }
});

app.post('/api/applications', authenticateToken, async (req, res) => {
  const { company, title, url, status = 'Wishlist', applied_date, interview_date, notes, resume_id } = req.body;
  if (!company || !title) {
    return res.status(400).json({ error: 'Company and Job Title are required' });
  }
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO applications (user_id, company, title, url, status, applied_date, interview_date, notes, resume_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, company, title, url, status, applied_date || null, interview_date || null, notes, resume_id || null]
    );
    connection.release();
    res.status(201).json({ id: result.insertId, message: 'Application created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create application' });
  }
});

app.put('/api/applications/:id', authenticateToken, async (req, res) => {
  const { company, title, url, status, applied_date, interview_date, notes, resume_id } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE applications SET company = ?, title = ?, url = ?, status = ?, applied_date = ?, interview_date = ?, notes = ?, resume_id = ? WHERE id = ? AND user_id = ?',
      [company, title, url, status, applied_date || null, interview_date || null, notes, resume_id || null, req.params.id, req.user.id]
    );
    connection.release();
    res.json({ message: 'Application updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

app.patch('/api/applications/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE applications SET status = ? WHERE id = ? AND user_id = ?',
      [status, req.params.id, req.user.id]
    );
    connection.release();
    res.json({ message: 'Application status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'DELETE FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    connection.release();
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// ==========================================
// RESUME VERSION HISTORY ROUTES
// ==========================================

app.get('/api/resumes/:id/versions', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [versions] = await connection.query(
      'SELECT id, version_number, created_at FROM resume_versions WHERE resume_id = ? ORDER BY version_number DESC',
      [req.params.id]
    );
    connection.release();
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resume versions' });
  }
});

app.get('/api/resumes/:id/versions/:versionId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [versions] = await connection.query(
      'SELECT * FROM resume_versions WHERE id = ? AND resume_id = ?',
      [req.params.versionId, req.params.id]
    );
    connection.release();
    if (versions.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json(versions[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch version content' });
  }
});

app.post('/api/resumes/:id/versions', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [resumes] = await connection.query(
      'SELECT content FROM resumes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const [maxVer] = await connection.query(
      'SELECT MAX(version_number) as max_v FROM resume_versions WHERE resume_id = ?',
      [req.params.id]
    );
    const nextVer = (maxVer[0].max_v || 0) + 1;
    
    await connection.query(
      'INSERT INTO resume_versions (resume_id, version_number, content) VALUES (?, ?, ?)',
      [req.params.id, nextVer, JSON.stringify(resumes[0].content)]
    );
    
    connection.release();
    res.status(201).json({ message: `Version ${nextVer} saved successfully`, versionNumber: nextVer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save version' });
  }
});

app.post('/api/resumes/:id/versions/:versionId/restore', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [resumes] = await connection.query(
      'SELECT content, title FROM resumes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const [versions] = await connection.query(
      'SELECT content FROM resume_versions WHERE id = ? AND resume_id = ?',
      [req.params.versionId, req.params.id]
    );
    if (versions.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Target version not found' });
    }
    
    const currentContent = resumes[0].content;
    const restoredContent = versions[0].content;
    
    const [maxVer] = await connection.query(
      'SELECT MAX(version_number) as max_v FROM resume_versions WHERE resume_id = ?',
      [req.params.id]
    );
    const nextVer = (maxVer[0].max_v || 0) + 1;
    
    await connection.query(
      'INSERT INTO resume_versions (resume_id, version_number, content) VALUES (?, ?, ?)',
      [req.params.id, nextVer, JSON.stringify(currentContent)]
    );
    
    await connection.query(
      'UPDATE resumes SET content = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(restoredContent), req.params.id, req.user.id]
    );
    
    connection.release();
    res.json({ message: 'Resume restored successfully. Previous state archived as version ' + nextVer, content: restoredContent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore version safely' });
  }
});

// ==========================================
// COVER LETTER ROUTES
// ==========================================

app.post('/api/cover-letter', authenticateToken, async (req, res) => {
  const { resumeId, jobTitle, companyName, jobDescription } = req.body;
  if (!resumeId || !jobTitle || !companyName) {
    return res.status(400).json({ error: 'Resume ID, Job Title, and Company Name are required' });
  }
  try {
    const connection = await pool.getConnection();
    const [resumes] = await connection.query(
      'SELECT content, raw_text FROM resumes WHERE id = ? AND user_id = ?',
      [resumeId, req.user.id]
    );
    if (resumes.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Resume not found' });
    }
    const resume = resumes[0];
    let resumeText = resume.raw_text;
    if (!resumeText && resume.content) {
      resumeText = aiService.getResumeContext(resume.content);
    }
    if (!resumeText) {
      connection.release();
      return res.status(400).json({ error: 'Resume content is empty. Please fill in details before generating cover letter.' });
    }

    const aiResult = await aiService.generateCoverLetter(resumeText, jobTitle, companyName, jobDescription);
    const content = aiResult.letter;

    const [result] = await connection.query(
      'INSERT INTO cover_letters (user_id, resume_id, title, content) VALUES (?, ?, ?, ?)',
      [req.user.id, resumeId, `Cover Letter - ${jobTitle} at ${companyName}`, content]
    );

    connection.release();
    res.status(201).json({
      id: result.insertId,
      title: `Cover Letter - ${jobTitle} at ${companyName}`,
      content
    });
  } catch (error) {
    console.error('Cover Letter API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate cover letter' });
  }
});

app.get('/api/cover-letter', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [letters] = await connection.query(
      'SELECT id, resume_id, title, content, created_at FROM cover_letters WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    connection.release();
    res.json(letters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cover letters' });
  }
});

app.get('/api/cover-letter/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [letters] = await connection.query(
      'SELECT * FROM cover_letters WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    connection.release();
    if (letters.length === 0) {
      return res.status(404).json({ error: 'Cover letter not found' });
    }
    res.json(letters[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cover letter' });
  }
});

app.put('/api/cover-letter/:id', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE cover_letters SET title = ?, content = ? WHERE id = ? AND user_id = ?',
      [title, content, req.params.id, req.user.id]
    );
    connection.release();
    res.json({ message: 'Cover letter updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cover letter' });
  }
});

app.delete('/api/cover-letter/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'DELETE FROM cover_letters WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    connection.release();
    res.json({ message: 'Cover letter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete cover letter' });
  }
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});



// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size limit exceeded (maximum 5MB allowed).' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('Only PDF, DOC, DOCX, and TXT')) {
    return res.status(400).json({ error: err.message });
  }
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
