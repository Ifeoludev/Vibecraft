//data access layer for the oAuthAccount table
import { Platform } from '../generated/prisma/enums';
import prisma from '../lib/prisma';

interface UpsertOAuthData {
  userId: string;
  platform: Platform;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  platformUserId: string;
}

export const oauthRepository = {
  // userId_platform is the compound unique key (@@unique([userId, platform]) in schema)
  // upsert overwrites tokens when a user reconnects a platform after token expiry
  async upsert(data: UpsertOAuthData) {
    return prisma.oAuthAccount.upsert({
      where: { userId_platform: { userId: data.userId, platform: data.platform } },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        platformUserId: data.platformUserId,
      },
      create: data,
    });
  },

  async findByUserAndPlatform(userId: string, platform: Platform) {
    return prisma.oAuthAccount.findUnique({
      where: { userId_platform: { userId, platform } },
    });
  },

  async deleteByUserAndPlatform(userId: string, platform: Platform) {
    return prisma.oAuthAccount.delete({
      where: { userId_platform: { userId, platform } },
    });
  },

  async findAllByUser(userId: string) {
    return prisma.oAuthAccount.findMany({ where: { userId } });
  },
};
