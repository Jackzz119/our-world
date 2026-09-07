# Living-prop turntable separation

## 1. Mode and normalized brief

Mode: **design**. Generate three static machine clean plates in the reference crop registration, one top-down vinyl albedo and one registered tonearm albedo. Preserve painted lighting only on static machines. Moving assets require pure green backgrounds and no baked lighting. All five assets must be newly generated, not extracted from the source painting. Requested QA: approximately 3px registration, no record/arm ghosts, flat illumination, clean green edges, maximum two generations per asset, and a side-by-side review.

Execution: built-in `image_gen` exclusively, using the bundled imagegen skill. No CLI/API-key generation. No source image overwritten; no painting pixels used in delivered parts. The separate diagnostic overlay uses a copy of reference pixels only for inspection. Repository context read: ai/PROJECT.md, ai/TODO.md and ai/STYLE.md. User asset requirements take precedence over existing runtime extraction practices.

## 2. Evidence inventory

All four supplied images were inspected directly at pixel-image level.

| Reference | Role and observation |
|---|---|
| crop-golden.png | 1020×780 registration and golden light reference; warm low-contrast wood and vinyl sheen |
| crop-twilight.png | 1020×780 registration and twilight light reference; darker neutral vinyl, diagonal tonearm in lower right; authoritative arm pose |
| crop-night.png | 1020×780 registration and night light reference; warm edge light, dark environment; arm highlight/detail differs from twilight |
| arts/rooms/study/source/twilight.png | 1586×992 room context only; warm lamp against cool dusk, small turntable on foreground table |

Crop paths share `C:\Users\Jackzz\AppData\Local\Temp\claude\D--Repo-our-world\5fc66000-0709-43fd-b121-8852f7b3474f\scratchpad\parts\gen2\`. Region coordinates and 3× upscaling are supplied by the brief, not independently reconstructed from source.

## 3. Executive verdict

**Deliverables produced; strict production acceptance NOT passed.** The three machine images visibly remove the record, label, arm and pivot, while retaining the recognizable composition and mood. However, generated repainting changes texture and some geometry, so “everything else exactly as painted” is not met literally. The selected arm is substantially better registered than its first attempt, but its silhouette and baked top-edge light fail the strict requirements. The selected disc has restrained, nearly uniform illumination, but is not a mathematically perfect circle or perfectly rotationally uniform albedo.

Use these as reviewable generation candidates. Do not silently promote this set as fully accepted engine-ready parts.

## 4. Deliverable and attempt matrix

| Final file | Size | Attempts | Selected | Assessment |
|---|---:|---:|---:|---|
| machine-golden.png | 1020×780 | 1 | 1 | Empty well with pin; no visible record/arm ghost; warm mood retained; repaint drift |
| machine-twilight.png | 1020×780 | 1 | 1 | Empty well with pin; no visible record/arm ghost; darker mood retained; repaint drift |
| machine-night.png | 1020×780 | 1 | 1 | Empty well with pin; no visible record/arm ghost; warm dark mood retained; repaint drift |
| platter.png | 1024×1024 | 2 | 1 | First has subtler grooves and label closer to reference; second has heavy concentric lines and brighter label |
| tonearm.png | 1020×780 | 2 | 2 | Second restores lower-right placement; first wrongly enlarged and moved upward; second still not strict albedo |
| review.png | 1536×564 | deterministic board | — | machine-twilight, disc on checkerboard, arm on checkerboard |

Total: **7 built-in image generation calls**. No asset exceeds two attempts. Machine outputs were not retried; the remaining shortcomings are documented rather than claimed fixed.

## 5. Detailed findings and observed evidence

| Severity | Evidence | Impact | Concrete correction required |
|---|---|---|---|
| High | registration-overlay.png shows original dark arm still visible below/right of generated tube; new headshell and post contours differ | Full silhouette does not satisfy approximately 3px alignment; replacement may visibly jump | Fit generated silhouette to reference landmarks and contour, then compare again at full resolution; further generation would exceed this run's arm attempt cap |
| High | tonearm.png has a pale curved top edge on pivot, top/side separation and dark bands; material also trends reddish | Engine relighting would compound existing light; “no highlights, shadows or outlines” fails | Remove directional value differences while preserving material distinctions; this was not performed by an unrequested hand-painted substitute |
| High | All machine outputs redraw wood marks, lid badge and fine contours; unchanged lid ROI differs by 5–7 RGB levels on average | Not pixel-identical outside removed parts; seams or crossfade texture changes are possible | Registration and localized preservation workflow required before deployment; no source cutout/compositing substituted in the final machines |
| Medium | Disc foreground bounding box is x30–992, y27–993 inclusive: 963×967px, center approximately (511,510) | Diameter slightly under requested ~1000; not a perfect circle; rotation may show slight silhouette variation | Geometric normalization to an exact centered circle and recheck; not done beyond canvas resizing/background normalization |
| Medium | Disc mean brightness varies by angular sector, range 1.36/255 across the tested annulus | Strict same-albedo-at-each-radius requirement not proven; there is low residual nonuniformity | Radial albedo normalization or a stricter texture pass required for mathematical invariance |
| Low | Generated originals have dimensions different from prompt sizes | Native generation does not enforce exact output dimensions | Final files were deterministically resampled to requested canvas dimensions; original attempts retained |

### Static machine inspection

Each shows one dark, unlabelled recessed area, rim and central spindle. No tan record label, vinyl grooves, diagonal arm or pivot post remains. The rim is relatively pronounced and can resemble a platter edge, but the interior has no record-specific grooves or label. The hidden well is a generated reconstruction; the painting cannot establish its true appearance. Painted shading within the well is allowed because these are static assets.

Overall crop layout is close. The central pin remains near the original center, but there is no measured full-field geometric guarantee of ≤3px. Golden's pin also appears lower than the reference. Photometric differences are not misrepresented as registration measurements.

### Measured checks

Full numeric logs: `qa-metrics.txt` and `qa-registration.txt`.

- Final sizes: machines and arm 1020×780, disc 1024×1024.
- Tonearm foreground bounding box after normalization: **(537,466)–(824,693)**, inclusive. This checks placement, not contour agreement.
- Exactly pure green pixels: disc **318,899**; arm **784,054**.
- Normalization classifies G > R+12 and G > B+12 as green, replaces with (0,255,0), then caps any residual green dominance in retained pixels. Thus non-key pixels have no positive green-channel dominance. This is a deterministic color test, not a semantic segmentation guarantee.
- Retained pixels modified by that cap: disc 63,803; arm 76. The disc count includes slight color-channel imbalance in its dark surface, not only edge spill. This is a small palette modification, recorded explicitly.
- No green fringe is visible on the inspected checkerboard preview. The hard key threshold may sacrifice subpixel edge coverage; no claim of a production alpha matte is made. Final requested assets remain RGB green-screen PNGs.
- Unchanged lid rectangle x400–849, y20–319 RGB mean absolute difference: golden **7.28/255**, twilight **7.17/255**, night **5.35/255**. These confirm repaint differences, not geometric error.
- Disc angular brightness test: 12 sectors in radius 260–439px, center (511,510); sector means **26.64–28.01/255**, range **1.36/255**. This is an annular average, not a per-radius proof; grain and subtle shading cannot be completely separated by this test.

## 6. Uncertainty and comparability limits

The three crops are comparable for framing, but lighting and painted arm detail differ. Only twilight defines the independent arm. The full room is contextual and must not be scored as a fourth crop. The top-down disc intentionally has a different projection, so it cannot be overlaid directly without the engine's perspective transform. No runtime animation, relighting or in-engine seam test was performed. The checkerboard board scales full canvases for review; it is not a composited engine simulation.

## 7. Recommendation and next actions

Keep the selected files and the attempt originals as evidence. Prioritize arm contour fitting and removal of baked highlights before integration. Then correct disc circularity and rotational albedo invariance. Validate machine registration and repaint seams against source at native room display scale. Do not replace current production assets based solely on this delivery. Source images and application code remain untouched.

### Generation prompt record (normalized constraints)

Machine prompts each referenced their own mood crop, requested 1020×780, identical framing within 3px, preservation of environment/case/lid/lighting, removal of record/label/grooves and all tonearm/pivot/shadows, and a dark matte empty well with spindle near (489,477).

Disc attempt 1 referenced twilight for material only: 1024 square, diameter1000, center512, plain peach/tan label350, small green center hole, faint grooves, strict unlit angular uniformity. Attempt 2 emphasized exact circle/12px margin, no angular variation or sheen and a 12px hole. Attempt 1 was selected for quieter texture and label tone.

Arm attempt 1 referenced twilight and specified bbox535–835/466–698, pivot near788/503 and headshell573/653, no environment, pure green and strict albedo. Attempt 2 strengthened “small lower-right sprite, not centered product shot”, pivot top789/492, tube770/507→590/638, headshell end552/685, no enlargement and no directional shading. Attempt 2 improved placement but did not fully follow flat-light constraints.

## 8. Artifact manifest

All task artifacts are inside `D:\Repo\our-world\codex-visual\20260907-053852Z`.

- `codex-report.md` — this report.
- `machine-golden.png`, `machine-twilight.png`, `machine-night.png` — final selected static candidates.
- `platter.png`, `tonearm.png` — final selected green-screen candidates.
- `review.png` — required side-by-side checkerboard preview.
- `registration-overlay.png` — generated arm over unchanged twilight reference, diagnostic only, not a production part.
- `machine-golden-attempt1.png`, `machine-twilight-attempt1.png`, `machine-night-attempt1.png` — native generation originals.
- `platter-attempt1.png`, `platter-attempt2.png`, `tonearm-attempt1.png`, `tonearm-attempt2.png` — native generation originals, including rejected candidates.
- `qa-metrics.txt`, `qa-registration.txt` — measurement evidence.
- `generated-paths.json` — generation provenance for first five outputs and second arm (second disc native output is preserved locally as platter-attempt2.png).
- `prepare.ps1`, `measure.ps1` — reproducible canvas/background/board processing and measurement helpers. No source-art extraction occurs in final part processing.

Built-in generation automatically saved native outputs under its managed generated_images directory; copies are preserved here. All subsequent task-authored artifacts were saved only to this output directory.
