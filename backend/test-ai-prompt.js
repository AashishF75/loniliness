const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  const user = { name: "Test User", age: 70, interests: ["reading"] };
  const text = "I'm feeling lonely";
  const nearbyPeople = [{ name: "Friend", age: 71, distance: 2 }];
  const activities = [{ name: "Book Club", participants: 5 }];

  const prompt = `
You are Saathi, a friendly and supportive AI companion for senior citizens in India.
Do not claim to be a medical professional and do not provide medical diagnosis.
Keep your response supportive and simple.

User info: ${JSON.stringify(user)}
User Message: "${text}"

Available Nearby People: ${JSON.stringify(nearbyPeople)}
Available Activities: ${JSON.stringify(activities)}

Task: 
Analyze the user's message, mood, interests, and profile.
Recommend suitable nearby people from the provided list. 
Recommend suitable activities from the provided list.
Provide a short, supportive response message.

Output your response ONLY in JSON format exactly like this:
{
  "message": "I'm here with you. I found some activities and people you may enjoy.",
  "recommendedPeople": [
    { "title": "Name (Age xx)", "subtitle": "x.x km away", "stat": "Shared interests..." }
  ],
  "recommendedActivities": [
    { "title": "Activity Name", "subtitle": "Time • Location", "stat": "x participants" }
  ]
}
Return ONLY valid JSON.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    console.log("Response text:", responseText);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }
    const jsonResponse = JSON.parse(jsonMatch[0]);
    console.log("Parsed JSON:", jsonResponse);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testGemini();
