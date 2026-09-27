Production asset delegation from Monet (lead art director, Claude). THIS IS PRODUCTION, NOT CONCEPT ART: these transparent parts are composited at runtime by a PixiJS 2D engine over room plates of the study in "Our World". Exact placement and clean alpha matter more than anything else.

## Source of truth

`ai/design_system/codex-visual/production/study/20260927-074826Z/master-night.png` (attached as the first reference) is the approved master frame: rainy night, lamp on, 阿屿 across the table reading, the viewer 小满's cream knit sleeves holding a floral mug in the foreground. A parallel run is producing the clean plates from it in the same folder (`plate-night-on.png` will be the room with everything movable removed). Load master-night.png with view_image and make every deliverable below as an EDIT of it, so position, scale and perspective match it exactly. If `plate-night-on.png` already exists in that folder when you start the hoodie, view it too.

## User rules that bind this run

1. Parts are produced by generation with genuine transparency (built-in image_gen transparent background, alpha preserved). No hand-cutting, no chroma keying, no paint-fixing afterwards. If transparency fails for a part, report it instead of faking it.
2. "Dead objects keep the painted light; moving parts take the scene's light": the tonearm, the record and the lamp chain move at runtime, so paint them with flat, even, neutral light (their true colours, soft form shading, no specular streaks, no coloured rim). The hands, the two mugs and the hoodie keep a soft version of the master's lamp light.
3. Never draw glowing rings, outlines or halos.

## Deliverables (exact names; every plate-space part has EXACTLY master-night.png's pixel size and is fully transparent outside the object)

1. `fg-her-hands.png` — only the viewer's two hands in cream knit cardigan sleeves around the floral ceramic mug (with its coffee), exactly where they are in the master. Everything else transparent.
2. `prop-ayu-mug.png` — only 阿屿's own mug standing on the table at his side, exactly where it is in the master.
3. `prop-ayu-hoodie.png` — 阿屿's charcoal hoodie draped over the back of his empty wooden chair (the "he stepped away" trace), sitting on the chair back where the chair is in the master, behind the table. Only the hoodie; transparent elsewhere.
4. `part-tonearm.png` — only the record player's tonearm at rest (post top, arm tube, headshell), exactly where it sits in the master; flat neutral light.
5. `part-lamp-chain.png` — only the lamp's thin pull chain and its small pendant, hanging exactly where it is in the master; flat neutral light.
6. `part-vinyl.png` — a 1024×1024 square: a black vinyl record seen perfectly top-down, the circle inscribed in the square, fine concentric grooves, a centre label with an abstract warm illustration (no text, no letters), the spindle hole in the exact centre, flat neutral light, no highlight streaks (the engine adds them), transparent outside the circle.

## Verification and report

For each plate-space part, overlay it on master-night.png and confirm it lands on the original pixels (report the visible offset, if any). Write codex-report.md in Simplified Chinese: per file, what it shows, its pixel size, whether the alpha is genuine, the bounding box of the non-transparent pixels, visible defects, and the overlay result. Keep superseded drafts with an -initial suffix.
