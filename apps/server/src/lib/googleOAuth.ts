import { UnauthorizedError } from '../errors';
import { fetchWithTimeout } from './fetch';

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

async function postToTokenEndpoint(params: URLSearchParams): Promise<GoogleTokens> {
  const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('Google token exchange failed', { status: res.status, body });
    throw new UnauthorizedError('YouTube token request failed');
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export function exchangeYoutubeCode(code: string): Promise<GoogleTokens> {
  return postToTokenEndpoint(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.SERVER_URL}/api/auth/youtube/callback`,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    })
  );
}

export function refreshYoutubeToken(refreshToken: string): Promise<GoogleTokens> {
  return postToTokenEndpoint(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    })
  );
}
