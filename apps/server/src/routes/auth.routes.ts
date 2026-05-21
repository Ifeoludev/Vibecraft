import { Router } from 'express';
import passport from '../lib/passport';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false, // JWT cookie is already set in googleCallback; no need to persist user in session
    failureRedirect: `${process.env.CLIENT_URL}/`,
  }),
  authController.googleCallback
);

router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);

router.get('/youtube', requireAuth, authController.connectYoutube);
router.get('/youtube/callback', authController.youtubeCallback);

router.delete('/connections/:platform', requireAuth, authController.disconnectPlatform);

export default router;
