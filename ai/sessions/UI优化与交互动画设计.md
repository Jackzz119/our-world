# UI优化与交互动画设计  (存档: 2026-10-02)

> 会话存档，由 intj 维护。待办看 ai/TODO.md，架构看 ai/PROJECT.md。

## 手上这件事
- 目标：对坐一期的 UI 迭代收尾——苹果弹簧动效、暖瓷浅色、常驻看样页、要图清单，合并进 dev。
- 进行到：全部做完，经 PR #19（rebase）合并进 dev。下一棒是出图：用户在机器上装好 Codex 后，按 `ai/design_system/codex-visual/art-requests/art-requests.md` 一组一组委派（R1 → R4）。

## 本轮关键决策
- 弹簧按苹果的模型（duration + bounce），CSS 曲线由 `scripts/spring-curves.mjs` 从 `src/themes/cinnaglass/ui/spring.ts` 生成 —— 理由：用户要求参考苹果；改弹簧只改 spring.ts 再重新生成，不手改 `src/themes/cinnaglass/ui/motion.css` 里的 `linear()`。
- 托盘从任何地方都能拖、6px 起拖、过顶 0.55 橡皮筋、放手按 0.998 推算落点、速度取松手前 100ms（停住再松手不算甩）—— 理由：用户嫌往上拖发沉；`src/themes/cinnaglass/ui/sheet.tsx` 的 startDrag / endDrag，手机内容页的下拉同理（`content-page.tsx`）。
- 看样页常驻 `ai/design_system/uiux/cinnaglass/ux/index.html`，只放当期在用的界面，发布到同一个 artifact（https://claude.ai/artifact/UrhFYNuXyJzR5DSLAR546G）—— 理由：用户 10-02 定；定案的旧比稿只进 `arts/archive/v3-ui-rounds/`。
- 暖瓷是正式的界面风格之一（设置 → 主题外观 → 界面风格），默认仍是深玻璃 —— 理由：用户只说「可以应用实现」，没说改默认；改默认等用户开口。
- 美术图不在会话里生成，只写要图清单 + 代码里 `ART-REQUEST` 注释 —— 理由：用户 09-30 定规。

## 下一步续接动作
1. 出图（TODO.md M6「出图」）：先读要图清单的「共用要求」，`node ai/jaSkills/codex-visual/scripts/codex-visual.mjs status` 确认 Codex 就绪，再用每组末尾的英文 brief 委派，一次一组。
2. 出完一组：按条目的「接入」改代码（搜 `ART-REQUEST ART-0N`），按「验收」截图；把看样页「要图的地方」换成新截图，`node scripts/build-review-page.mjs <目录>` 后发布到同一个 artifact，再把那一条从清单里删掉。
3. 用户本机：`shelf push ai/jaSkills/monet`、`shelf push ai/jaSkills/ui-tailor`（技能改动 10-02 获准保留）。
4. 真机验收托盘的拖动手感（TODO.md M6「真机验收」）。

## 别踩的坑
- 容器没 GPU，场景约 250ms 一帧：手势测试前先 `window.__owApp?.stop()`，否则指针事件跟着帧到，速度测不准。
- CSS transition 优先级高于 Web Animations：弹簧跑的时候靠 `data-springing` / `data-pulling` 关掉 transition（`sheet.css`、`content-page.css`），新加拖动的地方也要这样。
- 起拖之前的那一段不算位移（`base = current - dy`）：测橡皮筋时扣掉第一步的距离。
- 看样页的 `.read` 只限宽度，别给 `<p>` 加 grid，否则行内链接会一行一个。
- 发布看样页前跑 `node scripts/check-design-system.mjs`，页里引用的每个文件都要存在。
