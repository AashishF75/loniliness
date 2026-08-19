import { Request, Response } from 'express';
import { prisma } from '../index';

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

function getBoundingBox(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - Math.abs(lonDelta),
    maxLon: lon + Math.abs(lonDelta)
  };
}
export const getNearbyUsers = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get current user to get their location if not provided in query
    let { latitude, longitude, radius, search, interest, commonInterestsOnly } = req.query;
    let userLat = latitude ? parseFloat(latitude as string) : null;
    let userLon = longitude ? parseFloat(longitude as string) : null;
    let maxRadius = radius ? parseFloat(radius as string) : 10;
    maxRadius = Math.min(maxRadius, 10); // HARD LIMIT 10km

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!userLat || !userLon) {
      userLat = currentUser.latitude;
      userLon = currentUser.longitude;
    }

    if (!userLat || !userLon) {
      res.status(400).json({ success: false, message: 'Location not available for current user' });
      return;
    }

    // Update current user's location if it was provided in query and is different
    if (latitude && longitude && (currentUser.latitude !== userLat || currentUser.longitude !== userLon)) {
      await prisma.user.update({
        where: { id: userId },
        data: { latitude: userLat, longitude: userLon }
      });
    }

    // Get blocks involving current user
    const userBlocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      }
    });

    const blockedUserIds = userBlocks.map((b: any) =>
      b.blockerId === userId ? b.blockedId : b.blockerId
    );

    const bbox = getBoundingBox(userLat as number, userLon as number, maxRadius);

    // Get all other users who have location and are not blocked
    const otherUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: blockedUserIds
        },
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLon, lte: bbox.maxLon },
      },
      select: {
        id: true,
        name: true,
        age: true,
        city: true,
        locality: true,
        latitude: true,
        longitude: true,
        avatar: true,
        bio: true,
        hobbies: {
          select: { name: true }
        }
      }
    });

    const currentUserHobbies = currentUser.hobbyIds ? await prisma.hobby.findMany({ where: { id: { in: currentUser.hobbyIds } } }).then(h => h.map(x => x.name)) : [];

    // Calculate distance and filter
    const nearbyUsers = otherUsers.map((user: any) => {
      const distance = calculateDistance(userLat as number, userLon as number, user.latitude!, user.longitude!);
      const { latitude, longitude, ...safeUser } = user; // Strip private coordinates

      const userHobbyNames = user.hobbies ? user.hobbies.map((h:any) => h.name) : [];

      let interestScore = 0;
      if (currentUserHobbies.length > 0 && userHobbyNames.length > 0) {
        const shared = userHobbyNames.filter((h: string) => currentUserHobbies.includes(h));
        const union = new Set([...currentUserHobbies, ...userHobbyNames]);
        interestScore = (shared.length / union.size) * 100;
      } else if (currentUserHobbies.length === 0 && userHobbyNames.length === 0) {
        interestScore = 50; // Neutral if both have no interests
      }

      let locationScore = Math.max(0, 100 - (distance / 10) * 100);

      let ageScore = 0;
      let ageWeight = 0;
      let interestWeight = 0.70;
      let locationWeight = 0.30;

      if (currentUser.age && user.age) {
        const diff = Math.abs(currentUser.age - user.age);
        ageScore = Math.max(0, 100 - (diff / 20) * 100);
        ageWeight = 0.15;
        interestWeight = 0.60;
        locationWeight = 0.25;
      }

      const matchScore = Math.round(
        (interestScore * interestWeight) +
        (locationScore * locationWeight) +
        (ageScore * ageWeight)
      );

      return {
        ...safeUser,
        interests: userHobbyNames,
        distance: parseFloat(distance.toFixed(1)),
        matchScore
      };
    }).filter((user: any) => {
      if (user.distance > maxRadius) return false;

      // Filter by interest exactly
      if (interest) {
        const iStr = (interest as string).toLowerCase();
        const hasInterest = user.interests.some((h: string) => h.toLowerCase() === iStr);
        if (!hasInterest) return false;
      }

      // Filter by common interests
      if (commonInterestsOnly === 'true') {
        const hasCommon = user.interests.some((h: string) => currentUserHobbies.includes(h));
        if (!hasCommon) return false;
      }

      // Search filter
      if (search) {
        const s = (search as string).toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(s);
        const cityMatch = user.city?.toLowerCase().includes(s);
        const locMatch = user.locality?.toLowerCase().includes(s);
        const hobbyMatch = user.interests.some((h: string) => h.toLowerCase().includes(s));
        if (!nameMatch && !cityMatch && !locMatch && !hobbyMatch) return false;
      }

      return true;
    }).sort((a: any, b: any) => a.distance - b.distance);

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const paginatedUsers = nearbyUsers.slice(offset, offset + limit);

    res.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        limit,
        offset,
        total: nearbyUsers.length,
        hasMore: offset + limit < nearbyUsers.length
      }
    });
  } catch (error: any) {
    console.error('Nearby Users Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getUserProfile = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const user: any = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        age: true,
        city: true,
        locality: true,
        bio: true,
        avatar: true,
        showAge: true,
        showLocation: true,
        showInterests: true,
        hobbies: {
          select: { name: true }
        }
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.showAge === false) {
      user.age = null;
    }
    if (user.showLocation === false) {
      user.city = null;
      user.locality = null;
    }
    if (user.showInterests === false) {
      delete user.hobbies;
    }

    delete user.showAge;
    delete user.showLocation;
    delete user.showInterests;

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Get User Profile Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateUserProfile = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, age, city, locality, bio, interests, eventReminder, showAge, showLocation, showInterests } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (city !== undefined) updateData.city = city;
    if (locality !== undefined) updateData.locality = locality;
    if (bio !== undefined) updateData.bio = bio;
    if (eventReminder !== undefined) updateData.eventReminder = eventReminder;
    if (showAge !== undefined) updateData.showAge = showAge;
    if (showLocation !== undefined) updateData.showLocation = showLocation;
    if (showInterests !== undefined) updateData.showInterests = showInterests;

    if (interests && Array.isArray(interests)) {
      const hobbyIds = [];
      for (const interest of interests) {
        const trimmed = interest.trim();
        if (!trimmed) continue;
        let hobby = await prisma.hobby.findUnique({ where: { name: trimmed } });
        if (!hobby) {
          hobby = await prisma.hobby.create({ data: { name: trimmed } });
        }
        hobbyIds.push(hobby.id);
      }
      updateData.hobbyIds = { set: hobbyIds };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        age: true,
        city: true,
        locality: true,
        bio: true,
        avatar: true,
        eventReminder: true,
        showAge: true,
        showLocation: true,
        showInterests: true,
        hobbies: { select: { name: true } }
      }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Update User Profile Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
