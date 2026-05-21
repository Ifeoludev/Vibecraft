import { Platform } from '../generated/prisma/enums';
import { Song } from '@vibecraft/types';
import { decrypt, encrypt } from '../lib/crypto';
import { oauthRepository } from '../repositories/oauth.repository';
import { playlistRepository } from '../repositories/playlist.repository';
import { ExternalAPIError, NotFoundError, UnauthorizedError } from '../errors';
import { fetchWithTimeout } from '../lib/fetch';

//Token refresh helpers

interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string; // only present when Google rotates it
  expiresAt: Date;
}

async function refreshYoutubeToken(refreshToken: string): Promise<RefreshedTokens> {
  const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new UnauthorizedError('YouTube token refresh failed — reconnect YouTube');
  const data = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// Returns a valid (possibly freshly-refreshed) access token, updating the DB if needed
async function getValidAccessToken(userId: string, platform: Platform): Promise<string> {
  const account = await oauthRepository.findByUserAndPlatform(userId, platform);
  if (!account) {
    throw new UnauthorizedError(
      `No ${platform} account connected. Connect it from your profile first.`
    );
  }

  const accessToken = decrypt(account.accessToken);

  // Refresh proactively 60s before expiry to avoid races at the boundary
  if (account.expiresAt.getTime() > Date.now() + 60_000) {
    return accessToken;
  }

  const refreshToken = decrypt(account.refreshToken);
  const refreshed = await refreshYoutubeToken(refreshToken);

  await oauthRepository.upsert({
    userId,
    platform,
    accessToken: encrypt(refreshed.accessToken),
    refreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : account.refreshToken,
    expiresAt: refreshed.expiresAt,
    platformUserId: account.platformUserId,
  });

  return refreshed.accessToken;
}

// Platform export helpers

async function exportToYoutube(
  accessToken: string,
  playlistName: string,
  songs: Song[]
): Promise<{ platformPlaylistId: string; platformUrl: string }> {
  // Create the playlist
  const createRes = await fetchWithTimeout(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: { title: playlistName },
        status: { privacyStatus: 'private' },
      }),
    }
  );
  if (!createRes.ok) {
    const errBody = await createRes.json().catch(() => ({}));
    console.error('[export] YouTube playlist create failed:', createRes.status, JSON.stringify(errBody));
    throw new ExternalAPIError('Failed to create YouTube playlist');
  }
  const created = (await createRes.json()) as { id: string };

  // Songs are pre-verified at generation time — IDs are guaranteed valid
  console.log(`[export] Total songs: ${songs.length}, with videoId: ${songs.filter(s => s.youtubeVideoId).length}`);
  const videosToAdd = songs.filter((s) => s.youtubeVideoId);
  for (const song of videosToAdd) {
    const addRes = await fetchWithTimeout('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId: created.id,
          resourceId: { kind: 'youtube#video', videoId: song.youtubeVideoId },
        },
      }),
    });
    if (!addRes.ok) {
      const err = await addRes.json().catch(() => ({}));
      console.error(`[export] Failed to add "${song.title}" (${song.youtubeVideoId}):`, addRes.status, err);
    }
  }

  return {
    platformPlaylistId: created.id,
    platformUrl: `https://music.youtube.com/playlist?list=${created.id}`,
  };
}

// ── Public service

export const exportService = {
  async exportPlaylist(
    userId: string,
    playlistId: string,
    playlistName: string,
    platform: Platform
  ) {
    const playlist = await playlistRepository.findById(playlistId, userId);
    if (!playlist) throw new NotFoundError('Playlist not found');

    const account = await oauthRepository.findByUserAndPlatform(userId, platform);
    if (!account) {
      throw new UnauthorizedError(
        `No ${platform} account connected. Connect it from your profile first.`
      );
    }

    const accessToken = await getValidAccessToken(userId, platform);
    const songs = playlist.songs as unknown as Song[];

    const { platformPlaylistId, platformUrl } =
      await exportToYoutube(accessToken, playlistName, songs);

    return playlistRepository.updatePlatformData(playlistId, userId, {
      platform,
      platformPlaylistId,
      platformUrl,
    });
  },
};
