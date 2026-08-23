# Codex Visual Report — Study Living Diorama

## 1. Mode and normalized brief

- **Mode:** Design
- **Goal:** turn the supplied twilight study illustration into an animator-facing layer and motion specification for PixiJS composition.
- **Requested outputs:** two 1024×768 exploded-view sheets (record player and wish jar) plus one 1586×992 full-scene animation map.
- **Visual invariant:** preserve the reference object's silhouette, palette, materials, watercolor contour language, and twilight mood; add only exploded spacing or restrained storyboard annotations.
- **Motion principle:** low-frequency, low-amplitude, staggered motion. Idle movement should make the room feel inhabited without becoming a looping GIF wall.
- **Generation route:** bundled `imagegen` skill, built-in `image_gen` tool only. No CLI or API-key fallback was used.

## 2. Evidence inventory

| Evidence | Declared role | Direct pixel observations |
|---|---|---|
| `D:\Repo\our-world\codex-visual\20260810-024945Z\room-study-twilight-clean.png` | Sole reference / full-scene edit target | 1586×992 watercolor room. The record player is an open warm-brown suitcase unit in the lower foreground with a black record, brass center, and tonearm on the right. The wish jar is on the right side of the desk with a stout glass body, ribbed rim, tan ribbon, multiple amber stars, and a broad warm spill light. The scene also visibly contains two curtains, a lamp, a round wall clock, several plants, and a coffee cup. |
| `Ai/PROJECT.md` | Product context | Fixed-camera room; objects are diegetic feature entrances; the scene is the primary visual layer. |
| `Ai/TODO.md` | Implementation context | The project already uses PixiJS v8 with a static background plus animation-slot layers; clock hands and lighting are runtime-composited. |
| `Ai/STYLE.md` and `Ai/UX.md` | Motion and interaction constraints | Watercolor warm-light style; low-frequency/random motion; quiet placement-product behavior; hover may upgrade object motion, while default hotspot treatment remains restrained. |

Source preservation evidence: the source remains at its original path, size, timestamp, and SHA-256 `c72f3056a341f67b86d86e5375b45d36c3a31f9931f960396cb9fadb6c491a73`. No source file was overwritten.

## 3. Executive verdict

The three requested design sheets are complete and implementation-usable as visual direction.

- The record-player sheet cleanly separates the static case, true-circle platter, tonearm, and control/glint layer; all four labels are readable and the 5° motion arc is explicit.
- The jar sheet cleanly separates the glass, seven stars, ribbon, and exterior halo; the star group communicates both idle drift and hover acceleration/brightness.
- The scene map preserves the full 1586×992 composition and marks all seven requested motion families without a legend panel or large title. Its warm ivory line work is subordinate to the room, though the shared plant-routing line is intentionally the most expansive annotation.

These are animation design mockups, not final alpha-cut production sprites. Production layers should be masked from the original reference and registered against the untouched source plate.

## 4. Concept and implementation matrix

### 4.1 Record player

| Layer name | Animated | Runtime order / pivot | Idle recommendation | Hover recommendation |
|---|---:|---|---|---|
| `turntable_base` | No | Bottom; includes suitcase body, open lid, platter well, fixed controls, contact shadow, and watercolor backfill under removed moving parts | None | None |
| `turntable_platter` | Yes | Above base; pivot exactly at brass spindle. Author as a true circle, then apply the source-perspective vertical squash in PixiJS | `rotation += 360° / 8s`; **linear**, continuous, no acceleration seam | Keep the same speed so hover does not break musical continuity |
| `turntable_tonearm` | Hover only | Above platter; pivot at rear tonearm bearing, not at the stylus | Static | `0° → +5°` in 420ms `easeInOutSine`, hold 160ms, return in 620ms `easeOutCubic`; total ≈1.2s |
| `turntable_control_glint` | Hover only | Topmost additive/screen overlay; anchor to knob and lid/control highlights | Optional alpha 0.10–0.16, otherwise hidden | Alpha `0.15 → 0.95 → 0.15`, scale `0.92 → 1.08`, 720ms `easeOutQuad`; one pulse per hover entry |

Implementation note: rotating the visibly elliptical record directly will wobble. Keep the source asset circular in texture space and apply the fixed perspective squash to its parent container after rotation.

### 4.2 Wish jar

The diagram shows four conceptual groups. For correct glass occlusion, the static glass group should ship as a back/front sandwich.

| Layer name | Animated | Runtime order / pivot | Idle recommendation | Hover recommendation |
|---|---:|---|---|---|
| `jar_halo` | Hover emphasis | Behind every jar layer; pivot at jar center-bottom | Alpha 0.12–0.18, static | Fade to alpha 0.38–0.45 in 260ms `easeOutQuad`; while hovered, scale `1.00 ↔ 1.025` over 2.4s `easeInOutSine`; fade back in 380ms |
| `jar_glass_back` | No | Behind stars; contains body tint, rear rim, and low-contrast refraction | None | None |
| `jar_star_01` … `jar_star_07` | Yes, independent | Between glass back and front highlight; each star keeps its own anchor and phase | Vertical sine ±2–4px; periods 4.8–7.2s; opacity 0.68–0.95 over 3.6–6.0s; `easeInOutSine`; randomized phase | Periods 2.4–3.2s; vertical amplitude ±4–7px; global brightness/alpha +0.12; preserve individual phases |
| `jar_glass_front_highlight` | No | Above stars; contains front rim, specular strokes, and edge highlights | None | None |
| `jar_ribbon` | Hover only | Frontmost at neck; pivot at the knot | Static | Rotation ±2.2° and x drift ±1px, 1.1s `easeInOutSine`, two diminishing cycles |

Do not merge the stars into one baked sprite. Independent phases are the difference between “floating lights” and a rigid glowing sticker.

### 4.3 Full-scene motion map

| Object / layer | Idle parameters | Hover behavior | Notes |
|---|---|---|---|
| `turntable_platter` | 8s/revolution, linear | Tonearm/glint upgrade as above | Existing music hotspot can own the hover state |
| `jar_star_01..07` | ±2–4px, 4.8–7.2s, staggered | 2.4–3.2s + brighter halo | Never synchronize all stars |
| `lamp_halo` | Alpha 0.84–1.00 and scale 0.99–1.015 over 4.6s `easeInOutSine` | Optional +0.04 alpha only | Keep the lampshade itself static; animate the light pool |
| `curtain_left`, `curtain_right` | x ±1.5–2.5px, rotation ±0.25–0.40°, 9–13s `easeInOutSine`; opposite/staggered phases | No required upgrade | Pivot at each tie/upper attachment; avoid moving the window frame |
| `clock_hands` | Real-time linear motion: minute 0.1°/s, hour 0.00833°/s; optional second hand 6°/s or 1Hz step | None | Reuse the existing runtime clock system; do not bake hands into the scene map |
| `plant_*_leaves` | Occasional rotation ±0.5–0.8°, active duration 2.8–4.2s, random pause 14–26s, `easeInOutSine` | Optional one slightly stronger sway on focus | Seed each plant separately; never trigger the whole room together |
| `coffee_steam_particle` | Spawn every 1.2–1.8s; life 3.8–5.2s; y −22 to −34px; x drift ±4px; scale 0.8→1.1; alpha 0→0.28→0 | None | Two alternating wisps are enough; a tiny watercolor puff texture may be reused |

Global safeguards:

- Pause or heavily throttle when the page is hidden or unfocused.
- Cap decorative animation at 24–30fps.
- Under `prefers-reduced-motion`, freeze curtains/plants, disable steam particles, keep clock accuracy, and reduce light breathing to a static midpoint.
- Use seeded random delays so reloads are stable enough to debug while objects still feel unsynchronized.

## 5. Detailed findings and visual QA

| Deliverable check | Status | Observed evidence | Production implication |
|---|---:|---|---|
| Record player has four distinct groups | Pass | Base/lid, circular platter, tonearm, and knob/glint are spatially separated with leader lines | Directly maps to four conceptual animation groups |
| Record-player motion annotation | Pass | `ROTATE · IDLE 8s`, `SWING · HOVER 5°`, and `GLOW · HOVER` are legible; platter and arm arcs are visible | Motion intent is understandable without prose |
| Jar has four distinct groups | Pass | Glass, seven stars, ribbon, and halo are spatially separated | Star count lands inside the requested 5–7 range |
| Jar idle/hover hierarchy | Pass | Stars carry separate vertical arrows; hover acceleration/brightness is stated; ribbon has a sway arc; halo has radiance strokes | Supports independent star phase plus grouped hover state |
| Watercolor/style continuity | Pass | Warm wood, amber glow, navy paper, broken pigment edges, and ink-like contours match the reference's painterly vocabulary | Suitable as the same-world animation handoff |
| Full-scene coverage | Pass | Record, jar, lamp, curtains, clock, plant family, and cup steam are all marked | All requested motion families are present |
| Full-scene obstruction | Pass with caution | Open journal, chair, phone, jar, and wall photos remain readable. The plant-family leader traverses a long path around the desk/chair | Keep that long branch at ≤45% alpha in production; split it at narrow viewports if needed |
| Text restraint | Pass | Only short English motion words/phrases are used; there is no title block or paragraph | Maintains storyboard-note character |
| Requested dimensions | Pass | Exploded sheets are 1024×768; scene map is 1586×992 | Ready for review and handoff at requested canvas sizes |

Observed spatial logic:

- The record player is foreground and low in the composition, so its circular motion icon is safest below/right of the platter, away from the book and cup.
- The wish jar already emits the scene's strongest local glow; its annotation uses vertical arrows at the jar edge rather than another large halo label over the desk.
- Curtains occupy high-contrast negative space against the window; small warm arrows remain legible without panels.
- Steam is the only dotted path, which visually distinguishes particle motion from rigid transform arrows.

## 6. Uncertainty and comparability limits

- `anim-exploded-turntable.png` and `anim-exploded-jar.png` are reference-conditioned reconstructions, not literal pixel extractions. They preserve the visible design language and object identity, but small construction details should be traced/masked from the original source during production.
- `anim-scene-map.png` preserves the source composition and requested size on visual inspection, but image generation can repaint local brush texture. Treat it as an annotation board, not as the runtime base texture. The untouched source remains the canonical background.
- The reference shows only one twilight frame. The recommended amplitudes assume the same 1586×992 coordinate system; day/night variants may need small alpha changes, especially for lamp and jar emission.
- Static images cannot prove timing feel. Final acceptance requires a short PixiJS prototype running at 960px width and 640×400 window size.

## 7. Recommendation and production order

1. **Lock registration first.** Duplicate the untouched 1586×992 source into an asset-working area; define integer bounding boxes, anchors, and pivots for every moving object before painting.
2. **Build the clean plate.** Remove the platter, tonearm, stars, ribbon edges, curtain edges, plant leaf clusters, and cup steam zones from a working copy; watercolor-inpaint what lies behind them. Keep 6–12px overlap bleed to prevent halos.
3. **Produce hard-pivot mechanical layers.** Cut `turntable_base`, author a true-circle `turntable_platter`, then cut `turntable_tonearm` and `turntable_control_glint`. Validate the platter after the runtime perspective squash.
4. **Produce the jar occlusion sandwich.** Export `jar_halo`, `jar_glass_back`, seven separate star sprites, `jar_glass_front_highlight`, and `jar_ribbon` in that render order. This is the highest-value compositing check because glass and glow expose edge mistakes immediately.
5. **Add light-only layers.** Author `lamp_halo` and the jar halo as soft premultiplied-alpha overlays; avoid baking light changes back into the base.
6. **Cut deformable organics.** Separate curtain moving sections at their ties and plant leaf clusters at pot/rim anchors. Retain static pots and main stems in the base where possible.
7. **Add procedural steam.** Reuse one or two small watercolor steam textures as Pixi particles instead of exporting a long strip animation.
8. **Integrate and QA.** Check seams on twilight plus other mood plates, verify no synchronized motion, test hover re-entry/debounce, test hidden-tab pause, then capture 1586×992, 960px-wide, and 640×400 evidence frames.

Recommended implementation priority: record-player platter → jar stars/glass → lamp halo → steam → curtains → plants. This front-loads the two interactive objects and the most registration-sensitive compositing.

## 8. Artifact manifest

| Artifact | Size | Bytes | SHA-256 | Purpose |
|---|---:|---:|---|---|
| `anim-exploded-turntable.png` | 1024×768 | 1,511,210 | `f439618b6ca713c24b9ac7a79b1a75b8a97230e71c6f557b081999556c163402` | Four-group record-player exploded animation sheet |
| `anim-exploded-jar.png` | 1024×768 | 1,596,342 | `ab9ea14361ec47c5d3b696717ae5458afcbcfc0b4f64ae714ee90fb523a507c2` | Four-group wish-jar exploded animation sheet |
| `anim-scene-map.png` | 1586×992 | 2,579,033 | `03db58e9e08585f706ca6463cf39fa730fb746bdaf285e1f9ac34c2f439945b8` | Seven-family living-room animation overview |
| `codex-report.md` | Markdown | — | — | Motion parameters, QA, risks, and production sequence |

All artifacts are under `D:\Repo\our-world\.claude\skills\monet\codex-visual\20260823-054106Z`.

## 9. Final prompt set

The built-in image generator received the supplied room image as the sole reference/edit target.

1. **Record player:** 4:3 watercolor-and-ink animator sheet; strictly reference-matched open brown suitcase turntable; four offset groups (static base/lid, true-circle platter, tonearm, knob/glints); dark indigo paper; thin warm-cream leaders; exact labels `STATIC BASE`, `PLATTER · ROTATE · IDLE 8s`, `TONEARM · SWING · HOVER 5°`, `KNOB · GLOW · HOVER`; no title, paragraphs, UI, unrelated props, or photorealism.
2. **Wish jar:** 4:3 watercolor-and-ink animator sheet; strictly reference-matched glowing glass jar; four offset groups (glass, seven stars, ribbon, exterior halo); dark indigo paper; thin warm-cream leaders; exact labels `GLASS · STATIC`, `STARS · FLOAT · IDLE`, `HOVER · FASTER + BRIGHTER`, `RIBBON · SWAY · HOVER`, `HALO · GLOW · HOVER`; no title, paragraphs, UI, unrelated props, or photorealism.
3. **Scene map:** preserve the full 1586×992 reference composition; add only restrained warm ivory-gold storyboard lines/icons for record `rotate`, jar `float`, lamp `breathe`, curtains `sway`, clock `tick`, plants `sway`, and cup `steam`; no legend, title, boxes, neon, UI, new objects, crop, or watermark.
