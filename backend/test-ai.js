const http = require('http');

async function testAI() {
  try {
    // 1. Register a dummy user to get a token
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AI Test',
        email: `test_${Date.now()}@test.com`,
        password: 'password123',
        age: '65',
        location: 'Delhi'
      })
    });
    const regData = await regRes.json();
    if (!regData.token) {
      console.error('Failed to register:', regData);
      return;
    }

    // 2. Test AI endpoint
    const aiRes = await fetch('http://localhost:5000/api/ai/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${regData.token}`
      },
      body: JSON.stringify({
        text: 'I am lonely',
        user: { name: 'AI Test', age: 65 },
        nearbyPeople: [],
        activities: []
      })
    });
    const aiData = await aiRes.json();
    console.log('AI Response:', aiData);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

testAI();
