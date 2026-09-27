# 姿势板与咖啡馆提示词记录

模式：design；工具：内置 image_gen；所有调用均传入绝对参考路径。未调用 CLI/API-key 回退。图像拷贝至本目录，未覆盖参考源图。

## 参考
- 姿势板：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/A-across-the-table/20260925-091923Z/A1-keyart.png
- 姿势板修正：本目录 VA-poses-initial.png + A1。
- 两张咖啡馆：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/A-world/rooms-1/20260925-211124Z/R-cafe-keyart.png；D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/A-across-the-table/20260925-091923Z/A5-avatar-creator.png。

## VA-poses-initial.png
```text
Use case: stylized-concept. Generate ONE finished premium landscape 16:9 illustration concept board at the largest supported landscape resolution, matching 1672x941 or higher. Asset: VA-poses.png, a rig pose exploration for Our World Across the Table.
Reference 1 A1 is Xiaoman identity, illustration quality, the exact home layout and camera ONLY; replace her chin-rest pose and remove all people reflections. Build a rigorously aligned 3 x 3 grid of nine equally sized 16:9 scene cells with thin warm neutral gutters; tiny clean Chinese title strip above entire grid reading "姿势库". Nine clean small caption strips BELOW each corresponding cell, never over faces. No other labels.
Each cell shows the exact SAME apartment home table, same camera and scale, same rainy blue city evening window, same glowing cream lamp and vase left, closed wood turntable right, same warm practical light and cool window rim. ONE original adult woman Xiaoman seated across the table in EACH cell, half-body table hides waist/legs, chestnut shoulder length hair wispy bangs GOLD STAR CLIP in consistent position, warm amber eyes, thin gold pendant necklace, oversized cream cable-knit cardigan over white tee. Viewer is Ayu, only HIS hands and charcoal hoodie sleeves appear along bottom foreground of EVERY cell. No other human faces or reflections.
Exact row-major poses and captions:
1 "看书": both her hands hold a small paperback OPEN below her face; eyes looking down at the page.
2 "望向窗外": torso turned three-quarter toward window, face in three-quarter PROFILE with cool city rim light; her hands rest separately on closed book on table, neither touching face.
3 "打字": both hands actively typing on a small laptop, concentrated gaze at laptop screen.
4 "伸懒腰": both arms stretched up overhead, all raised hands fully visible with headroom, eyes closed with little yawn; torso seated.
5 "趴桌": both arms FOLDED FLAT on tabletop, SIDE OF CHEEK lies on forearms, looks sideways at viewer; NO upright hand, no chin propping.
6 "捂嘴笑": laughing, one hand gently over MOUTH, the other on table, shoulders relaxed.
7 "喝一口": BOTH hands around floral grey ceramic mug bringing rim to lips, eyes looking up at viewer over rim.
8 "画画": drawing in small notebook with one hand holding pencil and other hand securing paper, eyes on sketch.
9 "发呆": BOTH arms hugging a small soft cushion against chest, thoughtful gaze drifting beyond viewer, head upright unsupported.
Show nine genuinely distinct silhouettes and gaze directions, same recognizable person each time. Critical NO chin resting in palm ANYWHERE, no repeated default pose. High-end polished 2D anime CG, fine clean lines, painterly gradients with soft cel shading, detailed hair and knit, warm skin, cinematic bloom and bokeh, layered depth. Not chibi, not photographs, no imitation of existing IP. No GUI, no object selection outlines, no glowing rings, no watermark. Hands anatomically coherent, natural grip, no extra fingers or fused limbs.
```

## VA-poses.png 单图修正
初稿伸懒腰两手裁出格子；改为上举、轻弯肘、双手相接，最终两手完整入镜，其他格维持。

```text
Use case: identity-preserve, targeted correction of a finished concept board. Reference image 1 is the board to edit. Reference image 2 A1 locks Xiaoman identity and anime CG finish. Keep the exact entire board: 3x3 grid, room camera, lighting, title 姿势库, all nine Chinese captions, all other eight poses, viewer charcoal hoodie sleeves and props. Fix ONLY row 2 column 1, caption 伸懒腰: both her raised hands are currently cropped out. Show the same seated Xiaoman yawning eyes closed stretching upward, but with a compact natural stretch silhouette: both elbows gently bent outward, wrists together and fingers loosely interlaced just above her head. Her COMPLETE two hands must be comfortably inside the cell with visible space above fingertips. Keep her face scale, camera, table line and background identical to other eight cells. No chin resting on hand. Preserve all typography accurately and all other cells pixel composition as closely as possible. Finished premium landscape 16:9 1672x941 or largest supported. No UI, no extra characters, no new text, no rings.
```

## VA-cafe-morning.png
```text
Use case: stylized-concept, identity-preserving room time variant for Our World Across the Table. Generate ONE premium finished landscape 16:9, largest supported size (~1672x941), NO text NO UI.
Reference 1 R-cafe is the STRICT room layout and seated eye-level camera source. Retain round pale marble table filling lower foreground, left little white flower pot and glass votive, right strawberry cake on plate with two forks, right brown leather booth, large street window behind/right, left gold metal pendant and distant cafe service counter with simple pictorial cups chalkboard. Keep this exact cafe, framing and prop positions. Reference 2 A5 is ONLY original male Ayu face/hair/glasses identity and illustration finish, do not copy avatar UI.
Change weather/time to BRIGHT CLEAR EARLY MORNING: low golden sunlight entering street window, crisp diagonal shadows on marble and face, visible cup steam lit by sun, dry sunny European street with same blue tram, no rain streaks or wet street. Golden practical pendant is subtle, cool skylight rim contrasts warm morning light. Exactly ONE adult male Ayu seated half-body across table (same dark navy-black tousled hair, fine round glasses, calm warm eyes), wearing light shirt and soft muted oatmeal sweater. Pose: both hands hold a broad folded-open NEWSPAPER at chest level below his chin, he has just looked UP OVER the top edge with a soft smile. Newspaper is turned so the viewer sees only restrained abstract column textures and nonletter marks, NO legible text or headline. Do not hide his mouth or eyes. Nobody props their chin with a hand. His mug stays on table.
The camera is Xiaoman seated opposite; HER two foreground hands holding HER mug appear bottom center with OVERSIZED CREAM KNIT CARDIGAN sleeves, correct anatomy. No other people, no people reflections. High-end original 2D anime CG illustration, fine clean linework, soft cel shading and painterly gradients, warm subsurface skin, glossy detailed hair, richly tactile knit/marble/ceramic, cinematic gentle bloom and depth bokeh. Keep anime semi-realistic faces, not photographs, not chibi, no existing franchise. No rings, interaction outlines, halos, markers, watermarks or labels.
```

## VA-cafe-night.png
```text
Use case: stylized-concept, identity-preserving room time variant for Our World Across the Table. Generate ONE polished premium landscape 16:9 at largest supported size (~1672x941). NO text NO UI.
Reference 1 R-cafe is STRICT fixed room/camera/architecture layout: round pale marble foreground table, small white flower pot plus glass votive at left, strawberry cake on plate with two forks right, brown leather booth right, large street window behind/right, brass pendant overhead left, service counter and coffee apparatus left. Preserve exact placement and viewing angle. Reference 2 A5 locks original adult Ayu identity (dark navy-black tousled hair, fine thin round glasses, soft warm smile), NOT its UI.
Variation: DEEP NIGHT just before closing. Cafe empty except seated partner; several chairs UPSIDE DOWN on distant left tables (not ours). Only the pendant above OUR table is ON. Votive extinguished, all other interior fixtures OFF. Strong intimate warm pool across his face, hands and marble surrounded by dark room, cool cyan/magenta street neon ambient rim through the unchanged window. Rain has STOPPED, window retains a few still droplets, street glistens wet; no falling rain streaks. Same blue tram outside softly out of focus.
Exactly ONE male Ayu across table half-body in charcoal hoodie. BOTH hands busy COUNTING THE LAST FEW COINS from a small plain clear tip jar into a LITTLE KRAFT PAPER BAG on the middle of tabletop: one hand pinches one coin clearly, other gently holds bag opening. A few neat coin stacks and almost empty clear jar nearby. His gaze lifts gently toward viewer with a TIRED WARM SMILE, relaxed shoulders. No hand touching/supporting his chin or cheek. Clear natural finger anatomy and coin grip. The paper bag and jar have NO writing.
Viewer is Xiaoman, only her hands and CREAM CABLE-KNIT CARDIGAN sleeves at the bottom foreground, her mug held close. Keep existing cake, flower vase and cups visible but secondary. No other people or human window reflections. High-end 2D anime CG matching references, fine line art, soft cel shading with rich painterly gradients, warm skin, hair highlights, cinematic bloom and bokeh. No photographic faces, no chibi, no existing IP. No labels, no selectable outlines, glowing rings, halos or pin markers.
```

## 工具返回源文件
- 初稿：C:\Users\Jackzz\.codex\generated_images\01a0da6f-c99b-7303-9280-3baaafe723ac\exec-83902fc7-179b-44a0-b6d6-06e900658fcd.png
- 姿势板终稿：C:\Users\Jackzz\.codex\generated_images\01a0da6f-c99b-7303-9280-3baaafe723ac\exec-f475c47c-767b-44f9-b8f0-c35ee65cfd96.png
- 晨咖啡：C:\Users\Jackzz\.codex\generated_images\01a0da6f-c99b-7303-9280-3baaafe723ac\exec-4c1af32c-d411-418d-a7db-5909d91a0d57.png
- 夜咖啡：C:\Users\Jackzz\.codex\generated_images\01a0da6f-c99b-7303-9280-3baaafe723ac\exec-ea9b6dd6-63b8-45f1-9e06-7c91ffe71f97.png

## 像素复核
主制作方查看三张输出。独立审阅 agent 另开图核对 A1 与 R-cafe，确认姿势板标题与九标签可读、动作全、前景炭灰袖口；两张咖啡馆均米白袖口，阿屿动作正确且无托腮。
轻微问题：姿势板每格尺寸限制了手指级细节，打字后一手被屏遮住；侧望格是向侧后窗而非精确凝望外景某点。晨报纸用非可读排版线纹表达新闻；夜咖啡疲倦感不强，中央窗外有现代高楼轮廓漂移。完整结论见 codex-report.md。

