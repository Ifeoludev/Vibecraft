import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import axios from 'axios';
import Header from '../components/Header';
import MusicParticles from '../components/MusicParticles';
import { YouTubeIcon } from '../components/PlatformIcons';
import api from '../lib/api';

interface Song {
  title: string;
  artist: string;
  albumArt: string | null;
}

interface Playlist {
  id: string;
  vibeDescription: string;
  songs: Song[];
  platform: 'YOUTUBE' | null;
  platformUrl: string | null;
}

// Each card waits 80ms longer than the previous one — the typewriter effect
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};


export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [playlistName, setPlaylistName] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: playlist, isLoading, error: fetchError } = useQuery({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const res = await api.get(`/api/playlists/${id}`);
      return res.data.data as Playlist;
    },
    enabled: !!id,
  });

  const exportMutation = useMutation({
    mutationFn: async (platform: 'YOUTUBE') => {
      const res = await api.post('/api/playlists/export', {
        playlistId: id,
        // Fall back to the vibe description if the user left the name blank
        playlistName: playlistName.trim() || playlist?.vibeDescription.slice(0, 60),
        platform,
      });
      return res.data;
    },
    onSuccess: (data) => {
      // Refresh so the page flips to the "already exported" view
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      window.open(data.data.platformUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (err: Error) => {
      if (axios.isAxiosError(err)) {
        setExportError(err.response?.data?.message ?? 'Export failed. Try again.');
      } else {
        setExportError('Export failed. Try again.');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0b1e]">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (fetchError || !playlist) {
    return (
      <div className="min-h-screen bg-[#0d0b1e]">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-slate-400">Couldn't load this playlist.</p>
          <Link to="/vibe" className="text-violet-400 text-sm hover:underline">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  const alreadyExported = !!playlist.platformUrl;

  return (
    <div className="relative min-h-screen bg-[#0d0b1e] overflow-hidden">
      <MusicParticles />
      <Header />

      <main className="max-w-2xl mx-auto px-6 pt-28 pb-24">
        {/* Playlist context */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-violet-400 mb-2">Your vibe</p>
          <h1 className="text-2xl font-bold text-slate-100 leading-snug">
            "{playlist.vibeDescription}"
          </h1>
          <p className="mt-2 text-slate-500 text-sm">{playlist.songs.length} songs</p>
        </div>

        {/* Song list — stagger triggers the typewriter card reveal */}
        <motion.ul
          className="space-y-3 list-none p-0 m-0"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {playlist.songs.map((song, i) => (
            <motion.li
              key={i}
              variants={cardVariant}
              transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <SongCard song={song} index={i} />
            </motion.li>
          ))}
        </motion.ul>

        {/* Export section */}
        <div className="mt-12 pt-8 border-t border-white/5">
          {alreadyExported ? (
            <ExportedState playlist={playlist} />
          ) : (
            <ExportForm
              playlist={playlist}
              playlistName={playlistName}
              onNameChange={setPlaylistName}
              exportError={exportError}
              onExport={(platform) => {
                setExportError(null);
                exportMutation.mutate(platform);
              }}
              isPending={exportMutation.isPending}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SongCard({ song, index }: { song: Song; index: number }) {
  return (
    <div className="flex items-center gap-4 bg-[#13102b] rounded-2xl px-4 py-3 border border-white/5">
      <span className="text-slate-600 text-xs w-5 text-right shrink-0">{index + 1}</span>

      {song.albumArt ? (
        <img
          src={song.albumArt}
          alt={`${song.title} album art`}
          className="h-12 w-12 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        // Fallback when MusicAPI doesn't return art
        <div className="h-12 w-12 rounded-lg bg-[#1e1a3a] flex items-center justify-center shrink-0 text-slate-600 text-lg">
          ♪
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-slate-100 text-sm font-medium truncate">{song.title}</p>
        <p className="text-slate-400 text-xs truncate">{song.artist}</p>
      </div>

    </div>
  );
}

function ExportedState({ playlist }: { playlist: Playlist }) {
  return (
    <div className="text-center">
      <p className="text-slate-400 text-sm mb-5">Playlist exported to YouTube Music</p>
      <a
        href={playlist.platformUrl!}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white bg-[#ff0000] hover:bg-[#cc0000] transition-all active:scale-95"
      >
        <YouTubeIcon className="h-4 w-4" />
        Open in YouTube Music
        <ExternalIcon />
      </a>
    </div>
  );
}

function ExportForm({
  playlist,
  playlistName,
  onNameChange,
  exportError,
  onExport,
  isPending,
}: {
  playlist: Playlist;
  playlistName: string;
  onNameChange: (v: string) => void;
  exportError: string | null;
  onExport: (platform: 'YOUTUBE') => void;
  isPending: boolean;
}) {
  return (
    <div>
      <p className="text-slate-100 font-semibold mb-1">Name your playlist</p>
      <p className="text-slate-500 text-sm mb-4">You can always rename it on the platform later.</p>

      <input
        type="text"
        value={playlistName}
        onChange={(e) => onNameChange(e.target.value.slice(0, 100))}
        placeholder={playlist.vibeDescription.slice(0, 60)}
        className="w-full bg-[#13102b] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 mb-4"
      />

      {exportError && <p className="mb-4 text-sm text-red-400">{exportError}</p>}

      <div className="flex gap-3">
        <button
            onClick={() => onExport('YOUTUBE')}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Exporting…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <YouTubeIcon className="h-4 w-4" />
                Export to YouTube Music
              </span>
            )}
          </button>
      </div>
    </div>
  );
}

function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-8 w-8 text-violet-500' : 'h-4 w-4';
  return (
    <svg className={`animate-spin ${cls}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
