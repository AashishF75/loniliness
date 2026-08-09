require('dotenv').config();

async function testFetch() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testFetch();
