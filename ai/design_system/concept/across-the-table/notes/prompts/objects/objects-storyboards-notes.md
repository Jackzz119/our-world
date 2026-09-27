# 交互物件双联分镜 · 生成与自审记录

- 模式：design；built-in image_gen，每个交付文件独立生成 1 次，无重绘、无 CLI/API-key fallback。
- 参考：A1-keyart.png（角色小满、居家桌面、材质与光照风格）；用户附带 A5/A6 的角色关系和动作规则已纳入约束，本次两张生成均传入 A1 绝对路径。
- 生成图已直接检查像素，结论为本分支自审，最终美术判断由主调用方 Monet 完成。未执行独立 Monet 复核。
- 保存：从工具默认 generated_images 目录复制到指定输出目录，源图未覆盖。未修改项目代码或协议。
- 两张均为 1672 × 941，接近 16:9，不透明 PNG。工具提示“最大支持横向尺寸”后实际返回该尺寸。

## OB-lamp.png

**可见内容与价值。** 左右各一位小满半身，桌面对坐、角色金星发夹/项链/毛衣完整，阿屿炭灰袖手伸向相同台灯拉链。左图灯罩不亮、环境偏蓝；右图灯罩发暖光，桌面、手和小满皮肤明显变暖。下方“关灯 / 开灯”可读；人脸无遮挡，无第二个人影和交互光圈。把台灯从装饰变为对坐两人的共同环境控制。

**可见弱点。** 两格的拉链和前景手只产生小位移，动作幅度略保守。摄影位置与房间布局高度相近，但并非逐像素配准：桌面物件与人物局部轮廓仍有轻微变化，不能把左右帧直接作为上线开关灯纹理交叉淡入。

**建议循环。** 拉链轻摆提示 → 阿屿拖动/按下拉链 → 链条弹回、灯罩渐亮并以 250–500 ms 改变室内光层 → 小满接收同一环境状态、抬眼浅笑（仅真实在线时）→ 可选写入共同夜晚的环境记录。离线时保留灯状态而非播放虚假的真人反应。

**制作分层。** 桌前手臂、手指夹取、拉链分段与末端珠、灯座/灯罩暗底、发光灯罩、桌面暖光遮罩、人物局部受光、窗外冷光分别分层。链条用小骨骼/弹簧回弹；房间与人物共用环境状态参数，避免整张图叠橙色滤镜。两格为概念证据，尚无可重光照素材。

**粗略压缩预算（估计，未实测编码）。** 完整分镜 WebP/AVIF 0.35–0.8 MB；接入已加载共享房间与角色后，灯、链与受光遮罩增量约 0.2–0.5 MB；共享房间/角色不计入该增量。

**原图字节数与哈希。** 2,358,255 bytes；SHA256 C3BAD6F46FB432D223005CF1A38B521C4E87DC294852FD133803B5C89556CE19。

**工具原始保存路径。** C:/Users/Jackzz/.codex/generated_images/01a0da6b-75e3-7653-aa38-c5bab85ac0f9/exec-74b0ca4d-5a8b-4790-975f-7bc71a9f8237.png

### 最终完整 prompt

```text
Use case: illustration-story. Asset type: polished product concept storyboard for Our World, Across the Table. Create ONE landscape 16:9 image at largest supported landscape resolution, two equal vertical panels side-by-side, thin quiet divider.
Reference A1 is the approved original character identity, home table, and premium 2D anime CG style. Preserve Xiaoman's exact chestnut shoulder-length wispy-banged hair, gold star clip, warm amber eyes, cream knitted cardigan over white tee, fine gold necklace. Original character, high-end hand-drawn anime CG, fine clean lines, soft cel shadows and painterly gradients, believable skin and highly detailed hair and knit, never photorealistic.
Both panels show THE SAME CAMERA position: first-person Ayu seated at home table opposite exactly ONE partner Xiaoman, half-body behind the wooden table. Foreground is Ayu's hand with charcoal hoodie sleeve reaching to the little brass pull chain on a pleated bedside-style table lamp in left foreground. Lamp should be small enough that Xiaoman's face is completely unobscured. A navy floral mug, books, a single tiny vase, rainy city window in background. No people reflected in window. Match all room geometry and objects between panels.
Left panel depicts lamp OFF, no other lit candle or practical source. ONLY cool muted blue night city/window glow illuminates scene; pleated shade looks unlit, table and Xiaoman face recognizably cool, subtle soft smile as she waits. Ayu's charcoal-sleeved hand reaches toward the brass pull chain.
Right panel depicts lamp ON immediately after Ayu pulls the same chain downward, fingers clearly pinching bead chain with natural anatomy; warm amber light visibly glows from within pleated shade and floods the same table and Xiaoman's face/cardigan, contrasting cool blue window rim. Xiaoman gives warm delighted soft eye contact. Visible causal chain action and lighting result. Exact same place and viewpoint; not two different rooms.
Short captions in a thin clean dark bottom caption strip below artwork, small centered off-white Simplified Chinese sans: left "关灯", right "开灯". No other text or UI.
No glowing rings, selection halos, outlines or markers around objects. No additional humans, no duplicate partner, no split face, no mirror/reflection person, no full body, no exposed legs, no incorrect sleeves. Hands refined and anatomically believable, no extra fingers. Rich cinematic depth, tactile wood and brass; professional art-directed finished illustration.
```

## OB-polaroid.png

**可见内容与价值。** 左图阿屿双手持拍立得背面对向镜头，快门上有食指，小满比 V 对镜头微笑；右图同一张桌面和小满在后景，前景阿屿双手展示白边相纸，画面内的她保留 V 手势与微笑，下沿较灰淡，表现正在显影。相机放回桌上，右上有照片墙线索。“拍下 / 显影”可读。照片把当下姿态变为可收藏结果，支持共同行为到共同回忆的闭环。

**可见弱点。** 相纸里的小满比左格姿态有轻微差异，是生成模型重绘后的近似一致，并非左格的真实截图；显影效果较接近已完成八成。相机背面与放下后的外形没有可验证的工业设计连续性。上线时必须使用实际捕获同一帧的贴图，不以此分镜直接切换。

**建议循环。** 举起相机 → 在线双方同意/触发拍摄，小满摆手势 → 快门轻响与吐纸 → 相纸 2–3 秒显影，展示同一真实捕获画面 → 选定后存入共同照片墙。相片结果可供离线一方后来查看；离线不自动捏造实时摆拍。

**制作分层。** 阿屿左右手/指节、相机机身/快门/出片口、吐出的相纸、独立动态照片贴图、相纸柔影、照片墙格位分别分层。小满沿用半身 rig，新增单侧 V 手势与回杯姿态；显影使用纸上颜色/对比/遮罩渐变而非多张大图序列。相机始终朝向小满，照片贴图复用捕获的 partner state。

**粗略压缩预算（估计，未实测编码）。** 完整分镜 WebP/AVIF 0.4–0.9 MB；共享角色与房间之外，相机、手势、相纸道具增量约 0.45–0.9 MB；每张保存照片约 60–150 KB（512–768 px 长边）。

**原图字节数与哈希。** 2,382,251 bytes；SHA256 F3B70AD7DBD4B7C9812C4117A08B78AA5DB8C9E9AD484CB22D9EE7E35986214B。

**工具原始保存路径。** C:/Users/Jackzz/.codex/generated_images/01a0da6b-75e3-7653-aa38-c5bab85ac0f9/exec-9b44922b-dcc8-40bb-868b-4458c8d97bfe.png

### 最终完整 prompt

```text
Use case: illustration-story. Asset type: polished two-panel product concept storyboard for Our World, Across the Table. Create ONE landscape 16:9 image at largest supported landscape resolution. Exactly two equal vertical panels side by side, thin quiet divider. Reference A1 establishes Xiaoman identity, home-table composition and premium 2D anime CG style, not literal copy. Premium hand-drawn anime CG with clean fine linework, semi-realistic anime faces, soft cel shading with painterly gradients, exquisite hair highlights and tactile materials, warm skin. No photorealism.
Both panels: viewer camera IS Ayu seated at table, exactly ONE real partner Xiaoman across table, half body visible with lower body hidden by table. Xiaoman has chestnut shoulder-length hair with wispy bangs, little gold star hair clip, warm amber eyes, oversized cream cable-knit cardigan over white tee, thin gold necklace. Cozy home table at rainy blue-city night, warm pleated table lamp on left, detailed wood and floral mug, shallow depth and cool blue rim. No human reflections in glass.
LEFT PANEL "拍下": Ayu's two natural hands in charcoal hoodie sleeves hold an unbranded vintage cream-and-brown INSTANT CAMERA in foreground, viewed from the back and slightly above, lens points forward toward Xiaoman. Camera held below her face so her whole face is plainly visible. Right index finger poised on shutter button. Xiaoman looks at camera smiling and makes one natural V peace sign near cheek. Depict the instant of taking photo, fine flash glint on camera but no graphic UI.
RIGHT PANEL "显影": moments later the viewer's charcoal hoodie-sleeved hands hold ONE freshly printed white-bordered square instant photo prominently in foreground at an angle, the other hand supports bottom edge, only one print. The picture inside it is a miniature faithful portrait of the SAME Xiaoman smile and SAME V-sign pose from left panel, partly developed with darker, slightly low-contrast bottom edge and subtly emerging colors, sufficiently clear to read the recorded moment. Actual Xiaoman remains across the same table half-body behind the print, softly smiling toward the viewer/photo, her hands relaxed on her cup; her face remains unobscured. The physical instant camera now rests on the table. In deep background at far right a few softly out-of-focus pinned little photos suggest an existing photo wall without readable people. Keep clear foreground prop action, midground partner response, background room.
Short captions only in small clean dark strips at bottom, below picture: LEFT "拍下", RIGHT "显影", off-white simple Simplified Chinese sans, correct characters. No other text or UI.
Original characters, no known franchises. No additional humans, no extra partner, no reflections of people, no glowing rings/halos/outlines/markers, no border glow around objects, no malformed fingers. Exactly one real Xiaoman per panel plus her miniature photographic depiction in right-panel print. Viewer never appears except natural hands and charcoal hoodie sleeves. Product-grade tactile believable camera orientation and paper print, emotional shared memory ritual.
```

## 不确定性与交付边界

这两张展示设计意图，不能证明动画、状态同步、资产压缩体积或移动端性能。对真人动作的呈现必须由明确在线动作/授权状态驱动。生产预算为制作估算，没有压缩测试。两张尺寸、PNG 字节数、SHA256 已从输出文件读取核验；最初尝试本机 python 因系统占位程序无法访问，改用 PowerShell 直接读取 PNG 头和 Get-FileHash 完成验证。没有对图片做像素编辑。

