import { motion } from 'framer-motion';
import MusicParticles from '../components/MusicParticles';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-[#0d0b1e] overflow-hidden">
      <MusicParticles />
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 bg-[#0d0b1e]/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-1 select-none">
          <img src="/Vibecraft-logo-no-background-newest.png" alt="Vibecraft" className="h-6 w-auto object-contain" />
          <span className="text-lg font-bold text-slate-100 tracking-tight">Vibecraft</span>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center pt-16">
        <motion.div
          className="max-w-xl"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-100 leading-[1.15] tracking-tight mb-5">
            Describe your vibe.{' '}
            <span className="text-violet-400">Get a playlist.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            Tell Vibecraft how you feel and it picks the songs. Export straight to YouTube Music.
          </p>

          {/* Redirects to backend which initiates the Google OAuth flow */}
          <a
            href={`${API_URL}/api/auth/google`}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-gray-800 text-sm font-medium hover:bg-gray-100 active:scale-95 transition-all duration-150"
          >
            <GoogleIcon />
            Sign in with Google
          </a>
        </motion.div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
