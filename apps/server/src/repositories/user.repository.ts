import prisma from '../lib/prisma';

interface UpsertUserData {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

export const userRepository = {
  // handles both first-time login (create) and returning users (update profile) in one atomic operation
  async upsert(data: UpsertUserData) {
    return prisma.user.upsert({
      where: { email: data.email },
      update: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      },
      create: {
        email: data.email,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  // OAuthAccounts and Playlists are cascade-deleted by the DB (onDelete: Cascade in schema)
  async updateDefaultPlatform(id: string, platform: 'YOUTUBE' | null) {
    return prisma.user.update({ where: { id }, data: { defaultPlatform: platform } });
  },

  async deleteById(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
