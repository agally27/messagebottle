import type { SceneArtSpec, Motif, TimeOfDay } from "@/lib/domain/types";
import { getTheme, type Theme } from "@/lib/domain/themes";
import { createRng } from "@/lib/utils/random";
import { cn } from "@/lib/utils/cn";

/**
 * Procedural scene illustration. Pure SVG, deterministic from the spec, so the
 * same scene looks identical for the sender and the recipient, on every device,
 * with no image provider and no network. Styles vary by theme:
 * storybook (soft shapes), cinematic (dusk + bokeh), watercolour (blurred
 * washes), minimal (ink lines), ocean (moonlit water), keepsake (sepia vignette).
 */

const W = 1200;
const H = 800;

interface Ctx {
  theme: Theme;
  rng: ReturnType<typeof createRng>;
  time: TimeOfDay;
  motif: Motif;
  uid: string;
}

function wavePath(y: number, amp: number, wavelength: number, phase: number, steps = 24): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (W / steps) * i;
    const yy = y + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amp;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`);
  }
  return `${pts.join(" ")} L${W} ${H} L0 ${H} Z`;
}

function hillPath(baseY: number, height: number, rng: Ctx["rng"], bumps = 3): string {
  const pts: Array<[number, number]> = [[0, baseY - rng.range(0, height * 0.4)]];
  for (let i = 1; i < bumps; i++) {
    pts.push([(W / bumps) * i + rng.range(-60, 60), baseY - rng.range(height * 0.2, height)]);
  }
  pts.push([W, baseY - rng.range(0, height * 0.5)]);
  let d = `M0 ${H} L${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const cx = (x0 + x1) / 2;
    d += ` Q${cx} ${Math.min(y0, y1) - 30} ${x1} ${y1}`;
  }
  return `${d} L${W} ${H} Z`;
}

function Sky({ ctx }: { ctx: Ctx }) {
  const { theme, time, rng, uid } = ctx;
  const p = theme.palette;
  const isDark = theme.mode === "dark" || time === "night";
  const stars = time === "night" || time === "dusk" ? (isDark ? 70 : 18) : 0;
  const sunX = rng.range(W * 0.2, W * 0.8);
  const sunY = time === "dawn" || time === "dusk" ? rng.range(H * 0.42, H * 0.5) : rng.range(H * 0.14, H * 0.28);
  const showSun = time === "dawn" || time === "day";
  const showMoon = time === "dusk" || time === "night";
  return (
    <g>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      {Array.from({ length: stars }).map((_, i) => {
        const x = rng.range(0, W);
        const y = rng.range(0, H * 0.55);
        const r = rng.range(0.8, 2.6);
        return <circle key={i} cx={x} cy={y} r={r} fill={p.paper} opacity={rng.range(0.35, 0.95)} />;
      })}
      {showSun ? (
        <g>
          <circle cx={sunX} cy={sunY} r={120} fill={p.accent} opacity={0.18} />
          <circle cx={sunX} cy={sunY} r={64} fill={p.accent} opacity={0.9} />
        </g>
      ) : null}
      {showMoon ? (
        <g>
          <circle cx={sunX} cy={sunY} r={110} fill={p.paper} opacity={0.08} />
          <circle cx={sunX} cy={sunY} r={46} fill={p.paper} opacity={0.92} />
          <circle cx={sunX + 18} cy={sunY - 10} r={38} fill={`url(#${uid}-sky)`} opacity={time === "dusk" ? 0 : 0.35} />
        </g>
      ) : null}
    </g>
  );
}

function Water({ ctx, y = H * 0.6 }: { ctx: Ctx; y?: number }) {
  const { theme, rng, uid } = ctx;
  const p = theme.palette;
  const layers = 4;
  return (
    <g>
      {Array.from({ length: layers }).map((_, i) => {
        const t = i / (layers - 1);
        const yy = y + t * (H - y) * 0.75;
        return (
          <path
            key={i}
            d={wavePath(yy, 10 + i * 6, 260 + i * 90, rng.range(0, Math.PI * 2))}
            fill={i % 2 === 0 ? p.bg2 : p.accent2}
            opacity={0.35 + t * 0.4}
            filter={theme.id === "watercolour" ? `url(#${uid}-soft)` : undefined}
          />
        );
      })}
      {/* light path on the water */}
      <path d={`M${W * 0.5 - 40} ${y} L${W * 0.5 + 40} ${y} L${W * 0.5 + 170} ${H} L${W * 0.5 - 170} ${H} Z`} fill={p.accent} opacity={0.12} />
      {Array.from({ length: 14 }).map((_, i) => (
        <ellipse key={i} cx={W * 0.5 + rng.range(-150, 150)} cy={y + rng.range(10, H - y - 10)} rx={rng.range(8, 50)} ry={rng.range(1.2, 3)} fill={p.accent} opacity={rng.range(0.15, 0.5)} />
      ))}
    </g>
  );
}

function Land({ ctx }: { ctx: Ctx }) {
  const { theme, rng, uid } = ctx;
  const p = theme.palette;
  return (
    <g>
      <path d={hillPath(H * 0.78, 160, rng, 4)} fill={p.accent2} opacity={0.55} filter={theme.id === "watercolour" ? `url(#${uid}-soft)` : undefined} />
      <path d={hillPath(H * 0.88, 120, rng, 3)} fill={p.bg2} opacity={0.9} />
    </g>
  );
}

function Bottle({ ctx, x, y, scale = 1 }: { ctx: Ctx; x: number; y: number; scale?: number }) {
  const p = ctx.theme.palette;
  const stroke = ctx.theme.mode === "dark" ? p.paper : p.ink;
  return (
    <g transform={`translate(${x} ${y}) rotate(-14) scale(${scale})`}>
      <path d="M-22 -70h44v16c0 5 2 9 5 13 12 14 22 30 22 50v100a19 19 0 0 1-19 19h-60a19 19 0 0 1-19-19V9c0-20 10-36 22-50 3-4 5-8 5-13z" fill={p.paper} opacity={ctx.theme.mode === "dark" ? 0.22 : 0.55} stroke={stroke} strokeWidth={3} />
      <rect x={-20} y={-82} width={40} height={14} rx={3} fill={p.accent} opacity={0.95} />
      <rect x={-14} y={0} width={28} height={64} rx={5} fill={p.paper} stroke={p.accent} strokeWidth={2} transform="rotate(-8)" />
      <path d="M-30 40c10 -8 20 -8 30 0s20 8 30 0" stroke={stroke} strokeWidth={2.5} opacity={0.5} fill="none" strokeLinecap="round" />
      <path d="M-30 70c10 -8 20 -8 30 0s20 8 30 0" stroke={stroke} strokeWidth={2.5} opacity={0.3} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Lantern({ ctx, x, y }: { ctx: Ctx; x: number; y: number }) {
  const p = ctx.theme.palette;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={150} fill={p.accent} opacity={0.14} />
      <circle r={80} fill={p.accent} opacity={0.18} />
      <path d="M-26 -40h52l-10 90h-32z" fill={p.accent} opacity={0.9} />
      <path d="M-18 -40h36l-6 -24h-24z" fill={p.ink} opacity={0.75} />
      <rect x={-18} y={50} width={36} height={8} rx={2} fill={p.ink} opacity={0.75} />
      <path d="M0 -64v-30" stroke={p.ink} strokeWidth={2} opacity={0.6} />
    </g>
  );
}

function Tree({ ctx, x, y, scale = 1 }: { ctx: Ctx; x: number; y: number; scale?: number }) {
  const p = ctx.theme.palette;
  const { rng } = ctx;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-8 0c0-60 -4-120 6-180c6 50 6 110 2 180z" fill={p.ink} opacity={0.75} />
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx={rng.range(-120, 120)} cy={rng.range(-280, -140)} r={rng.range(40, 85)} fill={i % 3 === 0 ? p.accent2 : p.accent} opacity={0.75} />
      ))}
    </g>
  );
}

function Boat({ ctx, x, y }: { ctx: Ctx; x: number; y: number }) {
  const p = ctx.theme.palette;
  const stroke = ctx.theme.mode === "dark" ? p.paper : p.ink;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-70 0h140l-24 30h-92z" fill={p.ink} opacity={0.85} />
      <path d="M0 -4v-120" stroke={stroke} strokeWidth={3} />
      <path d="M4 -120l70 100h-70z" fill={p.paper} opacity={0.9} />
      <path d="M-4 -110l-50 90h50z" fill={p.accent} opacity={0.85} />
    </g>
  );
}

function Window({ ctx }: { ctx: Ctx }) {
  const p = ctx.theme.palette;
  return (
    <g>
      <rect width={W} height={H} fill={p.ink} opacity={0.55} />
      <g transform={`translate(${W * 0.5 - 200} ${H * 0.14})`}>
        {/* warm spill of light on the wall and floor */}
        <ellipse cx={200} cy={540} rx={320} ry={60} fill={p.accent} opacity={0.22} />
        <rect x={-40} y={-30} width={480} height={600} rx={30} fill={p.accent} opacity={0.08} />
        {/* arched frame */}
        <path d="M0 200 A200 200 0 0 1 400 200 V520 H0 Z" fill={`url(#${ctx.uid}-sky)`} />
        <path d="M0 200 A200 200 0 0 1 400 200 V520 H0 Z" fill="none" stroke={p.paper} strokeWidth={12} opacity={0.95} />
        <path d="M200 0 V520 M0 260 H400 M0 390 H400" stroke={p.paper} strokeWidth={8} opacity={0.9} />
        {/* sill */}
        <rect x={-24} y={516} width={448} height={22} rx={6} fill={p.paper} opacity={0.95} />
        {/* a small plant on the sill */}
        <path d="M330 516 v-50 M330 480 c-20 -8 -30 -30 -24 -46 c16 6 26 24 24 46 M330 494 c20 -10 32 -30 26 -48 c-16 8 -28 26 -26 48" stroke={p.accent2} strokeWidth={5} fill="none" strokeLinecap="round" />
        <rect x={312} y={496} width={36} height={22} rx={4} fill={p.accent} opacity={0.9} />
      </g>
    </g>
  );
}

function PathToHorizon({ ctx }: { ctx: Ctx }) {
  const p = ctx.theme.palette;
  return (
    <g>
      <path d={`M${W * 0.5 - 14} ${H * 0.62} Q${W * 0.6} ${H * 0.8} ${W * 0.28} ${H} L${W * 0.74} ${H} Q${W * 0.56} ${H * 0.8} ${W * 0.5 + 14} ${H * 0.62} Z`} fill={p.paper} opacity={0.7} />
      {Array.from({ length: 7 }).map((_, i) => {
        const t = i / 6;
        const y = H * 0.64 + t * H * 0.34;
        const w = 30 + t * 140;
        return <ellipse key={i} cx={W * 0.5 + Math.sin(t * 3) * 40 * t} cy={y} rx={w * 0.35} ry={3 + t * 4} fill={p.ink} opacity={0.12} />;
      })}
    </g>
  );
}

function Letter({ ctx, x, y }: { ctx: Ctx; x: number; y: number }) {
  const p = ctx.theme.palette;
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`}>
      <rect x={-130} y={-90} width={260} height={180} rx={10} fill={p.paper} stroke={p.accent} strokeWidth={3} />
      <path d="M-130 -90l130 100l130 -100" fill="none" stroke={p.accent} strokeWidth={3} />
      <circle cx={0} cy={12} r={16} fill={p.accent} />
      <path d="M-100 40h60M-100 60h120" stroke={p.inkMuted} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    </g>
  );
}

function Garden({ ctx }: { ctx: Ctx }) {
  const p = ctx.theme.palette;
  const { rng } = ctx;
  return (
    <g>
      {Array.from({ length: 26 }).map((_, i) => {
        const x = rng.range(-20, W + 20);
        const h = rng.range(120, 320);
        const lean = rng.range(-40, 40);
        return (
          <g key={i} transform={`translate(${x} ${H})`}>
            <path d={`M0 0 Q${lean} ${-h / 2} ${lean * 1.3} ${-h}`} stroke={p.accent2} strokeWidth={rng.range(3, 6)} fill="none" opacity={0.75} />
            <circle cx={lean * 1.3} cy={-h} r={rng.range(10, 24)} fill={rng.chance(0.5) ? p.accent : p.paper} opacity={0.9} />
          </g>
        );
      })}
    </g>
  );
}

function Mountains({ ctx }: { ctx: Ctx }) {
  const p = ctx.theme.palette;
  const { rng } = ctx;
  return (
    <g>
      {[0.35, 0.5, 0.65].map((o, i) => {
        let d = `M0 ${H}`;
        const n = 5 + i;
        for (let k = 0; k <= n; k++) {
          const x = (W / n) * k;
          const y = H * (0.42 + i * 0.1) - rng.range(0, 150);
          d += ` L${x} ${k % 2 === 0 ? y : y + 120}`;
        }
        d += ` L${W} ${H} Z`;
        return <path key={i} d={d} fill={i === 2 ? p.bg2 : p.accent2} opacity={o} />;
      })}
    </g>
  );
}

function City({ ctx }: { ctx: Ctx }) {
  const p = ctx.theme.palette;
  const { rng } = ctx;
  let x = -20;
  const buildings: Array<{ x: number; w: number; h: number }> = [];
  while (x < W + 20) {
    const w = rng.range(40, 110);
    buildings.push({ x, w, h: rng.range(120, 360) });
    x += w + rng.range(4, 18);
  }
  return (
    <g>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={H * 0.78 - b.h} width={b.w} height={b.h} fill={p.ink} opacity={0.8} />
          {Array.from({ length: Math.floor(b.h / 40) }).map((_, j) => (
            <rect key={j} x={b.x + 10 + (j % 2) * (b.w / 2 - 10)} y={H * 0.78 - b.h + 18 + j * 36} width={10} height={14} fill={p.accent} opacity={rng.chance(0.6) ? 0.9 : 0.15} />
          ))}
        </g>
      ))}
    </g>
  );
}

function Bokeh({ ctx }: { ctx: Ctx }) {
  const p = ctx.theme.palette;
  const { rng } = ctx;
  return (
    <g>
      {Array.from({ length: 18 }).map((_, i) => (
        <circle key={i} cx={rng.range(0, W)} cy={rng.range(0, H)} r={rng.range(6, 40)} fill={rng.chance(0.6) ? p.accent : p.accent2} opacity={rng.range(0.08, 0.3)} filter={`url(#${ctx.uid}-soft)`} />
      ))}
    </g>
  );
}

function Grain({ ctx }: { ctx: Ctx }) {
  return <rect width={W} height={H} filter={`url(#${ctx.uid}-grain)`} opacity={ctx.theme.id === "minimal" ? 0.1 : 0.16} style={{ mixBlendMode: "multiply" }} />;
}

function Vignette({ ctx }: { ctx: Ctx }) {
  return <rect width={W} height={H} fill={`url(#${ctx.uid}-vignette)`} />;
}

function MotifLayer({ ctx }: { ctx: Ctx }) {
  const { motif, rng } = ctx;
  switch (motif) {
    case "shore":
      return (
        <>
          <Water ctx={ctx} y={H * 0.58} />
          <path d={wavePath(H * 0.86, 12, 500, 1.2)} fill={ctx.theme.palette.bg2} opacity={0.95} />
        </>
      );
    case "bottle":
      return (
        <>
          <Water ctx={ctx} y={H * 0.56} />
          <Bottle ctx={ctx} x={W * 0.5} y={H * 0.68} scale={1.2} />
        </>
      );
    case "lantern":
      return (
        <>
          <Water ctx={ctx} y={H * 0.62} />
          <Lantern ctx={ctx} x={W * rng.range(0.35, 0.65)} y={H * 0.42} />
        </>
      );
    case "stars":
      return <Water ctx={ctx} y={H * 0.7} />;
    case "window":
      return <Window ctx={ctx} />;
    case "path":
      return (
        <>
          <Land ctx={ctx} />
          <PathToHorizon ctx={ctx} />
        </>
      );
    case "tree":
      return (
        <>
          <Land ctx={ctx} />
          <Tree ctx={ctx} x={W * rng.range(0.3, 0.7)} y={H * 0.8} />
        </>
      );
    case "letter":
      return (
        <>
          <Water ctx={ctx} y={H * 0.64} />
          <Letter ctx={ctx} x={W * 0.5} y={H * 0.42} />
        </>
      );
    case "boat":
      return (
        <>
          <Water ctx={ctx} y={H * 0.6} />
          <Boat ctx={ctx} x={W * rng.range(0.35, 0.65)} y={H * 0.66} />
        </>
      );
    case "garden":
      return (
        <>
          <Land ctx={ctx} />
          <Garden ctx={ctx} />
        </>
      );
    case "mountains":
      return (
        <>
          <Mountains ctx={ctx} />
          <Water ctx={ctx} y={H * 0.78} />
        </>
      );
    case "city":
      return (
        <>
          <City ctx={ctx} />
          <Water ctx={ctx} y={H * 0.78} />
        </>
      );
  }
}

export function SceneArt({ spec, alt, className }: { spec: SceneArtSpec; alt?: string; className?: string }) {
  const theme = getTheme(spec.theme);
  const rng = createRng(spec.seed);
  const uid = `s${(spec.seed >>> 0).toString(36)}${spec.theme.slice(0, 2)}${spec.motif.slice(0, 2)}`;
  const ctx: Ctx = { theme, rng, time: spec.timeOfDay, motif: spec.motif, uid };
  const p = theme.palette;
  const skyTop = spec.timeOfDay === "night" ? p.bg : spec.timeOfDay === "dawn" ? p.accent2 : p.bg;
  const skyBottom = spec.timeOfDay === "dusk" || spec.timeOfDay === "dawn" ? p.accent : p.bg2;
  const decorative = alt === "";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-full w-full", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (alt ?? "Illustrated scene")}
      focusable="false"
    >
      {decorative ? null : <title>{alt ?? "Illustrated scene"}</title>}
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} stopOpacity={0.85} />
        </linearGradient>
        <radialGradient id={`${uid}-vignette`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor={p.ink} stopOpacity="0" />
          <stop offset="1" stopColor={p.ink} stopOpacity={theme.mode === "dark" ? 0.5 : 0.22} />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={theme.id === "watercolour" ? 14 : 8} />
        </filter>
        <filter id={`${uid}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={spec.seed % 100} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <Sky ctx={ctx} />
      <MotifLayer ctx={ctx} />
      {theme.id === "cinematic" || theme.id === "ocean" ? <Bokeh ctx={ctx} /> : null}
      <Vignette ctx={ctx} />
      <Grain ctx={ctx} />
    </svg>
  );
}
