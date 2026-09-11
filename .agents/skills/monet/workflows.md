# Iris 工作流手册：AI 美术管线（2026-07 调研版）

> 工具迭代极快——本文件是起点不是终点；遇到不满足需求的素材，上网搜当下方案并更新本文件。

## 管线选型决策树

```
需要什么？
├─ 2D 位图（背景/立绘/图标/UI点缀）
│   ├─ 快速+风格延续 → codex imagegen 同线程（主力，已验证）
│   ├─ 强控制/换脸不换风/批量变体 → fal.ai（Flux + LoRA/IP-Adapter）
│   └─ 本地/免费/可编程/确定性 → ComfyUI（+MCP server 接入开发环境）
├─ 3D 模型
│   ├─ 概念快速验证 → Tripo（8-100s 出网格，带游戏拓扑与自动绑定）
│   └─ 备选对比 → Meshy 等（质量/风格适配逐案测试）
├─ 动画
│   ├─ UI/特效动画 → CSS/引擎内手写（缓动语言统一最重要）
│   └─ 角色帧动画 → 生成姿态序列图（同线程逐姿态）或骨骼工具（Spine/DragonBones）
└─ 音频 → WebAudio 合成起步；升级再考虑生成式音频工具
```

## codex imagegen 同线程管线（当前主力，两项目 46 张验证）

1. 批次 1 = 画风基准图，prompt 末尾要求"回复画风锁定关键词总结"
2. threadId 记入项目 Docs；续批 `codex exec resume <threadId>`
3. 每批 prompt 固定结构：身份+方向四件套 → 素材清单（含轮廓差异要求）→ 硬性要求（尺寸/Alpha/路径/禁文字）→ 自检要求（小尺寸互认、逐像素 Alpha 验证）
4. 陷阱：mcp-server 新进程不认旧 threadId（用 exec resume）；跨机器线程不迁移（用基准图作参考重开）

## 一致性技巧（按强度排序）

1. **同线程续批**（codex）：最低成本，风格记忆在会话内
2. **参考图注入**：把基准图作为输入图（img2img/IP-Adapter），跨会话/跨工具续风格
3. **锁定词表**：把"画风锁定关键词"存进 tokens.md，每个 prompt 原样携带
4. **LoRA 微调**（ComfyUI/fal）：用已有素材训风格 LoRA，工业级一致性；可多 LoRA 叠加（风格+角色）
5. **后处理统一**：统一色调 LUT/描边滤镜兜底轻微漂移

## MCP 互联要点

- **codex-art**：`codex mcp-server`（stdio），工具 codex/codex-reply；或 CLI `codex exec`
- **fal MCP**：fal.ai 官方/社区 MCP server，接 Flux/图像编辑模型；适合程序化批量
- **Tripo MCP**：文/图→3D，直接落文件；配合引擎 MCP（Unity/Godot）可全自动导入
- **ComfyUI MCP**：把本地 workflow 暴露为 MCP 工具（如 mcpmarket.com/server/comfyui-4，面向 Godot 的模板），可编程+异步+进度回报
- 原则：**生成工具只写素材文件与 manifest，不碰业务代码**

## 修正词库（素材不合格时的 prompt 急救）

| 症状 | 修正词 |
|---|---|
| 塑料 3D 感 | 手绘软边、水粉/水彩质感、轻微纸张颗粒、flat shading、拒绝 specular 高光 |
| 小尺寸糊 | 单主体、占画面 85%+、轮廓优先于内部细节、加深色描边 |
| 风格漂移 | 原样携带锁定词表 + "严格保持本线程既定画风" + 指认基准图 |
| Alpha 脏边 | 纯色键控底生成后去底、要求"真透明逐像素验证"、避免半透明羽化边 |
| 构图不可用 | 给构图安全区百分比、锚点（底边贴齐）、视角锁定词（轻微俯视剖面等） |
| 出现文字 | "不出现任何文字数字Logo水印"必须每批携带（模型极爱加字） |

## 升级路径（当前方案不够时）

1. 改 prompt（修正词库）→ 2. 加参考图 → 3. 换模型/工具（fal 的不同底模、Tripo↔Meshy）→ 4. 训 LoRA → 5. **上网搜索**："<需求> AI workflow 2026"/"<工具> alternative"，把结论更新进本文件

## 调研来源
- Tripo 风格指南 https://www.tripo3d.ai/game-development
- Meshy 工具对比 https://www.meshy.ai/blog/best-ai-tools-for-3d-game-assets
- ComfyUI 独立游戏管线 playbook https://www.strayspark.studio/blog/comfyui-game-asset-pipeline-indie-2026
- ComfyUI MCP server https://mcpmarket.com/server/comfyui-4
- AI 美术不失质感（studio 视角）https://sunstrikestudios.com/en/blog/ai-in-game-art/
