import { prisma } from './src/db';
import jwt from 'jsonwebtoken';
import { sendFamilyInvitation, acceptFamilyInvitation } from './src/controllers/family.controller';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function runFamilyAgePolicyTests() {
  console.log('=== SAATHI FAMILY AGE POLICY VERIFICATION TEST SUITE ===\n');

  let seniorUser: any;
  let youngFamilyUser: any;   // Age 16 (< 18)
  let adultFamilyUser: any;   // Age 30
  let elderFamilyUser: any;   // Age 75 (> 50)
  let noAgeFamilyUser: any;   // Age null

  try {
    // 1. Create Senior Account (Age 65)
    seniorUser = await prisma.user.create({
      data: {
        name: 'Senior Parent',
        email: `senior_age_test_${Date.now()}@test.com`,
        password: 'password123',
        role: 'SENIOR',
        age: 65,
        status: 'ACTIVE'
      }
    });

    // 2. Create Young Family Account (Age 16)
    youngFamilyUser = await prisma.user.create({
      data: {
        name: 'Young Family Member (Age 16)',
        email: `young_fam_${Date.now()}@test.com`,
        password: 'password123',
        role: 'FAMILY',
        age: 16,
        status: 'ACTIVE'
      }
    });

    // 3. Create Adult Family Account (Age 30)
    adultFamilyUser = await prisma.user.create({
      data: {
        name: 'Adult Family Member (Age 30)',
        email: `adult_fam_${Date.now()}@test.com`,
        password: 'password123',
        role: 'FAMILY',
        age: 30,
        status: 'ACTIVE'
      }
    });

    // 4. Create Elder Family Account (Age 75)
    elderFamilyUser = await prisma.user.create({
      data: {
        name: 'Elder Family Member (Age 75)',
        email: `elder_fam_${Date.now()}@test.com`,
        password: 'password123',
        role: 'FAMILY',
        age: 75,
        status: 'ACTIVE'
      }
    });

    // 5. Create Family Account without Age (null)
    noAgeFamilyUser = await prisma.user.create({
      data: {
        name: 'No Age Specified Family Member',
        email: `noage_fam_${Date.now()}@test.com`,
        password: 'password123',
        role: 'FAMILY',
        age: null,
        status: 'ACTIVE'
      }
    });

    console.log('Test Accounts Created:');
    console.log(` - Senior (Age 65): ${seniorUser.email}`);
    console.log(` - Young Family (Age 16): ${youngFamilyUser.email}`);
    console.log(` - Adult Family (Age 30): ${adultFamilyUser.email}`);
    console.log(` - Elder Family (Age 75): ${elderFamilyUser.email}`);
    console.log(` - No-Age Family (Age null): ${noAgeFamilyUser.email}\n`);

    // Helper to mock express Request and Response
    const mockReqRes = (user: any, body: any = {}, params: any = {}) => {
      let resData: any = null;
      let resStatus: number = 200;
      const req: any = { user, body, params };
      const res: any = {
        status: (code: number) => {
          resStatus = code;
          return res;
        },
        json: (data: any) => {
          resData = data;
          return res;
        }
      };
      return { req, res, getResult: () => ({ status: resStatus, data: resData }) };
    };

    // ------------------------------------------------------------------
    // TEST A: Young FAMILY account (Age 16 < 18) can be invited by SENIOR
    // ------------------------------------------------------------------
    console.log('TEST A: SENIOR invites Young FAMILY member (Age 16)');
    const tA = mockReqRes(seniorUser, { identifier: youngFamilyUser.email });
    await sendFamilyInvitation(tA.req, tA.res);
    const resA = tA.getResult();
    const tAPassed = resA.status === 201 && resA.data.success === true;
    console.log(tAPassed ? '  -> PASS' : `  -> FAIL (Status ${resA.status})`);

    // ------------------------------------------------------------------
    // TEST B: Older FAMILY account (Age 75 > 50) can be invited by SENIOR
    // ------------------------------------------------------------------
    console.log('TEST B: SENIOR invites Elder FAMILY member (Age 75)');
    const tB = mockReqRes(seniorUser, { identifier: elderFamilyUser.email });
    await sendFamilyInvitation(tB.req, tB.res);
    const resB = tB.getResult();
    const tBPassed = resB.status === 201 && resB.data.success === true;
    console.log(tBPassed ? '  -> PASS' : `  -> FAIL (Status ${resB.status})`);

    // ------------------------------------------------------------------
    // TEST C: FAMILY account with Age null can be invited by SENIOR
    // ------------------------------------------------------------------
    console.log('TEST C: SENIOR invites No-Age FAMILY member (Age null)');
    const tC = mockReqRes(seniorUser, { identifier: noAgeFamilyUser.email });
    await sendFamilyInvitation(tC.req, tC.res);
    const resC = tC.getResult();
    const tCPassed = resC.status === 201 && resC.data.success === true;
    console.log(tCPassed ? '  -> PASS' : `  -> FAIL (Status ${resC.status})`);

    // ------------------------------------------------------------------
    // TEST D: Young FAMILY account (Age 16) accepts invitation
    // ------------------------------------------------------------------
    console.log('TEST D: Young FAMILY member (Age 16) accepts invitation');
    const relYoung = resA.data.relationship;
    const tD = mockReqRes(youngFamilyUser, {}, { id: relYoung.id });
    await acceptFamilyInvitation(tD.req, tD.res);
    const resD = tD.getResult();
    const tDPassed = resD.status === 200 && resD.data.success === true && resD.data.relationship.status === 'ACCEPTED';
    console.log(tDPassed ? '  -> PASS' : `  -> FAIL (Status ${resD.status})`);

    // ------------------------------------------------------------------
    // TEST E: Elder FAMILY account (Age 75) accepts invitation
    // ------------------------------------------------------------------
    console.log('TEST E: Elder FAMILY member (Age 75) accepts invitation');
    const relElder = resB.data.relationship;
    const tE = mockReqRes(elderFamilyUser, {}, { id: relElder.id });
    await acceptFamilyInvitation(tE.req, tE.res);
    const resE = tE.getResult();
    const tEPassed = resE.status === 200 && resE.data.success === true && resE.data.relationship.status === 'ACCEPTED';
    console.log(tEPassed ? '  -> PASS' : `  -> FAIL (Status ${resE.status})`);

    // ------------------------------------------------------------------
    // TEST F: Preserved SENIOR Eligibility Gating (FAMILY cannot send invitation)
    // ------------------------------------------------------------------
    console.log('TEST F: FAMILY member attempts to send family invitation -> Rejected');
    const tF = mockReqRes(youngFamilyUser, { identifier: adultFamilyUser.email });
    await sendFamilyInvitation(tF.req, tF.res);
    const resF = tF.getResult();
    const tFPassed = resF.status === 403 && resF.data.success === false && resF.data.message.includes('Only SENIOR accounts');
    console.log(tFPassed ? '  -> PASS' : `  -> FAIL (Status ${resF.status})`);

    // ------------------------------------------------------------------
    // TEST G: Cannot invite non-FAMILY account (e.g. SENIOR)
    // ------------------------------------------------------------------
    console.log('TEST G: SENIOR attempts to invite another SENIOR as family -> Rejected');
    const senior2 = await prisma.user.create({
      data: { name: 'Senior Two', email: `senior2_${Date.now()}@test.com`, password: 'pass', role: 'SENIOR', status: 'ACTIVE' }
    });
    const tG = mockReqRes(seniorUser, { identifier: senior2.email });
    await sendFamilyInvitation(tG.req, tG.res);
    const resG = tG.getResult();
    const tGPassed = resG.status === 403 && resG.data.success === false && resG.data.message.includes('FAMILY role');
    console.log(tGPassed ? '  -> PASS' : `  -> FAIL (Status ${resG.status})`);

    const allPassed = tAPassed && tBPassed && tCPassed && tDPassed && tEPassed && tFPassed && tGPassed;

    console.log('\n=== FAMILY AGE POLICY TEST SUMMARY ===');
    if (allPassed) {
      console.log('ALL FAMILY AGE POLICY TESTS PASSED PERFECTLY!\n');
    } else {
      console.error('SOME TESTS FAILED!\n');
    }
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    console.log('Cleaning up test data...');
    try {
      const userIds = [seniorUser?.id, youngFamilyUser?.id, adultFamilyUser?.id, elderFamilyUser?.id, noAgeFamilyUser?.id].filter(Boolean);
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } }
      });
      await prisma.familyPermissions.deleteMany({
        where: {
          relationship: { parentId: seniorUser?.id }
        }
      });
      await prisma.familyRelationship.deleteMany({
        where: { parentId: seniorUser?.id }
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  }
}

runFamilyAgePolicyTests();
