const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth'); // For docx

// Helper to extract text from a file
async function extractText(filePath, mimetype) {
  if (mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  throw new Error('Unsupported file format. Please upload PDF or DOCX.');
}

// Deterministic ATS Scoring Engine
function calculateDeterministicScore(resumeText, jobDescription) {
  const normalizedResume = (resumeText || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normalizedJd = (jobDescription || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const resumeWords = new Set(normalizedResume.split(/\s+/).filter(w => w.length > 3));
  const jdWords = normalizedJd.split(/\s+/).filter(w => w.length > 3);
  
  // Basic keyword extraction from JD (excluding common stop words ideally, but simple for now)
  const uniqueJdWords = [...new Set(jdWords)];
  
  const matchedKeywords = [];
  const missingKeywords = [];
  
  uniqueJdWords.forEach(word => {
    if (resumeWords.has(word)) {
      matchedKeywords.push(word);
    } else {
      missingKeywords.push(word);
    }
  });

  // Calculate component scores
  const keywordMatch = uniqueJdWords.length > 0 ? Math.round((matchedKeywords.length / uniqueJdWords.length) * 100) : 100;
  
  // Detect sections
  const hasExperience = /experience|work history|employment/i.test(resumeText);
  const hasEducation = /education|degree|university/i.test(resumeText);
  const hasSkills = /skills|technologies|proficiencies/i.test(resumeText);
  const sectionCompleteness = ((hasExperience ? 1 : 0) + (hasEducation ? 1 : 0) + (hasSkills ? 1 : 0)) / 3 * 100;

  // Formatting & Readability heuristics
  const hasBulletPoints = /•|-|\*/.test(resumeText);
  const formattingScore = hasBulletPoints ? 90 : 60;
  
  // Action verbs (very basic check)
  const actionVerbs = ['managed', 'developed', 'led', 'created', 'improved', 'increased'];
  let actionVerbCount = 0;
  actionVerbs.forEach(verb => {
    if (normalizedResume.includes(verb)) actionVerbCount++;
  });
  const actionVerbScore = Math.min(actionVerbCount * 20, 100);

  // Quantifiable achievements (looking for numbers/percentages)
  const hasNumbers = /\d+%|\d+x|\$\d+/.test(resumeText);
  const achievementsScore = hasNumbers ? 100 : 50;

  // Weighted final score
  // Keyword Match: 25%, Skills: 20%, JD Match: 20%, Exp: 15%, Completeness: 10%, Formatting: 5%, Achievements: 5%
  // Approximating this per user instruction
  const overallScore = Math.round(
    (keywordMatch * 0.45) + // Combining Keyword & Skills Match & JD Match conceptually
    (sectionCompleteness * 0.25) + // Combining Exp and Completeness
    (formattingScore * 0.15) +
    (actionVerbScore * 0.05) +
    (achievementsScore * 0.10)
  );

  return {
    overall_score: overallScore,
    keyword_match: keywordMatch,
    section_completeness: Math.round(sectionCompleteness),
    formatting_score: formattingScore,
    action_verb_score: actionVerbScore,
    achievements_score: achievementsScore,
    matched_keywords: matchedKeywords.slice(0, 15),
    missing_keywords: missingKeywords.slice(0, 15) // Limit to top 15 missing for prompt
  };
}

module.exports = {
  extractText,
  calculateDeterministicScore
};
