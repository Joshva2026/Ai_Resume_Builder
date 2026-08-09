const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// Helper to extract text from a file (PDF, DOCX, DOC, TXT)
async function extractText(filePath, mimetype, originalName = '') {
  const ext = (originalName.split('.').pop() || '').toLowerCase();

  // 1. PDF
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text || '';
  }
  
  // 2. DOCX & DOC
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword' ||
    ext === 'docx' ||
    ext === 'doc'
  ) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      if (result && result.value) return result.value;
    } catch (_) {}
    return fs.readFileSync(filePath, 'utf8');
  }

  // 3. TXT
  if (mimetype === 'text/plain' || ext === 'txt') {
    return fs.readFileSync(filePath, 'utf8');
  }

  // Default fallback read as UTF-8 text
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error('Unsupported file format. Please upload PDF, DOC, DOCX, or TXT.');
  }
}

// Deterministic ATS Scoring Engine
function calculateDeterministicScore(resumeText, jobDescription = '') {
  const normalizedResume = (resumeText || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normalizedJd = (jobDescription || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const resumeWords = new Set(normalizedResume.split(/\s+/).filter(w => w.length > 3));
  const jdWords = normalizedJd.split(/\s+/).filter(w => w.length > 3);
  const uniqueJdWords = [...new Set(jdWords)];
  
  const matchedKeywords = [];
  const missingKeywords = [];
  
  if (uniqueJdWords.length > 0) {
    uniqueJdWords.forEach(word => {
      if (resumeWords.has(word)) {
        matchedKeywords.push(word);
      } else {
        missingKeywords.push(word);
      }
    });
  }

  // Calculate component scores
  const keywordMatch = uniqueJdWords.length > 0 
    ? Math.round((matchedKeywords.length / uniqueJdWords.length) * 100) 
    : Math.min(Math.round(resumeWords.size / 1.5), 90);
  
  // Detect sections
  const hasExperience = /experience|work history|employment|positions/i.test(resumeText);
  const hasEducation = /education|degree|university|college|academic/i.test(resumeText);
  const hasSkills = /skills|technologies|proficiencies|competencies/i.test(resumeText);
  const sectionCompleteness = ((hasExperience ? 1 : 0) + (hasEducation ? 1 : 0) + (hasSkills ? 1 : 0)) / 3 * 100;

  // Formatting & Readability heuristics
  const hasBulletPoints = /•|-|\*/.test(resumeText);
  const formattingScore = hasBulletPoints ? 92 : 65;
  
  // Action verbs check
  const actionVerbs = ['managed', 'developed', 'led', 'created', 'improved', 'increased', 'engineered', 'spearheaded', 'orchestrated', 'built'];
  let actionVerbCount = 0;
  actionVerbs.forEach(verb => {
    if (normalizedResume.includes(verb)) actionVerbCount++;
  });
  const actionVerbScore = Math.min(actionVerbCount * 15 + 20, 100);

  // Quantifiable achievements
  const hasNumbers = /\d+%|\d+x|\$\d+|\d+\+/.test(resumeText);
  const achievementsScore = hasNumbers ? 95 : 55;

  // Weighted final score
  const overallScore = Math.round(
    (keywordMatch * 0.40) +
    (sectionCompleteness * 0.25) +
    (formattingScore * 0.15) +
    (actionVerbScore * 0.10) +
    (achievementsScore * 0.10)
  );

  return {
    overall_score: Math.min(Math.max(overallScore, 10), 100),
    keyword_match: Math.min(Math.max(keywordMatch, 10), 100),
    section_completeness: Math.round(sectionCompleteness),
    formatting_score: formattingScore,
    action_verb_score: actionVerbScore,
    achievements_score: achievementsScore,
    grammar_score: 90,
    readability_score: 88,
    matched_keywords: matchedKeywords.slice(0, 15),
    missing_keywords: missingKeywords.slice(0, 15)
  };
}

module.exports = {
  extractText,
  calculateDeterministicScore
};
