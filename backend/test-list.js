require('dotenv').config();

async function testFetch() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testFetch();
