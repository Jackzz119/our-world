Concept-expansion delegation from Monet (lead art director, Claude). You produce images; Monet makes the final design judgment. This is ONE of six parallel runs that together build out concept A 「对坐 Across the Table」 into a full visual world. Stay inside the scope of this run; make every image product-grade.

## Product and the approved direction

"Our World" is a companion app for couples and close friends: real-time chat, shared memories (timeline diary, photo wall), music listening and small shared rituals, staged in a living illustrated scene people leave open on screen. Platforms: web, desktop app (can float always-on-top) and mobile portrait. Lightweight 2D / 2.5D layers in the browser (PixiJS / WebGL) with half-body Live2D-style or Spine-style character rigs; no heavy 3D engine.

On 2026-09-25 the owner chose concept A. In the owner's words (summarized): it fits the product positioning, it puts the interaction with the other person first, you can imagine the character as your partner, and it suits a shared phone/PC visual language. The owner now wants a much fuller A world: more interactive objects and character interactions, several carefully designed rooms each with its own gameplay, and many images across different light and weather.

## Rules of concept A (must hold in every image)

1. The camera IS the viewer, seated at a table. Across the table sits exactly one partner facing the camera (only images marked "group" show friends). The partner is the avatar of a real person, not an AI character.
2. The viewer's own presence shows in the foreground: their hands and sleeves, their cup or props. When 阿屿 is the viewer the sleeves are a charcoal hoodie; when 小满 is the viewer the sleeves are her cream knit cardigan. Reflections of the viewer in glass are allowed only faint and low contrast (earlier feedback: a literal reflection reads as a second couple standing outside).
3. Half-body framing of the partner; the table and props hide the lower body.
4. Eye contact is the emotional core but not constant staring: partners also read, sip, look out the window, work, then glance up with a soft smile.
5. Presence honesty: the avatar mirrors only real states (online, reading, listening, typing, away, asleep by explicit status). Offline means an empty seat with warm traces (jacket, cup, scarf, a note).
6. Style lock, identical to the attached references A1 / A2 / A5: high-end 2D anime CG illustration at gacha key-visual quality; semi-realistic anime proportions (not chibi, not photoreal); clean fine line art; soft cel shading with painterly gradients; warm subsurface skin; detailed hair highlights. Cinematic lighting: a practical key light plus a contrasting ambient / rim light, bloom, bokeh, shallow depth of field, strong foreground / midground / background separation.
7. Every room is a distinct, art-directed place with its own palette, light, weather and signature props; never the same apartment re-skinned.
8. Interactions are small games and rituals, not UI shortcuts: a tactile action by the viewer, an animated response, and a visible result on the partner's side. Async friendly (works when the partner is offline, they find it later). Only positive feedback: plants never die, no streaks, no leaderboards, no punishment.
9. Rejected affordance: never draw glowing rings, outlines, halos or pin markers around interactive objects. Allowed: tiny sparkle glints, the object's own idle motion (steam, spinning record, swaying leaves), a small hand cursor on desktop screens.
10. Characters are original. No resemblance to existing IP (no Blue Archive, Genshin, Love and Deepspace, Sanrio or any franchise). Do not name living artists or studios in prompts.

## Personas (keep faces and signature items identical to the references)

- 小满 Xiaoman (female, early 20s): chestnut-brown shoulder-length hair with soft wispy bangs and a small gold star hair clip, warm amber eyes, oversized cream knit cardigan over a white tee, thin gold necklace. Outfits may change with room and season, but hair, clip, eyes and necklace stay.
- 阿屿 Ayu (male, mid 20s): dark navy-black tousled hair, thin round glasses, charcoal hoodie by default (outfits may change with room and season; hair and glasses stay); calm, warm smile.
- Friends (group images only): 圆圆 Yuanyuan (girl, high ponytail, big white headphones, mustard-yellow sweater), 老K Lao K (guy, knit beanie, olive jacket, friendly grin), 七七 Qiqi (girl, short silver bob, black turtleneck).

## UI language (only when an image calls for UI; match A2 / A3)

Floating "Cinnaglass" UI: neutral frosted glass with fine grain, soft backdrop blur, thin light rim, rounded corners, warm gold for active states, soft off-white icons and text. Desktop: slim vertical 5-icon nav rail on the left (home, chat, music, tools, settings), top-left two small circular buttons (clock, cloud), chat card bottom-left, music mini-player bottom-right, anniversary card top-right ("在一起 1221 天"). Mobile portrait: bottom 5-icon nav, top-left two circles, top-right anniversary card, music mini-bar above the nav. UI copy: few short Simplified Chinese labels (at most 10 characters); if a label renders garbled, use a short English label instead.

## Captions inside images

Scene images carry no text. Storyboards and boards may use short Simplified Chinese captions (at most 8 characters each), set in a small clean caption strip that does not cover faces.

## How to work

- The attached A-series images are the approved style and identity references. Pass A1 (小满) and/or A5 (阿屿) as referenced_image_paths to every generation so faces and style stay consistent; add other references only when they help.
- Use the largest supported landscape size (the earlier batch returned 1672x941) unless an image asks otherwise.
- Inspect every result against the rules above (exact character count, identities, clean hands and faces, no rings or outlines, legible short labels, the viewer's sleeves correct). Regenerate only an individual image that clearly fails; no batch rerolls; keep superseded drafts with an -initial suffix.
- Save every final image in the output directory with the exact file names listed below.
- Write codex-report.md in Simplified Chinese: for each image, what it shows, how it serves concept A, visible weaknesses, and production notes (layers, what animates, rig / prop parts, rough compressed web asset budget). For rooms, also write the room's gameplay loop in 3 to 5 steps (trigger → action → response → result → memory).
