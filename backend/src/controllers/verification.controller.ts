import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../db';
import { processDocumentOcr } from '../utils/ocr';
import { deleteVerificationFile, verifyImageMagicBytes } from '../utils/fileUpload';
import { parseAndValidateDob, calculateAgeFromDob } from '../utils/dateValidation';

/**
 * GET /api/verification/status
 * Fetches the current user's senior verification status and metadata.
 */
export const getVerificationStatus = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        dob: true,
        age: true,
        verified: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationFailureReason: true,
        verificationSubmittedAt: true,
        verificationRequest: {
          select: {
            id: true,
            status: true,
            declaredDob: true,
            extractedAge: true,
            dobMatched: true,
            nameMatchScore: true,
            rejectionReason: true,
            createdAt: true,
            reviewedAt: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      role: user.role,
      verified: user.verified,
      verificationStatus: user.verificationStatus,
      dob: user.dob,
      age: user.age,
      verifiedAt: user.verifiedAt,
      verificationFailureReason: user.verificationFailureReason,
      verificationSubmittedAt: user.verificationSubmittedAt,
      request: user.verificationRequest
    });
  } catch (error: any) {
    console.error('Get verification status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/verification/submit
 * Submits an identity document (and optional selfie) for OCR analysis and Admin Review.
 */
export const submitVerification = async (req: Request | any, res: Response): Promise<void> => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const documentFile = files?.['document']?.[0];
  const selfieFile = files?.['selfie']?.[0];

  const cleanupFiles = () => {
    if (documentFile?.filename) deleteVerificationFile(documentFile.filename);
    if (selfieFile?.filename) deleteVerificationFile(selfieFile.filename);
  };

  try {
    const userId = req.user?.id;
    if (!userId) {
      cleanupFiles();
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user?.role !== 'SENIOR') {
      cleanupFiles();
      res.status(403).json({
        success: false,
        message: 'Only senior citizen accounts can submit senior verification requests.'
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      cleanupFiles();
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.role !== 'SENIOR') {
      cleanupFiles();
      res.status(403).json({
        success: false,
        message: 'Only senior citizen accounts can submit senior verification requests.'
      });
      return;
    }

    // Duplicate submission guards: If already verified or currently pending, reject
    if (user.verificationStatus === 'VERIFIED' || user.verified) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'Your account is already verified.'
      });
      return;
    }

    if (user.verificationStatus === 'PENDING') {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'You already have a verification request under review.'
      });
      return;
    }

    if (!documentFile) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'Identity document image is required.'
      });
      return;
    }

    // Magic Bytes signature verification on uploaded image files
    if (!verifyImageMagicBytes(documentFile.path)) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'Invalid or corrupted document image. Only genuine JPEG, PNG, or WebP images are allowed.'
      });
      return;
    }

    if (selfieFile && !verifyImageMagicBytes(selfieFile.path)) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'Invalid or corrupted selfie image. Only genuine JPEG, PNG, or WebP images are allowed.'
      });
      return;
    }

    // Authoritative registered DOB: User's registered DOB is strictly immutable.
    // Rule M: User cannot modify registered DOB after registration.
    const registeredDob = user.dob ? new Date(user.dob) : null;
    const declaredDobInput = req.body.declaredDob;

    if (declaredDobInput) {
      const parsedInput = parseAndValidateDob(declaredDobInput);
      if (!parsedInput.valid || !parsedInput.dob) {
        cleanupFiles();
        res.status(400).json({
          success: false,
          message: parsedInput.error || 'A valid Date of Birth (DOB) is required for verification.'
        });
        return;
      }

      if (registeredDob) {
        // Enforce immutability of registered DOB
        const regYear = registeredDob.getUTCFullYear();
        const regMonth = registeredDob.getUTCMonth();
        const regDay = registeredDob.getUTCDate();
        const inYear = parsedInput.dob.getUTCFullYear();
        const inMonth = parsedInput.dob.getUTCMonth();
        const inDay = parsedInput.dob.getUTCDate();

        if (regYear !== inYear || regMonth !== inMonth || regDay !== inDay) {
          cleanupFiles();
          res.status(400).json({
            success: false,
            message: 'Date of Birth cannot be modified after registration. Document must match your registered Date of Birth.'
          });
          return;
        }
      }
    }

    const authoritativeDob = registeredDob || (declaredDobInput ? parseAndValidateDob(declaredDobInput).dob : null) || (user.age ? new Date(Date.UTC(new Date().getFullYear() - user.age, 0, 1)) : null);

    if (!authoritativeDob || isNaN(authoritativeDob.getTime())) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'A valid registered Date of Birth (DOB) is required for verification.'
      });
      return;
    }

    // Verify age is >= 50 using server-side birthday-aware calculation
    const serverCalculatedAge = calculateAgeFromDob(authoritativeDob);
    if (serverCalculatedAge < 50) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'Saathi Senior Verification requires the user to be aged 50 or above.'
      });
      return;
    }

    // Document type whitelist
    const ALLOWED_DOC_TYPES = ['AADHAAR', 'PASSPORT', 'PAN', 'VOTER_ID', 'DRIVING_LICENSE', 'SENIOR_CITIZEN_CARD', 'OTHER'];
    const rawDocType = typeof req.body.documentType === 'string' ? req.body.documentType.trim().toUpperCase() : 'AADHAAR';
    const documentType = ALLOWED_DOC_TYPES.includes(rawDocType) ? rawDocType : 'AADHAAR';

    // Delete any old rejected/unverified document files for this user to avoid disk accumulation
    const existingReq = await prisma.seniorVerificationRequest.findUnique({
      where: { userId }
    });
    if (existingReq) {
      deleteVerificationFile(existingReq.documentFilename);
      deleteVerificationFile(existingReq.selfieFilename);
    }

    // Run local open-source OCR + DOB / Name matching (no external APIs)
    let ocrResult;
    try {
      ocrResult = await processDocumentOcr(
        documentFile.path,
        user.name,
        authoritativeDob
      );
    } catch (ocrErr: any) {
      console.error('OCR analysis failed safely:', ocrErr);
      ocrResult = {
        confidence: 0,
        extractedName: null,
        extractedDob: null,
        extractedAge: null,
        nameMatchScore: 0,
        dobMatched: false,
        notes: ['OCR analysis could not extract legible text.']
      };
    }

    // Validate extracted DOB
    const extDob = ocrResult.extractedDob;
    const isExtDobValid =
      extDob !== null &&
      !isNaN(extDob.getTime()) &&
      extDob.getUTCFullYear() >= 1900 &&
      extDob.getUTCFullYear() <= new Date().getFullYear();

    // Verify extracted age from document is >= 50
    const isExtAgeValid = ocrResult.extractedAge !== null && ocrResult.extractedAge >= 50;

    // Strict automatic verification criteria:
    // 1. User is SENIOR role
    // 2. User is not already verified
    // 3. Server-calculated age >= 50
    // 4. OCR extracted a valid DOB
    // 5. Extracted DOB matches immutable registered DOB (exact or birth year match)
    // 6. Extracted document age >= 50
    // 7. OCR extracted a non-empty name candidate
    // 8. Name match score >= 70
    // 9. OCR confidence >= 40
    const isAutoVerified = Boolean(
      user.role === 'SENIOR' &&
      !user.verified &&
      serverCalculatedAge >= 50 &&
      isExtDobValid &&
      ocrResult.dobMatched === true &&
      isExtAgeValid &&
      ocrResult.extractedName &&
      ocrResult.extractedName.trim().length > 0 &&
      ocrResult.nameMatchScore >= 70 &&
      ocrResult.confidence >= 40
    );

    const now = new Date();
    const finalStatus = isAutoVerified ? 'VERIFIED' : 'NEEDS_REVIEW';
    const finalReviewNotes = isAutoVerified
      ? `${ocrResult.notes.join('\n')}\nAutomatic Verification: Identity, DOB, age, and name matching criteria satisfied.`
      : `${ocrResult.notes.join('\n')}\nAutomatic Verification: Identity attributes could not be automatically confirmed.`;

    // Concurrency-safe atomic update with retry on write conflicts
    let attempts = 0;
    while (attempts < 3) {
      try {
        await prisma.$transaction(async (tx) => {
          // Re-fetch current user inside transaction to guard against simultaneous submissions
          const currentUser = await tx.user.findUnique({ where: { id: userId } });
          if (!currentUser || currentUser.verified || currentUser.verificationStatus === 'VERIFIED') {
            return; // Already verified by concurrent process
          }

          await tx.seniorVerificationRequest.upsert({
            where: { userId },
            update: {
              status: finalStatus,
              declaredName: user.name,
              declaredDob: authoritativeDob,
              extractedName: ocrResult.extractedName,
              extractedDob: ocrResult.extractedDob,
              extractedAge: ocrResult.extractedAge,
              ocrConfidence: ocrResult.confidence,
              nameMatchScore: ocrResult.nameMatchScore,
              dobMatched: ocrResult.dobMatched,
              documentType,
              documentFilename: isAutoVerified ? null : documentFile.filename,
              selfieFilename: isAutoVerified ? null : (selfieFile ? selfieFile.filename : null),
              reviewNotes: finalReviewNotes,
              rejectionReason: null,
              reviewedById: null,
              reviewedAt: isAutoVerified ? now : null,
              updatedAt: now
            },
            create: {
              userId,
              status: finalStatus,
              declaredName: user.name,
              declaredDob: authoritativeDob,
              extractedName: ocrResult.extractedName,
              extractedDob: ocrResult.extractedDob,
              extractedAge: ocrResult.extractedAge,
              ocrConfidence: ocrResult.confidence,
              nameMatchScore: ocrResult.nameMatchScore,
              dobMatched: ocrResult.dobMatched,
              documentType,
              documentFilename: isAutoVerified ? null : documentFile.filename,
              selfieFilename: isAutoVerified ? null : (selfieFile ? selfieFile.filename : null),
              reviewNotes: finalReviewNotes,
              reviewedById: null,
              reviewedAt: isAutoVerified ? now : null
            }
          });

          await tx.user.update({
            where: { id: userId },
            data: {
              age: serverCalculatedAge,
              verified: isAutoVerified,
              verificationStatus: finalStatus,
              verifiedAt: isAutoVerified ? now : null,
              verificationSubmittedAt: now,
              verificationMethod: isAutoVerified ? 'AUTOMATIC_OCR' : 'DOCUMENT_OCR',
              verificationReviewedById: null,
              verificationFailureReason: null
            }
          });

          if (isAutoVerified) {
            await tx.notification.create({
              data: {
                userId,
                type: 'VERIFICATION_APPROVED',
                title: 'Senior Verification Approved',
                message: 'Congratulations! Your Senior Citizen status has been automatically verified. Your verified badge is now active on your profile and connections.'
              }
            });
          }
        });
        break;
      } catch (txErr: any) {
        if (txErr?.code === 'P2034' && attempts < 2) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
          continue;
        }
        throw txErr;
      }
    }

    if (isAutoVerified) {
      // Ephemeral purge of uploaded ID files to uphold privacy
      cleanupFiles();

      res.json({
        success: true,
        message: 'Verification successful! Your account has been automatically verified.',
        status: 'VERIFIED',
        verified: true,
        matchSummary: {
          dobMatched: ocrResult.dobMatched,
          nameMatchScore: ocrResult.nameMatchScore,
          extractedAge: ocrResult.extractedAge,
          confidence: ocrResult.confidence
        }
      });
    } else {
      res.json({
        success: true,
        message: 'We could not automatically verify your document. Please submit a valid document matching your registered details.',
        status: 'NEEDS_REVIEW',
        verified: false,
        matchSummary: {
          dobMatched: ocrResult.dobMatched,
          nameMatchScore: ocrResult.nameMatchScore,
          extractedAge: ocrResult.extractedAge,
          confidence: ocrResult.confidence
        }
      });
    }
  } catch (error: any) {
    cleanupFiles();
    console.error('Verification submission error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification processing' });
  }
};
