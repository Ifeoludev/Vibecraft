// Fixed positions — no randomization so the component is stable and never causes re-renders.
// CSS transform animations run on the compositor thread, not the main thread, so scrolling stays smooth.
const NOTES = [
  { symbol: '♪', x: 5,  delay: 0,   duration: 9,  size: 13 },
  { symbol: '♫', x: 14, delay: 2,   duration: 12, size: 10 },
  { symbol: '♪', x: 24, delay: 4.5, duration: 8,  size: 17 },
  { symbol: '♫', x: 35, delay: 1,   duration: 11, size: 12 },
  { symbol: '♪', x: 47, delay: 3,   duration: 10, size: 15 },
  { symbol: '♫', x: 58, delay: 5,   duration: 8.5, size: 10 },
  { symbol: '♪', x: 67, delay: 0.5, duration: 13, size: 14 },
  { symbol: '♫', x: 78, delay: 2.5, duration: 9,  size: 18 },
  { symbol: '♪', x: 88, delay: 4,   duration: 11, size: 11 },
  { symbol: '♫', x: 93, delay: 1.5, duration: 10, size: 15 },
  { symbol: '♪', x: 42, delay: 6,   duration: 8,  size: 12 },
  { symbol: '♫', x: 72, delay: 3.5, duration: 12, size: 16 },
] as const;

export default function MusicParticles() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {NOTES.map((note, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${note.x}%`,
            bottom: '-8%',
            fontSize: `${note.size}px`,
            color: '#a78bfa',
            animation: `float-note ${note.duration}s ${note.delay}s infinite linear`,
            willChange: 'transform',
          }}
        >
          {note.symbol}
        </span>
      ))}
    </div>
  );
}
