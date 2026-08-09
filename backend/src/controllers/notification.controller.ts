import { Request, Response } from 'express';
import { prisma } from '../index';

export const getNotifications = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUnreadCount = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markAsRead = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    if (notification.userId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ success: true, notification: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markAllAsRead = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
