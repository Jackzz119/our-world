# 海边与列车变体：生成证据与自审

模式：design。范围仅 VA-seaside-storm、VA-seaside-stars、VA-train-dawn 三张。使用内置 image_gen 工具，未使用 CLI/API Key。三张最终文件均为 1672×941；本文件是该分工的制作记录，最终总报告由主代理汇总。最终设计裁决仍交 Monet；本记录明确为图像生成者自审。

## 证据与共通要求

已直接检查 A1-keyart、R-seaside-keyart、R-train-keyart 的像素。前者锁定小满脸、星星发夹、项链与动漫 CG 风格；后两者分别锁定海边和列车的镜头、建筑及标志道具。生成结果逐张直接查看，而非仅依赖提示词。

三张都有且只有一位对坐小满，前景阿屿的两只手和炭黑卫衣袖；无托腮、无 UI、无互动光圈或人物倒影。小满均保留棕色齐肩发、琥珀眼、金星发夹、细项链与奶油针织开衫。海边暴风前扶头发、星夜指星、列车写明信片，动作轮廓有明显区别。无角色可见下半身。本次为合成静帧概念稿，不能直接证明已实现分层、骨骼、交互或响应式。

## VA-seaside-storm.png

**直接观察**：左上贝壳风铃、左白纱帘、左花瓶/贝壳碗/空白小台历、白栏杆、右百叶窗与草帽靠垫、红格果酱罐和早餐盘保持原房间位置。海天被深蓝灰云层覆盖，下方金色天际线照亮翻浪。小满抬手压住风中的头发，另一手稳果汁杯，张嘴笑看向观者。对坐关系和第一人称双手完整。

**用途与弱点**：把天气变化变为两人共享的兴奋瞬间；风吹发丝、窗帘和海浪给同一套场景增加动势。人物仍处于较强金暖光中，风暴危险感被有意弱化；静帧中的风铃倾斜幅度较小，摆动只能由后续动画落实。早餐道具延续参考，因此暴风时仍有露台早餐，叙事可解释为突来的天气变化，不能当成已经收好桌面的状态。

**生产建议（未实现）**：远云/天际金光/海面/近浪分 4 层；白建筑与花木遮挡层；窗帘网格与逐串风铃骨骼；小满头发前后片、扶发手臂、持杯手、表情；前景双手及杯；桌面/食品保持静态。低幅风力统一驱动头发/帘/铃，手杯接触用固定约束。动态风力只影响环境，不能自动声称对方正在兴奋；角色反应需真实在线动作或主动选择状态。

**五步玩法建议（非已实现）**：阵风触发风铃轻响 → 观者拖拢纱帘/扶稳风铃 → 帘和铃减幅、桌侧暖光稳定 → 对方桌边留下一枚从贝壳碗中选择的小贝壳 → 自愿保存一次“听过的海风”回忆。离线时结果留在空位与贝壳上，等对方回来查看；不模拟离线人的笑。

**压缩网页预算估算**：静态整图 AVIF/WebP 约 0.45–0.9 MB；分层房间 1.5–3 MB，人物复用图集 2–4 MB，风帘/浪/铃效果 0.2–0.6 MB。合计初次该房间约 3.7–7.6 MB；这些是制作规划估算，未导出或测量压缩包。当前交付 PNG 实测 2,585,306 bytes。

## VA-seaside-stars.png

**直接观察**：同一个白木露台和原位早餐物件；左中桌面单盏铜灯笼照亮人脸/毛衣/桌面。天空银河与密星、远海反光、近岸蓝色荧光浪可辨。小满一只手完整伸向左上方指星，眼睛也看向指尖方向，另一手持杯。前景双手仍为炭黑袖子。

**用途与弱点**：由看观者转为共同看天空，避免始终凝视；指尖把情绪与环境联起来。人脸和胸前暖光较亮，灯笼光的衰减偏理想化；正式灯光分层可适度压低胸前和右臂亮度。星空密度高，缩小画幅后可能形成颗粒干扰；手机裁切不能直接从中央截取，否则指尖与银河会丢。早餐布置是遵循原房间道具的结果，在夜晚有叙事违和但不是换房间。

**生产建议（未实现）**：天空/银河纹理、海面反光、岸边荧光浪分别叠层；保留同一白木建筑底图；灯笼火焰和暖光遮罩分离。人物新增肩肘抬臂姿态、指手替换片、眼球注视偏转；手臂跨越大范围，宜独立姿态而非强拉同一网格。星闪低频局部，不能全屏闪烁；荧光沿浪峰缓动。

**五步玩法建议（非已实现）**：观者看到稀疏星光变化 → 在桌上空白小卡点两三个星点 → 天空短暂回应一束细星闪，不画光圈 → 对方桌边收到同一张小星图卡 → 自愿收入共同夜空相册。异步时卡片留桌，人的指星动作只在真实在线参与时触发。

**压缩网页预算估算**：整图 AVIF/WebP 0.5–1 MB；复用海边建筑/桌面，星空海面新增 0.8–1.6 MB，灯笼与荧光效果 0.2–0.5 MB，人物抬臂新增姿态图集 0.4–1 MB。复用基础包后的夜间增量约 1.4–3.1 MB。未做压缩实测。当前 PNG 2,598,203 bytes。

## VA-train-dawn.png

**直接观察**：左侧黄铜包边大窗与流苏台灯、红丝绒卡座、右侧退远走道及壁灯、两份便当/两个银杯托茶杯、皮册/木印章/地图/明信片均保留。窗外改为日出海岸，近树有水平掠影，远海与山镇较清楚。小满低头，一手握笔，另一手压住卡片；人物没有托腮或直盯观者。

**修复证据**：初稿在卡片边缘出现小段伪印刷文字，已单张修复；初稿保留为 VA-train-dawn-initial.png。最终右侧明信片边框和前景地图改成无标签图画，写作卡片还保留极细的一道笔迹，属于正在书写的物理道具痕迹，不是可读 UI/标题；不可称其满足像素级“零类文字笔迹”，但无可读短句或场景标注。

**用途与弱点**：把夜行空间延续为清晨共处，伙伴专注写东西与观者查看路线形成自然陪伴。室内灯仍较明亮，正式渲染可以降低其亮度来加强“天已亮”的感觉。脸部低头姿势与原 keyart 不同，因此不能逐像素比较脸形；身份锚点保持可辨。手与笔接触看起来合理，但骨骼转换前仍应由绑定美术单独检查遮挡。

**生产建议（未实现）**：窗外远天/海/远岸/近景植被分速横移，使用窗框遮罩；车厢底图固定；台灯光与清晨斜光拆遮罩。人物写字手/笔/压纸手/纸张独立，写字循环幅度小，眼球保持落在笔尖，不必持续大幅低头。车体仅做轻微摆动，避免晕动。便当、杯、印章不随手臂变形。

**五步玩法建议（非已实现）**：海岸景观经过车窗 → 观者从桌上选一张风景卡，按木印章 → 卡边盖上小图形章/真实伙伴写下短句 → 卡片滑入对方的皮册或桌侧卡堆 → 自愿收录为这一段旅程。离线方看到的是留下的卡与空座，角色写作状态只由在线真实动作驱动。

**压缩网页预算估算**：整图 AVIF/WebP 0.45–0.9 MB；车厢与桌面底图约 1–1.8 MB，窗外多层约 0.6–1.2 MB，复用人物 2–4 MB，新增写字手/笔/纸 0.3–0.7 MB；初次房间约 3.9–7.7 MB。这些均未压缩实测。当前最终 PNG 2,380,762 bytes。

## 最终文件校验

| 文件 | 像素尺寸 | SHA-256 |
|---|---|---|
| VA-seaside-storm.png | 1672×941 | B1A73AAC1BE65E522B97C84951E234CC2531248A27C9E117C00644581F779B9F |
| VA-seaside-stars.png | 1672×941 | 5171F4433B5FDA116CDE45B52B7CDAD62F74EA98E1CFFF50A5AC9DA7340A4404 |
| VA-train-dawn.png | 1672×941 | B5470AD0BC6AD15DF36B201ED62A770C2A8123A1036AD8F26C10D6C78DC16164 |

不生成角色在线状态 UI，所以在线与异步规则仅是生产建议；静帧本身没有证明任何真实在场状态。没有对源图覆盖、没有代码或协议修改。

## 工具原始输出与提示词

生成器默认输出目录：
C:/Users/Jackzz/.codex/generated_images/01a0da71-a718-7fc3-bcfa-5a508d992f64/

- storm: exec-c72b76dc-1ba2-4a40-bd21-e8df3f62d0fc.png → VA-seaside-storm.png
- stars: exec-a164d023-115a-4d13-9162-9e5c40b16375.png → VA-seaside-stars.png
- train initial: exec-adb34a8a-cef2-4477-918f-00cbf2f04431.png → VA-train-dawn-initial.png
- train targeted fix: exec-93e89f4a-f3b3-4d7b-ad6c-ef26bb0bb7a0.png → VA-train-dawn.png

海边两次参考顺序为 A1-keyart、R-seaside-keyart；列车初稿参考为 A1-keyart、R-train-keyart；列车修复为 VA-train-dawn-initial、A1-keyart。均调用 referenced_image_paths 传绝对路径。

### Storm exact prompt
```text
Use case: lighting-weather / identity-preserve. Generate ONE finished landscape anime CG scene, largest supported landscape about 1672x941, 16:9, no panels. Image 1 is Xiaoman identity/style reference ONLY, not pose or home architecture. Image 2 is the exact seaside room/camera/prop layout reference. This is Our World Across the Table, a shared human companion scene; camera is seated viewer Ayu.
Keep Image 2's seaside cottage terrace composition and architecture unchanged: white weathered plank dining table spanning foreground, open view to sea and distant white cliff town, shell wind-chime hanging upper left, sheer white left curtain, low white railing, flowers and bowl of shells left, right white shutters and climbing flowers, right chair with blue-white striped cushion and straw hat. Retain signature breakfast props and positions: toast plates, red-check jam jar, egg cup, juice glasses; small blank tabletop calendar has no letters/numbers.
Change time/weather to immediately before a storm: dramatic dark layered indigo-grey clouds above restless turquoise/slate sea, a narrow gold horizon slit backlighting wave crests. Wind visibly whips the left curtain and swings shell wind-chime; flowers bend subtly. Existing table/room remains dry. Cinematic soft warm light from gold horizon contrasts cool storm ambient.
Exactly ONE visible partner Xiaoman sits across, half body lower body hidden by table: same face as references, warm amber eyes, shoulder-length chestnut hair, wispy bangs, little gold star clip, thin gold pendant necklace, cream oversized knit cardigan over white tee. NEW POSE: sits upright, one hand raised to the SIDE/TOP of her head firmly sweeping windblown hair out of her face, elbow out; other hand securely steadies juice glass on table. Hand never under or touching chin/cheek. Excited delighted open smile, eyes glancing to viewer to share the coming weather, not afraid. Natural clean anatomy and separate fingers.
Viewer's own two hands and charcoal hoodie sleeves appear at bottom foreground matching Image 2's first-person seating. High-end 2D anime CG matching refs: fine linework, semi-real anime, painterly soft cel shading, warm skin, detailed hair, rich tactile wood/knit/food, subtle bloom and atmospheric depth. No chibi, photoreal humans, 3D render, extra people or reflections, no text/UI/logos/watermarks, no interaction rings/outlines/halos/pins. Preserve room camera and character identity; do not repeat chin-in-hand pose.
```

### Stars exact prompt
```text
Use case: lighting-weather / identity-preserve. Create ONE finished 16:9 landscape anime CG illustration at the largest supported landscape resolution about 1672x941. Image 1 is Xiaoman identity/art-style reference ONLY. Image 2 is exact seaside room, camera and prop layout. Change only light/weather and character pose, preserving recognizable architectural positions.
Same seaside cottage terrace from Image 2: white weathered plank table foreground, open sea view and distant cliff town, shell wind-chime upper-left, white sheer left curtain, low white railing, left white flower vase and shell bowl, right white shutters/climbing flowers, right chair with blue-white striped cushion and straw hat. Keep toast plates, red gingham-lid jam jar, egg cup, orange juice glasses and small blank tabletop calendar in their established table positions. Add a SINGLE small brass lantern on clear LEFT-CENTER area of table as the only practical light, not blocking face or hands. Breakfast props remain as the location's familiar still-life, do not invent new clutter.
It is calm deep starry NIGHT. Expansive star-filled indigo sky and a physically soft Milky Way spanning the open sea view, calm dark sea mirrors sparse starlight, blue bioluminescent breaking waves glow along shore (subtle natural water light, never interface outlines). No sunset, no daylight. Single lantern casts amber upward-soft key light on hands/face/knit and nearby table; cool blue starlight rims hair and separates distant scenery. Keep warm skin and readable face despite actual night.
Exactly ONE Xiaoman partner across table, half-body: same warm amber eyes, chestnut shoulder hair/wispy bangs/gold star hairclip/thin gold pendant necklace, cream knit cardigan white tee. Upright NEW POSE: one arm raised comfortably, index finger pointing diagonally upward into the visible open sky at upper LEFT, palm and all fingers anatomically clear; other hand gently holds her juice glass on the table. She turns her eyes slightly skyward following her finger, mouth softly open in wonder with a warm smile. Neither hand touching/supporting cheek or chin, no chin-in-hand. Viewer Ayu hands and CHARCOAL HOODIE sleeves visible at foreground bottom; one near own juice glass, one resting on table. Camera IS viewer, no other persons/reflections.
Match original high-end 2D anime gacha CG polish, fine clean lines, semi-realistic anime proportions, soft cel shading painterly gradients, detailed luminous hair/knit/wood, cinematic depth/bokeh and delicate bloom. No text, labels, UI, watermarks, logos, rings, halos or interaction pins. No photoreal face, 3D, chibi. Keep exactly this room and camera, no layout redesign.
```

### Train dawn exact prompt
```text
Use case: lighting-weather / identity-preserve. Produce ONE finished largest supported landscape 16:9 anime CG scene about 1672x941. Reference image 1 locks Xiaoman identity and visual art style only. Reference image 2 locks the exact luxury vintage TRAIN dining-car room, viewpoint, props and architecture. Change time/weather, landscape outside and partner pose; do not move the camera or redesign the train.
Keep exact reference-2 room: camera is Ayu seated at dining table facing one Xiaoman, table hides her lower body; large rectangular brass-trimmed window down left, antique brass table lamp with cream beaded-fringe shade at far left, small flower vase beside it, dark polished wood walls/brass trim, burgundy patterned velvet booth back, aisle receding to upper right with repeated warm sconces and other empty booths. Keep TWO lacquer bento boxes (viewer lower-left, partner middle), TWO tea glasses with embossed silver holders (viewer foreground center-left, partner left of her bento), right-side leather travel journal, small wooden stamp, map on foreground table and a little postcard stack to partner's right. No printed lettering, logos, readable words, numbers or UI on any prop; cards can show miniature landscape art and indistinct pen strokes only.
It is DAWN: train follows coastal rail line at sunrise, calm glittering sea visible through left window, warm low peach-gold sunlight falls diagonally across the table/knit/face, cool morning blue ambient and softly hazy distant coastline. Slight horizontal motion blur restricted to CLOSE exterior terrain; sunlit sea/distant shore sharp enough to read. Warm lamp still dimly on as practical key companion to daylight. No snow and no moon/night sky.
Xiaoman across, same face, amber eyes, chestnut shoulder hair and wispy bangs, little gold star hairclip, thin gold pendant necklace, oversized cream knit cardigan white tee. NEW engaged POSE: sitting upright slightly bent forward at table, eyes down on postcard, gentle absorbed smile. BOTH hands busy: one holds a pencil/pen naturally and writes a postcard flat on table in front of her; the other fingertips steady that single postcard. Put working postcard between her bento and existing right-hand stack so arms don't occlude identity. Hands clearly separate, clean five-finger anatomy. No hand at face/chin, no chin support, no extra limbs.
Ayu POV: TWO viewer hands and CHARCOAL HOODIE sleeves at lower edge, left loosely holds own silver-holder tea glass and right touches map as in reference. Exactly ONE visible partner; no friends or human reflections or faces in photos.
Style lock: premium 2D anime CG key visual, semi-realistic anime proportions, clean fine line art, soft cel shading with painterly gradients, warm subsurface skin, carefully detailed highlighted hair, tactile wood/velvet/knit/metal, subtle bloom, shallow depth and foreground/midground/background separation. No photoreal human or 3D/chibi. No text/UI/captions/watermarks. No glowing object outlines, rings, halos, pins. Preserve reference room layout.
```

### Train targeted fix exact prompt
```text
Use case: precise-object-edit. Image 1 is the edit target and complete finished composition; Image 2 is Xiaoman identity/style reference. Keep ALL pixels and composition as close as possible to Image 1, including Xiaoman face, hair starclip, hairstyle, necklace, writing hand pose, outfit, viewer charcoal sleeves, train architecture, sunlight, ocean, lamp and every prop position. The only fix: remove ALL letters, numbers, printed labels, words and text-like marks from the postcards and foreground paper map. The postcard directly beneath Xiaoman's pen should have only a miniature seaside landscape watercolor picture on one half and clean blank ivory paper where the pen touches, as if she's about to begin writing/drawing; NO printed caption under the picture. Postcard stack on the right contains unlabeled landscape pictures with blank cream margins, no words. Foreground travel map contains only colored roads, sea/coastline and terrain illustrations, with no city names or marks resembling text. No other changes. Preserve exact 16:9 landscape 1672x941 framing and high-end 2D anime art detail. No UI or captions anywhere.
```

