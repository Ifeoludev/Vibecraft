import { Song } from '@vibecraft/types';
import { SongSuggestion } from './gemini.service';
import { ValidationError } from '../errors';
import { fetchWithTimeout } from '../lib/fetch';

const MUSIC_API_BASE = 'https://api.musicapi.com';

// Words in a video title that almost never appear on an original release
const COVER_KEYWORDS = ['cover', 'tribute', 'karaoke', 'parody'];

// YouTube titles come back with HTML entities — decode them before storing
function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// NOTE: The field names inside `data` are inferred from MusicAPI's pattern — verify
// against a real response if anything comes back undefined.
interface MusicApiTrackData {
  externalId: string; // YouTube video ID
  name: string; // video title
  artistNames: string[]; // array of artist names
  imageUrl: string; // thumbnail URL
  duration: number | null; // duration in ms — null when unavailable
  url: string; // YouTube URL
}

interface MusicApiSearchResult {
  source: string; // e.g. "youtube"
  status: string; // "success" | "error"
  data: MusicApiTrackData;
}

interface MusicApiSearchResponse {
  tracks: MusicApiSearchResult[];
}

async function searchTrack(suggestion: SongSuggestion): Promise<Song | null> {
  const titleLower = suggestion.title.toLowerCase();
  const artistLower = suggestion.artist.toLowerCase();

  function scoreVideo(vTitle: string, vChannel: string): number {
    if (COVER_KEYWORDS.some((kw) => vTitle.includes(kw))) return -1;
    let score = 0;
    if (vTitle.includes(titleLower)) score += 2;
    if (vTitle.includes(artistLower) || vChannel.includes(artistLower)) score += 1;
    return score;
  }

  // Verify a candidate video ID against YouTube's own metadata.
  // Returns the ID if it passes, null if it's a cover/wrong song/mismatch.
  async function verifyVideoId(id: string): Promise<string | null> {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${process.env.YOUTUBE_API_KEY}`
    );
    if (!res.ok) return id; // fail open — verification outage doesn't drop valid songs

    const data = (await res.json()) as {
      items?: { snippet: { title: string; channelTitle: string } }[];
    };
    const video = data.items?.[0];
    if (!video) return null;

    const score = scoreVideo(
      video.snippet.title.toLowerCase(),
      video.snippet.channelTitle.toLowerCase()
    );
    return score >= 3 ? id : null;
  }

  // Search YouTube ourselves and pick the best scoring result from up to 5 candidates
  async function searchYoutubeFallback(): Promise<string | null> {
    const q = encodeURIComponent(`${suggestion.title} ${suggestion.artist}`);
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${q}&type=video&videoCategoryId=10&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[];
    };

    for (const item of data.items ?? []) {
      const score = scoreVideo(
        item.snippet.title.toLowerCase(),
        item.snippet.channelTitle.toLowerCase()
      );
      if (score >= 3) return item.id.videoId;
    }

    return null;
  }

  // ── Phase 1: try MusicAPI ────────────────────────────────────────────────────
  const musicApiRes = await fetchWithTimeout(`${MUSIC_API_BASE}/public/search`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.MUSIC_API_KEY}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      track: suggestion.title,
      artist: suggestion.artist,
      type: 'track',
      sources: ['youtube'],
    }),
  });

  let youtubeResult: MusicApiSearchResult | undefined;
  if (musicApiRes.ok) {
    const json = (await musicApiRes.json()) as MusicApiSearchResponse;
    youtubeResult = json.tracks?.find((t) => t.source === 'youtube' && t.status === 'success');
  } else {
    const reason = musicApiRes.status === 429 ? 'rate limited (429)' : `unavailable (${musicApiRes.status})`;
    console.warn(`[musicApi] "${suggestion.title}" — MusicAPI ${reason}, going straight to YouTube fallback`);
  }

  // ── Phase 2: MusicAPI returned a result — verify its video ID ───────────────
  if (youtubeResult) {
    if (!process.env.YOUTUBE_API_KEY) {
      // No verification key — trust MusicAPI's ID as-is
      return {
        title: decodeHtml(youtubeResult.data.name),
        artist: decodeHtml(youtubeResult.data.artistNames[0] ?? suggestion.artist),
        albumArt: youtubeResult.data.imageUrl,
        youtubeVideoId: youtubeResult.data.externalId,
        musicApiId: youtubeResult.data.externalId,
      };
    }

    let confirmedVideoId = await verifyVideoId(youtubeResult.data.externalId);
    console.log(
      `[musicApi] "${suggestion.title}" — MusicAPI id: ${youtubeResult.data.externalId}, verified: ${confirmedVideoId}`
    );

    if (!confirmedVideoId) {
      confirmedVideoId = await searchYoutubeFallback();
      console.log(`[musicApi] "${suggestion.title}" — fallback result: ${confirmedVideoId}`);
    }

    if (!confirmedVideoId) {
      console.log(`[musicApi] "${suggestion.title}" — dropped, no valid video found`);
      return null;
    }

    return {
      title: decodeHtml(youtubeResult.data.name),
      artist: decodeHtml(youtubeResult.data.artistNames[0] ?? suggestion.artist),
      albumArt: youtubeResult.data.imageUrl,
      youtubeVideoId: confirmedVideoId,
      musicApiId: youtubeResult.data.externalId,
    };
  }

  // ── Phase 3: MusicAPI failed or found nothing — go straight to YouTube ──────
  if (!process.env.YOUTUBE_API_KEY) return null;

  const confirmedVideoId = await searchYoutubeFallback();
  console.log(`[musicApi] "${suggestion.title}" — direct YouTube result: ${confirmedVideoId}`);

  if (!confirmedVideoId) {
    console.log(`[musicApi] "${suggestion.title}" — dropped, no valid video found`);
    return null;
  }

  // YouTube thumbnails follow a predictable URL pattern — no extra API call needed
  return {
    title: suggestion.title,
    artist: suggestion.artist,
    albumArt: `https://i.ytimg.com/vi/${confirmedVideoId}/hqdefault.jpg`,
    youtubeVideoId: confirmedVideoId,
    musicApiId: '',
  };
}

export const musicApiService = {
  async validateSuggestions(suggestions: SongSuggestion[]): Promise<Song[]> {
    const results = await Promise.allSettled(suggestions.map(searchTrack));

    const confirmed: Song[] = results
      .filter(
        (r): r is PromiseFulfilledResult<Song> => r.status === 'fulfilled' && r.value !== null
      )
      .map((r) => r.value);

    // Fewer than 10 confirmed tracks means the vibe was too niche or ambiguous
    if (confirmed.length < 10) {
      throw new ValidationError(
        'Not enough songs could be matched for that vibe. Try rephrasing your description.'
      );
    }

    return confirmed;
  },
};
