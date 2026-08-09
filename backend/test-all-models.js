const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAll() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash-lite',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash',
    'antigravity-preview-05-2026'
  ];

  for (const name of models) {
    try {
      console.log(`Testing ${name}...`);
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent("Respond with exactly: Saathi AI is working.");
      console.log(`SUCCESS ${name}:`, await result.response.text());
      break;
    } catch (err) {
      console.log(`FAILED ${name}:`, err.message.split('\n')[0]);
    }
  }
}

testAll();
