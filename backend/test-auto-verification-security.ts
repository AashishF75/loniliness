import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { prisma } from './src/db';
import authRoutes from './src/routes/auth.routes';
import verificationRoutes from './src/routes/verification.routes';
import connectionRoutes from './src/routes/connection.routes';
import familyRoutes from './src/routes/family.routes';
import circleRoutes from './src/routes/circle.routes';
import adminRoutes from './src/routes/admin.routes';
import { requireVerifiedSenior, protect } from './src/middleware/auth.middleware';

dotenv.config();

const PORT = 5199;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const BASE_URL = `http://localhost:${PORT}`;

function createToken(user: { id: string; role: string }): string {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function createIdCardImage(name: string, dobString: string): Promise<Buffer> {
  const svg = `
    <svg width="600" height="350">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="#000000">GOVERNMENT OF INDIA</text>
      <text x="50" y="140" font-family="Arial" font-size="24" fill="#000000">Name: ${name}</text>
      <text x="50" y="210" font-family="Arial" font-size="24" fill="#000000">DOB: ${dobString}</text>
      <text x="50" y="280" font-family="Arial" font-size="20" fill="#000000">Senior Citizen Identity Card</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function runAutoVerificationSecuritySuite() {
  console.log('================================================================');
  console.log('  SAATHI — AUTOMATIC SENIOR VERIFICATION SECURITY TEST SUITE   ');
  console.log('================================================================\n');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/connections', connectionRoutes);
  app.use('/api/family', familyRoutes);
  app.use('/api/circle', circleRoutes);
  app.use('/api/admin', adminRoutes);

  // Test endpoint guarded by verified senior middleware
  app.get('/api/test/verified-senior-only', protect, requireVerifiedSenior, (req: any, res: any) => {
    res.json({ success: true, message: 'Welcome verified senior!' });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Security test server running at ${BASE_URL}\n`);

  const createdUserIds: string[] = [];
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests.toString().padStart(2, ' ')}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests.toString().padStart(2, ' ')}: ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  async function createSenior(prefix: string, name: string, dobStr: string, age: number) {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
        password: 'password123',
        role: 'SENIOR',
        age,
        dob: new Date(dobStr),
        verificationStatus: 'UNVERIFIED',
        verified: false,
        status: 'ACTIVE'
      }
    });
    createdUserIds.push(user.id);
    return { user, token: createToken(user) };
  }

  try {
    const timestamp = Date.now();

    // 1. Setup Test Users
    const seniorA = await createSenior('sen_a', `Ramesh Sharma ${timestamp}`, '1961-04-12', 63);
    const seniorB = await createSenior('sen_b', `Suresh Patel ${timestamp}`, '1964-07-25', 60);

    const familyUser = await prisma.user.create({
      data: {
        name: `Anita Family ${timestamp}`,
        email: `anita_${timestamp}@test.com`,
        password: 'password123',
        role: 'FAMILY',
        age: 32,
        dob: new Date('1992-02-10'),
        verificationStatus: 'UNVERIFIED',
        verified: false,
        status: 'ACTIVE'
      }
    });
    createdUserIds.push(familyUser.id);
    const tokenFamily = createToken(familyUser);

    const adminUser = await prisma.user.create({
      data: {
        name: `Admin Mod ${timestamp}`,
        email: `admin_${timestamp}@test.com`,
        password: 'password123',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
    createdUserIds.push(adminUser.id);
    const tokenAdmin = createToken(adminUser);

    // ----------------------------------------------------
    // TEST K: Unauthenticated upload -> 401
    // ----------------------------------------------------
    {
      const blankImg = await sharp({ create: { width: 300, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(blankImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        body: form
      });
      assert(res.status === 401, 'K. Unauthenticated verification upload is rejected with 401');
    }

    // ----------------------------------------------------
    // TEST J: Non-Senior attempts verification -> 403
    // ----------------------------------------------------
    {
      const blankImg = await sharp({ create: { width: 300, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(blankImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const resFam = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFamily}` },
        body: form
      });
      const resAdm = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: form
      });
      assert(resFam.status === 403 && resAdm.status === 403, 'J. Non-Senior (Family & Admin) verification attempts rejected with 403');
    }

    // ----------------------------------------------------
    // TEST M: User attempts to modify DOB after registration -> denied
    // ----------------------------------------------------
    {
      const seniorM = await createSenior('sen_m', 'Manoj Kumar', '1960-01-01', 64);
      const blankImg = await sharp({ create: { width: 300, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
      const form = new FormData();
      form.append('declaredDob', '1955-01-01'); // Different from registered 1960-01-01
      form.append('document', new Blob([new Uint8Array(blankImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorM.token}` },
        body: form
      });
      const data: any = await res.json();
      assert(
        res.status === 400 && data.message.includes('Date of Birth cannot be modified'),
        'M. Attempt to modify registered DOB after registration is strictly denied (400)'
      );
    }

    // ----------------------------------------------------
    // TEST L: Client attempts payload injection of verified=true
    // ----------------------------------------------------
    {
      const seniorL = await createSenior('sen_l', 'Lalita Devi', '1958-03-20', 66);
      const blankImg = await sharp({ create: { width: 300, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
      const form = new FormData();
      form.append('verified', 'true');
      form.append('verificationStatus', 'VERIFIED');
      form.append('document', new Blob([new Uint8Array(blankImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorL.token}` },
        body: form
      });
      const data: any = await res.json();
      const userInDb = await prisma.user.findUnique({ where: { id: seniorL.user.id } });
      assert(
        data.status === 'NEEDS_REVIEW' && userInDb?.verified === false,
        'L. Client cannot bypass verification by injecting verified=true / status=VERIFIED'
      );
    }

    // ----------------------------------------------------
    // TEST G: Missing/unreadable DOB (blank image) -> NEEDS_REVIEW
    // ----------------------------------------------------
    {
      const seniorG = await createSenior('sen_g', 'Gopal Das', '1957-08-14', 67);
      const blankImg = await sharp({ create: { width: 300, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(blankImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorG.token}` },
        body: form
      });
      const data: any = await res.json();
      assert(
        res.status === 200 && data.status === 'NEEDS_REVIEW' && !data.matchSummary.dobMatched,
        'G. Missing/unreadable DOB (blank image) sets NEEDS_REVIEW and is NOT verified'
      );
    }

    // ----------------------------------------------------
    // TEST C: Document DOB differs from registered DOB -> NOT VERIFIED
    // ----------------------------------------------------
    {
      const seniorC = await createSenior('sen_c', 'Chandra Prakash', '1962-09-10', 62);
      // Image has DOB 15/08/1950 but seniorC has registered DOB 1962-09-10
      const mismatchDobImg = await createIdCardImage(seniorC.user.name, '15/08/1950');
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(mismatchDobImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorC.token}` },
        body: form
      });
      const data: any = await res.json();
      const userInDb = await prisma.user.findUnique({ where: { id: seniorC.user.id } });
      assert(
        res.status === 200 && data.status === 'NEEDS_REVIEW' && userInDb?.verified === false,
        'C. Document DOB differing from registered DOB results in NEEDS_REVIEW (NOT VERIFIED)'
      );
    }

    // ----------------------------------------------------
    // TEST D: Document DOB indicates age < 50 -> NOT VERIFIED
    // ----------------------------------------------------
    {
      const seniorD = await createSenior('sen_d', 'Deepak Joshi', '1965-02-18', 59);
      // Image has DOB 12/04/2005 (underage age ~19)
      const underageDocImg = await createIdCardImage(seniorD.user.name, '12/04/2005');
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(underageDocImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorD.token}` },
        body: form
      });
      const data: any = await res.json();
      const userInDb = await prisma.user.findUnique({ where: { id: seniorD.user.id } });
      assert(
        res.status === 200 && data.status === 'NEEDS_REVIEW' && userInDb?.verified === false,
        'D. Document DOB indicating age < 50 results in NEEDS_REVIEW (NOT VERIFIED)'
      );
    }

    // ----------------------------------------------------
    // TEST E: Invalid / future DOB -> NOT VERIFIED
    // ----------------------------------------------------
    {
      const seniorE = await createSenior('sen_e', 'Eshwar Singh', '1963-06-22', 61);
      // Image has future DOB 12/04/2035
      const futureDocImg = await createIdCardImage(seniorE.user.name, '12/04/2035');
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(futureDocImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorE.token}` },
        body: form
      });
      const data: any = await res.json();
      const userInDb = await prisma.user.findUnique({ where: { id: seniorE.user.id } });
      assert(
        res.status === 200 && data.status === 'NEEDS_REVIEW' && userInDb?.verified === false,
        'E. Document with future/invalid DOB results in NEEDS_REVIEW (NOT VERIFIED)'
      );
    }

    // ----------------------------------------------------
    // TEST H: Missing / unreadable Name -> NOT VERIFIED
    // ----------------------------------------------------
    {
      const seniorH = await createSenior('sen_h', 'Harish Chandra', '1961-04-12', 63);
      // Image with NO name field at all
      const svgNoName = `
        <svg width="600" height="350">
          <rect width="100%" height="100%" fill="#ffffff"/>
          <text x="50" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="#000000">GOVERNMENT OF INDIA</text>
          <text x="50" y="210" font-family="Arial" font-size="24" fill="#000000">DOB: 12/04/1961</text>
          <text x="50" y="280" font-family="Arial" font-size="20" fill="#000000">Senior Citizen Identity Card</text>
        </svg>
      `;
      const noNameImg = await sharp(Buffer.from(svgNoName)).jpeg().toBuffer();
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(noNameImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorH.token}` },
        body: form
      });
      const data: any = await res.json();
      const userInDb = await prisma.user.findUnique({ where: { id: seniorH.user.id } });
      assert(
        res.status === 200 && data.status === 'NEEDS_REVIEW' && userInDb?.verified === false && !data.matchSummary?.nameMatched,
        'H. Missing/unreadable Name results in NEEDS_REVIEW (NOT VERIFIED)'
      );
    }

    // ----------------------------------------------------
    // TEST F: Name mismatch -> NOT VERIFIED
    // ----------------------------------------------------
    {
      const seniorF = await createSenior('sen_f', 'Farooq Sheikh', '1961-04-12', 63);
      // Image has matching DOB 12/04/1961 but completely wrong name "Donald Duck"
      const nameMismatchImg = await createIdCardImage('Donald Duck', '12/04/1961');
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(nameMismatchImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorF.token}` },
        body: form
      });
      const data: any = await res.json();
      const userInDb = await prisma.user.findUnique({ where: { id: seniorF.user.id } });
      assert(
        res.status === 200 && data.status === 'NEEDS_REVIEW' && userInDb?.verified === false && data.matchSummary.nameMatchScore < 70,
        'F. Document Name mismatch results in NEEDS_REVIEW (NOT VERIFIED)'
      );
    }

    // ----------------------------------------------------
    // TEST A: Valid Senior + matching DOB + matching name -> automatically VERIFIED
    // ----------------------------------------------------
    {
      // Matching DOB (12/04/1961) and matching Name (Ramesh Sharma)
      const validDocImg = await createIdCardImage(seniorA.user.name, '12/04/1961');
      const form = new FormData();
      form.append('document', new Blob([new Uint8Array(validDocImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorA.token}` },
        body: form
      });
      const data: any = await res.json();
      assert(
        res.status === 200 && data.status === 'VERIFIED' && data.verified === true,
        'A. Valid Senior with matching DOB and matching Name is AUTOMATICALLY VERIFIED',
        JSON.stringify(data)
      );
    }

    // ----------------------------------------------------
    // TEST B: Verification succeeded with ZERO Admin approval required
    // ----------------------------------------------------
    {
      const verifiedUserInDb = await prisma.user.findUnique({ where: { id: seniorA.user.id } });
      const reqInDb = await prisma.seniorVerificationRequest.findUnique({ where: { userId: seniorA.user.id } });
      assert(
        verifiedUserInDb?.verified === true &&
        verifiedUserInDb?.verificationStatus === 'VERIFIED' &&
        verifiedUserInDb?.verificationMethod === 'AUTOMATIC_OCR' &&
        verifiedUserInDb?.verificationReviewedById === null &&
        reqInDb?.status === 'VERIFIED' &&
        reqInDb?.reviewedById === null,
        'B. Senior verified in database with verificationMethod=AUTOMATIC_OCR and zero Admin approval'
      );
    }

    // ----------------------------------------------------
    // TEST O: requireVerifiedSenior middleware allows auto-verified Senior
    // ----------------------------------------------------
    {
      const verifiedAccessRes = await fetch(`${BASE_URL}/api/test/verified-senior-only`, {
        headers: { Authorization: `Bearer ${seniorA.token}` }
      });
      const unverifiedAccessRes = await fetch(`${BASE_URL}/api/test/verified-senior-only`, {
        headers: { Authorization: `Bearer ${seniorB.token}` } // Senior B is unverified
      });
      assert(
        verifiedAccessRes.status === 200 && unverifiedAccessRes.status === 403,
        'O. requireVerifiedSenior middleware grants access to auto-verified Senior and blocks unverified Senior'
      );
    }

    // ----------------------------------------------------
    // TEST I: IDOR Protection — User token strictly binds verification to that user
    // ----------------------------------------------------
    {
      // Senior B attempts to pass Senior A's userId in body
      const validDocImg = await createIdCardImage(seniorB.user.name, '25/07/1964');
      const form = new FormData();
      form.append('userId', seniorA.user.id); // Attempted IDOR target
      form.append('document', new Blob([new Uint8Array(validDocImg)], { type: 'image/jpeg' }), 'doc.jpg');
      const res = await fetch(`${BASE_URL}/api/verification/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${seniorB.token}` },
        body: form
      });
      const data: any = await res.json();
      const updatedSeniorB = await prisma.user.findUnique({ where: { id: seniorB.user.id } });
      const reqB = await prisma.seniorVerificationRequest.findUnique({ where: { userId: seniorB.user.id } });
      assert(
        res.status === 200 && updatedSeniorB?.verified === true && reqB?.userId === seniorB.user.id,
        'I. IDOR protection: Verification is strictly bound to authenticated token user (cannot target another user)'
      );
    }

    // ----------------------------------------------------
    // TEST N: Simultaneous verification submissions handled cleanly
    // ----------------------------------------------------
    {
      const seniorN = await createSenior('sen_n', `Kailash Verma ${timestamp}`, '1959-11-05', 65);
      const validDocImg = await createIdCardImage(seniorN.user.name, '05/11/1959');

      const makeSub = async () => {
        const form = new FormData();
        form.append('document', new Blob([new Uint8Array(validDocImg)], { type: 'image/jpeg' }), 'doc.jpg');
        return fetch(`${BASE_URL}/api/verification/submit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${seniorN.token}` },
          body: form
        });
      };

      const [res1, res2] = await Promise.all([makeSub(), makeSub()]);
      const userNInDb = await prisma.user.findUnique({ where: { id: seniorN.user.id } });
      const reqNInDb = await prisma.seniorVerificationRequest.findMany({ where: { userId: seniorN.user.id } });

      assert(
        userNInDb?.verified === true &&
        userNInDb?.verificationStatus === 'VERIFIED' &&
        reqNInDb.length === 1 &&
        reqNInDb[0].status === 'VERIFIED',
        'N. Simultaneous verification submissions resolve to consistent, atomic VERIFIED state with single request record'
      );
    }

    // ----------------------------------------------------
    // TEST P: Existing Family <-> Senior functionality still works
    // ----------------------------------------------------
    {
      const inviteRes = await fetch(`${BASE_URL}/api/family/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenFamily}` },
        body: JSON.stringify({ identifier: seniorA.user.email })
      });
      const inviteData: any = await inviteRes.json();
      assert(
        (inviteRes.status === 200 || inviteRes.status === 201) && inviteData.success === true,
        'P. Existing Family <-> Senior invitation functionality works with verified Senior'
      );
    }

    // ----------------------------------------------------
    // TEST Q: Existing Saathi Circle functionality still works
    // ----------------------------------------------------
    {
      // First ensure seniorA and seniorB have an accepted connection
      await prisma.connection.create({
        data: {
          userId: seniorA.user.id,
          connectedId: seniorB.user.id,
          status: 'ACCEPTED'
        }
      });

      const addCircleRes = await fetch(`${BASE_URL}/api/circle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${seniorA.token}` },
        body: JSON.stringify({
          memberId: seniorB.user.id,
          relationshipType: 'FRIEND',
          allowChat: true,
          allowEvents: true,
          allowLocation: false
        })
      });
      const addCircleData: any = await addCircleRes.json();
      assert(
        addCircleRes.status === 201 && addCircleData.success === true,
        'Q. Existing Saathi Circle functionality works seamlessly with auto-verified Senior'
      );
    }

  } catch (err: any) {
    console.error('Test Suite Exception:', err);
    assert(false, 'Test suite execution failed with unhandled exception', err.message);
  } finally {
    console.log('\n================================================================');
    console.log(`  RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

    // Clean up created users
    if (createdUserIds.length > 0) {
      await prisma.circleMember.deleteMany({ where: { OR: [{ seniorId: { in: createdUserIds } }, { memberId: { in: createdUserIds } }] } });
      await prisma.connection.deleteMany({ where: { OR: [{ userId: { in: createdUserIds } }, { connectedId: { in: createdUserIds } }] } });
      await prisma.familyRelationship.deleteMany({ where: { OR: [{ parentId: { in: createdUserIds } }, { memberId: { in: createdUserIds } }] } });
      await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.seniorVerificationRequest.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
}

runAutoVerificationSecuritySuite();
