import { prisma } from '../db';

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export function toGeoJsonPoint(
  lat: number | null | undefined,
  lon: number | null | undefined
): GeoJsonPoint | null {
  if (
    lat === null ||
    lat === undefined ||
    lon === null ||
    lon === undefined ||
    isNaN(lat) ||
    isNaN(lon)
  ) {
    return null;
  }
  return {
    type: 'Point',
    coordinates: [lon, lat]
  };
}

export async function ensureGeoIndexes(): Promise<void> {
  try {
    // Backfill any existing User records missing locationGeoJson
    const users = await prisma.user.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true, locationGeoJson: true }
    });
    const unindexedUsers = users.filter((u: any) => !u.locationGeoJson);
    for (const u of unindexedUsers) {
      if (u.latitude !== null && u.longitude !== null) {
        await prisma.user.update({
          where: { id: u.id },
          data: { locationGeoJson: toGeoJsonPoint(u.latitude, u.longitude) as any }
        });
      }
    }

    // Backfill any existing Event records missing locationGeoJson
    const events = await prisma.event.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true, locationGeoJson: true }
    });
    const unindexedEvents = events.filter((e: any) => !e.locationGeoJson);
    for (const e of unindexedEvents) {
      if (e.latitude !== null && e.longitude !== null) {
        await prisma.event.update({
          where: { id: e.id },
          data: { locationGeoJson: toGeoJsonPoint(e.latitude, e.longitude) as any }
        });
      }
    }

    // Create 2dsphere indexes safely
    try {
      await prisma.$runCommandRaw({
        createIndexes: 'User',
        indexes: [
          {
            key: { locationGeoJson: '2dsphere' },
            name: 'User_locationGeoJson_2dsphere',
            sparse: true
          }
        ]
      });
    } catch (idxErr: any) {
      if (!idxErr?.message?.includes('already exists')) {
        console.log('User 2dsphere index status:', idxErr.message || idxErr);
      }
    }

    try {
      await prisma.$runCommandRaw({
        createIndexes: 'Event',
        indexes: [
          {
            key: { locationGeoJson: '2dsphere' },
            name: 'Event_locationGeoJson_2dsphere',
            sparse: true
          }
        ]
      });
    } catch (idxErr: any) {
      if (!idxErr?.message?.includes('already exists')) {
        console.log('Event 2dsphere index status:', idxErr.message || idxErr);
      }
    }
  } catch (err: any) {
    console.error('Error during ensureGeoIndexes initialization:', err.message || err);
  }
}
