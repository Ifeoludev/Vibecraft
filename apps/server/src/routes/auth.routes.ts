import { Router } from 'express';
import passport from '../lib/passport';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err: Error | null, user: Express.User | false) => {
    if (err) {
      console.error('[oauth-callback] passport error:', err.message);
      // Log the raw Google error body when available
      const oauthErr = (err as Error & { oauthError?: unknown }).oauthError;
      if (oauthErr) console.error('[oauth-callback] google error body:', JSON.stringify(oauthErr));
      return res.redirect(`${process.env.CLIENT_URL?.trim()}/`);
    }
    if (!user) {
      console.warn('[oauth-callback] no user returned, redirecting');
      return res.redirect(`${process.env.CLIENT_URL?.trim()}/`);
    }
    req.user = user;
    next();
  })(req, res, next);
}, authController.googleCallback);

router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);

router.get('/youtube', requireAuth, authController.connectYoutube);
router.get('/youtube/callback', authController.youtubeCallback);

router.delete('/connections/:platform', requireAuth, authController.disconnectPlatform);

export default router;
