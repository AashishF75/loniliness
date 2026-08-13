const jwt = require('jsonwebtoken');

async function main() {
  const userId = '6a78c3df93ee0ddefb54a2fe';
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

  const res = await fetch('http://localhost:5000/api/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
}

require('dotenv').config();
main().catch(console.error);
