# 对坐 A 世界 · 桌面仪式三张生成与自检记录

模式：design。负责 OB-musicbox.png、OB-cat.png、OB-phone.png。本记录为生成代理直接看图后的自检，最终设计判断交由 Monet。全部为内置 image_gen 生成，无 CLI/API-key 回退，无源图覆盖；本轮每张生成一次，无明显失败需要重试。

## 共同证据与边界

- 三张均以 A1 为人物、室内场景、光色和渲染风格参考：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/scene-concepts/A-across-the-table/20260925-091923Z/A1-keyart.png。
- 直接观察：每张均只出现一位真实大小的对坐人物小满；可见胸棕发、星形发夹、奶油针织外套、金项链。前景手臂均为阿屿深灰连帽衫袖口。窗内无源图中容易误认成第二对人物的反射。
- 直接观察：无 UI、无标题/标签、无道具选中轮廓或光圈。音乐符号与猫呼噜符号只为本 brief 允许的局部动作提示。电话两侧是短震动线，非交互高亮。
- 已逐张查看生成结果的实际像素。复制入目标目录后读取 PNG IHDR 与 SHA256，三张均为 1672 × 941，无重新编码、裁切或合成。
- 这些是扁平概念 PNG，尚未提供透明分层、骨骼、动画、音频、状态同步实现或压缩后的成品资源。下列资源预算为制作估算，不是实际压缩测试结果。
- 单帧只证明姿态与视觉反馈，不证明真实互动、在线状态、语音或后端事件。实施时只有真实用户触发/选择的状态驱动伙伴动画；离线时必须空座加痕迹，不能复用本组在线人物画面。

## OB-musicbox.png · 八音盒

### 观察与判断

前景左手扶住胡桃木盒，右手指腹接触右侧黄铜上弦钥匙；盒顶是一对尺度很小的黄铜舞伴雕像；小满闭眼微笑、嘴唇略开，以哼唱姿态响应。暖灯照亮盒体和她的脸，窗外蓝雨光区分中后景。金属小人明显为道具，无额外真人。

服务 A 的方式：动作从自己的手开始，经过转动盒顶的小人，到达对面真人伙伴的回应，观者存在感和共享聆听结果都清楚。

可见弱点：旋转只能由小人底座及音符暗示，静态图无法证明它真的转动；音符比“非常淡”略亮，正式动效可降低不透明度。人物头顶略触画幅，移动端不能直接中心裁切，需要单独构图。该图不表明小满真的正在唱歌；如用户未选唱/哼状态，正式场景只用聆听反应。

### 小仪式闭环与生产拆分

触碰上弦钥匙 → 拖转累积弹簧蓄力 → 底座按速度缓起、小人转动 → 对方实际加入聆听时呈现轻微点头/闭眼欣赏 → 可选把曲目和时刻留下为共同回忆。离线则只保留待播放盒子及纸条，等对方亲自开启。

建议拆分：共用房间/窗雨/暖光层；盒身前后与接触阴影；上弦钥匙；黄铜旋转底座；小人前/后轮廓两到四角度贴图；前景两只手及袖口；小满面部表情层。钥匙旋转和底座循环分开，不用整张逐帧视频。小人转动是局部 2.5D 贴图或短帧组，不代表引入 3D 引擎。

增量压缩 Web 预算：0.8–1.6 MB（道具、手部、少量表情贴图），不含共用房间、人物基础 rig 与音频。音乐建议独立按需加载。

## OB-cat.png · 家里的猫

### 观察与判断

一只灰白长毛猫横向走过桌面，抬起一只前爪，尾巴竖起；小满的奶油袖手挠其下巴，前景深灰袖手摸背，另一个前景手扶着杯子。猫把两人的动作连在一起，小满看向猫的表情柔和。腿部是自然遮挡，无明显多肢、额外尾巴或手指融合；背景没有第二只可见猫。

服务 A 的方式：共同的触摸对象让陪伴从盯人变成共同照顾一个小生命，猫的路径自然在两个人之间穿过，且不需要 UI 指示。

可见弱点：猫占据画面右半较大面积、遮住小满部分躯干，适合互动特写，不宜直接作为长期默认待机场景。远侧后腿被身体和袖口遮挡，动画拆件时需要补绘完整腿根与桌面。呼噜卷线呈淡金，正式制作可收成更细、更低对比的局部线条。

### 小仪式闭环与生产拆分

猫主动走到桌边/轻触召唤 → 玩家顺毛抚摸 → 猫抬头蹭对方手并呼噜 → 双方见到同一段愉快反应 → 可选留下一张共同摸猫的小照片。不设饥饿惩罚、死亡、签到或数值负担；离线可让猫在空椅旁留下玩具供对方发现。

建议拆分：猫头、耳、眼、下颌、胸、身体、四腿、尾巴和细毛边 alpha；桌面接触阴影；双方接触手与袖口；呼噜粒子/音频独立。至少 idle/步行/蹭头/受抚四组状态，手与猫的接触点共享锚点，腿骨与尾巴骨单独控制。毛发边缘保持源图软度，不以硬描边标识热点。

增量压缩 Web 预算：1.2–2.4 MB（猫 rig atlas、必要手部与阴影），不含共用场景、人物基础 rig 与声音。以骨骼和局部变形承载大部分运动，避免整猫长序列占用过大。

## OB-phone.png · 转盘电话语音

### 观察与判断

象牙色黄铜转盘电话在桌面右前方，听筒由观者左手抬起，空叉簧清楚；黑色卷线从听筒通向底座；观者另一只深灰袖手靠近底座。小满托腮望向观者、微红着脸微笑。小满没有持听筒。左右手顺序和提示词不同，但满足用户“观者提起听筒”的要求，不构成失败。底座短运动线表达刚响过铃的瞬间。

服务 A 的方式：把未听语音变成房间里可以接起的实体物件，取件动作和对面的情感结果在同一画幅里明确。空叉簧与卷线使物理关系可信。

可见弱点：转盘没有数字，符合无文字要求但正式可用拨号若需要数字须另做排版；摘机后的底座仍有余震线，只宜为过渡瞬间，不能让接通后长期继续响铃。单图不能解释消息由谁在何时留下，需要实际应用用录音来源和事件状态确定。

### 小仪式闭环与生产拆分

真实未听语音到达 → 电话一次轻响/底座轻颤 → 玩家提起听筒 → 语音开始、来电标记消退，对方在线时可收到“已听”回应 → 放回听筒，把语音保留在共同回忆。对方离线时椅子空着，仍可接听其先前留下的录音；本图表现对方在线的接听瞬间。

建议拆分：底座与转盘、叉簧、听筒、卷线、双方接触手与袖口、桌面阴影。卷线沿短曲线变形且固定两端，避免手动动画让线断开；叉簧抬起、铃震和语音播放用同一状态机驱动，摘机即停铃。小满只对真实已听事件做一次轻微眨眼/微笑，不模拟未授权实时反应。

增量压缩 Web 预算：0.7–1.4 MB（电话、手部、阴影和表情增量），不含基础场景、角色 rig、语音文件。语音独立流式/按需加载，录音保留期限另由产品定义。

## 文件与来源

| 最终文件 | 内置工具原始文件 | 尺寸 | PNG 字节 | SHA256 |
|---|---|---|---:|---|
| OB-musicbox.png | C:/Users/Jackzz/.codex/generated_images/01a0da6b-a9fb-7362-bcc5-3d6b86860f7b/exec-6ecf4b11-17d3-4b37-b2bc-85cbcccb4734.png | 1672×941 | 2337378 | 65A96FCE0CD6B595D72BAA2DF71E1120F0DD6246BCCEC010939FB37449262944 |
| OB-cat.png | C:/Users/Jackzz/.codex/generated_images/01a0da6b-a9fb-7362-bcc5-3d6b86860f7b/exec-e8e19aeb-443e-4261-abae-624e9b385235.png | 1672×941 | 2379929 | 35D7A0A5941431803E9359CDB4F4E4F52C7B240168B3443C375FB97453683302 |
| OB-phone.png | C:/Users/Jackzz/.codex/generated_images/01a0da6b-a9fb-7362-bcc5-3d6b86860f7b/exec-dd0dfa4a-c990-445e-a995-0bcb6c0a86ac.png | 1672×941 | 2353228 | B394248F151E3C323DC25C08D99925BA43738D3BD078A5A14B2407D228222C9E |

最终文件均在本记录同目录。原始内置工具文件保留。复制后尺寸校验最初尝试 Python，环境中的 python.exe 无法运行，因此改用 PowerShell 读取 PNG IHDR 与 Get-FileHash；没有因此更改图片。

## 完整生成提示词

### OB-musicbox.png

```text
Use case: stylized-concept. Create one finished product-grade high-end 2D anime CG illustration for the companion app Our World, an intimate tabletop interaction. Landscape 16:9, largest supported landscape resolution, target at least 1672x941.
REFERENCE ROLE: attached A1 is the approved Xiaoman identity, anime rendering, apartment and lighting reference, not a layout to duplicate exactly. Keep her face, chestnut shoulder-length hair, wispy bangs, small gold star clip, amber eyes (closed in this action), thin gold necklace, cream knit cardigan over white tee identical. Do NOT copy the pair of people reflected in the reference window.
SUBJECT: OB-musicbox. Camera is Ayu seated at the home table at night. Exactly one actual person across the table: Xiaoman shown from waist/chest up, eyes gently closed, a soft smile and slightly parted lips humming to the melody, emotionally listening. Her hands relaxed together on the table near her cup.
Foreground viewer Ayu is seen only as two anatomically clean hands with charcoal hoodie sleeves: his left hand stabilizes a small beautiful walnut wooden mechanical music box on the table; his right thumb and forefinger turn its visible brass side winding key. Box occupies lower-center foreground, detailed joinery and warm metal glints, no brand lettering. On its top, a TINY brass statuette of a dancing couple on a circular brass spindle turns: visibly miniature metal figurines, not extra real people. The winding key and turning figurine create an understandable cause and effect. A few very faint delicate musical note symbols drift upward close to the box, never around the entire object.
COMPOSITION: intimate seated eye level, near hands/object clearly detailed, partner midground fully recognizable with head fully in frame, table hides all lower body; background depth softly defocused. Warm shaded lamp on left with realistic golden key light, cool blue rain-specked night window rim lighting hair and knit sleeves. Rich walnut grain, subtle brass reflections, soft candle bokeh, inviting uncluttered tabletop.
STYLE: match attached approved illustration exactly: semi-realistic original anime proportions, clean fine line art, soft cel shading and painterly gradients, warm subsurface skin, exquisitely detailed hair, cinematic practical warm light versus cool ambient, refined bloom, three depth planes. No photorealism, no chibi, no existing IP.
HARD CONSTRAINTS: no UI, no captions or other text, no logos/watermarks, no glowing selection rings/outlines/halos/pins. Exactly one real human across; viewer only two hands/forearms, charcoal hoodie not cream; no extra people or visible human window reflections. Natural five-finger anatomy and plausible winding-key contact. Xiaoman closes eyes because humming, NOT implying an unverified offline/asleep state. Finished single scene, no panels.
```

### OB-cat.png

```text
Use case: stylized-concept. Create one finished product-grade high-end 2D anime CG illustration for Our World, a couple companion app. Landscape 16:9, largest supported resolution, target at least 1672x941.
REFERENCE ROLE: A1 is approved Xiaoman identity, style and home-table night palette. Preserve her delicate face, shoulder-length chestnut brown hair with wispy bangs and small gold star clip, warm amber eyes, thin gold necklace, cream knit cardigan and white tee. Do not copy people reflected in glass; no human reflections.
SCENE OB-cat: camera IS Ayu seated at the familiar warm home table on a rainy city night. Exactly ONE person across table, Xiaoman, half-body view, lower body hidden by table. She leans forward a little, smiling lovingly at the cat, amber eyes looking down towards their shared touch. A single fluffy grey-and-white cat walks across the tabletop between her and the viewer, body in a clear natural side profile, grey back and tail, white chest and paws. Its head turns slightly and nuzzles against Xiaoman's outstretched right hand, small closed contented eyes, one lifted front paw conveying a walking step. Xiaoman's left hand rests naturally on the table by her ceramic cup.
The viewer's OWN right hand enters from lower right in a charcoal hoodie sleeve and gently strokes the cat's back. Viewer's other charcoal sleeved hand can rest lower left beside his own cup. Distinguish all hands by their origin: cream knit sleeve from partner across at cat's head; charcoal sleeve from viewer at cat's back. Anatomically correct hands and realistic feline anatomy, clear contact positions, four plausible legs with natural occlusion, one tail; no fused fingers or duplicated paws. Two tiny delicate neutral curl marks near cat's cheek suggest purring without text. There is ONLY ONE cat; remove the background sofa cat present in the reference.
The cat is the physical bridge between both people, with warm subtle fur rim light and tactile fur detail. Keep her face and cat fully in frame and strong foreground/midground/background separation. Wooden table lower half, lamp warm gold at left, soft warm candle bokeh, rainy blue city through window, cool rim on hair and cardigan. Scene remains grounded, no magic effects.
STYLE identical to A1: original semi-realistic anime character, fine clean line art, soft cel shading, painterly gradients, warm subsurface skin, detailed hair, cinematic warm practical/cool ambient lighting, tasteful bloom and shallow depth. No photorealism, no chibi, no franchise resemblance.
NO UI, captions, labels, logos, watermarks. No glowing rings, outlines, object halos, pins or selection effects. No extra people, no visible viewer face or body beyond his own hands and charcoal hoodie forearms. Single scene, not a storyboard.
```

### OB-phone.png

```text
Use case: stylized-concept. Create one finished product-grade high-end 2D anime CG illustration for Our World, a companion app for real couples. Landscape 16:9, largest supported resolution, target at least 1672x941.
REFERENCE ROLE: A1 is approved style, Xiaoman face/identity and night apartment reference. Keep her recognizable identical shoulder-length chestnut hair, fine wispy fringe, little gold star hair clip, warm amber eyes, thin gold necklace, oversized cream cable-knit cardigan over white tee. Remove all human window reflections.
SCENE OB-phone: camera is viewer Ayu seated at the table. Exactly one partner Xiaoman across, half-body seated framing with lower body hidden by wood tabletop. She has her chin gently resting on one hand, shoulders subtly tucked, looking directly at the viewer with a small shy smile and a warm blush because he is listening to the voice message she left earlier. This is the present online listening moment; the image must not depict anyone as offline or an invented asleep state.
A beautiful tactile vintage dark-ivory and brass rotary telephone sits clearly visible at lower center-right, readable circular finger-hole rotary dial and handset cradle, coiled cable visibly connecting it to the lifted handset. The viewer's right hand in a charcoal hoodie sleeve lifts the telephone receiver into the foreground towards his ear outside frame; receiver diagonal at lower left to midleft, maintaining a clear view of Xiaoman's face. His other charcoal sleeved hand rests beside phone base. Important physical topology: handset is in the VIEWER'S hand, not Xiaoman's hand; black/ivory cord runs continuously from handset to phone base; cradle exposed after pickup; no additional handset or duplicated phone. Two tiny subdued motion lines at the base indicate the final vibration of a ring, no text and no radiating glow.
The receive gesture, empty cradle and coiled cord make voice messages feel like calls living in the room. A tiny natural brass glint is acceptable, no glowing interactive outline. The partner's bashful eye contact is the emotional payoff.
COMPOSITION: close first-person seated view, telephone and correct hands large foreground, Xiaoman centered midground, night home window soft background. Warm lamp practical at left lights table and her face, contrasting cool blue rain-window ambient and rim light. Fine wood grain, polished aged brass, physically plausible plastic handset, soft bokeh and cinematic depth.
STYLE LOCK: high-end original 2D anime CG, semi-realistic anime proportions, clean fine line art, soft cel shading with painterly gradients, warm subsurface skin, fine hair highlights, gacha keyvisual polish identical to reference. No photorealism, no chibi, no existing IP.
NO UI, no labels or any text, no captions, no logos/watermarks, no halos, selection outlines, rings or pins around objects. Exactly one actual visible person facing viewer; viewer only own hands and charcoal hoodie sleeves. No other humans or reflections. Natural five-finger hands with physically credible receiver grip. Single scene, no panels.
```

