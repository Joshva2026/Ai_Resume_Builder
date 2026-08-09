const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ACTION_VERBS = [
  'Spearheaded', 'Orchestrated', 'Accelerated', 'Engineered', 'Streamlined',
  'Championed', 'Amplified', 'Transformed', 'Architected', 'Optimized',
  'Delivered', 'Launched', 'Pioneered', 'Scaled', 'Automated', 'Reduced',
  'Increased', 'Built', 'Led', 'Developed'
];

async function rewriteText(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are a professional resume writer. Rewrite the following bullet point to be more professional, concise, and impactful. Ensure it starts with a strong action verb and removes any first-person pronouns (I, we). Do not make up any facts, only use what is provided. Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"original": "${text}", "rewritten": "...", "improvements": ["improvement 1", "improvement 2"]}\n\nBullet point to rewrite: "${text}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to rewrite text with AI');
  }
}

async function generateSummary(careerSummary) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are an expert resume writer. Create a professional, impactful 2-3 sentence resume summary based on the following input: "${careerSummary}". If the input is empty or vague, create a strong general professional summary. Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"suggestion": "..."}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate summary with AI');
  }
}

async function getKeywords(jobRole) {
  const role = (jobRole || '').toLowerCase();
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `Provide a list of 10-15 key skills and ATS keywords commonly found in job descriptions for the role of "${role}". Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"keywords": ["keyword 1", "keyword 2"]}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate keywords with AI');
  }
}

async function generateCoverLetter(jobTitle, companyName, resumeContext = '') {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `Write a professional, concise cover letter for the position of "${jobTitle}" at "${companyName}". 
    Use the following resume context (if provided) to personalize it: ${resumeContext}. 
    Keep it under 300 words. Do not make up fake experiences. 
    Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"coverLetter": "..."}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate cover letter with AI');
  }
}

async function getAtsQualitativeFeedback(jobDescription, resumeText, missingKeywords) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and technical recruiter. 
    Compare the provided resume against the job description.
    
    You have been provided with a list of missing keywords identified by our deterministic engine: ${missingKeywords.join(', ')}
    
    Provide actionable, qualitative suggestions for the candidate on how they can improve their resume for this specific job description. Explain *why* the missing keywords are important and how they could incorporate them. Provide suggestions on formatting, action verbs, and quantifying achievements.
    
    Do NOT provide any numeric scores.
    
    Job Description:
    ${jobDescription}
    
    Resume Text:
    ${resumeText}
    
    Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:
    {
      "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
      "detailed_feedback": {
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1"]
      }
    }`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini ATS API Error:', error);
    throw new Error('Failed to analyze ATS with AI');
  }
}

module.exports = {
  ACTION_VERBS,
  rewriteText,
  generateSummary,
  getKeywords,
  generateCoverLetter,
  getAtsQualitativeFeedback
};
