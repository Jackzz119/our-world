# Audit 技能第一二步交接  (存档: 2026-09-19)

> 会话存档，由 intj 维护。待办看 ai/TODO.md，架构看 ai/PROJECT.md。审核进度看 ai/project-audit/INDEX.md。

## 手上这件事
- 目标：用 hyber-operator-portal 的 `project-audit` 技能给本仓做五步全项目自审；现已完成第一步（文档/冗余/目录）与第二步（结构/复用/注释/格式化 + 用户批准的全部重构）。
- 进行到：第二步全部 commit 已推送到 `origin/dev`（`dc74f51`..`365b0aa`），随后又复刻了 hyber-operator-portal 的技能/协议体系并推送；第三步「协议、后端与前端深度 review」未开始。入口 `ai/project-audit/INDEX.md`。

## 本轮关键决策
- 第二步 A 类（注释/引用/死样式/小复用/格式化）直接做，B 类（大文件拆分等）先给方案 —— 理由：技能规定全面重构须用户明确要求；用户随后批准全部 B 类并已执行。
- 拆分等价性用「帧像素逐字节 / 计算样式 dump / 纯函数断言 / AST 去注释同一性」证明，而非运行时冒烟 —— 理由：本机无 `.env.local`，进不了世界。
- 纪念日只读 `world.anniversary`，「在一起 N 天」以纪念日当天为第 1 天（整体 +1）—— 理由：三份真源导致改设置后日历不更新，是现存 bug。
- 不换 `image-slot.js` 为 React、不加 `world-settings` 入口、不接 `savePw` 后端 —— 理由：分别是产品决定 / 产品决定 / 功能而非重构；后两项已记 TODO。
- `.claude/skills` 以内容更新的 `.agents` 版对齐（非反向）—— 理由：`.claude` 旧版是 7 月人格版且引用不存在路径；用户若本意相反可翻转。

## 下一步续接动作（新设备 / 新会话按顺序做，不需要用户手动跑任何接入命令）
0. **先自举协议与技能**（刚拉下来的仓库根目录没有 `CLAUDE.md` / `AGENTS.md`，`.claude/skills` 也不存在——它们被 gitignore）：
   `bash ai/jaSkills/custom-skill/scripts/sync-worktree.sh`（不依赖 shelf；从 `ai/jaAgents/` 副本生成两份协议、建三条技能链接；有 shelf 的机器也可用 `shelf init --agents claude,codex`）。
   跑完**从头读一遍 `./CLAUDE.md`**（本会话启动时它还不存在，不会被自动注入），再读 `ai/PROJECT.md`「开工红线」。技能未被本会话自动发现时，直接读 `ai/jaSkills/project-audit/SKILL.md` 与 `reference.md` 按其执行，等价于调用技能。
1. 确认 `git status` 干净、`pnpm exec tsc -b` 零错误（第二步交付状态）。
2. 开第三步：新建 `ai/project-audit/runs/2026-09-2x-01/`，在 `STEPS.md` 拆子步骤，按技能 §第三步 从每个入口跟到协议/存储/网络/状态/呈现；只交付诊断与建议。线索见 INDEX「第三步开工时要知道的」。
3. 有 Supabase 会话时跑 INDEX 里的运行时验收清单，补第二步「未验证」项。
4. 技能真源/协议体系已复刻完成（`ai/jaSkills` 唯一正本、`ai/jaAgents` 入库协议副本、`.shelf.json`、`.worktreeinclude`），无需再做接入工作；第 0 步的脚本就是它的落地方式。用户侧只做 `git pull origin dev` + `pnpm install`。

## 别踩的坑
- `prettier --list-different` 有输出时退出码为 1，链式 `&&` 会中断后续命令。
- `.idea/` 会被 `inventory.py` 扫进清单，跑清单要 `--exclude .idea`。
- Prettier 会重排审核目录 Markdown 表格，用精确字符串改状态列会失配，按行 ID 正则替换。
- react-hooks v7 编译器规则对超大函数静默跳过，拆小后才报错；不能为闭嘴机械删 `eslint-disable`（`room-scene.tsx:121` 删了会触发「render 期改 ref」错误）。
- 移动文件后 `check-journal-art.mjs`/`check-journal-turn.mjs` 里硬编码的 `/src/themes/cinnaglass/*.ts` 模块 URL 要同步（本轮已改为 `journal/…`）。
- 并行 agent 在同一工作区时，文件集合必须互斥且入口路径不动；跨文件归位/改名放最后由一人用脚本做。
