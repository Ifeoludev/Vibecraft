import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { useCurrentUser } from '../hooks/useCurrentUser';
import api from '../lib/api';

interface PlaylistSummary {
  id: string;
  vibeDescription: string;
  songs: { albumArt: string | null }[];
  platform: 'YOUTUBE' | null;
  createdAt: string;
}

// Greeting rotates each visit — time-based options stay in pool alongside mood-based ones
function buildGreetings(name: string): string[] {
  const h = new Date().getHours();
  const timeGreeting =
    h < 12 ? `Good morning, ${name}` : h < 17 ? `Good afternoon, ${name}` : `Good evening, ${name}`;
  return [
    timeGreeting,
    `What's the vibe today, ${name}?`,
    `How are you feeling today, ${name}?`,
    `What mood are you in, ${name}?`,
  ];
}

// Compares against the user's local date so "today" aligns with their clock, not UTC
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getUTCFullYear() === n.getUTCFullYear() &&
    d.getUTCMonth() === n.getUTCMonth() &&
    d.getUTCDate() === n.getUTCDate()
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Stable index chosen on mount so the greeting rotates each visit but doesn't flicker mid-session
  const [greetIdx] = useState(() => Math.floor(Math.random() * 4));

  const { data: user, isError } = useCurrentUser();

  // Redirect to landing if the session is gone (token expired, user visits /home directly)
  useEffect(() => {
    if (isError) navigate('/');
  }, [isError, navigate]);

  const { data: playlists } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const res = await api.get('/api/playlists');
      return res.data.data as PlaylistSummary[];
    },
    staleTime: 0,
  });

  const recent = playlists?.slice(0, 3) ?? [];

  // Only compute once playlists are loaded so the button never flickers between states
  const todayCount = playlists ? playlists.filter((p) => isToday(p.createdAt)).length : null;
  const generationsLeft = todayCount !== null && user ? Math.max(0, user.dailyLimit - todayCount) : null;
  const atLimit = generationsLeft === 0;

  const firstName = user?.displayName.split(' ')[0] ?? '…';
  const greeting = user ? buildGreetings(firstName)[greetIdx] : '…';

  return (
    <div className="min-h-screen bg-[#0d0b1e]">
      <Header />

      <motion.main
        className="max-w-3xl mx-auto px-6 pt-28 pb-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-slate-100 font-bold text-2xl leading-tight">
            {greeting}
          </h1>
        </div>

        {/* Generate CTA */}
        <div className="bg-[#13102b] rounded-2xl border border-violet-500/15 p-6 mb-8">
          <p className="text-xs uppercase tracking-widest text-violet-400 mb-2">Create</p>
          <p className="text-slate-400 text-sm mb-5">
            Describe a mood, moment, or feeling — Vibecraft builds the playlist.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              to="/vibe"
              aria-disabled={atLimit}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-150 ${
                atLimit
                  ? 'bg-violet-600/40 pointer-events-none'
                  : 'bg-violet-600 hover:bg-violet-500 active:scale-[0.98]'
              }`}
            >
              Generate a playlist
            </Link>

            {generationsLeft !== null && (
              <span
                className={`text-xs tabular-nums ${atLimit ? 'text-amber-400' : 'text-slate-600'}`}
              >
                {atLimit
                  ? 'Daily limit reached — resets tomorrow'
                  : `${generationsLeft} of ${user!.dailyLimit} left today`}
              </span>
            )}
          </div>
        </div>

        {/* Recent playlists */}
        {playlists !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-violet-400">Recent</p>
              {playlists.length > 3 && (
                <Link
                  to="/history"
                  className="text-slate-500 text-xs hover:text-slate-300 transition-colors duration-150"
                >
                  See all →
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <p className="text-slate-600 text-sm">
                No playlists yet — generate your first one above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recent.map((playlist) => (
                  <RecentCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RecentCard({ playlist }: { playlist: PlaylistSummary }) {
  const artUrls = playlist.songs
    .slice(0, 4)
    .map((s) => s.albumArt)
    .filter(Boolean) as string[];
  const placeholderCount = Math.max(0, 4 - artUrls.length);

  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className="block bg-[#13102b] rounded-2xl border border-white/5 p-4 hover:border-violet-500/30 hover:bg-[#17143a] transition-all duration-200 group"
    >
      <div className="flex gap-1.5 mb-3">
        {artUrls.map((src, i) => (
          <img
            key={`art-${i}`}
            src={src}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div key={`ph-${i}`} className="h-10 w-10 rounded-lg bg-[#1e1a3a] shrink-0" />
        ))}
      </div>

      <p className="text-slate-100 text-sm font-medium line-clamp-2 leading-snug group-hover:text-violet-200 transition-colors duration-200">
        "{playlist.vibeDescription}"
      </p>
      <p className="text-slate-600 text-xs mt-2">{playlist.songs.length} songs</p>
    </Link>
  );
}
