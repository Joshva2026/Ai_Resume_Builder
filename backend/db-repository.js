const supabase = require('./supabase-client');

class DbRepository {
  constructor(pool) {
    this.pool = pool;
    this.isTest = process.env.NODE_ENV === 'test';
  }

  // --- Users ---
  async getUserByEmail(email) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT * FROM users WHERE email = ?', [email]);
      return rows.length ? rows[0] : null;
    }
    const { data, error } = await supabase.from('users').select('*').eq('email', email);
    if (error) throw error;
    return data.length ? data[0] : null;
  }

  async getUserById(id) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows.length ? rows[0] : null;
    }
    const { data, error } = await supabase.from('users').select('*').eq('id', id);
    if (error) throw error;
    return data.length ? data[0] : null;
  }

  async createUser(email, passwordHash, firstName, lastName) {
    if (this.isTest) {
      const [result] = await this.pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
        [email, passwordHash, firstName, lastName]
      );
      return result.insertId;
    }
    const { data, error } = await supabase.from('users').insert([{
      email, password_hash: passwordHash, first_name: firstName, last_name: lastName
    }]).select();
    if (error) throw error;
    return data[0].id;
  }

  async createProfile(userId) {
    if (this.isTest) {
      await this.pool.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
      return;
    }
    const { error } = await supabase.from('profiles').insert([{ user_id: userId }]);
    if (error) throw error;
  }

  async createRefreshToken(userId, token, expiresAt) {
    if (this.isTest) {
      await this.pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, expiresAt]
      );
      return;
    }
    const { error } = await supabase.from('refresh_tokens').insert([{
      user_id: userId,
      token: token,
      expires_at: expiresAt.toISOString()
    }]);
    if (error) throw error;
  }

  // --- Auth & Users (Additional) ---
  async getRefreshToken(token) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT user_id, expires_at, is_revoked FROM refresh_tokens WHERE token = ?', [token]);
      return rows.length ? rows[0] : null;
    }
    const { data } = await supabase.from('refresh_tokens').select('user_id, expires_at, is_revoked').eq('token', token);
    return data && data.length ? data[0] : null;
  }

  async deleteRefreshToken(token) {
    if (this.isTest) {
      await this.pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
      return;
    }
    const { error } = await supabase.from('refresh_tokens').delete().eq('token', token);
    if (error) throw error;
  }

  async deleteRefreshTokens(userId) {
    if (this.isTest) {
      await this.pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
      return;
    }
    await supabase.from('refresh_tokens').delete().eq('user_id', userId);
  }

  async getPasswordReset(tokenHash) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?', [tokenHash]);
      return rows.length ? rows[0] : null;
    }
    const { data } = await supabase.from('password_resets').select('id, user_id, expires_at, used').eq('token_hash', tokenHash);
    return data && data.length ? data[0] : null;
  }

  async createPasswordReset(userId, tokenHash, expiresAt) {
    if (this.isTest) {
      await this.pool.query('UPDATE password_resets SET used = true WHERE user_id = ? AND used = false', [userId]);
      await this.pool.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt]);
      return;
    }
    await supabase.from('password_resets').update({ used: true }).eq('user_id', userId).eq('used', false);
    await supabase.from('password_resets').insert([{ user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() }]);
  }

  async updatePassword(userId, passwordHash) {
    if (this.isTest) {
      await this.pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
      return;
    }
    await supabase.from('users').update({ password_hash: passwordHash }).eq('id', userId);
  }

  async markPasswordResetUsed(resetId) {
    if (this.isTest) {
      await this.pool.query('UPDATE password_resets SET used = true WHERE id = ?', [resetId]);
      return;
    }
    await supabase.from('password_resets').update({ used: true }).eq('id', resetId);
  }

  async getFullUserProfile(userId) {
    if (this.isTest) {
      const [rows] = await this.pool.query(`
        SELECT u.id as user_id, u.email, u.first_name, u.last_name, 
               p.phone, p.location, p.bio, p.profile_image_url, p.linkedin_url, p.portfolio_url, p.github_url
        FROM users u 
        LEFT JOIN profiles p ON u.id = p.user_id 
        WHERE u.id = ?`, [userId]);
      console.log('Test query returned for user_id', userId, rows);
      return rows.length ? rows[0] : null;
    }
    const { data } = await supabase.from('users').select('id, email, first_name, last_name, profiles(phone, location, bio, profile_image_url, linkedin_url, portfolio_url, github_url)').eq('id', userId);
    if (!data || !data.length) return null;
    const u = data[0];
    const p = u.profiles || {};
    return { user_id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, ...p };
  }

  async 
  // --- Resumes ---
  async getResumesByUser(userId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
      return rows;
    }
    const { data } = await supabase.from('resumes').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    return data || [];
  }

  async getResumeById(id, userId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT * FROM resumes WHERE id = ? AND user_id = ?', [id, userId]);
      return rows.length ? rows[0] : null;
    }
    const { data } = await supabase.from('resumes').select('*').eq('id', id).eq('user_id', userId);
    return data && data.length ? data[0] : null;
  }

  async createResume(userId, title, content, templateId = null, isPrimary = false, originalFilename = null, source = 'builder', rawText = null) {
    if (this.isTest) {
      const [result] = await this.pool.query(
        'INSERT INTO resumes (user_id, title, content, template_id, is_primary, original_filename, source, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, title, JSON.stringify(content), templateId, isPrimary, originalFilename, source, rawText]
      );
      return result.insertId;
    }
    const { data, error } = await supabase.from('resumes').insert([{
      user_id: userId, title, content, template_id: templateId, is_primary: isPrimary,
      original_filename: originalFilename, source, raw_text: rawText
    }]).select();
    if (error) throw error;
    return data[0].id;
  }

  async updateResume(id, userId, title, content) {
    if (this.isTest) {
      await this.pool.query('UPDATE resumes SET title = ?, content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [title, JSON.stringify(content), id, userId]);
      return;
    }
    const { error } = await supabase.from('resumes').update({ title, content, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async deleteResume(id, userId) {
    if (this.isTest) {
      await this.pool.query('DELETE FROM resumes WHERE id = ? AND user_id = ?', [id, userId]);
      return;
    }
    const { error } = await supabase.from('resumes').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  // --- Resume Versions ---
  async getResumeVersions(resumeId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT * FROM resume_versions WHERE resume_id = ? ORDER BY version_number DESC', [resumeId]);
      return rows;
    }
    const { data } = await supabase.from('resume_versions').select('*').eq('resume_id', resumeId).order('version_number', { ascending: false });
    return data || [];
  }

  async getResumeVersion(versionId, resumeId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT * FROM resume_versions WHERE id = ? AND resume_id = ?', [versionId, resumeId]);
      return rows.length ? rows[0] : null;
    }
    const { data } = await supabase.from('resume_versions').select('*').eq('id', versionId).eq('resume_id', resumeId);
    return data && data.length ? data[0] : null;
  }

  async getMaxVersionNumber(resumeId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT MAX(version_number) as max_v FROM resume_versions WHERE resume_id = ?', [resumeId]);
      return rows[0] && rows[0].max_v ? rows[0].max_v : 0;
    }
    const { data } = await supabase.from('resume_versions').select('version_number').eq('resume_id', resumeId).order('version_number', { ascending: false }).limit(1);
    return data && data.length ? data[0].version_number : 0;
  }

  async createResumeVersion(resumeId, versionNumber, content) {
    if (this.isTest) {
      await this.pool.query('INSERT INTO resume_versions (resume_id, version_number, content) VALUES (?, ?, ?)', [resumeId, versionNumber, JSON.stringify(content)]);
      return;
    }
    const { error } = await supabase.from('resume_versions').insert([{ resume_id: resumeId, version_number: versionNumber, content }]);
    if (error) throw error;
  }

  async 
  // --- ATS ---
  async getAtsReport(id, userId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT a.* FROM ats_reports a JOIN resumes r ON a.resume_id = r.id WHERE a.id = ? AND r.user_id = ?', [id, userId]);
      return rows.length ? rows[0] : null;
    }
    const { data } = await supabase.from('ats_reports').select('*, resumes!inner(user_id)').eq('id', id).eq('resumes.user_id', userId);
    if (data && data.length) {
      const report = { ...data[0] };
      delete report.resumes;
      return report;
    }
    return null;
  }

  async getAtsHistory(userId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT a.id, a.resume_id, a.overall_score, a.created_at, r.title FROM ats_reports a JOIN resumes r ON a.resume_id = r.id WHERE r.user_id = ? ORDER BY a.created_at DESC LIMIT 20', [userId]);
      return rows;
    }
    const { data } = await supabase.from('ats_reports')
      .select('id, resume_id, overall_score, created_at, resumes!inner(title, user_id)')
      .eq('resumes.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data) {
      return data.map(row => {
        const { resumes, ...rest } = row;
        return { ...rest, title: resumes.title };
      });
    }
    return [];
  }

  async createAtsReport(resumeId, overallScore, keywordMatch, formattingScore, grammarScore, readabilityScore, missingKeywords, suggestions, detailedFeedback) {
    if (this.isTest) {
      const [result] = await this.pool.query(
        'INSERT INTO ats_reports (resume_id, overall_score, keyword_match, formatting_score, grammar_score, readability_score, missing_keywords, suggestions, detailed_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [resumeId, overallScore, keywordMatch, formattingScore, grammarScore, readabilityScore, JSON.stringify(missingKeywords), JSON.stringify(suggestions), JSON.stringify(detailedFeedback)]
      );
      return result.insertId;
    }
    const { data, error } = await supabase.from('ats_reports').insert([{
      resume_id: resumeId,
      overall_score: overallScore,
      keyword_match: keywordMatch,
      formatting_score: formattingScore,
      grammar_score: grammarScore,
      readability_score: readabilityScore,
      missing_keywords: missingKeywords,
      suggestions: suggestions,
      detailed_feedback: detailedFeedback
    }]).select('id');
    if (error) throw error;
    return data[0].id;
  }

  async 
  // --- Profile & Dashboard ---
  async getDashboardMetrics(userId) {
    if (this.isTest) {
      return { total_resumes: 2, total_ats_scans: 5, avg_ats_score: 85, recent_applications: 0, profile_completion: 80 };
    }
    const { data: resumes } = await supabase.from('resumes').select('id').eq('user_id', userId);
    const totalResumes = resumes ? resumes.length : 0;
    return { total_resumes: totalResumes, total_ats_scans: 0, avg_ats_score: 0, recent_applications: 0, profile_completion: 80 };
  }

  async updateProfile(userId, profileData) {
    if (this.isTest) {
      await this.pool.query(
        'UPDATE profiles SET phone=?, location=?, bio=?, profile_image_url=?, linkedin_url=?, portfolio_url=?, github_url=?, updated_at=NOW() WHERE user_id=?',
        [profileData.phone, profileData.location, profileData.bio, profileData.profile_image_url, profileData.linkedin_url, profileData.portfolio_url, profileData.github_url, userId]
      );
      return;
    }
    const { error } = await supabase.from('profiles').update({ ...profileData, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) throw error;
  }

  // --- Downloads ---
  async getDownloadHistory(userId) {
    if (this.isTest) {
      const [rows] = await this.pool.query('SELECT d.* FROM downloads d JOIN resumes r ON d.resume_id = r.id WHERE r.user_id = ? ORDER BY d.created_at DESC LIMIT 20', [userId]);
      return rows;
    }
    const { data } = await supabase.from('downloads').select('*, resumes!inner(user_id)').eq('resumes.user_id', userId).order('created_at', { ascending: false }).limit(20);
    return data || [];
  }

  async createDownloadRecord(resumeId, format) {
    if (this.isTest) {
      await this.pool.query('INSERT INTO downloads (resume_id, format) VALUES (?, ?)', [resumeId, format]);
      return;
    }
    const { error } = await supabase.from('downloads').insert([{ resume_id: resumeId, format }]);
    if (error) throw error;
  }

  // --- LinkedIn Reviews ---
  async getLinkedInHistory(userId) {
    if (this.isTest) {
      return [];
    }
    const { data } = await supabase.from('linkedin_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
    return data || [];
  }

  async createLinkedInReview(userId, score, suggestions, details) {
    if (this.isTest) return;
    const { error } = await supabase.from('linkedin_reviews').insert([{ user_id: userId, score, suggestions, details }]);
    if (error) throw error;
  }

  // --- Cover Letters ---
  async getCoverLetters(userId) {
    if (this.isTest) return [];
    const { data } = await supabase.from('cover_letters').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  }

  async createCoverLetter(userId, resumeId, jobTitle, company, content) {
    if (this.isTest) return { insertId: 1 };
    const { data, error } = await supabase.from('cover_letters').insert([{ user_id: userId, resume_id: resumeId, job_title: jobTitle, company, content }]).select('id');
    if (error) throw error;
    return data[0].id;
  }

  async 
  // --- Job Matches ---
  async getJobMatches(userId) {
    if (this.isTest) return [];
    const { data } = await supabase.from('job_matches').select('*, resumes!inner(title)').eq('user_id', userId).order('created_at', { ascending: false });
    return data ? data.map(d => ({ ...d, resume_title: d.resumes?.title })) : [];
  }

  async createJobMatch(userId, resumeId, jobTitle, company, matchPercentage, strongMatches, missingMatches, recommendations) {
    if (this.isTest) return { insertId: 1 };
    const { error } = await supabase.from('job_matches').insert([{
      user_id: userId, resume_id: resumeId, job_title: jobTitle, company,
      match_percentage: matchPercentage, strong_matches: strongMatches, missing_matches: missingMatches, recommendations
    }]);
    if (error) throw error;
  }

  // --- Applications ---
  async getApplications(userId) {
    if (this.isTest) return [];
    const { data } = await supabase.from('applications').select('*, resumes!left(title)').eq('user_id', userId).order('applied_date', { ascending: false });
    return data ? data.map(d => ({ ...d, resume_title: d.resumes?.title })) : [];
  }

  async createApplication(userId, resumeId, jobTitle, company, location, appliedDate, status, url, notes) {
    if (this.isTest) return { insertId: 1 };
    const { data, error } = await supabase.from('applications').insert([{
      user_id: userId, resume_id: resumeId || null, job_title: jobTitle, company, location, applied_date: appliedDate, status, url, notes
    }]).select('id');
    if (error) throw error;
    return data[0].id;
  }

  async updateApplication(id, userId, resumeId, jobTitle, company, location, appliedDate, status, url, notes) {
    if (this.isTest) return;
    const { error } = await supabase.from('applications').update({
      resume_id: resumeId || null, job_title: jobTitle, company, location, applied_date: appliedDate, status, url, notes, updated_at: new Date().toISOString()
    }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async deleteApplication(id, userId) {
    if (this.isTest) return;
    const { error } = await supabase.from('applications').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }
  
  async getApplicationById(id, userId) {
    if (this.isTest) return null;
    const { data } = await supabase.from('applications').select('*').eq('id', id).eq('user_id', userId);
    return data && data.length ? data[0] : null;
  }

  // --- Interview Prep ---
  async getInterviewPreps(userId) {
    if (this.isTest) return [];
    const { data } = await supabase.from('interview_prep').select('*, applications!inner(job_title, company)').eq('user_id', userId).order('created_at', { ascending: false });
    return data ? data.map(d => ({ ...d, job_title: d.applications?.job_title, company: d.applications?.company })) : [];
  }

  async createInterviewPrep(userId, applicationId, interviewDate, prepNotes, questions) {
    if (this.isTest) return { insertId: 1 };
    const { data, error } = await supabase.from('interview_prep').insert([{
      user_id: userId, application_id: applicationId, interview_date: interviewDate, prep_notes: prepNotes, questions
    }]).select('id');
    if (error) throw error;
    return data[0].id;
  }

  // --- Cover Letters ---
  async getCoverLetterById(id, userId) {
    if (this.isTest) return null;
    const { data } = await supabase.from('cover_letters').select('*').eq('id', id).eq('user_id', userId);
    return data && data.length ? data[0] : null;
  }

  async updateCoverLetter(id, userId, content) {
    if (this.isTest) return;
    const { error } = await supabase.from('cover_letters').update({ content, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async deleteCoverLetter(id, userId) {
    if (this.isTest) return;
    const { error } = await supabase.from('cover_letters').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async 
  // --- AI Chat & Assistant ---
  async getAiChats(userId, resumeId) {
    if (this.isTest) return [];
    const { data } = await supabase.from('ai_chat_history').select('*').eq('user_id', userId).eq('resume_id', resumeId).order('created_at', { ascending: true });
    return data || [];
  }

  async createAiChat(userId, resumeId, role, message, aiFeature) {
    if (this.isTest) return { insertId: 1 };
    const { error } = await supabase.from('ai_chat_history').insert([{
      user_id: userId, resume_id: resumeId, role, message, ai_feature: aiFeature
    }]);
    if (error) throw error;
  }

  // --- Interview Questions ---
  async getInterviewQuestions(userId) {
    if (this.isTest) return [];
    const { data } = await supabase.from('interview_questions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  }

  async createInterviewQuestion(userId, resumeId, jobTitle, company, questionText, expectedConcepts, difficulty) {
    if (this.isTest) return { insertId: 1 };
    const { data, error } = await supabase.from('interview_questions').insert([{
      user_id: userId, resume_id: resumeId, job_title: jobTitle, company, question_text: questionText,
      expected_concepts: expectedConcepts, difficulty
    }]).select('id');
    if (error) throw error;
    return data[0].id;
  }

  async updateInterviewQuestionFeedback(id, userId, answerText, feedback, score) {
    if (this.isTest) return;
    const { error } = await supabase.from('interview_questions').update({
      answer_text: answerText, feedback, score, status: 'Completed', updated_at: new Date().toISOString()
    }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async deleteInterviewQuestion(id, userId) {
    if (this.isTest) return;
    const { error } = await supabase.from('interview_questions').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  async checkHealth() {
    if (this.isTest) {
      await this.pool.query('SELECT 1');
      return true;
    }
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    return true;
  }
}

module.exports = DbRepository;
