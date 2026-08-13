const jwt = require('jsonwebtoken');

async function main() {
  // Let's assume Navya (userId = '6a781c43656d879b00893ab2') receives a request.
  // Test User (userId = '6a78b12a827b3a3f4341df77') sends it.
  const receiverId = '6a78b12a827b3a3f4341df77'; 
  const token = jwt.sign({ id: receiverId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

  // Let's create a pending connection first
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const conn = await prisma.connection.create({
    data: {
      userId: '6a781c43656d879b00893ab2',
      connectedId: receiverId,
      status: 'PENDING'
    }
  });

  // Now let's try to accept it using the endpoint!
  const res = await fetch(`http://localhost:5000/api/connections/${conn.id}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('API Response:', JSON.stringify(data, null, 2));

  await prisma.$disconnect();
}

require('dotenv').config();
main().catch(console.error);
