import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const userController = {
  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.deleteAccount(req.user!.id);
      res.clearCookie('token');
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
