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

function getResumeContext(resumeContent, query = '') {
  if (!resumeContent) return '';
  
  let parsedContent = resumeContent;
  if (typeof resumeContent === 'string') {
    try {
      parsedContent = JSON.parse(resumeContent);
    } catch (e) {
      // If it's not JSON, it could be raw text
      return `Resume Content:\n${resumeContent.slice(0, 1800)}`;
    }
  }

  // Handle raw text fallback inside parsed JSON
  if (parsedContent.rawText) {
    return `Resume Content:\n${parsedContent.rawText}`;
  }

  const queryLower = query.toLowerCase();
  // Always include resume context unless explicitly asked not to
  const showAll = !queryLower.includes('ignore my resume') && !queryLower.includes('without context');
  
  let formatted = '';
  
  const p = parsedContent.personal || {};
  if (p.fullName || p.email) {
    formatted += `### Personal Info\n`;
    if (p.fullName) formatted += `- Name: ${p.fullName}\n`;
    if (p.email) formatted += `- Email: ${p.email}\n`;
    if (p.phone) formatted += `- Phone: ${p.phone}\n`;
    if (p.location) formatted += `- Location: ${p.location}\n`;
    if (p.link) formatted += `- Link: ${p.link}\n`;
  }
  
  if (showAll && parsedContent.summary) {
    formatted += `\n### Professional Summary\n${parsedContent.summary}\n`;
  }
  
  if (showAll && parsedContent.skills) {
    formatted += `\n### Skills\n${parsedContent.skills}\n`;
  }
  
  if (showAll && Array.isArray(parsedContent.experience) && parsedContent.experience.length > 0) {
    formatted += `\n### Experience\n`;
    parsedContent.experience.forEach(e => {
      const expStart = e.start || e.startDate || '';
      const expEnd = e.end || e.endDate || 'Present';
      formatted += `- **${e.role || 'Role'}** at ${e.company || 'Company'} (${expStart} - ${expEnd})\n`;
      if (e.description) {
        formatted += `  Description:\n${e.description.split('\n').filter(Boolean).map(l => `  * ${l.trim()}`).join('\n')}\n`;
      }
    });
  }
  
  if (showAll && Array.isArray(parsedContent.projects) && parsedContent.projects.length > 0) {
    formatted += `\n### Projects\n`;
    parsedContent.projects.forEach(pr => {
      formatted += `- **${pr.name || pr.title || 'Project'}**${pr.link ? ` (${pr.link})` : ''}\n`;
      if (pr.description) {
        formatted += `  Description:\n${pr.description.split('\n').filter(Boolean).map(l => `  * ${l.trim()}`).join('\n')}\n`;
      }
    });
  }
  
  if (showAll && Array.isArray(parsedContent.education) && parsedContent.education.length > 0) {
    formatted += `\n### Education\n`;
    parsedContent.education.forEach(ed => {
      const eduStart = ed.start || '';
      const eduEnd = ed.end || '';
      const eduYear = ed.year || '';
      const dateStr = eduStart && eduEnd ? `${eduStart} - ${eduEnd}` : (eduYear || eduStart || eduEnd);
      formatted += `- **${ed.degree || 'Degree'}**, ${ed.school || 'School'} (${dateStr})\n`;
    });
  }

  if (parsedContent.certifications && showAll) {
    formatted += `\n### Certifications\n${parsedContent.certifications}\n`;
  }
  
  return formatted;
}

async function assistantChat(messages, userContext = null, stream = false) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  const lastUserMsg = (messages && messages.length) ? messages[messages.length - 1].content : '';
  
  let systemInstruction = `You are the ResumeForge AI Career Assistant, an intelligent AI career and resume assistant. You help users with resume building, ATS optimization, job applications, interview preparation, career questions, skills, projects, professional summaries, cover letters, and career development.

Answer the user's actual question directly.
Do not provide generic resume advice unless the user asks for it.
Use the user's resume context when available.
Maintain conversation context.
Ask a clarifying question when necessary.
Do not pretend to know information that is not available.
Do not fabricate resume details, work experience, skills, companies, education, or achievements.
Give practical, specific answers.
Use natural conversational language.
Adapt the answer length to the user's question: for simple questions, give a concise answer; for complex questions, provide a detailed explanation.
You are a conversational assistant, not a static resume recommendation generator.
Format your responses using clean markdown (bolding, bullet points, numbered lists, section headers, code blocks, tables where appropriate) to make reading easy. Only use numbered lists when they genuinely improve readability. Do not force every answer into a fixed template.`;

  let contextStr = '';
  if (userContext) {
    contextStr += `\n\nUser Profile Info:\n`;
    if (userContext.firstName || userContext.lastName) {
      contextStr += `- Name: ${userContext.firstName || ''} ${userContext.lastName || ''}\n`;
    }
    if (userContext.location) contextStr += `- Location: ${userContext.location}\n`;
    if (userContext.bio) contextStr += `- Bio: ${userContext.bio}\n`;

    if (userContext.latestResume) {
      const resumeInfo = getResumeContext(userContext.latestResume.content, lastUserMsg);
      if (resumeInfo) {
        contextStr += `\nLatest Resume Context (filtered for query relevance):\n${resumeInfo}\n`;
      }
    } else {
      contextStr += `\nIMPORTANT: The user has no resume currently selected or uploaded. Clearly state to the user that no resume is currently selected and they should upload or build one first before you can provide resume-specific recommendations.\n`;
    }

    if (userContext.latestAtsReport) {
      contextStr += `\nLatest ATS Report:\n`;
      contextStr += `- Overall Score: ${userContext.latestAtsReport.score}/100\n`;
      if (userContext.latestAtsReport.missingKeywords) {
        contextStr += `- Missing Keywords: ${userContext.latestAtsReport.missingKeywords}\n`;
      }
      if (userContext.latestAtsReport.suggestions) {
        contextStr += `- Suggestions: ${userContext.latestAtsReport.suggestions}\n`;
      }
    }
  }

  if (contextStr) {
    systemInstruction += contextStr;
  }

  // Convert messages to Gemini API format (role must be 'user' or 'model')
  const contents = (messages || []).map(m => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    return {
      role: role,
      parts: [{ text: m.content }]
    };
  });

  if (stream) {
    return await ai.models.generateContentStream({
      model: 'gemini-flash-latest',
      contents: contents,
      config: {
        systemInstruction: systemInstruction
      }
    });
  } else {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: contents,
      config: {
        systemInstruction: systemInstruction
      }
    });

    const reply = response.text ? response.text.trim() : 'I am here to help you optimize your resume, ATS score, and career strategy. How can I help you today?';
    return { reply };
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
      model: 'gemini-flash-latest',
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
      model: 'gemini-flash-latest',
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
      model: 'gemini-flash-latest',
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
      model: 'gemini-flash-latest',
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


async function generateLinkedInReview(profileText) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are a professional LinkedIn optimizer and recruiter.
    Analyze the following pasted LinkedIn profile text. Evaluate its strength, headline, about section, experience description, and search/recruiter friendliness.
    
    Profile Text:
    ${profileText}
    
    Return ONLY a JSON object matching this schema, with no markdown code blocks:
    {
      "overall_score": 75,
      "headline_review": "Feedback on headline",
      "about_review": "Feedback on about section",
      "experience_review": "Feedback on experience description",
      "suggestions": ["suggestion 1", "suggestion 2"],
      "keyword_density": [
        { "keyword": "React", "count": 2, "density": "Low" }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini LinkedIn API Error:', error.message);
    throw new Error('Failed to analyze LinkedIn profile with AI');
  }
}


async function generateJobMatch(resumeText, jobDescription) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are an expert recruiter and Applicant Tracking System (ATS) matching system.
    Compare the following resume against the job description.
    
    Resume Text:
    ${resumeText}
    
    Job Description:
    ${jobDescription}
    
    Analyze the match percentage based on skills, experience level, and certifications. Identify matched keywords, missing keywords, and detailed suggestions.
    
    Return ONLY a JSON object matching this schema, with no markdown code blocks:
    {
      "match_percentage": 78,
      "strong_matches": ["skill 1", "experience match description"],
      "missing_matches": ["skill A", "AWS Experience"],
      "recommendations": ["suggestion 1", "suggestion 2"]
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini Job Match API Error:', error.message);
    throw new Error('Failed to analyze job match with AI');
  }
}

async function generateOptimizationPlan(resumeText) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are a premium resume optimization service.
    Analyze the following resume and return an improvement plan. Evaluate action verbs, quantifiable achievements, formatting, skills layout, and professional summary.
    
    Resume Text:
    ${resumeText}
    
    Return ONLY a JSON object matching this schema, with no markdown code blocks:
    {
      "overall_score": 82,
      "formatting_status": "Good",
      "strengths": ["Strong skills section", "Good contact info"],
      "improvements": [
        {
          "type": "experience",
          "severity": "Warning",
          "message": "Too many vague verbs like 'Worked on'",
          "details": "Action verbs capture impact much better than passive descriptions.",
          "fix": "Rewrite to start with 'Spearheaded' or 'Orchestrated'."
        }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini Optimize API Error:', error.message);
    throw new Error('Failed to generate resume optimization plan');
  }
}

async function generateCoverLetter(resumeText, jobTitle, companyName, jobDescription = '') {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI service is not configured.');
  }

  try {
    const prompt = `You are a professional cover letter writer.
    Generate a tailored cover letter for the role of "${jobTitle}" at "${companyName}".
    Use the following resume context to extract relevant achievements and skills. Only use information provided in the resume context, do not fabricate accomplishments.
    
    Resume Context:
    ${resumeText}
    
    Job Description (if provided):
    ${jobDescription}
    
    Return ONLY a JSON object matching this schema, with no markdown code blocks:
    {
      "letter": "Dear Hiring Manager... \\n\\nSincerely, \\n[Name]"
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
    console.error('Gemini Cover Letter API Error:', error.message);
    throw new Error('Failed to generate cover letter with AI');
  }
}

module.exports = {
  ACTION_VERBS,
  assistantChat,
  rewriteText,
  generateSummary,
  getKeywords,
  getAtsQualitativeFeedback,
  generateLinkedInReview,
  generateJobMatch,
  generateOptimizationPlan,
  generateCoverLetter
};
