import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'text-violet-400 bg-violet-500/10'
      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'text-violet-400 bg-violet-500/10'
      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
  }`;

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0b1e]/80 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/home" className="flex items-center gap-1 select-none" onClick={close}>
          <img src="/Vibecraft logo.png" alt="Vibecraft" className="h-10 object-contain" />
          <span className="text-lg font-bold text-slate-100 tracking-tight">Vibecraft</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/vibe" className={navClass}>Generate</NavLink>
          <NavLink to="/history" className={navClass}>History</NavLink>
          <NavLink to="/profile" className={navClass}>Profile</NavLink>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors duration-150"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      <AnimatePresence>
        {open && (
          <motion.nav
            className="sm:hidden flex flex-col gap-1 px-4 pb-4 border-t border-white/5"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <NavLink to="/vibe" className={mobileNavClass} onClick={close}>Generate</NavLink>
            <NavLink to="/history" className={mobileNavClass} onClick={close}>History</NavLink>
            <NavLink to="/profile" className={mobileNavClass} onClick={close}>Profile</NavLink>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
