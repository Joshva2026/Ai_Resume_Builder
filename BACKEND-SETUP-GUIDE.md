# AI Resume Builder - Backend Setup Guide

## Overview

This is a complete backend setup for the **AI Resume Builder with ATS Score Checker**. The backend is built with **Node.js/Express** and provides a REST API for managing resumes, analyzing ATS scores, and enhancing content with AI.

---

## Architecture

### Technology Stack
- **Runtime:** Node.js 16+
- **Framework:** Express.js
- **Database:** MySQL 8.0+
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcrypt, Helmet, CORS
- **File Storage:** Local (development) / AWS S3 or Cloudinary (production)

### Project Structure
```
backend/
├── backend-setup.js          # Main Express server
├── package.json              # Dependencies
├── .env                       # Environment variables (create from .env.example)
├── database-schema.sql        # MySQL database schema
└── README.md                  # This file
```

---

## Installation & Setup

### Step 1: Prerequisites

Ensure you have installed:
- **Node.js** v16 or higher
- **npm** v8 or higher
- **MySQL** v8.0 or higher

Check versions:
```bash
node --version
npm --version
mysql --version
```

### Step 2: Clone & Install Dependencies

```bash
# Extract the backend files
cd backend

# Install dependencies
npm install
```

### Step 3: Configure Database

#### Option A: Using MySQL Command Line

```bash
# Connect to MySQL
mysql -u root -p

# Run the schema
source database-schema.sql;

# Verify database creation
SHOW DATABASES;
USE resume_builder;
SHOW TABLES;
```

#### Option B: Using MySQL Workbench
1. Open MySQL Workbench
2. Open `database-schema.sql`
3. Execute all queries
4. Verify tables are created

### Step 4: Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=resume_builder

# JWT
JWT_SECRET=your_secure_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Step 5: Start the Backend

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

**Expected Output:**
```
Database initialized successfully
Server running on http://localhost:5000
API Documentation: http://localhost:5000/api
```

---

## API Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "John",
  "lastName": "Doe"
}

Response: {
  "message": "User registered successfully",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { ... }
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response: {
  "message": "Login successful",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { ... }
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer {accessToken}

Response: {
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Resumes

#### Get All Resumes
```
GET /api/resumes
Authorization: Bearer {accessToken}

Response: [
  {
    "id": 1,
    "title": "My Resume",
    "content": { ... },
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

#### Create Resume
```
POST /api/resumes
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "My Resume",
  "content": {
    "personalInfo": { ... },
    "experience": [ ... ],
    "education": [ ... ],
    "skills": [ ... ]
  },
  "templateId": 1
}

Response: {
  "message": "Resume created",
  "resume": { ... }
}
```

#### Get Single Resume
```
GET /api/resumes/{id}
Authorization: Bearer {accessToken}

Response: {
  "id": 1,
  "title": "My Resume",
  "content": { ... }
}
```

#### Update Resume
```
PUT /api/resumes/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Updated Resume",
  "content": { ... }
}

Response: {
  "message": "Resume updated",
  "resume": { ... }
}
```

#### Delete Resume
```
DELETE /api/resumes/{id}
Authorization: Bearer {accessToken}

Response: {
  "message": "Resume deleted"
}
```

#### Duplicate Resume
```
POST /api/resumes/{id}/duplicate
Authorization: Bearer {accessToken}

Response: {
  "message": "Resume duplicated",
  "resume": { ... }
}
```

### ATS Analysis

#### Analyze Resume for ATS
```
POST /api/ats/analyze
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "resumeId": 1
}

Response: {
  "message": "ATS analysis complete",
  "report": {
    "overallScore": 82,
    "keywordMatch": 85,
    "formattingScore": 90,
    "grammarScore": 88,
    "readabilityScore": 80,
    "missingKeywords": [ "Kubernetes", "Docker" ],
    "suggestions": [ ... ]
  }
}
```

#### Get ATS Analysis History
```
GET /api/ats/history
Authorization: Bearer {accessToken}

Response: [ ... array of ATS reports ... ]
```

#### Get Single ATS Report
```
GET /api/ats/report/{id}
Authorization: Bearer {accessToken}

Response: { ... detailed ATS report ... }
```

### AI Enhancement

#### Rewrite Text
```
POST /api/ai/rewrite
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "text": "I worked on a project with the team"
}

Response: {
  "message": "Text enhanced",
  "improvements": {
    "original": "I worked on a project with the team",
    "enhanced": "I orchestrated a project with the team"
  }
}
```

#### Get Career Summary Suggestions
```
POST /api/ai/summary
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "careerSummary": "software engineer"
}

Response: {
  "message": "Summary enhanced",
  "enhanced": "Results-driven professional with proven expertise in software engineering..."
}
```

#### Get Keywords for Job Role
```
POST /api/ai/keywords
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "jobRole": "Software Engineer"
}

Response: {
  "message": "Keywords suggested",
  "keywords": [ "JavaScript", "React", "Node.js", "REST APIs", "Database Design" ]
}
```

#### Get Action Verbs
```
POST /api/ai/action-verbs
Authorization: Bearer {accessToken}

Response: {
  "message": "Action verbs provided",
  "verbs": [ "Accelerated", "Achieved", "Designed", "Developed", ... ]
}
```

#### Generate Cover Letter
```
POST /api/ai/cover-letter
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "resumeData": { ... },
  "jobTitle": "Senior Developer",
  "companyName": "Tech Corp"
}

Response: {
  "message": "Cover letter generated",
  "coverLetter": "Dear Hiring Manager,\n\nI am writing to express..."
}
```

### Templates

#### Get All Templates
```
GET /api/templates

Response: [ ... array of templates ... ]
```

#### Get Single Template
```
GET /api/templates/{id}

Response: {
  "id": 1,
  "name": "Professional",
  "description": "Clean and professional resume template",
  "category": "professional",
  "structure": { ... }
}
```

### Downloads

#### Generate PDF Download
```
POST /api/download/pdf
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "resumeId": 1
}

Response: {
  "message": "PDF generated",
  "downloadUrl": "/downloads/resume-1-1704110400000.pdf"
}
```

#### Generate DOCX Download
```
POST /api/download/docx
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "resumeId": 1
}

Response: {
  "message": "DOCX generated",
  "downloadUrl": "/downloads/resume-1-1704110400000.docx"
}
```

#### Get Download History
```
GET /api/download/history
Authorization: Bearer {accessToken}

Response: [ ... array of download records ... ]
```

### Profile Management

#### Get User Profile
```
GET /api/profile
Authorization: Bearer {accessToken}

Response: {
  "id": 1,
  "userId": 1,
  "phone": "+1-555-0123",
  "location": "New York, NY",
  "bio": "Software Engineer"
}
```

#### Update User Profile
```
PUT /api/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "phone": "+1-555-0123",
  "location": "New York, NY",
  "bio": "Experienced Software Engineer",
  "profileImageUrl": "https://..."
}

Response: {
  "message": "Profile updated",
  "profile": { ... }
}
```

---

## Error Handling

All errors return standardized JSON responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Server Error

---

## Security Considerations

### Implemented
- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ CORS Protection
- ✅ Helmet Security Headers
- ✅ Rate Limiting
- ✅ Input Validation
- ✅ SQL Injection Protection (Parameterized Queries)
- ✅ XSS Protection
- ✅ Refresh Token Rotation

### Recommended for Production
- 🔐 Enable HTTPS/TLS
- 🔐 Use environment variables for secrets
- 🔐 Implement rate limiting on auth endpoints
- 🔐 Add request logging and monitoring
- 🔐 Set up database backups
- 🔐 Use managed database services
- 🔐 Implement CSRF protection
- 🔐 Add email verification for signup
- 🔐 Implement two-factor authentication

---

## Deployment Options

### Option 1: Heroku
```bash
heroku create your-app-name
heroku addons:create cleardb:ignite
git push heroku main
```

### Option 2: AWS EC2
1. Launch EC2 instance
2. Install Node.js and MySQL
3. Clone repository
4. Install dependencies: `npm install`
5. Start server: `npm start`

### Option 3: DigitalOcean App Platform
1. Push code to GitHub
2. Connect repository to DigitalOcean
3. Configure environment variables
4. Deploy

### Option 4: Docker
```bash
docker build -t resume-builder-backend .
docker run -p 5000:5000 resume-builder-backend
```

---

## Environment Variables

### Required
- `DB_HOST` - MySQL server host
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

### Optional
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `SMTP_HOST` - Email server for password reset
- `AWS_ACCESS_KEY_ID` - For S3 file uploads
- `CLOUDINARY_NAME` - For Cloudinary image storage

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution:**
- Verify MySQL is running: `mysql -u root -p`
- Check DB credentials in `.env`
- Ensure database exists: `CREATE DATABASE resume_builder;`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
- Change PORT in `.env`: `PORT=5001`
- Or kill process: `lsof -i :5000` then `kill -9 <PID>`

### JWT Token Expired
```
Error: Invalid token
```
**Solution:**
- Use refresh token to get new access token
- Tokens expire by default in 1 hour
- Adjust JWT_EXPIRY in `.env` if needed

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Verify FRONTEND_URL in `.env` matches your frontend URL
- Check CORS configuration in backend-setup.js

---

## Database Backup & Restore

### Backup Database
```bash
mysqldump -u root -p resume_builder > backup.sql
```

### Restore Database
```bash
mysql -u root -p resume_builder < backup.sql
```

---

## Performance Optimization

### Indexes
Database schema includes indexes on frequently queried columns for optimal performance.

### Connection Pooling
Express is configured with MySQL connection pooling (10 connections).

### Caching
Consider implementing Redis for:
- JWT token blacklisting
- Resume caching
- Template caching

### Database Optimization
```sql
-- Analyze table performance
ANALYZE TABLE resumes;
ANALYZE TABLE ats_reports;

-- View query execution plans
EXPLAIN SELECT * FROM resumes WHERE user_id = 1;
```

---

## Next Steps

1. **✅ Backend Ready** - You now have a production-ready backend
2. **⏳ Configure Backend URL** - Provide your backend URL to frontend team
3. **⏳ Frontend Integration** - Frontend will use the API endpoints documented above
4. **⏳ Testing** - Run comprehensive API tests
5. **⏳ Deployment** - Deploy to production environment

---

## Support & Documentation

- **Express.js Docs:** https://expressjs.com/
- **MySQL Docs:** https://dev.mysql.com/doc/
- **JWT:** https://jwt.io/
- **bcrypt:** https://www.npmjs.com/package/bcrypt

---

## License

MIT License - See LICENSE file for details

---

**Created:** January 2024
**Version:** 1.0.0
**Status:** Production Ready
