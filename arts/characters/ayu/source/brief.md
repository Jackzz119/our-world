Production asset delegation from Monet (lead art director, Claude). THIS IS PRODUCTION, NOT CONCEPT ART: these transparent pose sprites become the partner 阿屿 sitting across the table in "Our World", swapped and animated at runtime by a PixiJS 2D engine. Consistency between poses matters more than anything else: the engine cross-fades between them in place, so any drift of the body, the face or the scale is visible.

## Source of truth

`ai/design_system/codex-visual/production/study/20260927-074826Z/master-night.png` (first reference) is the approved frame: 阿屿 across the table reading a paperback, forearms on the table. The other references lock his identity (character sheet) and show the pose vocabulary (pose library, presence states, touch reactions). Load master-night.png with view_image before generating.

阿屿: dark navy-black tousled hair, thin round glasses, charcoal hoodie with drawstrings; calm, warm smile. Style lock: high-end 2D anime CG illustration at gacha key-visual quality; semi-realistic anime proportions (not chibi, not photoreal); clean fine line art; soft cel shading with painterly gradients; warm subsurface skin; detailed hair highlights. Original character; do not name artists or studios.

## Canvas and framing (identical for every pose)

- Landscape canvas of exactly the same pixel size as master-night.png (1536×1024 if the tool returns that), fully transparent background with clean hair edges and no halo.
- 阿屿 is seated behind an invisible frontal table, facing the camera, drawn LARGER than in the master: his half-body fills the canvas, centred horizontally, head top about 60 px from the top edge.
- The table's far edge is an invisible straight horizontal line at about y = 900. Nothing of his torso is drawn below that line (it is hidden behind the tabletop). His forearms, hands and anything he holds rest ON the invisible tabletop and may extend below that line, down to about y = 1000, in the same perspective as the master (viewer slightly above the table).
- Shoulders, chest and the torso's cut line stay at the same place and scale in every pose; only head, arms, hands, face and props change.

## Light

"Moving parts take the scene's light" (user rule): paint him with soft, even, slightly warm light from the front-left, gentle form shading, no strong coloured rim light, no cast shadows outside his figure. The engine tints him for every hour and for the lamp being on or off.

## Poses (exact file names)

Make `ayu-reading-open.png` first by redrawing him exactly as in the master at the framing above. Then derive every other file as an edit of it, keeping the invariants.

1. `ayu-reading-open.png` — holding the paperback in both hands, eyes on the page, soft smile.
2. `ayu-reading-closed.png` — identical, eyes closed (the blink frame). Only the eyes change.
3. `ayu-glance-open.png` — same book pose, but he lifts his eyes from the page to look straight at the camera with a soft smile.
4. `ayu-glance-closed.png` — the glance with eyes closed (blink frame). Only the eyes change.
5. `ayu-writing-open.png` — writing in a small notebook on the table with a pen in his right hand, head tilted slightly down, eyes on the page.
6. `ayu-writing-closed.png` — the writing pose with eyes closed (blink frame).
7. `ayu-sip-open.png` — both hands lifting his mug (the same mug as the one next to him in the master) to drink, eyes looking up over the rim at the camera.
8. `ayu-sip-closed.png` — the sip with eyes closed (blink frame).
9. `ayu-asleep.png` — asleep with his head resting on his folded arms on the table, face turned slightly toward the camera, eyes closed, peaceful; glasses still on. His shoulders may lower toward the table; the torso cut line stays at the same y.
10. `ayu-patted.png` — being patted on the head: eyes happily closed, a slight blush, head tilted up a little toward the (unseen) hand, hands resting on the book on the table.
11. `ayu-poked.png` — just poked: a small flinch into a laugh, eyes squeezed shut in the laugh, shoulders raised slightly, hands still near the book.

## Verification and report

Check every file against ayu-reading-open.png at 50% opacity: shoulders, torso cut line and scale must align; report any drift in pixels and regenerate only a file that clearly drifts (keep the draft with an -initial suffix). Write codex-report.md in Simplified Chinese: per file, what it shows, its pixel size, whether the alpha is genuine, the bounding box of the non-transparent pixels, the measured drift against reading-open, and visible defects (hands, glasses, hair edges).
