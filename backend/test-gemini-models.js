const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Actually, there's no ListModels in the JS SDK? Let me use gemini-1.5-flash-latest
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  
  try {
    const result = await model.generateContent("test");
    console.log("Success gemini-1.5-flash-latest:", await result.response.text());
  } catch (err) {
    console.error("gemini-1.5-flash-latest Error:", err.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result2 = await model2.generateContent("test");
    console.log("Success gemini-1.5-pro:", await result2.response.text());
  } catch (err) {
    console.error("gemini-1.5-pro Error:", err.message);
  }
}

testGemini();
