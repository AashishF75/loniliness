import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { VERIFICATION_UPLOAD_DIR, deleteVerificationFile } from '../utils/fileUpload';
import { isValidObjectId } from '../utils/validation';

export const getDashboardStats = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)) // last 7 days
        }
      }
    });

    const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });
    const resolvedReports = await prisma.report.count({ where: { status: { not: 'PENDING' } } });

    const pendingVerifications = await prisma.seniorVerificationRequest.count({
      where: { status: { in: ['PENDING', 'NEEDS_REVIEW'] } }
    });

    const totalConnections = await prisma.connection.count({ where: { status: 'ACCEPTED' } });
    const totalEvents = await prisma.event.count();
    const eventParticipants = await prisma.eventParticipant.count();

    res.json({
      success: true,
      stats: {
        totalUsers,
        newUsers,
        pendingReports,
        resolvedReports,
        pendingVerifications,
        totalConnections,
        totalEvents,
        eventParticipants
      }
    });
  } catch (error: any) {
    console.error('Admin Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getUsers = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        city: true,
        createdAt: true,
        _count: {
          select: {
            reportsReceived: true,
            connections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    const total = await prisma.user.count();
    res.json({
      success: true,
      users,
      pagination: { limit, offset, total, hasMore: offset + limit < total }
    });
  } catch (error: any) {
    console.error('Admin Get Users Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getReports = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { id: true, name: true } },
        reportedUser: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    const total = await prisma.report.count();
    res.json({
      success: true,
      reports,
      pagination: { limit, offset, total, hasMore: offset + limit < total }
    });
  } catch (error: any) {
    console.error('Admin Get Reports Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const resolveReport = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. 'RESOLVED', 'DISMISSED'

    if (!id || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid report ID format.' });
      return;
    }

    if (!status || (status !== 'RESOLVED' && status !== 'DISMISSED')) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const report = await prisma.report.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Admin Resolve Report Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const suspendUser = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }

    if (id === req.user.id) {
      res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' }
    });

    res.json({ success: true, message: 'User suspended successfully.' });
  } catch (error: any) {
    console.error('Admin Suspend User Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const activateUser = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    res.json({ success: true, message: 'User activated successfully.' });
  } catch (error: any) {
    console.error('Admin Activate User Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getEvents = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const events = await prisma.event.findMany({
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    const total = await prisma.event.count();
    res.json({
      success: true,
      events,
      pagination: { limit, offset, total, hasMore: offset + limit < total }
    });
  } catch (error: any) {
    console.error('Admin Get Events Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const removeEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid event ID format.' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    if (event.status === 'REMOVED') {
      res.status(400).json({ success: false, message: 'Event is already removed.' });
      return;
    }

    await prisma.event.update({
      where: { id },
      data: {
        status: 'REMOVED',
        removedAt: new Date(),
        removedById: req.user.id
      }
    });

    res.json({ success: true, message: 'Event removed successfully.' });
  } catch (error: any) {
    console.error('Admin Remove Event Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * GET /api/admin/verification/requests
 * Lists senior citizen verification requests with status filtering and pagination.
 */
export const getVerificationRequests = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string; // 'ALL', 'PENDING', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED'

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const requests = await prisma.seniorVerificationRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            age: true,
            dob: true,
            city: true,
            createdAt: true,
            verificationStatus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.seniorVerificationRequest.count({ where: whereClause });

    res.json({
      success: true,
      requests,
      pagination: { limit, offset, total, hasMore: offset + limit < total }
    });
  } catch (error: any) {
    console.error('Admin Get Verification Requests Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const sanitizeTextInput = (input: any, maxLength = 300): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[\r\n\t]+/g, ' ') // normalize whitespace
    .trim()
    .slice(0, maxLength);
};

/**
 * GET /api/admin/verification/requests/:id
 * Fetches details of a specific senior verification request.
 */
export const getVerificationRequestById = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid verification request ID format.' });
      return;
    }

    const request = await prisma.seniorVerificationRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            age: true,
            dob: true,
            city: true,
            createdAt: true,
            verificationStatus: true
          }
        }
      }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Verification request not found.' });
      return;
    }

    res.json({ success: true, request });
  } catch (error: any) {
    console.error('Admin Get Verification Request By Id Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * GET /api/admin/verification/document/:id/:type
 * Securely streams the verification document or selfie to authorized admins only.
 */
export const streamVerificationDocument = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id, type } = req.params; // type: 'document' | 'selfie'

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid verification request ID format.' });
      return;
    }

    if (type !== 'document' && type !== 'selfie') {
      res.status(400).json({ success: false, message: 'Invalid document type parameter. Allowed types are document or selfie.' });
      return;
    }

    const request = await prisma.seniorVerificationRequest.findUnique({
      where: { id }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Verification request not found.' });
      return;
    }

    const filename = type === 'selfie' ? request.selfieFilename : request.documentFilename;
    if (!filename) {
      res.status(404).json({ success: false, message: `No ${type} image on file for this request.` });
      return;
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(VERIFICATION_UPLOAD_DIR, safeFilename);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(VERIFICATION_UPLOAD_DIR);

    if (!resolvedPath.startsWith(resolvedDir)) {
      res.status(403).json({ success: false, message: 'Access denied: Path traversal detected.' });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ success: false, message: 'File no longer exists on disk (may have been purged per retention policy).' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store, private');
    res.sendFile(resolvedPath);
  } catch (error: any) {
    console.error('Stream verification document error:', error);
    res.status(500).json({ success: false, message: 'Server error streaming document' });
  }
};

/**
 * PUT /api/admin/verification/requests/:id/review
 * Reviews (APPROVE, REJECT, or REQUEST_REVIEW) a senior citizen verification request.
 */
export const reviewVerificationRequest = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, reviewNotes } = req.body;
    const adminId = req.user?.id;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid verification request ID format.' });
      return;
    }

    if (!['APPROVE', 'REJECT', 'REQUEST_REVIEW'].includes(action)) {
      res.status(400).json({ success: false, message: 'Invalid review action. Must be APPROVE, REJECT, or REQUEST_REVIEW.' });
      return;
    }

    const verificationReq = await prisma.seniorVerificationRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!verificationReq) {
      res.status(404).json({ success: false, message: 'Verification request not found.' });
      return;
    }

    // Protection rule: Admin cannot approve or reject their own verification request
    if (verificationReq.userId === adminId) {
      res.status(403).json({ success: false, message: 'Admins cannot review their own verification request.' });
      return;
    }

    // State machine protection: cannot re-review already finalized requests
    if (verificationReq.status === 'VERIFIED') {
      res.status(400).json({
        success: false,
        message: 'Invalid state transition: Cannot review or modify a request that is already VERIFIED.'
      });
      return;
    }

    if (verificationReq.status === 'REJECTED') {
      res.status(400).json({
        success: false,
        message: 'Invalid state transition: Cannot review an already rejected request. The user must submit a new verification request.'
      });
      return;
    }

    const sanitizedReviewNotes = sanitizeTextInput(reviewNotes, 500);

    if (action === 'APPROVE') {
      // 1. Concurrency-safe atomic update
      const updateResult = await prisma.seniorVerificationRequest.updateMany({
        where: {
          id,
          status: { in: ['PENDING', 'NEEDS_REVIEW'] }
        },
        data: {
          status: 'VERIFIED',
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: sanitizedReviewNotes || 'Approved by admin'
        }
      });

      if (updateResult.count === 0) {
        res.status(409).json({
          success: false,
          message: 'Conflict: This verification request was already reviewed or its status changed by another administrator.'
        });
        return;
      }

      // 2. Update user verification status & badge
      await prisma.user.update({
        where: { id: verificationReq.userId },
        data: {
          verified: true,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          verificationReviewedById: adminId,
          verificationFailureReason: null
        }
      });

      // 3. Send Notification to Senior
      await prisma.notification.create({
        data: {
          userId: verificationReq.userId,
          type: 'VERIFICATION_APPROVED',
          title: 'Senior Verification Approved',
          message: 'Congratulations! Your Senior Citizen status has been verified. Your verified badge is now active on your profile and connections.'
        }
      });

      // 4. Ephemeral purge of ID document to uphold privacy
      deleteVerificationFile(verificationReq.documentFilename);
      deleteVerificationFile(verificationReq.selfieFilename);

      res.json({
        success: true,
        message: 'Senior verification approved successfully. Verified badge assigned.',
        status: 'VERIFIED'
      });
    } else if (action === 'REJECT') {
      const sanitizedReason = sanitizeTextInput(rejectionReason, 300) || 'Document information could not be verified or did not match registration details.';

      // Concurrency-safe atomic update
      const updateResult = await prisma.seniorVerificationRequest.updateMany({
        where: {
          id,
          status: { in: ['PENDING', 'NEEDS_REVIEW'] }
        },
        data: {
          status: 'REJECTED',
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: sanitizedReason,
          reviewNotes: sanitizedReviewNotes || null
        }
      });

      if (updateResult.count === 0) {
        res.status(409).json({
          success: false,
          message: 'Conflict: This verification request was already reviewed or its status changed by another administrator.'
        });
        return;
      }

      await prisma.user.update({
        where: { id: verificationReq.userId },
        data: {
          verified: false,
          verificationStatus: 'REJECTED',
          verificationFailureReason: sanitizedReason
        }
      });

      await prisma.notification.create({
        data: {
          userId: verificationReq.userId,
          type: 'VERIFICATION_REJECTED',
          title: 'Senior Verification Update',
          message: `Your Senior Citizen verification request was not approved: ${sanitizedReason}. You may resubmit with updated or clearer documentation.`
        }
      });

      // Purge files
      deleteVerificationFile(verificationReq.documentFilename);
      deleteVerificationFile(verificationReq.selfieFilename);

      res.json({
        success: true,
        message: 'Senior verification rejected.',
        status: 'REJECTED'
      });
    } else if (action === 'REQUEST_REVIEW') {
      // Concurrency-safe atomic update
      const updateResult = await prisma.seniorVerificationRequest.updateMany({
        where: {
          id,
          status: { in: ['PENDING', 'NEEDS_REVIEW'] }
        },
        data: {
          status: 'NEEDS_REVIEW',
          reviewNotes: sanitizedReviewNotes || 'Admin requested clearer document upload'
        }
      });

      if (updateResult.count === 0) {
        res.status(409).json({
          success: false,
          message: 'Conflict: This verification request was already reviewed or its status changed by another administrator.'
        });
        return;
      }

      await prisma.notification.create({
        data: {
          userId: verificationReq.userId,
          type: 'VERIFICATION_NEEDS_REVIEW',
          title: 'Clearer Document Requested',
          message: 'Our safety team reviewed your verification document. Please submit a clearer, well-lit photo of your ID card.'
        }
      });

      res.json({
        success: true,
        message: 'Review request sent to senior.',
        status: 'NEEDS_REVIEW'
      });
    }
  } catch (error: any) {
    console.error('Admin Review Verification Request Error:', error);
    res.status(500).json({ success: false, message: 'Server Error during verification review' });
  }
};
