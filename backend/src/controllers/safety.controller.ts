import { Request, Response } from 'express';
import { prisma } from '../index';

export const reportUser = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const reporterId = req.user?.id;
    if (!reporterId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { reportedUserId, reason, description } = req.body;

    if (!reportedUserId || !reason) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    if (reporterId === reportedUserId) {
      res.status(400).json({ success: false, message: 'You cannot report yourself' });
      return;
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason,
        description,
      },
    });

    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Report User Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const blockUser = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const blockerId = req.user?.id;
    if (!blockerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { userId: blockedId } = req.params;

    if (!blockedId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    if (blockerId === blockedId) {
      res.status(400).json({ success: false, message: 'You cannot block yourself' });
      return;
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existingBlock) {
      res.status(400).json({ success: false, message: 'User already blocked' });
      return;
    }

    const block = await prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });

    res.json({ success: true, block });
  } catch (error: any) {
    console.error('Block User Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const unblockUser = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const blockerId = req.user?.id;
    if (!blockerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { userId: blockedId } = req.params;

    if (!blockedId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (!existingBlock) {
      res.status(404).json({ success: false, message: 'Block not found' });
      return;
    }

    await prisma.block.delete({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    res.json({ success: true, message: 'User unblocked' });
  } catch (error: any) {
    console.error('Unblock User Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getBlockedUsers = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const blockerId = req.user?.id;
    if (!blockerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const blocks = await prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.json({ success: true, blocks });
  } catch (error: any) {
    console.error('Get Blocked Users Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
