# Design System 目录说明

看当前整体风格，请打开 **[design-system.md](design-system.md)**。此 README 只说明组织方式。

```text
design_system/
├── design-system.md       当前整体设计、采用项与素材位置
├── character.md           当前角色图文及动画
├── scene.md               当前场景/建筑空间图文及行为
├── props.md               当前物件图文与交互
├── effects.md             当前效果及运行说明
├── uiux/                  UI Tailor 管理，Monet 总审
│   ├── uiux.md            当前 UI/UX 总览
│   ├── interaction.md     当前/目标交互契约
│   ├── cinnaglass/        当前主题 Markdown 与配套资源/预览
│   └── research/          UI 调研与历史比稿
├── concept/               整体构想、未来想法、否决方案档案
└── research/              美术调研、比稿与实验
```

项目实际素材地址记录在设计系统，技能目录不记录项目资源。README 不复制风格、参数和当前任务。

更新采用项时同步常驻 Markdown 和相关图片/动态展示；阶段收尾清理过期附属资料与临时文件。有价值的比较和否决依据保留，普通回合报告在 session 中给出。运行 `node scripts/check-design-system.mjs` 检查当前入口、图文与本地引用。

需要跨设备 HTML 时从常驻 Markdown 生成/替换同一展示版并按授权发布；目前以 Markdown 为持续维护的来源。
