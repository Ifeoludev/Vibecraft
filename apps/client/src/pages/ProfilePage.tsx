import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { YouTubeIcon } from '../components/PlatformIcons';
import { extractErrorMessage } from '../lib/errorUtils';
import { useCurrentUser } from '../hooks/useCurrentUser';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Backend redirects here with ?connected=youtube after OAuth — bust the cache
  // so the platform section reflects the new state immediately without waiting for staleTime
  useEffect(() => {
    if (searchParams.get('connected')) {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setSearchParams({}, { replace: true });
    }
  }, []);

  const { data: user, isLoading, isError } = useCurrentUser();

  const disconnectMutation = useMutation({
    mutationFn: async (platform: 'YOUTUBE') => {
      await api.delete(`/api/auth/connections/${platform.toLowerCase()}`);
    },
    onSuccess: () => {
      setDisconnectError(null);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => {
      setDisconnectError(extractErrorMessage(err, 'Failed to disconnect. Try again.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/api/user');
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      navigate('/');
    },
    onError: (err) => {
      setDeleteError(extractErrorMessage(err, 'Failed to delete account. Try again.'));
      setShowDeleteConfirm(false);
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

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-[#0d0b1e]">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-slate-400 text-sm">Couldn't load your profile.</p>
          <button
            onClick={() => navigate('/')}
            className="text-violet-400 text-sm hover:underline"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  const isConnected = !!user.defaultPlatform;

  return (
    <div className="min-h-screen bg-[#0d0b1e]">
      <Header />

      <motion.main
        className="max-w-2xl mx-auto px-6 pt-28 pb-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-violet-400 mb-2">Account</p>
          <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
        </div>

        {/* ── User info ───────────────────────────────────────────────────── */}
        <section className="bg-[#13102b] rounded-2xl border border-white/5 p-6 mb-5">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-14 w-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-[#1e1a3a] flex items-center justify-center shrink-0">
                <PersonIcon />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-slate-100 font-semibold truncate">{user.displayName}</p>
              <p className="text-slate-500 text-sm truncate">{user.email}</p>
            </div>
          </div>
        </section>

        {/* ── Music platform ──────────────────────────────────────────────── */}
        <section className="bg-[#13102b] rounded-2xl border border-white/5 p-6 mb-5">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-5">Music Platform</p>

          {isConnected ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <YouTubeIcon className="h-5 w-5 text-[#ff0000] shrink-0" />
                <span className="text-slate-100 text-sm font-medium">
                  Connected to YouTube Music
                </span>
              </div>

              {disconnectError && (
                <p className="mb-3 text-sm text-red-400">{disconnectError}</p>
              )}

              <button
                onClick={() => {
                  setDisconnectError(null);
                  disconnectMutation.mutate(user.defaultPlatform!);
                }}
                disabled={disconnectMutation.isPending}
                className="text-slate-400 text-sm hover:text-slate-200 transition-colors duration-150 disabled:opacity-40"
              >
                {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-slate-500 text-sm mb-5">
                No platform connected. Connect YouTube Music to export playlists.
              </p>
              <a
                href="/api/auth/youtube"
                className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150"
              >
                <YouTubeIcon className="h-4 w-4" />
                Connect YouTube Music
              </a>
            </div>
          )}
        </section>

        {/* ── Danger zone ─────────────────────────────────────────────────── */}
        <section className="bg-[#13102b] rounded-2xl border border-red-500/10 p-6">
          <p className="text-xs uppercase tracking-widest text-red-400/70 mb-5">Danger Zone</p>

          {deleteError && (
            <p className="mb-4 text-sm text-red-400">{deleteError}</p>
          )}

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 text-sm hover:text-red-300 transition-colors duration-150"
            >
              Delete account
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                This permanently deletes your account, all playlists, and revokes all platform
                connections.{' '}
                <span className="text-slate-200 font-medium">This cannot be undone.</span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {deleteMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Deleting…
                    </span>
                  ) : (
                    'Yes, delete my account'
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                  className="text-slate-400 text-sm hover:text-slate-200 transition-colors duration-150 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </section>
      </motion.main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PersonIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-600"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

