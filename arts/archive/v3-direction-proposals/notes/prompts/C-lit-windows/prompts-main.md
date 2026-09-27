# 主流程生成提示词

全部调用使用内置 image_gen；参考不含原书房或双犬。每项保留实际提示词与调用时的参考路径。C1 的末次修正只扩大屋顶取景，其他图已生成于原主视觉基础上，原主视觉留存 C1-keyart-initial.png。

## 1. C1-keyart.png

参考：无（全新主视觉）



```text
Use case: stylized-concept. Create ONE exceptional polished marketing key art image for Our World, concept C "Lit Windows". Landscape 1536x1024 or largest supported landscape, all important content inside a centered 16:9 safe area. NO UI, no typography except a tiny physical neon sign "CAFE". Do NOT use any earlier attached images as image references. Entirely new scene, NO old study room, NO puppies.

A rainy blue night on a cozy street corner, one handsome FIVE-STORY building, facade cut away as a dollhouse to reveal modular inhabited rooms, roof garden above. Count exactly five enclosed story bands INCLUDING ground floor café: level 1 steamy café with counter and empty tables; level 2 Lao K's kitchen with him cooking; level 3 TWO side-by-side connected rooms, Xiaoman painting at an easel in left room, Ayu seated playing acoustic guitar in right room, clearly shared wall with small round porthole; level 4 Yuanyuan gaming in her mustard sweater and white headphones, blue monitor glow; level 5 Qiqi reading under a desk lamp, and beside her one DARK empty room, building cat sitting on its sill. Roof with string lights, small greenhouse and planters. Only FIVE humans total and ONE cat. Strong distinct room colors: amber painting studio, rose-amber guitar room, blue gaming room, honey kitchen, pearl desk-lit reading room, unlit blue room. Readable human faces not tiny anonymous dots. Thick floors, visible side walls, back walls, recessed doors, fore-edge plants and little furniture establish layered depth.
Character bible original human adult chibi leaning 3.5 heads tall, charming NOT toddler, expressive simple eyes, hand drawn:
Xiaoman young adult woman chestnut shoulder-length hair, wispy bangs, small gold star hair clip, warm amber eyes, oversized cream knit cardigan over white tee, thin gold necklace, gently sleepy smile.
Ayu young adult man navy-black tousled hair, thin round glasses, charcoal hoodie, calm warm face.
Yuanyuan young adult woman high ponytail, big white headphones, mustard-yellow sweater.
Lao K young adult man knit beanie, olive jacket, friendly grin, cooking apron allowed over jacket.
Qiqi young adult woman short silver-dyed bob, black turtleneck.
Original faces/clothing, no resemblance to any existing franchise. No famous artists or studio imitation.

Composition has cinematic foreground umbrella edges and out-of-focus wet leaves, bright richly detailed building middle ground, receding blue street and misty neighboring buildings background. The whole five-story building fits, generous street and sky air around it, slight three-quarter corner perspective showing depth, not flat elevation. Warm light spills across wet pavement into broken orange reflections, diagonal rain visible against darker areas, restrained bokeh, practical light sources, luminous volumetric mist shafts. Wet street umbrellas are closed/unattended or foreground umbrellas without extra people. Roof and foundation remain within image with breathing room. Colored-pencil contour and richly layered gouache textures, picture-book intimacy, sophisticated art-directed contrast and premium hand-painted diorama detail, NOT photoreal 3D plastic, NOT clay toys. No game UI, no badges, no captions, no name tags, no interaction rings, object outlines, halos, pin markers or magical circle effects. Physical lamps can cast natural light. Tiny local star glints only if needed. Calm rainy companionship, warm human life one window away.
```

## 2. C2-desktop.png

参考：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C1-keyart.png

实际调用时的 C1 为屋顶留白修正前主视觉，已留档 C1-keyart-initial.png；C1 最终仅调整取景。

```text
Use case: ui-mockup. Create ONE premium finished DESKTOP app screenshot concept C2 Lit Windows, landscape 1536x1024 or largest supported landscape. Reference Image 1 is the newly created Lit Windows hero: LOCK the original Xiaoman and Ayu faces, hair, clothes, building architecture, room palette and painterly finish. Do not show the entire building. Draw a NEW close dollhouse view of ONLY their two connected rooms, richly hand-painted with gouache and fine colored-pencil texture. All critical faces and UI inside 16:9 safe composition with generous edge margin.

Two adjacent rooms share a substantial central wall with one small round window. Left Xiaoman painting studio: original young adult chestnut shoulder-length wispy hair, star clip, amber eyes, cream knit cardigan over white tee, delicate gold necklace; full body charming rounded 3.5-head-tall human, NOT puppy or toy, she pauses with paintbrush and looks directly out at viewer with sleepy warm smile. Right Ayu navy-black tousled hair, fine round glasses, charcoal hoodie; same original face as hero, guitar beside him, he lifts his right hand and knocks on shared wall, eyes glance warmly toward viewer. EXACTLY TWO people. One tiny hand-drawn heart near their wall as momentary knock response, no floating character duplicates.
Rooms are shallow-perspective deep dioramas: foreground sill/leaves/paint pots frame view; middle ground expressive seated humans; back walls, shelves and recessed rainy blue windows. Warm lamp cones, cool rain reflections, rim light on faces and hair, soft light shafts and atmospheric depth. Neither character hidden by furniture or UI. Rain OUTSIDE glass only. Intimate grown-up charm, detailed original rooms NOT the old study room.

Overlay polished Cinnaglass product UI: neutral smoky-gray frosted translucent glass, fine-grain texture, soft backdrop blur, very thin pale rim, generous rounded corners. Off-white crisp icons/labels, subdued warm gold active only. No neon-blue glass or heavy gold outlines. UI compact at outer edges.
Top left two separate circular clock and cloud icon controls in tiny pill.
Left edge slim vertical nav rail EXACTLY FIVE line icons from top to bottom: home, speech bubble, musical note, wrench, gear.
Top right compact anniversary card exact readable Chinese "在一起 1221 天".
Near Ayu's face small dark translucent speech bubble exact "敲敲墙～", tail points to Ayu, not to empty space.
Bottom left compact frosted chat card with heading "悄悄话", small gold letter beside it indicating unread, one brief message "听见啦" and input "说点什么". No portraits in UI (avoid extra faces).
Bottom right slim music mini-player with tiny round record thumbnail, exact title "雨夜吉他", discreet progress line, gold play button and collapse chevron.
Right edge MID-HEIGHT narrow floating BUILDING MINI-MAP widget, five tiny stacked floors, warm lit window rectangles and one dark one, selection represented ONLY by neutral glass row background, NO bright outlines around objects. Tiny heading "邻居". Widget small, not covering Ayu.
No more text. Every label <=10 Chinese characters, crisp legible Chinese typography. No lorem ipsum, no fake paragraphs, no unread numeric badges. No rings, halos, interaction target outlines, pins or glowing hotspots anywhere on scene objects; physical emitted room lights are natural. UI should look ship-ready with comfortable margins, scene occupies dominant area. No browser chrome, no phone mockup, no title banner.
```

## 3. C2-desktop.png — proportion-and-climate-correction

参考：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C1-keyart.png ; D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C2-desktop-initial.png

实际调用时的 C1 为屋顶留白修正前主视觉，已留档 C1-keyart-initial.png；C1 最终仅调整取景。

```text
Edit reference image 2 (desktop concept), reference image 1 remains the canonical Lit Windows hero. Keep this desktop image's excellent two-room dollhouse composition, original character identities, clothes, room furnishings, blue rainy windows, amber practical lighting, shared wall round window, all legible Chinese UI, five nav icons, tiny building navigator and cozy image quality. Correct ONE main failure: the two humans' anatomy is too tall and realistic. Transform BOTH into charming ORIGINAL 3.5-HEAD-TALL illustrated adult CHIBI HUMANS: visibly larger heads, compact torsos, SHORT arms and legs, rounded simplified hands, very clear stylized proportions (head about29% of standing height). Same faces, original chestnut hair/starclip/cream cardigan white tee/necklace for Xiaoman and navy-black hair/round glasses/charcoal hoodie for Ayu. Adults in their20s, NOT children, NOT plush animals, not long-limbed six-head-tall anime adults. Preserve their distinct gentle mature personalities. Scale furniture to fit the compact figures. Full body Xiaoman seated holding paintbrush, direct eye contact with viewer; Ayu knocks the wall with closed fist, smiles toward viewer; exactly TWO figures plus existing one cat. Broad gouache patches and colored-pencil outlines, more painterly picture-book finish, less photographic furniture. 
Secondary exact UI correction: replace top-left stretched time pill and cloud pill with TWO SMALL IDENTICAL CIRCULAR buttons, clock icon only and cloud icon only, grouped horizontally. Remove digits21:37. Keep short clear Chinese: 在一起 1221 天; 敲敲墙～; 邻居; 悄悄话; 听见啦; 说点什么; 雨夜吉他. No extra text. Other UI geometry stays compact neutral gray translucent fine-grain glass with thin pale rims, no bright halos on play button, no glowing object outlines, rings, markers. Return one polished landscape image, same aspect ratio and high resolution. Retain original warm/cool lighting and depth.
```

## 4. C7-scene-layers.png

参考：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C1-keyart.png ; D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C2-desktop.png

实际调用时的 C1 为屋顶留白修正前主视觉，已留档 C1-keyart-initial.png；C1 最终仅调整取景。

```text
Use case: infographic-diagram / polished illustrated concept production board. Create ONE finished landscape board 1536x1024 or largest supported landscape, concept C7 "Lit Windows". Input image1 is canonical five-story dollhouse building key art (rooms, facades, rain, reflections); image2 is the finalized two-room closeup (correct original chibi humans and lighting). Both are reference only. Showcase HOW THIS PARTICULAR LIVING WORLD IS BUILT using richly illustrated miniature scenes, not wireframes, not screenshots of software. Keep contents inside a centered16:9 safe area and substantial outer margins. Calm warm off-white / smoky blue neutral background, thin elegant separators, no long prose, six exact Chinese layer labels and three camera labels, all crisp typeset black or dark slate with sufficient size.

LEFT approx60% of board: a beautifully clear EXPLODED AXONOMETRIC STACK of the SAME five-story small corner building, showing actual modular room cells as layered open-front dioramas. Several room cells visibly separate from structural grid, each has thick floor, wall art, miniature furniture and its own local amber lamp, blue gaming cell, dim offline cell with tiny cat. Keep rooms and figures in the source colors, simplified just enough to explain, material gouache and colored pencil.
Six clean labeled visual elements with fine straight connector lines (diagram lines allowed, NO glowing outlines on objects):
"房间单元" -> separated modular room cells, TWO enlarged room tiles with Xiaoman cream cardigan starhairclip and Ayu charcoal hoodie glasses, original3.5head human proportions.
"室内光源" -> a warm light overlay sheet showing softly shaped amber pools aligned with lamps, NOT circles.
"外立面" -> separate brick/wood structural facade/front beam layer detached a short distance in front.
"雨层" -> separate transparent blue slanted rain sheet ahead of facade, rain exclusively exterior.
"街道倒影" -> horizontal wet pavement base reflecting warm windows, dark blue with broken amber reflections.
"天空" -> blue atmospheric backdrop with distant roofs and mist, clearly behind other layers.
Arrange components so the depth order is unambiguous, not a pile of panels; connector labels kept OUTSIDE art silhouettes, no label overlap. No invented mesh topology or pseudo code.

RIGHT approx36% of board: three vertically stacked cinematic wide thumbnail frames showing a SINGLE camera approach, linked with discreet down arrows. Each frame has a SHORT crisp label:
top "整栋楼": whole five-story building in rainy blue city, five original people in own rooms, 1cat, foreground umbrella blurred, building sharp.
middle "楼层": focus ONLY Xiaoman/Ayu's side-by-side floor and connecting small round wallwindow, above/below architecture blurred.
bottom "房间": intimate Xiaoman room, compact adult chibi original girl waves and makes direct eye contact, same cream cardigan white tee necklace chestnut shoulderhair gold starclip; background softly blurred, her face in focus. Her portrait not a six-head-tall adult.
The strip should communicate increasing camera scale and depth-of-field transitions by actual rendered sharpness differences, NOT technical badges.
Use same original faces/palette/lived-in rooms as refs. No UI overlay except these infographic labels; no decorative title, no footer, no lorem ipsum, no artist names, no puppies, no interaction rings, halos, glowing object contours or pin markers. Physically motivated light glows and diagram arrows are fine. Premium picturebook diorama production concept, precise informative visual hierarchy, beautiful clear restrained finish.
```

## 5. C7-scene-layers.png — layer-label-and-safe-area-correction

参考：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C1-keyart.png ; D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C7-scene-layers-initial.png

实际调用时的 C1 为屋顶留白修正前主视觉，已留档 C1-keyart-initial.png；C1 最终仅调整取景。

```text
Precise edit of image2, the C7 illustrated layer breakdown board; image1 is canonical building reference. Preserve the excellent production-board arrangement, EXACT same Chinese labels, all rooms, all faces, right-side camera strip, palette and painterly finish. Correct only the misleading left-side "外立面" label connector: its line currently terminates on the translucent blue RAIN SHEET. It must terminate on the opaque detached BRICK AND WINDOW FACADE that stands immediately BEHIND the rain sheet (the wall with windows and a striped café awning). Route the 外立面 connector through clear whitespace into the brick facade, ending with a small black dot at a solid brick column, at approximately x=390 y=700 in this1536x1024 layout, NOT on blue rain. Keep "雨层" connector pointing to the translucent blue sheet in front. Make those two semantic targets visually distinct by moving the facade slightly RIGHT and the rain sheet slightly LEFT if needed; do not replace their labels or duplicate them.
Also keep all essential labelled components within the central16:9 safe band (y80–944 if canvas1536x1024): slightly reduce and center the diagram and right frames vertically with at least80px blank top and bottom breathing room. Do not crop objects or text. Everything else unchanged: 房间单元, 室内光源, 外立面, 雨层, 街道倒影, 天空; right sequence 整栋楼, 楼层, 房间. Exact legible text. No extra UI, no glowing object outlines or circles. One high-quality landscape board.
```

## 6. C1-keyart.png — roof-framing-correction

参考：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/C-lit-windows/20260925-091935Z/C1-keyart.png

实际调用时的 C1 为屋顶留白修正前主视觉，已留档 C1-keyart-initial.png；C1 最终仅调整取景。

```text
Edit this newly generated Lit Windows concept artwork for COMPOSITION SAFETY ONLY. Preserve the same original five-story dollhouse building, all FIVE human identities, rooms and tasks, connected Xiaoman/Ayu rooms and round dividing-wall window, rooftop garden and greenhouse, dark offline room with cat, café, blue rainy city, warm light contrast, painterly materials, foreground umbrella and wet street. No UI and no extra people. The greenhouse roof and rooftop garden were cropped by the top edge. Correct by modestly pulling the camera BACK: show the ENTIRE greenhouse roof and rooftop plants/string lights with generous BLUE SKY above them, and retain complete café ground-floor base with reflected street below. Make the complete building about75percent of canvas HEIGHT, centered vertically; top of greenhouse at least12percent down from top, bottom of building at most88percent down, so all important architecture fits inside a centered16:9 safe band on a1536x1024 landscape canvas. Sky and foreground wet street fill extension gracefully. Do not crop any roof or foundation. Keep high-quality charming warm gouache/colored-pencil details and readable five human silhouettes, no new rooms/floors/people. Exactly five enclosed stories including café. No labels except existing physical CAFE neon. No glow rings, object outlines, pins, puppies or old studyroom. Output same landscape high resolution.
```

