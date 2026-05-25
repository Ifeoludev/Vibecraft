import { randomBytes } from 'crypto';
import { Platform } from '../generated/prisma/enums';
import { encrypt, decrypt } from '../lib/crypto';
import { signJwt, verifyJwt } from '../lib/jwt';
import { oauthRepository } from '../repositories/oauth.repository';
import { userRepository } from '../repositories/user.repository';
import { UnauthorizedError } from '../errors';
import { fetchWithTimeout } from '../lib/fetch';
import { exchangeYoutubeCode } from '../lib/googleOAuth';

interface YoutubeChannelResponse {
  items: { id: string }[];
}

export const authService = {
  issueJwt(userId: string): string {
    return signJwt({ sub: userId }, '24h');
  },

  buildYoutubeAuthUrl(userId: string): string {
    const nonce = randomBytes(8).toString('hex');
    // signed JWT as state — binds the callback to this user and expires in 10 min (CSRF protection)
    const state = signJwt({ userId, nonce }, '10m');
    const params = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: `${process.env.SERVER_URL}/api/auth/youtube/callback`,
      state,
      scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
      access_type: 'offline', // required to receive a refresh token
      prompt: 'consent',      // forces consent screen so Google always issues a fresh refresh token
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async handleYoutubeCallback(code: string, state: string): Promise<void> {
    const payload = verifyJwt<{ userId: string; nonce: string }>(state);
    if (!payload) throw new UnauthorizedError('Invalid OAuth state');

    const tokens = await exchangeYoutubeCode(code);

    // Fetch channel ID for platformUserId — non-fatal if quota is exhausted or unavailable
    // platformUserId is stored for reference but not required for playlist creation
    let platformUserId = '';
    const channelRes = await fetchWithTimeout(
      'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    );
    if (channelRes.ok) {
      const channel = (await channelRes.json()) as YoutubeChannelResponse;
      platformUserId = channel.items?.[0]?.id ?? '';
    }

    await oauthRepository.upsert({
      userId: payload.userId,
      platform: Platform.YOUTUBE,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken!),
      expiresAt: tokens.expiresAt,
      platformUserId,
    });
    await userRepository.updateDefaultPlatform(payload.userId, 'YOUTUBE');
  },

  async disconnectPlatform(userId: string, platform: Platform): Promise<void> {
    await oauthRepository.deleteByUserAndPlatform(userId, platform);
    await userRepository.updateDefaultPlatform(userId, null);
  },

  async deleteAccount(userId: string): Promise<void> {
    const accounts = await oauthRepository.findAllByUser(userId);

    // Best-effort revocation — failures must not block account deletion
    await Promise.allSettled(
      accounts.map(async (account) => {
        const accessToken = decrypt(account.accessToken);
        await fetchWithTimeout(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, { method: 'POST' });
      })
    );

    // Cascade in schema deletes OAuthAccounts and Playlists automatically
    await userRepository.deleteById(userId);
  },
};
