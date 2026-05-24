import { Router } from 'express';
import passport from '../lib/passport';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', (req, _res, next) => {
  console.log('[oauth-callback] raw code:', JSON.stringify(req.query.code));
  console.log('[oauth-callback] raw state:', JSON.stringify(req.query.state));
  next();
}, passport.authenticate('google', {
  session: false,
  failureRedirect: `${process.env.CLIENT_URL?.trim()}/`,
}), authController.googleCallback);

router.get('/me', requireAuth, authController.me);
router.post('/logout', authController.logout);

router.get('/youtube', requireAuth, authController.connectYoutube);
router.get('/youtube/callback', authController.youtubeCallback);

router.delete('/connections/:platform', requireAuth, authController.disconnectPlatform);

export default router;
