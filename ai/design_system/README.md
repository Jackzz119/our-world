# Design System 目录说明

看当前整体风格，请打开 **[design-system.md](design-system.md)**。此 README 只说明组织方式。

```text
design_system/
├── design-system.md        当前一期的整体设计、铁律、采用项与素材位置
├── preview.html / preview.js  从常驻 Markdown 自动读取图片的全局预览
├── character.md            人物、姿势、在场状态、轻互动与制作方式
├── scene.md                房间、书房第一期、分层、镜头与取景
├── props.md                桌上物件与活物件制作管线
├── effects.md              光影、天气、粒子、声音与性能边界
├── study-verification/     书房实装截图（引擎里拍的，场景 / 角色 / UI 文档引用）
├── concept/                当期概念与深化稿（图、拼图、制作注记与出图 brief）
├── codex-visual/           待确认的比稿与原型；原始生成批次只留本地
└── uiux/                   UI Tailor 管理，Monet 总审
    ├── uiux.md             当前 UI/UX 总览
    ├── interaction.md      当前 / 目标交互契约
    ├── mobile.md           手机与低高度布局
    └── cinnaglass/         当前主题规范、实装截图与配套资源
```

**只放最新一期**：设计系统是概念与 UI 在内所有美术开发的参考源。换期时，上一期资料移到 `arts/archive/<期>/`（只留一期），两期以前的删除；仍然有效的规则先写进当期文档再移档。项目实际素材地址登记在 design-system.md，技能目录不记录项目资源。

原始生成批次（`codex-visual` 的时间戳目录）被 `.gitignore` 挡在仓库外；整理好的定稿图、提示词与注记入库。运行 `node scripts/check-design-system.mjs` 检查常驻入口、图文与本地链接。
