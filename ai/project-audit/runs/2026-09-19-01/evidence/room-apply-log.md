# 第二步落实日志 · 房间合成器与主题根散件（A 类）

- 运行：`2026-09-19-01` / step 02 apply / 基线 HEAD `dc74f51` / 分支 `dev`
- 依据：`evidence/room-structure-review.md` §4（注释审计）、§5（失效引用）、§7 清单 A
- 授权范围：注释精简、失效引用修正、小复用；**B 类（拆分 / 改名 / 删整文件）未做**
- 明确不做：A6 中的 `profile.ts` `daysSince` / `daysUntilAnniversary`（另一分区的纪念日方案要用）、A11（性能微调）、A12（内联样式搬迁）
- 改动 9 个文件，全部只动注释，唯一的代码改动是 `room-scene.tsx` 的类型层（A10）

---

## 1. `src/themes/cinnaglass/room/pixi-scene.ts`

**注释（新增 / 压缩）**

- 模块头：层树补全到现状 —— 补上 turntable 的 platter / light / stills / armSwing 四层，以及 hotspot zones、sparkles 两层
- 新增一句话职责注释：`CharacterAssets`、`SceneHandle`、`LightRecipe`、`RECIPES`、`linearGradientTexture`、`radialGradientTexture`、`ArtImage`、`Mat3`、`mul3`、`inv3`、`Corners`、`Streak`、`TrailPoint`、`Drop`、`rand`、`TRAIL_FADE_S`、`makeStreak`、`makeDrop`、`buildScene`、`refitDiscs`、`fitDisc`、`drawHands`、内联 `hand`、`Hot`、`Spark`、`spawnSpark`、`buildLight`、`Fade`、`startFade`、`applyRecipe`、`musicHotIndex`、`tick`、`startRainAlpha`、`onVisibility`、`resize`、句柄的 `setMood` / `setWeather` / `destroy`
- 压缩：`discHomography`（8 行 → 3 句，去掉与首句重复的 affine 陈述）、`shadowTexture`（6 行 → 3 句）
- 未加注释的匿名回调保持原样（未机械铺开）

**删除的旧注释摘句**

| 位置 | 摘句 | 原因 |
|---|---|---|
| 模块头 | `the "pasted on" look of the CSS prototype is gone by construction` | 与已废弃的 CSS 原型对比 |
| `RECIPES` 内 twilight 前 | `codex audit M3: dim less globally, keep faces warm — washes dropped ~15%, actor tints lifted toward lamp-warm` | 一次性调参记录；改为 `RECIPES` 文档注释里的一行报告路径引用 |
| `sparkleTexture` 内 | `color tiers per the sparkle spec: core #FFF8E8, rays #FFE6B5, halo #FFC978` | 复述紧随其后的三个色值，且 spec 无路径可查；换成 `ray` 的职责说明 |
| 雨层段标题 | `(ported from the canvas prototype)` | 过时来源叙述 |
| 唱片机段 | `The vinyl is carved out of EVERY mood's base art (ellipse → un-squashed circle) and spun inside a frame that re-applies the perspective squash + tilt` | 描述已被 `discHomography` 取代的旧椭圆方案；重写为单应变换版 |
| `refitDiscs` 声明 | `(see below)` | 「看下面」不是说明；改为「由 turntable 块赋值、由 resize() 调用」 |
| `buildLight` 末尾 | `vignette retired (2026-08-11 user call): the frame-rect version read as a black overlay hugging the edges…` | 描述一个不存在的图层，整段删（3 行） |
| 提示排程段 | `Research-tuned pacing (affordance survey 2026-08-15)` | 文档在 `ai/` 下定位不到，改为中性的「Pacing:」描述，不留死路径 |
| 星星段 | `Tuning follows the sparkle mockup brief` | 同上，改为直接写取值 |
| 4 处行内 | `spec:` / `mockup:` / `spec scale curve` / `rhythm per the sparkle spec` | 同属上面两个查无此档的引用，去掉「按某规范」的说法，保留具体数值 |

**失效引用修正**

- `RECIPES` 文档注释：调参历史指向 `ai/codex-visual/20260811-044310Z/codex-report.md`
- `getSeatScreenPos`：`codex audit H1` → `ai/codex-visual/20260811-044310Z/codex-report.md H1`
- 保留且已核实存在的引用：`ai/design_system/research/living-props.md`

**验证**：`pnpm exec tsc -b` 通过、`pnpm exec eslint <file>` 0 问题、verify 脚本判定 `comment-only`

---

## 2. `src/themes/cinnaglass/room/room-scene.tsx`

**注释**

- 模块头删 `(replaces the retired 3D metaspace)`（历史叙述，代码里已无 3D）
- 新增：`CHARACTERS`、`SeatPresence`、`RoomSceneProps`、`toRoomWeather`、`RoomScene`（组件 3 句：只挂载一次、prop 变化走句柄、头顶覆盖层是 DOM 且靠 600ms 轮询定位）
- `:121` 的 `eslint-disable-next-line react-hooks/exhaustive-deps` **保留未动**（该行在基线上就报 "Unused eslint-disable directive" 警告，改前改后一致，见验证）

**类型改动（A10，纯类型，不改运行行为）**

- `active?: boolean` 从交叉类型 `RoomSceneProps & { active?: boolean }` 并入 `RoomSceneProps`，并补一句作用说明
- `weatherKind` 收成具名类型 `WeatherKind`。**注意**：它目前仍是 `string` 别名，没有收成字面量联合 —— 上游 `model.ts` 的 `Weather.kind` 与 `WorldPage.tsx:59/69` 的 `mapWmo` / `MANUAL_WX` 都显式标注为 `string`，真正收窄要一并改 `WorldPage.tsx`（不在本分区授权文件内）。本轮只把概念命名下来并写清取值域，留给后续一处改动点

**失效引用修正**

- `codex spec §5.9` → `ai/codex-visual/20260811-055917Z/codex-report.md §5.9`
- `codex spec §5.5` → `ai/codex-visual/20260811-055917Z/codex-report.md §5.5`

**验证**：`tsc -b` 通过；`eslint` 仅剩基线就存在的那条 unused-disable 警告（改前在 `:121`、改后在 `:141`，内容相同，已用 `git checkout` 对照确认）；verify 脚本判定 `code-changed` —— 符合预期，差异全在上述两处类型层（已逐行看过 `git diff`）

---

## 3. `src/themes/cinnaglass/room/room-types.ts`

**注释 / 结构（A5）**

- 新增：`RoomMood`、`RoomWeather` 的一句话职责注释
- **孤儿 JSDoc 上提**：原挂在 `platterArt` 前、实际在讲整套分层方案的那段 11 行 JSDoc（TypeScript 只认紧邻的最后一个，等于写了也读不到），合并进 `TurntableSpec` 的类型级 JSDoc；`platterArt` 只留它自己那句。内容一字未删，只换了位置

**失效引用修正**

- `SeatAnchor.phase`：`ai/STYLE.md §6` → `ai/design_system/character.md`
- `HotspotSpec`：`ai/UX.md §2/§5` → `ai/design_system/props.md` 与 `ai/design_system/uiux/uiux.md`

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`（JSDoc 搬位在 AST 层不算代码改动，与预期的 `code-changed` 不同但更好）

---

## 4. `src/themes/cinnaglass/room/study-room.ts`

- 失效引用：热点段 `ai/UX.md §2` → `see ai/design_system/props.md`（顺手把该段重排成 76 列，与文件其余注释一致）
- 新增 `STUDY_ROOM` 一句话注释（所有锚点以 1586x992 底图为准）
- 该文件注释质量本就是分区最高，其余一律未动

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`

---

## 5. `src/themes/cinnaglass/tweaks.ts`

- 模块头已在 HEAD 上重写过（omelette / postMessage 那半句早已不在），本轮未动
- 新增：`Mood`（写明是 `RoomMood` 的别名，面板只能覆盖房间已认识的时辰）、`GlassStyle`、`WeatherTweak`（点明 `'auto'` 是模式不是天气）、`Tweaks`、`STORE_KEY`、`TWEAK_DEFAULTS`、`loadTweaks`、`SetTweak`、`useTweaks`
- `hudLayout` / `density` 死字段与 `loadTweaks` 的 local-store 复用在 HEAD 上已完成，本轮无需处理

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`

---

## 6. `src/themes/cinnaglass/model.ts`

- 新增：`Weather`、`Profile`、`CalEvent`、`Alarm`、`Widgets` 的一句话注释
- `Room` 补撞词澄清：明确写出「它不是场景，场景的美术契约是 `room/room-types.ts` 的 `RoomTemplate`」。删除 `Room` 本身属 B 类，未做
- `WidgetPos` 在 HEAD 上已删

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`

---

## 7. `src/themes/cinnaglass/profile.ts`

- 新增：`PROFILE_DEFAULT`、`gload`（说明是「合并语义」：读出来的 blob 盖在 `fb` 上，解析失败整体回退 `fb`）
- **按指示保留** `daysSince` / `daysUntilAnniversary` 及其分节注释（审阅报告 A6 建议删，但另一分区的纪念日方案要用）
- 文件头解释「为什么从 settings.tsx 拆出来」是好注释，保留

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`

---

## 8. `src/themes/cinnaglass/rooms.ts`

- 失效引用：模块头 `Terminology (channel.md)` → `see the database section of ai/PROJECT.md`（`ai/features/channel.md` 不存在；PROJECT.md 已记载 channel 文档随 Discord 壳层作废）
- 模块头首句改为与现实相符的「早期 mock 数据 + 图标映射」（原写「used by sidebar, space switcher, App」，三个常量现已零消费者）
- 新增 `ROOMS_DEFAULT` / `ROOM_ICONS` / `VOICE_DEFAULT` 各一句
- `owLoad` 在 HEAD 上已搬到 `src/lib/local-store.ts`；删整文件属 B3，未做

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`

---

## 9. `src/themes/cinnaglass/scene.tsx`

**模块头重写（原有 3 处过时叙述全删）**

| 摘句 | 原因 |
|---|---|
| `(replaces the upload slot)` | 历史叙述 |
| `The mood overlays in ow.css still tint this` | 全仓无 `ow.css`，规则实际在 `cinnaglass.css:589-840`；改为 `cinnaglass.css (.scene-base / .mood-* / .wx-*)` |
| `RoomArt is exported so the minimap can reuse it` | 小地图不存在 |

新头注同时补上这个文件存在的理由：纯 markup、零资产，所以能在任何贴图加载之前就画出来（登录页 / 重置密码页背景）。

**注释新增**：`ROOM` 调色板（T/R/L = 等距盒子的顶 / 右 / 左面）、`BoxProps`、`ShadowProps`、`Shadow`、`RoomArt`、`RoomScene`（并注明它与 `room/room-scene.tsx` 的 `RoomScene` 无关）

**未做**：`RoomArt` 取消导出、`scene.tsx` → `login-backdrop.tsx` 改名（均属 B2）

**验证**：`tsc -b` 通过、`eslint` 0 问题、verify 判定 `comment-only`

---

## 总验证

| 项 | 结果 |
|---|---|
| `pnpm exec tsc -b` | 每个文件改完各跑一次，全部 0 错误 |
| `pnpm exec eslint <file>` | 9 个文件 0 错误；`room-scene.tsx` 有 1 条基线就存在的 unused-disable 警告，已对照确认非本次引入 |
| `pnpm exec vite build` | 成功（2.50s），产物随后 `rm -rf dist` 清掉 |
| `verify-comment-only.mjs --revision HEAD` | `total 9 / commentOnly 8 / codeChanged: room-scene.tsx` —— 唯一的 code-changed 就是 A10 的类型改动，`room-types.ts` 的 JSDoc 上提在 AST 层等价，判为 comment-only |

## 遗留

- `WeatherKind` 目前仍是 `string` 别名，真正收成字面量联合需要同时改 `model.ts` 的 `Weather.kind` 与 `WorldPage.tsx` 的 `mapWmo` / `MANUAL_WX`（跨分区，需统筹）
- A1（`shell/chat-card.tsx` 的 `Msg` 导入）不在本分区文件内，未动
- A13（全局 prettier）按指示未跑
