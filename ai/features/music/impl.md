# 音乐一期 · 实现说明

> 一期（本地上传）的实现细节。决定和范围看主文档 [music.md](music.md)，M0 的验证页和测试曲集看 [m0.md](m0.md)。
> 2026-10-03 起按用户拍板实现：**零服务器**（不上 Worker）、**Supabase Free**（单个对象 ≤ 50 MB，总存储 1 GB 和照片共用）、曲库共享（默认两个人都能听，可以设成仅自己）、支持离线下载、每首歌可以在原件和省流版之间切换。

## 一、代码地图

| 层                 | 文件                                                                                       | 做什么                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 数据库             | `supabase/migrations/20261001100000_music_library.sql`                                     | M0：13 张表、守卫触发器、RLS、私有桶 `music` 和存储策略                                                                                                                              |
|                    | `supabase/migrations/20261003100000_music_ingest.sql`                                      | 一期：分片存储、入库 RPC、省流版写入、存储用量、我们的歌单、实时通知                                                                                                                 |
| 契约               | `src/types/music.ts`                                                                       | 表行、RPC 参数、`MusicBackend` 接口（应用用 Supabase，测试页用内存假后端）                                                                                                           |
| 数据层（零 React） | `src/lib/music/library.ts`                                                                 | `supabaseMusic`：查询曲库、签名、实时订阅、上传、RPC                                                                                                                                 |
|                    | `upload.ts`                                                                                | TUS 断点续传（6 MiB 一块，记住上传地址可续传）+ 分片布局 `partLayout` / `objectPaths`                                                                                                |
|                    | `offline.ts`                                                                               | IndexedDB 离线存储：按分片一条记录，读回时拼成一个 Blob 不复制                                                                                                                       |
|                    | `sources.ts`                                                                               | `LibrarySources`：选版本（本机已有 > 每首的选择 > 流量自动 > 原件）、签名预取、整轨先取到本机                                                                                        |
|                    | `engine.ts` + `synth.ts`                                                                   | `MusicEngine`：`<audio>` 直出 + 内置音景合成器；CUE 无缝、iOS 点按即播、出错重签、锁屏控制                                                                                           |
|                    | `ingest.ts`                                                                                | 上传流水线：分析 → 查重 → 预留 → 上传 → 核对字节 → 封面 → 入库 RPC → 省流版                                                                                                          |
|                    | `ingest-plan.ts`、`metadata.ts`、`sniff.ts`、`text.ts`、`lyrics.ts`、`cue.ts`、`sha256.ts` | 配对同名 .lrc / 封面 / .cue；读标签（`music-metadata`，只在上传时加载）；认格式；编码识别与乱码修复；歌词解析；CUE 解析与采样换算；SHA-256                                           |
|                    | `artwork.ts`、`quality.ts`、`transcode.ts`                                                 | 封面三档与取色；音质徽章与格式名；省流版（`mediabunny` + WebCodecs，只在做副本时加载）                                                                                               |
| 界面               | `src/themes/cinnaglass/music/`                                                             | `player.tsx`（主页面、沉浸歌词、声音页）、`library-view.tsx`（曲库）、`upload-view.tsx`（上传）、`quality-view.tsx`（音质）、`use-music.ts`、`use-music-upload.ts`、`music-model.ts` |
| 测试               | `supabase/tests/database/music_rls.test.sql`、`music_ingest.test.sql`                      | 62 + 46 条 pgTAP 断言，`bash scripts/check-music-db.sh` 离线跑                                                                                                                       |
|                    | `scripts/check-music-parsers.mjs`、`check-music-transcode.mjs`、`check-music-library.mjs`  | 解析器（Node）、省流版（Chromium）、曲库界面端到端（Chromium，内存假后端）                                                                                                           |
|                    | `scripts/fixtures/music-library.html`、`music-fake-backend.ts`                             | 不登录也能跑真组件的曲库测试页，`?seed=1` 用真流水线导入测试曲集                                                                                                                     |

## 二、存储（Free 计划的做法）

```
music/<world>/orig/<sha256>.<ext>            原件（≤ 45 MiB 时一个对象）
music/<world>/orig/<sha256>.<ext>/000…NNN    原件分片（> 45 MiB：Hi-Res、整轨），part_size / part_count 记在 music_files
music/<world>/r/<track>/<codec><kbps>-<id>.<ext>   省流版（每首一份，CUE 每段一份）；同样可分片
music/<world>/art/<sha256>/{256,512,1200}.webp|jpg 封面三档（Safari 出 jpg）
```

- 每个对象不超过 45 MiB（Free 上限 50 MB，不管按 MiB 还是按百万字节都留了余量）。升 Pro 后改 `DEFAULT_MAX_OBJECT_BYTES` 就不再分片，已有的分片文件照常能放。
- 分片文件不能用一个链接串流，第一次播放时整个取到本机（IndexedDB）再放，界面写「整轨第一次播放，先取到这台设备」+ 进度条；以后从本机放，离线也能听。整轨缓存最多留 1.5 GB，最早的先清；用户手动「下载到这台设备」的不清。
- 单个对象的原件直接用签名链接 + Range 请求串流：链接 6 小时有效，曲库载入时批量预签，离过期 30 分钟时重签；播放中链接过期或断网会重签后从原位置续上（最多两次）。
- 上传前先查哈希（`music_existing_hashes`）：自己传过的不重传、TA 共享过的不重复入库；TA 设为仅自己的同一文件会提示「请让 TA 改成共享」。
- `music_finish_upload` 在数据库里核对每个对象都在、字节数加起来等于预留时的大小，才把文件标成已上传；客户端不能直接改状态。
- 1 GB 用量：「声音」页显示云端已用多少（含照片桶）和本机缓存多少。

## 三、上传流水线（`src/lib/music/ingest.ts`）

1. **配对**（`planIngest`）：同一文件夹里同名的 `.lrc` / `.txt`（`歌名.en.lrc` 记为翻译）、同名图片或 cover / folder / front 图、`FILE` 行指向这个音频的 `.cue`；`.ncm` / `.qmc*` / `.kgm` / `.m4p` 等加密文件拒收并说明原因。
2. **分析**（`analyzeItem`，逐首）：文件头认格式 → `music-metadata` 读标签、时长、采样率、位深、内嵌封面和歌词、ReplayGain、FLAC 的 STREAMINFO MD5 → 整张专辑一起判断 GBK / Big5 乱码并修复（记在 `tags.mojibake`）→ 歌词按「同名 lrc > 内嵌、逐字 / 逐句 > 纯文本」排序 → CUE 按采样点切段 → 流式 SHA-256。卡片上显示格式、Hi-Res / 无损、歌词来源、封面来源、CUE 段数、这台设备能不能放。
3. **上传**（`uploadDraft`）：查重 → 预留（`music_files` 行，状态「上传中」，这一行存在时存储才收这个路径）→ TUS 续传（分片逐个传）→ `music_finish_upload` 核对 → 封面三档上传 → `music_ingest` 一个事务写曲目、歌手、专辑、封面、歌词、原件播放版本（重试返回同一批曲目，不会重复）。
4. **省流版**：只给无损或 > 330 kbps 的原件做。能编码的设备在上传后接着做（[调研](research/transcode.md)）：Mac 上的 Chrome / Safari 26+、iPhone iOS 26+、安卓出 AAC-LC 256 kbps（MP4）；Windows 上的 Chrome 最高只能编 AAC 192，就出 192；Linux、Firefox 出 Opus 160 kbps（WebM，iPhone 要 iOS 17.4+ 才能放）；iOS 18 及更早的 iPhone 做不了。CUE 每段裁一份。重采样用自写的 Kaiser 窗 sinc 滤波（mediabunny 自带的是线性插值，24/96、24/192 原件里的超声测试音会折叠回可听频段，实测 −30 dBFS；换成自写滤波后是 −120 dBFS 以下）。AAC 副本没有写编码器延迟（edit list），开头会晚约 2112 个采样（约 48 ms）；副本只用于整首播放，不影响整轨原件的无缝。存进 `r/<track>/`，`music_record_copy` 核对字节后记成 `lossy` 版本。做不了的设备照样入库，提示「以后在电脑上补」（补做入口留给下一步）。
5. 一首失败不影响下一首；中途「暂停上传」后再点会续传。

## 四、播放引擎（`src/lib/music/engine.ts`）

- **纯净直出**：原件交给 `<audio>`，浏览器解码后进系统混音器，中间没有任何处理；音量是元素音量（iPhone 上脚本改不了，界面换成「用侧边音量键」）。
- **CUE 无缝**：整轨是一个文件，每一段是这个文件里的一个时间窗 `[start, end)`（`start_sample / 采样率`）。放到这一段结尾时，如果下一首正好是同一文件、从这里接着开始，引擎只把「当前曲目」换过去，声音一刻不停；锁屏看到的是一个连续的流，只是标题和进度换了。快到结尾前 4 秒会预先解析下一首；结尾时刻用定时器卡准，不靠粗糙的 `timeupdate`。
- **iOS**：第一次播放必须在点按里开始。已签好链接的歌在点按里同步开始；还没准备好的（整轨要先下载）先在点按里放 0.1 秒静音「解锁」这个元素，准备好后再接着放。
- **出错恢复**：链接过期 / 断网 → 重新解析（重签）后从原位置续上，最多两次；这台浏览器解不了原件 → 改放省流版；都不行就如实说「这台设备放不了这个格式」。
- **锁屏**：Media Session 标题、歌手、专辑、封面、进度；锁屏和耳机能播放、暂停、上下首、拖动。
- **淡入淡出**：播放 / 暂停 150 ms 音量渐变（iPhone 音量锁定时跳过）。
- **响度平衡**（「声音」页开关，默认关）：按 ReplayGain 只调小不调大：`min(10^(G/20), 1/peak, 1)`。
- **听满 30 秒**才记一条播放记录（`music_plays`，只自己可见）。
- 内置 8 首音景仍在：曲库空的时候和「本机音景」筛选里能放，合成器移到了 `synth.ts`。

## 五、版本选择与离线（`src/lib/music/sources.ts`）

- 每首歌在「音质」页有 **自动 / 原件 / 省流** 三个选择，存在这台设备上（`ow-music-v2.choices`）。
- **自动**：用流量时放省流版，否则放原件。安卓 Chrome 能读到是不是蜂窝网络（或开了省流模式）；**iPhone 网页读不到**，所以 iPhone 上自动等于原件，用流量时在这首歌上点「省流」。
- **本机优先**：这首歌的任何版本已经下载到这台设备，就先放本机的（不花流量），不管选的是哪个。
- 「下载到这台设备」可以分别下原件或省流版；下载的文件放 IndexedDB（局域网 http 测试时也能用），删除在同一个地方。
- 浏览器放不了的原件（ALAC / AIFF 在非 Safari 浏览器、WavPack、APE、DSD）有省流版时改放省流版，没有就提示「这台设备放不了」。注意：目前**没有哪台设备能从这几种原件做出省流版**（浏览器解不了它们）；ALAC / AIFF 在 Safari 上能直接放原件，WavPack / APE / DSD 要等以后的媒体 Worker 转换。

## 六、界面（`src/themes/cinnaglass/music/`）

沿用 dev 最新的骨架：桌面右侧停靠栏、手机托盘（半开 / 拉满，坞）、唱片封套 + 唱片、沉浸歌词。新增：

- **曲库**页签（原「歌单」）：搜索（歌名 / 歌手 / 专辑，忽略空格和符号）、筛选（全部 · 我传的 · TA 传的 · 收藏 · 已下载 · 本机音景）、每行显示格式与 Hi-Res / 无损、私有锁、已下载、收藏标记；行尾「⋯」就地展开：下载原件 / 省流版、仅自己可见 / 改回共享（只有上传者）、从曲库删除（只有上传者，点两次确认）。曲库为空时是一张「上传第一首」卡片，下面仍列本机音景。
- **上传**页：选择文件 / 选择文件夹（桌面）/ 拖进来；「这批只给自己听」；每首一张卡片（封面、可改歌名、格式、歌词来源、封面来源、CUE 段数、大小、状态与进度、提示）；「上传 N 首 / 暂停上传 / 清掉已完成的」；没导入的文件列在折叠区。上传中关掉托盘不会中断，再打开回到上传页。
- **音质**页（点歌名下的徽章进入）：自动 / 原件 / 省流 三选一；信号路径「来源 → 解码 → 处理 → 输出」（输出写系统混音器的真实采样率、需要时注明由系统重采样）；一句结论（无损播放 / 省流播放 / 原件本身有损）；离线下载两个版本。
- 正在播放：歌名下面是音质徽章（Hi-Res / 无损 / 格式名；放省流版时写「省流」；从本机放时有个小绿点）；整轨首次准备时显示进度；歌词支持翻译（同时间戳双语 LRC 或 `歌名.xx.lrc`）、逐字点亮（逐字 LRC）、纯文本歌词（不滚动）。
- 进度条读屏改成「3 分 20 秒，共 4 分 3 秒」。

## 七、测试

| 检查                       | 命令                                                                                     | 覆盖                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 数据库（迁移 + RLS + RPC） | `bash scripts/check-music-db.sh`                                                         | 两份迁移连跑两遍；108 条断言：分片、核对字节、查重、CUE 入库、重试不重复、副本、用量、实时话题权限 |
| 解析器                     | `node scripts/check-music-parsers.mjs`                                                   | LRC / CUE / 编码与乱码 / SHA-256 / 格式识别 / 标签 / 配对，用测试曲集                              |
| 省流版                     | `pnpm dev` 后 `DIARY_NODE_MODULES=$(npm root -g) node scripts/check-music-transcode.mjs` | 各种原件转 Opus / AAC、CUE 裁段、取消、不支持的格式                                                |
| 曲库端到端                 | `pnpm dev` 后 `DIARY_NODE_MODULES=$(npm root -g) node scripts/check-music-library.mjs`   | 真组件 + 内存后端：上传、入库、播放、CUE 无缝接段、歌词、版本切换、离线下载、桌面与手机截图        |
| 类型 / lint / 格式         | `pnpm exec tsc -b`、`pnpm exec eslint .`、`pnpm exec prettier --check <改动的文件>`      |                                                                                                    |

测试页需要 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 有值才能启动（不会真的连），没有 `.env.local` 时：`VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=x pnpm dev`。

### 真机测试（迁移上线后，用户或接手的 agent 在自己电脑上做）

**准备**

1. Supabase Dashboard → SQL Editor：先整段运行 `supabase/migrations/20261001100000_music_library.sql`，再运行 `20261003100000_music_ingest.sql`（都能重复运行）。核对：`select id from storage.buckets where id = 'music';` 有一行；`select proname from pg_proc where proname like 'music_%';` 能看到 `music_ingest`、`music_finish_upload` 等。
2. 电脑上 `.env.local` 填真实的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`；`python3 scripts/make-music-fixtures.py` 生成测试曲集（`tmp/music-fixtures/`，要 ffmpeg）。
3. **最省事：用 Cloudflare Pages 的部署**。每个 PR 和 dev 分支都会自动部署（PR 页面的「Cloudflare Pages」检查里有 HTTPS 预览地址，形如 `https://<编号>.ilovelei.pages.dev`），连的是真实 Supabase，iPhone 直接打开就能测曲库、锁屏控制条和离线下载；**迁移没应用前，部署上的曲库页会显示「曲库没能载入」**（内置音景照常能放）。`/dev/music-check` 只在本机开发构建里有，要用下面的本机方式。
4. 本机方式：`pnpm dev --host`。手机和电脑连同一个 Wi-Fi：
    - **http 局域网**（`http://<电脑 IP>:5173`）：能测上传、播放、CUE、离线；**没有**锁屏控制条（Media Session 只在 HTTPS 下有），Web Crypto 也没有（SHA-256 自动改用 JS 实现）。
    - **HTTPS**（测锁屏控制条时用）：另开终端 `npx cloudflared tunnel --url http://localhost:5173`（或 ngrok），手机打开它给的 `https://….trycloudflare.com`；`vite.config.ts` 已放行这两类域名。
5. 测试曲集放到手机上：把 `tmp/music-fixtures/` 里要用的文件 AirDrop 到 iPhone「文件」App（或放 iCloud 云盘），上传时从「文件」里选。

**先跑 M0 验证页**：`/dev/music-check`（步骤与读法见 [m0.md](m0.md) 二、三）——两字节 Range 请求必须回 206、FLAC 能出声。这一步不过（iOS 放不了 Supabase 链接），后面的播放都不用测，按 D6 改 S2（Cloudflare R2）。

**曲库清单（iPhone Safari，同一个账号；结果记进 TODO 的「真机验证」那条）**

| #   | 做什么                                                                                                                                             | 通过                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | 世界里点导航「一起听」→ 曲库 → 上传 → 选择文件：`lyrics/雨天的窗边.flac` + `.lrc`、`formats/02-flac-24-96.flac`、`formats/07-mp3-320-gbk-tags.mp3` | 卡片显示格式、Hi-Res、歌词 · 同名 lrc；MP3 歌名是「雨天的窗边」（GBK 乱码已修复）              |
| 2   | 点「上传 3 首」                                                                                                                                    | 都到「已入库 ✓」；曲库出现三行；电脑上同一世界的另一个账号几秒内也看到（实时通知）             |
| 3   | 点「雨天的窗边」                                                                                                                                   | 1.5 秒内出声；歌词逐句走；点一句歌词能跳过去                                                   |
| 4   | 锁屏放 10 分钟；用锁屏 / 耳机切歌、暂停、继续                                                                                                      | 一直在放；（HTTPS 时）锁屏有封面、歌名、进度，能拖动                                           |
| 5   | 电脑 Chrome 上传 `gapless/` 整个文件夹（album.flac + album.cue + cover.jpg）                                                                       | 一张卡片「CUE 整轨 · 3 首」，入库后曲库三行「整轨第 1/2/3 段」；电脑上做出省流版               |
| 6   | iPhone 点「整轨第 1 段」                                                                                                                           | 第一次显示「整轨第一次播放，先取到这台设备」+ 进度，之后出声；1→2→3 段之间听不到缝，锁屏也不停 |
| 7   | 点歌名下的徽章 → 音质页 → 选「省流」                                                                                                               | 从原位置接着放，徽章变「省流」；选回「自动」变回原件                                           |
| 8   | 音质页「把原件存到这台设备」→ 开飞行模式 → 放这首                                                                                                  | 下载完成后显示「已存在这台设备」；飞行模式下照样能放（徽章旁有小绿点）                         |
| 9   | 曲库里某首 ⋯ → 改成仅自己可见；另一个账号刷新                                                                                                      | 对方曲库里这首消失；改回后出现                                                                 |
| 10  | 「声音」页                                                                                                                                         | iPhone 上显示「用侧边的音量键」；能看到云端已用多少和本机存了多少                              |

**电脑（Chrome / Safari）补测**：拖文件夹上传、WavPack 卡片提示「放不了」但照样入库、Hi-Res 原件在 Chrome 能放、ALAC 只有 Safari 能放（Chrome 上自动放省流版）、删除（点两次确认）后对方曲库也消失。

## 八、已知限制与下一步

- 省流版只在能编码的设备上做；在 iPhone 上传的无损歌要等电脑补做（补做按钮未做）。
- 没有媒体 Worker：ALAC / AIFF / WavPack / APE / DSD 在不支持的浏览器上只能放省流版；DSD 的无损转换、波形、指纹匹配、服务端响度扫描都等以后的 Worker。
- 歌词编辑器（粘贴 / 打拍子对时 / 整体偏移）、LRCLIB 自动匹配、封面自动匹配、「我们的歌单」与两人小事（谁加的、回应、送一首歌、TA 在听）、拼音搜索、专辑 / 歌手页签、虚拟长列表：数据库已就绪，界面留给下一步。
- 删除只把曲目标成已删除，原件留在存储里；清理任务（服务端）未做。
- Supabase Free（[调研](research/ingest-storage.md) §1）：存储 1 GB 和照片共用；每月流量 5 GB（另有 5 GB 走 CDN 缓存）；单个对象 50 MB；一周没人用项目会暂停（要去 Dashboard 恢复）。离线下载和整轨缓存能省流量；整轨和 Hi-Res 多了就该升 Pro（改 `DEFAULT_MAX_OBJECT_BYTES` 一个常量即可不再分片）。
