Production asset delegation from Monet (lead art director, Claude). You produce the images; Monet assembles and verifies them. THIS IS PRODUCTION, NOT CONCEPT ART: these images become the layered room of the first playable scene of "Our World", composited at runtime by a PixiJS 2D engine. Geometric stability between layers matters more than novelty. Keep the approved concept style exactly.

## Product and camera rule

"Our World" is a companion app for couples: the camera IS the viewer, seated at a small table; across the table sits the partner's half-body avatar facing the camera; the viewer's own hands, sleeves and mug are in the foreground. This room is the study (书房): a small wooden table by a big window over a rainy night city, a table lamp on the left, a record player on the right, a few books and a polaroid on the table. In this build the viewer is 小满 (her oversized cream knit cardigan sleeves in the foreground) and the partner across is 阿屿.

- 阿屿: dark navy-black tousled hair, thin round glasses, charcoal hoodie; calm warm smile. Identity must match the attached character references.
- 小满 (only her sleeves and hands appear): oversized cream knit cardigan sleeves.

## User rules that bind this run

1. Parts must be produced by generation with genuine transparency; no hand-cutting, no paint-fixing afterwards. If the built-in tool cannot return real transparency for a layer, say so in the report instead of faking it.
2. "Dead objects keep the painted light; moving parts take the scene's light": the room plates carry their painted light; parts that will move at runtime (produced in a later run) are painted flat.
3. Never draw glowing rings, outlines, halos or pin markers around objects.
4. Style lock (identical to the attached references): high-end 2D anime CG illustration at gacha key-visual quality; semi-realistic anime proportions (not chibi, not photoreal); clean fine line art; soft cel shading with painterly gradients; warm subsurface skin; detailed hair highlights; practical key light (the table lamp) plus a contrasting cool ambient / rim light from the window; bloom, soft bokeh, shallow depth of field; strong foreground / midground / background separation.
5. Original characters only; do not name living artists or studios in prompts.

## Attached references

1. A1-keyart.jpg: the approved study look (the woman in it is NOT used here; take the room, lamp, window, record player, table and light).
2. CH-mirror.jpg: the RIGHT half is the exact target relationship: 阿屿 across the table, the viewer's cream knit sleeves holding a mug in the foreground.
3. CH-ayu-sheet.jpg: 阿屿's identity lock.
4. LW-03-golden.jpg and 5. LW-04-bluehour.jpg: how the same table reads at golden hour and blue hour.

## Deliverables (exact file names; all landscape, all the SAME pixel size as master-night.png)

1. `master-night.png` — the full look target. Rainy night, lamp ON. 阿屿 sits across the table facing the camera, reading a paperback held in both hands, forearms resting on the table, glancing slightly down at the page. Foreground bottom edge: the viewer's two hands in cream knit cardigan sleeves around a ceramic mug. Left: a table lamp with a fabric shade and a thin metal pull chain hanging from it. Right: a record player with the lid open and a record on it. On the table: two books, a face-down polaroid, 阿屿's own mug on his side. Behind him: a simple wooden chair back, and behind that the big window over a rainy night city, rain streaks on the glass. Reflections in the glass: faint and low contrast only. Composition: frontal table whose FAR edge is one straight horizontal line; 阿屿's torso emerges from behind that far edge; his head has about 8% headroom; nothing important within 4% of the frame edges. Use the largest landscape size the tool supports.
2. `plate-night-on.png` — EDIT of master-night: remove 阿屿 completely (reconstruct the empty wooden chair back, the window and the city behind where he was), remove the viewer's hands and her mug, remove 阿屿's mug, remove the lamp's pull chain, and remove the record and the tonearm from the record player (the platter well is EMPTY; keep the spindle pin and the arm's post base). Everything else must stay where it is: same furniture edges, same window mullions, same table edges, same light.
3. `plate-night-off.png` — EDIT of plate-night-on: the table lamp is switched off. No warm pool of light; the shade is dark; the room is lit only by the cool blue city glow through the window; keep a faint warm glow from distant city lights. Geometry unchanged.
4. `plate-twilight-on.png` — EDIT of plate-night-on: blue hour. Deep blue dusk sky with a last violet band on the horizon, city windows switching on one by one, the lamp just switched on (softer than at night). Rain optional: keep the glass dry here. Geometry unchanged.
5. `plate-twilight-off.png` — EDIT of plate-twilight-on with the lamp off.
6. `plate-golden-on.png` — EDIT of plate-night-on: golden hour. A low sun near the horizon outside the window, long warm light shafts across the table with a few dust motes, warm rim light on the furniture; the lamp is on but weak against the sunlight. Dry glass. Geometry unchanged.

Geometry stability is the acceptance criterion for 2–6: when any plate is overlaid on plate-night-on, the window frame, mullions, table edges, lamp, record player and chair must line up. If an edit drifts noticeably, redo that single plate from plate-night-on; keep the drifted draft with an -initial suffix.

## Report

Write codex-report.md in Simplified Chinese: for each file, what it shows, its pixel size, and any visible drift or artefact. Measure on master-night.png, by inspecting pixels, the approximate pixel coordinates of: the table far-edge line (y), 阿屿's head top and face center, the lamp shade center and the point where the pull chain hangs, the record player's platter center and the platter's approximate ellipse (center, horizontal and vertical radii), each window glass pane as a rectangle, the viewer's mug rim center, and 阿屿's mug position. Say how you measured them. Monet will re-measure precisely, so approximate values are fine.
