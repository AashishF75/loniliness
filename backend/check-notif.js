const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifs = await prisma.notification.findMany({
    where: { type: 'NEW_CONNECTION_REQUEST' },
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  
  if (notifs.length > 0) {
    console.log(JSON.stringify(notifs[0], null, 2));
    
    // Check the corresponding connection
    if (notifs[0].relatedConnectionId) {
      const conn = await prisma.connection.findUnique({
        where: { id: notifs[0].relatedConnectionId }
      });
      console.log('Connection:', JSON.stringify(conn, null, 2));
    }
  } else {
    console.log('No notifications found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
