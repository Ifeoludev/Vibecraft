import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt';
import { userRepository } from '../repositories/user.repository';
import { UnauthorizedError } from '../errors';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token as string | undefined;
    if (!token) throw new UnauthorizedError();

    const payload = verifyJwt<{ sub: string }>(token);
    if (!payload) throw new UnauthorizedError();

    // DB lookup on every request so deleted accounts are locked out immediately
    // (JWTs can't be revoked without a blocklist, so we validate existence here instead)
    const user = await userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedError();

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
