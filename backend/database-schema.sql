-- =========================================
-- AI Resume Builder Database Schema
-- MySQL 8.0+
-- =========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS resume_builder;
USE resume_builder;

-- =========================================
-- USERS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_login DATETIME,
  INDEX idx_email (email),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PROFILES TABLE
-- =========================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- RESUMES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSON,
  template_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_primary BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at),
  INDEX idx_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- RESUME VERSIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS resume_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resume_id INT NOT NULL,
  version_number INT NOT NULL,
  content JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_version (resume_id, version_number),
  INDEX idx_resume_id (resume_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- ATS REPORTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS ats_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resume_id INT NOT NULL,
  overall_score INT DEFAULT 0,
  keyword_match INT DEFAULT 0,
  formatting_score INT DEFAULT 0,
  grammar_score INT DEFAULT 0,
  readability_score INT DEFAULT 0,
  missing_keywords JSON,
  suggestions JSON,
  detailed_feedback JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  INDEX idx_resume_id (resume_id),
  INDEX idx_created_at (created_at),
  INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- COVER LETTERS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS cover_letters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resume_id INT,
  title VARCHAR(255),
  content LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_resume_id (resume_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- TEMPLATES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  preview_image_url VARCHAR(500),
  category VARCHAR(100),
  structure JSON,
  styles JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- DOWNLOADS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS downloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resume_id INT NOT NULL,
  format VARCHAR(10),
  file_url VARCHAR(500),
  file_size INT,
  download_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  INDEX idx_resume_id (resume_id),
  INDEX idx_created_at (created_at),
  INDEX idx_format (format)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- REFRESH TOKENS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- ACTIVITY LOG TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- NOTIFICATIONS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- SETTINGS TABLE
-- =========================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PORTFOLIOS TABLE
-- =========================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PORTFOLIO PROJECTS
-- =========================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PORTFOLIO SKILLS
-- =========================================
CREATE TABLE IF NOT EXISTS portfolio_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  category VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  proficiency INT DEFAULT 0,
  display_order INT DEFAULT 0,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  INDEX idx_portfolio_id (portfolio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PORTFOLIO EXPERIENCE
-- =========================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PORTFOLIO EDUCATION
-- =========================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- PASSWORD RESETS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- SEEDS / SAMPLE DATA
-- =========================================

-- Insert sample templates
INSERT INTO templates (name, description, category, is_active) VALUES
('Professional', 'Clean and professional resume template', 'professional', true),
('Modern', 'Modern design with accent colors', 'modern', true),
('Creative', 'Creative resume with unique styling', 'creative', true),
('Academic', 'Academic and research-focused template', 'academic', true),
('Executive', 'Executive summary template', 'executive', true);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

-- Add additional indexes for frequently queried columns
CREATE INDEX idx_resumes_user_updated ON resumes(user_id, updated_at);
CREATE INDEX idx_ats_resume_created ON ats_reports(resume_id, created_at);
CREATE INDEX idx_downloads_resume_format ON downloads(resume_id, format);
CREATE INDEX idx_activity_user_action ON activity_logs(user_id, action);

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- User resume statistics view
CREATE VIEW user_resume_stats AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT r.id) as total_resumes,
  COUNT(DISTINCT CASE WHEN r.is_primary = true THEN r.id END) as primary_resume_count,
  MAX(r.updated_at) as last_resume_update,
  COUNT(DISTINCT ar.id) as total_ats_analyses,
  AVG(ar.overall_score) as avg_ats_score
FROM users u
LEFT JOIN resumes r ON u.id = r.user_id
LEFT JOIN ats_reports ar ON r.id = ar.resume_id
GROUP BY u.id;

-- =========================================
-- STORED PROCEDURES
-- =========================================

-- Procedure to delete old refresh tokens
DELIMITER //
CREATE PROCEDURE clean_expired_tokens()
BEGIN
  DELETE FROM refresh_tokens 
  WHERE expires_at < NOW() AND is_revoked = true;
END //
DELIMITER ;

-- =========================================
-- CHARSET AND COLLATION
-- =========================================

ALTER DATABASE resume_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
