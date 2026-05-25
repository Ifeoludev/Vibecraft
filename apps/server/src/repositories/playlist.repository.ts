import prisma from '../lib/prisma';
import { Platform } from '../generated/prisma/enums';
import { Song } from '@vibecraft/types';

export const playlistRepository = {
  async create(data: {
    userId: string;
    vibeDescription: string;
    songs: Song[];
  }) {
    return prisma.playlist.create({
      data: {
        userId: data.userId,
        vibeDescription: data.vibeDescription,
        songs: data.songs as object[],
      },
    });
  },

  // Always filters by userId — prevents BOLA (user A reading user B's playlist)
  async findById(id: string, userId: string) {
    return prisma.playlist.findFirst({ where: { id, userId } });
  },

  async findAllByUser(userId: string) {
    return prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        vibeDescription: true,
        songs: true,
        platform: true,
        platformUrl: true,
        createdAt: true,
      },
    });
  },

  async countTodayByUser(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    return prisma.playlist.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });
  },

  async updatePlatformData(
    id: string,
    userId: string,
    data: { platform: Platform; platformPlaylistId: string; platformUrl: string }
  ) {
    // updateMany accepts a compound where — if the playlist doesn't exist or belongs
    // to a different user, count is 0 and we return null. One round trip instead of two.
    const result = await prisma.playlist.updateMany({ where: { id, userId }, data });
    return result.count === 0 ? null : data;
  },
};
