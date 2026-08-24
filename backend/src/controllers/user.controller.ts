import { Request, Response } from 'express';
import { prisma } from '../db';
import { toGeoJsonPoint } from '../utils/geo';

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

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (userLat === null || userLon === null || isNaN(userLat) || isNaN(userLon)) {
      userLat = currentUser.latitude;
      userLon = currentUser.longitude;
    }

    const hasUserLocation = userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon);

    // Update current user's location if it was provided in query and is different
    if (latitude && longitude && hasUserLocation && (currentUser.latitude !== userLat || currentUser.longitude !== userLon)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          latitude: userLat,
          longitude: userLon,
          locationGeoJson: toGeoJsonPoint(userLat, userLon) as any
        }
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

    const currentUserHobbies = currentUser.hobbyIds ? await prisma.hobby.findMany({ where: { id: { in: currentUser.hobbyIds } } }).then(h => h.map(x => x.name)) : [];

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let nearbyUsers: any[] = [];
    let totalCount = 0;

    if (hasUserLocation) {
      // -------------------------------------------------------------
      // DATABASE-SIDE GEOSPATIAL AGGREGATION ($geoNear + $skip + $limit)
      // -------------------------------------------------------------
      const blockedOids = blockedUserIds.map((id: string) => ({ $oid: id }));
      const matchFilter: any = {
        _id: { $ne: { $oid: userId }, $nin: blockedOids },
        status: { $ne: 'SUSPENDED' }
      };

      if (search) {
        const s = (search as string).toLowerCase();
        matchFilter.$or = [
          { name: { $regex: s, $options: 'i' } },
          { city: { $regex: s, $options: 'i' } },
          { locality: { $regex: s, $options: 'i' } }
        ];
      }

      const pipeline: any[] = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [userLon as number, userLat as number] },
            distanceField: 'distanceMeters',
            spherical: true,
            query: matchFilter
          }
        },
        {
          $addFields: {
            distance: { $divide: ['$distanceMeters', 1000] }
          }
        }
      ];

      pipeline.push({
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: offset }, { $limit: limit }]
        }
      });

      const aggResult: any = await prisma.user.aggregateRaw({ pipeline });
      const facetObj = Array.isArray(aggResult) && aggResult.length > 0 ? aggResult[0] : null;
      const rawUsers = facetObj && Array.isArray(facetObj.data) ? facetObj.data : [];
      totalCount = facetObj && Array.isArray(facetObj.metadata) && facetObj.metadata.length > 0
        ? facetObj.metadata[0].total
        : 0;

      // Extract hobby names for returned slice
      const userHobbyOids = Array.from(new Set(rawUsers.flatMap((u: any) => (u.hobbyIds || []).map((h: any) => h.$oid || h.toString()))));
      const hobbiesMap = new Map<string, string>();
      if (userHobbyOids.length > 0) {
        const hobbies = await prisma.hobby.findMany({
          where: { id: { in: userHobbyOids as string[] } }
        });
        hobbies.forEach(h => hobbiesMap.set(h.id, h.name));
      }

      nearbyUsers = rawUsers.map((u: any) => {
        const rawId = u._id?.$oid || u._id?.toString() || u.id;
        const uHobbyIds = (u.hobbyIds || []).map((h: any) => h.$oid || h.toString());
        const userHobbyNames = uHobbyIds.map((hid: string) => hobbiesMap.get(hid)).filter(Boolean);

        const distance = u.distance !== undefined ? parseFloat(u.distance.toFixed(1)) : null;

        // Privacy protections
        const isLocVisible = u.showLocation !== false;
        const safeCity = isLocVisible ? (u.city || null) : null;
        const safeLocality = isLocVisible ? (u.locality || null) : null;

        let interestScore = 0;
        if (currentUserHobbies.length > 0 && userHobbyNames.length > 0) {
          const shared = userHobbyNames.filter((h: string) => currentUserHobbies.includes(h));
          const union = new Set([...currentUserHobbies, ...userHobbyNames]);
          interestScore = (shared.length / union.size) * 100;
        } else if (currentUserHobbies.length === 0 && userHobbyNames.length === 0) {
          interestScore = 50;
        }

        let locationScore = distance !== null ? Math.max(0, 100 - (distance / 50) * 100) : 50;
        let ageScore = 0;
        let ageWeight = 0;
        let interestWeight = 0.70;
        let locationWeight = 0.30;

        if (currentUser.age && u.age) {
          const diff = Math.abs(currentUser.age - u.age);
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
          id: rawId,
          name: u.name,
          age: u.age,
          city: safeCity,
          locality: safeLocality,
          avatar: u.avatar || null,
          bio: u.bio || null,
          showLocation: u.showLocation,
          interests: userHobbyNames,
          distance,
          matchScore
        };
      });

      if (interest) {
        const iStr = (interest as string).toLowerCase();
        nearbyUsers = nearbyUsers.filter(u => u.interests.some((h: string) => h.toLowerCase() === iStr));
      }
      if (commonInterestsOnly === 'true') {
        nearbyUsers = nearbyUsers.filter(u => u.interests.some((h: string) => currentUserHobbies.includes(h)));
      }
    } else {
      // -------------------------------------------------------------
      // NON-LOCATION FALLBACK QUERY (DATABASE-PAGINATED WITH PRISMA)
      // -------------------------------------------------------------
      const whereClause: any = {
        id: { not: userId, notIn: blockedUserIds },
        status: { not: 'SUSPENDED' }
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { city: { contains: search as string, mode: 'insensitive' } },
          { locality: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      totalCount = await prisma.user.count({ where: whereClause });
      const otherUsers = await prisma.user.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          age: true,
          city: true,
          locality: true,
          avatar: true,
          bio: true,
          showLocation: true,
          hobbies: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      nearbyUsers = otherUsers.map((user: any) => {
        const { showLocation, ...safeUser } = user;
        if (showLocation === false) {
          safeUser.city = null;
          safeUser.locality = null;
        }
        const userHobbyNames = user.hobbies ? user.hobbies.map((h: any) => h.name) : [];
        let interestScore = 0;
        if (currentUserHobbies.length > 0 && userHobbyNames.length > 0) {
          const shared = userHobbyNames.filter((h: string) => currentUserHobbies.includes(h));
          const union = new Set([...currentUserHobbies, ...userHobbyNames]);
          interestScore = (shared.length / union.size) * 100;
        } else if (currentUserHobbies.length === 0 && userHobbyNames.length === 0) {
          interestScore = 50;
        }
        const matchScore = Math.round(interestScore);

        return {
          ...safeUser,
          interests: userHobbyNames,
          distance: null,
          matchScore
        };
      });
    }

    res.json({
      success: true,
      users: nearbyUsers,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
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

    const { name, age, city, locality, bio, interests, eventReminder, showAge, showLocation, showInterests, latitude, longitude } = req.body;

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
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);

    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      const curUser = await prisma.user.findUnique({ where: { id: userId } });
      const finalLat = updateData.latitude !== undefined ? updateData.latitude : curUser?.latitude;
      const finalLon = updateData.longitude !== undefined ? updateData.longitude : curUser?.longitude;
      updateData.locationGeoJson = toGeoJsonPoint(finalLat, finalLon);
    }

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
