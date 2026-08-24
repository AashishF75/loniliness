import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { io as ClientIo, Socket as ClientSocket } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';
import { initializeSocket } from './src/socket';
import familyRoutes from './src/routes/family.routes';
import authRoutes from './src/routes/auth.routes';

dotenv.config();

const prisma = new PrismaClient();
const PORT = 5099;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const BASE_URL = `http://localhost:${PORT}`;

async function runPhase3ATests() {
  console.log('=== PHASE 3A REAL-TIME INFRASTRUCTURE TEST SUITE ===\n');

  // Setup express & http server
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/family', familyRoutes);

  const server = http.createServer(app);
  initializeSocket(server);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}`);

  let testUsers: any[] = [];
  let testRelationships: any[] = [];

  try {
    // 1. Create Test Users in Database
    const timestamp = Date.now();

    // Senior A (Parent A)
    const seniorA = await prisma.user.create({
      data: {
        name: `Test Senior A ${timestamp}`,
        email: `seniorA_${timestamp}@test.com`,
        phone: `99${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'SENIOR',
        status: 'ACTIVE'
      }
    });
    testUsers.push(seniorA);

    // Senior B (Parent B)
    const seniorB = await prisma.user.create({
      data: {
        name: `Test Senior B ${timestamp}`,
        email: `seniorB_${timestamp}@test.com`,
        phone: `98${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'SENIOR',
        status: 'ACTIVE'
      }
    });
    testUsers.push(seniorB);

    // Family Member 1 (ACCEPTED + live-location ON + active ON)
    const fam1 = await prisma.user.create({
      data: {
        name: `Test Fam1 ${timestamp}`,
        email: `fam1_${timestamp}@test.com`,
        phone: `97${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'FAMILY',
        status: 'ACTIVE'
      }
    });
    testUsers.push(fam1);

    const rel1 = await prisma.familyRelationship.create({
      data: {
        parentId: seniorA.id,
        memberId: fam1.id,
        status: 'ACCEPTED'
      }
    });
    testRelationships.push(rel1);

    await prisma.familyPermissions.create({
      data: {
        relationshipId: rel1.id,
        shareActivities: true,
        shareLiveLocation: true,
        isLocationSharingActive: true
      }
    });

    // Family Member 2 (ACCEPTED + shareLiveLocation OFF)
    const fam2 = await prisma.user.create({
      data: {
        name: `Test Fam2 ${timestamp}`,
        email: `fam2_${timestamp}@test.com`,
        phone: `96${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'FAMILY',
        status: 'ACTIVE'
      }
    });
    testUsers.push(fam2);

    const rel2 = await prisma.familyRelationship.create({
      data: {
        parentId: seniorA.id,
        memberId: fam2.id,
        status: 'ACCEPTED'
      }
    });
    testRelationships.push(rel2);

    await prisma.familyPermissions.create({
      data: {
        relationshipId: rel2.id,
        shareActivities: true,
        shareLiveLocation: false,
        isLocationSharingActive: false
      }
    });

    // Family Member 3 (ACCEPTED + isLocationSharingActive OFF)
    const fam3 = await prisma.user.create({
      data: {
        name: `Test Fam3 ${timestamp}`,
        email: `fam3_${timestamp}@test.com`,
        phone: `95${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'FAMILY',
        status: 'ACTIVE'
      }
    });
    testUsers.push(fam3);

    const rel3 = await prisma.familyRelationship.create({
      data: {
        parentId: seniorA.id,
        memberId: fam3.id,
        status: 'ACCEPTED'
      }
    });
    testRelationships.push(rel3);

    await prisma.familyPermissions.create({
      data: {
        relationshipId: rel3.id,
        shareActivities: true,
        shareLiveLocation: true,
        isLocationSharingActive: false
      }
    });

    // Family Member 4 (REVOKED)
    const fam4 = await prisma.user.create({
      data: {
        name: `Test Fam4 ${timestamp}`,
        email: `fam4_${timestamp}@test.com`,
        phone: `94${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'FAMILY',
        status: 'ACTIVE'
      }
    });
    testUsers.push(fam4);

    const rel4 = await prisma.familyRelationship.create({
      data: {
        parentId: seniorA.id,
        memberId: fam4.id,
        status: 'REVOKED'
      }
    });
    testRelationships.push(rel4);

    await prisma.familyPermissions.create({
      data: {
        relationshipId: rel4.id,
        shareActivities: false,
        shareLiveLocation: false,
        isLocationSharingActive: false
      }
    });

    // Family Member 5 (No relationship with Senior A)
    const fam5 = await prisma.user.create({
      data: {
        name: `Test Fam5 ${timestamp}`,
        email: `fam5_${timestamp}@test.com`,
        phone: `93${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'FAMILY',
        status: 'ACTIVE'
      }
    });
    testUsers.push(fam5);

    // Suspended User
    const suspendedUser = await prisma.user.create({
      data: {
        name: `Test Suspended ${timestamp}`,
        email: `suspended_${timestamp}@test.com`,
        phone: `92${timestamp.toString().slice(-8)}`,
        password: 'password123',
        role: 'SENIOR',
        status: 'SUSPENDED'
      }
    });
    testUsers.push(suspendedUser);

    // Generate JWT tokens
    const tokenSeniorA = jwt.sign({ id: seniorA.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenSeniorB = jwt.sign({ id: seniorB.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenFam1 = jwt.sign({ id: fam1.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenFam2 = jwt.sign({ id: fam2.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenFam3 = jwt.sign({ id: fam3.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenFam4 = jwt.sign({ id: fam4.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenFam5 = jwt.sign({ id: fam5.id }, JWT_SECRET, { expiresIn: '1h' });
    const tokenSuspended = jwt.sign({ id: suspendedUser.id }, JWT_SECRET, { expiresIn: '1h' });

    // --- TEST 1: Valid authenticated Socket.IO connection ---
    console.log('TEST 1: Valid authenticated Socket.IO connection');
    const client1: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenSeniorA }, reconnection: false });
    const t1Passed = await new Promise<boolean>((resolve) => {
      client1.on('connect', () => resolve(true));
      client1.on('connect_error', () => resolve(false));
    });
    console.log(t1Passed ? '  -> PASS' : '  -> FAIL');
    client1.disconnect();

    // --- TEST 2: No JWT -> connection rejected ---
    console.log('TEST 2: No JWT -> connection rejected');
    const client2: ClientSocket = ClientIo(BASE_URL, { reconnection: false });
    const t2Passed = await new Promise<boolean>((resolve) => {
      client2.on('connect', () => resolve(false));
      client2.on('connect_error', (err: any) => resolve(err.message.includes('Missing token')));
    });
    console.log(t2Passed ? '  -> PASS' : '  -> FAIL');
    client2.disconnect();

    // --- TEST 3: Invalid JWT -> connection rejected ---
    console.log('TEST 3: Invalid JWT -> connection rejected');
    const client3: ClientSocket = ClientIo(BASE_URL, { auth: { token: 'invalid.jwt.token' }, reconnection: false });
    const t3Passed = await new Promise<boolean>((resolve) => {
      client3.on('connect', () => resolve(false));
      client3.on('connect_error', (err: any) => resolve(err.message.includes('Invalid or expired token')));
    });
    console.log(t3Passed ? '  -> PASS' : '  -> FAIL');
    client3.disconnect();

    // --- TEST 4: Suspended user -> connection rejected ---
    console.log('TEST 4: Suspended user -> connection rejected');
    const client4: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenSuspended }, reconnection: false });
    const t4Passed = await new Promise<boolean>((resolve) => {
      client4.on('connect', () => resolve(false));
      client4.on('connect_error', (err: any) => resolve(err.message.includes('Account suspended')));
    });
    console.log(t4Passed ? '  -> PASS' : '  -> FAIL');
    client4.disconnect();

    // --- TEST 5: Accepted FAMILY relationship + live-location permission ON + active ON -> location room authorization PASS ---
    console.log('TEST 5: Accepted FAMILY relationship + live-location permission ON + active ON');
    const client5: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenFam1 }, reconnection: false });
    await new Promise<void>((r) => client5.on('connect', r));
    const t5Passed = await new Promise<boolean>((resolve) => {
      client5.emit('join:location', { parentId: seniorA.id }, (res: any) => {
        resolve(res.success === true);
      });
    });
    console.log(t5Passed ? '  -> PASS' : '  -> FAIL');
    client5.disconnect();

    // --- TEST 6: Accepted relationship but shareLiveLocation OFF -> rejected ---
    console.log('TEST 6: Accepted relationship but shareLiveLocation OFF -> rejected');
    const client6: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenFam2 }, reconnection: false });
    await new Promise<void>((r) => client6.on('connect', r));
    const t6Passed = await new Promise<boolean>((resolve) => {
      client6.emit('join:location', { parentId: seniorA.id }, (res: any) => {
        resolve(res.success === false);
      });
    });
    console.log(t6Passed ? '  -> PASS' : '  -> FAIL');
    client6.disconnect();

    // --- TEST 7: Accepted relationship but isLocationSharingActive OFF -> rejected ---
    console.log('TEST 7: Accepted relationship but isLocationSharingActive OFF -> rejected');
    const client7: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenFam3 }, reconnection: false });
    await new Promise<void>((r) => client7.on('connect', r));
    const t7Passed = await new Promise<boolean>((resolve) => {
      client7.emit('join:location', { parentId: seniorA.id }, (res: any) => {
        resolve(res.success === false);
      });
    });
    console.log(t7Passed ? '  -> PASS' : '  -> FAIL');
    client7.disconnect();

    // --- TEST 8: REVOKED relationship -> rejected ---
    console.log('TEST 8: REVOKED relationship -> rejected');
    const client8: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenFam4 }, reconnection: false });
    await new Promise<void>((r) => client8.on('connect', r));
    const t8Passed = await new Promise<boolean>((resolve) => {
      client8.emit('join:location', { parentId: seniorA.id }, (res: any) => {
        resolve(res.success === false);
      });
    });
    console.log(t8Passed ? '  -> PASS' : '  -> FAIL');
    client8.disconnect();

    // --- TEST 9: Family member attempts another parent's location room -> rejected ---
    console.log('TEST 9: Family member attempts another parent\'s location room -> rejected');
    const client9: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenFam5 }, reconnection: false });
    await new Promise<void>((r) => client9.on('connect', r));
    const t9Passed = await new Promise<boolean>((resolve) => {
      client9.emit('join:location', { parentId: seniorA.id }, (res: any) => {
        resolve(res.success === false);
      });
    });
    console.log(t9Passed ? '  -> PASS' : '  -> FAIL');
    client9.disconnect();

    // --- TEST 10: Senior attempts another senior's location room -> rejected ---
    console.log('TEST 10: Senior attempts another senior\'s location room -> rejected');
    const client10: ClientSocket = ClientIo(BASE_URL, { auth: { token: tokenSeniorB }, reconnection: false });
    await new Promise<void>((r) => client10.on('connect', r));
    const t10Passed = await new Promise<boolean>((resolve) => {
      client10.emit('join:location', { parentId: seniorA.id }, (res: any) => {
        resolve(res.success === false);
      });
    });
    console.log(t10Passed ? '  -> PASS' : '  -> FAIL');
    client10.disconnect();

    // --- TEST 11: Unauthenticated client attempts location room -> rejected ---
    console.log('TEST 11: Unauthenticated client attempts location room -> rejected');
    const client11: ClientSocket = ClientIo(BASE_URL, { auth: { token: '' }, reconnection: false });
    const t11Passed = await new Promise<boolean>((resolve) => {
      client11.on('connect', () => resolve(false));
      client11.on('connect_error', () => resolve(true));
    });
    console.log(t11Passed ? '  -> PASS' : '  -> FAIL');
    client11.disconnect();

    // --- TEST 12: Existing REST Family APIs still pass ---
    console.log('TEST 12: Existing REST Family APIs still pass');
    const fetchApi = async (endpoint: string, method: string, token: string, body?: any) => {
      const headers: any = { Authorization: `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await globalThis.fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    const r1 = await fetchApi('/api/family/invitations', 'GET', tokenSeniorA);
    const r2 = await fetchApi('/api/family/members', 'GET', tokenSeniorA);
    const r3 = await fetchApi('/api/family/parents', 'GET', tokenFam1);
    const r4 = await fetchApi(`/api/family/permissions/${rel1.id}`, 'GET', tokenSeniorA);
    const r5 = await fetchApi(`/api/family/permissions/${rel1.id}`, 'PATCH', tokenSeniorA, { shareActivities: true });

    const t12Passed =
      r1.status === 200 && r1.data.success &&
      r2.status === 200 && r2.data.success &&
      r3.status === 200 && r3.data.success &&
      r4.status === 200 && r4.data.success &&
      r5.status === 200 && r5.data.success;

    console.log(t12Passed ? '  -> PASS' : `  -> FAIL (${r1.status}, ${r2.status}, ${r3.status}, ${r4.status}, ${r5.status})`);

    const allPassed = t1Passed && t2Passed && t3Passed && t4Passed && t5Passed &&
                      t6Passed && t7Passed && t8Passed && t9Passed && t10Passed &&
                      t11Passed && t12Passed;

    console.log('\n=== ALL PHASE 3A TEST RESULTS ===');
    console.log(allPassed ? 'ALL 12 SECURITY & REGRESSION TESTS PASSED PERFECTLY!' : 'SOME TESTS FAILED!');

  } finally {
    // Cleanup Test Data
    console.log('\nCleaning up test data...');
    for (const rel of testRelationships) {
      await prisma.familyPermissions.deleteMany({ where: { relationshipId: rel.id } }).catch(() => {});
      await prisma.familyRelationship.delete({ where: { id: rel.id } }).catch(() => {});
    }
    for (const user of testUsers) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    server.close();
    console.log('Cleanup complete.');
  }
}

runPhase3ATests().catch((err) => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
