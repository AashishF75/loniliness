import { Request, Response } from 'express';
import { prisma } from '../index';

export const getNotifications = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Evaluate Event Reminders
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.eventReminder !== 'NONE') {
      const now = new Date();
      
      const upcomingEvents = await prisma.event.findMany({
        where: {
          status: 'ACTIVE',
          date: { gt: now },
          OR: [
            { participants: { some: { userId } } },
            { savedBy: { some: { userId } } }
          ]
        }
      });

      for (const event of upcomingEvents) {
        const timeDiffHours = (new Date(event.date).getTime() - now.getTime()) / (1000 * 60 * 60);
        let reminderType = null;
        let title = '';
        let message = '';

        if (user.eventReminder === '1_DAY' && timeDiffHours <= 24 && timeDiffHours > 1) {
          reminderType = '1_DAY';
          title = 'Upcoming Event Tomorrow';
          message = `${event.title} starts tomorrow.`;
        } else if (user.eventReminder === '1_HOUR' && timeDiffHours <= 1 && timeDiffHours > 0) {
          reminderType = '1_HOUR';
          title = 'Event Starts Soon';
          message = `${event.title} starts in less than an hour!`;
        }

        if (reminderType) {
          // Check if reminder already exists
          const existing = await prisma.notification.findFirst({
            where: {
              userId,
              relatedEventId: event.id,
              type: 'EVENT_REMINDER',
              title
            }
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId,
                type: 'EVENT_REMINDER',
                title,
                message,
                relatedEventId: event.id
              }
            });
          }
        }
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Manually attach connection status
    const formattedNotifications = await Promise.all(notifications.map(async (notif: any) => {
      if (notif.type === 'NEW_CONNECTION_REQUEST' && notif.relatedConnectionId) {
        const conn = await prisma.connection.findUnique({ where: { id: notif.relatedConnectionId } });
        return { ...notif, connectionStatus: conn ? conn.status : null };
      }
      return notif;
    }));

    res.json({ success: true, notifications: formattedNotifications });
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
