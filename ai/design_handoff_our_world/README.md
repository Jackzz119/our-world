# Handoff: 我们的小世界 · Our World

## Overview
**Our World** is a cozy, dreamy **private world for one couple** (NOT a social
app — no public feeds, no multi-user discovery). The experience looks like
peering down into a beautifully lit isometric dollhouse room, with a weightless,
game-style frosted-glass HUD floating over it. It is **mobile-first** but looks
great on desktop. **All UI copy is Chinese**, and the tone is intimate and soft
("our private little world").

The product is a single-screen "world" with floating widgets (a glass HUD) and a
small number of pop-out panels/modals for deeper features (timeline, photos,
calendar, clock, chat, a Discord-style room sidebar, a space switcher, settings,
and a shared music player).

## About the Design Files
The files in this bundle are **design references created in HTML/CSS + in-browser
React (Babel)** — working prototypes that demonstrate the intended look, motion,
and behavior. **They are not production code to copy directly.** There is no build
step: each `.jsx` is transpiled in the browser by Babel standalone and shares one
global scope (components are attached to `window`).

The task is to **recreate these designs in the target codebase's environment**
(e.g. a real React/Next app with a bundler, Vue, SwiftUI, React Native, etc.)
using that environment's established patterns, component library, state
management, and asset pipeline. If no environment exists yet, pick the most
appropriate framework (a bundled React + TypeScript app is the natural fit given
the current structure) and implement there. **Do not ship the in-browser-Babel
setup to production.**

## Fidelity
**High-fidelity (hifi).** These are pixel-level mockups with final colors,
typography, spacing, radii, shadows, motion, and interactions. Recreate the UI
faithfully. Exact tokens are listed under **Design Tokens** below and defined in
`Our World.html` `:root`.

---

## Architecture (as prototyped — adapt to your stack)

Single page. `Our World.html` is the shell (fonts, **all CSS tokens**, scene /
mood / weather CSS, and the script tags). All logic lives in sibling `.jsx`
files. Script load order matters in the prototype:

```
react → react-dom → babel → image-slot.js → tweaks-panel.jsx →
icons.jsx → scene.jsx → hud.jsx → screens.jsx → calendar.jsx →
settings.jsx → sidebar.jsx → space.jsx → music.jsx → chat.jsx → app.jsx
```

| File | Role |
|---|---|
| `Our World.html` | Shell: fonts, **all CSS design tokens**, scene/mood/weather CSS, script tags, `#root` |
| `app.jsx` | Root `<App>`. Orchestrates everything: live clock, real weather, tweaks, navigation, and all shared state (profile, rooms, current room, events, alarms, widgets) + persistence |
| `scene.jsx` | `RoomScene` full-bleed backdrop + `RoomArt` (hand-built isometric room SVG, reused by the minimap) |
| `hud.jsx` | Floating glass HUD: widget cards/chips, minimap, music slot, Toolbox (toggle widgets on/off, **unlock-edit drag mode with snap-to-align guides**), `DraggableFloat`, layout presets |
| `screens.jsx` | `SubScreen` — centered glass modal with tabs: 时间线 / 照片 / 文字回忆 / 心愿单. Stays mounted (state + scroll persist) |
| `calendar.jsx` | `CalendarScreen` (日历·约会) + `ClockScreen` (时间·闹钟) |
| `settings.jsx` | `SettingsScreen` modal: 个人资料 / 账号与密码 / 主题外观 |
| `sidebar.jsx` | `Sidebar` — Discord-style left pop-out: world identity, room channels, room config, voice channels, in-room presence detail, footer user panel. Closed state = a minimal floating avatar dock on the left edge |
| `space.jsx` | `SpaceScreen` — visual floor-plan "space switcher" opened from the minimap |
| `music.jsx` | `MusicPlayer` — shared-listening music widget with a generative WebAudio pad |
| `chat.jsx` | `Chat` — docked/fullscreen messaging, 1:1 + group threads, emoji picker, drag-to-resize |
| `icons.jsx` | All line icons (`<Ico>` + named `I*` components). Stroke inherits `currentColor` |
| `image-slot.js` | Web component `<image-slot>` — user drag-drop photo slots (persist to localStorage) |
| `tweaks-panel.jsx` | In-design "Tweaks" panel shell (host-tooling control panel) |

---

## Screens / Views

### 1. The World (always-on base)
- **Purpose**: The home. A dreamy isometric room the couple "lives" in.
- **Layout**: Full-viewport. `RoomScene` paints a mood-aware ambient gradient,
  weather effects, and the isometric `RoomArt` diorama centered in a `.room-stage`.
  The HUD overlays on top (`position:absolute; inset:0; pointer-events:none`, with
  children re-enabling pointer events).
- **RoomArt**: hand-built isometric SVG (wood floor, two walls, window with spill
  light, desk with monitor/lamp/books/plant, chair, rug, bed, shelf + framed
  picture, floor plant, and **two chibi bunny avatars**). In a real app this can be
  replaced by a 3D render or illustration; treat it as a single hero asset.

### 2. Floating HUD widgets (`hud.jsx`)
Weightless glass cards/chips that gently bob (float animations). Two classes:
- **Required (always on, cannot remove):** `days` (在一起 N 天 → opens Timeline),
  `minimap` (round room map → opens the Space switcher), `chat`.
- **Addon (toggle from Toolbox):** `presence` (the left **Sidebar** + avatar dock),
  `anniv` (纪念日 chip → Calendar), `memory` (最近回忆 photo card → Photos),
  `ambient` (time · weather pill → Clock), `music` (一起听歌 player), `lighting`
  (黄昏/暮色/夜晚 segmented toggle).

Widget positions come from layout **presets** (`scatter` default / `cluster` /
`topbar`) unless the user has dragged a widget (custom position persisted).

**Toolbox** (grid FAB, bottom-right): a glass panel listing required (locked) +
addon (toggle switches) widgets, plus **解锁编辑 · 拖动摆放** (unlock-edit drag
mode) and a "恢复默认位置" reset.
- In edit mode every floating widget gets a dashed outline + move cursor; taps
  don't navigate while dragging.
- **Snap-to-align:** while dragging, the widget's left/center/right and
  top/middle/bottom edges are compared against every other widget's edges/centers
  **and** the viewport center + safe margins (20px). Within an **8px** threshold
  the position snaps and a highlight **guide line** (1.5px, accent color, glow)
  is drawn at the alignment axis; guides clear on drop.
- **Exiting edit:** closing the Toolbox (FAB ✕) auto-disables edit mode, AND the
  on-screen edit banner ("拖动摆放组件 · 点此完成") is itself clickable to finish.

### 3. SubScreen modal — Timeline / Photos / Notes / Wishlist (`screens.jsx`)
- Centered glass modal (`.modal.mini`), **always mounted** so tab state & scroll
  survive close (the scene never re-renders behind it). Pops from center.
- Tabs: **时间线** (post entries), **照片** (gallery built from timeline images),
  **文字回忆** (notes), **心愿单** (wishlist).

### 4. CalendarScreen + ClockScreen (`calendar.jsx`)
- **Calendar (日历·约会):** anniversary countdown card, month grid (today /
  纪念日 / event dots), tap a day to add a 约会, upcoming list with countdowns.
  Anniversary base date comes from the profile.
- **Clock (时间·闹钟):** big live time, date + live weather, add/toggle/delete
  alarms.

### 5. Settings modal (`settings.jsx`)
Glass `.modal.mini`, three sections:
- **个人资料**: world name (editable), the two avatars (drag-drop photo via
  `<image-slot>`) + editable nicknames, anniversary date picker.
- **账号与密码**: bound email, change-password (expandable; new password ≥ 4 chars
  and must match to enable Save), app-lock toggle.
- **主题外观**: 玻璃质感 (glass material) and 光线时段 (lighting) segmented controls
  that apply **live** via the tweak system.
- Entry point: the **Sidebar footer gear** (there is intentionally no separate
  settings FAB).

### 6. Sidebar — Discord-style room navigator (`sidebar.jsx`)
- **Closed state**: a minimal **floating avatar dock** at the left-center edge
  (the two stacked couple avatars + a small pull chevron). No panel background —
  preserves the scene. Click to open.
- **Open panel** (slides/fades in from the left as a glass card; see
  Implementation Notes): from top to bottom —
  - **World identity header**: stacked couple avatars, world name, "在一起 N 天 ·
    都在线", current-room pill ("你在 · 客厅"), close chevron.
  - **房间 (room channels)**: list of rooms (客厅 / 卧室 / 阳台 / 书房), each with
    an icon + member avatar dots; current room highlighted (accent left-bar +
    glow). Tapping a room **enters** it (sets current room + binds that room's
    lighting). A gear expands **room config** (rename room, "此刻" status text,
    and the room's lighting segmented control).
  - **语音频道 (voice channels)**: 一起听歌 / 煲电话粥 — tap to join/leave; joined
    channel shows your avatar + mic state.
  - **在「<room>」的人**: detailed presence cards for whoever is in the current
    room (avatar with online/speaking state, name, status line). Tapping an
    avatar previews the **speaking halo** (built so a future voice feature just
    sets a `speaking` flag per person).
  - **Footer user panel**: your avatar, name, editable custom status, mute toggle,
    and a **设置 gear** that opens the Settings modal.

### 7. Space switcher (`space.jsx`)
- Opened by tapping the **minimap**. Glass `.modal.mini` titled **空间**.
- A 2-column grid of room cards (visual floor-plan). Each card: room-tinted
  gradient, icon, "此刻" note, member avatars, a lighting label, and a "你在这里"
  tag on the current room (accent ring + glow).
- Tapping a card **enters** that space (updates current room + binds its
  lighting). Stays in sync with the Sidebar (shared state) and updates the
  minimap label live.

### 8. Music player — shared listening (`music.jsx`)
- Floating glass widget (addon). Rotating vinyl-style cover, track title/artist,
  a **"<current room> · 一起听"** share line with an animated equalizer, a
  click/drag progress bar with times, prev / play-pause / next, and a mute toggle.
- Framing: one person plays, **everyone in the current room hears it** (the share
  label reflects the current room and updates when you switch rooms).
- **Sound**: a soft **generative WebAudio pad** (no audio files) — created on the
  first play gesture; 4 voices forming a chord through a lowpass filter + a slow
  tremolo LFO, master gain ramped gently in/out (~0.14 target, low volume). Each
  track sets a different root note + chord. In a real app you may instead wire a
  real audio source / streaming SDK; keep the generative pad as a no-asset
  fallback if useful.
- 4 built-in mock tracks with fake durations; progress ticks 1s/sec and
  auto-advances at the end.

### 9. Chat (`chat.jsx`)
- Docked bubble (bottom-left) → opens a glass panel; can go **fullscreen** or stay
  docked. Docked panel is **drag-to-resize** (right / top / corner; persists).
- Contacts + threads: **1:1 (the lover)** and **group chats** (multi-member,
  colored sender names/avatars). Emoji picker (categories ❤️😊🌙🍰) appends to
  input and stays open for multi-pick. The lover thread has special styling.

---

## Interactions & Behavior

- **Navigation**: tapping a HUD widget opens its screen/modal. Modals use a scrim
  (tap to close) and a center pop transition. The Sidebar and Chat are overlays
  that never re-render the scene.
- **Lighting moods** (`[data-mood]` on `.app`): `golden` / `twilight` (default) /
  `night`. Layered overlays (`.mood-tint` soft-light, `.mood-glow` screen,
  `.mood-stars`, `.mood-vignette`) + a mood-aware ambient gradient. Changed via the
  in-scene lighting toggle, the settings control, the tweak, AND by entering a
  room (each room carries a `mood`).
- **Weather** (`[data-wx]` on `.scene-base`): `sun` (warm rays) / `cloud` / `rain`
  (animated streaks) / `snow` (drifting flakes). Driven by **real weather** when the
  weather tweak = 实时(auto): request geolocation → fetch open-meteo current temp +
  WMO code → map to kind/label; on denial/timeout fall back to 多云 22°. Manual
  tweak values force a fixed kind.
- **Live clock**: ticks every 1s.
- **Glass theming** (`[data-glass]` on `.app`): `cloud` / `sky` (default) /
  `twilight` — re-themes all glass tokens so the whole UI recolors.
- **Motion**: entrance/float animations gate on `prefers-reduced-motion`. Floating
  widgets use `floatA/B/C` keyframes; hearts use `beat`; speaking avatars use
  `voicePulse` + `spkbob`; music cover spins; equalizer bars animate.
- **Drag + snap** (edit mode): see HUD section. Snap threshold 8px; guide lines at
  alignment axes; closing toolbox or tapping the banner exits edit.

## State Management
All shared state lives in `<App>` (lift to your store/context as appropriate):
- `profile` — world name, the two nicknames, anniversary date, email, app-lock,
  custom status. **Shared** by Settings and Sidebar (edits sync live).
- `rooms` + `meRoom` (current room) — **shared** by Sidebar and Space switcher;
  entering a room also calls the lighting setter. The minimap label reflects
  `meRoom`.
- `events` (calendar) and `alarms` (clock).
- `widgets` — which addon widgets are on (required ones are forced on).
- `weather` (derived from tweak/geolocation), `nowTs` (live clock).
- Tweaks (`mood`, `hudLayout`, `glassStyle`, `density`, `weather`).
- Local component state: HUD drag positions + edit/guide state; Sidebar voice
  channel / mute / config-open / speaking-preview; Music track index / playing /
  position / muted; Chat threads / size / fullscreen.

### Persistence (localStorage, all `ow-` prefixed)
| Key | What |
|---|---|
| `ow-profile-v1` | Profile (names, world, anniversary, email, lock, status) |
| `ow-rooms-v1` | Room list (name, icon, mood, note) |
| `ow-meroom-v1` | Current room id |
| `ow-widgets-v1` | Which addon widgets are on |
| `ow-wpos-v1` | Custom dragged widget positions |
| `ow-dates-v1` | Calendar events (约会) |
| `ow-alarms-v1` | Clock alarms |
| `ow-music-v1` | Music track index / position / muted (never auto-plays sound on load) |
| `ow-chat-size` | Docked chat W/H |
| `<image-slot state>` | Managed by `image-slot.js` |
| Tweaks | Persisted by the tweaks panel's own mechanism |

---

## Design Tokens
Defined in `Our World.html` `:root`. Always use tokens, not ad-hoc values.

**Palette (Cinnamoroll-inspired, warm-leaning):**
- Sky blues: `--sky-1 #AEDFF2`, `--sky-2 #BFE3F5`, `--sky-3 #D8EFFA`
- Cream base: `--cream #FBFCFE`
- Warm accents: `--butter #FCE7B0`, `--blush #F8D7DF` (the world leans warm —
  peach + butter glows over the blue)
- Moody depth: `--navy-1 #2A3A5E`, `--navy-2 #1E2A47`, `--navy-deep #141D33`

**Glass tokens** (re-themed by `[data-glass]`): `--glass-bg`, `--glass-bg-2`,
`--glass-border`, `--glass-hi`, `--glass-text`, `--glass-sub`, `--glass-glow`,
`--glass-blur`, `--glass-sat`, `--glass-shadow`, `--accent`, `--accent-deep`.
The `.glass` class = frosted translucent panel: `backdrop-filter: blur() saturate()`,
thin light border, soft large shadow, inset top highlight.

**Radii:** `--r-lg 24` · `--r-md 18` · `--r-sm 14` · `--r-pill 999`

**Typography:**
- `Noto Sans SC` — all UI / Chinese text (weights 300/400/500/700/900)
- `Baloo 2` — rounded display for numbers (weights 500/600/700); apply via `.num`,
  with `font-feature-settings:"tnum"` for tabular figures.

**Avatar gradients (consistent across the app):**
- Her (小满, blush): `linear-gradient(135deg,#F8C8D6,#EF9DB4)`
- Me (知夏, butter): `linear-gradient(135deg,#FCD9A0,#F1B45A)`
- Couple avatars get a butter ring; online dot is `#5fcf8e`.

**Motion**: float `6–7.5s ease-in-out infinite`; taps `transform .16–.22s`
cubic-bezier; modal/sidebar transitions `.34–.42s`; snap guide threshold `8px`.

## Assets
- **No external image assets** are required by the design itself. The room is a
  hand-built **inline SVG** (`RoomArt` in `scene.jsx`); all icons are inline SVG
  (`icons.jsx`). Recreate icons with your icon system or port the SVG paths
  (stroke = `currentColor`, ~1.8 stroke width, rounded line caps/joins).
- **User-provided photos** are handled by `<image-slot>` (memory card thumbnail,
  the two profile avatars). In a real app, replace with your image-upload component;
  the slots persist a data URL keyed by slot id.
- **Fonts**: Noto Sans SC + Baloo 2 (Google Fonts in the prototype; self-host or
  use your font pipeline in production).
- **Music**: no audio files — generative WebAudio (see Music section).

## Implementation Notes / Gotchas
- **Chinese-only copy.** Keep the intimate, soft tone.
- **Minimalism**: no filler, no data slop. Keep the room scene the star; the HUD
  stays light, floating, translucent.
- **`backdrop-filter` + animation gotcha (important):** in the prototype's render
  context, animating `transform` **or** `left` on an element that *carries*
  `backdrop-filter` (a `.glass` element) caused its position to freeze. The fixes
  used here: (1) the **Sidebar** keeps the sliding frame and the glass surface as
  **separate elements** (the moving frame has no backdrop-filter) and ultimately
  toggles via `display` for reliability; (2) draggable HUD widgets move a
  **non-glass** `.float` wrapper whose child is the glass card. In a normal bundled
  browser app this quirk usually does not occur, but keep the
  "don't animate position on the backdrop-filter node itself" pattern as a safe
  default.
- Required widgets cannot be toggled off; addons can.
- Generative audio must be created **after a user gesture** (the play button) and
  never auto-played on load.
- Accessibility: respect `prefers-reduced-motion` (the prototype gates all
  decorative animation on it).

## Screenshots
`screenshots/01-overview.png` — the world + floating glass HUD (lighting toggle,
minimap, memory card, anniversary chip, days card, music player, presence dock,
Toolbox FAB). Rendered with the glass shown as a solid frosted fill for legibility.

> The pop-out **glass overlays** (Sidebar, Space switcher, Settings, Calendar,
> Clock, Timeline, Chat) use live `backdrop-filter` and can't be flattened to
> static image files cleanly by the capture tooling — **open `Our World.html` and
> click around to see them**; they are the best reference for those panels.

## Files
Design source files included in this bundle (all in the project root in the
prototype):
- `Our World.html` (shell + tokens + scene/mood/weather CSS)
- `app.jsx`, `scene.jsx`, `hud.jsx`, `screens.jsx`, `calendar.jsx`,
  `settings.jsx`, `sidebar.jsx`, `space.jsx`, `music.jsx`, `chat.jsx`, `icons.jsx`
- `image-slot.js`, `tweaks-panel.jsx`
- `CLAUDE.md` (project guide / design reference — useful background)
