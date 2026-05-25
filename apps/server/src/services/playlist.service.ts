import { geminiService } from './gemini.service';
import { musicApiService } from './musicApi.service';
import { playlistRepository } from '../repositories/playlist.repository';
import { RateLimitError } from '../errors';

export const DAILY_GENERATION_LIMIT = 4;

export const playlistService = {
  async generate(userId: string, vibeDescription: string) {
    const todayCount = await playlistRepository.countTodayByUser(userId);
    if (todayCount >= DAILY_GENERATION_LIMIT) {
      throw new RateLimitError(
        `You've reached the limit of ${DAILY_GENERATION_LIMIT} playlist generations per day.`
      );
    }

    // Gemini produces 20 raw suggestions; MusicAPI validates and enriches them
    const suggestions = await geminiService.getSuggestions(vibeDescription);
    const songs = await musicApiService.validateSuggestions(suggestions);

    return playlistRepository.create({ userId, vibeDescription, songs });
  },

  async getById(id: string, userId: string) {
    return playlistRepository.findById(id, userId);
  },

  async getAllByUser(userId: string) {
    const playlists = await playlistRepository.findAllByUser(userId);
    return playlists.map((p) => ({
      ...p,
      songs: (p.songs as Array<{ albumArt?: string | null }>).map((s) => ({
        albumArt: s.albumArt ?? null,
      })),
    }));
  },
};
