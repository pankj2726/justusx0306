# CHANGELOG — Galaxy Expansion

Added: satellites matched to events · extra worlds · giant ringed planets · love planets · UFOs · falling stars and wishes · discoveries.

## 1. Steps completed / skipped

| Step | Status | Notes |
|---|---|---|
| 0 Recon | Done | Read `galaxyScene.ts` (the parts I touched), `sparkleHD.ts`, `effects.ts`, `planetDesign.ts`, `GalaxyMap.tsx`, and the observatory components. I had no shell, so I couldn't run a baseline `tsc`. The editor's type check was clean before I started. |
| 1 Foundations | Done | `fx/primitives.ts`: `sphereShell`, `ringDisc` (multi-band + gaps), `saucer`, `heartCurve`, `orbitBelt`, `RingTrail`, `binaryPair`.<br>`fx/config.ts`: new `EXP[tier]` table and `VOID_RULE`.<br>`sparkleHD.ts`: new uniforms `uBlink`, `uBlinkRate`, `uBeat`, `uReveal`, all neutral by default. `buildPlanetShell` gained optional `bands`, `bandMix`, `vortex`, `alpha` and `rimStrength`. With these omitted, the random-number order and the output are unchanged. |
| 2 Satellites | Done | See §2. |
| 3 Planner, extra worlds, giants | Done | `planExpansion()` in `fx/expansion.ts`. Plans always cover the maximum counts (3 giants, 14 extra worlds), so ids and positions are the same at every quality tier. |
| 4 Love planets | Done | Twin Worlds (elliptical binary, sparkle bridge, synced twinkle at closest approach), Heart Ring (heart-curve ring at 60° with slow precession), Heart Belt (dusty heart, fill 0.08, brightens in present/reunion or on special days). |
| 5 Falling stars, wishes, showers | Done | `ShootingStars` rewritten (`effects.ts`):<br>• tier cadence and 24-segment trails<br>• slight curved arcs<br>• void validation of start, middle and end points<br>• fade-out when streaks become disallowed<br>• golden stars, caught with a 44px screen-space radius<br>• shower queue<br>Wishes are saved under `galaxy-wishes-v1`. |
| 6 UFOs | Done | Saucer formation with blinking rim lights, a wake built on `RingTrail`, and a spline path validated against the void. It sometimes pauses near a discoverable, and fades out in silence, journey and reunion. Tapping one sends a cosmetic beam to a random memory star, then shows an "Open this memory" toast. |
| 7 Discoveries | Done | Found by tapping, or by proximity (within max(2.5 × radius, 1.6 × extent), on screen for 1.2 s). Saved under `galaxy-discoveries-v1`. Rail button "Discoveries n/N" opens a panel with focus trap, fly-to and live announcements. |
| 8 Settings, tiers, reduced motion | Done, with a deviation | `SettingsModal` no longer exists (the admin studio replaced it and is admin-only), and visitors need wishes. So the **Galaxy life** group lives in the `ObservatoryRail`: Extra worlds & satellites (master switch), Visitors, Falling stars, Discoveries and Wishes. The four settings keys are additive, all default true. `setQuality` still rebuilds the whole world, as it did before. |
| 9 Polish, performance | Done | The frame guard sheds expansion extras before dropping global quality. It sheds in this order: giant glint, fireflies, extra-world rims, UFOs, then streak cadence ×2. Every new batch is registered in `disposables`, and `clearWorld()` / `dispose()` free it. Pick results are reused, with no per-frame allocations. |
| 10 Verification | Partial | See §5. |

## 2. Event-matched satellites

- **Count:** one satellite per memory in the store (canonical events plus user-added ones, minus admin-deleted ones), grouped by chapter. `N_c` is computed at runtime; nothing is hard-coded.
- **Slots:**
  - Canonical events take slot = index in `eventsOfChapter(chapter)` (the brief's `eventsInChapter` is named `eventsOfChapter` in this repo).
  - User-added memories, and canonical events moved to another chapter, go into **new shells beyond the canonical ones** with fixed 6-per-shell spacing. Adding or removing one never moves any other satellite.
- **Shell radius:** `R_k = R_planet × (1.55 + 0.42k)`, at least 1.12 × the previous shell, then pushed out to clear every decorative moon orbit by ≥ 15%.
- **Shell orientation:** 40 seeded (inclination, node) candidates. Shells must be ≥ 14° apart, and I take the first whose ring clears the void; any remaining dip into the buffer is logged.
- **Speed:** Kepler-like, `period = clamp(40·(R/R₀)^1.5, 40, 120)` seconds, alternating direction per shell.
- **Detail by distance:** detail rises from 0 at a camera distance of 26·R to 1 at 14·R.
  - Far away: faint small dots, no halos, no guides, not pickable.
  - Close: full core, halo, a speck for memories with media, and dotted guides (alpha ≤ 0.07, chapter/journey states only).
- **Special satellites:** favourites are 1.25× larger with a warm halo. The last meeting before the silence gets a cool tint. The reunion gets a gold halo, a heartbeat and an 8-point tail. Future-dated memories are hollow.
- **Hover and highlight:** hovering or keyboard-highlighting slows that satellite's orbit to 0.35× and enlarges its halo 1.6×. Because satellites share the memory's event id, the spiral star lights up too, and vice versa.
- **Opening a memory:** tapping a satellite opens that memory's journey. The camera follows the moving satellite, whose orbit slows to 0.15× while you're there.
  - User-added memories have no spiral star, so they always use the satellite framing.
- **Keyboard:** in chapter state, `[` and `]` step through satellites and announce "Satellite n of N: title"; `Enter` opens the highlighted one.

### Parity (by construction; not observed in a console)

The satellite count equals the store's per-chapter event count. `setSatellites()` also logs `console.table([{chapter, canonical, events, satellites}])` in dev builds. For the unedited canonical data:

| chapter | events | satellites | shells |
|---|---|---|---|
| ch-01 | 4 | 4 | 1 |
| ch-02 | 7 | 7 | 2 |
| ch-03 | 3 | 3 | 1 |
| ch-04 | 10 | 10 | 2 |
| ch-05 | 18 | 18 | 3 |
| ch-06 | 4 | 4 | 1 |
| ch-07 | 6 | 6 | 1 |

Capacity is 160 satellites. Anything beyond that is hidden and logged.

## 3. Deviations (and why)

- **How I defined the void.** The spiral's windings sit about 26 units apart radially, and the chapter lanes span ±15.6. So a band "every lane wide" around the silence arc would already contain the existing ch-05 planet (about 14 units from the silence centreline).
  - The void is therefore a **slab**: horizontal distance < 11 from the silence centreline AND |y| < 8, plus a sphere of radius 26 around the black hole, all ×1.12.
  - All of this is tunable in `VOID_RULE`. The planner never relaxes it.
- **Layout source.** The rendered galaxy (v3) uses its own spiral, not `planetDesign`'s. So the planner receives the scene's actual layout via `expLayout()`, while seeds come from `planetDesign.rngFor` (`GALAXY_SEED`). I didn't change `planetDesign.ts`.
- **Pick types.** `PickInfo` already had a `kind` union, so I extended that union (`discovery`, `ufo`) and added an optional `via: "satellite"` to the event member. There is no second `kind` field.
- **No new per-point shader attributes.** `aRot` and `aBlink` would read stale generic vertex values on geometries without them and could change the existing world. I used uniforms instead (`uBlink`, `uBeat`, `uReveal`), and rotation continues to derive from `aPhase`.
- **Heart Belt spacing.** It is exempt from the spiral-band and planet spacing rules, because it's meant to encircle the present edge. It is still bound by the void and camera rules.
- **Reduced motion.** Meteor showers are simply skipped; there is no replacement twinkle wave (the reunion already has its gentle colour return).

## 4. Tunables

- `src/three/fx/config.ts`:
  - `EXP[tier]`: satellite halos, guides, trails and capacity; extra-world count and points; rims, bands and vortex; giants and their points; glint; twin, heart-ring and belt points; UFO count; streak cadence and life; golden chance; showers; point cap. The header comment lists the estimated points per tier.
  - `VOID_RULE`: void geometry, buffer, and streak/UFO margins.
- `src/three/fx/expansion.ts`: planner bands (giants: r 300–360, y 120–170; romance quarter: r 108–124 just past the present angle; extra worlds: r 100–190, y +70…+115 or −20…−60), satellite radius formula and periods, and palettes.
- `src/data/galaxyCopy.ts`: every new string.

## 5. Verification — what was actually done

- **Build:** the project builds (`vite build`), producing a single `dist/index.html` of 1,048 KB (290 KB gzipped). Before this work it was 994 KB / 271 KB. I added no dependencies.
- **Type check:** the editor's TypeScript check reported no errors after the final edits. I didn't run `npx tsc --noEmit -p .` separately (no shell).
- **Edit-loss check:** after last round's lost edits, I grepped for a marker from each of the 19 `galaxyScene.ts` edits and each storage/rail edit. All are present.
- **One-motif check:** grepping `src/three/fx/*` for `THREE.Mesh`, `TextureLoader`, `SpriteMaterial` and `CanvasTexture` finds none. Every `Math.random()` there is transient: UFO flights and timing, streak spawn and timing, beam target, trail jitter.
- **Void and cap checker:** implemented, dev-only, prints to the console. It covers planned-object clearance, satellite shells and the point cap. UFO paths and streaks are validated at spawn time. I **haven't seen its output**.
- **Determinism tool:** `window.__galaxyDebug()` returns the plans, the satellite phase table at t = 0, parity and violations. Diff this JSON across two loads to check determinism. **I haven't run it.**
- **Not verified at all** (no browser here): visuals and screenshots, frame times at any tier, touch and 390px layout, the reduced-motion and tier toggles at runtime, mount/unmount leak checks, and whether the planner places every object without a warning.

## 6. Known risks and trade-offs

- **Placement:** if the planner fails to place an object, it logs `expansion: could not place …` in dev and silently omits it.
- **Visual balance:** giants are high (y 120–170) and far away, so they should read as background at observatory framing, but I haven't seen the framing.
- **Small allocations:** the expansion update still creates a few iterators and closures each frame (`for…of` over maps, the UFO `forEach`, the `[core, halo, speck]` array). There are no per-frame `Vector3` or typed-array allocations.
- **Detection mostly by tap:** discovery by proximity rarely triggers, because the camera states don't fly near the extra worlds. Most discoveries will come from tapping or the fly-to list. The Heart Belt can only be found by proximity.
- **3D hover titles:** the 3D hover label for spiral stars still shows canonical titles (the scene builds from `EVENTS`). Satellite labels use the store titles, including admin edits.
