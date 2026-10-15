# Product

## The idea
**Message in a Bottle — more than a message. A feeling, made for you.**

A sender writes something true for someone they love. We turn it into a short, illustrated, personalised story with a soundtrack that the recipient opens from a private link — like discovering a message in a bottle. Optionally, a real keepsake bottle holds the printed message and a QR code to the story.

It should feel like a handwritten letter, a storybook, a short film and a gift at once. Never like a chatbot, a greeting-card site or a slideshow tool.

## Who it is for
Anyone with something to say and an occasion to say it: love and anniversaries, birthdays, family, friendship, thank-yous, encouragement through hard times, special memories, remembrance, or no reason at all. One flow serves them all; occasion, tone, visual style and music are configuration.

Remembrance is handled with particular care: gentle language, no celebratory options, and never any suggestion that generated words or voices come from someone who has died.

## Core journeys
1. **Create** — six steps: occasion → who it's for → message (with prompts, memories, tone, how much to shape it) → look → sound → review. Drafts persist in the browser.
2. **Generate** — a job with real progress (story, scenes, artwork, soundtrack, assembly); failures keep the input and can be retried.
3. **Preview and edit** — the sender sees exactly what the recipient will, edits every line, reorders scenes, changes look and sound without regenerating.
4. **Send** — pay (or activate in demo mode), copy or share the private link, optionally order a physical bottle. Revoke or rotate the link any time.
5. **Receive** — a serene opening, "Someone has a message for you", the reveal, the story scene by scene with music and optional narration, the closing words, a keepsake screen. No app, no account, works on a phone.

## Products and pricing (hypotheses, not validated)
| Product | What | Indicative price |
| --- | --- | --- |
| Digital Gift | Personalised story, soundtrack, private link | £4.99 |
| Little Bottle | + glass keepsake bottle, printed rolled message, ribbon, QR card, gift packaging | £16.99 + £3.95 UK delivery |
| Keepsake Gift Box | + lined gift box, printed story booklet, dedication card | £34.99, delivery included |

Prices are configuration (`src/lib/config/products.ts`). Before going live, validate against generation costs, payment fees, materials, packaging, fulfilment, shipping, returns and VAT. No supplier, stock or delivery promises exist yet; physical fulfilment starts manual (admin view, print-ready message, QR code).

## Language
Warm, plain, specific. No exclamation-mark enthusiasm, no emoji, no "AI magic". Say what is real: a demonstration soundtrack is called that.

## Not in v1
Subscriptions, voice cloning, multiple languages, social sharing walls, automated suppliers.
