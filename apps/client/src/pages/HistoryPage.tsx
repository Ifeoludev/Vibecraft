import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import api from '../lib/api';

interface PlaylistSummary {
  id: string;
  vibeDescription: string;
  songs: { albumArt: string | null }[];
  platform: 'YOUTUBE' | null;
  platformUrl: string | null;
  createdAt: string;
}

// Cards stagger in 40ms apart — snappy on short lists, still readable on long ones
const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HistoryPage() {
  // staleTime: 0 so the list is always fresh — avoids the new playlist being missing
  // after the user generates one and immediately visits this page
  const {
    data: playlists,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const res = await api.get('/api/playlists');
      return res.data.data as PlaylistSummary[];
    },
    staleTime: 0,
  });

  return (
    <div className="min-h-screen bg-[#0d0b1e]">
      <Header />

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-24">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-violet-400 mb-2">Your vibes</p>
          <h1 className="text-2xl font-bold text-slate-100">Playlist History</h1>
        </div>

        {isLoading && (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        )}

        {isError && (
          <div className="text-center py-24">
            <p className="text-slate-400 text-sm mb-4">Couldn't load your playlists.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-violet-400 text-sm hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {playlists?.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <MusicNoteIcon />
            <p className="text-slate-400 text-sm">
              No playlists yet. Describe a vibe to get started.
            </p>
            <Link
              to="/vibe"
              className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all duration-150"
            >
              Create your first playlist
            </Link>
          </div>
        )}

        {playlists && playlists.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {playlists.map((playlist) => (
              <motion.div key={playlist.id} variants={cardVariants}>
                <PlaylistCard playlist={playlist} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

// Sub-components

function PlaylistCard({ playlist }: { playlist: PlaylistSummary }) {
  // Grab art from the first 4 songs; pad remaining slots with dark placeholders
  // so the art row height is always consistent regardless of how many songs have art
  const artUrls = playlist.songs
    .slice(0, 4)
    .map((s) => s.albumArt)
    .filter(Boolean) as string[];
  const placeholderCount = Math.max(0, 4 - artUrls.length);

  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className="block h-full bg-[#13102b] rounded-2xl border border-white/5 p-4 hover:border-violet-500/30 hover:bg-[#17143a] transition-all duration-200 group"
    >
      <div className="flex gap-1.5 mb-3">
        {artUrls.map((src, i) => (
          <img
            key={`art-${i}`}
            src={src}
            alt=""
            aria-hidden="true"
            className="h-11 w-11 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div key={`ph-${i}`} className="h-11 w-11 rounded-lg bg-[#1e1a3a] shrink-0" />
        ))}
      </div>

      <p className="text-slate-100 text-sm font-medium line-clamp-2 leading-snug mb-3 group-hover:text-violet-200 transition-colors duration-200">
        "{playlist.vibeDescription}"
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">{playlist.songs.length} songs</span>
          {playlist.platform && <PlatformBadge />}
        </div>
        <span className="text-slate-600 text-xs tabular-nums">
          {formatDate(playlist.createdAt)}
        </span>
      </div>
    </Link>
  );
}

function PlatformBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff0000]/15 text-[#ff0000]">
      YT Music
    </span>
  );
}

function MusicNoteIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-600"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-7 w-7 text-violet-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
