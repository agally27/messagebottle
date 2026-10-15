# Design system

## Identity
A contemporary gift brand with a quiet magic: golden-hour light, glass, kraft paper, handwriting, the sea. Warm and tactile on the marketing side; serene and cinematic in the recipient experience.

## Colour
Tokens live in `src/app/globals.css` (`@theme`).

| Role | Token | Notes |
| --- | --- | --- |
| Paper | `cream` #fbf8f1, `paper` #fffdf8, `sand` #efe6d6 | page and card backgrounds |
| Ocean | `ink` #14213d, `navy`, `ocean` #2c5f8a, `teal` / `teal-deep` #2b6168 | headings, buttons, eyebrows (teal-deep for small text: ≥4.5:1 on cream) |
| Sea glass | `seaglass`, `seaglass-pale`, `mist` | soft fills, badges |
| Materials | `kraft` #e7d6bb, `kraft-deep`, `amber` #f0b45e, `glow` #ffd98a | kraft panels, candle-light halos, fairy lights |
| Accents | `gold` #c9a961 (buttons, large text), `gold-deep` #8a6a1e (small gold text), `coral` | |
| Text | `text`, `text-muted` #5b6578, `text-faint` #5f687a | all ≥4.5:1 on cream and paper |

Rules: no purple AI gradients; gradients only inside artwork and halos, never as UI decoration; status is never colour-only.

## Type
- **Fraunces** (variable, OFL) for headings and story text; italic light for the hero's second line.
- **Manrope** (variable, OFL) for the interface.
- **Caveat** (variable, OFL) for handwritten accents only: a note, a single line, never body copy.
All three are vendored in `src/app/fonts/` and loaded with `next/font/local`.

## Imagery
- **Procedural scene art** (`components/art/SceneArt.tsx`): deterministic SVG scenes, six themes × twelve motifs × time of day. Used for every story scene when no image provider is configured, and for theme previews.
- **The glowing bottle** (`components/art/GlowingBottle.tsx`): the signature object. Cork, twine and heart tag, rolled note, fairy lights that twinkle (off with reduced motion).
- **Photography** (`src/assets/brand/`): currently crops from the founder's mood board, used as *placeholder* product photography in the hero, unboxing section, product cards and brand moment. They are low resolution (≤ 924 px wide) and should be replaced with real product shots before launch. Confirm usage rights for any generated imagery.
- The phone mockup (`components/marketing/PhoneMockup.tsx`) always shows our real recipient screen, never a stock image of an app.

## Materials and surfaces
`kraft` utility for paper panels (faint fibre texture), `halo` for warm light behind glowing objects, `paper-texture` for the hero, `shadow-photo` / `shadow-warm` for photographic cards. Radii 10–36 px, pill buttons.

## Motion
Restrained. Entrance: `Reveal` fades sections up once on scroll (always visible with reduced motion or without JS). Ambient: `float`, `sway`, `twinkle`, `drift`, `rise` (fairy lights in the reveal) — all removed under `prefers-reduced-motion`. No autoplaying video, no parallax that fights scrolling.

## Recipient experience
Dark or light theme per visual style; a translucent panel keeps text legible over any artwork; the bottle glows and lights drift upward on dark themes; audio starts only on the "Open the bottle" tap; controls for pause, mute and read-aloud; keyboard arrows move between parts.

Memories: photos appear as white-bordered polaroids with a slight tilt and a Caveat caption, the year in small Manrope; "Our song" is a card with a single "Play it here" button, never an autoplaying embed; "In loving memory of…" is set in italic Fraunces at a muted tone, never bold or decorative. The landing section uses drawn scene art inside the polaroids, not customer photos.

## Accessibility
axe WCAG A/AA scans run in the e2e suite on the main screens. Decorative SVGs are `aria-hidden`; informative ones carry titles. Targets are ≥ 44 px. Focus rings are visible on every control.
