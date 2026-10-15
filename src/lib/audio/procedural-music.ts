import { getMusicMood } from "@/lib/domain/music";
import { CAROLS, type Carol } from "@/lib/domain/carols";

interface CarolEvent {
  /** Beats from the start of the song. */
  at: number;
  beats: number;
  midi: number | null;
  /** Chord tones (MIDI) to strike with this event, at bar starts. */
  chord: number[] | null;
  beatInBar: number;
}
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
    if (!m.procedural && !m.carol) return false;
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
    const carolId = this.mood ? getMusicMood(this.mood).carol : undefined;
    if (carolId) {
      this.scheduleCarol(CAROLS[carolId]);
      return;
    }
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

  /** Flattens a carol into timed events: melody notes plus chords on each bar start. */
  static carolEvents(c: Carol): { events: CarolEvent[]; lengthBeats: number } {
    const scale = [0, 2, 4, 5, 7, 9, 11];
    const triad = (degree: number) => [0, 2, 4].map((k) => {
      const idx = degree + k;
      return c.tonic - 12 + scale[idx % 7]! + Math.floor(idx / 7) * 12;
    });
    const events: CarolEvent[] = [];
    let at = 0;
    for (const [semi, beats] of c.pickup ?? []) {
      events.push({ at, beats, midi: semi === null ? null : c.tonic + semi, chord: null, beatInBar: at });
      at += beats;
    }
    for (const bar of c.bars) {
      const barStart = at;
      bar.notes.forEach(([semi, beats], i) => {
        events.push({ at, beats, midi: semi === null ? null : c.tonic + semi, chord: i === 0 && bar.chord !== null ? triad(bar.chord) : null, beatInBar: at - barStart });
        at += beats;
      });
    }
    return { events, lengthBeats: at };
  }

  private noise: AudioBuffer | null = null;

  private sleighBell(time: number, gain: number) {
    if (!this.ctx || !this.master) return;
    if (!this.noise) {
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(time);
    src.stop(time + 0.2);
  }

  private scheduleCarol(c: Carol) {
    if (!this.ctx) return;
    const { events, lengthBeats } = ProceduralMusic.carolEvents(c);
    const beatLen = 60 / c.bpm;
    const restBeats = c.beatsPerBar * 2; // a breath before the tune repeats
    let songStart = this.nextBeatTime;
    let idx = 0;
    let lastBell = -1;
    const melodyType: OscillatorType = c.voice === "pluck" ? "square" : c.voice === "piano" ? "triangle" : "sine";
    const tick = () => {
      if (!this.ctx) return;
      const horizon = this.ctx.currentTime + 0.4;
      while (true) {
        const ev = events[idx];
        if (!ev) {
          songStart += (lengthBeats + restBeats) * beatLen;
          idx = 0;
          lastBell = -1;
          continue;
        }
        const t = songStart + ev.at * beatLen;
        if (t >= horizon) break;
        if (ev.midi !== null) {
          const dur = Math.max(0.12, ev.beats * beatLen * 0.92);
          this.voice(this.midiToHz(ev.midi), t, dur, c.voice === "pluck" ? 0.075 : 0.12, melodyType, 0.01, c.voice === "bell");
        }
        if (ev.chord) {
          const barDur = c.beatsPerBar * beatLen;
          this.voice(this.midiToHz(ev.chord[0]! - 12), t, barDur * 0.95, 0.12, "sine", 0.05);
          for (const n of ev.chord) this.voice(this.midiToHz(n), t, barDur * 0.9, 0.035, "triangle", 0.12);
        }
        if (c.sleighBells) {
          // one shimmer per beat, aligned to the song's beat grid
          const beatIndex = Math.floor(ev.at);
          for (let bi = lastBell + 1; bi <= beatIndex; bi++) this.sleighBell(songStart + bi * beatLen, bi % c.beatsPerBar === 0 ? 0.05 : 0.025);
          lastBell = Math.max(lastBell, beatIndex);
        }
        idx += 1;
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
