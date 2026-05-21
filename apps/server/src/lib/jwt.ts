import jwt from 'jsonwebtoken';

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not set');
  return s;
}

// used in two contexts: app auth ({ sub: userId }, 24h) and OAuth state ({ userId, nonce }, 10m)
export function signJwt(payload: object, expiresIn: string): string {
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);
}

// returns null on any failure (expired, tampered, wrong secret)
export function verifyJwt<T>(token: string): T | null {
  try {
    return jwt.verify(token, getSecret()) as T;
  } catch {
    return null;
  }
}
