import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { userController } from '../controllers/user.controller';

const router = Router();

router.delete('/', requireAuth, userController.deleteAccount);

export default router;
