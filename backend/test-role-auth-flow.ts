import { prisma } from './src/db';
import { register, login } from './src/controllers/auth.controller';
import { sendConnectionRequest, updateConnectionStatus } from './src/controllers/connection.controller';

function createMockReqRes(body: any = {}, params: any = {}, user: any = null) {
  let resStatus = 200;
  let resJson: any = null;

  const req: any = {
    body,
    params,
    user,
    query: {}
  };

  const res: any = {
    status: (code: number) => {
      resStatus = code;
      return res;
    },
    json: (data: any) => {
      resJson = data;
      return res;
    }
  };

  return { req, res, getResult: () => ({ status: resStatus, data: resJson }) };
}

async function runRoleAuthTests() {
  console.log('====================================================');
  console.log('SAATHI — MASTER ROLE & AGE AUTHENTICATION TEST SUITE');
  console.log('====================================================\n');

  let passCount = 0;
  let failCount = 0;

  const assert = (condition: boolean, testName: string, detail: string = '') => {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName} ${detail}`);
      failCount++;
    }
  };

  const timestamp = Date.now();

  try {
    // SECTION 10 AGE POLICY TESTS:
    // FAMILY age 20 -> PASS
    const fam20Email = `fam20_${timestamp}@test.com`;
    const { req: rFam20Req, res: rFam20Res, getResult: gFam20 } = createMockReqRes({
      email: fam20Email, name: 'Fam 20', password: 'password123', age: '20', location: 'Delhi', role: 'FAMILY'
    });
    await register(rFam20Req, rFam20Res);
    assert(gFam20().status === 201, 'SECTION 10: FAMILY age 20 -> PASS', `Status: ${gFam20().status}`);

    // FAMILY age 30 -> PASS
    const fam30Email = `fam30_${timestamp}@test.com`;
    const { req: rFam30Req, res: rFam30Res, getResult: gFam30 } = createMockReqRes({
      email: fam30Email, name: 'Fam 30', password: 'password123', age: '30', location: 'Delhi', role: 'FAMILY'
    });
    await register(rFam30Req, rFam30Res);
    assert(gFam30().status === 201, 'SECTION 10: FAMILY age 30 -> PASS', `Status: ${gFam30().status}`);

    // FAMILY age 60 -> PASS
    const fam60Email = `fam60_${timestamp}@test.com`;
    const { req: rFam60Req, res: rFam60Res, getResult: gFam60 } = createMockReqRes({
      email: fam60Email, name: 'Fam 60', password: 'password123', age: '60', location: 'Delhi', role: 'FAMILY'
    });
    await register(rFam60Req, rFam60Res);
    assert(gFam60().status === 201, 'SECTION 10: FAMILY age 60 -> PASS', `Status: ${gFam60().status}`);

    // SENIOR age 49 -> FAIL
    const snr49Email = `snr49_${timestamp}@test.com`;
    const { req: rSnr49Req, res: rSnr49Res, getResult: gSnr49 } = createMockReqRes({
      email: snr49Email, name: 'Snr 49', password: 'password123', age: '49', location: 'Delhi', role: 'SENIOR'
    });
    await register(rSnr49Req, rSnr49Res);
    assert(gSnr49().status === 400, 'SECTION 10: SENIOR age 49 -> FAIL', `Status: ${gSnr49().status}`);

    // SENIOR age 50 -> PASS
    const snr50Email = `snr50_${timestamp}@test.com`;
    const { req: rSnr50Req, res: rSnr50Res, getResult: gSnr50 } = createMockReqRes({
      email: snr50Email, name: 'Snr 50', password: 'password123', age: '50', location: 'Delhi', role: 'SENIOR'
    });
    await register(rSnr50Req, rSnr50Res);
    assert(gSnr50().status === 201, 'SECTION 10: SENIOR age 50 -> PASS', `Status: ${gSnr50().status}`);

    // SENIOR age 60 -> PASS
    const snr60Email = `snr60_${timestamp}@test.com`;
    const { req: rSnr60Req, res: rSnr60Res, getResult: gSnr60 } = createMockReqRes({
      email: snr60Email, name: 'Snr 60', password: 'password123', age: '60', location: 'Delhi', role: 'SENIOR'
    });
    await register(rSnr60Req, rSnr60Res);
    assert(gSnr60().status === 201, 'SECTION 10: SENIOR age 60 -> PASS', `Status: ${gSnr60().status}`);

    // TEST 6: Family Member login -> SUCCESS
    const { req: req6, res: res6, getResult: getRes6 } = createMockReqRes({
      email: fam20Email,
      password: 'password123'
    });
    await login(req6, res6);
    const r6 = getRes6();
    assert(
      r6.status === 200 && r6.data?.success === true && r6.data?.role === 'FAMILY',
      'TEST 6: Family Member login',
      `Status: ${r6.status}, Role: ${r6.data?.role}`
    );

    // TEST 7: Senior Citizen login -> SUCCESS
    const { req: req7, res: res7, getResult: getRes7 } = createMockReqRes({
      email: snr50Email,
      password: 'password123'
    });
    await login(req7, res7);
    const r7 = getRes7();
    assert(
      r7.status === 200 && r7.data?.success === true && r7.data?.role === 'SENIOR',
      'TEST 7: Senior Citizen login',
      `Status: ${r7.status}, Role: ${r7.data?.role}`
    );

    // Fetch user IDs for connection tests
    const famUser = await prisma.user.findUnique({ where: { email: fam20Email } });
    const snrUser = await prisma.user.findUnique({ where: { email: snr50Email } });

    if (!famUser || !snrUser) {
      throw new Error('Test users not found for connection test');
    }

    // TEST 8: Family Member sends request to Senior -> SUCCESS
    const { req: req8, res: res8, getResult: getRes8 } = createMockReqRes(
      { targetUserId: snrUser.id },
      {},
      { id: famUser.id }
    );
    await sendConnectionRequest(req8, res8);
    const r8 = getRes8();
    assert(
      r8.status === 200 && r8.data?.success === true,
      'TEST 8: Family Member sends request to Senior',
      `Status: ${r8.status}, Connection ID: ${r8.data?.connection?.id}`
    );

    const connectionId = r8.data?.connection?.id;

    // TEST 9: Senior sends request to Family Member (with different users)
    const fam30User = await prisma.user.findUnique({ where: { email: fam30Email } });
    if (!fam30User) throw new Error('fam30User not found');

    const { req: req9, res: res9, getResult: getRes9 } = createMockReqRes(
      { targetUserId: fam30User.id },
      {},
      { id: snrUser.id }
    );
    await sendConnectionRequest(req9, res9);
    const r9 = getRes9();
    assert(
      r9.status === 200 && r9.data?.success === true,
      'TEST 9: Senior sends request to Family Member',
      `Status: ${r9.status}, Connection ID: ${r9.data?.connection?.id}`
    );

    // TEST 10: Unauthorized user cannot modify another user's connection request -> FAIL (Forbidden 403)
    // Third party user tries to accept/reject connectionId between famUser and snrUser
    const { req: req10, res: res10, getResult: getRes10 } = createMockReqRes(
      { status: 'ACCEPTED' },
      { id: connectionId },
      { id: fam30User.id } // fam30User is NOT the recipient (snrUser is recipient)
    );
    await updateConnectionStatus(req10, res10);
    const r10 = getRes10();
    assert(
      r10.status === 403 && r10.data?.success === false,
      'TEST 10: Unauthorized user cannot modify another user connection request',
      `Status: ${r10.status}, Message: "${r10.data?.message}"`
    );

    // Clean up created test accounts
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId: famUser.id },
          { userId: snrUser.id },
          { relatedUserId: famUser.id },
          { relatedUserId: snrUser.id }
        ]
      }
    });
    await prisma.connection.deleteMany({
      where: {
        OR: [
          { userId: famUser.id },
          { connectedId: famUser.id },
          { userId: snrUser.id },
          { connectedId: snrUser.id }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [fam20Email, fam30Email, fam60Email, snr49Email, snr50Email, snr60Email] }
      }
    });

    console.log('\n====================================================');
    console.log(`TEST RESULTS SUMMARY: PASSED ${passCount} / ${passCount + failCount}`);
    console.log('====================================================');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  }
}

runRoleAuthTests();
