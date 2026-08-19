import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const recommend = async (req: Request, res: Response): Promise<void> => {
  console.log('[AI Route] Reached /ai/recommend');
  try {
    const { user, nearbyPeople, activities, text } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[AI Route] API Key exists: ${apiKey ? 'YES' : 'NO'}`);
    if (!apiKey) {
      res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    console.log('[AI Route] Gemini client initialized');

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

    console.log('[AI Route] Sending request to Gemini API...');

    // Implement a 10-second timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 10000);
    });

    const result: any = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]);

    const response = await result.response;
    const responseText = response.text();
    console.log('[AI Route] Gemini response received successfully');

    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }

    const jsonResponse = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      data: jsonResponse
    });
  } catch (error: any) {
    console.error(`[AI Route] Error generating recommendations:`, error.message || error);

    const errMessage = error.message || '';

    if (errMessage === 'GEMINI_TIMEOUT') {
      res.status(503).json({ success: false, message: 'Saathi AI is temporarily unavailable (timeout). Please try again later.' });
      return;
    }

    if (errMessage.includes('429') || errMessage.toLowerCase().includes('quota')) {
      res.status(429).json({ success: false, message: 'Saathi AI quota exceeded. Please try again later.' });
      return;
    }

    if (errMessage.includes('500') || errMessage.includes('502') || errMessage.includes('503') || errMessage.includes('504')) {
      res.status(502).json({ success: false, message: 'Saathi AI service is currently experiencing issues. Please try again later.' });
      return;
    }

    res.status(500).json({ success: false, message: 'Failed to generate AI recommendations.' });
  }
};
