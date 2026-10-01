# 音乐模块 · 本地上传与曲库 方案文档

> 🟡 **M0 进行中**（2026-09-30 出方案；2026-10-01 M0 仓库侧完成：迁移、权限测试、测试曲集、真机验证页，等用户应用迁移并跑真机验证，见 [m0.md](m0.md)）。音乐模块的功能细节唯一载体，PROJECT.md 只留摘要 + 本文引用；任务状态归 [TODO](../../TODO.md)。
> 完整方案书（架构图、信号路径图、界面样机、八张决定卡片与投票）：[发布版](https://claude.ai/artifact/FgMvGftKN7Lhbd7w7WccFK)（私有，需登录）· 本地副本 [proposal.html](proposal.html)
> 调研原文（英文，2026-09-30 四路并行）：[音质与网页播放](research/audio-quality.md) · [在线曲库接入](research/online-sources.md) · [上传、处理与存储](research/ingest-storage.md) · [界面参考](research/ui-ux.md)
> 关联代码（现状）：`src/themes/cinnaglass/music.tsx`、`music-tracks.ts`、`use-music-playback.ts`、`music.css`、`shell/floaters.tsx`；存储现状 `src/lib/storage.ts`、`sql/storage-memories-bucket.sql`

## 一、目标与范围

**这一期（本地上传）**：拖进文件或文件夹（手机从「文件」选），标签、封面、歌词自动识别，确认后断点续传，传完进曲库就能放；歌词与海报支持内嵌、同名 .lrc / 封面图、手动、自动匹配四种来源；原件逐比特保存，无损源全程没有有损环节；播放器按「来源」取歌，为下一期在线曲库和一起听留口子。

**不做**：在线曲库、一起听、评论与推荐、公开分享链接、桌面壳独占输出。继续遵守现行设计：音乐是 A 类悬浮 UI（桌面停靠栏 / 手机托盘），没有共享播放就不显示一起听（`ai/design_system/uiux/interaction.md`）。

**现状**：音乐页（B1 封套 + 唱片 + B3 沉浸歌词，2026-09-30 定稿）数据是 8 段 WebAudio 合成音景；没有队列、Media Session、续播；`memories` 桶只收图片、25 MB。

**验收线**：取回文件 SHA-256 与本地一致（100%）；Wi-Fi 下 FLAC 16/44.1 首次出声 < 1.5 s、Hi-Res < 2.5 s；拖动 < 0.5 s 恢复；iPhone 锁屏连播 60 分钟、切歌 10 次不断；100 首混合格式一次走通、断网只补传未完成分片；内嵌与同名 .lrc 歌词 100% 识别、GBK 乱码自动修复。

## 二、音质原则（违反即不进推荐）

1. **原件不动**：逐比特保存，SHA-256 校验（FLAC 另验 STREAMINFO MD5）；改标签只改数据库，永不回写文件。
2. **无损链路**：无损源只做无损 → 无损转换，转换前后解码 PCM 的 MD5 必须一致（`ffmpeg -i X -map 0:a -c:a pcm_s32le -f hash -hash md5 -`；不加 `pcm_s32le` 会按 16 bit 比较）。有损副本只是省流选项，不替换原件、不二次有损。
3. **默认纯净**：默认不均衡、不限幅、不额外重采样；响度均衡、交叉淡化是可选增强，开启时全程 32 位浮点并按峰值防削波。
4. **如实标注**：徽章描述文件本身（Hi-Res = 无损且 > 48 kHz，沿用 Apple 口径；无损 = 44.1 / 48 kHz；有损不显示徽章），点开信号路径看「来源 → 解码 → 处理 → 输出」。网页做不到比特完美就不说。
5. **可以验证**：哈希、PCM MD5、网络请求类型与大小、无缝测试曲、响度对照值。

网页的事实：Chrome 在浏览器里把一切重采样到设备采样率（sinc 重采样器），Firefox 按文件采样率打开输出交给系统，安卓混音器固定 48 kHz，没有浏览器能比特完美；桌面壳（R2）用 libmpv 独占输出才能做到。

## 三、待拍板的决定

| 决定                  | 选项                                                                                                  | 推荐                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| D1 总体架构           | A 轻量直连（零服务器）/ B 媒体流水线（加 FFmpeg Worker）/ C 自托管音乐服务器 / D 流媒体级（HLS/DASH） | **A 起步、随后加 B**：一期零服务器，数据模型从第一天按「原件 / 串流版 / 副本」设计   |
| D2 播放引擎           | E1 纯净直出 / E2 Web Audio 增强 / E3 MSE 流式 / E1+E2                                                 | **E1 + E2**：默认 `<audio>` 直出原件，增强模式可选（iOS 17.5+）；E3 只用于同专辑无缝 |
| D3 音质档位           | Q1 只存原件 / Q2 原件 + 一档副本 / Q3 完整阶梯                                                        | **Q2**：原件 + AAC-LC 256 kbps（MP4）副本，Worker 上线前按 Q1                        |
| D4 歌词渲染           | R1 自研 / R2 用 AMLL / R3 先逐句                                                                      | **R1**：AMLL 全部包是 AGPL-3.0 且依赖 Pixi v7（项目是 8.19），净室自研约 500–800 行  |
| D5 曲库归属           | L1 各自曲库 / L2 世界共享 / L3 默认共享可设私有                                                       | **L3**                                                                               |
| D6 存储与分发         | S1 Supabase Pro / S2 Cloudflare R2 / S3 国内对象存储 / S4 自有 NAS                                    | **S1 起步**，表里记 `storage_backend`，曲库过 1 TB 或流量费上来时平移 R2             |
| D7 界面方向           | V1 唱片封套 / V2 歌词为主 / V3 安静列表 / V1+V3                                                       | **V1 + V3**：封套做正在播放，列表做曲库与上传；V2 的逐字与流动底色升级进沉浸歌词     |
| D8 在线曲库（下一期） | O1 自托管 / O2 官方会员 SDK / O3 开放曲库 / O4 国内平台合作                                           | **O1 → O2**：先 OpenSubsonic 适配器（并反向开放自己的曲库），再按会员情况接一个      |

**需要用户先回答**：Q1 主要在国内还是海外；Q2 Supabase 是 Free 还是 Pro；Q3 曲库规模与格式（APE+CUE、DSD 多不多）；Q4 有没有常开的 NAS / 电脑；Q5 有哪家会员；Q6 曲库共享还是各管各；Q7 要不要离线下载；Q8 公开发行时间。

**开工第一天先验证**：① iPhone Safari 播放 Supabase 签名 URL 上的音频（[supabase#35866](https://github.com/orgs/supabase/discussions/35866) 报告 iOS 放不了，未解决）；② iPhone 直接放 24/192 FLAC；③ 存储是否给音频返回 CORS 头（增强模式要用）。①不过就改 D6-S2。

## 四、推荐方案要点

### 上传与入库（八步）

选择 → 解析（Web Worker：读文件头判格式、`music-metadata` 读标签 / 封面 / 歌词 / ReplayGain、`hash-wasm` 流式 SHA-256、同名 .lrc 与 cover 配对、GBK / Big5 乱码按专辑判定可撤回、CUE 解析成按采样点的虚拟分轨）→ 查重（同世界同哈希跳过上传）→ 确认（按专辑分组、可批量改、上传前本地试听、放不了的格式先标出）→ 上传（TUS 直连 `<ref>.storage.supabase.co`，6 MB 分片、3 首并发、进度存 IndexedDB、锁屏回来续传、iOS 18.4+ 申请屏幕常亮）→ 入库（一个 RPC 事务）→ 后处理（Worker，可选）→ 就绪（Realtime 通知）。

格式：FLAC / MP3 / AAC / WAV 全平台直出；ALAC、AIFF 只有 Safari 能放 → Worker 无损转 FLAC 串流版；Opus / Vorbis 需 Safari 17.4 / 18.4+；APE、WavPack、DSD 浏览器都放不了 → Worker 转 FLAC（DSD 转 24/176.4，标「由 DSD 转换」，原件保留）；桌面浏览器可选 ffmpeg.wasm（约原生 1/25 速度，GPL）兜底；`.m4p` / `.ncm` / `.qmc` 拒收、不解密。

### 播放引擎

- 与框架无关的 `Player`（`src/lib/music/engine/`，零 React），`useSyncExternalStore` 订阅；输出抽象成纯净（`<audio>`）/ 增强（Web Audio）/ 原生（R2 的 libmpv）三种。
- 队列 = 来源上下文 + 「下一首播放」+ 历史，可序列化（一起听同步它）。
- 无缝三档：CUE 虚拟分轨（同一文件，天然无缝）→ 同专辑 FLAC fMP4 重封装 + MSE / ManagedMediaSource（M6 之后）→ 双元素交接 + 250 ms 微淡化（TIDAL 网页版做法，iPhone 除外）。
- 手机硬限制：iPhone 上脚本改不了 `<audio>` 音量（隐藏音量滑块，均衡 / 淡化要走增强）；iOS 上单独的 Web Audio 被静音键静音、切后台即停，需先 `navigator.audioSession.type = "playback"` 且 iOS 17.5+；Safari 只能把普通文件播放接进 Web Audio（MSE / WebM 不行）；锁定模式禁用 Web Audio；第一次点击时解锁两个播放元素；跨域需 `crossorigin="anonymous"` + CORS。
- 响度：默认关；「只调小」用元素音量（`min(10^(G/20), 1/peak)`，不需要 Web Audio）；「完整」走增强；同专辑用专辑增益、随机用单曲增益，基准 ReplayGain 2.0 −18 LUFS；值来自标签或 rsgain 扫描，只存库不改音频。
- 恢复：签名过期 / 断网自动重签续播（3 次递增重试）；解码失败改放串流版或副本；来电打断显示「已暂停」。Media Session 全接、每次拖动更新位置；每 5 秒存队列与进度，重开不自动播放；听满 30 秒记播放记录。

### 数据模型与存储

三层：**文件**（`music_files`：上传的原始文件，按 `(world_id, sha256)` 唯一，含 CUE / .lrc / 封面）→ **曲目**（`music_tracks`：`source_file_id` + `start_sample` / `end_sample`、响度、`tags` / `tags_raw`、`locked_fields`、`visibility`）→ **播放版本**（`music_renditions`：original / lossless / lossy，`storage_backend`）。另有 `music_albums`（`album_key` 归并）、`music_artists` + 角色、`music_artworks`（三档、主色、ThumbHash）、`music_lyrics`（`raw_text` 原文 + `doc` 采用 OpenSubsonic songLyrics v2 形状）、`music_playlists` / `_items`（ours / personal、分数索引、added_by、便签、回应）、`music_likes`、`music_plays`、`music_jobs`（Supabase Queues）。

```
music/                                          私有桶；全局单文件上限约 5 GB；不设 MIME 白名单，读文件头判断
  <world>/orig/<sha256>.<ext>                   原件，只增不改；前端不能删，删除走回收站 RPC，30 天后清理
  <world>/r/<track_id>/flac-v1.flac             无损串流版（仅当原件浏览器放不了）
  <world>/r/<track_id>/aac256-v1.m4a            省流副本
  <world>/r/<track_id>/peaks-v1.json            波形与能量曲线（唱片机灯光按进度呼吸）
  <world>/art/<sha256>/{256,512,1200}.webp      海报三档（Safari 不能编码 WebP，iPhone 上生成为 .jpg）
```

私有曲目不搬文件：`orig/` 下的原件能不能读由数据库判断（上传者本人，或文件属于一首对 TA 可见的曲目），切换「仅自己」立即生效；往 `orig/` 上传必须先有自己的「上传中」预留记录；`tmp/<自己>/` 是可删的临时区（实现与 62 条权限测试见 [m0.md](m0.md)）。RLS：读 = 我的世界且（`visibility = 'world'` 或我是上传者）；删除和可见性只有上传者；歌词、海报、专辑信息两人都能改；「我们的歌单」两人都能改。表结构以迁移文件进 `supabase/migrations/`。Supabase 数据库备份不含 Storage 文件、也没有版本 → 每周把新增原件备份到 NAS 或另一家存储。签名 URL 6–12 小时、同一播放版本复用同一签名以命中 CDN 缓存。

### 歌词与海报

歌词存原文 + 偏移，客户端解析成统一结构（行、逐字、翻译 / 音译、演唱者）。一期支持纯文本、LRC（多时间戳、`[offset:]`、同时间戳双语）、逐字 LRC；TTML 预留；YRC / QRC / KRC 只做导入转换。编辑器：粘贴 / 导入、打拍子逐句对时、整体偏移。自动匹配用 LRCLIB（免 key，时长差 ±2 s；歌词版权属版权方、数据无许可声明：私用可以，公开发行换 Musixmatch / LyricFind）。海报：内嵌 / 文件夹 / 上传 / 自动匹配（MusicBrainz → Cover Art Archive，国内不通用 Deezer 兜底）/ 生成默认海报；主色取代 `music-tracks.ts` 里手写的 `tint`；以后做动态海报与歌词海报。

### 界面

正在播放继续 V1 封套与唱片；曲库四页签（歌曲 · 专辑 · 歌手 · 歌单）、「我的 / TA 的 / 我们的」筛选、无损 / Hi-Res / 缺封面 / 缺歌词筛选、拼音索引条、前端索引搜索（MiniSearch + `Intl.Segmenter` + `pinyin-pro`）、虚拟列表；两个人的小事只做「谁加的、回应、我们都喜欢、送一首歌（走金亮信纸）、TA 在听（可悄悄听）」。细节：播放 / 暂停 / 拖动 120–200 ms 淡变、同专辑不交叉淡化、进度条按住变粗并预览歌词、滑动切歌、OKLCH 取色过渡、流动底色用提取色不用糊海报、歌词手动翻阅后「回到当前句」、键盘快捷键（输入框里不响应）、歌词不逐行读屏。

### 在线曲库（下一期）

没有一家主流平台给网页应用无损：Spotify SDK 约 AAC 256（2026 年起开发模式最多 5 人且都要 Premium，扩展额度只给月活 ≥ 25 万的企业，条款禁止交叉淡化与复刻 Jam）；Apple MusicKit JS 最高 AAC 256（开发者计划 99 美元 / 年、用户需会员、脚本必须从 Apple CDN 加载、用户自己点播放，国内有服务）；YouTube 只能嵌可见视频窗；TIDAL 对第三方只给 30 秒试听；Qobuz 只对合作方。国内：网易云 2026 年开放个人开发者通道（ncm-cli），但渠道版权是官方 App 子集；QQ 音乐 / 酷狗只对企业。**红线**：非官方接口、音源插件、`.ncm` / `.qmc` 解密、YouTube 抓流一律不进代码（NeteaseCloudMusicApi 2024 年收律师函后归档；已有 80 万元民事判赔与刑事判例；修订后的《反不正当竞争法》2025-10-15 起施行）。来源适配器按 `engine: owned | drm-sdk | visible-embed` 声明能力与条款限制；一起听只做自己的曲库和自托管来源（NTP 式对时，< 40 ms 不管、40 ms–1 s 用 ±3% 速率追、> 1 s 直接跳）。

## 五、实施步骤

| 里程碑         | 天数  | 要点                                                                                                                 | 验收                                         |
| -------------- | ----- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| M0 决策与准备  | 0.5–1 | 三项真机验证；拍板 D1–D8；升 Pro + 用量提醒；换有效的 `SUPABASE_ACCESS_TOKEN` 与 publishable key；迁移目录；测试曲集 | 验证有结论；迁移可重跑；两账号越权全被拒     |
| M1 数据层      | 1–2   | `src/types/music.ts`、`src/lib/music/library.ts`、入库 RPC、音频签名与续签                                           | `tsc -b` 零错误；RLS 用例全过                |
| M2 上传入库    | 4–5   | `ingest.worker.ts`、`upload.ts`（TUS）、上传托盘                                                                     | 测试曲集走通；哈希一致；断网续传；重复不重传 |
| M3 播放引擎 v2 | 3–4   | `lib/music/engine/`、Media Session、续播；合成音景移到「声音 / 环境音」层；音乐 UI 迁入 `themes/cinnaglass/music/`   | 锁屏连播 60 分钟；切歌无爆音；首次出声达标   |
| M4 歌词与海报  | 2–3   | `lyrics.ts`、歌词编辑器、LRCLIB 匹配、海报与主色、沉浸歌词逐字                                                       | 四种歌词状态正确；偏移即时生效               |
| M5 曲库界面    | 4–5   | 四页签、搜索、筛选、我们的歌单与两人小事、单曲菜单                                                                   | 2,000 首列表流畅；搜索 < 50 ms               |
| M6 音质增强    | 2     | 响度三档、增强模式与淡化、输出设备、信号路径；可选同专辑 MSE 无缝                                                    | 响度差 < 1 LU；无缝测试无咔哒；信号路径属实  |
| M7 媒体 Worker | 3–5   | FFmpeg / flac / fpcalc / audiowaveform / rsgain / sharp 容器；Queues + pg_net 唤醒 + pg_cron 兜底                    | 转换前后 PCM MD5 一致；幂等、可重试          |
| M8 验收与收尾  | 1–2   | 格式 × 浏览器 × 设备矩阵、弱网、长时间内存；文档与 TODO / PROJECT 更新                                               | 第一章验收线全部达标                         |

核心约 4 周（一人配合 Claude），Worker 另约 1 周；选 D1-B 时 M7 挪到 M2 之后。每月约 25–35 美元（主要是 Supabase Pro；Free 单文件 50 MB 装不下 Hi-Res）。

## 六、风险

iPhone 播放 Supabase 音频（先验证，不行改 R2）· Supabase 计划与额度（Pro 默认开花费上限，额度用完上传失败到下个账期）· 原件无备份（前端不能删 + 回收站 + 每周备份）· iPhone 网页音频限制（手机默认纯净）· 部分格式浏览器放不了（Worker 转换）· 国内访问海外存储慢（预加载、缓存、蜂窝副本、必要时国内存储需备案）· 版权（一期只在两人世界私有播放，公开发行前单独评估）· 签名 URL 外泄（私有桶 + 短 TTL）· 标签混乱（编码修复 + 批量编辑 + 匹配建议）· 手机上传被打断（断点续传）· 迁移与令牌（M0 处理）。

## 七、附带发现（现有代码，未修）

- `src/lib/storage.ts` 用 `canvas.toDataURL('image/webp')` 生成缩略图，Safari / iOS 不支持 WebP 编码会静默返回 PNG，所以 iPhone 上传的照片缩略图是 PNG 存成了 `.thumb.webp`（类型头是对的，能显示，只是体积大、扩展名不符）。
- 进度条读屏值是「3:20」这种写法，WAI-ARIA 示例建议读成「3 分 20 秒，共 4 分 3 秒」。
- `prefers-reduced-transparency` 只有 Chromium 支持，继续用项目自己的「减少透明效果」设置。
