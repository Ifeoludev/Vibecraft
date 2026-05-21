import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UnauthorizedError, ValidationError } from '../errors';
import { Platform } from '../generated/prisma/enums';
import { DAILY_GENERATION_LIMIT } from '../services/playlist.service';

const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  // 'lax' in dev (same-origin). 'none' in prod so the cookie travels cross-origin
  // from Vercel → Render. 'none' requires secure:true (HTTPS), which prod always has.
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

export const authController = {
  googleCallback(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!req.user) throw new UnauthorizedError();
      const token = authService.issueJwt(req.user.id);
      res.cookie('token', token, COOKIE_OPTIONS);
      res.redirect(`${process.env.CLIENT_URL}/home`);
    } catch (err) {
      next(err);
    }
  },

  me(req: Request, res: Response): void {
    res.json({ success: true, data: { ...req.user, dailyLimit: DAILY_GENERATION_LIMIT } });
  },

  // clearing the cookie is sufficient for logout — the JWT stays technically valid until expiry
  // but without the cookie the browser never sends it, so the user is effectively logged out
  logout(_req: Request, res: Response): void {
    res.clearCookie('token');
    res.json({ success: true });
  },

  connectYoutube(req: Request, res: Response, next: NextFunction): void {
    try {
      const url = authService.buildYoutubeAuthUrl(req.user!.id);
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },

  // no requireAuth here — mid-redirect from Google so the cookie may not arrive; identity is in the signed state param
  async youtubeCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state, error } = req.query as Record<string, string>;
      if (error) throw new UnauthorizedError('YouTube authorization denied');
      if (!code) throw new UnauthorizedError('Missing authorization code — start the connection flow again');
      await authService.handleYoutubeCallback(code, state);
      res.redirect(`${process.env.CLIENT_URL}/profile?connected=youtube`);
    } catch (err) {
      next(err);
    }
  },

  async disconnectPlatform(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const platform = req.params.platform?.toUpperCase() as Platform;
      console.log('[disconnect] raw param:', JSON.stringify(req.params.platform), '| uppercased:', JSON.stringify(platform), '| Platform.YOUTUBE:', JSON.stringify(Platform.YOUTUBE));
      if (platform !== Platform.YOUTUBE) {
        throw new ValidationError('Invalid platform');
      }
      await authService.disconnectPlatform(req.user!.id, platform);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
