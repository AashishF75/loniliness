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

    // Duplicate submission guards
    if (user.verificationStatus === 'VERIFIED' || user.verified) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'Your account is already verified.'
      });
      return;
    }

    if (user.verificationStatus === 'PENDING' || user.verificationStatus === 'NEEDS_REVIEW') {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'You already have a verification request under review. Please wait for administrator review.'
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

    // Resolve declared Date of Birth
    const declaredDobInput = req.body.declaredDob;
    let declaredDob: Date | null = null;

    if (declaredDobInput) {
      const dobVal = parseAndValidateDob(declaredDobInput);
      if (!dobVal.valid || !dobVal.dob) {
        cleanupFiles();
        res.status(400).json({
          success: false,
          message: dobVal.error || 'A valid Date of Birth (DOB) is required for verification.'
        });
        return;
      }
      declaredDob = dobVal.dob;
    } else if (user.dob) {
      declaredDob = new Date(user.dob);
    } else if (user.age) {
      const estYear = new Date().getFullYear() - user.age;
      declaredDob = new Date(Date.UTC(estYear, 0, 1));
    }

    if (!declaredDob || isNaN(declaredDob.getTime())) {
      cleanupFiles();
      res.status(400).json({
        success: false,
        message: 'A valid Date of Birth (DOB) is required for verification.'
      });
      return;
    }

    // Verify declared age is >= 50 using birthday-aware calculation
    const declaredAge = calculateAgeFromDob(declaredDob);
    if (declaredAge < 50) {
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

    // Delete any old rejected document files for this user to avoid disk accumulation
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
        declaredDob
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
        notes: ['OCR analysis could not extract legible text. Document queued for manual admin review.']
      };
    }

    // Persist SeniorVerificationRequest - server authoritative, client cannot tamper
    const verificationRequest = await prisma.seniorVerificationRequest.upsert({
      where: { userId },
      update: {
        status: 'NEEDS_REVIEW',
        declaredName: user.name,
        declaredDob,
        extractedName: ocrResult.extractedName,
        extractedDob: ocrResult.extractedDob,
        extractedAge: ocrResult.extractedAge,
        ocrConfidence: ocrResult.confidence,
        nameMatchScore: ocrResult.nameMatchScore,
        dobMatched: ocrResult.dobMatched,
        documentType,
        documentFilename: documentFile.filename,
        selfieFilename: selfieFile ? selfieFile.filename : null,
        reviewNotes: ocrResult.notes.join('\n'),
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
        updatedAt: new Date()
      },
      create: {
        userId,
        status: 'NEEDS_REVIEW',
        declaredName: user.name,
        declaredDob,
        extractedName: ocrResult.extractedName,
        extractedDob: ocrResult.extractedDob,
        extractedAge: ocrResult.extractedAge,
        ocrConfidence: ocrResult.confidence,
        nameMatchScore: ocrResult.nameMatchScore,
        dobMatched: ocrResult.dobMatched,
        documentType,
        documentFilename: documentFile.filename,
        selfieFilename: selfieFile ? selfieFile.filename : null,
        reviewNotes: ocrResult.notes.join('\n')
      }
    });

    // Update User record - verificationStatus strictly NEEDS_REVIEW, verified stays false
    await prisma.user.update({
      where: { id: userId },
      data: {
        dob: declaredDob,
        age: declaredAge,
        verified: false,
        verificationStatus: 'NEEDS_REVIEW',
        verificationSubmittedAt: new Date(),
        verificationMethod: 'DOCUMENT_OCR',
        verificationFailureReason: null
      }
    });

    res.json({
      success: true,
      message: 'Verification submitted successfully. Our safety team will review your request.',
      status: 'NEEDS_REVIEW',
      matchSummary: {
        dobMatched: ocrResult.dobMatched,
        nameMatchScore: ocrResult.nameMatchScore,
        extractedAge: ocrResult.extractedAge,
        confidence: ocrResult.confidence
      }
    });
  } catch (error: any) {
    cleanupFiles();
    console.error('Verification submission error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification processing' });
  }
};
