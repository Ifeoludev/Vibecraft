import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { UnauthorizedError, ValidationError } from '../errors';
import { Platform } from '../generated/prisma/enums';
import { DAILY_GENERATION_LIMIT } from '../services/playlist.service';
import { asyncHandler } from '../lib/asyncHandler';

const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

export const authController = {
  googleCallback: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const token = authService.issueJwt(req.user.id);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.redirect(`${process.env.CLIENT_URL?.trim()}/home`);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: { ...req.user, dailyLimit: DAILY_GENERATION_LIMIT } });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ success: true });
  }),

  connectYoutube: asyncHandler(async (req: Request, res: Response) => {
    const url = authService.buildYoutubeAuthUrl(req.user!.id);
    res.redirect(url);
  }),

  youtubeCallback: asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error) throw new UnauthorizedError('YouTube authorization denied');
    if (!code) throw new UnauthorizedError('Missing authorization code — start the connection flow again');
    await authService.handleYoutubeCallback(code, state);
    res.redirect(`${process.env.CLIENT_URL}/profile?connected=youtube`);
  }),

  disconnectPlatform: asyncHandler(async (req: Request, res: Response) => {
    const platform = req.params.platform?.toUpperCase() as Platform;
    if (platform !== Platform.YOUTUBE) {
      throw new ValidationError('Invalid platform');
    }
    await authService.disconnectPlatform(req.user!.id, platform);
    res.json({ success: true });
  }),
};
