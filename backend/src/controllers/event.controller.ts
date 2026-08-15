import { Request, Response } from 'express';
import { prisma } from '../index';

// Helper to determine event status dynamically
function getEventStatus(event: any) {
  if (event.status === 'CANCELLED') return 'CANCELLED';
  
  const now = new Date();
  
  // Create Date object for event date + end time to check if completed
  const eventDate = new Date(event.date);
  eventDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventDate < today) return 'COMPLETED';
  if (eventDate.getTime() === today.getTime()) return 'ONGOING';
  
  return 'UPCOMING';
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export const createEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { title, description, category, location, latitude, longitude, date, startTime, endTime, maxParticipants } = req.body;

    // Basic validation
    if (!title || !description || !category || !location || !date || !startTime || !endTime || !maxParticipants) {
      res.status(400).json({ success: false, message: 'All required fields must be provided' });
      return;
    }

    if (maxParticipants <= 0) {
      res.status(400).json({ success: false, message: 'Maximum participants must be greater than zero' });
      return;
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid date format' });
      return;
    }

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        category,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        date: eventDate,
        startTime,
        endTime,
        maxParticipants: parseInt(maxParticipants, 10),
        createdById: userId,
      }
    });

    // Creator automatically joins the event
    await prisma.eventParticipant.create({
      data: {
        eventId: newEvent.id,
        userId: userId
      }
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (error: any) {
    console.error('Create Event Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getEvents = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    // Filters
    const { category, search, date, latitude, longitude, radius, filter, sort } = req.query;
    
    let whereClause: any = { status: { not: 'REMOVED' } };
    
    if (category && category !== 'All') {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (date === 'upcoming') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      whereClause.date = { gte: today };
    }

    if (filter === 'created' && userId) {
      whereClause.createdById = userId;
    }
    if (filter === 'joined' && userId) {
      whereClause.participants = {
        some: { userId }
      };
    }
    if (filter === 'mine' && userId) {
      whereClause.OR = [
        { createdById: userId },
        { participants: { some: { userId } } }
      ];
    }
    if (filter === 'saved' && userId) {
      whereClause.savedBy = {
        some: { userId }
      };
    }

    // Get blocks involving current user to exclude their events
    let blockedUserIds: string[] = [];
    let currentUser: any = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({ where: { id: userId }, include: { hobbies: true } });
      const userBlocks = await prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] }
      });
      blockedUserIds = userBlocks.map((b: any) => b.blockerId === userId ? b.blockedId : b.blockerId);
      
      if (blockedUserIds.length > 0) {
        whereClause.createdById = { notIn: blockedUserIds };
      }
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { id: true, name: true, avatar: true }
        },
        participants: {
          select: { userId: true }
        },
        savedBy: userId ? {
          where: { userId }
        } : false
      },
      orderBy: { date: 'asc' }
    });

    // Formatting and distance calculation
    let formattedEvents = events.map((event: any) => {
      const { latitude: eLat, longitude: eLon, ...safeEvent } = event;
      
      let distance = null;
      if (latitude && longitude && eLat && eLon) {
        distance = calculateDistance(
          parseFloat(latitude as string), 
          parseFloat(longitude as string), 
          eLat, 
          eLon
        );
      } else if (currentUser?.latitude && currentUser?.longitude && eLat && eLon) {
        distance = calculateDistance(
          currentUser.latitude, 
          currentUser.longitude, 
          eLat, 
          eLon
        );
      }

      // Recommend if matching interest
      let recommended = false;
      if (currentUser?.hobbies && currentUser.hobbies.length > 0) {
        const userHobbies = currentUser.hobbies.map((h: any) => h.name.toLowerCase());
        if (userHobbies.includes(event.category.toLowerCase())) {
          recommended = true;
        } else {
          // check if title contains hobby
          recommended = userHobbies.some((h: string) => event.title.toLowerCase().includes(h));
        }
      }

      return {
        ...safeEvent,
        distance: distance ? parseFloat(distance.toFixed(1)) : null,
        participantCount: event.participants.length,
        hasJoined: userId ? event.participants.some((p: any) => p.userId === userId) : false,
        isSaved: userId ? event.savedBy && event.savedBy.length > 0 : false,
        recommended,
        dynamicStatus: getEventStatus(event)
      };
    });

    if (filter === 'recommended') {
      formattedEvents = formattedEvents.filter((e: any) => e.recommended);
    }

    // Distance filter
    if (radius && radius !== 'All') {
      const maxRadius = parseFloat(radius as string);
      formattedEvents = formattedEvents.filter((e: any) => e.distance !== null && e.distance <= maxRadius);
    }

    // Sorting
    if (sort === 'nearest') {
      formattedEvents.sort((a: any, b: any) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (sort === 'soonest') {
      formattedEvents.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sort === 'available') {
      formattedEvents.sort((a: any, b: any) => {
        const aAvail = a.maxParticipants - a.participantCount;
        const bAvail = b.maxParticipants - b.participantCount;
        return bAvail - aAvail;
      });
    } else if (sort === 'recommended') {
      formattedEvents.sort((a: any, b: any) => {
        // High priority: recommended
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        // High priority: upcoming vs completed
        if (a.dynamicStatus === 'UPCOMING' && b.dynamicStatus !== 'UPCOMING') return -1;
        if (a.dynamicStatus !== 'UPCOMING' && b.dynamicStatus === 'UPCOMING') return 1;
        // Then by distance
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        return 0;
      });
    }

    res.json({ success: true, events: formattedEvents });
  } catch (error: any) {
    console.error('Get Events Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getEventById = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, city: true, locality: true }
            }
          }
        },
        savedBy: userId ? {
          where: { userId }
        } : false
      }
    });

    if (!event || event.status === 'REMOVED') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Check blocks
    if (userId) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: event.createdById },
            { blockerId: event.createdById, blockedId: userId }
          ]
        }
      });
      if (block) {
        res.status(403).json({ success: false, message: 'You cannot view this event' });
        return;
      }
    }

    const { latitude, longitude, ...safeEvent } = event;

    res.json({
      success: true,
      event: {
        ...safeEvent,
        participantCount: event.participants.length,
        hasJoined: userId ? event.participants.some((p: any) => p.userId === userId) : false,
        isSaved: userId ? event.savedBy && event.savedBy.length > 0 : false,
        dynamicStatus: getEventStatus(event)
      }
    });
  } catch (error: any) {
    console.error('Get Event By ID Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const joinEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!event || event.status === 'REMOVED') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Check capacity
    if (event.participants.length >= event.maxParticipants) {
      res.status(400).json({ success: false, message: 'This event is full.' });
      return;
    }

    // Check if already joined
    const existingParticipation = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId: id, userId }
      }
    });

    if (existingParticipation) {
      res.status(400).json({ success: false, message: 'You have already joined this event.' });
      return;
    }

    await prisma.eventParticipant.create({
      data: {
        eventId: id,
        userId
      }
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'EVENT_JOINED',
        title: 'Event Joined',
        message: `You joined ${event.title}.`
      }
    });

    if (event.createdById !== userId) {
      await prisma.notification.create({
        data: {
          userId: event.createdById,
          type: 'EVENT_PARTICIPANT_JOINED',
          title: 'New Participant',
          message: `${req.user?.name || 'Someone'} joined your event ${event.title}.`,
          relatedEventId: event.id,
          relatedUserId: userId
        }
      });
    }

    res.json({ success: true, message: 'Successfully joined the event' });
  } catch (error: any) {
    console.error('Join Event Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const leaveEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event || event.status === 'REMOVED') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.createdById === userId) {
      res.status(400).json({ success: false, message: 'Creator cannot leave their own event. You can delete it instead.' });
      return;
    }

    const existingParticipation = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId: id, userId }
      }
    });

    if (!existingParticipation) {
      res.status(400).json({ success: false, message: 'You are not a participant of this event.' });
      return;
    }

    await prisma.eventParticipant.delete({
      where: {
        eventId_userId: { eventId: id, userId }
      }
    });

    res.json({ success: true, message: 'Successfully left the event' });
  } catch (error: any) {
    console.error('Leave Event Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title, description, category, location, latitude, longitude, date, startTime, endTime, maxParticipants } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event || event.status === 'REMOVED') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.createdById !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to edit this event' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (location) updateData.location = location;
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (date) {
      const eventDate = new Date(date);
      if (!isNaN(eventDate.getTime())) {
        updateData.date = eventDate;
      }
    }
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (maxParticipants) updateData.maxParticipants = parseInt(maxParticipants, 10);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: { participants: true }
    });

    // Notify participants
    for (const participant of updatedEvent.participants) {
      if (participant.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: participant.userId,
            type: 'EVENT_UPDATED',
            title: 'Event Updated',
            message: `${updatedEvent.title} has been updated.`,
            relatedEventId: updatedEvent.id
          }
        });
      }
    }

    res.json({ success: true, event: updatedEvent });
  } catch (error: any) {
    console.error('Update Event Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event || event.status === 'REMOVED') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (event.createdById !== userId) {
      res.status(403).json({ success: false, message: 'You are not authorized to delete this event' });
      return;
    }

    await prisma.event.delete({ where: { id } });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete Event Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const saveEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { id } = req.params;
    
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.status === 'REMOVED') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const existing = await prisma.savedEvent.findUnique({
      where: { eventId_userId: { eventId: id, userId } }
    });
    
    if (existing) {
      res.status(400).json({ success: false, message: 'You have already saved this event.' });
      return;
    }
    
    await prisma.savedEvent.create({
      data: { eventId: id, userId }
    });
    
    res.json({ success: true, message: 'Event saved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const unsaveEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { id } = req.params;
    
    await prisma.savedEvent.delete({
      where: { eventId_userId: { eventId: id, userId } }
    }).catch(() => {});
    
    res.json({ success: true, message: 'Event unsaved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const cancelEvent = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id }, include: { participants: true } });
    
    if (!event || event.status === 'REMOVED') { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    if (event.createdById !== userId) { res.status(403).json({ success: false, message: 'Unauthorized' }); return; }
    
    await prisma.event.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    for (const p of event.participants) {
      if (p.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: p.userId,
            type: 'EVENT_CANCELLED',
            title: 'Event Cancelled',
            message: `${event.title} has been cancelled.`,
            relatedEventId: event.id
          }
        });
      }
    }
    
    res.json({ success: true, message: 'Event cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getEventMessages = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { id } = req.params;
    
    // Check if event exists and user is participant
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId }
        }
      }
    });

    if (!event || event.status === 'REMOVED') { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    
    if (event.createdById !== userId && event.participants.length === 0) {
      res.status(403).json({ success: false, message: 'You must join this event to view messages' });
      return;
    }

    const messages = await prisma.eventMessage.findMany({
      where: { eventId: id },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, messages });
  } catch (error: any) {
    console.error('Get Event Messages Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const sendEventMessage = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ success: false, message: 'Message content is required' });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ success: false, message: 'Message is too long' });
      return;
    }

    // Check if event exists, is active, and user is participant
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId }
        }
      }
    });

    if (!event || event.status === 'REMOVED') { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    
    if (event.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Cannot send messages to a cancelled event' });
      return;
    }

    if (event.createdById !== userId && event.participants.length === 0) {
      res.status(403).json({ success: false, message: 'You must join this event to send messages' });
      return;
    }

    const message = await prisma.eventMessage.create({
      data: {
        eventId: id,
        senderId: userId,
        content: content.trim()
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json({ success: true, message });
  } catch (error: any) {
    console.error('Send Event Message Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
