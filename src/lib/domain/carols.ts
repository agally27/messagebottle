/**
 * Traditional carols, played in the browser by the procedural music engine,
 * with new personalised words written for the recipient.
 *
 * Only the tunes are used (all traditional / public domain: Silent Night,
 * Gruber 1818; Jingle Bells, Pierpont 1857; We Wish You a Merry Christmas,
 * traditional English; Deck the Halls, traditional Welsh). No recordings or
 * modern arrangements. The words below are our own.
 *
 * Melody notes are semitones from the tonic; null is a rest. Chords are
 * major-scale degrees (0 = I, 3 = IV, 4 = V, 5 = vi …) per bar.
 */
export type CarolId = "silent-night" | "we-wish" | "jingle-bells" | "deck-the-halls";

export type CarolNote = [semitones: number | null, beats: number];

export interface CarolBar {
  chord: number | null;
  notes: CarolNote[];
}

export interface Carol {
  id: CarolId;
  title: string;
  /** MIDI note of the tonic for the melody. */
  tonic: number;
  bpm: number;
  beatsPerBar: number;
  /** Optional pickup (anacrusis) before bar 1. */
  pickup?: CarolNote[];
  bars: CarolBar[];
  /** Melody timbre. */
  voice: "bell" | "pluck" | "piano";
  /** Add sleigh-bell shimmer on each beat. */
  sleighBells: boolean;
  /** New words; {R} = recipient, {S} = sender. */
  lyrics: string;
}

const b = (chord: number | null, ...notes: CarolNote[]): CarolBar => ({ chord, notes });

export const CAROLS: Record<CarolId, Carol> = {
  "silent-night": {
    id: "silent-night",
    title: "Silent Night",
    tonic: 60,
    bpm: 84,
    beatsPerBar: 3,
    voice: "bell",
    sleighBells: false,
    bars: [
      b(0, [7, 1.5], [9, 0.5], [7, 1]), b(0, [4, 3]),
      b(0, [7, 1.5], [9, 0.5], [7, 1]), b(0, [4, 3]),
      b(4, [14, 2], [14, 1]), b(4, [11, 3]),
      b(0, [12, 2], [12, 1]), b(0, [7, 3]),
      b(3, [9, 2], [9, 1]), b(3, [12, 1.5], [11, 0.5], [9, 1]),
      b(0, [7, 1.5], [9, 0.5], [7, 1]), b(0, [4, 3]),
      b(3, [9, 2], [9, 1]), b(3, [12, 1.5], [11, 0.5], [9, 1]),
      b(0, [7, 1.5], [9, 0.5], [7, 1]), b(0, [4, 3]),
      b(4, [14, 2], [14, 1]), b(4, [17, 1.5], [14, 0.5], [11, 1]),
      b(0, [12, 3]), b(0, [16, 3]),
      b(0, [12, 1], [7, 1], [4, 1]), b(4, [7, 1.5], [5, 0.5], [2, 1]),
      b(0, [0, 3]), b(null, [null, 3]),
    ],
    lyrics: "Silent night, Christmas night,\nAll is calm, all is bright,\nRound the table and far away,\n{R}, you're in our hearts today,\nWith love, from {S},\nWith love, from {S}.",
  },
  "we-wish": {
    id: "we-wish",
    title: "We Wish You a Merry Christmas",
    tonic: 67,
    bpm: 138,
    beatsPerBar: 3,
    voice: "piano",
    sleighBells: false,
    pickup: [[-5, 1]],
    bars: [
      b(0, [0, 1], [0, 0.5], [2, 0.5], [0, 0.5], [-1, 0.5]), b(3, [-3, 1], [-3, 1], [-3, 1]),
      b(1, [2, 1], [2, 0.5], [4, 0.5], [2, 0.5], [0, 0.5]), b(4, [-1, 1], [-5, 1], [-5, 1]),
      b(2, [4, 1], [4, 0.5], [5, 0.5], [4, 0.5], [2, 0.5]), b(5, [0, 1], [-3, 1], [-5, 0.5], [-5, 0.5]),
      b(4, [-3, 1], [2, 1], [-1, 1]), b(0, [0, 3]),
    ],
    lyrics: "We wish you a merry Christmas,\nWe wish you a merry Christmas,\nWe wish you a merry Christmas,\nDear {R}, with love.\n\nGood tidings we bring\nTo you and your kin,\nWith love from {S}\nAnd a happy New Year.",
  },
  "jingle-bells": {
    id: "jingle-bells",
    title: "Jingle Bells",
    tonic: 67,
    bpm: 132,
    beatsPerBar: 4,
    voice: "pluck",
    sleighBells: true,
    bars: [
      b(0, [4, 1], [4, 1], [4, 2]), b(0, [4, 1], [4, 1], [4, 2]),
      b(0, [4, 1], [7, 1], [0, 1.5], [2, 0.5]), b(0, [4, 4]),
      b(3, [5, 1], [5, 1], [5, 1.5], [5, 0.5]), b(0, [5, 1], [4, 1], [4, 1], [4, 0.5], [4, 0.5]),
      b(1, [4, 1], [2, 1], [2, 1], [4, 1]), b(4, [2, 2], [7, 2]),
      b(0, [4, 1], [4, 1], [4, 2]), b(0, [4, 1], [4, 1], [4, 2]),
      b(0, [4, 1], [7, 1], [0, 1.5], [2, 0.5]), b(0, [4, 4]),
      b(3, [5, 1], [5, 1], [5, 1.5], [5, 0.5]), b(0, [5, 1], [4, 1], [4, 1], [4, 0.5], [4, 0.5]),
      b(4, [7, 1], [7, 1], [5, 1], [2, 1]), b(0, [0, 4]),
    ],
    lyrics: "Jingle bells, jingle bells,\nJingle all the way,\nOh what fun it is to send\nThis song to {R} today.\n\nJingle bells, jingle bells,\nJingle all the way,\nMerry Christmas, {R},\nWith love from {S}.",
  },
  "deck-the-halls": {
    id: "deck-the-halls",
    title: "Deck the Halls",
    tonic: 65,
    bpm: 116,
    beatsPerBar: 4,
    voice: "bell",
    sleighBells: true,
    bars: [
      b(0, [7, 1.5], [5, 0.5], [4, 1], [2, 1]), b(0, [0, 1], [2, 1], [4, 1], [0, 1]),
      b(4, [2, 0.5], [4, 0.5], [5, 0.5], [2, 0.5], [4, 1.5], [2, 0.5]), b(0, [0, 1], [-1, 1], [0, 2]),
      b(0, [7, 1.5], [5, 0.5], [4, 1], [2, 1]), b(0, [0, 1], [2, 1], [4, 1], [0, 1]),
      b(4, [2, 0.5], [4, 0.5], [5, 0.5], [2, 0.5], [4, 1.5], [2, 0.5]), b(0, [0, 1], [-1, 1], [0, 2]),
      b(4, [2, 1.5], [4, 0.5], [5, 1], [2, 1]), b(0, [4, 1.5], [5, 0.5], [7, 1], [2, 1]),
      b(4, [4, 0.5], [6, 0.5], [7, 1], [9, 0.5], [11, 0.5], [12, 1]), b(4, [11, 1], [9, 1], [7, 2]),
      b(0, [7, 1.5], [5, 0.5], [4, 1], [2, 1]), b(0, [0, 1], [2, 1], [4, 1], [0, 1]),
      b(3, [9, 0.5], [9, 0.5], [9, 0.5], [9, 0.5], [7, 1.5], [5, 0.5]), b(0, [4, 1], [2, 1], [0, 2]),
    ],
    lyrics: "Deck the halls for {R},\nFa la la la la, la la la la,\nThis is Christmas, sent with love,\nFa la la la la, la la la la.\n\nFrom {S}, near or far,\nFa la la, la la la, la la la,\nYou are loved, wherever you are,\nFa la la la la, la la la la.",
  },
};

export function personaliseCarol(id: CarolId, recipient: string, sender: string): string {
  return CAROLS[id].lyrics.replaceAll("{R}", recipient.trim() || "you").replaceAll("{S}", sender.trim() || "us");
}

/** Total beats of a carol (pickup + bars); used by tests and the scheduler. */
export function carolLengthBeats(c: Carol): number {
  const sum = (n: CarolNote[]) => n.reduce((a, [, d]) => a + d, 0);
  return sum(c.pickup ?? []) + c.bars.reduce((a, bar) => a + sum(bar.notes), 0);
}
