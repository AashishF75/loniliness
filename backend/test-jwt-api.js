const jwt = require('jsonwebtoken');

async function main() {
  const userId = '6a781c43656d879b00893ab2'; // Sender
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

  const res = await fetch('http://localhost:5000/api/connections', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
}

require('dotenv').config();
main().catch(console.error);
