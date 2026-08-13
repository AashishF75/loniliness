import { Request, Response } from 'express';
import { prisma } from '../index';

export const sendMessage = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const senderId = req.user?.id;
    const { receiverId, content } = req.body;

    if (!senderId || !receiverId) {
      res.status(400).json({ success: false, message: 'Missing user IDs' });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ success: false, message: 'Cannot message yourself' });
      return;
    }

    if (!content || content.trim() === '') {
      res.status(400).json({ success: false, message: 'Message cannot be empty' });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ success: false, message: 'Message too long (max 1000 chars)' });
      return;
    }

    // Check for block
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });

    if (block) {
      res.status(403).json({ success: false, message: 'Cannot message this user' });
      return;
    }

    // Verify they are accepted connections
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: senderId, connectedId: receiverId, status: 'ACCEPTED' },
          { userId: receiverId, connectedId: senderId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!connection) {
      res.status(403).json({ success: false, message: 'Not connected or connection not accepted' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: content.trim()
      }
    });

    const senderUser = await prisma.user.findUnique({ where: { id: senderId } });
    if (senderUser) {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: `${senderUser.name} sent you a new message.`,
          relatedUserId: senderId,
          relatedMessageId: message.id
        }
      });
    }

    res.json({ success: true, message });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getConversation = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const otherUserId = req.params.userId;

    if (!currentUserId || !otherUserId) {
      res.status(400).json({ success: false, message: 'Missing user IDs' });
      return;
    }

    // Check for block
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: currentUserId }
        ]
      }
    });

    if (block) {
      res.status(403).json({ success: false, message: 'Cannot view conversation with this user' });
      return;
    }

    // Verify they are accepted connections
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: currentUserId, connectedId: otherUserId, status: 'ACCEPTED' },
          { userId: otherUserId, connectedId: currentUserId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!connection) {
      res.status(403).json({ success: false, message: 'Not connected' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: { name: true }
        }
      }
    });

    res.json({ success: true, messages });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
