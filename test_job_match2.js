const aiService = require('./backend/ai-service');
require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/db');

async function test() {
  try {
    const resumeText = 'Software Engineer with 5 years of experience in JavaScript, React, and Node.js.';
    const jobDescription = 'Looking for a Senior Software Engineer with strong React and Node.js skills.';
    console.log("Calling Gemini API...");
    const match = await aiService.generateJobMatch(resumeText, jobDescription);
    console.log("Match success:", match);
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}
test();
