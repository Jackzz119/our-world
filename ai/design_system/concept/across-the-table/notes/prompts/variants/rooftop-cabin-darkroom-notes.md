# 天台 / 木屋 / 暗房生成与视觉核查记录

- 模式：design。执行工具：内置 image_gen；未使用 CLI、API key 或外部生成回退。
- 本分工交付 3 张最终图，另保留 1 张明确失败的初稿。所有最终图均 1672×941，RGB 不透明场景。
- 直接检查了 A1-keyart、A5-avatar-creator、R-rooftop-keyart、R-cabin-keyart、R-darkroom-keyart 的像素，也检查了每次生成返回的图像像素。暗房原图位于 rooms-1/20260925-211124Z；普通 rg 会跳过其忽略目录，使用 --hidden --no-ignore 后找到。
- 这是生成方的自审，不冒称独立 Monet 最终定稿批准。最终设计选择仍交主美。
- 三张均为唯一对坐伙伴、桌后半身、正确观众袖口、无托腮、无 UI 和交互描边。静态画面不能证明真实在线状态或已实现的动画；下述循环与拆层均为生产建议。

## VA-rooftop-rain.png

**画面与概念 A：** 阿屿穿炭灰连帽衫，戴细圆眼镜，左手在桌面、另一手握住透明伞杆，张口轻笑看向观众。小满的米白针织袖口与双手出现在前景。透明伞面有明确骨架、雨珠和滴水，桌边机械固定座可见。城景和河面处于雨雾中。左侧灯笼、野花、西瓜，右侧音箱、纸笔、葡萄及后方望远镜保留首轮位置，撑伞动作取代火花棒和托腮。

**观察优点：** 掌心与握杆接触清楚；伞杆未穿过脸部；雨被限制在伞外大环境，暖灯与灰蓝天色形成层次；伙伴笑容是视线中心。无额外真人、反射双人或环形热点。

**可见弱点与边界：** 伞占据整幅上沿，牺牲了首轮的天空面积；手机竖裁容易切掉右手和杆，所以竖屏需单独构图。望远镜的防雨覆盖范围在该裁切下不完整可见。无法从单张图确认它是否全部在伞下。原有夜景改成偏暮色的夏雨，仍呈现较多城市灯光；不是正午阵雨。新增伞杆带来桌上道具轻微位移，不是像素注册式重光照。

**拆层 / 动画 / rig：** 远景天空、城市与河面、雨幕；栏杆植物、串灯及独立水滴；座椅与望远镜；伙伴头发/眼镜/脸/嘴/身躯/左右上臂/前臂/手掌；伞杆固定座、伞骨、透明伞面、水珠为独立层；桌面及道具；观众双手袖口。伞杆只轻晃，握持手跟随约束；笑容和眨眼由用户真实动作/选择驱动；自然雨滴可循环，不能凭环境推断真人在笑。

**玩法循环（提案）：** 阵雨出现 → 观众轻敲杯缘录一段短雨声节奏 → 对方端桌面出现对应杯纹与声音回放 → 双方各添一段组成雨天合奏 → 自愿存入共享回忆；离线时只留下待听声片和空座暖痕，下次由真人播放，不伪装即时响应。

**压缩预算（估计，未实际压缩）：** 静态预览 WebP/AVIF 约 0.35–0.75 MB；分层背景与道具 1.2–2.0 MB，伙伴/前景手部透明图集 2.2–3.5 MB，雨滴/伞面特效 0.2–0.5 MB；房间首包约 3.6–6.0 MB，不含音频/共享已有角色资产。实际 PNG 2,566,871 字节。

## VA-cabin-day.png

**画面与概念 A：** 阿屿换厚灰色绞花毛衣，双手抬杯到嘴边，低头轻吹热茶。前景小满仍以米白针织袖口捧同款树纹杯。左边石壁炉、两只花纹袜、柴火；右边大窗、积雪松林、唱机唱片、格纹沙发；桌上棉花糖碗、烤棒、棋盘盒都延续首轮位置。窗外由飘雪黑夜换成蓝天与阳光雪山，室内炉火显著降低。

**观察优点：** 嘴唇轻噘、目光下垂与双手杯子形成明确吹茶动作；没有托腮或一直凝视镜头。毛衣与绒毯纹理连续；窗外明亮冷色使同一木屋出现清晨后晴日的状态差别。暖火没有继续压过日光。

**可见弱点与边界：** 原红绿格毯仍覆肩，比提示中的“折到椅肩”更接近首轮轮廓；符合用户厚毛衣要求，但动作轮廓变幅不如天台大。壁炉仍有低位可见火苗，并非全熄。杯口薄烟与人物口部接近，动态实现应避免白烟遮脸。该图将远山画得更清晰，天气变化合理，但不宜宣称背景纹理完全锁定。

**拆层 / 动画 / rig：** 雪天窗景、玻璃与窗框；室内木墙、石壁炉；低火/余烬、蜡烛独立发光；唱机盘片与沙发；毛衣角色身体与披毯分开；双手/杯身/杯液/蒸汽分层；桌边观众双手与杯；棋盘盒与烤棒为独立道具。角色抬杯和吹气动作需要嘴型、头颈俯仰、手杯绑定；蒸汽沿单向微风偏移即可，不做整张画面网格晃动。

**玩法循环（提案）：** 真人选择泡茶休息 → 观众拖动茶包、倒水并轻触吹凉 → 对方端杯中生成对应茶色和蒸汽 → 对方实际举杯确认后出现两枚相配杯垫痕迹 → 自愿收藏当天茶配方；离线仍可留一杯待泡茶配方，不倒计时、不变冷惩罚。

**压缩预算（估计，未实际压缩）：** 静态预览约 0.4–0.8 MB；分层背景与道具 1.3–2.1 MB，角色/毯/手/杯图集 2.2–3.5 MB，火焰与蒸汽 0.15–0.4 MB；房间首包约 3.7–6.0 MB。实际 PNG 2,582,189 字节。

## VA-darkroom-lights.png

**画面与概念 A：** 小满以两只手分别举起日落海景与白花照片，位于胸前两侧不挡脸；观众阿屿的炭灰袖口与指向白花照片的食指明确可见。开放式黑页相册铺在两人之间，已收纳照片、余下照片待选。放大机、挂照片绳、左边瓶罐和计时器、右侧收音机、叠纸、工具筒、蓝色门边光与三只前景显影盘保留识别性布局。

**观察优点：** 两张照片有清楚间隔，手指与照片接触清晰；相册让选择有具体归宿。小满身份标志完整：栗色短长发、星夹、琥珀眼、项链、米白针织。最终图左上红色安全灯内腔为暗色，已熄灭；环境由画外普通工作照明照亮，整体中性暖色，没有红色安全灯染色。

**修正证据：** 首稿把同一红色安全灯画成亮白色灯，这不符合“安全灯关、普通照明开”。已保留 VA-darkroom-lights-initial.png；只针对灯具关闭及微小计时器字面进行了重生成，最终图保留所有动作和相册构图。没有批量重做其他两张。

**可见弱点与边界：** 普通顶灯在画外，能从环境照明看到效果，不能在画面里直接指认灯具本体；安全灯关闭本体是可见的。相册占用原先托盘后方区域，托盘在构图中稍向前移，仍是同一房间但不应标为逐像素一致。背景小照片和计时器细节是绘制细节，不可当作可读 UI。显影盘内仍有水，实际分层需在相册区保留干燥边界，避免让互动表象变成在水中整理照片。

**拆层 / 动画 / rig：** 墙面、门、设备与瓶罐；晾片绳、夹子、每张相片分别拆层；已关闭安全灯与普通照明遮罩独立；小满头/发/眼/嘴/双臂/手；两张持有照片必须独立平面绑定手指，不能糊进手部纹理；相册页、照片卡、页角与阴影；前景指选手、袖口、三盘水面。指选后可把所选真实照片由手递向相册，partner reaction 仅跟随真人确认。

**玩法循环（提案）：** 两张已干照片待选 → 观众指选其中一张并拖到相册空位 → 对方端收到同一照片候选与页位 → 对方实际确认或换图后双方相册同步翻页 → 该页成为共享回忆；离线保留候选夹和空座，不生成假选择、不替对方确认。

**压缩预算（估计，未实际压缩）：** 静态预览约 0.3–0.65 MB；背景与设备 0.9–1.7 MB，角色/手/持片图集 2.2–3.5 MB，相册/照片/翻页图集 0.4–0.8 MB；房间首包约 3.5–6.0 MB，不含后续用户上传照片。实际最终 PNG 2,169,227 字节；初稿 2,206,304 字节。

## 文件与源输出

| 最终文件 | 生成源输出 |
|---|---|
| VA-rooftop-rain.png | C:\Users\Jackzz\.codex\generated_images\01a0da71-d85a-7032-a5fd-bdbb0a2c13a4\exec-8763f528-76b5-4028-8c9b-d9e899856c75.png |
| VA-cabin-day.png | C:\Users\Jackzz\.codex\generated_images\01a0da71-d85a-7032-a5fd-bdbb0a2c13a4\exec-62bce432-0215-47ec-b12b-cac74f2641fa.png |
| VA-darkroom-lights-initial.png | C:\Users\Jackzz\.codex\generated_images\01a0da71-d85a-7032-a5fd-bdbb0a2c13a4\exec-abbaf11a-6682-4cee-84ec-fde20b021e64.png |
| VA-darkroom-lights.png | C:\Users\Jackzz\.codex\generated_images\01a0da71-d85a-7032-a5fd-bdbb0a2c13a4\exec-a5c39a7e-7abd-49ec-8369-efdb2b010ac1.png |

生成源未删除，参考图未覆盖。目标目录：D:\Repo\our-world\.claude\worktrees\dynamic-scene-concept-design-0b6ef0\ai\design_system\codex-visual\scene-concepts\A-world\variants\20260925-211913Z\

## 精确生成提示词

### Rooftop
```text
Use case: stylized-concept / identity-preserve and lighting-weather.
Generate ONE polished landscape 16:9 high resolution image, largest supported landscape resolution, preferably 1672x941 or higher. A single full-bleed scene, no collage, no panels, no UI, no text.
Image 1 is the EXACT ROOM COMPOSITION reference: keep this rooftop's wooden table, the lantern and white wildflowers on the left, watermelon plate lower left, woven runner, foreground floral mug, right-side retro portable speaker, blank paper and pen, grapes far lower right, cushioned wicker seating behind the partner, metal rooftop rail, skyline and river beyond, telescope at back right and overhead bulb string. Preserve the perspective and major object positions. Remove the handheld sparklers for this rainy variant.
Image 2 is the IDENTITY reference for the one seated partner, Ayu: identical original semi-realistic anime male in his mid 20s, dark navy-black tousled hair, thin round glasses, charcoal hoodie. Use his face and glasses only, copy none of the UI from this reference.
Change the weather and moment: a summer rain shower on this rooftop, late-afternoon grey blue hazy city, visible slanting raindrops outside shelter, beads and dripping drops on the existing string lights. A BIG CLEAR TRANSPARENT UMBRELLA is firmly fixed over both sides of the table; its translucent ribbed canopy visibly shelters both partner and viewer, metal pole firmly clamped near the right table edge without covering the face. Ayu sits across the table half-body, laughing warmly with open smiling eyes, one anatomically clean hand gripping the pole to steady it and the other resting naturally on the tabletop. Nobody rests chin or cheek on a hand. His hands are distinct, plausible with five digits. Camera IS the seated viewer Xiaoman. In foreground, exactly the viewer's two hands and oversized cream knit cardigan sleeves: one around her floral mug and one resting on the dry table. Only one actual person visible across; no other people or reflection doubles.
Style tightly match the reference: premium 2D anime CG illustration, fine clean linework, subtle painterly cel gradients, warm skin, detailed hair, NOT photoreal, NOT chibi. Practical amber lantern/bulbs give warm facial key light against cool rainy ambient rim, believable clear umbrella transmission, glistening wet edge of table while central props stay sheltered, layered depth and soft background bokeh. Mood is spontaneous intimate shared laughter, not fear. No object outline, no ring, no interaction halos, no pin, no text, no logo, no watermark. Keep the telescope and speaker dry within shelter. All key room props stay recognizable. Preserve 16:9 camera at the original same seated table height.
```

### Cabin
```text
Use case: stylized-concept / lighting-weather / identity-preserve.
Generate ONE high-quality 16:9 landscape image, largest supported landscape size, preferably 1672x941 or higher. Full bleed illustrated scene only: no text, no UI, no collage.
Image 1 is the EXACT ROOM LAYOUT reference. Keep the same cozy log cabin composition and same seated camera: stone fireplace on the left with two patterned stockings and evergreen garland, logs and lantern beside it; rectangular timber-framed window behind-right showing snow-covered pine forest and distant mountains; record player and shelf of vinyl below/right window; tartan sofa and patterned cushions; wooden table across bottom with woven red-green runner, marshmallow bowl and toasting sticks on left, wooden chessboard box at right, candle lanterns at edges. Preserve every recognizable signature prop's position and camera framing. Image 2 supplies the exact original anime identity of Ayu: tousled navy-black hair, warm eyes and thin round glasses. Use face/hair/glasses, never copy UI.
Time and weather change: BRIGHT CLEAR DAY AFTER SNOWFALL. Blue sky, brilliant white snow on the pines and landscape through the same window, strong crisp cold blue daylight fills the room and lies in a clean patch across the table. The fire in left fireplace is LOW, small embers and low flames not a blazing fire, a gentle warm fill only. Overhead garland and existing candles are subdued.
Exactly one partner Ayu seated across the table, half-body behind the table hiding lower body. Change outfit to a thick oatmeal-to-charcoal grey cable-knit winter sweater with no hood; the original red-green tartan blanket is folded over chair shoulders rather than wrapping him. He holds a tree-patterned ceramic cup of tea carefully with both hands just below his mouth, lips gently pursed BLOWING ON THE TEA, gaze lowered to cup, soft peaceful expression. Visible gently curling steam drifts sideways with the breath. Both hands anatomically clean and naturally gripping cup. No chin on hand, no cheek support. Camera IS viewer Xiaoman, her two hands with oversized CREAM KNIT CARDIGAN sleeves appear along foreground holding her own matching cup. One actual person across only; no background visitors, no reflection duplicates. Cups contain tea, no floating marshmallows; bowl of marshmallows remains a recognisable room prop.
Strict style matching: premium 2D anime CG key visual, fine clean line art, painterly soft cel gradients, semi-realistic anime proportions, rich textile detail, luminous warm skin, hair detail, cinematic atmospheric layering, foreground/midground/background separated by subtle shallow DOF. Not photoreal, not chibi. Snowlight cool and bright, subdued amber hearth contrast, clear daylight transformation of same room. No words or numbers, no logo or watermarks, no object outlines, glowing rings, interactive halos or pin markers. Maintain all room geometry and table perspective from first reference.
```

### Darkroom 初稿
```text
Use case: stylized-concept / identity-preserve / lighting-weather.
Create ONE premium 16:9 landscape illustration at the largest supported landscape resolution, ideally 1672x941 or higher. Full-bleed scene, no text, no UI, no collage or board.
Input image 1 is the EXACT ROOM reference: preserve the very same photographic darkroom layout, same seated-camera viewpoint and tabletop/counter perspective. Left background is a photographic enlarger, red-domed safelight high left, bottles and simple timer on the left counter; a row of clipped hanging dry white-bordered photographs spans the upper background; center-right dark doorway with narrow cool edge light, towels on the right, right counter with retro black radio, blank paper stack, tool can. Preserve lower foreground three developing trays at their existing positions, shifted only slightly down/in front to make usable dry space on the counter beyond them, and preserve the original left/right room geometry. Input image 2 is Xiaoman's exact face and original style identity: early 20s, chestnut-brown shoulder length hair with soft wispy fringe, small gold star hairclip, warm amber eyes, oversized cream knit cardigan over white tee, thin gold pendant necklace. Copy no pose from input 2: NO CHIN ON HAND.
Change this room to AFTER PRINTS HAVE DRIED, NORMAL LIGHTS ON FOR SORTING. The red safelight is visibly OFF, a normal broad neutral-warm overhead worklight illuminates the room and renders all colors naturally, a faint cool ambient doorway edge provides contrast. NO RED WASH. Keep the hanging photographs and characteristic equipment recognizable; orderly clean dry tabletop area. A wide OPEN PHOTO ALBUM lies on the counter in front of Xiaoman between her and the foreground trays, pages populated by some dry photographs with empty mounting spaces. A few neatly sorted small prints beside the album.
Exactly one actual partner Xiaoman seated across the table half-body, table hides lower body. She holds TWO separate small dry white-bordered landscape photographs SIDE BY SIDE, one in each hand at upper chest height, level and fully visible to viewer with a clear gap between them, well below face. On one photograph a tiny sunset seaside scene, on the other a tiny plant/flower still-life; recognizable miniature images without text or additional actual people. Her hands hold the outer bottom edges naturally with clean finger anatomy. She looks at the viewer with curious warm smile, inviting a choice. Elbows naturally away from her face. No chin support or cheek resting. The camera IS seated viewer Ayu: two visible foreground hands and CHARCOAL HOODIE sleeves, left hand resting near table edge and right hand pointing a single index finger toward one of the offered prints, with clean distinct five-finger anatomy. Do not bring viewer face or body into frame.
Maintain EXACT reference illustration language: high-end original 2D anime CG, semi-realistic anime proportions, fine linework, painterly soft cel shading, warm glowing skin, detailed hair highlights, believable fabric texture, cinematic key light with cooler ambient edge, modest bloom and soft bokeh. Room still intimate but clearer and lighter than safelight reference. No extra seated person, no reflection doubles. Background photos can show scenic memories, not extra live people. No text or numerals anywhere, no logos, no watermark, no glowing interaction rings, outlines, halos or pins. No new unrelated room props. Keep same room and identity unmistakable.
```

### Darkroom 定向修正
```text
Use case: precise-object-edit. Edit image 1 with ONE targeted correction. Keep its entire composition, Xiaoman's face, pose, hairclip, amber eyes, necklace, cream knit cardigan, two held photographs, foreground charcoal sleeves and pointing hand, open album, three trays, all room geometry and props UNCHANGED. Image 2 is only supporting original identity/style reference; do not borrow its room or pose. Largest supported 16:9 landscape size, match 1672x941 or higher.
FIX LIGHTING FIXTURES: The hanging dome at the extreme UPPER LEFT is the RED SAFELIGHT and must be OFF. Restore its dull dark burgundy/red metal dome, dark unlit bulb/interior, zero bright white opening, zero red light spill or glow. It must unmistakably look switched off. The room is lit instead by a separate normal warm-white CEILING WORKLIGHT just outside the top frame / or a small visible simple white ceiling fixture at the very top edge, producing the same bright neutral-warm room illumination already present. Keep the room well lit and face beautiful with a gentle overhead practical light and cool doorway ambient. Do not darken entire room. The safelight is OFF while normal overhead light is ON.
Also keep the timer face as tiny unlabelled tick marks only, no numbers, no lettering anywhere. Change nothing else. Preserve the two photographs side by side at chest height and album, five-digit clean hands. Exactly one seated person, no extra people, no chin on hands, no UI, no text, no rings, no halos, no watermarks. Premium 2D anime CG finish identical to input 1.
```

