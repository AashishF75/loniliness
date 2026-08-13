const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '6a781c43656d879b00893ab2'; // Navya

  // Create a connection just to see the structure
  await prisma.connection.create({
    data: {
      userId: userId,
      connectedId: '6a78b12a827b3a3f4341df77', // Test User
      status: 'ACCEPTED'
    }
  }).catch(e => console.log('Conn exists'));

  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { userId: userId, status: 'ACCEPTED' },
        { connectedId: userId, status: 'ACCEPTED' }
      ]
    },
    include: {
      user: {
        select: { id: true, name: true, city: true, locality: true, avatar: true, hobbies: true }
      },
      connected: {
        select: { id: true, name: true, city: true, locality: true, avatar: true, hobbies: true }
      }
    }
  });

  const formattedConnections = connections.map((conn) => {
    const otherUser = conn.userId === userId ? conn.connected : conn.user;
    return {
      id: conn.id,
      status: conn.status,
      createdAt: conn.createdAt,
      user: otherUser
    };
  });

  console.log(JSON.stringify(formattedConnections, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
