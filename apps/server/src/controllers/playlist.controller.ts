import { Request, Response } from 'express';
import { z } from 'zod';
import { Platform } from '../generated/prisma/enums';
import { playlistService } from '../services/playlist.service';
import { exportService } from '../services/export.service';
import { ValidationError, NotFoundError } from '../errors';
import { asyncHandler } from '../lib/asyncHandler';

const generateSchema = z.object({
  vibeDescription: z.string().min(1).max(300),
});

const exportSchema = z.object({
  playlistId: z.string().cuid(),
  playlistName: z.string().min(1).max(100),
  platform: z.nativeEnum(Platform),
});

export const playlistController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid request body');
    }
    const playlist = await playlistService.generate(req.user!.id, parsed.data.vibeDescription);
    res.status(201).json({ success: true, data: playlist });
  }),

  exportPlaylist: asyncHandler(async (req: Request, res: Response) => {
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
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    const playlists = await playlistService.getAllByUser(req.user!.id);
    res.json({ success: true, data: playlists });
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const playlist = await playlistService.getById(req.params.id, req.user!.id);
    if (!playlist) throw new NotFoundError('Playlist not found');
    res.json({ success: true, data: playlist });
  }),
};
