# CHANGELOG — "Archu & Me" Galaxy: Visual + Life Upgrade

## 0. Ground truth vs. the brief

The brief listed "Already done" items that were **not present** in this repository:

- no `Intro.tsx` opening veil
- no rebuilt "memory plate" `EventCard` (the card is still the editorial card from earlier work)
- `--color-dim` was still `#6b665d`
- modals had no `role="dialog"`
- `AddEventModal` / `SettingsModal` no longer exist: they were replaced by the admin studio (`AdminPanel` + `AdminGate`)

I did **not** build the missing Phase-1 items wholesale. I added only the parts later phases depend on:
- the dim-text contrast fix
- the global `:focus-visible` ring
- dialog semantics and focus traps (on `EventModal`, the lightbox, `AdminPanel` and `AdminGate`)
- the sparkle favicon and meta tags

## 1. Phases completed / skipped

| Phase | Status | Notes |
|---|---|---|
| 2 Tokens, type, motion | Done | `@theme` radii/shadows/easings; `:root` durations; `.t-*` type scale; 11px legibility floor; `src/lib/motion.ts` (same curves in TS); `useReveal` + `data-stagger`; distinct section entrances; `Sparkle.tsx` ornament; font preload + fallback stack + `font-optical-sizing`. |
| 3 Chapter cards + theming | Done | `ChapterCard.tsx` (90svh, numeral, summary, planet, nebula, stats, parallax); `useActiveChapter` animates `--chapter*` via `@property`; consumed by Starfield washes, nav progress, `.btn-primary` glow, section rules, selection; per-chapter Starfield density and twinkle; `ChapterRail.tsx` (≥1024px); quieter filter bar with 44px targets on mobile. |
| 4 Popup, journey, lightbox, music | Done | Cinematic modal header (blurred duplicate layer + vignette + date anchor); focus traps and focus return; `[data-app-bg]` made `inert` while a dialog is open; lightbox swipe, arrow keys and neighbour preload; `MusicEmbed.tsx` click-to-load used in `EventModal`, `EventJourney`, `Scrapbook`, `MusicDock` and the admin preview. Scrapbook is grouped by chapter with sticky labels, a hero photo per group, in-view muted video and a soundtrack poster grid. EventJourney has swipe, "day N of us" and a progress bar. Pinch/double-tap zoom was not implemented (it was optional). |
| 5 Numbers + Letter | Done | Count-up figures; `SpiralChart.tsx` with the silence as an empty dashed arc; animated chapter bars; parchment letter with word-by-word reveal and a drawn signature; sparkle footer divider. Letter copy is unchanged. |
| 6 Galaxy beautification | Mostly done | See §2. **Not done:** cloud-band drift, moon trails, ring glint, colour grading along strands, density lanes. |
| 7 Ambient life | Done | Breathing, two-frequency twinkle, deterministic flares, shooting stars, fireflies, idle camera drift, pointer + gyro parallax. |
| 8 Interaction + story | Mostly done | Done: pointer proximity (shader), pointer trail, hover emphasis, pick ripple + strand pulse, scrub "pop", minimap, the silence set piece + counter + mist, the reunion release wave, anniversary/birthday celebration. **Not done:** distance-based camera tween durations with a 350ms hold (the existing damped rig is kept), the present-edge glow, and the CoverGate camera push. |
| 9 Audio / bloom | Audio done, bloom skipped | WebAudio synth (pad / chime / bell), off by default, toggles in the ObservatoryRail and in Admin → Settings, persisted as the additive `settings.sound`. Bloom was **skipped**: the colour-fidelity rule plus a no-regression requirement couldn't be verified without a browser, so it wasn't worth the risk. |
| 10 Perf, a11y, delivery | Partly | Done: frame-time guard with auto-downgrade and a notice; upload creates a 1600px WebP display copy + 480px thumbnail (additive fields; old photos fall back to the original); `aria-live` galaxy state; skip link; icon-button labels; share meta; apple-touch-icon. **Skipped:** code splitting (`vite-plugin-singlefile` inlines everything, so lazy chunks give no gain). |

## 2. Galaxy changes (all additive, all made of the one sparkle element)

- **Shader** (`sparkleHD.ts`): new uniforms `uTw2 uFlare uBreathAmp uRotAmp uSpin uDrift uDesat uDim uProx`. **Every default is neutral**, so output is identical to before unless an effect is enabled.
- **Stars:** chapter-colour halo layer; seeded ±12% size jitter; seeded spike attitude + slow spin; favourites get a warmer, 1.2× halo; memories with media get an orbiting satellite; upcoming memories are dim with a faint halo; hover enlarges the halo 1.6× and dims same-chapter neighbours to 60%; reveal pop on time-scrub.
- **Planets:** a seeded atmosphere rim via the optional `rim` parameter of `buildPlanetShell`. The covers don't pass it, so they're unchanged.
- **Dust:** up to 2 extra depth layers, generated only along each chapter's own time span (explicitly skipping the silence) with bounded shader drift.
- **Core:** gold shimmer spike layer. **Heart:** lub-dub-rest beat that brightens; ×1.3 on the anniversary and birthdays.
- **Labels:** eased positions, greedy overlap culling every 3 frames, 11px.
- **Silence:** desaturation toward `#8aa0c0`, 0.55 dim, 0.5 time scale, a DOM counter 0 → 588, and ≤60 faint, non-pickable mist motes placed **only** inside the void arc. The mood tween lands exactly on neutral values, so normal colours are unchanged.
- **Reunion:** mood restored plus a star-by-star flare wave by distance (2.6s).
- **Determinism:** the four decorative placements in v3 that used `Math.random()` (background field, star knots, moon clusters, chase shells) now use a seeded direction. `Math.random()` remains only for transient bursts, trail jitter and shooting-star timing.
- **New public methods (additive):** `setStarMeta`, `getLayout`, `getFocus`; new optional `SceneOptions.onAutoDowngrade`. The frozen API is untouched.

## 3. Files

- **New:** `src/three/fx/config.ts`, `src/three/fx/effects.ts`, `src/lib/motion.ts`, `src/lib/audio.ts`, `src/hooks/useActiveChapter.ts`, `src/hooks/useFocusTrap.ts`, `src/components/{Sparkle,ChapterCard,ChapterRail,MusicEmbed,SpiralChart}.tsx`, `src/components/observatory/Minimap.tsx`.
- **Rewritten:** `Timeline`, `Scrapbook`, `Stats`, `LoveLetter`, `EventModal`, `EventJourney`, `GalaxyMap`, `Starfield`, `SectionHeader`, `App`, `sparkleHD.ts`, `useReveal.ts`, `index.html`.
- **Edited:** `galaxyScene.ts` (≈30 surgical edits + one method block), `index.css`, `storage.ts`, `MemoryStore.tsx`, `AdminPanel.tsx`, `ObservatoryRail.tsx`, `MusicDock.tsx`, `Nav.tsx`, `EventCard.tsx`.
- **Untouched:** `canonicalTimeline.ts` (data immutable).

## 4. Tunables

- `src/three/fx/config.ts`:
  - `FX[tier]` — every effect on/off or count per tier
  - `TUNING` — sizes, speeds, silence values, heart rate, frame guard
  - the header comment gives sparkle counts added per tier
- **CSS:** `--dur-*`, `--ease-*`, `--chapter*`, `--shadow-*` in `src/index.css`.

## 5. Verification — what was actually run

- The project's build (`vite build`) succeeds: `dist/index.html` is 991 KB (270 KB gzipped); before this work it was 937 KB / 252 KB.
- The editor's TypeScript check reported zero errors after the final edits. `npx tsc --noEmit -p .` was **not** run separately; there's no shell in this environment.
- **Parallel edits to the same file silently overwrote each other.** I caught this through a build failure, then grep-verified every edit marker in every multi-edit file and re-applied the losses one by one: `storage.ts` ×2, `AdminPanel.tsx` ×3, `index.css` ×1, `MemoryStore.tsx` ×1.
- **Not verified:** no browser or headless runtime was available. I took no screenshots, measured no fps, ran no automated contrast audit, tested no touch/gyro, and did no position-dump diff. Every visual and performance claim is unverified.

## 6. Known trade-offs / risks

- **Frame time:** the ≤15% frame-time target is unmeasured. The frame guard downgrades a tier if the rolling average exceeds 24ms for 3s.
- **Unmeasured fidelity:** proximity lean, drift and rotation are subtle by design, but their visual strength hasn't been seen.
- **Nested focus traps:** the modal + lightbox pair and the studio → "view as visitor" hand-off are implemented but not exercised.
- **Hover label titles:** the in-scene hover label still shows canonical titles (the scene builds from `EVENTS`), not admin-edited titles.
- **Backups:** export files contain only the original photo blobs. Thumbnails aren't regenerated for imported photos; those fall back to the original image.
- **Icons and clock:** the apple-touch-icon is an SVG data URI, which some iOS versions ignore. The celebration check uses the device's local date.
