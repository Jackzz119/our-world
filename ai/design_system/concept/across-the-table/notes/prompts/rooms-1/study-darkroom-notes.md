# 书房与暗房交付证据

## 范围与结论

- 模式：design。此文件是父级 codex-report.md 的房间 3、4 汇总素材，不取代最终报告。
- 四张最终图片均已通过逐像素视觉自审：人物数量、身份标记、对坐机位、第一人称衣袖、手部基本解剖、零 UI、无交互光圈通过。没有执行 Monet 最终审核；以下是本代理视觉自审。
- 四张均由内置 image_gen 生成，禁止且未调用 CLI/API-key fallback。生成服务默认源文件保留，真实 PNG 复制进指定输出目录。没有覆盖任何原始参考。
- 书房玩法初稿把纸星误放入沙漏，已保留 R-study-play-initial.png 并执行一次局部修复；最终沙漏内部仅有沙，纸星位于外侧罐口上方。其他三张一次通过。
- 最大横向请求由工具实际返回为 1672×941，暗房玩法为 1672×940。近似 16:9，存在 1 像素高度差；没有假称完全同尺寸，也未进行程序裁剪。
- PNG 元数据读取时 Windows 的 python.exe 不可执行，改用 PowerShell 直接读取 PNG IHDR 与 Get-FileHash；不影响生成或交付。

## 证据与输入

1. A5-avatar-creator.png：阿屿身份与画风参考；只使用其圆眼镜、深蓝黑头发、脸型、炭灰卫衣，不复制 UI。
2. A1-keyart.png：小满身份、细线动漫 CG 与第一人称关系参考；只使用其栗棕短发、金星发夹、琥珀眼、奶油开衫、金项链，不复制公寓场景。
3. 每个玩法图追加同房间主视觉，保持道具、建筑与光照连续性。
4. 本代理亲自通过 view_image 查看 A1/A5，检查每张生成图实际像素；A4/A6 由父代理统一验收，不在本子任务额外使用。
5. 人物照片中的小幅印刷图像属于共享回忆物件，不是额外出现在房间中的真人化身。照片内容是演示素材，实际产品必须取真实用户共同上传/授权的照片。

## 概念矩阵与可见证据

| 文件 | 直接可见的画面 | 对 concept A 的作用 | 可见弱点与边界 |
|---|---|---|---|
| R-study-keyart.png | 阿屿半身、圆眼镜、深色卫衣；右手执笔，左手托脸；前景奶油袖口一手贴日记一手扶白杯；绿罩铜灯、双杯、沙漏、星星罐、侧面笔电、书架与窗外飞雪 | 将聊天的目光连接扩展成安静共处，日记与杯子各自归属清楚；读书人仍是画面重心 | 星罐较接近半满，不是仅两三颗；物件与台灯装饰偏丰富，桌面略满。文字仅书写纹理，不能当可读条目。静帧不能证明真实在线状态 |
| R-study-play.png | 前景奶油袖口抓住沙漏顶沿，细沙落下；阿屿打开书；玻璃罐上方有一颗纸星；另一手守着日记 | 实体翻沙漏→同伴准备阅读→共同积累纸星，保留触感与面对面回应 | 沙漏已接近竖直，单帧只能表现翻转后的瞬间，不能单靠本图证明翻转动画；阿屿仍看向玩家，没有独立“点头”动作证据。掉星表示上一轮结束，不得把新一轮开始当完成奖励 |
| R-darkroom-keyart.png | 小满金星发夹、琥珀眼、金项链、奶油开衫；夹子夹合照；三显影盘、放大机、计时器、收音机、照片绳；前景炭灰袖口双手；红灯与门底青光 | 共享相册从列表动作变成面对面共同制作回忆；房间色彩与结构彻底区别于书房、公寓 | 为保证脸部可读性，皮肤保留偏暖中性色，红灯并非物理一致的单色照明；照片采用白边相片视觉，是产品仪式化表达，不能充当真实冲洗工艺教学 |
| R-darkroom-play.png | 炭灰袖口双手握住盘两侧，液面红光波纹；盘中两人＋摩天轮合照左半显现、右侧仍奶白；小满前倾微笑，手搭干燥柜台；背后照片绳与红灯 | 触发、操作对象、物理结果同时可见，是四张中最直接的玩法示意 | 小满瞳线接近玩家与托盘之间，没有强烈下视；不建议为此破坏稳定身份重抽。照片显现过渡略带乳白遮罩感，实装要用细粒度密度变化＋水波而非线性左右擦除 |

四张场景均无脸部遮挡、额外身体、发光物件描边或界面悬浮标记。没有把“看得像动作”表述为已经实现的交互。图中的书本纹理、钟面刻度属于画面细节，并未加入用户界面文案。

## 房间玩法：深夜书房

1. **触发**：任一真实在线用户翻动沙漏，发起专注邀请；对方接受后才显示共同阅读姿态。对方离线则留一张可稍后发现的折纸便笺，不表演在线回应。
2. **动作**：玩家手腕翻转沙漏，沙开始流；双方可以各自在自己的设备读书、写日记或工作。
3. **回应**：远端已接受专注时，阿屿合上笔电、翻书并轻点头；不把角色动画当作用户真实行为推断。
4. **结果**：本轮实际完成后双方可选择收下一颗纸星，落入共享罐。提前结束也不扣除旧星、不罚分、无连胜和排名。本玩法图处于“上一轮星星落罐＋下一轮沙漏启动”的转场。
5. **回忆**：双方选择保存后把本轮便笺/日记写入时间线；纸星罐按月慢慢积累，允许异步查看，无勤奋竞赛。

## 房间玩法：暗房

1. **触发**：真实上传到共享相册的照片作为一张空白相纸进入干燥区域；是否共享遵循用户现有权限。
2. **动作**：玩家把相纸放入盘，轻晃托盘；动作幅度驱动液面涟漪和显影速度，手机对应轻拖/轻摇且有触控替代。
3. **回应**：同伴在线且共同参与时前倾观察；异步情况下是空座与夹子/便笺，不伪造对方兴奋表情。
4. **结果**：照片完整显现后用夹子提起、夹到晾片绳；无需过度精确操作，放着也会温和完成，不会冲坏照片。
5. **回忆**：完成的照片进入共享照片墙，另一人回来可以续接晾片/写一句说明；同卷操作以共享记录避免重复生成。

## 分层、动画和工程提示（建议，尚未实装）

### 书房

- 固定底图：书架/墙面/窗框/积雪远景分开；雪花独立前后两层粒子，窗内不生成雪。
- 光层：绿玻璃灯罩、暖色桌面光池、月光边缘层分开；背景不需要每帧重烘整图。
- 阿屿半身绑定：头发前后片、耳朵、眼睑/眼球、眼镜透明反射、嘴、颈、卫衣躯干与双前臂；眼镜反射限制在镜片内。
- 前景玩家：奶油袖口与左手沙漏抓握/右手日记待机分别制作替换姿态，不能从一张平图无损抠出所有被遮挡区域。
- 沙漏：铜架固定、玻璃高光、上/下沙堆遮罩、细沙流、旋转轴分离；纸星轨迹独立落向罐口，必须在沙漏图层之外。
- 书页、便笺、笔与星罐做独立部件；纸星属于共享状态结果，不以纯本地重复点击无限奖励。
- 推荐低频待机：眨眼、呼吸、视线回书、杯口轻蒸汽；无需大幅动作或重 3D。
- **粗估压缩预算**：桌面首次进入含背景 AVIF/WebP 0.8–1.4 MB、书房道具图集 0.7–1.3 MB、共享角色半身图集 2.0–3.5 MB、玩家双手与袖口 0.4–0.8 MB、光/雪/沙等 0.15–0.35 MB，约 4.05–7.35 MB；命中角色缓存后新增约 2.05–3.85 MB。是制作目标，不是已导出数据，也不代表显存峰值。

### 暗房

- 固定底图：墙面、门、放大机与架子；照片绳和夹子前后遮挡独立。
- 灯：安全灯灯罩/暖红光晕/门底青光分别控制；皮肤与头发需重光照参数或局部红光层，保留人物原色以防不同房间身份漂移。
- 小满半身绑定：发夹固定到侧发、项链和衣领局部摆动、双眼与笑口、手臂靠桌/持夹姿态。照片夹持要有夹子前后两片与照片边缘夹点。
- 玩家炭灰袖口双手和托盘组成一个可小幅旋转的互动组；液面独立 UV 扰动，盘壁与高光保持遮挡。
- 用户照片作为独立纹理，显影用噪声密度遮罩缓慢显现；不烘进整张背景，实际照片不得用概念图人物替代。
- 晾片至少分“湿、稍干、可取”材质状态，不设失败计时；无线电和门光仅环境，不自动播放对方语音。
- **粗估压缩预算**：暗房背景 0.7–1.2 MB、托盘/工具/照片绳图集 0.6–1.1 MB、共享角色图集 2.0–3.5 MB、玩家双手 0.4–0.8 MB、显影/水波遮罩 0.1–0.25 MB、首屏回忆缩略图约 0.3–0.6 MB，约 4.1–7.45 MB；命中角色缓存后新增约 2.1–3.95 MB。原照片按需加载，上述为压缩传输预算估计而非实测。

## 源文件与清单

所有以下最终 PNG、初稿和本说明都在用户指定输出目录内。工具服务的默认源文件保留未动。

| 目标文件 | 内置工具源文件 |
|---|---|
| R-study-keyart.png | C:/Users/Jackzz/.codex/generated_images/01a0da69-9f41-77c3-9904-4f579277dba0/exec-90c2fdc2-5a5a-408d-abbb-aea117c26b96.png |
| R-study-play-initial.png（弃用） | C:/Users/Jackzz/.codex/generated_images/01a0da69-9f41-77c3-9904-4f579277dba0/exec-01b2e93f-9ffc-4e5a-9509-7a0ddab815b4.png |
| R-study-play.png（最终修复） | C:/Users/Jackzz/.codex/generated_images/01a0da69-9f41-77c3-9904-4f579277dba0/exec-c21a6006-bd1c-4ffe-94fd-4122d1477e7e.png |
| R-darkroom-keyart.png | C:/Users/Jackzz/.codex/generated_images/01a0da69-9f41-77c3-9904-4f579277dba0/exec-d170e671-1364-40f3-aec9-a4085524e3de.png |
| R-darkroom-play.png | C:/Users/Jackzz/.codex/generated_images/01a0da69-9f41-77c3-9904-4f579277dba0/exec-ac1b0693-cbb3-4ba7-b2d7-b30ba3593643.png |

实际 PNG 元数据及 SHA256：

```json
[
    {
        "name":  "R-darkroom-keyart.png",
        "width":  1672,
        "height":  941,
        "bytes":  2110963,
        "sha256":  "879197B63F140599DFF2E19D045884B9365B4776CF01F229E1B720AF45C2C11F"
    },
    {
        "name":  "R-darkroom-play.png",
        "width":  1672,
        "height":  940,
        "bytes":  2162241,
        "sha256":  "65F2408234826D82B4544C1AC6499D50D62D9B3B8A8A0B57FB777BB1FCA63FF8"
    },
    {
        "name":  "R-study-keyart.png",
        "width":  1672,
        "height":  941,
        "bytes":  2322334,
        "sha256":  "0D8CE478E09A762C46FE99A91C389538AF4AE6510A24DE2E8933A52974182DE0"
    },
    {
        "name":  "R-study-play-initial.png",
        "width":  1672,
        "height":  941,
        "bytes":  2411481,
        "sha256":  "539419CCA9983347A5069D636C0C748A0F0290BDFE7A6C0041ED6DE9BA9E7558"
    },
    {
        "name":  "R-study-play.png",
        "width":  1672,
        "height":  941,
        "bytes":  2348474,
        "sha256":  "84AE105851958FF46392593D58C712DD7E5B8F3CD307B67984DF394515A84297"
    }
]

```

## 完整生成提示词

### R-study-keyart.png

```text
Use case: stylized-concept.
Create ONE premium finished landscape 16:9 scene illustration, at the largest supported landscape resolution (target 1672x941 or larger), for Our World, a real-person companion app. File intent R-study-keyart.png. No UI, text, captions, watermark, or comparison layout.
References: reference 1 A5 is Ayu's exact face, navy-black tousled hair, thin round glasses and charcoal hoodie, and anime illustration finish only: remove all reference UI. Reference 2 A1 supplies the approved fine-line semi-realistic 2D anime CG style and intimate first-person composition, not its apartment.
New place: a dedicated snow-night reading study, distinct from the apartment, wide old wooden writing desk, tall window behind the partner revealing falling snow and cool moonlit snowy branches. Tall shadowy bookcases and beautiful dark wood details. Only one real-person avatar across the desk, AYU, mid-20s, seated half-body, lower body fully hidden. He holds a fountain pen above his open notebook, looking up at the viewer with a small quiet warm smile, subtle banker's-lamp reflection on glasses without obscuring his eyes. Gentle focused intimacy, not exaggerated anime expression.
The camera IS XIAOMAN seated across the desk. In foreground, her two natural feminine hands emerge from oversized CREAM KNIT CARDIGAN cuffs: one rests on her open diary, the other gently cups her cocoa mug. Never show Xiaoman's face or body or reflection. First-person ownership is immediately clear.
Objects: green glass brass banker's lamp at one side pools golden light across parchment; stacks of books; Ayu's dark laptop set obliquely behind his notebook, screen unreadable; an hourglass; a clear glass jar containing a few folded paper stars; TWO cocoa mugs total, one for each person; Xiaoman's open diary and her fountain pen; a knitted blanket draped on the partner's chair. Keep objects readable and plausible, not crowded.
Palette deep navy shadows, bottle green lamp shade, lamp gold, warm parchment. Practical lamp is warm key; window moonlight is cool contrasting rim. Cinematic bloom and bokeh, very fine clean linework, soft cel shading with painterly gradients, warm subsurface skin, detailed controlled hair highlights, fabric knit texture, shallow depth of field, rich foreground/midground/background separation. High-end original anime game key visual, NOT photorealistic and NOT 3D render or chibi.
Composition: viewer's diary and cream cuffs occupy bottom foreground, Ayu waist-up centered across the table, full face and shoulders prominent, not a tiny figure in an architectural wide shot. Room gives environmental depth. No extra people, no silhouettes or literal reflection, no halos, no glowing object outlines/rings/markers, no floating interface, no readable book titles, no logos. Anatomically correct hands and face. Preserve Ayu's reference identity.
```

### R-study-play-initial.png

```text
Use case: stylized-concept. ONE finished landscape 16:9 premium anime CG gameplay scene, largest supported landscape resolution (1672x941 or larger), filename intent R-study-play.png. No UI, labels, captions, watermark.
Reference 1 A5 locks AYU's face, dark navy-black tousled hair, thin round glasses, charcoal hoodie, illustration quality, never its interface. Reference 2 R-study-keyart locks the exact snow-night reading-study architecture, desk, green banker's lamp left, snowy tall window behind, rich bookshelves, visual palette and characters.
First-person view from XIAOMAN seated at the wooden desk. Exactly ONE partner across, AYU seated waist-up, table hiding his lower body. The emotional moment is the gentle handoff between focus sessions. In foreground Xiaoman's LEFT hand in an oversized CREAM KNIT CARDIGAN sleeve has just turned the brass hourglass upright in a believable grasp around its upper side; the hourglass is large and close, tilted only slightly, fresh sand beginning to fall through the narrow neck. Her RIGHT hand, also cream cuff, steadies her open diary at the bottom right. Correct two arms and two hands total for the viewer. Clear hourglass geometry, natural grip.
Across the desk Ayu softly nods with warm engaged eyes and quietly opens a clothbound book with his two hands; no pen in his hands. He is clearly recognizably A5 but slightly softer in focus than foreground hourglass. To one side of the hourglass is an OPEN clear glass jar containing a few handmade folded paper stars. ONE additional little folded paper star is dropping directly into the open mouth, only a few centimeters above it: the lingering completion reward of the PREVIOUS focus session as the next session begins. It is paper, not luminous and not magic icon. No sparkling reward burst.
Desk still contains two cocoa mugs, books, a closed or unobtrusive side laptop, a fountain pen beside Xiaoman's diary and partner's chair knit blanket. Lamp on left creates a warm pool; moonlit blue snow beyond the window casts a clean cool rim. Use strong foreground/midground/background separation; sand and hourglass and cream-knit fingers are crisp, partner face clear enough for identity. High-end fine-line 2D anime CG, soft cel shading with painterly gradients, detailed hair, warm translucent skin, restrained cinematic bloom and bokeh; NOT photorealistic, not 3D, not chibi.
Deep navy, bottle green, brass gold and parchment palette. The scene is a quiet study with its own intimate architecture, not a reskinned cafe. No extra people or reflections, no readable text, no glowing object outlines, rings, markers, halos, arrows, or game UI. Preserve hand anatomy, eye anatomy, natural book grip. First-person hands actually trigger the ritual, partner visibly responds.
```

### R-study-play.png：定点修复

```text
Use case: precise-object-edit. Edit reference 1 R-study-play-initial only, preserving 99 percent of it, exact 16:9 landscape size 1672x941. Reference 2 A5 is only an identity reference for the seated male Ayu; never copy its UI.
Critical correction: the hourglass currently contains an erroneous folded paper star in its LOWER glass bulb. REMOVE that paper star entirely; both bulbs of the hourglass must contain only fine golden-white SAND, with a fine continuous stream of sand through the neck. No objects, paper, stars, glitter, symbols inside either hourglass bulb.
Add exactly ONE small folded origami paper star OUTSIDE the hourglass, directly vertically above the OPEN glass jar mouth to the RIGHT of the hourglass. This falling star should sit a few centimeters above the jar opening at x around 620 of 1672, y around 645 of 941 (rough visual position, not text). It must be unambiguously in air over the jar and not inside or overlapping the hourglass. This depicts a PREVIOUS focus session's completed paper-star reward dropping into the jar while the viewer turns the hourglass for the NEXT session. The jar's existing paper stars stay.
Everything else is immutable: Ayu's exact friendly face and round glasses, his hair and charcoal hoodie, book and hands, viewer Xiaoman's two cream knit sleeves and hands, the hourglass brass frame and hand grip, the desk arrangement, snowy moonlit window, banker's lamp and warm-gold versus cool-blue illumination. Preserve gorgeous fine-line 2D anime CG style. No additional characters, no UI, text, captions, arrows, glowing rings or halos. Just make this one physical correction.
```

### R-darkroom-keyart.png

```text
Use case: stylized-concept. Create ONE beautiful product-grade landscape 16:9 anime CG scene at largest supported landscape resolution, 1672x941 or larger. Intent R-darkroom-keyart.png. NO UI, text, captions or watermark.
Image 1 A1 is exact identity and rendering-style reference for XIAOMAN: early 20s woman, chestnut shoulder-length hair with wispy bangs, small GOLD STAR HAIR CLIP, warm amber eyes, cream chunky knit cardigan over white tee, thin gold necklace. Preserve face and all identity traits under altered lighting. Image 2 A5 is identity reference for AYU ONLY in tiny memory photographs if needed. Do not copy reference rooms or interfaces.
Room: a genuinely distinct traditional intimate photographic darkroom, a narrow wet black laboratory counter shared as a seated table between two partners. Exactly ONE physical partner, Xiaoman, sits waist-up across the counter and faces us. She smiles delightedly over a freshly developed little photograph held near chest level by photographic tongs in one hand; other hand rests safely on dry counter. Lower body hidden by counter. She is the emotional focus. No apron necessary; recognizable cream cardigan picks up red safelight.
Camera IS AYU seated opposite; at bottom foreground his own TWO natural masculine hands in CHARCOAL HOODIE sleeves are visible, one resting on the near rim of a developing tray, the other holding a pair of unused tongs beside it. Viewer face/body never visible.
Art-directed darkroom: three rectangular shallow developing trays spread across the counter with wet reflections, a photographic enlarger off to the left rear, a small analog timer without readable numbers, a compact radio, metal clips, blank paper stack kept tidy. A clothesline of DRYING SMALL PHOTOGRAPHS across upper background, never across her face; pictures are tiny memories of these same two original people at a beach, cafe and ferris wheel, rendered as obvious 2D photographic prints rather than extra people in the room. No giant portraits.
Lighting: dramatic practical red safelight key overhead left, believable crimson/black room, soft warm skin highlights sufficient to read her amber eyes, dark chestnut hair and gold clip, very deep soft shadows. A THIN TEAL-COOL STRIP OF LIGHT UNDER CLOSED DOOR in rear right provides contrast. No broad daylight window, no city scenery in room itself. Moist glossy trays catch scarlet reflections, restrained cinematic bloom, depth separation and bokeh. Color scheme crimson, black, warm flesh and small teal accent. Cozy creative intimacy, not horror.
Style exactly approved high-end original 2D anime game CG: very clean fine line art, semi-realistic anime proportions, soft cel shading with painterly gradients, luminous skin, detailed hair highlights, beautiful fabric knit. Not photorealistic, not 3D, not chibi. Correct hands, plausible tongs pinching PHOTO EDGE. Face and photo remain distinct, never cover her eyes. No text anywhere, no iconography, glowing rings, outlines, halos or interaction markers. No other real people or reflections.
```

### R-darkroom-play.png

```text
Use case: stylized-concept. Create ONE beautiful finished first-person landscape 16:9 anime CG gameplay scene, largest supported landscape resolution (1672x941 or larger). Intent R-darkroom-play.png. No UI, captions, label text, watermark.
Reference 1 A1 locks XIAOMAN's exact recognizable face, amber eyes, chestnut shoulder-length hair with wispy bangs, small GOLD STAR HAIR CLIP, cream chunky cardigan, thin gold necklace, gorgeous fine-line 2D anime CG style. Reference 2 R-darkroom-keyart locks the darkroom set: red safelight upper left, enlarger left, closed door back right with tiny teal light underneath, photo clothesline above, three wet trays. Reference 3 A5 locks AYU's face ONLY as seen on the tiny developing photograph; do not copy its UI.
Camera IS AYU seated at the narrow counter opposite exactly ONE partner, XIAOMAN. Composition favors a BIG DEVELOPING TRAY in foreground lower half. Ayu's TWO natural male hands with CHARCOAL HOODIE cuffs clearly grasp opposite outside side rims of this tray, gently rocking it so the reflective red-tinted solution forms small diagonal ripples over the paper. Correct wrists, five fingers per hand where visible, no extra arms.
A small landscape photographic print lies UNDER the liquid flat inside this large shallow tray, showing XIAOMAN and AYU smiling together at a FERRIS WHEEL. The image is only HALF DEVELOPED: the right half/edge remains soft milky pale paper; the left/central half shows the couple plus ferris-wheel spokes gradually becoming visible. This is chemistry-style tonal emergence on paper, not a photo torn in half, not cut-and-paste or an image on a screen. Small memory picture uses same original identities but must read as a flat physical print.
Across the counter Xiaoman leans forward eagerly, smiling with softly parted lips, looks DOWN at the image appearing in the tray with bright excited amber eyes rather than staring into camera. Both her hands rest on the far DRY edge of counter, fingers lightly curling, NOT in solution. Waist-up/half-body framing and desk hides lower body. Her face remains large and attractive in the upper middle, unobstructed by props or photos.
Drying photo clothesline high above, with tiny beach, cafe and ferris-wheel memories, no extra physical people. Other two trays sit back to either side; tongs laid nearby, timer and radio peripheral. Dramatic RED SAFELIGHT is practical key, warm skin, deep black shadows and a THIN small teal cool line under the closed door. Wet tray highlights, atmospheric bokeh, cinematic restrained bloom and foreground/midground/background separation. Palette crimson-black with small amber skin and teal accent.
Style locked to approved reference: high-end semi-realistic 2D anime CG, clean fine line art, painterly gradient cel shading, warm subsurface skin, luminous detailed hair, precise beautiful knit texture. Not photorealistic, not 3D, not chibi. No glowing outlines, rings, halos, interaction markers, arrows, badges, extra people, reflections, readable text or captions. Tactile tray rocking and her interested response must read clearly.
```

