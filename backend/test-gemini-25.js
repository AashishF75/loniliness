const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  try {
    const result = await model.generateContent("test");
    console.log("Success gemini-2.5-flash:", await result.response.text());
  } catch (err) {
    console.error("gemini-2.5-flash Error:", err.message);
  }
}

testGemini();
