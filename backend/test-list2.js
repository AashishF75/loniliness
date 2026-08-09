require('dotenv').config();

async function testFetch() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const json = await res.json();
  const models = json.models.map(m => m.name);
  console.log("Available models:", models);
}

testFetch();
