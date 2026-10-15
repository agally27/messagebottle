import { getMusicMood } from "@/lib/domain/music";
import type { MusicMoodId } from "@/lib/domain/types";

/**
 * Procedural soundtrack: a gentle, generative piece synthesised with the Web
 * Audio API from a mood's scale, chord progression and timbre. Royalty-free by
 * construction, tiny to ship, and honest about being a demonstration.
 *
 * Browser-only. Must be started from a user gesture (autoplay policy).
 */
export class ProceduralMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private running = false;
  private mood: MusicMoodId | null = null;
  private nextBeatTime = 0;
  private beat = 0;
  private muted = false;
  private volume = 0.5;

  get isPlaying() {
    return this.running;
  }

  static supported(): boolean {
    return typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
  }

  private ensureContext(): AudioContext | null {
    if (!ProceduralMusic.supported()) return null;
    if (!this.ctx) {
      const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      // A soft low-pass keeps everything warm, plus a simple feedback "reverb".
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3200;
      const delay = this.ctx.createDelay(1.5);
      delay.delayTime.value = 0.38;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.32;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.35;
      this.master.connect(filter);
      filter.connect(this.ctx.destination);
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async play(mood: MusicMoodId): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return false;
    const m = getMusicMood(mood);
    if (!m.procedural) return false;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    this.stopScheduling();
    this.mood = mood;
    this.running = true;
    this.beat = 0;
    this.nextBeatTime = ctx.currentTime + 0.05;
    const target = this.muted ? 0 : this.volume;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(target, ctx.currentTime + 2.5);
    this.schedule();
    return true;
  }

  pause() {
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    this.stopScheduling();
    this.running = false;
  }

  async resume(): Promise<boolean> {
    if (!this.mood) return false;
    return this.play(this.mood);
  }

  stop() {
    this.pause();
    this.mood = null;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master || !this.running) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime + 0.4);
  }

  /** Dip the music while narration speaks. */
  setDucked(ducked: boolean) {
    if (!this.ctx || !this.master || !this.running || this.muted) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(ducked ? this.volume * 0.35 : this.volume, this.ctx.currentTime + 0.8);
  }

  dispose() {
    this.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }

  private stopScheduling() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule() {
    const tick = () => {
      if (!this.ctx || !this.mood) return;
      const m = getMusicMood(this.mood).procedural!;
      const beatLen = 60 / m.bpm;
      // Schedule ~0.4 s ahead.
      while (this.nextBeatTime < this.ctx.currentTime + 0.4) {
        this.playBeat(this.nextBeatTime, this.beat, m);
        this.nextBeatTime += beatLen;
        this.beat += 1;
      }
    };
    tick();
    this.timer = window.setInterval(tick, 120);
  }

  private midiToHz(n: number) {
    return 440 * 2 ** ((n - 69) / 12);
  }

  private chordNotes(m: NonNullable<ReturnType<typeof getMusicMood>["procedural"]>, bar: number): number[] {
    const degree = m.progression[bar % m.progression.length]!;
    const scale = m.scale;
    const pick = (i: number) => {
      const idx = degree + i;
      const octave = Math.floor(idx / scale.length);
      return m.root + scale[idx % scale.length]! + octave * 12;
    };
    return [pick(0), pick(2), pick(4), pick(6)];
  }

  private playBeat(time: number, beat: number, m: NonNullable<ReturnType<typeof getMusicMood>["procedural"]>) {
    const beatsPerBar = 4;
    const bar = Math.floor(beat / beatsPerBar);
    const inBar = beat % beatsPerBar;
    const chord = this.chordNotes(m, bar);
    const beatLen = 60 / m.bpm;
    // Seeded-ish variation from the beat index so it never repeats exactly.
    const r = (k: number) => {
      const x = Math.sin((beat + 1) * 12.9898 + k * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    if (inBar === 0) {
      // Bass / root, long.
      this.voice(this.midiToHz(chord[0]! - 12), time, beatLen * beatsPerBar * 0.98, 0.16, m.voice === "pluck" ? "triangle" : "sine", 0.6);
      if (m.voice === "pad") {
        for (const n of chord.slice(0, 3)) this.voice(this.midiToHz(n), time, beatLen * beatsPerBar, 0.07, "sawtooth", 1.4);
      }
    }
    if (m.arpeggio > 0) {
      const sub = m.voice === "pluck" ? 2 : 1; // pluck: eighth notes
      for (let s = 0; s < sub; s++) {
        if (r(s) > m.arpeggio + 0.05) continue;
        const idx = (inBar * sub + s + (bar % 2)) % chord.length;
        const note = chord[idx]! + (r(s + 3) > 0.7 ? 12 : 0);
        const t = time + (s * beatLen) / sub;
        const dur = m.voice === "bell" ? beatLen * 2.5 : beatLen * (0.9 + r(s + 7) * 0.6);
        const type: OscillatorType = m.voice === "piano" ? "triangle" : m.voice === "bell" ? "sine" : m.voice === "pluck" ? "square" : "triangle";
        this.voice(this.midiToHz(note), t, dur, m.voice === "pluck" ? 0.07 : 0.11, type, m.voice === "pad" ? 0.8 : 0.015, m.voice === "bell");
      }
    }
    // Occasional high sparkle.
    if (inBar === 2 && r(11) > 0.55) {
      this.voice(this.midiToHz(chord[3]! + 12), time + beatLen * 0.5, beatLen * 1.5, 0.035, "sine", 0.02, true);
    }
  }

  private voice(freq: number, time: number, duration: number, gain: number, type: OscillatorType, attack: number, bell = false) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + Math.max(0.005, attack));
    const release = bell ? duration : duration * 0.7;
    g.gain.exponentialRampToValueAtTime(0.0001, time + attack + release);
    osc.connect(g);
    g.connect(this.master);
    if (bell) {
      // Add a soft inharmonic partial for a bell-like shimmer.
      const partial = this.ctx.createOscillator();
      partial.type = "sine";
      partial.frequency.value = freq * 2.76;
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(0.0001, time);
      pg.gain.exponentialRampToValueAtTime(gain * 0.25, time + 0.01);
      pg.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.5);
      partial.connect(pg);
      pg.connect(this.master);
      partial.start(time);
      partial.stop(time + duration + 0.1);
    }
    osc.start(time);
    osc.stop(time + attack + release + 0.1);
  }
}
