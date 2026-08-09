const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.create({
      data: {
        email: 'test' + Date.now() + '@example.com',
        name: 'Test',
        password: 'hash'
      }
    });
    console.log('Success:', user.id);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
