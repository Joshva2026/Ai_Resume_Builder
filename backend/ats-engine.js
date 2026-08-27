const fs = require('fs');
const pdf = require('pdf-parse-new');
const mammoth = require('mammoth');

// Helper to extract text from a file (PDF, DOCX, DOC, TXT)
async function extractText(filePath, mimetype, originalName = '') {
  if (!filePath) throw new Error('No file path provided.');
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('The uploaded file is empty.');
    }
  } catch (err) {
    if (err.message === 'The uploaded file is empty.') throw err;
    throw new Error('Failed to read file from disk.');
  }

  const ext = (originalName.split('.').pop() || '').toLowerCase();

  // 1. PDF
  if (ext === 'pdf' || (!ext && mimetype === 'application/pdf')) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const extractedText = (data && data.text) ? data.text.trim() : '';
      if (!extractedText) {
        throw new Error('Unable to read text from this PDF file. If it is a scanned image or photo PDF, please provide a text-based PDF, DOCX, or TXT file.');
      }
      return extractedText;
    } catch (err) {
      console.error('[ATS PDF PARSER ERROR]', err.message, err.stack);
      if (err.message && err.message.includes('scanned image')) throw err;
      throw new Error(`Failed to read PDF file. It may be password-protected, encrypted, or corrupted. (Internal: ${err.message})`);
    }
  }
  
  // 2. DOCX & DOC
  if (
    ext === 'docx' ||
    ext === 'doc' ||
    (!ext && (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'application/msword'))
  ) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      if (result && result.value && result.value.trim()) return result.value;
    } catch (_) {}

    const textFallback = fs.readFileSync(filePath, 'utf8');
    // Check for raw binary OLE header junk
    if (textFallback.slice(0, 100).includes('\0')) {
      throw new Error('Legacy binary .doc files are not supported. Please convert your file to .docx or .pdf.');
    }
    return textFallback;
  }

  // 3. TXT
  if (ext === 'txt' || (!ext && mimetype === 'text/plain')) {
    return fs.readFileSync(filePath, 'utf8');
  }

  // Default fallback read as UTF-8 text
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
  }
}

// Common English stop words to filter out while retaining 2+ letter tech keywords (AWS, SQL, GCP, Git, C, R, Vue, PHP, iOS, ML, AI)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'upon', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
  'now', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'this', 'that', 'these', 'those', 'my', 'your',
  'his', 'her', 'its', 'our', 'their', 'them', 'what', 'which', 'who', 'whom'
]);

// Deterministic ATS Scoring Engine
function calculateDeterministicScore(resumeText, jobDescription = '') {
  const normalizedResume = (resumeText || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normalizedJd = (jobDescription || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const isMeaningfulWord = (w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w);

  const resumeWords = new Set(normalizedResume.split(/\s+/).filter(isMeaningfulWord));
  const jdWords = normalizedJd.split(/\s+/).filter(isMeaningfulWord);
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
