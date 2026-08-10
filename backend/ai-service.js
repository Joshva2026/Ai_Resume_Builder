const { GoogleGenAI } = require('@google/genai');

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client');
    return null;
  }
}

const ACTION_VERBS = [
  'Spearheaded', 'Orchestrated', 'Accelerated', 'Engineered', 'Streamlined',
  'Championed', 'Amplified', 'Transformed', 'Architected', 'Optimized',
  'Delivered', 'Launched', 'Pioneered', 'Scaled', 'Automated', 'Reduced',
  'Increased', 'Built', 'Led', 'Developed'
];

async function assistantChat(messages, userContext = null) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  let systemInstruction = `You are the ResumeForge AI Career Assistant, an expert resume writer, ATS optimization advisor, cover letter coach, and career strategist.
Your goal is to provide clear, actionable, high-quality, professional advice to job candidates.
Format your responses using clean markdown (bolding, bullet points, numbered lists, section headers) to make reading easy.
Be encouraging, precise, and practical. Focus on helping candidates highlight measurable achievements and pass ATS filters.`;

  if (userContext) {
    systemInstruction += `\n\nUser Context:\n`;
    if (userContext.firstName || userContext.lastName) {
      systemInstruction += `- Name: ${userContext.firstName || ''} ${userContext.lastName || ''}\n`;
    }
    if (userContext.email) systemInstruction += `- Email: ${userContext.email}\n`;
    if (userContext.location) systemInstruction += `- Location: ${userContext.location}\n`;
    if (userContext.bio) systemInstruction += `- Bio: ${userContext.bio}\n`;

    if (userContext.latestResume) {
      systemInstruction += `- Latest Resume Title: "${userContext.latestResume.title}"\n`;
      systemInstruction += `- Resume Content Snippet: ${userContext.latestResume.content.slice(0, 1500)}\n`;
    }

    if (userContext.latestAtsReport) {
      systemInstruction += `- Latest ATS Score: ${userContext.latestAtsReport.score}/100\n`;
      if (userContext.latestAtsReport.missingKeywords) {
        systemInstruction += `- Missing Keywords: ${userContext.latestAtsReport.missingKeywords}\n`;
      }
    }
  }

  const conversationText = (messages || []).map(m => {
    const roleLabel = m.role === 'user' ? 'User' : 'Assistant';
    return `${roleLabel}: ${m.content}`;
  }).join('\n\n');

  const fullPrompt = `${systemInstruction}\n\nConversation History:\n${conversationText}\n\nAssistant:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
    });

    const reply = response.text ? response.text.trim() : 'I am here to help you optimize your resume, ATS score, and career strategy. How can I help you today?';
    return { reply };
  } catch (error) {
    console.error('Gemini Assistant API Warning:', error.message || 'Error executing request');
    // Provide intelligent fallback advice if Gemini quota is temporarily exceeded
    const lastUserMsg = (messages && messages.length) ? messages[messages.length - 1].content : '';
    return {
      reply: `Here are key recommendations for your query:\n\n` +
        `1. **Focus on Action Verbs & Metrics**: Start every experience bullet point with strong action verbs (e.g. *Engineered*, *Spearheaded*, *Optimized*) and include measurable numbers or percentages.\n` +
        `2. **Match Job Description Keywords**: Include exact technical skills and domain terms from the target job posting.\n` +
        `3. **Keep Formatting Clean**: Use single-column layouts with standard section headings (Experience, Education, Skills) to pass ATS parsers easily.`
    };
  }
}

async function rewriteText(text) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are a professional resume writer. Rewrite the following bullet point to be more professional, concise, and impactful. Ensure it starts with a strong action verb and removes any first-person pronouns (I, we). Do not make up any facts, only use what is provided. Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"original": "${text}", "rewritten": "...", "improvements": ["improvement 1", "improvement 2"]}\n\nBullet point to rewrite: "${text}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error.message || 'Error executing request');
    throw new Error('Failed to rewrite text with AI');
  }
}

async function generateSummary(careerSummary) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are an expert resume writer. Create a professional, impactful 2-3 sentence resume summary based on the following input: "${careerSummary}". If the input is empty or vague, create a strong general professional summary. Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"suggestion": "..."}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error.message || 'Error executing request');
    throw new Error('Failed to generate summary with AI');
  }
}

async function getKeywords(jobRole) {
  const role = (jobRole || '').toLowerCase();
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `Provide a list of 10-15 key skills and ATS keywords commonly found in job descriptions for the role of "${role}". Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"keywords": ["keyword 1", "keyword 2"]}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error.message || 'Error executing request');
    throw new Error('Failed to generate keywords with AI');
  }
}

async function generateCoverLetter(jobTitle, companyName, resumeContext = '') {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `Write a professional, concise cover letter for the position of "${jobTitle}" at "${companyName}". 
    Use the following resume context (if provided) to personalize it: ${resumeContext}. 
    Keep it under 300 words. Do not make up fake experiences. 
    Return ONLY a JSON object exactly matching this schema, with no markdown code blocks:\n\n{"coverLetter": "..."}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini API Error:', error.message || 'Error executing request');
    throw new Error('Failed to generate cover letter with AI');
  }
}

async function getAtsQualitativeFeedback(jobDescription, resumeText, missingKeywords) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const missingStr = Array.isArray(missingKeywords) ? missingKeywords.join(', ') : '';
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and technical recruiter. 
    Compare the provided resume against the job description.
    
    Missing keywords: ${missingStr}
    
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
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini ATS API Error:', error.message || 'Error executing request');
    throw new Error('Failed to analyze ATS with AI');
  }
}

module.exports = {
  ACTION_VERBS,
  assistantChat,
  rewriteText,
  generateSummary,
  getKeywords,
  generateCoverLetter,
  getAtsQualitativeFeedback
};
