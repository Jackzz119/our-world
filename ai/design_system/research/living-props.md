# Living Props — 场景物件活化方案（2026-08-22 调研定稿）

> 需求（用户 2026-08-22）：唱片 idle 常转、hover 零件动；许愿罐星星 idle 漂浮、hover 更亮更快——
> 「接近 3D 场景的生动感」。换图+描边高亮方案已否。
> 调研全文来源见文末；mockup：`../concepts/pending/living-props/`（三张分解手稿）。

## 一句话结论

**主力路线唯一：物件拆层 + 引擎内程序动画（transform/alpha 缓动）**，辅以粒子与 ≤2 个
着色器区域；有机形变（蒸汽/窗帘/猫尾）用 8-16 帧手绘循环或网格扰动兜底。
这就是 Wallpaper Engine 数万张「静图活化」壁纸的工业标准做法（Spin/Swing/Glitter/
Water Ripple 全部 = 遮罩圈区域 + 便宜效果）。**Spine（mesh 要 Pro $369）/Live2D
（Pixi v8 无官方支持）/alpha 视频（Safari 双编码坑）对本需求全是非必要重武器。**

## 关键标杆事实

- **lofi girl 是 TVPaint 逐帧离线视频**（80s 循环），不是实时技术参照；它证明的是
  **动画密度阈值：2-3 个主循环 + 几处微动，场景就「活」**——第一期只做唱片机+许愿罐是对的
- Spirit City 是 UE5 全 3D（另一条路，与水彩底图不兼容）；Rusty Lake 的机关动画粒度
  （一物件 2-4 可动层 + 触发式短动画）与我们 hover 需求最接近
- WE Puppet Warp 官方资产流程 = **抠件 → 底图补洞（不完美没关系，动画件盖住）→ 罩动效**
  ——我们 AI 管线的业界原型

## 三个需求的落地路径

| 需求 | 拆层 | 动效 |
|---|---|---|
| 唱片常转 | 盘面（补全成完整正圆）/ 唱臂（pivot 在臂轴）/ 静态高光层压顶 | `rotation += ω·dt`（idle ~8s/圈）；**高光是光源属性不随盘转**，必须剥离 |
| hover 唱臂动 | 同上 | 唱臂 tween ±3-5°（150-250ms ease-out-back）+ 旋钮 glow |
| 星星漂浮 | 玻璃罐（静）/ 5-8 颗独立星 Sprite / 罐外 halo | 每颗 sin/cos 双频叠加漂浮 + 明暗呼吸；**不需要粒子系统**；发光=预烘焙径向贴图+additive，**禁 per-star GlowFilter** |
| hover 罐加速加亮 | 同上 | 全罐共享 `speedScale`/`glowAlpha` 两个标量 tween 到 ~1.6×（0.3s）——**状态=参数缓动，永不换图** |

透视陷阱（已在唱片试点验证）：底图透视椭圆直接旋转会穿帮——外层容器 `scale.y` 压椭圆比，
子层在圆空间里转（`pixi-scene.ts` 的 `circleFromBase()` + vinyl pivot 即此法）。

## 分层资产 AI 管线（七步）

0. **运动设计清单先行**——切割线由运动决定（盘 vs 臂），不由物体轮廓决定
1. 抠件：全画布尺寸导出（保留文档坐标系），每物件一文件夹
2. 底图补洞（clean plate）：Nano Banana Pro / Qwen-Image-Edit / FLUX Kontext 局部 inpaint，
   带全图上下文修，修完 diff 校验只有洞区变了
3. 零件补全：被遮挡部分补全整件（旋转件必须补成完整圆）
4. **差分校验闸门**：clean plate + 全零件原位叠回 ≡ 原底图（洞区除外）
5. 打包：trim + offset/pivot/z 记入 manifest.json
6. 有机件三级火箭：引擎程序化优先（粒子/MeshPlane 扰动）→ AI 图生视频循环
   （Kling Motion Brush / Wan 2.2 FLF2V；**首尾同帧直出循环不可靠，用两段拼接法**）
   → 成品烘 8-16 帧 sprite sheet（≤256²），大件才考虑 alpha 视频（VP9+HEVC 双编码）
7. **hover 差分不出图**：亮度/速度全在引擎内做（tint/additive/参数）——换图高亮的教训制度化

## 性能预算（30fps 上限 + 失焦暂停红线下）

- 动态 sprite ~40 层 + ≤50 粒子：对 v8 是零头（基准 20 万 sprite@60fps）
- 真预算在：纹理内存（帧动画 256²×16≈4MB/件，有机件 ≤3-4 个）、
  **filter 纪律（全场常驻 ≤2 区域）**、零件层必须 trim（否则全屏 overdraw）
- 工程纪律：所有动画吃统一场景时钟（ticker 累积时间）；tween 挂 Pixi ticker 不自跑 rAF；
  失焦暂停覆盖 ticker/video/粒子三类源

## 避坑清单（12 条精选）

首尾同帧直出 AI 循环（趋于不动）｜AI 视频拆帧做主力（水彩沸腾）｜透视椭圆直接旋转｜
高光随盘转｜per-object GlowFilter｜hover 换整图｜alpha 视频单编码｜为物件引入 Spine/Live2D｜
零件层不 trim｜tween 自跑 rAF｜拆层不做差分校验｜第一期就拆 10 个物件（按视线优先级分批）

## 分期建议

- **P1（本期）**：唱片机 + 许愿罐两件活化（分层资产管线首跑）——mockup 已出
- P2：台灯光晕呼吸、咖啡热气（程序化，零资产）、窗帘微飘（MeshPlane 扰动）
- P3：更多房间复用同管线；角色动作丰富化时再评估 Spine

来源：调研 agent 报告 2026-08-22（WE 官方文档 / PixiJS 官方博客 / Spine 购买页 /
Jake Archibald 透明视频 / ffmpeg.party 循环指南 / Kling·Runway Motion Brush /
Nano Banana·Qwen·Kontext 对比评测 / CVPR 2024 Generative Image Dynamics 等，
链接存于会话任务输出）。
