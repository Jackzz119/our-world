# 我们的小世界 · Our World — Project Guide

A cozy, dreamy **private world for one couple** (NOT a social app — no feeds, no
public multi-user). It looks like peering down into a beautifully lit dollhouse
room, with a weightless game-style glass HUD floating over it. Mobile-first,
looks great on desktop. All copy is **Chinese**.

> Read this first when starting a new session. Then skim the files it points to.

---

## 1. Tech & how it's wired

- **Single page**, no build step. `Our World.html` is the shell; all logic is in
  sibling `.jsx` files loaded as `<script type="text/babel">` (React 18 UMD +
  Babel standalone, pinned versions with integrity hashes — keep them exact).
- **No bundler, no modules.** Each Babel script shares one global scope.
  Components are exported to `window` via `Object.assign(window, {...})` at the
  end of each file so other files can use them.
- **Style-object rule:** never `const styles = {}` at global scope (name
  collision breaks everything). Use inline styles or co-located `<style>` blocks.
- Each component file injects its own CSS via a `<Style>` React component
  (e.g. `HudStyles`, `ScreenStyles`, `CalClockStyles`, chat styles inline).

### Script load order (in `Our World.html`, do not reorder)
```
react → react-dom → babel → image-slot.js → tweaks-panel.jsx →
icons.jsx → scene.jsx → hud.jsx → screens.jsx → calendar.jsx → chat.jsx → app.jsx
```

### File map
| File | Role |
|---|---|
| `Our World.html` | Shell: fonts, **all CSS tokens**, scene/mood/weather CSS, script tags |
| `app.jsx` | Root `<App>`. Orchestrates everything; weather + live clock; tweaks; persistence; navigation between screens |
| `scene.jsx` | `RoomScene` (full-bleed backdrop) + `RoomArt` (generated isometric room SVG, reused by the minimap) |
| `hud.jsx` | Floating HUD: cards/chips, presence avatars, lighting toggle, **Toolbox** (widget on/off + drag-to-arrange), `DraggableFloat`, layout presets |
| `screens.jsx` | `SubScreen` — centered pop-out modal with tabs: timeline / photos / notes / wishlist. Stays mounted (state + scroll persist) |
| `calendar.jsx` | `CalendarScreen` (日历·约会) + `ClockScreen` (时间·闹钟) |
| `chat.jsx` | `Chat` — docked/fullscreen messaging, 1:1 + group threads, emoji picker, **drag-to-resize** |
| `icons.jsx` | All line icons (`<Ico>` + named `I*` components). Stroke = currentColor |
| `image-slot.js` | Starter web component `<image-slot>` — user drag-drop photo slots (persist to localStorage) |
| `tweaks-panel.jsx` | Starter Tweaks shell — `useTweaks`, `TweaksPanel`, `TweakRadio`, etc. |

---

## 2. Visual system (Cinnamoroll-inspired, warm-leaning)

Defined as CSS variables in `Our World.html` `:root`. **Always use these tokens.**

- **Sky blues:** `--sky-1 #AEDFF2`, `--sky-2 #BFE3F5`, `--sky-3 #D8EFFA`
- **Cream base:** `--cream #FBFCFE`
- **Warm accents:** `--butter #FCE7B0`, `--blush #F8D7DF` (we lean warmer — peach
  + butter glows over the blue; user explicitly wants warmth)
- **Moody depth:** `--navy-1 #2A3A5E`, `--navy-2 #1E2A47`, `--navy-deep #141d33`
- **Radii:** `--r-lg 24` `--r-md 18` `--r-sm 14` `--r-pill 999`
- **Fonts:** `Noto Sans SC` (UI/Chinese), `Baloo 2` (rounded display for numbers —
  apply with `.num`). Numbers use `font-feature-settings:"tnum"`.

### Glassmorphism
The `.glass` class = frosted translucent panel (backdrop-blur + saturate, thin
light border, soft large shadow, inset highlight). Glass tokens
(`--glass-bg`, `--glass-border`, `--glass-text`, `--glass-glow`, `--accent`,
`--accent-deep`, …) are **re-themed by `[data-glass]`** on `.app`:
`cloud` / `sky` (default) / `twilight`. Everything reads these vars so the whole
UI recolors when the glass style changes.

### Lighting moods — `[data-mood]` on `.app`
`golden` / `twilight` (default) / `night`. Layered overlays in `.scene-base`
(`.mood-tint` soft-light, `.mood-glow` screen, `.mood-stars`, `.mood-vignette`)
plus a mood-aware `.scene-ambient` gradient so the scene looks dreamy even before
any room art renders. Changed via the in-scene lighting toggle **and** the Tweak.

### Weather — `[data-wx]` on `.scene-base`
`sun` (warm rays) / `cloud` / `rain` (animated streaks) / `snow` (drifting
flakes). Driven by real weather (see §4). CSS lives under "WEATHER" in the HTML.

### Motion
Entrance/float anims gate on `prefers-reduced-motion`. Floating widgets use
`floatA/B/C` keyframes; hearts use `beat`. Speaking avatars use `voicePulse` +
`spkbob`.

---

## 3. The room (`scene.jsx`)

`RoomArt` is a **hand-built isometric SVG diorama** (NOT an upload — the earlier
drag-drop room slot was removed). Iso projection via `X()/Y()/pt()/f()` helpers
and a reusable `<Box>` (3 faces) + `<Shadow>`. Contains: wood floor + base slab,
two walls, window with spill light, desk (monitor/keyboard/lamp/books/plant),
chair, rug, bed with pillows/blanket, shelf + framed picture, floor plant, and
**two chibi Cinnamoroll-style bunny avatars**. The minimap reuses
`<RoomArt shadow={false}>`. To swap in a real 3D render later, replace
`.room-stage` contents.

---

## 4. State, data & persistence (`app.jsx`)

Live clock ticks every 1s (`nowTs`). **Weather**: if Tweak = `实时(auto)`, request
geolocation → fetch `open-meteo` current temp + WMO code → map to kind/label;
on denial/timeout fall back to 多云 22°. Manual Tweak values force a fixed kind.
Weather kind flows to both `RoomScene` (`data-wx`) and the ambient pill / clock.

**localStorage keys** (all prefixed `ow-`):
| Key | What |
|---|---|
| `ow-widgets-v1` | Which addon widgets are on |
| `ow-wpos-v1` | Custom dragged widget positions |
| `ow-chat-size` | Docked chat W/H |
| `ow-dates-v1` | Calendar events (约会) |
| `ow-alarms-v1` | Clock alarms |
| image-slot state | Managed by `image-slot.js` (`.image-slots.state.json`) |
Tweaks persist via the starter's own mechanism.

---

## 5. HUD & the Toolbox (`hud.jsx`) — important interaction model

Floating widgets are positioned by `hudPositions(layout)` presets
(`scatter` default / `cluster` / `topbar`) unless the user dragged them
(custom position from `ow-wpos-v1`).

**Two kinds of widget:**
- **Required (always on, can't remove):** `days` (→ timeline entry),
  `minimap`, `chat`.
- **Addon (toggleable any time):** `presence`, `anniv` (→ calendar),
  `memory` (→ photos), `ambient` (→ clock), `lighting`.

**Toolbox** (bottom-right FAB, grid icon → ✕): lists required (locked) + addon
(toggle switches, **always work**) + "即将推出" (`custom` self-made components).
It also has **解锁编辑 · 拖动摆放**: a toggle that enables **drag-to-reposition**
of every floating widget (dashed outline + move cursor; taps don't navigate
while dragging) and a "恢复默认位置" reset. Toggles are independent of edit mode —
edit mode is ONLY about dragging.

**Entry mapping (current):**
- `在一起365天` card → Timeline
- `阳台看日落` memory card → Photos
- 纪念日 chip → Calendar
- 时间·天气 pill → Clock

**Presence** = just the two of us (小满 + 知夏). Floating party-roster style on the
LEFT edge — **no panel background, no connecting line** (game-team look). Each
avatar: gradient fill, white ring (butter ring for the couple), online dot, name
below. Tapping previews the **speaking halo** (`voicePulse` rings) — built so a
future **voice feature** just sets a `speaking` flag per person. Data in
`PRESENCE` array. Warm palette (her = blush, me = butter).

---

## 6. Screens (`screens.jsx`, `calendar.jsx`)

- **`SubScreen`** centered glass modal, **always mounted** (so state/scroll
  survive close — scene never re-renders). Tabs: 时间线 / 照片 / 文字回忆 / 心愿单.
  Timeline supports posting; photos tab = gallery of timeline images. Wide enough
  on desktop. Pops from center (not bottom).
- **`CalendarScreen`**: anniversary countdown card, month grid (today / 纪念日 /
  event dots), tap a day to add 约会, upcoming list with countdowns. Anniversary
  base date = `ANNIV` (2025.6.4).
- **`ClockScreen`**: big live time, date + live weather, add/toggle/delete alarms.

Both use the `.modal.mini` size and the shared modal scrim/transition.

---

## 7. Chat (`chat.jsx`)

Docked bubble bottom-left → opens a glass panel; can go **fullscreen** (overlay
that doesn't re-render the scene) or stay docked. Docked panel is
**drag-to-resize** (right / top / corner handles; persists). Supports a contacts
list + threads — **1:1 (the lover) and group chats** (multi-member, colored
sender names/avatars). Emoji picker (categories ❤️😊🌙🍰) appends to input,
stays open for multi-pick. Lover thread has special styling.

---

## 8. Tweaks (toolbar toggle) — `app.jsx`

`光线` (mood), `天气` (实时/晴/多云/雨/雪), `HUD 布局` (环绕/聚拢/顶栏),
`信息密度` (极简/丰富), `玻璃质感` (云朵/天空/暮光). All labels Chinese; values
mapped to canonical keys via the `L`/`inv` helpers.

---

## 9. Conventions & gotchas

- **Chinese-only copy.** Keep tone intimate, soft, "our private world."
- **Minimalism:** no filler, no data slop. Ask before adding new content/sections.
- Canonical HTML (closed tags, quoted attrs) for direct-edit support.
- Flex/grid + `gap` for any group of elements (not inline-flow).
- Keep the room scene the star — HUD stays light, floating, translucent.
- Verify after changes: `done` → if clean, `fork_verifier_agent`. html-to-image
  screenshots don't capture backdrop-filter / pseudo-element anims well — verify
  those via `eval_js` (computed styles / class changes) instead.
- Design system project (`019e0899-…`) is currently empty — this file IS the
  design reference. Palette is Cinnamoroll-inspired as above.

## Likely next steps the user has hinted at
- Real photos for presence avatars; live online/offline + mic-volume-driven halo.
- Make "自创组件" (custom widgets) real.
- Alarms that actually fire; grid-snap when dragging widgets.
