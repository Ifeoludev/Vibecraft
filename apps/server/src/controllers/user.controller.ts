import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../lib/asyncHandler';

export const userController = {
  deleteAccount: asyncHandler(async (req: Request, res: Response) => {
    await authService.deleteAccount(req.user!.id);
    res.clearCookie('token');
    res.json({ success: true });
  }),
};
