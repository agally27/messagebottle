# AI providers

Every creative step sits behind an interface in `src/lib/providers/types.ts`. A local/procedural implementation always exists; real providers are chosen by environment variables in `src/lib/providers/registry.ts`. Nothing in the UI assumes a provider is live: the job's `mode` is `live` only when at least one real provider is selected.

| Capability | Interface | Default | Real provider | Status |
| --- | --- | --- | --- | --- |
| Story text | `StoryProvider.write(brief, input)` | `local` (faithful local writer) | `anthropic` (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`) | **implemented** (`src/lib/providers/story/anthropic.ts`, structured outputs via `zodOutputFormat`, prompt-cached system prompt, error classification); **not tested against the live API** (no key in this environment) |
| Scene imagery | `ImageProvider.generate(req)` | `procedural` (deterministic SVG scenes) | `openai` (`OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`) | interface + placeholder; not implemented |
| Music | `MusicProvider.compose(mood, prompt)` | `procedural` (Web Audio in the recipient's browser) | none yet | demonstration only, labelled in the UI |
| Narration | `NarrationProvider.narrate(story)` | `none` (device speech synthesis on the client) | `elevenlabs` (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`) | interface + placeholder; not implemented |

## Rules every provider follows
- Work only from `ContentBrief` (the sender's facts). Never invent memories, events or promises.
- Return the `StoryDraft` shape; it is validated with zod and then checked by `checkStory` (names present, sentence coverage, length, remembrance language). A live provider that fails the check is replaced by the local writer for that gift and the provenance says so.
- Throw `ProviderError(message, code, permanent)`. Permanent codes (`auth`, `billing`, `invalid_request`) are never retried; transient ones (`rate_limited`, `upstream_error`, `timeout`) retry up to 3 times with exponential backoff.
- Report `JobUsage` (units and an estimated cost in pence) so margins can be analysed later.
- Store generated media in controlled storage (Supabase bucket, signed URLs); never keep temporary provider URLs.

## Configuration
```
STORY_PROVIDER=auto|anthropic|local     # auto = anthropic when ANTHROPIC_API_KEY is set
ANTHROPIC_API_KEY=                       # server-only
ANTHROPIC_MODEL=claude-sonnet-5-5
IMAGE_PROVIDER=procedural|openai
OPENAI_API_KEY=
NARRATION_PROVIDER=none|elevenlabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
GENERATION_RATE_LIMIT_PER_HOUR=5
DEMO_STEP_DELAY_MS=900                   # pacing of demo generation so stages are visible
```

## Costs (to confirm against provider pricing before launch)
A story call is a few thousand input tokens and ~1k output tokens. Images are the dominant cost (3–6 per gift). Narration is priced per character. The job records usage per provider; `/admin` (milestone 6) sums it per gift.

## Testing
Unit tests use the local providers and a `FlakyStory` test double (`src/lib/jobs/pipeline.test.ts`) to cover retries, permanent failures and fallbacks. Real providers must be verified manually with a key: create a gift, check `job.mode === "live"`, `story.provenance.provider` and the usage entries.

## Carols
The four carol tunes are traditional and in the public domain (Silent Night 1818, Jingle Bells 1857, We Wish You a Merry Christmas and Deck the Halls are traditional). Only the melodies are used, transcribed in `src/lib/domain/carols.ts` and played by the browser synthesiser; the words are our own. No recordings or modern arrangements are used. A future music or voice provider could sing the personalised words; until then the UI says plainly that nothing is sung.
