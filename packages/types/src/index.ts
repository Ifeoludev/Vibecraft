export type Platform = 'YOUTUBE';

export interface Song {
  title: string;
  artist: string;
  albumArt: string | null;
  youtubeVideoId: string | null;
  musicApiId: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  defaultPlatform: Platform | null;
}

export interface Playlist {
  id: string;
  userId: string;
  vibeDescription: string;
  songs: Song[];
  platform: Platform;
  platformPlaylistId: string | null;
  platformUrl: string | null;
  createdAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
