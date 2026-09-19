# 棕皮旧纸书本 · 生成与处理记录

2026-09-07。使用内置 ImageGen；参考为已批准的 `room-journal-concept.png`，未替换房间背景。

第一张书本输出没有真实透明通道，画出了棋盘背景；再要求仅抠背景也失败，变成了棕色背景。这两次结果均保留。采用第一张书本的内部纹理，用 `scripts/pack-journal-art.mjs` 仅去除与画布边缘连通的中性背景，书本内部颜色不改，最终以 CSS 校准纸色。羽毛笔原生带透明通道。默认头像从批准稿的两张原创角色肖像裁切，自定义用户头像不替换。

## 空白书本

原始图：`arts/ui/journal/book-checker-source.png`。

```text
Use case: precise-object-edit. Asset type: production 2D game UI open-book base plate. Input image is the APPROVED exact visual reference. Isolate and reconstruct ONLY the LARGE OPEN BROWN LEATHER JOURNAL from the top main panel. Match that book's art, creamy old parchment color, irregular mottled paper fibers, slightly weathered edges, delicate cracks at outer corners, layered page edges, center gutter with tiny stitches, worn chestnut leather rim with honey-brown edge highlights and fine stitching. The original attractive handcrafted watercolor/gouache texture must remain, NOT a smooth CSS rectangle. Keep its almost frontal overhead view, gentle paper curvature, even left/right leaves, crisp detail. Produce one LARGE isolated open book, centered, horizontal 3:2 canvas, book fills 94% width, both leaves fully visible, same proportions as reference's main book (not the tiny inset). Keep brown ribbon at bottom and short rectangular tan directory tab protruding from upper right, but tab BLANK. Actual transparent background outside the book, preserve transparent alpha, no room or shadow rectangle. EVERY top paper leaf entirely blank: remove ALL characters, titles, dates, page numbers, arrows, icons, close mark, entry boxes, avatars, photos, photo corners, handwriting. Remove the quill too (separate asset). Paper center should retain reference's subtle uneven fibers, warm antique cream and gentle light variation, slightly darker honey-tan outer margin, not yellow-orange, not plain flat white, not stains. Cover not green; warm chocolate/chestnut brown. Warm diffuse ambient light like the reference but quiet neutral enough for mood tint. No decorative embossing, no gold filigree, no extra objects. DO NOT redesign: faithfully reproduce the main approved book's shapes and materials with all content removed. This is a runtime background; real live text and photos will be overlaid later.
```

## 独立羽毛笔

原始图：`arts/ui/journal/quill-source.png`。

```text
Use case: stylized-concept. Asset type: isolated transparent quill pen sprite for a cozy game UI. Reference image: copy ONLY the ivory feather pen lying diagonally over the LOWER RIGHT CORNER of the large main open journal in the top panel. One single beautifully textured antique feather quill, ivory/tan feather with fine soft individually painted barbs, softly worn polished brass grip rings, small dark brown nib. Same tasteful warm watercolor and gouache handpainted game art as reference, not clip art, not vector outline, not photorealistic. Keep the silhouette diagonally pointing down-left, fluffy tapered feather tip at upper right, fine nib at lower left, approximate aspect 1:2.2. Full quill uncut, occupies 82% canvas, precise feather texture, subtle warm rim and soft dark underside. Output actual transparent background, no paper, no book, no desk, no icons, no text, no frame, no logos, no dramatic glow or giant drop shadow. This is a real static game decoration sprite, not a design board.
```

## 未采用的透明背景重试

原始图：`arts/ui/journal/book-alpha-rejected.png`。

```text
Use case: background-extraction. Edit ONLY the background of this exact book asset: remove all the fake white/light-gray checkerboard outside the outer silhouette of the leather book and bottom ribbon. Output REAL transparent alpha there, not a drawn checkerboard. Keep every part of the book unchanged: same blank paper, textures, colors, geometry, tab, ribbon, scale, pixels within book. Do not redraw, restyle, relight or add anything. The thin brown leather edge must remain crisp, all paper opaque, bottom ribbon retained. This is a transparent game sprite extraction, not a photo on a background. Actual alpha transparency, no checkerboard, no matte.
```
