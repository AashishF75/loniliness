const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Key exists:", !!apiKey);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent("Respond with exactly: Saathi AI is working.");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (err) {
    console.error("Gemini Error:", err);
  }
}

testGemini();
