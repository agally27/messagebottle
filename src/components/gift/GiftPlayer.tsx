"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SceneArt } from "@/components/art/SceneArt";
import { getTheme } from "@/lib/domain/themes";
import type { PublicGift, PublicScene } from "@/lib/domain/types";
import { ProceduralMusic } from "@/lib/audio/procedural-music";
import { DeviceNarrator } from "@/lib/audio/narration";
import { cn } from "@/lib/utils/cn";
import { StoryText } from "./StoryText";
import { BottleMark } from "@/components/ui/Logo";
import { GlowingBottle } from "@/components/art/GlowingBottle";
import { ReplyForm } from "./ReplyForm";

type Stage = "closed" | "opening" | "message" | "scene" | "photos" | "song" | "closing" | "keepsake";
type Phase = "closed" | "opening" | "story" | "keepsake";
type Step = { kind: "message" } | { kind: "scene"; index: number } | { kind: "photos" } | { kind: "song" } | { kind: "closing" };

interface Props {
  gift: PublicGift;
  /** Sender preview: shows a small "preview" label and never records anything. */
  preview?: boolean;
  /** Start straight on the story for editors/tests. */
  startOpen?: boolean;
  /** Fill the parent instead of the viewport (sender's preview card). */
  embedded?: boolean;
  /** Small element shown in the top bar (e.g. "Back to editing", "This is an example"). */
  banner?: React.ReactNode;
  className?: string;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/**
 * The recipient experience. Stages: closed bottle → opening animation →
 * personal opening message → scenes → photos → their song → closing →
 * keepsake. Audio starts only after the recipient taps "Open", respecting
 * autoplay policies. A linked song loads the music service's player only
 * after the recipient taps to play it.
 */
export function GiftPlayer({ gift, preview, startOpen, embedded, banner, className }: Props) {
  const theme = getTheme(gift.theme);
  const dark = theme.mode === "dark";
  const reduced = useReducedMotion();
  const scenes = useMemo(() => [...gift.story.scenes].sort((a, b) => a.order - b.order), [gift.story.scenes]);
  const photos = useMemo(() => byYear(gift.photos), [gift.photos]);
  const steps = useMemo<Step[]>(
    () => [
      { kind: "message" },
      ...scenes.map((_, index) => ({ kind: "scene" as const, index })),
      ...(photos.length ? [{ kind: "photos" as const }] : []),
      ...(gift.song ? [{ kind: "song" as const }] : []),
      { kind: "closing" },
    ],
    [scenes, photos.length, gift.song],
  );
  const [phase, setPhase] = useState<Phase>(startOpen ? "story" : "closed");
  const [stepIndex, setStepIndex] = useState(0);
  const [songOpen, setSongOpen] = useState(false);
  const step: Step = steps[Math.min(stepIndex, steps.length - 1)] ?? { kind: "message" };
  const stage: Stage = phase === "story" ? step.kind : phase;
  const sceneIndex = step.kind === "scene" ? step.index : 0;
  const [musicOn, setMusicOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const musicRef = useRef<ProceduralMusic | null>(null);
  const narratorRef = useRef<DeviceNarrator | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const music = gift.audio.find((a) => a.kind === "music");
  const narrationAsset = gift.audio.find((a) => a.kind === "narration");
  const hasMusic = Boolean(music);
  const narrationAvailable = gift.narrationEnabled && (Boolean(narrationAsset) || DeviceNarrator.supported());

  useEffect(() => {
    return () => {
      musicRef.current?.dispose();
      narratorRef.current?.cancel();
    };
  }, []);

  const startMusic = useCallback(async () => {
    if (!music) return;
    if (music.source.type === "procedural") {
      musicRef.current ??= new ProceduralMusic();
      const ok = await musicRef.current.play(music.source.mood);
      setMusicOn(ok);
      if (!ok) setAudioFailed(true);
    }
    // A stored URL track would be handled by an <audio> element here (M5).
  }, [music]);

  const open = async () => {
    setPhase("opening");
    if (!preview && gift.token !== "example") {
      void fetch(`/api/g/${gift.token}/open`, { method: "POST", keepalive: true }).catch(() => undefined);
    }
    if (hasMusic && !muted) await startMusic();
    window.setTimeout(() => setPhase("story"), reduced ? 300 : 2400);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    musicRef.current?.setMuted(next);
    if (next) {
      narratorRef.current?.cancel();
      setNarrating(false);
    }
  };

  const togglePause = async () => {
    if (!musicRef.current) {
      await startMusic();
      return;
    }
    if (musicOn) {
      musicRef.current.pause();
      setMusicOn(false);
    } else {
      setMusicOn(await musicRef.current.resume());
    }
  };

  const currentText = (): string => {
    if (stage === "message") return `${gift.story.title}. ${gift.story.opening}`;
    if (stage === "scene") return `${scenes[sceneIndex]?.heading ?? ""}. ${scenes[sceneIndex]?.text ?? ""}`;
    if (stage === "photos") return photos.map((p) => [p.year, p.caption].filter(Boolean).join(", ")).filter(Boolean).join(". ");
    if (stage === "closing") return gift.story.closing;
    return "";
  };

  const narrate = () => {
    if (narrating) {
      narratorRef.current?.cancel();
      musicRef.current?.setDucked(false);
      setNarrating(false);
      return;
    }
    narratorRef.current ??= new DeviceNarrator();
    musicRef.current?.setDucked(true);
    const ok = narratorRef.current.speak(currentText().replace(/\n+/g, ". "), () => {
      setNarrating(false);
      musicRef.current?.setDucked(false);
    });
    setNarrating(ok);
  };

  const stopNarration = () => {
    narratorRef.current?.cancel();
    musicRef.current?.setDucked(false);
    setNarrating(false);
  };

  const goNext = () => {
    stopNarration();
    if (phase !== "story") return;
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else setPhase("keepsake");
    liveRef.current?.focus();
  };

  const goBack = () => {
    stopNarration();
    if (phase === "keepsake") {
      setStepIndex(steps.length - 1);
      setPhase("story");
    } else if (phase === "story" && stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  const replay = () => {
    stopNarration();
    setStepIndex(0);
    setPhase("story");
  };

  /** The recipient chose to hear the real song: quieten our own music first. */
  const playSong = () => {
    stopNarration();
    if (musicRef.current && musicOn) {
      musicRef.current.pause();
      setMusicOn(false);
    }
    setSongOpen(true);
  };

  useEffect(() => {
    if (stage === "closed" || stage === "opening") return;
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys move between parts, except while typing (e.g. a reply).
      if (e.target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable)) return;
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  const total = steps.length;
  const position = phase === "story" ? stepIndex : phase === "keepsake" ? total : 0;
  const inMemory = gift.inMemoryOf ? [gift.inMemoryOf.name, gift.inMemoryOf.dates].filter(Boolean).join(", ") : "";
  const scene: PublicScene | undefined = stage === "scene" ? scenes[sceneIndex] : undefined;
  const heroSpec = scenes[0]?.art.kind === "procedural" ? scenes[0].art.spec : { theme: gift.theme, motif: "bottle" as const, timeOfDay: "night" as const, seed: 1 };

  const textColor = dark ? "text-text-on-dark" : "text-ink";
  const mutedColor = dark ? "text-text-on-dark-muted" : "text-text-muted";

  return (
    <div className={cn("relative flex flex-col overflow-hidden", embedded ? "h-full min-h-[480px] overflow-y-auto" : "min-h-dvh", className)} style={{ backgroundColor: theme.palette.bg, color: dark ? theme.palette.paper : theme.palette.ink }} data-stage={stage}>
      {/* Background art */}
      <div className="absolute inset-0" aria-hidden>
        {scene && scene.art.kind === "procedural" ? (
          <SceneArt key={scene.id} spec={scene.art.spec} alt="" className={cn("animate-fade-in", !reduced && "animate-drift scale-[1.06]")} />
        ) : scene && scene.art.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={scene.id} src={scene.art.url} alt="" className={cn("h-full w-full object-cover animate-fade-in", !reduced && "animate-drift scale-[1.06]")} />
        ) : (
          <SceneArt spec={{ ...heroSpec, motif: stage === "keepsake" ? "bottle" : heroSpec.motif }} alt="" className={cn(!reduced && "animate-drift scale-[1.06]", stage === "closed" && "opacity-90")} />
        )}
        <div className={cn("absolute inset-0", dark ? "bg-gradient-to-t from-black/60 via-black/15 to-black/20" : "bg-gradient-to-t from-white/70 via-white/10 to-white/20")} />
      </div>

      {/* drifting fairy lights */}
      {dark && !reduced && (stage === "closed" || stage === "opening" || stage === "keepsake") ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute bottom-[-4%] block rounded-full bg-glow animate-rise"
              style={{ left: `${(i * 67) % 100}%`, width: `${3 + (i % 3) * 2}px`, height: `${3 + (i % 3) * 2}px`, animationDelay: `${(i * 1.7) % 14}s`, animationDuration: `${12 + (i % 5) * 2}s`, boxShadow: "0 0 12px 3px rgb(255 217 138 / 0.55)", opacity: 0 }}
            />
          ))}
        </div>
      ) : null}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className={cn("flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]", mutedColor)}>
          <BottleMark className="h-5 shrink-0" />
          <span className={cn("truncate", banner ? "hidden sm:inline" : null)}>Message in a Bottle</span>
          {preview ? <span className="ml-2 shrink-0 rounded-full bg-gold px-2 py-0.5 text-[0.6rem] text-ink">Preview</span> : null}
        </div>
        {banner ? <div className="min-w-0 shrink">{banner}</div> : null}
        {stage !== "closed" && stage !== "opening" ? (
          <div className="flex items-center gap-1.5">
            {hasMusic ? (
              <>
                <IconButton label={musicOn ? "Pause music" : "Play music"} onClick={() => void togglePause()} dark={dark}>
                  {musicOn ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
                <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute} dark={dark} pressed={muted}>
                  {muted ? <MutedIcon /> : <SoundIcon />}
                </IconButton>
              </>
            ) : null}
            {narrationAvailable && (stage === "message" || stage === "scene" || stage === "closing") ? (
              <IconButton label={narrating ? "Stop reading aloud" : "Read aloud"} onClick={narrate} dark={dark} pressed={narrating}>
                <VoiceIcon />
              </IconButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8" ref={liveRef} tabIndex={-1} aria-live="polite">
        {stage === "closed" ? (
          <div className={cn("relative max-w-md rounded-3xl px-6 py-8 text-center backdrop-blur-md animate-fade-up sm:px-10", dark ? "bg-black/30 ring-1 ring-white/10" : "bg-white/55 ring-1 ring-black/5")}>
            <div className="relative mx-auto h-36 w-36">
              <div className="absolute inset-0 rounded-full halo blur-md" aria-hidden />
              <GlowingBottle festive={gift.occasion === "christmas"} className={cn("relative mx-auto h-36 w-auto", !reduced && "animate-float")} animated={!reduced} />
            </div>
            <p className={cn("mt-6 text-xs font-semibold uppercase tracking-[0.2em]", mutedColor)}>For {gift.recipientName}</p>
            {inMemory ? <p className={cn("mt-2 font-display text-base italic", mutedColor)}>In loving memory of {inMemory}</p> : null}
            <h1 className={cn("mt-3 font-display text-4xl leading-tight sm:text-5xl", textColor)}>Someone has a message for you.</h1>
            <p className={cn("mt-4", mutedColor)}>
              A story in {scenes.length} scenes{photos.length ? `, ${photos.length} ${photos.length === 1 ? "photo" : "photos"}` : ""}{hasMusic || gift.song ? ", with music" : ""}. From {gift.senderName}. About {Math.max(2, Math.ceil(total * 0.6))} minutes.
            </p>
            <button type="button" onClick={() => void open()} className={cn("mt-8 inline-flex h-14 items-center justify-center rounded-full px-8 text-base font-semibold shadow-lift transition-transform active:scale-[0.98]", dark ? "bg-paper text-ink" : "bg-ink text-text-on-dark")} style={dark ? { backgroundColor: theme.palette.paper, color: theme.palette.bg } : undefined}>
              Open the bottle
            </button>
            {hasMusic ? <p className={cn("mt-4 text-xs", mutedColor)}>Sound on for the full experience. You can mute at any time.</p> : null}
          </div>
        ) : null}

        {stage === "opening" ? (
          <div className="text-center" aria-label="Opening">
            <GlowingBottle festive={gift.occasion === "christmas"} className={cn("mx-auto h-40 w-auto", !reduced && "animate-[uncork_2.2s_var(--ease-in-out-soft)_both]")} animated={!reduced} />
            <p className={cn("mt-6 font-display text-2xl italic animate-fade-in", mutedColor)} style={{ animationDelay: "900ms" }}>
              The cork gives way…
            </p>
          </div>
        ) : null}

        {stage === "message" ? (
          <Card dark={dark} theme={theme} key="message">
            <p className="eyebrow" style={{ color: theme.palette.accent2 }}>For {gift.recipientName}</p>
            <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{gift.story.title}</h1>
            <StoryText text={gift.story.opening} className="mt-5 text-[1.08rem] leading-relaxed" />
          </Card>
        ) : null}

        {stage === "scene" && scene ? (
          <Card dark={dark} theme={theme} key={scene.id}>
            {scene.heading ? (
              <p className="eyebrow" style={{ color: theme.palette.accent2 }}>
                {scene.heading}
              </p>
            ) : (
              <p className="eyebrow" style={{ color: theme.palette.accent2 }}>
                {sceneIndex + 1} of {scenes.length}
              </p>
            )}
            <StoryText text={scene.text} className={cn("mt-4 text-[1.1rem] leading-relaxed sm:text-[1.2rem]", theme.typography !== "sans" && "font-display")} verse />
          </Card>
        ) : null}

        {stage === "photos" ? (
          <Card dark={dark} theme={theme} key="photos" wide>
            <p className="eyebrow" style={{ color: theme.palette.accent2 }}>
              {inMemory ? "Remembering" : photos.some((p) => p.year) ? "Then and now" : "Moments kept"}
            </p>
            <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">{photos.length === 1 ? "A moment worth keeping" : "Moments worth keeping"}</h2>
            <ol className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5" aria-label="Photos">
              {photos.map((p, i) => (
                <li key={p.id} className={cn("rounded-sm bg-white p-2 pb-3 text-ink shadow-soft ring-1 ring-black/5", !reduced && "transition-transform hover:rotate-0", (i % 3 === 0 ? "-rotate-2" : i % 3 === 1 ? "rotate-1" : "-rotate-1"))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption || `Photo ${i + 1}${p.year ? `, ${p.year}` : ""}`} width={p.width} height={p.height} loading="lazy" decoding="async" className="aspect-square w-full bg-sand-deep object-cover" />
                  {p.caption || p.year ? (
                    <p className="mt-2 px-1 font-hand text-lg leading-tight text-ink">
                      {p.year ? <span className="mr-1.5 font-sans text-xs font-semibold tracking-wide text-text-muted">{p.year}</span> : null}
                      {p.caption}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        {stage === "song" && gift.song ? (
          <Card dark={dark} theme={theme} key="song">
            <p className="eyebrow" style={{ color: theme.palette.accent2 }}>
              {inMemory ? "Their song" : "Our song"}
            </p>
            <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">{gift.senderName} chose a song for you</h2>
            {songOpen && gift.song.embedUrl ? (
              <iframe
                src={gift.song.embedUrl}
                title={`Song on ${gift.song.providerName}`}
                className={cn("mt-6 w-full rounded-xl border-0", gift.song.provider === "youtube" && "aspect-video")}
                style={gift.song.provider === "youtube" ? undefined : { height: embedHeight(gift.song) }}
                allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
              />
            ) : (
              <div className="mt-6 flex flex-col items-start gap-3">
                {gift.song.embedUrl ? (
                  <button type="button" onClick={playSong} className={cn("inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold shadow-soft transition-transform active:scale-[0.98]", dark ? "bg-paper text-ink" : "bg-ink text-text-on-dark")} style={dark ? { backgroundColor: theme.palette.paper, color: theme.palette.bg } : undefined}>
                    <PlayIcon /> Play it here
                  </button>
                ) : null}
                <p className={cn("text-xs", mutedColor)}>
                  {gift.song.embedUrl ? `Plays through ${gift.song.providerName}'s own player, which loads only when you tap play.` : `This song lives on ${gift.song.providerName}.`}
                </p>
              </div>
            )}
            <a href={gift.song.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
              Open in {gift.song.providerName}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Card>
        ) : null}

        {stage === "closing" ? (
          <Card dark={dark} theme={theme} key="closing">
            <p className="eyebrow" style={{ color: theme.palette.accent2 }}>
              From {gift.senderName}
            </p>
            <StoryText text={gift.story.closing} className="mt-4 font-display text-[1.15rem] leading-relaxed sm:text-[1.3rem]" verse />
          </Card>
        ) : null}

        {stage === "keepsake" ? (
          <div className="max-w-md text-center animate-fade-up" key="keepsake">
            <GlowingBottle festive={gift.occasion === "christmas"} className="mx-auto h-32 w-auto" animated={!reduced} />
            <p className={cn("mt-6 font-display text-2xl leading-snug sm:text-3xl", textColor)}>{gift.story.dedication || `For ${gift.recipientName}. From ${gift.senderName}.`}</p>
            {inMemory && !gift.story.dedication?.includes(gift.inMemoryOf?.name ?? "") ? <p className={cn("mt-3 font-display italic", mutedColor)}>In loving memory of {inMemory}</p> : null}
            <p className={cn("mt-4 text-sm", mutedColor)}>This message is yours to keep. Come back to it whenever you like.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={replay} className={cn("inline-flex h-12 items-center rounded-full border px-6 text-sm font-semibold", dark ? "border-white/30 text-text-on-dark hover:bg-white/10" : "border-ink/30 text-ink hover:bg-ink/5")}>
                Read it again
              </button>
              {gift.token !== "example" ? <ReplyForm token={gift.token} senderName={gift.senderName} dark={dark} accent={theme.palette.accent2} preview={preview} /> : null}
            </div>
            {music?.disclosure ? <p className={cn("mt-8 text-[0.7rem]", mutedColor)}>{music.disclosure}</p> : null}
          </div>
        ) : null}
      </div>

      {/* Bottom nav */}
      {phase === "story" ? (
        <div className="relative z-10 px-4 pb-5 sm:px-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <button type="button" onClick={goBack} disabled={stage === "message"} aria-label="Previous" className={cn("flex h-12 w-12 items-center justify-center rounded-full border transition-colors disabled:opacity-30", dark ? "border-white/30 text-text-on-dark hover:bg-white/10" : "border-ink/25 text-ink hover:bg-ink/5")}>
              <ChevronLeft />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="sr-only">Part {position + 1} of {total}</span>
              {Array.from({ length: total }).map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all", i === position ? "w-6" : "w-1.5", i <= position ? "opacity-100" : "opacity-35")} style={{ backgroundColor: dark ? theme.palette.paper : theme.palette.ink }} aria-hidden />
              ))}
            </div>
            <button type="button" onClick={goNext} aria-label={stage === "closing" ? "Finish" : "Next"} className={cn("flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold shadow-soft transition-transform active:scale-[0.98]", dark ? "bg-paper text-ink" : "bg-ink text-text-on-dark")} style={dark ? { backgroundColor: theme.palette.paper, color: theme.palette.bg } : undefined}>
              {stage === "closing" ? "Finish" : "Next"}
              <ChevronRight />
            </button>
          </div>
        </div>
      ) : null}

      {audioFailed ? (
        <p role="status" className={cn("relative z-10 px-4 pb-3 text-center text-xs", mutedColor)}>
          Sound couldn&apos;t start on this device. The story works just the same without it.
        </p>
      ) : null}

      <style>{`@keyframes uncork { 0% { transform: translateY(0) rotate(0deg); } 40% { transform: translateY(-6px) rotate(-6deg); } 70% { transform: translateY(-18px) rotate(8deg) scale(1.04); } 100% { transform: translateY(-40px) rotate(0deg) scale(1.1); opacity: 0.2; } }`}</style>
    </div>
  );
}

/** Photos with a year read as a timeline; undated ones keep the sender's order at the end. */
function byYear(photos: PublicGift["photos"]): PublicGift["photos"] {
  if (!photos.some((p) => p.year)) return photos;
  return photos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.year ?? Infinity) - (b.p.year ?? Infinity) || a.i - b.i)
    .map(({ p }) => p);
}

function embedHeight(song: NonNullable<PublicGift["song"]>): number {
  if (song.provider === "spotify") return /\/(track|episode)\//.test(song.embedUrl ?? "") ? 152 : 352;
  if (song.provider === "apple") return /[?&]i=|\/song\//.test(song.url) ? 175 : 450;
  return 166;
}

function Card({ children, dark, theme, wide }: { children: React.ReactNode; dark: boolean; theme: ReturnType<typeof getTheme>; wide?: boolean }) {
  return (
    <article className={cn("w-full rounded-2xl", wide ? "max-w-3xl" : "max-w-2xl", "p-6 shadow-lift backdrop-blur-md animate-fade-up sm:p-9", dark ? "bg-black/35 ring-1 ring-white/15" : "ring-1 ring-black/10")} style={{ backgroundColor: dark ? "rgba(10,14,28,0.5)" : `${theme.palette.paper}e6`, color: dark ? theme.palette.paper : theme.palette.ink }}>
      {children}
    </article>
  );
}

function IconButton({ children, label, onClick, dark, pressed }: { children: React.ReactNode; label: string; onClick: () => void; dark: boolean; pressed?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} title={label} className={cn("flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition-colors", dark ? "border-white/25 bg-black/20 text-text-on-dark hover:bg-white/15" : "border-ink/20 bg-white/50 text-ink hover:bg-white/80", pressed && (dark ? "bg-white/25" : "bg-ink/10"))}>
      {children}
    </button>
  );
}

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
const SoundIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
const MutedIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" />
  </svg>
);
const VoiceIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
