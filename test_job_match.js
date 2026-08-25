const aiService = require('./backend/ai-service');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  try {
    const resumeText = 'Software Engineer with 5 years of experience in JavaScript, React, and Node.js.';
    const jobDescription = 'Looking for a Senior Software Engineer with strong React and Node.js skills.';
    const match = await aiService.generateJobMatch(resumeText, jobDescription);
    console.log(match);
  } catch (error) {
    console.error('Test error:', error);
  }
}
test();
