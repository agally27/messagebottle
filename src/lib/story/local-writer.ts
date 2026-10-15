import type { ContentBrief } from "./brief";
import type { StoryDraft, StoryProvider, StoryResult } from "@/lib/providers/types";
import { createRng } from "@/lib/utils/random";
import { motifForText } from "./scenes";

/**
 * Local story writer. Deterministic, zero-cost, and honest: every sentence the
 * sender wrote is kept verbatim and in order; the writer only adds framing
 * lines, headings, a title and a dedication that reference facts the sender
 * supplied (names, relationship, occasion). It never invents memories, events
 * or promises. This is the fallback when no model provider is configured, and
 * the reference behaviour that model providers are checked against.
 */

type Frames = {
  titles: string[];
  openings: string[];
  firstSceneLead: string[];
  memoryLead: string[];
  closingLead: string[];
  signoffs: string[];
};

const T = (s: TemplateStringsArray, ...v: string[]) => s.map((p, i) => p + (v[i] ?? "")).join("");

function frames(b: ContentBrief): Frames {
  const n = b.recipientName;
  const s = b.senderName;
  const rel = b.relationshipPhrase;
  const forRel = rel ? `, ${rel}` : "";
  const child = b.ageRange === "child";

  const base: Frames = {
    titles: [T`For ${n}`, T`A message for ${n}`, T`Something I wanted you to have, ${n}`],
    openings: [
      T`${n}, ${s} has something to say to you — and wanted it to arrive the way it felt, not in passing.`,
      T`This is for you, ${n}. ${s} wrote it, and asked for it to be kept somewhere you can return to.`,
    ],
    firstSceneLead: [T`Here is what ${s} wanted you to know.`, T`In ${s}'s own words:`],
    memoryLead: [T`There's a moment ${s} keeps coming back to.`, T`${s} wanted to remember this one with you.`],
    closingLead: [T`So, ${n} — this is the part that matters most.`, T`And this is where ${s} wanted to leave you:`],
    signoffs: [T`With love,\n${s}`, T`Always,\n${s}`, T`— ${s}${forRel ? `\n(${rel.replace(/^my /, "your ")})` : ""}`],
  };

  if (child) {
    base.openings = [T`Hello ${n}! ${s} made this just for you.`, T`${n}, this is a message from ${s}, made especially for you.`];
    base.firstSceneLead = [T`Here is what ${s} wants you to know.`];
    base.memoryLead = [T`${s} remembers this, and loves it:`];
    base.closingLead = [T`And here is the most important bit, ${n}:`];
    base.signoffs = [T`Lots of love,\n${s}`, T`Big hug,\n${s}`];
  }

  if (b.sensitive) {
    base.titles = [T`For ${n}`, T`Some words for you, ${n}`];
    base.openings = [
      T`${n}, ${s} wanted to put some words somewhere safe, for you to read whenever you need them.`,
      T`This is from ${s}, for you, ${n}. There's no right time to read it. It will be here.`,
    ];
    base.firstSceneLead = [T`In ${s}'s words:`];
    base.memoryLead = [T`A memory ${s} is holding on to:`];
    base.closingLead = [T`${n}, this is what ${s} most wants you to hold on to:`];
    base.signoffs = [T`With love, and holding you close,\n${s}`, T`Always here,\n${s}`];
    return base;
  }

  switch (b.tone) {
    case "romantic":
      base.titles = [T`For ${n}${forRel}`, T`Everything I mean when I say your name, ${n}`, T`${n}, from ${s}`];
      base.openings = [
        T`${n} — ${s} wanted to say this properly. Not quickly, not between other things. Just this, for you.`,
        T`Some things deserve more than a text. ${s} wrote this for you, ${n}, and wanted it to feel the way it felt to write.`,
      ];
      base.closingLead = [T`And this, ${n}, is the heart of it:`, T`So here it is, ${n}, as plainly as ${s} can say it:`];
      base.signoffs = [T`All my love,\n${s}`, T`Yours,\n${s}`, T`With everything,\n${s}`];
      break;
    case "playful":
      base.titles = [T`A small ode to ${n}`, T`${n}: an appreciation`, T`For ${n}, obviously`];
      base.openings = [
        T`${n}. Yes, you. ${s} has a few things to say and wanted them delivered with a little ceremony.`,
        T`${s} made this for you, ${n}. Brace yourself: it's sincere.`,
      ];
      base.closingLead = [T`Right. The serious bit, ${n}:`, T`And finally, ${n} — no jokes for this one:`];
      base.signoffs = [T`Love you, obviously,\n${s}`, T`Yours (annoyingly),\n${s}`];
      break;
    case "reassuring":
      base.titles = [T`For ${n}, for the hard days`, T`Something to hold on to, ${n}`];
      base.openings = [
        T`${n}, ${s} wanted you to have this for the days that feel heavier than they should. Read it whenever you need it.`,
        T`This is from ${s}. It isn't advice. It's just what's true about you, ${n}, written down so you can't forget it.`,
      ];
      base.closingLead = [T`${n}, if you remember one thing from this, let it be this:`];
      base.signoffs = [T`Right here, always,\n${s}`, T`Whenever you need me,\n${s}`];
      break;
    case "nostalgic":
      base.titles = [T`The things we kept, ${n}`, T`For ${n}, looking back`];
      base.openings = [
        T`${n} — ${s} has been thinking about where you've been together, and wanted to put some of it down before it blurs.`,
        T`Some memories deserve a proper place. ${s} made this one for you, ${n}.`,
      ];
      base.closingLead = [T`And after all of it, ${n}, this is what stays:`];
      break;
    case "celebratory":
      base.titles = [T`${n}, this is your moment`, T`A toast to ${n}`, T`For ${n}, with a raised glass`];
      base.openings = [
        T`${n}! ${s} wanted to mark this properly — so here it is, made just for you.`,
        T`Today is about you, ${n}. ${s} has a few things to say, and all of them are good.`,
      ];
      base.closingLead = [T`So, ${n}, with a raised glass:`, T`And finally, ${n} —`];
      base.signoffs = [T`So proud of you,\n${s}`, T`With love and a very loud cheer,\n${s}`];
      break;
    case "reflective":
      base.titles = [T`For ${n}, quietly`, T`Some words for ${n}`];
      base.openings = [
        T`${n}, ${s} wanted to say something slowly, and properly. This is it.`,
        T`${s} wrote this for you, ${n}, without hurry. Read it the same way.`,
      ];
      base.closingLead = [T`And this, ${n}, is what ${s} wanted to leave with you:`];
      break;
    case "heartfelt":
    default:
      break;
  }
  return base;
}

function chunk<T>(items: T[], groups: number): T[][] {
  const out: T[][] = [];
  const n = items.length;
  if (n === 0) return out;
  const g = Math.max(1, Math.min(groups, n));
  let start = 0;
  for (let i = 0; i < g; i++) {
    const size = Math.ceil((n - start) / (g - i));
    out.push(items.slice(start, start + size));
    start += size;
  }
  return out;
}

const STORY_HEADINGS: Record<string, string[]> = {
  default: ["Where this begins", "What I see in you", "The things I don't say enough", "Between us", "What stays", "From here"],
  love: ["Where it began", "What you are to me", "The ordinary days", "What I know for certain", "From here on"],
  birthday: ["Another year of you", "What this year showed me", "What I wish for you", "And always"],
  encouragement: ["What is true", "What you've already done", "What I'm here for", "Hold on to this"],
  remembrance: ["In the quiet", "What they were", "What remains", "For now"],
  "thank-you": ["What you did", "What it changed", "What I noticed", "Thank you, properly"],
  friendship: ["How it started", "The things only we know", "What you've been to me", "Still here"],
  family: ["What you gave me", "The small things", "What I carry with me", "Always"],
  memories: ["Where we were", "What it felt like", "What I kept", "Still"],
};

function poeticLines(text: string): string {
  // Break long sentences at natural pauses so they read as verse. Words unchanged.
  return text
    .split(/(?<=[,;:—–])\s+|(?<=\s(?:and|but|because|so|while|when|then))\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function artPromptFor(text: string, heading: string, brief: ContentBrief): string {
  const motif = motifForText(`${heading} ${text}`, brief.occasionId);
  return `${brief.artDirection}. Scene: ${motif}. No text, no faces in close-up, no words in the image.`;
}

export function writeLocalStory(brief: ContentBrief): StoryDraft {
  const rng = createRng(brief.seed);
  const f = frames(brief);
  const pick = <T>(arr: T[]) => rng.pick(arr);
  const headings = STORY_HEADINGS[brief.occasionId] ?? STORY_HEADINGS.default!;
  const sentences = brief.sentences.length ? brief.sentences : [brief.message];

  const title = pick(f.titles);
  const opening = pick(f.openings);
  const signoff = pick(f.signoffs);

  // Sentences for the closing: the final one or two of the message.
  const closingCount = sentences.length >= 6 ? 2 : 1;
  const closingSentences = sentences.slice(-closingCount);
  const bodySentences = sentences.slice(0, Math.max(0, sentences.length - closingCount));
  const body = bodySentences.length ? bodySentences : sentences;

  const targetScenes = Math.max(2, Math.min(5, Math.ceil(body.length / 2.5)));
  const groups = chunk(body, targetScenes);

  const scenes: StoryDraft["scenes"] = [];

  groups.forEach((group, i) => {
    let text = group.join(" ");
    let heading = "";
    if (brief.transformation === "close") {
      heading = "";
    } else {
      heading = headings[Math.min(i, headings.length - 2)] ?? "";
      if (i === 0) text = `${pick(f.firstSceneLead)}\n\n${text}`;
    }
    if (brief.transformation === "poetic") text = poeticLines(text);
    scenes.push({ heading, text, artPrompt: artPromptFor(text, heading, brief) });
  });

  if (brief.memorySentences.length) {
    const memoryText = brief.memorySentences.join(" ");
    const scene = {
      heading: brief.transformation === "close" ? "" : "A memory",
      text: brief.transformation === "close" ? memoryText : `${pick(f.memoryLead)}\n\n${brief.transformation === "poetic" ? poeticLines(memoryText) : memoryText}`,
      artPrompt: artPromptFor(memoryText, "memory", brief),
    };
    // Place the memory scene just after the first scene, or at the end for short messages.
    scenes.splice(Math.min(1, scenes.length), 0, scene);
  }

  let closing = closingSentences.join(" ");
  if (brief.transformation !== "close") closing = `${pick(f.closingLead)}\n\n${brief.transformation === "poetic" ? poeticLines(closing) : closing}`;
  closing = `${closing}\n\n${signoff}`;

  const dedicationParts = [`For ${brief.recipientName}`];
  if (brief.relationshipPhrase) dedicationParts.push(brief.relationshipPhrase);
  let dedication = `${dedicationParts.join(", ")}. From ${brief.senderName}.`;
  if (brief.datesAndPlaces) dedication += ` ${brief.datesAndPlaces}`;

  return { title, opening, scenes: scenes.slice(0, 6), closing, dedication: dedication.slice(0, 300) };
}

export class LocalStoryProvider implements StoryProvider {
  readonly id = "local";
  readonly live = false;
  async write(brief: ContentBrief): Promise<StoryResult> {
    return { draft: writeLocalStory(brief), provider: this.id };
  }
}
