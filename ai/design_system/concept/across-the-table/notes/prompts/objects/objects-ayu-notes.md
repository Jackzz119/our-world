# 阿屿对坐物件分支：提示词与直接像素审查

- 模式：design；本分支使用内置 image_gen 分别生成三张首版，每次仅生成一张；随后根代理对星星罐单独编辑一次，补齐纸条愿望笔迹。
- 当前最终 OB-starjar.png 为根代理修订版，首版保留为 OB-starjar-initial.png；OB-letter.png 与 OB-calendar.png 仍采用首版。输入参考图均未覆盖。
- 图像参考：A1-keyart.png（场景、绘画与奶油针织身份）；A5-avatar-creator.png（阿屿脸、头发、眼镜与服装）。两份都以绝对 referenced_image_paths 传入本分支的三次首版生成；根代理修订使用星星罐首版与 A5，详见 objects-core-notes.md。
- 实际像素结果直接检查：已检查三张首版，并用 view_image 直接读取当前 OB-starjar.png，对根代理修订版进行独立复核。人物身份、手的归属、服装、视角、实物操作与无 UI 约束均通过概念图层面的检查。未进行 Claude Monet 主美审批，最终取舍交 Monet。
- 这里仅交付平面概念 PNG；下面的拆层、骨骼、动画与压缩预算都是制作建议，不是已完成资产，也没有声称已经测量压缩性能。

## OB-starjar.png

### 所见与作用
前景两只奶油色针织袖口的手，一手悬着粉色纸星准备放入玻璃罐，另一手拿纸条；阿屿在对面拿蓝色纸星微笑。当前修订版的淡紫色纸条上已能直接看到细手写笔迹，纸条下端有一个小心形，补足“写下愿望再折纸”的物证。玻璃罐内有许多淡粉、淡黄与淡蓝纸星，暖光与微小亮点在玻璃和纸星之间出现；雨夜窗景沿用 A1。一个人的完整半身，前景只出现观看者的双手，没有第二组人物倒影，没有交互轮廓或标记。阿屿眼镜和深色发型与 A5 连续；修订后脸、袖口、罐体和全局构图未见明显漂移。

### 可见弱项
当前修订版的笔迹属于不可可靠阅读的视觉占位，真实愿望仍应由应用文本数据提供；静态画面证明写愿望、折纸、投放与共同参与的意图，不能证明内容保存。罐内亮点略接近细灯串的视觉语义；制作时应把发光限制在几颗刚投入的纸星，保留大多数纸星的普通纸材质。星星仍被指尖捏住，属于释放前关键帧，落入结果要靠后续动画。

### 首版记录（initial，仅供追溯）
OB-starjar-initial.png 的原始观察为：“纸条上没有清楚可见的手写愿望；静态画面证明折纸、投放与共同参与的意图，不能证明愿望内容的保存。”其中“没有笔迹”的缺陷已由当前修订版修复，不再作为最终图结论。

### 当前版与首版文件验证
直接读取 PNG IHDR 并计算 SHA256；以下为实际文件量测。

| 版本 | 文件 | 尺寸 | 字节数 | SHA256 |
|---|---|---|---:|---|
| 当前最终版 | OB-starjar.png | 1672×941 | 2310942 | B674DE4CDF25560C7A893AEBFC8AF00F60DBCD4AAC313913C644FDAABD49DD15 |
| initial | OB-starjar-initial.png | 1672×941 | 2349155 | 19A74BB49CDD2282F1096DDBE14FED36987709ADAEE97D98EC024DBCCFF682F7 |

### 建议交互闭环
触碰纸条 → 折叠并放入纸星 → 纸星落入、罐内轻闪，对方举起自己的星星 → 愿望在共同罐中等待被查看 → 完成愿望后可将星星作为共同记忆保留。异步时只留下罐与星星，不伪造阿屿在线反应。

### 制作建议与预算
共享房间背景、阿屿头/发/眼镜/躯干/左右臂、前景左右手袖、罐后壁、罐内纸星、罐前壁与反射分开；投放纸星单独 sprite，罐口遮挡单独 mask，避免纸星穿过玻璃壁。动画可用手指松开、落入碰撞小幅摆动、两三颗星短暂亮起；阿屿只在真实在线共同操作时举星或微笑。粗略压缩传输目标：共享背景 AVIF/WebP 0.6–1.2 MB；角色共用图集 1.5–3 MB；本物件与前景手部增量 0.25–0.55 MB；本张整图展示图 0.45–0.9 MB。均为估算、不是测量。

### 生成来源
当前修订版：C:/Users/Jackzz/.codex/generated_images/01a0da69-f803-79a0-9a25-585afc2cff17/exec-03f046cf-5a0d-4921-b8f2-b40e76322d45.png。完整修订提示词及执行记录见同目录 objects-core-notes.md 的“OB-starjar.png 单图修订”。

initial：C:/Users/Jackzz/.codex/generated_images/01a0da6b-37ff-7643-8e4a-09fc7d6c3da2/exec-4fa9e8d7-daa4-4c2b-820d-d3ae8cb8b90a.png。

## OB-letter.png

### 所见与作用
奶油色袖口右手将木柄黄铜印章竖直压在信封红蜡上，左手压住信封。印章顶端和左侧蜡样都带小星星。阿屿对面伸出接信的手，另一只手靠着杯子；旁边短笺与钢笔能读出“写信”而没有要求读懂文字。红蜡反光、纸纤维、铜器和木桌的材质区分清楚。盖章动作与接收方向同时可见，满足从观看者到对方的小仪式。

### 可见弱项
短笺只有模糊手写纹理，不是真实内容；正式信件正文需使用应用真实文本层。当前图只证明封信过程和接信期待，离线持续存在、后来拆信等状态都不能由静帧验证。为了展示星形，画面放了一枚示范蜡封，制作版可以去掉示范，改用拔起印章后露出的真实星纹。信封离对方伸手仍有一段距离，适合作为盖印中关键帧而非交接完成帧。

### 建议交互闭环
写好短信 → 加蜡并按下星形印章 → 印章抬起、封口反光，对方在线时伸手 → 信封移到对方桌侧持续等待 → 对方拆开后收进共同信匣。离线保留空椅和信，不自动播放接信反应。

### 制作建议与预算
共享房间和阿屿基础 rig；信封 flap/body、蜡未压/压下/成印三态、印章杆/底、左手和右手、信纸真实文本、对方接信手分开。纸纤维不烘入正文，蜡亮斑用小透明叠层；动作只需短压印位移、停顿、抬起，接收动画使用独立前臂网格。粗略压缩目标：共享背景 0.6–1.2 MB；角色共用图集 1.5–3 MB；本物件和前景手部增量 0.25–0.6 MB；整图展示图 0.45–0.95 MB。以上不是实测，不含语义消息或文本数据。

### 生成来源
C:/Users/Jackzz/.codex/generated_images/01a0da6b-37ff-7643-8e4a-09fc7d6c3da2/exec-1272b585-c3e1-44ad-9f0a-6672ed52bd94.png

## OB-calendar.png

### 所见与作用
奶油色袖口一手稳住木架、一手翻起仍连在两枚黄铜环上的纸页，下面一页有红色小爱心与干净日历格。阿屿半身微笑、双手相对做鼓掌动作，稀疏纸花瓣和金纸屑位于日历上方而不盖住脸。没有 UI 框、互动发光圈、额外人物或强反射。礼物式正反馈清楚，人物反应比另两张活跃。

### 可见弱项
日历刻意不呈现可读日期数字，因此这张是纪念日动作概念，不是最终日期信息设计。鼓掌双手尚未相触，静态读为拍手过程的将合帧；完整动画需补合掌和分开帧。翻页纸面结构在近景基本成立，但正式拆层需要重画环穿纸孔及纸页背面，不能把整幅直接自动切片当生产素材。

### 建议交互闭环
翻看桌面日历 → 翻到共同纪念日 → 小花瓣与纸屑轻散，对方在线时鼓掌 → 红心页停留在桌面 → 自愿保存当天照片或留言作为回忆。没有连续签到或漏签惩罚。

### 制作建议与预算
木架固定层、两枚铜环的前后遮挡、旧页/新页/弯折阴影、红心标记、前景双手、少量纸片粒子、阿屿双臂与掌面分开。翻页用简单二维网格弯曲；纸屑最多 12–20 枚、短时一次播放；鼓掌不使用整图逐帧视频。日期由实际数据绘制到纸面，不能复用概念图空网格作为功能日历。粗略压缩目标：共享背景 0.6–1.2 MB；角色共用图集 1.5–3 MB；本物件与前景手部增量 0.2–0.5 MB；整图展示图 0.45–0.9 MB。以上均为估算。

### 生成来源
C:/Users/Jackzz/.codex/generated_images/01a0da6b-37ff-7643-8e4a-09fc7d6c3da2/exec-96016f10-4815-4d82-99ea-0994a2e01b13.png

## 完整生成提示词

### OB-starjar-initial.png（原始生成提示词；最终修订提示词见 objects-core-notes.md）

```text
Use case: stylized-concept.
Asset: OB-starjar, one product-grade landscape concept illustration for Our World, a real-person couples companion app. Generate one single image, maximum supported landscape resolution, approximately 16:9, at least 1672x941 if supported.
References: image 1 A1 is approved room, painting and feminine cream cardigan identity reference. Image 2 A5 is the exact approved identity of Ayu, the young adult man with dark navy-black tousled hair, thin round glasses and charcoal hoodie. Preserve his face, eyes, hair, glasses and warm personality. Do not copy any UI from either reference.
Scene: seated first-person camera at the familiar polished walnut home table on a rainy city evening. EXACTLY ONE actual person visible in the room: Ayu sits across, framed half-body, table concealing lower body, leaning warmly toward the shared activity. The camera IS Xiaoman: only her two anatomically natural feminine hands and cream cable-knit cardigan sleeves enter prominently from the bottom foreground.
Action: intimate close tactile paper-star wish ritual. A clear round glass jar stands centrally on the table, its wide open mouth clearly visible and filled with many small folded pastel paper stars. Xiaoman's nearer hand delicately releases one completed five-point puffy folded paper star just above the opening; the other hand holds a slender paper strip midway through folding with a small wish represented by a few tiny unobtrusive ink strokes, NOT readable text. Several spare strips and one finished star lie naturally on the table. Ayu holds his own small folded star between his thumb and index finger at chest/table level, about to contribute, his other hand resting naturally on the table. He looks at the shared jar with a soft engaged smile. The object response is a restrained warm internal glow among existing paper stars and a few minute star glints; realistic transparent glass with distinct rim, no large sparkles or magic vortex.
Visual hierarchy: foreground Xiaoman hands and luminous jar in crisp focus; Ayu's recognisable face clear in midground; rainy window and softly blurred city bokeh behind. Warm practical table lamp from the left plus contrasting cool blue window rim on dark hair; subtle bloom, fine clean line art, soft cel shading with painterly gradients, detailed hair highlights and fabric texture, warm skin, premium mature 2D anime CG exactly matching references, not photorealistic, not chibi. Quiet affectionate ordinary room with visual breathing room. No human reflections.
Constraints: this is a scene illustration, no UI, no borders, no captions, no readable lettering, no watermark. No interaction rings/outlines/halos/pin markers; only the paper stars' own subtle glow. No extra people, no duplicated arms, no extra fingers, no franchise resemblance. Correct visible sleeves: viewer cream knit, partner charcoal hoodie. Keep the jar transparent and the star-drop action physically readable.
```

### OB-letter.png

```text
Use case: stylized-concept.
Asset: OB-letter, one product-grade single landscape concept illustration for Our World, the real-person couples companion app. Maximum supported landscape size, approximately 16:9, at least 1672x941 if supported.
Input references: image 1 A1 defines the approved warm/cool anime CG home world and Xiaoman's cream cardigan sleeve material; image 2 A5 is the exact approved face and identity of Ayu (young adult man, navy-black tousled hair, thin round glasses, charcoal hoodie). Maintain identical face design and quality. These are visual references only; REMOVE all interface elements from the new image.
Scene/backdrop: first-person viewer seated at the polished walnut table in the cosy rainy-night city apartment. EXACTLY ONE actual person visible: Ayu sitting opposite, half-body framing, his lower body hidden behind table. Camera IS Xiaoman, only her two feminine hands in cream cable-knit cardigan sleeves visible in bottom foreground. No people in reflections.
Primary action: Xiaoman is pressing an elegant small brass wax-seal stamp with a dark wood handle vertically onto a cherry-red wax puddle on the flap of a cream envelope near the camera. Her right hand visibly grips the stamp, her left gently steadies the envelope with relaxed separated fingers. Show the little five-point star emblem engraved on a visible brass decorative top of the stamp and a completed small star-imprinted wax sample beside the letter so the seal motif is unambiguous while the stamp is pressed. Beside the envelope lies a short handwritten letter, softly defocused ink lines ONLY and no readable words. A simple fountain pen and small brass sealing-wax spoon are supporting props. The wax catches a sharp warm specular glint, quietly making the physical action feel alive.
Across the table Ayu smiles warmly, watching the hands, and extends one anatomically clear open receiving hand toward the envelope without touching or overlapping Xiaoman's hands; his other hand rests beside his blue-grey ceramic cup. His expression conveys anticipation and care. Preserve physical separation between the four hands and their correct sleeve owners. Keep partner face unobscured.
Composition: intimate object close-up foreground, stamp and wax near bottom center, Ayu clear in upper central midground. Enough table visible between viewer and partner that the letter can be imagined waiting on his side until opened. Detailed paper fibers, glossy red wax, aged warm brass, rich wood; no excessive clutter. Warm practical lamp at left, cool blue city/window rim lighting in hair and hoodie, rainy bokeh, subtle bloom, cinematic depth.
Style: high-end 2D anime CG key visual, semi-realistic anime proportions, clean fine linework, soft cel shadows with painterly gradients, warm subsurface-like skin, detailed hair highlights; faithful to both references. Not live-action, not 3D render, not chibi.
Constraints: no UI, no captions, no readable text, no borders, no watermark; no glowing rings, outlines, halos or pin markers around props; no extra people; no extra limbs/fingers; no iconography from existing franchises. Correct viewer sleeves MUST be cream knit cardigan; Ayu wears charcoal hoodie and round glasses.
```

### OB-calendar.png

```text
Use case: stylized-concept.
Asset: OB-calendar, one polished landscape concept illustration for Our World, a real-person couples companion app. Maximum supported landscape resolution, about 16:9, at least 1672x941 if supported. Single image, no panels.
Input references: first reference A1 locks approved painterly anime CG room, cinematic warm lamp/cool rainy city light, and Xiaoman cream knit sleeve texture. Second reference A5 locks the EXACT Ayu identity: young adult man with dark navy-black tousled hair, thin round eyeglasses, warm face and charcoal hoodie. Ignore all reference UI and produce no UI.
Scene: camera IS Xiaoman seated at the polished walnut home table; only her two natural feminine hands and cream cable-knit cardigan sleeves show prominently in bottom foreground. Across sits EXACTLY ONE actual person: Ayu, table hiding lower body, clear half-body framing. Room is the same intimate home by the rainy city window, with warm practical left lamp and contrasting blue rim light; no people or couples in window reflections.
Action/result: Xiaoman flips a physical paper page on a small beautifully crafted wooden triangular desk calendar. The calendar faces the viewer and sits in the center foreground, medium close. Her right thumb and index finger lift the edge of the outgoing page up and around two brass binding rings; her left hand steadies the wooden base. The freshly revealed page clearly carries a SMALL RED HEART marking the shared anniversary, with a restrained simple empty calendar-grid graphic and no words or numerals. The turning sheet must be recognisably attached to the rings, with a curved paper surface. Three or four tiny pale pink paper petals and a sparse little burst of warm gold confetti rise gently above the calendar, showing the object's positive response, subtle rather than magical explosion. Ayu across is visibly CLAPPING: both his hands raised at chest level, palm to palm in a clear anatomically believable clap, broad delighted but natural grin with slightly crescent eyes. Keep his glasses, face and hands crisp and unobstructed; confetti stays below/aside the face. Make the joyful response feel shared with the viewer.
Composition: viewer hands + calendar in sharp foreground; Ayu close and clear upper midground; secondary blue-grey floral cup at side and softly defocused books/plant/lamp framing, rainy bokeh background. Hand ownership unambiguous: cream sleeves bottom near camera, dark hoodie sleeves attached to partner torso. Realistic delicate five-finger hand anatomy, no merging of hands. Strong foreground/midground/background separation and visual breathing room.
Style: premium high-end 2D anime CG key visual, semi-realistic anime proportions, fine clean line art, soft cel-shading blended with painterly gradients, skin glow, detailed hair highlights, knitted fabric and polished wood texture; faithful exact quality and warmth of supplied references. No chibi, no photorealistic rendering, no heavy 3D look.
Constraints: no UI, no captions, no readable text, no watermarks, no frame. No glowing rings, outlines, halos or interaction pin markers. Only tiny confetti, petals and natural glints. No extra people, duplicate arms/fingers, existing franchise elements. This is a kind shared anniversary ritual, no score/streak/reward meter.
```
