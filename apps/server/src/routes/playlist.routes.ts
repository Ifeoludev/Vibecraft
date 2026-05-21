import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { playlistController } from '../controllers/playlist.controller';

const router = Router();

router.post('/generate', requireAuth, playlistController.generate);
router.post('/export', requireAuth, playlistController.exportPlaylist);
router.get('/', requireAuth, playlistController.getAll);
router.get('/:id', requireAuth, playlistController.getOne);

export default router;
