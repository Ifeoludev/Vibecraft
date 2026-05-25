import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Platform } from '../generated/prisma/enums';
import { playlistService } from '../services/playlist.service';
import { exportService } from '../services/export.service';
import { ValidationError, NotFoundError } from '../errors';

const generateSchema = z.object({
  vibeDescription: z.string().min(1).max(300),
});

const exportSchema = z.object({
  playlistId: z.string().cuid(),
  playlistName: z.string().min(1).max(100),
  platform: z.nativeEnum(Platform),
});

export const playlistController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = generateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid request body');
      }

      const playlist = await playlistService.generate(
        req.user!.id,
        parsed.data.vibeDescription,
      );

      res.status(201).json({ success: true, data: playlist });
    } catch (err) {
      next(err);
    }
  },

  async exportPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = exportSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid request body');
      }

      const playlist = await exportService.exportPlaylist(
        req.user!.id,
        parsed.data.playlistId,
        parsed.data.playlistName,
        parsed.data.platform
      );
      if (!playlist) throw new NotFoundError('Playlist not found');

      res.json({ success: true, data: playlist });
    } catch (err) {
      next(err);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const playlists = await playlistService.getAllByUser(req.user!.id);
      res.json({ success: true, data: playlists });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const playlist = await playlistService.getById(req.params.id, req.user!.id);
      if (!playlist) throw new NotFoundError('Playlist not found');
      res.json({ success: true, data: playlist });
    } catch (err) {
      next(err);
    }
  },
};
