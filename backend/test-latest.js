const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  try {
    const result = await model.generateContent("test");
    console.log("Success:", await result.response.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testGemini();
