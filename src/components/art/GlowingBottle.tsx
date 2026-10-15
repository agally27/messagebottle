import { cn } from "@/lib/utils/cn";

/**
 * The signature object: a small glass bottle with a cork, a rolled note with
 * a heart, and a string of warm fairy lights inside. Pure SVG so it is crisp
 * at any size and can glow on dark or light backgrounds.
 */
export function GlowingBottle({ className, animated = true, title = "A glass bottle with a rolled message and warm fairy lights inside" }: { className?: string; animated?: boolean; title?: string }) {
  const lights: Array<[number, number, number]> = [
    [84, 150, 3.2], [100, 172, 2.6], [78, 196, 3.4], [106, 214, 2.4], [88, 236, 3.0], [112, 252, 2.2], [80, 270, 2.8], [102, 288, 3.2], [92, 310, 2.4], [110, 322, 2.6], [86, 338, 3.0],
  ];
  return (
    <svg viewBox="0 0 190 400" className={cn("block", className)} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id="gb-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="gb-inner" cx="0.5" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#f0b45e" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f0b45e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gb-cork" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9b98a" />
          <stop offset="1" stopColor="#a97d4b" />
        </linearGradient>
        <linearGradient id="gb-paper" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f7ead3" />
          <stop offset="1" stopColor="#e4cfae" />
        </linearGradient>
        <filter id="gb-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id="gb-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* ambient glow */}
      <ellipse cx="95" cy="250" rx="80" ry="120" fill="#f0b45e" opacity="0.28" filter="url(#gb-soft)" />
      {/* base shadow */}
      <ellipse cx="95" cy="386" rx="62" ry="9" fill="#2a1d0a" opacity="0.25" filter="url(#gb-soft)" />

      {/* cork */}
      <path d="M72 58 h46 l-4 44 h-38 z" fill="url(#gb-cork)" />
      <path d="M74 60 h42" stroke="#f1dcbb" strokeWidth="2" opacity="0.7" />
      <path d="M80 70 q15 4 30 0 M79 84 q16 4 32 0" stroke="#8d6538" strokeWidth="1.2" opacity="0.5" fill="none" />

      {/* twine + heart tag */}
      <path d="M70 108 c-10 10 -22 10 -30 24" stroke="#b8946a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M72 106 c6 8 18 10 26 18" stroke="#b8946a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g transform="translate(36 134) rotate(-18)">
        <path d="M0 6 C0 -2 10 -2 10 6 C10 -2 20 -2 20 6 C20 14 10 20 10 20 C10 20 0 14 0 6 Z" fill="#e7d6bb" stroke="#b8946a" strokeWidth="1.4" />
      </g>

      {/* glass body */}
      <path d="M68 100 h54 v18 c0 6 2 10 7 16 c10 12 18 24 18 42 v178 a22 22 0 0 1 -22 22 h-60 a22 22 0 0 1 -22 -22 v-178 c0 -18 8 -30 18 -42 c5 -6 7 -10 7 -16 z" fill="#dfeef0" opacity="0.28" />
      {/* inner light */}
      <path d="M68 100 h54 v18 c0 6 2 10 7 16 c10 12 18 24 18 42 v178 a22 22 0 0 1 -22 22 h-60 a22 22 0 0 1 -22 -22 v-178 c0 -18 8 -30 18 -42 c5 -6 7 -10 7 -16 z" fill="url(#gb-inner)" />
      {/* rolled note */}
      <g transform="rotate(-9 95 250)">
        <rect x="80" y="170" width="30" height="130" rx="6" fill="url(#gb-paper)" stroke="#c9ad83" strokeWidth="1" />
        <path d="M95 232 c-6 -8 -16 -2 -10 6 c4 5 10 9 10 9 c0 0 6 -4 10 -9 c6 -8 -4 -14 -10 -6 z" fill="none" stroke="#8a6a1e" strokeWidth="1.6" />
        <path d="M86 196 h18 M86 206 h14 M86 258 h18 M86 268 h12" stroke="#b8946a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      </g>
      {/* fairy-light wire */}
      <path d="M90 140 c-20 20 20 40 -4 62 c-20 20 22 36 -2 58 c-18 18 20 34 -4 58 c-14 14 18 26 2 42" stroke="#caa36a" strokeWidth="1" fill="none" opacity="0.5" />
      {/* lights */}
      {lights.map(([x, y, r], i) => (
        <g key={i} className={animated ? "animate-twinkle motion-reduce:animate-none" : undefined} style={animated ? { animationDelay: `${(i * 370) % 3200}ms`, transformOrigin: `${x}px ${y}px` } : undefined}>
          <circle cx={x} cy={y} r={r * 3} fill="#ffd98a" opacity="0.55" filter="url(#gb-glow)" />
          <circle cx={x} cy={y} r={r} fill="#fff4d6" />
        </g>
      ))}
      {/* glass highlights and outline */}
      <path d="M68 100 h54 v18 c0 6 2 10 7 16 c10 12 18 24 18 42 v178 a22 22 0 0 1 -22 22 h-60 a22 22 0 0 1 -22 -22 v-178 c0 -18 8 -30 18 -42 c5 -6 7 -10 7 -16 z" fill="url(#gb-glass)" />
      <path d="M68 100 h54 v18 c0 6 2 10 7 16 c10 12 18 24 18 42 v178 a22 22 0 0 1 -22 22 h-60 a22 22 0 0 1 -22 -22 v-178 c0 -18 8 -30 18 -42 c5 -6 7 -10 7 -16 z" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.65" />
      <path d="M56 180 v170" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <path d="M134 190 v150" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
      {/* neck ring */}
      <rect x="64" y="96" width="62" height="7" rx="3.5" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}
