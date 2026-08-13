const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '6a78b12a827b3a3f4341df77'; // Test User (Receiver)
  const otherUserId = '6a781c43656d879b00893ab2'; // Navya (Sender)

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
    console.log(`conn.userId: ${conn.userId}, typeof: ${typeof conn.userId}`);
    console.log(`userId: ${userId}, typeof: ${typeof userId}`);
    console.log(`conn.userId === userId: ${conn.userId === userId}`);
    
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
