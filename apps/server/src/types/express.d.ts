import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
      defaultPlatform: 'YOUTUBE' | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}
