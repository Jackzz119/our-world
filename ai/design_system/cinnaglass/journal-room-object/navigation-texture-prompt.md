# 导航微磨砂纹理 · 生成记录

2026-09-07，内置 ImageGen，单次生成。参考图为批准设计板的导航裁图 `navigation-verification/reference-nav.png`，仅借表面质感，不取图中图标或房间。

## 完整生成描述

Use case: stylized-concept. Asset type: raw neutral frosted antique glass MICROTEXTURE map for a cozy game UI, not a designed UI panel. The reference is for its softly uneven smoky cloudy wisps and very fine irregular surface grain ONLY. Produce one full-bleed square seamless grayscale texture, flat orthographic material scan. Neutral 50 percent gray overall, delicate tiny etched/grain marks and a few softly flowing broad irregular translucent-looking wisps, mild hand-blown glass mottling. Broad pattern contrast modest, grayscale mostly 90-165/255, no absolute black/white. Organic painted-glass patina, not stone, not marble veins, not brushed metal horizontal streaks, not cracked glass, not paper fibers. The reference's quiet glass surface amplified just enough to survive tiny display. NO icons, NO letters, NO shapes, NO buttons, NO border, NO rounded rectangle, NO glow spots, NO scene, NO scenery reflected in it, NO brown/green/blue tint. Only the texture filling every pixel edge to edge. It will be soft-light blended with the actual scene and CSS will separately supply opacity, boundaries and lighting. Seamless tile, no central subject, even illumination, refined restrained detail.

## 实际采用方式

- 原始生成图保存在 `arts/ui/navigation/frost-source.png`，未覆盖批准设计稿。
- 生成描述最初设想使用 soft-light（柔光混合）；实景发现灰色底会遮住房间，因此最终没有采用这条混合方法。
- `scripts/pack-navigation-texture.mjs` 将中灰附近的亮暗偏差转成透明的浅色/深色颗粒，缩成 512×512 的带透明通道 WebP。它只是纹理图，不含房间、固定颜色、图标、光晕或文字。
- 产品读取 `public/ui/nav/frost.webp`；真实透明度、环境色、局部反光、鼠标与触摸反馈由导航专属 CSS 负责。
- 图标使用可缩放的矢量线条，不烧进纹理。只在图标轮廓上发光，避免方形图片亮边。

参见 [实现与验证](navigation-implementation.md)。
