# Our World — Project Specification
> A private journal & post-sharing space for two people, with 3D objects as post carriers.

---

## Overview

A two-user private web app where a couple can write letters, diary entries, and share photos/videos. The key idea: **each post is rendered as a small 3D object** (envelope, diary book, polaroid, retro TV) inside an otherwise normal webpage UI. Posts are organized on a timeline grouped by year and month.

Only two users ever access this app. Authentication is simple email-whitelist via Supabase.

---

## Core Concept

> "The post itself is a 3D object. Everything else is a normal webpage."

- The sidebar, topbar, filters, overlays — standard React/HTML UI
- Each post in the timeline renders its own small `<canvas>` with a Three.js scene
- On hover, the 3D object rotates faster and lifts slightly
- On click, a read overlay opens with the full content
- New posts are added via a compose form; after submission the 3D object appears at the top of the timeline with a brief pulse animation

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| 3D | Three.js (one WebGLRenderer per post canvas) |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Language | TypeScript |
| Deployment | Vercel |

---

## Design System

### Color palette
```css
--bg:          #0e0b18   /* page background, deep dark navy */
--surface:     #16122a   /* sidebar, cards */
--border:      rgba(255, 210, 130, 0.10)
--text:        #e8dcc8   /* primary text, warm off-white */
--muted:       #7a6e5a   /* secondary text */
--accent:      #d4a84b   /* gold — primary accent, CTAs */
--accent-dim:  rgba(212, 168, 75, 0.15)
--me:          #d4a84b   /* author dot color — "me" */
--you:         #8baed4   /* author dot color — "you" */
```

### Typography
- Font family: `Georgia, serif` throughout (gives a journal/letter feel)
- Sizes: 9px labels (letter-spacing: 2–3px), 11–12px body UI, 13–14px content, 18px post titles
- Weight: 400 only — no bold, no heavy weights. Hierarchy via size + color + letter-spacing.

### Spacing
- Sidebar width: 220px fixed
- Topbar height: 50px
- Timeline padding: 0 24px
- Post canvas size: 90×90px display (180×180px actual at 2× DPR)
- Gap between posts in a row: 16px
- Gap between month rows: 24px

### Motion
- Post hover: `translateY(-3px)` + `brightness(1.15)` on the canvas wrapper (CSS transition)
- New post: pulse ring animation (`scale 1→1.6, opacity 0.6→0`) repeating 3 times
- 3D idle rotation: slow `sin`-based wobble, ~0.006 rad/frame
- 3D hover rotation: faster, ~0.025 rad/frame
- All transitions: 150–200ms ease

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  App (flex row, full viewport)                      │
│  ┌──────────┐  ┌───────────────────────────────┐   │
│  │ Sidebar  │  │ Main                          │   │
│  │ 220px    │  │ flex-1                        │   │
│  │          │  │ ┌─────────────────────────┐   │   │
│  │ Site     │  │ │ Topbar  50px            │   │   │
│  │ name     │  │ └─────────────────────────┘   │   │
│  │          │  │ ┌─────────────────────────┐   │   │
│  │ Nav      │  │ │ Timeline (scrollable)   │   │   │
│  │ items    │  │ │                         │   │   │
│  │          │  │ │  2024                ── │   │   │
│  │ Type     │  │ │    January              │   │   │
│  │ filters  │  │ │    [✉][◻][▣]           │   │   │
│  │          │  │ │    February             │   │   │
│  │ Write    │  │ │    [▶][✉]              │   │   │
│  │ button   │  │ │                         │   │   │
│  └──────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Components

### `<Sidebar>`
- Site name: "✦ OUR WORLD" + tagline "just the two of us"
- Nav items: All memories / From me / From you / This month / Favorites
- Type filter tags: All / ✉ 信件 / ▣ 日记 / ◻ 相片 / ▶ 视频
- Write button at bottom: opens `<ComposeOverlay>`

### `<Topbar>`
- Current view title (e.g. "All memories")
- Post count badge
- View toggle (timeline / grid) — grid is a future feature, default is timeline

### `<Timeline>`
- Groups posts by year descending, then by month descending within each year
- Year marker: text + full-width 0.5px rule
- Month label: small caps, muted
- Posts render in a flex-wrap row per month

### `<PostCard>`
Props: `post: Post`

- Renders a `<canvas>` element via `useEffect` + Three.js
- Each PostCard gets its own `WebGLRenderer` instance (alpha: true, antialias: true)
- 2× device pixel ratio, display size 90×90px
- Author dot (top-right corner): 12px circle, color from `post.author`
- Title tooltip on hover (absolutely positioned below canvas)
- Click → open `<ReadOverlay>`
- Hover → increase rotation speed in animation loop

**Cleanup:** On unmount, call `renderer.dispose()` and `geometry.dispose()` / `material.dispose()` for all meshes.

**Performance note:** If there are many posts visible, consider pausing `requestAnimationFrame` for off-screen canvases using `IntersectionObserver`.

### `<ReadOverlay>`
Shown when clicking a post. Contains:
- Post type label (small, letter-spaced)
- Title
- Body (pre-wrap, line-height 2)
- Author dot + name
- Date
- Close button (×) and click-outside to close

### `<ComposeOverlay>`
Form to create a new post:
- Type selector: 4 toggle buttons (letter / diary / photo / video)
- Title input
- Body textarea (4 rows)
- Date input (defaults to today)
- Author input ("我" / "你")
- Submit button: "✦ 投递"
- On submit: insert to Supabase, optimistically add to local state, close overlay, trigger pulse animation on new post

---

## 3D Post Objects

Each post type is a small Three.js mesh group, viewed from a fixed camera angle.

### Scene setup (shared across all post canvases)
```ts
// Lights
AmbientLight(0xffeedd, 1.8)
DirectionalLight(0xfff5e0, 2.2) — position (2, 3, 2)
PointLight(0x4455aa, 0.6, 8)   — position (-2, 1, -2) [cool fill]

// Renderer
WebGLRenderer({ alpha: true, antialias: true })
toneMapping: ACESFilmicToneMapping
toneMappingExposure: 1.05
```

### `letter` — Envelope
Camera: `position(0, 1.6, 1.6)`, lookAt origin

Geometry:
- Box `(1.0, 0.055, 0.72)` — envelope body, color `#fff5e0`
- ShapeGeometry (triangle) — V-flap on top face, slightly lighter
- Cylinder `r=0.075, h=0.04` — wax seal dot, color `#cc3322` with emissive glow

Animation: `rotation.y = sin(t * 0.7) * 0.25`, gentle float on Y

### `diary` — Book
Camera: `position(1.4, 1.2, 1.4)`, lookAt origin

Geometry:
- Box `(0.72, 0.9, 0.065)` — cover, color cycles through `[#3d6e58, #5a3d6e, #6e4040, #3d4e6e]` by `post.id % 4`
- Box `(0.08, 0.9, 0.08)` — spine, 60% brightness of cover color
- Box `(0.64, 0.86, 0.05)` — pages, color `#fdf6e3`
- Box `(0.03, 0.95, 0.005)` — ribbon bookmark, color `#d4a020`

Animation: slow continuous Y rotation

### `photo` — Polaroid
Camera: `position(0, 1.8, 1.4)`, lookAt origin

Geometry:
- Box `(1.0, 1.18, 0.04)` — white frame, color `#fef9f0`
- Plane `(0.84, 0.8)` — photo area, muted tone with slight emissive
- 4× Box corner clips `(0.1, 0.06, 0.1)`

Animation: `rotation.y = sin(t * 0.7) * 0.25`, gentle float

### `video` — Retro TV
Camera: `position(1.2, 1.0, 1.6)`, lookAt origin

Geometry:
- Box `(1.05, 0.82, 0.52)` — body, dark brown `#1c1610`
- Plane `(0.74, 0.6)` — screen face, emissive blue `#1a3050`, intensity 0.8
- 2× Cylinder — side knobs
- PointLight inside — screen glow, flickers randomly

Animation: `rotation.y = sin(t * 0.5) * 0.2`, screen emissive flicker

---

## Data Model (Supabase)

### `posts` table
```sql
create table posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  date        text not null,           -- display date, e.g. "2024.11.20"
  type        text not null,           -- 'letter' | 'diary' | 'photo' | 'video'
  title       text not null,
  body        text not null,
  author      text not null,           -- 'me' | 'you' (resolved per user)
  image_url   text,                    -- optional, for photo type
  video_url   text,                    -- optional, for video type
  user_id     uuid references auth.users(id)
);
```

### Row Level Security
```sql
-- Only the two whitelisted emails can read/write
create policy "whitelisted users only"
on posts for all
using (
  auth.jwt() ->> 'email' in (
    'person1@email.com',
    'person2@email.com'
  )
);
```

### Realtime
Subscribe to `posts` inserts so when one person posts, the other sees it fly in without refresh:
```ts
supabase
  .channel('posts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, 
    (payload) => addPostToTimeline(payload.new))
  .subscribe()
```

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # root → redirects to /world
│   └── world/
│       └── page.tsx          # main app page
├── components/
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── Timeline.tsx
│   ├── PostCard.tsx          # the 3D canvas component
│   ├── ReadOverlay.tsx
│   └── ComposeOverlay.tsx
├── lib/
│   ├── supabase.ts           # client + server supabase instances
│   ├── three/
│   │   ├── buildScene.ts     # shared lights + renderer factory
│   │   ├── meshes.ts         # buildLetter, buildDiary, buildPhoto, buildTV
│   │   └── animate.ts        # per-type animation tick functions
│   └── types.ts              # Post type, Author type
├── hooks/
│   ├── usePosts.ts           # fetch + realtime subscription
│   └── usePostAnimation.ts   # raf loop for a single post canvas
└── styles/
    └── globals.css
```

---

## PostCard Implementation Notes

```tsx
// PostCard.tsx — key pattern
useEffect(() => {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(90, 90, false)

  const { scene, camera, mesh } = buildScene(post.type)
  let frameId: number
  let t = Math.random() * Math.PI * 2

  const tick = () => {
    frameId = requestAnimationFrame(tick)
    t += isHovered ? 0.025 : 0.006
    animateMesh(mesh, post.type, t)
    renderer.render(scene, camera)
  }
  tick()

  return () => {
    cancelAnimationFrame(frameId)
    renderer.dispose()
    // dispose all geometries and materials in scene
  }
}, [post.type])
```

Use `IntersectionObserver` to pause animation when off-screen:
```tsx
// pause tick when not visible — important for long timelines
const observer = new IntersectionObserver(([entry]) => {
  isVisible.current = entry.isIntersecting
})
observer.observe(canvasRef.current)
```

---

## Author Identity

Since there are exactly two users, "author" is determined by comparing `user_id` to the logged-in user:

```ts
// In PostCard or usePosts hook
const { data: { user } } = await supabase.auth.getUser()
const isMe = post.user_id === user?.id
const authorLabel = isMe ? '我' : '你'
const authorColor = isMe ? '#d4a84b' : '#8baed4'
```

---

## Future Features (not in v1)

- **Grid view** — same posts, 4-column masonry instead of timeline rows
- **Favorites** — heart icon on read overlay, stored in a `favorites` table
- **Image upload** — for photo posts, actual image rendered as texture on polaroid mesh
- **Video embed** — for video posts, thumbnail from URL displayed on TV screen texture
- **Search** — full-text search across title + body via Supabase `textsearch`
- **Mobile** — responsive layout, sidebar becomes a bottom sheet

---

## Notes for Claude Code

- Keep Three.js logic fully isolated in `src/lib/three/` — never import Three.js directly in components
- Each `PostCard` manages its own renderer; do NOT share a single renderer across all posts (alpha backgrounds won't composite correctly)
- The `posts` table `date` field is a display string (e.g. `"2024.03.14"`), not a timestamptz — timeline grouping is done client-side by parsing this string
- Tailwind is used for layout only; fine-grained colors and typography come from CSS variables in `globals.css`
- All text is `font-family: Georgia, serif` — do not override with Tailwind's default sans stack
