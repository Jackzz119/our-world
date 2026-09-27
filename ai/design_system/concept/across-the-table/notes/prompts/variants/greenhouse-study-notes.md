# 温室与书房变体 · 交付证据

模式：design。工具：内置 image_gen；共三次初次生成，加两次针对明确缺陷的单图定向修正。每张生成后直接查看工具返回图像，使用 System.Drawing 验证尺寸，PNG 均为 1672 × 941。源参考图未改动；温室夜晚与书房黎明的旧稿分别保留为 VA-greenhouse-night-initial.png、VA-study-dawn-initial.png，最终同名文件为修正版。

## 共同验收

三图均为桌前第一人称、对面仅一位伙伴、半身构图、前景两只手；无托腮、无 UI、无文字标题、无交互光圈、无第二人倒影。人物身份特征可辨；温室前景为阿屿炭灰帽衫，书房前景为小满奶油针织袖。说明：这些仍为扁平概念图；图层、骨骼和动画尚未制作，Web 预算是制作规划估值而非实测压缩结果。房间在总体架构与道具锚点上保持一致，但生成式图像不是逐像素相同的背景底板。

## VA-greenhouse-rain.png

- 画面：小满双手抱起左侧苗盆，一手托盆、一手在幼苗上方遮护，目光落向植物。雨滴覆盖斜屋顶与侧窗，花叶湿亮；右侧花盆、左铜壶、右铲子和喷壶、前景压花本保持原房间位置。
- 对概念 A 的作用：把伙伴从“托腮看你”转成共同照料植物的专注动作；前景自己的种子袋把双方动作接在同一张桌面上。
- 直接观察的弱点：环境仍保留较暖的发丝与脸部高光，灰绿阴雨感偏柔和，未达到极阴沉的暴雨；这是本轮轻微光色偏差，不构成人物/姿态失败。植物标牌被去字/省略，符合场景无文案要求。
- 制作拆分：棚架/远景植物底板、玻璃雨滴与水流、后层植物、人物、前景桌面、手持盆/苗、前景手与种子袋、工具遮挡；遮护手和托盆手分别绑骨，盆与身体交接处需要遮挡补画。
- 可动画：玻璃细雨流、叶端水滴、小苗细摆、呼吸、目光下移后抬眼；护苗动作只由真实用户动作触发，不伪造真人在线状态。
- 五步玩法：雨声或伙伴留言触发 → 观者把种子袋滑到共享苗盆旁 → 伙伴实际选择护苗/回送回应，离线则只让盆内小芽轻摆 → 双方桌上留下同款护苗罩/装饰 → 手动收藏一页生长照片。植物不会死亡，无连续签到惩罚。
- 压缩 Web 预算估值：背景 AVIF/WebP 0.6–1.0 MB；角色图集 2.0–3.5 MB；前景/道具图集 0.6–1.0 MB；雨粒子/掩码 0.1–0.2 MB；合计约 3.3–5.7 MB 首次房间视觉资源，不含音频。
- 原始 PNG：2,776,326 bytes；SHA256 836A4A64414B557C6B719CBD7DEBB7154A39321AB40890F66EAD082843E5A7CD。

## VA-greenhouse-night.png

- 画面：相同棚架与桌面，星夜从玻璃屋顶透出；植物间串灯照亮小满，她笑着抬起小铜壶向左盆浇水。左侧原大铜壶仍在，右侧园艺工具保留。
- 对概念 A 的作用：伙伴主动参与浇水，脸部笑容与小水流把动作和植物结果放在同一视线范围，区别于雨天的安静护苗。
- 定向修正与复核：初稿另一手贴近壶嘴，水流像从壶腹漏下，已保留初稿并修正。最终版另一手掌心托住壶底，一条连续细水弧明确从壶嘴末端落进左苗盆；无壶腹漏水。剩余轻微弱点：串灯高光密集，背景略抢眼；花朵的苍白发光感主要来自灯光而非强烈自发光。
- 制作拆分：温室夜景底板、星空与玻璃、串灯发光层、后层植物、人物/笑口替换、抬壶左右手、壶、水流、两盆、前景手/压花本；大壶继续作为静态环境物，小壶为活动道具。
- 可动画：细流水粒子、土面轻微湿润、叶片回复、嘴型笑容、串灯低幅亮度变化。光点仅为真实灯珠/反光，不给互动道具画提示环。
- 五步玩法：选择今晚的一盆 → 观者拖动小壶倾斜 → 伙伴真人点击回浇或离线留下待看水滴 → 叶片舒展并留下一片可采压花 → 选择加入共享植物册。浇多/少只换积极动画，不出现枯萎。
- 压缩 Web 预算估值：夜景背景 0.6–1.0 MB；角色图集 2.2–3.7 MB；桌面/壶/花盆图集 0.7–1.1 MB；星空/灯/水粒子掩码 0.1–0.3 MB；合计约 3.6–6.1 MB，日夜共用角色和桌面图集后增量可更低。
- 最终 PNG：2,638,244 bytes；SHA256 95552C64D71AE844ACBAC5222E41B73E6EFFA7B65BC3568A58046E84B203ADF8。初稿 PNG：2,697,052 bytes；SHA256 01D7AA17808D209A7CF3D280A49CE961768D2B268A54BDF76247D6A48D061500。

## VA-study-dawn.png

- 画面：阿屿坐在原书桌对面闭眼浅睡，眼镜已推到额头，双手都留在桌面，一边肩膀露出、一边还搭着奶油毯。窗外雪景转成浅蓝晨光；绿罩台灯仍亮，纸星罐、左右书堆、笔记本、杯子、右笔电/沙漏仍在对应位置。
- 对概念 A 的作用：允许伙伴不持续对视，用有真实状态依据的静静陪伴取代“永远在线看着你”。前景奶油袖与自己的杯子维持小满视角。
- 必需状态约束：仅在阿屿本人明确选择“睡眠”状态时显示此姿态；不能通过离线、窗口失焦或没有打字推断入睡。若实际离线且未选睡眠状态，必须改为空椅及温暖痕迹，这张概念图不能用作一般离线外观。
- 定向修正与复核：初稿书页/书脊含伪文字，已保留初稿并修正。最终版双本子均为纯空白纸页，左侧前景书脊只剩皮革与直线金边，台灯发光面和暖光池略降；蓝晨光/雪景/睡姿/额头眼镜均保留。剩余轻微弱点：为保持皮肤与环境温度，暖面光仍可见，正式制作应让灯光强度独立可调。
- 制作拆分：雪景远背景、窗与书架底板、台灯/暖光层、桌面书本、人物静息姿态、额头眼镜、滑肩毯、双手、前景两手与杯子；毯子必须遮罩绑定肩部，眼镜使用独立刚性部件。
- 可动画：很小的胸肩呼吸、毯边缓动、杯面余汽与窗外稀疏雪屑；避免频繁头部点动制造假睡眠监测感。
- 五步玩法：对方主动设置睡眠状态 → 观者把杯垫和折纸星轻放到他桌边 → 仅物件产生落定/微光反应，人物保持静息 → 睡醒后对方实际打开收到的小礼物 → 选择把“陪你到天亮”场景存入共享回忆。不给睡眠时长评分，不计算陪伴连续天数。
- 压缩 Web 预算估值：背景 0.6–1.0 MB；静息角色与毯子图集 1.8–3.2 MB；桌面/前景图集 0.8–1.3 MB；光/汽小纹理 0.1–0.2 MB；合计约 3.3–5.7 MB，不含音频。
- 最终 PNG：2,239,109 bytes；SHA256 510A1D83D8A88A0E3E2A5C144AB487A34C3C60504B2BCF9CDA86ED8BCFC642DB。初稿 PNG：2,290,994 bytes；SHA256 B5B0C88232C2A832111849EA60D4B59300CC6541BC9872BF0025BFB2470E5BE4。

## 工具输出源路径

- VA-greenhouse-rain.png ← C:\Users\Jackzz\.codex\generated_images\01a0da71-71fe-7c03-878e-66ec98f0dab9\exec-ea40b458-47c4-4b33-b3fe-cf61dc352ea8.png
- VA-greenhouse-night.png ← C:\Users\Jackzz\.codex\generated_images\01a0da71-71fe-7c03-878e-66ec98f0dab9\exec-55649f1b-1da8-4861-8f58-5f7f78115946.png
- VA-study-dawn.png ← C:\Users\Jackzz\.codex\generated_images\01a0da71-71fe-7c03-878e-66ec98f0dab9\exec-1e8472bf-2533-4dcf-ab46-05dcbf7d3abd.png

## 精确提示词

### VA-greenhouse-rain.png
```text
Use case: stylized-concept, identity-preserving weather and pose variant. Create ONE finished product-grade 16:9 landscape illustration at the largest supported landscape size, target 1672x941 or higher. Output image only, no typography. Image 1 is Xiaoman's exact face/style identity reference. Image 2 is the greenhouse room key art: preserve this room's camera angle, scale, centered partner framing, white pitched glass roof architecture, rear planting shelves, hanging fern baskets, flowers, weathered timber table, copper watering can on left, garden tools/sprayer/twine and botanical seed packets on right, open pressed-flower notebook at foreground center. Do not copy the reference pose. Scene: same glass greenhouse on a rainy day. Dense raindrops and flowing streams on roof and side glass, grey-green diffuse daylight, leaves glossy and softly dripping, cool silver-green ambient with very subtle warm interior bounce, cinematic but naturally overcast rather than sunny. Across the table sits exactly ONE person: Xiaoman, female early twenties, chestnut shoulder-length hair, soft wispy bangs, small gold star clip, amber eyes, cream chunky cardigan over white tee, thin gold necklace. Keep her face and hair identity identical to image 1 and image 2. NEW POSE: she is sitting upright, gently holding a small terracotta seedling pot close against her upper torso; left hand supports the pot bottom, right palm curves protectively above and beside the delicate seedling, fingers naturally spread in a sheltering gesture. Eyes softly focused on the plant, warm affectionate smile. No hand near chin or cheek. The pot she lifts is one of the original two pots; the second pot remains on the table in its original right position. The viewer IS Ayu seated opposite: his two hands and charcoal hoodie sleeves visible along lower foreground edge, one holding the botanical seed packet and the other resting by the pressed-flower notebook. No viewer face, no reflections of people, no extra characters. Half-body composition; table fully hides lower body. High-end original 2D anime CG, semi-realistic anime proportions, fine clean linework, soft cel shading with painterly gradients, warm subtle skin subsurface, detailed glossy hair, bloom only in highlights, shallow depth, strong foreground/midground/background separation. Scene carries absolutely no text: remove the writing from wooden plant markers, no readable writing on seed packets/books, no UI, no icon, no title, no watermark, no glowing object outlines, no rings or halos. Anatomy: one head, two arms, two hands on partner, correct finger anatomy; exactly two viewer hands. Preserve original greenhouse architecture and tabletop staging rather than designing a different room.
```

### VA-greenhouse-night.png
```text
Use case: stylized-concept, identity-preserving night and pose variant. ONE finished product-grade landscape 16:9 illustration at largest supported landscape size, target 1672x941 or higher. Input image 1 is Xiaoman's exact identity and anime style reference. Input image 2 is greenhouse room key art, preserve the architecture, camera, scale and original prop staging. SAME greenhouse at night: white pitched glass roof clearly showing a starry dark indigo sky, hanging baskets and ferns in same positions, rear planting shelves, white window grid, weathered wooden gardening table, copper watering can at far left, garden tools and spray bottle on right, open pressed-flower notebook and botanical seed packets in foreground, original two terracotta pots still placed side by side at center. Tiny warm fairy lights have been wound through the existing plants, warm local key light across face, cool blue moon and starlight ambient and rim. A few pale white night-blooming flowers softly luminous from light, no magical glowing aura. Centered across the table sits exactly ONE real-person partner avatar, Xiaoman early twenties, chestnut shoulder-length hair, wispy bangs, gold star clip, warm amber eyes, cream chunky cardigan over white tee, thin gold necklace, recognizable same facial proportions as both references. A completely NEW POSE: upright cheerful laugh with softly crinkled amber eyes and open smiling mouth, her shoulders relaxed; both hands actively control a SMALL extra garden watering can she has lifted, one hand on its handle and one supporting the body, tipping a fine stream into the LEFT seedling pot. Hands well below chin, no face touching, no chin resting on hand. Keep the large copper can at left in place; the small hand-held can is a usable light prop. Water goes into soil, not outside pot. Viewer is Ayu seated opposite: exactly two natural viewer hands and charcoal hoodie sleeves along foreground edge, one hand beside seed packet and the other by pressed-flower notebook; no viewer face. Half-body seated framing, table hides lower body. Intimate tactile shared gardening ritual, playful expression rather than static posing. Original high-end 2D anime CG gacha key-visual quality, semi-realistic anime proportions not chibi not photograph, clean fine linework, soft cel shading and painterly gradients, warm skin subsurface, detailed hair highlights, cinematic glow and bokeh, strong layer separation. Preserve room camera and layout. No other people, no human reflections. Absolutely NO text anywhere, remove writing on plant markers, no labels, no UI, no watermark, no glow rings, no outlines or interaction halos. Realistic clean two-hand anatomy for her and for viewer.
```

### VA-study-dawn.png
```text
Use case: stylized-concept, identity-preserving dawn and pose variant. ONE finished product-grade 16:9 landscape illustration at largest supported landscape size, target 1672x941 or higher. Input image 1 is Ayu exact face, hair and glasses identity reference ONLY; do not copy its UI. Input image 2 is study room key art: preserve this specific room, original locked seated viewer camera and perspective, half-body framing, centered partner, dark timber bookshelves on both sides, large snowy mullioned window behind him, green brass banker's lamp at left foreground, daisies and many book stacks to left, jar of folded paper stars left middle, notebook open at center, partner floral dark mug center-right, laptop on right, brass hourglass and books on far right, foreground viewer's open notebook and white floral mug. Change time to pale blue dawn following an all-night reading session: sky outside pale cool blue not deep night, no moon, snow thick on sill and trees; cool early light dominates, banker's lamp remains ON but its warm pool weak against the blue dawn, other candles nearly burned down. Exactly ONE partner across, Ayu male mid twenties, navy-black tousled hair same recognizable original facial identity as image 1, charcoal hoodie. NEW POSE: naturally ASLEEP while seated upright in his chair, both eyes closed, head tilted slightly sideways and gently backward, relaxed mouth, glasses pushed UP on his FOREHEAD clearly above brows with lenses visible in hairline. Hands do not touch face. One hand rests loosely on his open notebook, the other relaxed on table next to mug; pen lies on the open page. A soft cream/beige blanket has slipped down from one shoulder, other shoulder still draped. Warm peaceful real-person companionship. This pose represents the partner's EXPLICIT manually chosen sleep status, never inferred from inactivity (no UI depicting this). Viewer IS Xiaoman, her two natural hands with oversized CREAM KNIT CARDIGAN sleeves visible along bottom edge; one lightly rests beside her notebook, other touches her own white floral cup. Table fully hides all lower body. No extra people, no human reflections. High-end 2D anime CG illustration, semi-realistic anime proportions not chibi not photographic, clean fine line art, soft cel shading with painterly gradients, warm subtle skin, detailed hair highlights, cinematic practical warm lamp versus cool blue dawn rim, atmospheric bokeh, strong foreground/midground/background separation. Keep architecture and prop locations strictly matching study reference. NO hand under chin or resting on cheek. No UI, no labels, no watermark, NO visible text anywhere: book spines blank/decorative, journal pages can have faint abstract non-letter strokes but no legible writing, laptop angled blank dark. No glowing rings/outlines/halos around props. Correct anatomical two arms/two hands on partner, exactly two foreground viewer hands.
```

## 参考证据

生成前用 view_image 逐一查看：
- A-across-the-table/20260925-091923Z/A1-keyart.png：小满身份、材质、脸部风格；两张温室都传入。
- A-across-the-table/20260925-091923Z/A5-avatar-creator.png：阿屿身份、发型与眼镜；书房传入，UI 只作排除项。
- A-world/rooms-1/20260925-211124Z/R-greenhouse-keyart.png：温室格局/道具/机位；两张温室都传入。
- A-world/rooms-1/20260925-211124Z/R-study-keyart.png：书房格局/道具/机位；书房传入。

## 定向修正的最终工具源路径和精确提示词

以下覆盖前文初次生成的最终来源；前文提示词保留作初稿过程证据。

- VA-greenhouse-night.png ← C:\Users\Jackzz\.codex\generated_images\01a0da71-71fe-7c03-878e-66ec98f0dab9\exec-5043ccd2-dd21-4520-bad3-7b30512b3e19.png
- VA-study-dawn.png ← C:\Users\Jackzz\.codex\generated_images\01a0da71-71fe-7c03-878e-66ec98f0dab9\exec-0f1a4f5e-1688-4c35-9dea-5a6ecf22218d.png
- 前文两条工具源路径现在对应各自的 -initial.png，初稿原像素已保留。

### VA-study-dawn.png 修正提示词
```text
Use case: precise-object-edit. Edit image 1 with only the following targeted corrections. It is the finished study-dawn illustration to preserve, at the SAME 1672x941 landscape dimensions. Image 2 is Ayu identity reference only, do not add its UI. 1) Remove ALL handwritten pseudo-text and letterlike scribbles from BOTH open notebooks: the large foreground notebook and the notebook under Ayu's hands. Make all four visible pages completely plain blank cream paper, with their paper texture, page curvature, shadows and pen intact. No writing, no lines of marks, no pictograms needed. 2) Remove ALL letterlike glyphs and title marks from visible book spines, especially the left foreground stacked books. Retain only plain leather surfaces with simple straight gold bands. Also clean book spines on rear shelves of any letterlike marks. No text anywhere in the resulting picture. 3) Slightly dim the left green banker's lamp and its warm pool, about 25 percent less bright, so the blue snowy dawn through the window is the dominant ambient source; keep the lamp visibly lit, not switched off. Everything else must be preserved as closely as possible: Ayu's exact sleeping face, closed eyes, glasses pushed to forehead, messy black-navy hair, head tilt, charcoal hoodie, two hands on table, pale blanket slipping off one shoulder, viewer's cream cardigan sleeves and hands, two mugs, brass hourglass, laptop, jar of folded stars, all props and their original positions, camera perspective and crop, snow outside, bookcase and window architecture, premium 2D anime CG linework and fine surface details. Exactly one partner, exactly two viewer hands. NO chin resting on hand, no additional people, no text/UI/halo/ring/watermark. This sleeping avatar reflects an explicitly selected sleep status. Do not change pose, wardrobe, room layout, or facial identity.
```

### VA-greenhouse-night.png 修正提示词
```text
Use case: precise-object-edit. Edit ONLY the small hand-held watering can, its water and Xiaoman's supporting hand in image 1. Image 1 is finished greenhouse-night illustration and must otherwise be preserved nearly pixel-identically. Image 2 is Xiaoman identity reference only; retain image 1's smile and original pose. SAME 1672x941 16:9 landscape output. Correct the small watering can physics: the can is raised and slightly tilted, its narrow spout projects rightward then points DOWN into the LEFT terracotta seedling pot. Make one single thin continuous curved stream of clear water visibly emerge ONLY from the terminal opening at the very END OF THE SPOUT. It must arc down directly into the soil of the LEFT seedling pot. No rain of water, no perforated sprinkler fan, no water beneath or leaking out of the can's belly/base, no disconnected droplets falling from nowhere. Keep a clean visible gap around the spout tip so its water source is unambiguous. Her upper hand continues gripping the top handle. Move her other hand away from the spout tip and water; that hand now naturally supports the BOTTOM/SIDE of the small can's body with palm up and correctly shaped fingers, without blocking the spout or the water. Thus she uses two hands on the can: handle hand above, supporting palm below. Water flow may be subtle but its correct connection to spout must be visible. Preserve all other elements: Xiaoman's exact face, open laugh, amber eyes, chestnut hair, gold star clip, cream cardigan and gold necklace; same camera, roof architecture, starry night, hanging baskets, fairy lights, foreground charcoal hoodie sleeves and exactly two viewer hands, large copper can left, seed packets, pressed-flower book, tools and right flower pot. Same premium 2D anime CG illustration, fine clean line art, painterly soft cel shading, warm practical fairy lights and cool night rim. No chin touching, no extra characters or limbs, no letters/text/UI/watermark, no glowing rings or interaction outlines. Do not redesign the room or retouch unrelated features.
```
