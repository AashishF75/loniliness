import { Request, Response } from 'express';
import { prisma } from '../index';

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
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, users });
  } catch (error: any) {
    console.error('Admin Get Users Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getReports = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { id: true, name: true } },
        reportedUser: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, reports });
  } catch (error: any) {
    console.error('Admin Get Reports Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const resolveReport = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. 'RESOLVED', 'DISMISSED'
    
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
    const events = await prisma.event.findMany({
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, events });
  } catch (error: any) {
    console.error('Admin Get Events Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const removeEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
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
