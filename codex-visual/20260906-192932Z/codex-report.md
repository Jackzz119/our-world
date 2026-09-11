# Turntable layered generation — design

## 1. Mode and normalized brief

Mode: **design**. Generate, rather than cut from the painting, three mood-specific clean plates and three isolated tonearms. Deliver all six at 1020×780, registered to the reference crops, plus four-column reviews. Preserve the original soft watercolor painting. Acceptance: approximately 3px arm registration; every non-arm pixel within 2/255; complete removal including pivot and cast shadow; isolated arm on pure #00FF00.

## 2. Evidence inventory

All four attached images were inspected directly. Three crops are registration references; the full room is context only.

| Reference | Location | Role / observation |
|---|---|---|
| crop-golden.png | C:\Users\Jackzz\AppData\Local\Temp\claude\D--Repo-our-world\5fc66000-0709-43fd-b121-8852f7b3474f\scratchpad\parts\gen\crop-golden.png | 1020×780; warm lifted shadows, soft brown arm |
| crop-twilight.png | Same directory, crop-twilight.png | 1020×780; darker, cooler vinyl and case shadows |
| crop-night.png | Same directory, crop-night.png | 1020×780; warmer highlights; visibly different arm/head detail and additional lower diagonal form |
| twilight.png | D:\Repo\our-world\arts\rooms\study\source\twilight.png | 1586×992 room context: small floor-level turntable below desk, lamplight and purple dusk |

Repository context consulted: ai/PROJECT.md and ai/TODO.md. Existing living-prop implementation is context, not an extraction source. Skills read: codex-visual, imagegen, monet. This run executes the delegated task directly.

## 3. Executive verdict

**Delivered, but FAIL the production pixel-diff gate. Do not replace production assets with these files.** All requested images exist. The generator removed the recognizable arm assemblies, but repainted surrounding textures and details. Second-attempt parts substantially improve registration over first attempts, yet silhouettes, color and fine stylus detail remain different. Night still has an obvious vertical registration error.

Only built-in image_gen was used for painted content: nine calls total. No original painting pixels were extracted to construct the parts or copied into plates to conceal drift. Source files were not overwritten.

## 4. Acceptance and attempt table

| Mood | Plate attempts / selected | Part attempts / selected | Non-arm RGB mean absolute error, /255 | Non-arm pixels with any channel error >2 | Maximum channel error | Verdict |
|---|---|---|---:|---:|---:|---|
| golden | 1 / 1 | 2 / 2 | 7.758 | 96.328% | 190 | FAIL |
| twilight | 1 / 1 | 2 / 2 | 7.158 | 93.161% | 227 | FAIL |
| night | 1 / 1 | 2 / 2 | 4.059 | 83.516% | 85 | FAIL |

Measurement uses the full image except conservative rectangle x=[475,870), y=[440,725), which excludes the original arm and shadow. This is a clearly non-arm subset, not an exact semantic segmentation. Widespread failure in this subset is sufficient to reject the plate. No alignment, exposure correction, or blur was applied before measurement.

| Severity | Observed issue | Impact | Concrete next action |
|---|---|---|---|
| Blocker | Plate changes far outside removed object, quantified above | Switching layers will visibly change painted surroundings | Use a workflow that explicitly locks untouched pixels while generating only the missing region; this tool run did not establish that capability |
| Blocker | Generated arm landmarks and silhouette differ | Overlay does not reconstruct original prop | Require silhouette/landmark control and verify against an independently annotated original mask |
| High | Night arm is raised; lower diagonal painted form disappears from plate but is absent in generated part | Original reconstruction loses content | Resolve the intended night assembly boundary, then regenerate that exact assembly |
| High | Golden headshell has a green notch; tiny stylus is not faithfully reproduced | Keying exposes a hole; part is incomplete | Regenerate precise headshell/stylus silhouette, retaining reference softness |
| Medium | Source green was close to, but not exactly, #00FF00 | Exact-value key would fail on raw images | Delivered backgrounds normalized deterministically; raw files retained |

## 5. Detailed visual and registration findings

Final generated foreground bounding boxes, measured after output-size normalization and green classification (right/bottom exclusive):

| Mood | First attempt bbox | Selected second attempt bbox |
|---|---|---|
| golden | (521,382)–(833,611) | (532,468)–(834,690) |
| twilight | (377,309)–(890,697) | (537,468)–(830,693) |
| night | (279,233)–(876,604) | (500,447)–(831,602) |

Approximate manual landmark readings on the 1020×780 coordinate system: original pivot-cap center near (790,490); selected generated cap centers approximately golden (798,491), twilight (794,490), night (798,466). These imply roughly **8px, 4px, and 25px** cap displacement respectively. Manual reading uncertainty is approximately ±5px; these are not subpixel registration measurements. Golden/twilight cannot be certified to a 3px gate from this evidence. Night clearly fails. Bounding boxes are algorithmic measurements, but are not themselves corresponding-landmark drift estimates.

Golden plate: recognizable pivot, tube and lower headshell are gone. Groove continuation has no obvious isolated post disk or arm-shaped smear; the whole vinyl sheen and wood grain have nevertheless changed. The source's small front-vinyl gold mark is also lost. Selected part is much closer in placement than attempt 1, but too warm and its head has a visible green notch.

Twilight plate: no recognizable remaining tonearm; coherent elliptical groove continuation and clean case top. New bright vertical vinyl reflection, changed center spindle and crisper lid grain are visible non-target changes. Selected part is more plausibly positioned than attempt 1 but does not reproduce the original detailed head, arm contour or subtle lighting.

Night plate: no obvious pivot or arm silhouette remains, and the former arm region is filled by vinyl/case texture. The original additional lower diagonal form is also removed. Selected part resembles the upper diagonal arm better than the oversized first attempt, but pivot is too high and the complete original lower geometry is not recovered. No claim of full original assembly fidelity.

All generated plates and parts were inspected directly from tool output. All three final review boards were opened and inspected after assembly. Absence of an obvious residue is a visual judgment, not proof that every original shadow pixel was removed.

## 6. Processing, uncertainty and comparability limits

- Raw plates: golden/night 1434×1097, twilight 1435×1096. The built-in generator did not honor exact requested dimensions. Deliverables resized to 1020×780 with System.Drawing high-quality bicubic interpolation. Raw outputs retained. Resizing does not restore pixel identity.
- Raw parts likewise normalized to the full 1020×780 canvas, with no object translation, rotation, local warp or repositioning.
- Generated green pixels classified by G−max(R,B)>80 and set to RGB(0,255,0). All classified background pixels are therefore exact green. This does not prove perfect semantic background classification; green-contaminated edge pixels and the golden notch remain risks.
- Checkerboard and composites use that same binary key. They do not demonstrate production-quality soft alpha. The final part PNGs retain their green backgrounds as requested.
- Review boards are 4080×820: four unscaled 1020×780 panels plus a separate 40px label strip. Original source pixels in the INPUT panel are unaltered. Panel order: input | plate | part on checkerboard | plate+part.
- Mood references have matching crops but not perfectly identical painted details. The full room is context only and was not used as an extra registration sample.
- First-attempt parts were rejected for large displacement/scale error. Second attempts retained for all moods. Plates were not retried: all three already show systematic full-image repainting, and the current interface exposed no explicit pixel-lock mask. This is a run-specific observation, not a claim that future generation cannot improve.
- Python/Pillow processing was unavailable and package installation was blocked by network access. Review assembly and measurements instead ran successfully with Windows System.Drawing. No API-key image fallback was used.

## 7. Recommendation and next actions

Keep these as failed generation-first experiments with useful clean-region concepts, not shippable layers. The next production trial needs explicit untouched-pixel preservation for plates and controlled geometry for parts. Preserve original crop coordinates and evaluate both silhouette and landmark displacement before animation. Do not accept a visually plausible plate in place of the specified numerical gate.

## 8. Artifact manifest

All paths below are relative to D:\Repo\our-world\codex-visual\20260906-192932Z.

| Mood | Clean plate, 1020×780 | Tonearm green plate, 1020×780 | Review, 4080×820 |
|---|---|---|---|
| golden | [plate-golden.png](plate-golden.png) | [part-tonearm-golden.png](part-tonearm-golden.png) | [review-golden.png](review-golden.png) |
| twilight | [plate-twilight.png](plate-twilight.png) | [part-tonearm-twilight.png](part-tonearm-twilight.png) | [review-twilight.png](review-twilight.png) |
| night | [plate-night.png](plate-night.png) | [part-tonearm-night.png](part-tonearm-night.png) | [review-night.png](review-night.png) |

Evidence: metrics.csv; generation-manifest.json (attempt 1 tool output locations); attempt2-manifest.json; build-review.ps1 (reproducible size normalization, keying, review assembly and measurements).

Raw generated copies: raw-plate-golden-attempt1.png, raw-plate-twilight-attempt1.png, raw-plate-night-attempt1.png; raw-part-golden-attempt1.png, raw-part-twilight-attempt1.png, raw-part-night-attempt1.png; raw-part-golden-attempt2.png, raw-part-twilight-attempt2.png, raw-part-night-attempt2.png. Failed dependency-install cache/deps directories, if present, are not deliverables.
