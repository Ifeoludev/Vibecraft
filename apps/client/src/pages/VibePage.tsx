import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Header from '../components/Header';
import MusicParticles from '../components/MusicParticles';
import api from '../lib/api';

const MAX_CHARS = 300;

const LOADING_MESSAGES = [
  'Fetching songs…',
  'Matching rhythms…',
  'Tuning the vibes…',
  'Compiling playlist…',
  'Syncing the beats…',
  'Curating the mix…',
  'Fine-tuning your sound…',
  'Organizing the setlist…',
  'Connecting the dots…',
  'Almost there…',
];

export default function VibePage() {
  const [vibe, setVibe] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async (description: string) => {
      const res = await api.post('/api/playlists/generate', { vibeDescription: description });
      return res.data;
    },
    onSuccess: (data) => {
      navigate(`/playlist/${data.data.id}`);
    },
    // Use the server's error message when available
    onError: (err: Error) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Something went wrong. Try again.');
      } else {
        setError('Something went wrong. Try again.');
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutate(vibe.trim());
  }

  // Cycle through messages every 2s while generation is in flight
  useEffect(() => {
    if (!isPending) { setMsgIdx(0); return; }
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(id);
  }, [isPending]);

  const charsLeft = MAX_CHARS - vibe.length;
  const isNearLimit = charsLeft <= 30;
  const canSubmit = vibe.trim().length >= 5 && !isPending;

  return (
    <div className="relative min-h-screen bg-[#0d0b1e] overflow-hidden">
      <MusicParticles />
      <Header />

      <main className="flex flex-col items-center justify-center min-h-screen px-6 pt-16">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-3xl font-bold text-slate-100 mb-2">What's your vibe?</h1>
          <p className="text-slate-400 mb-8">
            Describe how you're feeling or the mood you want. Vibecraft does the rest.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="relative">
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value.slice(0, MAX_CHARS))}
                placeholder="late night drive through the city, feeling nostalgic and a little lost..."
                rows={5}
                disabled={isPending}
                className="w-full bg-[#13102b] text-slate-100 placeholder-slate-600 rounded-2xl px-5 py-4 text-base resize-none outline-none border border-white/5 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 disabled:opacity-50"
              />
              {/* Counter turns amber when close to the limit */}
              <span
                className={`absolute bottom-4 right-5 text-xs tabular-nums transition-colors ${
                  isNearLimit ? 'text-amber-400' : 'text-slate-600'
                }`}
              >
                {charsLeft}
              </span>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="mt-3 text-sm text-red-400"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  {LOADING_MESSAGES[msgIdx]}
                </span>
              ) : (
                'Generate Playlist'
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
