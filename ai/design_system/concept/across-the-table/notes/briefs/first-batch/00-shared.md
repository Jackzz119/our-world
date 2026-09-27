Concept-direction delegation from Monet (lead art director, Claude). You produce the images; Monet makes the final design judgment. This is ONE of three parallel concept directions; stay inside the concept described at the end of this brief and make it the strongest possible version of itself.

## Product

"Our World" is a companion app for couples and close friends: real-time chat, shared memories (timeline diary, photo wall) and music listening, staged inside a living, dynamic illustrated scene that people leave open on screen. Roughly half of the experience is UI, half is the scene. Platforms: web (primary), desktop app (Electron, can sit always-on-top or like a live wallpaper) and mobile portrait. Audience: Chinese first, international later. It must stay lightweight: 2D / 2.5D layers rendered in the browser (PixiJS / WebGL), no heavy 3D engine; characters use Live2D-style or Spine-style 2D rigs.

## Why this brief exists

The owner is unhappy with the current in-room scene (attached reference: current study-room art with two Q-style long-eared puppy characters and the current UI). The owner's problems, summarized faithfully:
1. The 2D room lacks spatial depth and the lighting is not dramatic; it is far from top Wallpaper Engine dynamic wallpapers.
2. Two characters in frame feel redundant and non-immersive: the user watches two characters "talk to each other" instead of being accompanied. One character sitting in front of you (for example an attractive CG-quality young woman or man) feels much more like companionship, yet the product must still let couples and friends accompany EACH OTHER.
3. Rooms may hold more than two people in the future: how is that shown?
4. Hand-drawn human characters are far better than the cartoon puppies.
5. Users need to define what their own character looks like.
6. Scene interactions must be gameplay-rich rewards, not redundant entry points (clicking a record player to open the music player just duplicates the nav). Wanted examples: a garden where you plant and raise plants as a mini-game, a coffee machine where you actually pour coffee, tapping triggers an animation or plays a short line the partner recorded.

## Owner's success criteria (keep these; do not replace them with generic taste)

- Product-grade concept art, image-first: it must look like a shippable app's marketing key art and real screens, not wireframes or mood boards.
- Strong spatial depth (clear foreground / midground / background, depth of field, parallax-ready layering) and strong emotional lighting (rim light, light shafts, bokeh, practical lamps, weather), comparable to top-tier Wallpaper Engine scenes, while still achievable as lightweight 2D layers.
- Companion satisfaction: the viewer should feel personally accompanied (eye contact, reactions to the viewer), while the companion is a REAL person (partner or friend) represented by their avatar.
- Scenes scale from 2 people to small groups.
- Characters are original, attractive, illustrated humans. No resemblance to existing IP (no Blue Archive, Genshin, Love and Deepspace, Sanrio or any other franchise characters). Do not name living artists or studios in prompts; describe the style instead.
- Scene interactions are small games or rituals with animation and a social result, never duplicates of UI buttons.

## Product rules from the project design system (must hold)

1. Zero-cost presence: opening the app = being there; nothing has to be "maintained".
2. Only positive feedback: no punishment, no streak loss, no leaderboards.
3. Interactions grow on the scene and its objects, not in a feed.
4. Scene and characters come first; UI never permanently covers the scene.
5. Rejected affordance: do NOT draw glowing rings, outlines, halos or pin markers around interactive objects. Allowed: tiny sparkle-star glints, the object's own idle motion (steam, spinning record, swaying leaves) or a small hand cursor.

## Approved UI language (reuse it; see the attached UI references)

- Floating "Cinnaglass" UI: neutral frosted glass with a fine grain texture, soft backdrop blur, thin light rim, generous rounded corners; warm gold glow for hover / active; soft off-white icons and text. Panels are compact and sit at the edges.
- Desktop / web: slim vertical 5-icon nav rail on the left (home, chat, music, tools, settings); top-left two small circular buttons (clock = time of day, cloud = weather); chat card bottom-left; music mini-player bottom-right; anniversary card top-right ("在一起 1221 天"); an unread message appears as a small glowing golden letter.
- Mobile portrait: bottom nav bar with the same 5 icons, top-left two circular buttons, top-right anniversary card, music mini-bar above the nav, safe areas respected.
- Chat bubbles may float near the speaking avatar. UI copy: few, short Simplified Chinese labels (at most 10 characters each), no lorem ipsum, no paragraphs. If a Chinese label renders garbled, replace it with a short English label rather than shipping broken glyphs.

## Personas (reuse in every image of this concept, same faces and outfits)

- 小满 Xiaoman (female, early 20s): chestnut-brown shoulder-length hair with soft wispy bangs and a small star hair clip, warm amber eyes, oversized cream knit cardigan over a white tee, thin gold necklace; gentle, slightly sleepy smile.
- 阿屿 Ayu (male, mid 20s): dark navy-black tousled hair, thin round glasses, charcoal hoodie; calm, warm expression.
- Friends for group scenes: 圆圆 Yuanyuan (girl, high ponytail, big white headphones, mustard-yellow sweater), 老K Lao K (guy, knit beanie, olive jacket, friendly grin), 七七 Qiqi (girl, short silver-dyed bob, black turtleneck).

## Attachments

1. scene-twilight.png: the approved desktop UI language (nav rail, climate circles, chat card, music bar) over the CURRENT study-room art. Take the UI from it; the room is the baseline to surpass, not a style to copy.
2. room-safe-area.png: the approved mobile portrait UI layout (top circles, anniversary card, music mini-bar, bottom nav).
3. 06-presence-comparison.png: the CURRENT two-puppy characters the owner wants to move away from. Context only.

## How to work

- The attached references are for YOUR understanding. The current study room and the puppies must never appear in outputs; do not pass the baseline scene to image_gen. Pass a UI reference to image_gen only when it helps UI fidelity on a product-screen image.
- Generate the hero key art first, then pass it as a reference image (referenced_image_paths) to every later generation so characters, palette and lighting stay consistent.
- Inspect every result against the hard rules (no rings or outlines on objects, correct character count, clean faces and hands, legible short labels). Regenerate only an individual image that clearly fails; no batch rerolls.
- Use the largest supported landscape size for 16:9 / 16:10 images (for example 1536x1024) and keep important content inside a 16:9 safe area.
- Save every image in the output directory with the exact file names listed below.
- Write codex-report.md in Simplified Chinese: for each image, what it shows, how it answers the owner's criteria, visible weaknesses, and production notes (layer list, what animates, rig type, rough web asset budget). End with this concept's biggest risk and the cheapest way to prototype it.
