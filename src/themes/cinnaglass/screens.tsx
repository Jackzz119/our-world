// screens.tsx — centered pop-out modal with tabs: timeline / photos / wishlist.
// Stays mounted (state + scroll persist, scene never re-renders).
// The timeline reads chat-like: oldest at the top, newest at the bottom,
// composer docked at the end of the flow; scrolling near the top pulls older
// pages (cursor pagination in useFeed). The photo wall opens originals in a
// lightbox. Modal shell styles live in cinnaglass.css.
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFeed, type UseFeed } from '@/hooks/useFeed.ts';
import { createPost } from '@/lib/posts.ts';
import { signImageUrls, thumbPathOf, uploadMemoryImage } from '@/lib/storage.ts';
import type { FeedPost, FeedProfile, World } from '@/types/feed.ts';
import type { IcoProps } from './icons';
import { IClock, IClose, IHeart, IPhoto, IPlus, ISparkle } from './icons';

const ScreenStyles = () => (
    <style>{`
  /* tab bar */
  .tabs{display:flex;gap:4px;padding:0 16px 12px;flex:0 0 auto;}
  .tabs button{flex:1;appearance:none;border:0;background:transparent;cursor:pointer;font:inherit;
    font-size:13px;font-weight:600;color:var(--glass-sub);padding:9px 6px;border-radius:13px;
    display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s,color .2s;}
  .tabs button .ic{display:inline-flex;}
  .tabs button.on{background:var(--glass-active);color:var(--glass-text);box-shadow:0 2px 9px -3px rgba(20,29,51,.3);}
  .tabs button:not(.on):hover{color:var(--glass-text);background:var(--glass-hover);}
  .tab-lbl{display:none;}
  @media(min-width:560px){.tab-lbl{display:inline;}}

  /* ── composer — its own row below the scrollport, never overlapping ──
     Bright white writing surface (design ref: composer-redesign.html): words
     should sit on paper, not on hazy glass. */
  .compose{border-radius:18px;padding:10px;margin-top:10px;flex:0 0 auto;
    background:var(--glass-paper);}
  /* collapsed = an input-field look: the whole pill reads as "type here".
     Kept low — idle it's just a doorway, not a billboard. */
  .compose-collapsed{display:flex;align-items:center;gap:10px;cursor:pointer;height:40px;
    padding:0 14px 0 6px;border-radius:var(--r-pill);border:1px solid var(--glass-line);
    background:rgba(255,255,255,.6);transition:border-color .2s,background .2s,box-shadow .2s;}
  .compose-collapsed:hover{border-color:var(--accent);background:#fff;
    box-shadow:0 4px 14px -6px rgba(47,154,211,.45);}
  .compose-collapsed .pchip{width:28px;height:28px;flex:0 0 auto;}
  .compose-collapsed .ph{color:var(--glass-sub);font-size:13.5px;flex:1;min-width:0;}
  .compose-collapsed .go{color:var(--accent-deep);font-size:11.5px;letter-spacing:.05em;
    opacity:0;transition:opacity .2s;white-space:nowrap;}
  .compose-collapsed:hover .go{opacity:.85;}
  /* a saved draft must be visible from the collapsed pill — otherwise
     click-outside-to-collapse reads as "my words vanished" */
  .compose-collapsed.draft{border-color:rgba(124,198,236,.7);}
  .compose-collapsed.draft .ph{color:var(--glass-text);white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis;}
  .draft-chip{flex:0 0 auto;font-size:10.5px;font-weight:700;color:#8a6d3a;letter-spacing:.06em;
    background:linear-gradient(135deg,#fff8ec,var(--butter));border:1px solid rgba(255,255,255,.9);
    border-radius:999px;padding:2.5px 10px;}
  .draft-imgs{flex:0 0 auto;font-size:11px;color:var(--accent-deep);font-weight:600;
    display:inline-flex;align-items:center;gap:4px;}
  /* drag-over: highlight the whole surface, no layout shift (a strip popping
     in mid-drag would flicker dragleave) */
  .compose.dropping{border-color:var(--accent-deep);
    box-shadow:0 0 0 2px rgba(47,154,211,.35),0 12px 30px -14px rgba(20,29,51,.35);}
  .compose-open{display:flex;flex-direction:column;gap:12px;}
  .compose textarea{width:100%;min-height:70px;max-height:220px;overflow-y:auto;resize:none;border:0;
    background:transparent;outline:none;font:inherit;font-size:15px;line-height:1.6;color:var(--glass-text);}
  .compose textarea::placeholder{color:var(--glass-sub);}
  .compose-row{display:flex;align-items:center;gap:12px;}
  /* picker: empty = one wide drop strip (drag affordance spelled out, biggest
     possible target); picked = thumbnail row + add tile, ×-removable.
     The row IS the upload list. */
  .pk-strip{height:96px;border-radius:14px;border:1.5px dashed rgba(47,154,211,.45);
    background:rgba(216,239,250,.35);display:flex;align-items:center;justify-content:center;gap:9px;
    color:var(--glass-sub);font-size:12.5px;cursor:pointer;transition:border-color .2s,background .2s;}
  .pk-strip:hover,.compose.dropping .pk-strip{border-color:var(--accent-deep);background:rgba(216,239,250,.6);}
  .pk-strip u{text-underline-offset:2px;}
  .pk-add{width:64px;height:64px;border-radius:11px;border:1.5px dashed rgba(47,154,211,.5);padding:0;
    cursor:pointer;background:rgba(216,239,250,.35);display:grid;place-items:center;
    color:var(--accent-deep);font-size:22px;font-weight:300;}
  .pk-row{display:flex;gap:9px;flex-wrap:wrap;align-items:center;}
  .pk{position:relative;width:64px;height:64px;border-radius:11px;overflow:hidden;flex:0 0 auto;
    box-shadow:0 6px 14px -6px rgba(20,29,51,.35);}
  .pk img{width:100%;height:100%;object-fit:cover;display:block;}
  .pk .x{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;border:0;padding:0;
    cursor:pointer;background:rgba(20,29,51,.55);color:#fff;display:grid;place-items:center;
    font-size:11px;line-height:1;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
  .pk-cnt{font-size:11px;color:var(--glass-sub);margin-left:2px;}
  .compose-actions{margin-left:auto;display:flex;gap:9px;align-items:center;}
  .btn-ghost{appearance:none;cursor:pointer;font:inherit;font-weight:600;border-radius:var(--r-pill);
    background:var(--glass-bg-2);color:var(--glass-sub);padding:9px 15px;font-size:13px;
    border:1px solid var(--glass-line);transition:color .2s,background .2s;}
  .btn-ghost:hover{color:var(--glass-text);}
  /* publish = the moment-keeping CTA: roomier, glowing, worth pressing */
  .btn-pub{padding:11px 22px;font-size:14px;display:inline-flex;align-items:center;gap:7px;
    box-shadow:0 8px 22px -8px rgba(47,154,211,.65);}
  .btn-pub:hover:not(:disabled){box-shadow:0 12px 26px -8px rgba(47,154,211,.75);}

  /* ── timeline: a co-written diary flow — one centered column, oldest →
     newest (design ref: ai/design_system/cinnaglass/timeline-redesign.html). The spine
     is a barely-there dotted trail, avatars hang on the cards like stickers,
     day chips are washi-style date stickers. Identity rides COLOR (--au-*),
     position only carries top-to-bottom rhythm. The tab hosts its own
     scrollport (.tl-scroll); the composer lives BELOW it as a sibling, so
     list content never slides under it. Gradient masks fade the list out at
     both edges of the visible window. */
  .tl-host{display:flex;flex-direction:column;overflow:hidden;padding:0 20px 16px;}
  .tl-scroll{flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 2px;
    -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 32px,#000 calc(100% - 28px),transparent 100%);
    mask-image:linear-gradient(to bottom,transparent 0,#000 32px,#000 calc(100% - 28px),transparent 100%);}
  .tl-scroll::-webkit-scrollbar{width:0;}
  .tl-scroll[data-dragging]{cursor:grabbing;}
  .tl-scroll[data-dragging] *{user-select:none;}
  .tl-pull{will-change:transform;}
  .tl-more{text-align:center;font-size:11.5px;color:var(--glass-sub);letter-spacing:.06em;padding:8px 0 16px;}
  .tl-end{text-align:center;font-size:11px;color:var(--glass-sub);letter-spacing:.08em;padding:14px 0 2px;
    transition:color .2s;}
  .tl-end.armed{color:var(--accent-deep);font-weight:600;}
  .tl{position:relative;max-width:620px;width:100%;margin:0 auto;padding-left:52px;}
  /* dotted trail: a soft hint that time flows, not a technical spine */
  .tl::before{content:"";position:absolute;left:17px;top:10px;bottom:12px;width:0;
    border-left:2px dotted rgba(124,198,236,.35);}
  /* day chips = washi date stickers, tint and tilt alternate per day */
  .tl-day{position:relative;text-align:center;margin:20px 0 16px;}
  .tl-day span{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.1em;color:#8a6d3a;
    background:linear-gradient(135deg,#fff8ec,var(--butter));border:1px solid rgba(255,255,255,.9);
    padding:5px 16px;border-radius:999px;transform:rotate(-1.2deg);
    box-shadow:0 4px 14px -6px rgba(140,110,60,.35);}
  .tl-day.alt span{background:linear-gradient(135deg,#eef8ff,var(--sky-3));color:#3d6f92;
    transform:rotate(.9deg);box-shadow:0 4px 14px -6px rgba(61,111,146,.3);}
  .tl-item{position:relative;margin-bottom:16px;}
  @keyframes tlIn{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
  @media (prefers-reduced-motion: no-preference){
    .tl-item{animation:tlIn .42s cubic-bezier(.3,.9,.4,1) both;}
  }
  .ava{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:13px;font-weight:700;overflow:hidden;flex:0 0 auto;border:2px solid var(--cream);}
  .ava img{width:100%;height:100%;object-fit:cover;}
  /* avatar hangs on the card like a sticker (slightly bigger than the base) */
  .tl .ava{position:absolute;left:-52px;top:4px;width:36px;height:36px;font-size:14px;}
  /* bright paper surface — hazy glass blue washes out the words (mockup A) */
  .tl-card{border-radius:18px;padding:13px 16px;cursor:pointer;transition:transform .16s;
    background:var(--glass-paper);
    box-shadow:inset 3px 0 0 0 var(--au-ring,transparent);}
  .tl-card:hover{transform:translateY(-2px);}
  .tl-who{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;}
  /* identity rides COLOR (set per item via --au-* custom props), not position */
  .tl-au{font-weight:700;font-size:12px;color:var(--au-deep,var(--glass-sub));}
  .tl-time{font-size:11px;color:var(--glass-sub);letter-spacing:.04em;}
  /* clamp long entries (full text lives in the detail view); overflow-wrap
     keeps unbroken runs (urls, keyboard mash) inside the card */
  .tl-card .tt{font-size:14.5px;font-weight:500;line-height:1.6;color:var(--glass-text);
    text-wrap:pretty;white-space:pre-wrap;overflow-wrap:anywhere;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:6;overflow:hidden;}
  /* photo memory: the picture IS the hero — full-bleed on top, words below */
  .tl-card.has-media{padding:0;overflow:hidden;}
  .tl-card.has-media .tl-media{position:relative;}
  .tl-card.has-media image-slot{display:block;width:100%;height:auto;aspect-ratio:16/10;
    pointer-events:none;}
  .tl-imgn{position:absolute;right:10px;bottom:10px;background:rgba(20,29,51,.55);color:#fff;
    font-size:11px;padding:3px 10px;border-radius:999px;letter-spacing:.04em;
    -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
  .tl-card.has-media .tbody{padding:11px 16px 13px;}

  /* mascots: the theme's cloud pups keep watch over the wide-screen margins.
     Hidden below 1200px (no empty side to fill); never intercept the pointer. */
  .tl-host{position:relative;}
  .tl-scroll{position:relative;z-index:1;}
  .tl-mascot{display:none;position:absolute;bottom:132px;z-index:0;pointer-events:none;}
  .tl-mascot.ml{left:30px;}
  .tl-mascot.mr{right:30px;}
  @keyframes mascotBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @media(min-width:1200px){
    .tl-mascot{display:block;}
  }
  @media (prefers-reduced-motion: no-preference){
    .tl-mascot svg{animation:mascotBob 6s ease-in-out infinite;}
    .tl-mascot.mr svg{animation-duration:7.2s;}
  }

  /* ── widescreen: same single diary column, just roomier ── */
  @media(min-width:1000px){
    .tl-host{padding:0 30px 18px;}
    .tl{max-width:680px;}
    .tl-item{margin-bottom:18px;}
    .tl-day{margin:24px 0 18px;}
    /* comfortable centered writing width */
    .compose{max-width:840px;width:100%;margin-left:auto;margin-right:auto;}
    /* wishlist keeps a readable centered column in the big modal */
    .wl-bar,.wish,.wl-add{max-width:820px;margin-left:auto;margin-right:auto;}
    .pw{columns:4;}
  }

  /* post detail viewer */
  .pd{position:fixed;inset:0;z-index:40;display:grid;place-items:center;cursor:pointer;
    background:rgba(20,29,51,.62);-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);
    animation:lbIn .22s ease;}
  .pd-card{cursor:auto;width:min(560px,92vw);max-height:86vh;overflow-y:auto;border-radius:22px;
    padding:20px 22px;display:flex;flex-direction:column;gap:14px;
    background:var(--glass-paper);}
  .pd-card::-webkit-scrollbar{width:0;}
  .pd-hd{display:flex;align-items:center;gap:11px;}
  .pd-name{font-weight:700;font-size:14px;}
  .pd-date{font-size:11px;color:var(--glass-sub);letter-spacing:.04em;margin-top:2px;}
  .pd-img{border-radius:16px;overflow:hidden;}
  .pd-img img{width:100%;display:block;}
  .pd-load{font-size:11px;color:var(--glass-sub);text-align:center;padding-top:6px;}
  .pd-text{font-size:15px;line-height:1.75;color:var(--glass-text);text-wrap:pretty;white-space:pre-wrap;}

  /* ── photo wall: a collage of polaroids — natural aspect masonry, paper
     frames, washi tape, a stable per-photo tilt that straightens on hover ── */
  .pw-head{font-size:12px;color:var(--glass-sub);margin-bottom:14px;letter-spacing:.03em;}
  .pw-month{font-size:12.5px;color:var(--glass-sub);font-weight:700;letter-spacing:.06em;margin:8px 4px 16px;}
  .pw-month b{color:var(--accent-deep);font-size:14px;margin-right:6px;}
  .pw{columns:2;column-gap:16px;padding-top:8px;}
  @media(min-width:560px){.pw{columns:3;}}
  .pola{break-inside:avoid;position:relative;margin:0 0 20px;background:#fffdf8;border-radius:6px;
    padding:8px 8px 28px;box-shadow:0 10px 24px -10px rgba(20,29,51,.35);cursor:zoom-in;
    transform:rotate(var(--rot,0deg));transition:transform .22s cubic-bezier(.3,.8,.35,1);}
  .pola:hover{transform:rotate(0deg) translateY(-4px) scale(1.02);z-index:2;}
  .pola img{width:100%;display:block;border-radius:3px;}
  .pola figcaption{position:absolute;left:0;right:0;bottom:6px;text-align:center;
    font-size:11px;color:#8b7f6a;letter-spacing:.08em;}
  .pola .tape{position:absolute;top:-8px;left:50%;width:64px;height:18px;border-radius:2px;
    opacity:.85;transform:translateX(-50%) rotate(-3deg);
    background:repeating-linear-gradient(45deg,var(--sky-2) 0 6px,#e4f4fc 6px 12px);}
  .pola:nth-child(2n) .tape{transform:translateX(-50%) rotate(2.5deg);
    background:repeating-linear-gradient(45deg,var(--blush) 0 6px,#fdeef3 6px 12px);}

  /* lightbox: thumbnail first, the signed original swaps in */
  .lb{position:fixed;inset:0;z-index:40;display:grid;place-items:center;cursor:zoom-out;
    background:rgba(20,29,51,.74);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
    animation:lbIn .22s ease;}
  @keyframes lbIn{from{opacity:0}to{opacity:1}}
  .lb img{max-width:min(92vw,1240px);max-height:84vh;border-radius:18px;
    box-shadow:0 30px 80px -20px rgba(10,16,32,.8);}
  .lb-cap{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);white-space:nowrap;
    color:#fff;font-size:12px;letter-spacing:.06em;background:rgba(20,29,51,.55);
    padding:6px 14px;border-radius:999px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}

  /* ── wishlist ── */
  .wl-bar{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
  .wl-prog{flex:1;height:9px;border-radius:99px;background:var(--glass-bg-2);overflow:hidden;
    border:1px solid var(--glass-line);}
  .wl-prog i{display:block;height:100%;border-radius:99px;background:var(--accent-grad);
    transition:width .5s cubic-bezier(.3,.8,.35,1);}
  .wl-count{font-size:12px;color:var(--glass-sub);font-weight:600;white-space:nowrap;}
  .wl-count b{color:var(--accent-deep);}
  .wish{display:flex;align-items:center;gap:12px;border-radius:15px;padding:13px 15px;margin-bottom:10px;
    cursor:pointer;transition:transform .16s,background .2s;}
  .wish:active{transform:scale(.99);}
  .wish .box{width:24px;height:24px;border-radius:9px;border:2px solid rgba(47,154,211,.45);flex:0 0 auto;
    display:grid;place-items:center;color:#fff;transition:background .25s,border-color .25s,transform .25s;}
  .wish.done .box{background:linear-gradient(135deg,#F8C8D6,#EF9DB4);border-color:transparent;transform:scale(1);}
  .wish .wt{font-size:14.5px;font-weight:500;color:var(--glass-text);transition:opacity .25s;}
  .wish.done .wt{opacity:.5;text-decoration:line-through;text-decoration-color:var(--glass-sub);}
  .wl-add{display:flex;gap:10px;margin-top:6px;}
  .wl-add input{flex:1;height:44px;border-radius:var(--r-pill);border:1px solid var(--glass-line);
    background:var(--glass-paper);color:var(--glass-text);padding:0 17px;font:inherit;font-size:14px;outline:none;
    transition:border-color .2s,background .2s;}
  .wl-add input::placeholder{color:var(--glass-sub);}
  .wl-add input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .wl-add button{width:44px;height:44px;flex:0 0 auto;transition:transform .18s;}
  .wl-add button:hover{transform:scale(1.06);}
  .wl-add button:active{transform:scale(.9);}

  .empty-hint{text-align:center;color:var(--glass-sub);font-size:12px;margin-top:16px;letter-spacing:.04em;}
  `}</style>
);

type TabKey = 'timeline' | 'photos' | 'wishlist';
type TabDef = { k: TabKey; title: string; Icon: (p: IcoProps) => ReactNode; c: string };
type Wish = { id: string; text: string; done: boolean };

const TABS: TabDef[] = [
    { k: 'timeline', title: '时间线', Icon: IClock, c: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)' },
    { k: 'photos', title: '照片墙', Icon: IPhoto, c: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)' },
    { k: 'wishlist', title: '心愿单', Icon: ISparkle, c: 'linear-gradient(135deg,#C9E8C2,#86C99A)' }
];

const SEED_WISHES: Wish[] = [
    { id: 'w1', text: '一起去看一次海上日出', done: true },
    { id: 'w2', text: '学会做对方家乡的一道菜', done: true },
    { id: 'w3', text: '看一场流星雨', done: false },
    { id: 'w4', text: '养一盆能活过一年的植物', done: false },
    { id: 'w5', text: '去一次没去过的城市，不做攻略', done: false }
];

function load<T>(k: string, fb: T): T {
    try {
        const v = localStorage.getItem(k);
        return v ? (JSON.parse(v) as T) : fb;
    } catch {
        return fb;
    }
}
function save<T>(k: string, v: T) {
    try {
        localStorage.setItem(k, JSON.stringify(v));
    } catch {
        /* ignore */
    }
}
// Day label for dividers and captions (time-of-day lives in fmtMeta).
const fmtDay = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return '今天';
    const yst = new Date(now);
    yst.setDate(now.getDate() - 1);
    if (d.toDateString() === yst.toDateString()) return '昨天';
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
};
const fmtMeta = (iso: string): string => {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};
const fmtFullDate = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${fmtMeta(iso)}`;
};

// Stable per-author avatar tint: same person, same gradient, any session.
const AVA_GRADS = [
    'linear-gradient(135deg,#BFE6FA,#6FBCE8)',
    'linear-gradient(135deg,#F8C8D6,#EF9DB4)',
    'linear-gradient(135deg,#FBE6A8,#F1C75A)',
    'linear-gradient(135deg,#C9E8C2,#86C99A)',
    'linear-gradient(135deg,#D9CBF2,#B39DE0)'
];
const hashOf = (id: string): number => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
};
const avaGrad = (id: string): string => AVA_GRADS[hashOf(id) % AVA_GRADS.length];

// Identity color system: position carries only rhythm (zigzag), COLOR carries
// identity — the same tone hits the avatar ring, the author name and the card
// edge. Me = theme accent (self first), the world's other member = the pink
// pairing, any future author = a stable hash pick from the theme palette.
type AuthorTone = { ring: string; deep: string };
const MINE_TONE: AuthorTone = { ring: 'var(--accent)', deep: 'var(--accent-deep)' };
const PARTNER_TONE: AuthorTone = { ring: 'rgba(239,157,180,.85)', deep: '#D97A96' };
const GUEST_TONES: AuthorTone[] = [
    { ring: 'rgba(241,199,90,.85)', deep: '#B98A2E' },
    { ring: 'rgba(134,201,154,.85)', deep: '#5FA878' },
    { ring: 'rgba(179,157,224,.85)', deep: '#8E76C8' },
    { ring: 'rgba(111,188,232,.85)', deep: '#2F9AD3' }
];
const toneOf = (authorId: string, currentUserId: string | null, world: World | null): AuthorTone => {
    if (currentUserId && authorId === currentUserId) return MINE_TONE;
    if (world && (authorId === world.owner_id || authorId === world.member_id)) return PARTNER_TONE;
    return GUEST_TONES[hashOf(authorId) % GUEST_TONES.length];
};

// The theme's own cloud pups (original art, not licensed material): blue one
// gazes at the flow from the left, pink one smiles on the right — a quiet
// pair matching the author color language. Decorative only (aria-hidden).
function MascotSvg({ tone, size }: { tone: 'blue' | 'pink'; size: number }) {
    const line = tone === 'blue' ? '#d5e5f2' : '#f0d9e2';
    const inner = tone === 'blue' ? 'var(--sky-3)' : 'var(--blush)';
    const blush = tone === 'blue' ? '#bfe3f5' : '#f6c3d2';
    return (
        <svg width={size} height={size} viewBox="0 0 200 190" fill="none">
            <ellipse cx="30" cy="86" rx="19" ry="46" transform="rotate(16 30 86)" fill="#fff" stroke={line} strokeWidth="2.5" />
            <ellipse cx="30" cy="90" rx="10" ry="32" transform="rotate(16 30 90)" fill={inner} />
            <ellipse cx="170" cy="86" rx="19" ry="46" transform="rotate(-16 170 86)" fill="#fff" stroke={line} strokeWidth="2.5" />
            <ellipse cx="170" cy="90" rx="10" ry="32" transform="rotate(-16 170 90)" fill={inner} />
            <ellipse cx="100" cy="148" rx="42" ry="30" fill="#fff" stroke={line} strokeWidth="2.5" />
            <ellipse cx="76" cy="172" rx="15" ry="9" fill="#fff" stroke={line} strokeWidth="2.5" />
            <ellipse cx="124" cy="172" rx="15" ry="9" fill="#fff" stroke={line} strokeWidth="2.5" />
            <ellipse cx="100" cy="80" rx="60" ry="52" fill="#fff" stroke={line} strokeWidth="2.5" />
            {tone === 'blue' ? (
                <>
                    <circle cx="79" cy="78" r="5.2" fill="#2a3a5e" />
                    <circle cx="81" cy="76" r="1.8" fill="#fff" />
                    <circle cx="121" cy="78" r="5.2" fill="#2a3a5e" />
                    <circle cx="123" cy="76" r="1.8" fill="#fff" />
                    <path d="M158 34 l3.5 8 8 3.5 -8 3.5 -3.5 8 -3.5 -8 -8 -3.5 8 -3.5 Z" fill="#9FD6F4" />
                </>
            ) : (
                <>
                    <path d="M74 76 q5 -6 10 0" stroke="#2a3a5e" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M116 76 q5 -6 10 0" stroke="#2a3a5e" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M42 30 c-3 -6 -12 -4 -12 3 c0 5 7 9 12 12 c5 -3 12 -7 12 -12 c0 -7 -9 -9 -12 -3 Z" fill="#F2B9CB" />
                </>
            )}
            <ellipse cx="63" cy="94" rx="9" ry="5" fill={blush} />
            <ellipse cx="137" cy="94" rx="9" ry="5" fill={blush} />
            <path d="M95 90 Q100 95 105 90" stroke="#2a3a5e" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    );
}

function Avatar({ authorId, profile, ring }: { authorId: string; profile?: FeedProfile; ring: string }) {
    const name = profile?.display_name?.trim() || '';
    return (
        <span className="ava" style={{ background: avaGrad(authorId), boxShadow: `0 0 0 3px ${ring}` }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} /> : name ? [...name][0].toUpperCase() : '·'}
        </span>
    );
}

// Read-only detail view for a single post: full text, author, exact date,
// and the archival original (progressive: thumbnail first, signed original
// swaps in). Esc / click-outside closes.
function PostDetail({
    post,
    profile,
    mine,
    tone,
    thumbUrls,
    onClose
}: {
    post: FeedPost;
    profile?: FeedProfile;
    mine: boolean;
    tone: AuthorTone;
    thumbUrls: Record<string, string>;
    onClose: () => void;
}) {
    // Every image, progressive: the already-signed thumbnail shows instantly,
    // the signed original swaps in per path once ready.
    const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
    const paths = post.visible_images ?? [];

    useEffect(() => {
        let cancelled = false;
        const p = post.visible_images ?? [];
        if (p.length) {
            signImageUrls(p)
                .then((m) => {
                    if (!cancelled) setFullUrls(m);
                })
                .catch(() => {
                    /* keep showing the thumbnails */
                });
        }
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => {
            cancelled = true;
            window.removeEventListener('keydown', onKey);
        };
    }, [post, onClose]);

    return (
        <div className="pd" onClick={onClose}>
            <div className="pd-card paper" onClick={(e) => e.stopPropagation()}>
                <div className="pd-hd">
                    <Avatar authorId={post.author_id} profile={profile} ring={tone.ring} />
                    <div>
                        <div className="pd-name" style={{ color: tone.deep }}>
                            {mine ? '我' : (profile?.display_name ?? 'TA')}
                        </div>
                        <div className="pd-date">{fmtFullDate(post.created_at)}</div>
                    </div>
                </div>
                {paths.map((path) => {
                    const src = fullUrls[path] ?? thumbUrls[thumbPathOf(path)];
                    return src ? (
                        <div className="pd-img" key={path}>
                            <img src={src} alt="" />
                            {!fullUrls[path] && <div className="pd-load">正在加载原图…</div>}
                        </div>
                    ) : null;
                })}
                <div className="pd-text">{post.visible_content}</div>
            </div>
        </div>
    );
}

// Controlled multi-image pick: what the thumbnail row shows is exactly what
// uploads (the old single <image-slot> square was a tiny drop target — a
// second drag could miss it entirely and the stale first pick got published).
type Picked = { file: File; url: string };
const MAX_IMGS = 9;

function Composer({ worldId, onPublished }: { worldId: string | null; onPublished: () => void }) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [picked, setPicked] = useState<Picked[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [over, setOver] = useState(false);
    const taRef = useRef<HTMLTextAreaElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    // Implicit dismissal never destroys content: clicking anywhere outside the
    // composer (or Esc) just collapses it — text and picked images stay as a
    // draft. Only the explicit 取消 button clears.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Grow with the writing (capped, then the textarea scrolls internally).
    const autogrow = () => {
        const el = taRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    };
    useLayoutEffect(() => {
        if (open) autogrow();
    }, [open]);

    const addFiles = (files: Iterable<File>) => {
        const imgs = [...files].filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) return;
        setPicked((prev) => [
            ...prev,
            ...imgs.slice(0, Math.max(0, MAX_IMGS - prev.length)).map((f) => ({ file: f, url: URL.createObjectURL(f) }))
        ]);
    };
    const removeAt = (i: number) =>
        setPicked((prev) => {
            URL.revokeObjectURL(prev[i].url);
            return prev.filter((_, j) => j !== i);
        });
    const clearPicked = () =>
        setPicked((prev) => {
            prev.forEach((p) => URL.revokeObjectURL(p.url));
            return [];
        });

    // The whole open composer is a drop target — no more pixel-hunting.
    const dropProps = {
        onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            setOver(false);
            addFiles(e.dataTransfer.files);
        }
    };

    const publish = async () => {
        const v = text.trim();
        if ((!v && picked.length === 0) || !worldId || busy) return;
        setBusy(true);
        setErr(null);
        try {
            const images: string[] = [];
            for (const p of picked) {
                const { originalPath } = await uploadMemoryImage(worldId, p.file);
                images.push(originalPath);
            }
            await createPost({ worldId, content: v, images });
            setText('');
            setOpen(false);
            clearPicked();
            onPublished();
        } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        const hasDraft = !!text.trim() || picked.length > 0;
        return (
            <div className="compose paper">
                <div className={`compose-collapsed${hasDraft ? ' draft' : ''}`} onClick={() => setOpen(true)}>
                    <span className="chip-accent pchip">
                        <IPlus size={18} />
                    </span>
                    {hasDraft ? (
                        <>
                            <span className="draft-chip">✎ 草稿</span>
                            <span className="ph">{text.trim() ? text.trim().split('\n')[0] : '（还没写文字）'}</span>
                            {picked.length > 0 && (
                                <span className="draft-imgs">
                                    <IPhoto size={13} /> {picked.length} 张
                                </span>
                            )}
                            <span className="go">点击继续 ✎</span>
                        </>
                    ) : (
                        <>
                            <span className="ph">记录此刻的我们…</span>
                            <span className="go">点击书写 ✎</span>
                        </>
                    )}
                </div>
            </div>
        );
    }
    return (
        <div className={`compose paper${over ? ' dropping' : ''}`} ref={rootRef}>
            <div className="compose-open" {...dropProps}>
                <textarea
                    ref={taRef}
                    autoFocus
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        autogrow();
                    }}
                    placeholder="今天发生了什么温柔的事？"
                />
                {picked.length === 0 ? (
                    <div className="pk-strip" onClick={() => fileRef.current?.click()}>
                        <IPhoto size={20} />
                        分享几张此刻的照片 · 拖进来，或 <u>选择文件</u>
                    </div>
                ) : (
                    <div className="pk-row">
                        {picked.map((p, i) => (
                            <span className="pk" key={p.url}>
                                <img src={p.url} alt="" />
                                <button className="x" aria-label="移除这张" onClick={() => removeAt(i)}>
                                    ×
                                </button>
                            </span>
                        ))}
                        {picked.length < MAX_IMGS && (
                            <button className="pk-add" aria-label="继续添加图片" onClick={() => fileRef.current?.click()}>
                                ＋
                            </button>
                        )}
                        <span className="pk-cnt">
                            {picked.length} / {MAX_IMGS}
                        </span>
                    </div>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = '';
                    }}
                />
                <div className="compose-row">
                    <div className="compose-actions">
                        <button
                            className="btn-ghost"
                            disabled={busy}
                            onClick={() => {
                                setOpen(false);
                                setText('');
                                setErr(null);
                                clearPicked();
                            }}
                        >
                            取消
                        </button>
                        <button
                            className="btn-primary btn-pub"
                            onClick={publish}
                            disabled={(!text.trim() && picked.length === 0) || !worldId || busy}
                        >
                            {busy ? (
                                '正在收进小世界…'
                            ) : (
                                <>
                                    <ISparkle size={15} /> 记下这一刻
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {err && <div className="empty-hint">发布失败：{err}</div>}
            </div>
        </div>
    );
}

// Sign the thumbnails for a set of feed posts, shared by the timeline and
// photo wall (private bucket → short-lived signed URLs). Signed URLs expire
// after 1h (storage.ts SIGNED_URL_TTL), so an idle page would silently lose
// its images — re-sign on an interval safely inside the TTL, and again when
// the tab regains visibility (a backgrounded tab may have throttled timers).
const SIGN_REFRESH_MS = 40 * 60 * 1000;
function useSignedThumbs(posts: FeedPost[]): Record<string, string> {
    const [urls, setUrls] = useState<Record<string, string>>({});
    useEffect(() => {
        let cancelled = false;
        const sign = () => {
            // signImageUrls([]) resolves to {} — covers the no-image case too.
            const thumbs = posts.flatMap((p) => (p.visible_images ?? []).map(thumbPathOf));
            signImageUrls(thumbs)
                .then((m) => {
                    if (!cancelled) setUrls(m);
                })
                .catch(() => {
                    /* keep the previous (possibly stale) URLs on failure */
                });
        };
        sign();
        const timer = window.setInterval(sign, SIGN_REFRESH_MS);
        const onVisible = () => {
            if (document.visibilityState === 'visible') sign();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [posts]);
    return urls;
}

type ScrollAnchor = { mode: 'none' | 'prepend' | 'bottom' | 'bottom-smooth'; h: number };
type PullState = 'idle' | 'pull' | 'armed';

const PULL_MAX = 96; // rubber-band travel cap (px)
const PULL_ARM = 52; // release past this refreshes

function TimelineBody({ feed, thumbUrls }: { feed: UseFeed; thumbUrls: Record<string, string> }) {
    const { status, posts, error, world, worldId, reload, currentUserId, profiles, hasMore, loadingOlder, loadOlder } = feed;
    // The timeline owns its scrollport; the composer is a sibling below it.
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const [detail, setDetail] = useState<FeedPost | null>(null);
    const closeDetail = useCallback(() => setDetail(null), []);
    const anchor = useRef<ScrollAnchor>({ mode: 'bottom', h: 0 });
    // While a publish-glide is in flight, passing the top must not trigger the
    // history loader (a prepend would cancel the smooth scroll mid-animation).
    const glideUntil = useRef(0);
    // Rubber-band pull past the bottom (drag up) refreshes the latest page.
    const pullRef = useRef<HTMLDivElement | null>(null);
    const [pullState, setPullState] = useState<PullState>('idle');
    // true while the current reload came from a pull-release (caption copy)
    const [pullRefreshing, setPullRefreshing] = useState(false);

    // Keep the viewport pinned through list mutations: first fill → jump to
    // the newest (bottom), older page prepended → preserve the reading
    // position, own publish → glide down to meet the new post.
    const applyAnchor = () => {
        const el = bodyRef.current;
        if (!el || !posts.length) return;
        const a = anchor.current;
        if (a.mode === 'none') return;
        anchor.current = { mode: 'none', h: 0 };
        if (a.mode === 'prepend') el.scrollTop += el.scrollHeight - a.h;
        else if (a.mode === 'bottom') el.scrollTop = el.scrollHeight;
        else {
            glideUntil.current = Date.now() + 1000;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            // Settle correction: async layout (signed thumbnails) can outgrow
            // the animation's captured target, leaving the glide just short.
            window.setTimeout(() => {
                if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
            }, 900);
        }
    };
    // Layout pass covers in-place list changes; on a tab remount the scrollport
    // ref attaches after child layout effects (parent host ref), so the passive
    // pass picks the anchor up then.
    useLayoutEffect(applyAnchor, [posts, bodyRef]);
    useEffect(applyAnchor, [posts, bodyRef]);

    // Scrolling near the top pulls the previous page (infinite history).
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const onScroll = () => {
            if (Date.now() < glideUntil.current) return;
            if (el.scrollTop < 80 && hasMore && !loadingOlder) {
                anchor.current = { mode: 'prepend', h: el.scrollHeight };
                loadOlder();
            }
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [bodyRef, hasMore, loadingOlder, loadOlder]);

    // Drag-to-scroll (mouse, with release momentum) + bottom rubber-band
    // refresh (mouse and touch). Touch keeps NATIVE panning — the browser's
    // own finger-scroll already has inertia, so we never reimplement it; we
    // only take over the gesture the browser ignores: pulling up past the
    // bottom. Mouse-drag scrolling doesn't exist natively, so both the drag
    // and its momentum are driven here. A drag that actually moved swallows
    // the trailing click so cards/composer don't activate.
    useEffect(() => {
        const el = bodyRef.current;
        const band = pullRef.current;
        if (!el || !band) return;
        let mode: 'none' | 'mouse' | 'touch' = 'none';
        let startY = 0;
        let startTop = 0;
        let over = 0;
        let moved = false;
        let vel = 0; // scroll velocity in px/ms (positive = scrolling down)
        let lastY = 0;
        let lastT = 0;
        let raf = 0;

        const maxTop = () => el.scrollHeight - el.clientHeight;
        const stopMomentum = () => {
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        };
        const startMomentum = (v0: number) => {
            let v = Math.max(-3, Math.min(3, v0));
            let last = performance.now();
            const step = (t: number) => {
                const dt = t - last;
                last = t;
                el.scrollTop += v * dt;
                v *= Math.pow(0.994, dt); // exponential friction
                if (Math.abs(v) < 0.02 || el.scrollTop <= 0 || el.scrollTop >= maxTop()) {
                    raf = 0;
                    return;
                }
                raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        };

        const setOver = (px: number) => {
            over = px;
            band.style.transform = px ? `translateY(${-px}px)` : '';
            setPullState(px >= PULL_ARM ? 'armed' : px > 0 ? 'pull' : 'idle');
        };
        const finish = () => {
            if (mode === 'none') return;
            const wasMouse = mode === 'mouse';
            const refresh = over >= PULL_ARM;
            mode = 'none';
            el.removeAttribute('data-dragging');
            band.style.transition = 'transform .3s cubic-bezier(.3,.9,.4,1)';
            setOver(0);
            window.setTimeout(() => {
                band.style.transition = '';
            }, 320);
            if (refresh) {
                setPullRefreshing(true);
                anchor.current = { mode: 'bottom', h: 0 };
                reload();
            } else if (wasMouse && moved && Math.abs(vel) > 0.15) {
                startMomentum(vel);
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            stopMomentum();
            if ((e.target as HTMLElement).closest('textarea, input, button, image-slot, a, .lb, .pd')) return;
            mode = 'mouse';
            moved = false;
            vel = 0;
            startY = lastY = e.clientY;
            startTop = el.scrollTop;
            lastT = performance.now();
        };
        const onPointerMove = (e: PointerEvent) => {
            if (mode !== 'mouse') return;
            const dy = e.clientY - startY;
            if (!moved && Math.abs(dy) < 5) return;
            if (!moved) {
                moved = true;
                el.setAttribute('data-dragging', '');
            }
            const now = performance.now();
            const dt = now - lastT;
            if (dt > 0) {
                // smoothed sample velocity; content moves opposite the cursor
                vel = 0.7 * ((lastY - e.clientY) / dt) + 0.3 * vel;
                lastY = e.clientY;
                lastT = now;
            }
            const target = startTop - dy;
            el.scrollTop = Math.min(Math.max(target, 0), maxTop());
            setOver(target > maxTop() ? Math.min(PULL_MAX, (target - maxTop()) * 0.5) : 0);
        };
        const onPointerUp = () => {
            if (mode === 'mouse') finish();
        };
        const onClickCapture = (e: MouseEvent) => {
            if (moved) {
                e.stopPropagation();
                e.preventDefault();
                moved = false;
            }
        };
        const onWheel = () => stopMomentum();

        const onTouchStart = (e: TouchEvent) => {
            stopMomentum();
            if (e.touches.length === 1) {
                mode = 'touch';
                startY = e.touches[0].clientY;
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (mode !== 'touch') return;
            const dy = e.touches[0].clientY - startY;
            if (dy < 0 && el.scrollTop >= maxTop() - 1) {
                e.preventDefault(); // keep the page/scroll chain out of the band
                setOver(Math.min(PULL_MAX, -dy * 0.5));
            } else if (over) {
                setOver(0);
            }
        };
        const onTouchEnd = () => {
            if (mode === 'touch') finish();
        };

        el.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        el.addEventListener('click', onClickCapture, true);
        el.addEventListener('wheel', onWheel, { passive: true });
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        return () => {
            stopMomentum();
            el.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('click', onClickCapture, true);
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [bodyRef, reload]);

    if (status === 'error')
        return (
            <div className="empty-hint">
                加载失败：{error} ·{' '}
                <button className="btn-ghost" onClick={reload}>
                    重试
                </button>
            </div>
        );
    // Stale-while-revalidate: during reload (e.g. right after publishing) the
    // existing list stays put instead of flashing a spinner.
    if (status === 'loading' && posts.length === 0) return <div className="empty-hint">正在加载你们的回忆…</div>;

    const publishAndFollow = () => {
        setPullRefreshing(false);
        anchor.current = { mode: 'bottom-smooth', h: 0 };
        reload();
    };

    const items: ReactNode[] = [];
    let lastDay = '';
    let dayIdx = 0;
    for (const p of posts) {
        const day = fmtDay(p.created_at);
        if (day !== lastDay) {
            lastDay = day;
            // date sticker: tint/tilt alternate per day, a tiny motif leads it
            const motif = day === '今天' ? '⭐' : day === '昨天' ? '☁️' : '🌸';
            items.push(
                <div className={`tl-day${dayIdx++ % 2 ? ' alt' : ''}`} key={`day-${p.post_id}`}>
                    <span>
                        {motif} {day}
                    </span>
                </div>
            );
        }
        const paths = p.visible_images ?? [];
        const src = paths[0] ? thumbUrls[thumbPathOf(paths[0])] : undefined;
        const mine = !!currentUserId && p.author_id === currentUserId;
        const author = mine ? '我' : (profiles[p.author_id]?.display_name ?? 'TA');
        const tone = toneOf(p.author_id, currentUserId, world);
        items.push(
            <div
                className="tl-item"
                key={p.post_id}
                style={{ '--au-ring': tone.ring, '--au-deep': tone.deep } as React.CSSProperties}
            >
                <Avatar authorId={p.author_id} profile={profiles[p.author_id]} ring={tone.ring} />
                <div className={`tl-card paper${src ? ' has-media' : ''}`} onClick={() => setDetail(p)}>
                    {src && (
                        <div className="tl-media">
                            <image-slot src={src} shape="rect" placeholder=""></image-slot>
                            {paths.length > 1 && <span className="tl-imgn">＋{paths.length - 1} 张</span>}
                        </div>
                    )}
                    <div className="tbody">
                        <div className="tl-who">
                            <b className="tl-au">{author}</b>
                            <span className="tl-time">{fmtMeta(p.created_at)}</span>
                        </div>
                        {p.visible_content && <div className="tt">{p.visible_content}</div>}
                    </div>
                </div>
            </div>
        );
    }

    const endText =
        status === 'loading' && pullRefreshing
            ? '正在拉取最新的回忆…'
            : pullState === 'armed'
              ? '松开，刷新最新回忆'
              : pullState === 'pull'
                ? '继续上拉，刷新最新回忆'
                : '已经看到最新的回忆了 ·';

    return (
        <>
            <span className="tl-mascot ml" aria-hidden="true">
                <MascotSvg tone="blue" size={150} />
            </span>
            <span className="tl-mascot mr" aria-hidden="true">
                <MascotSvg tone="pink" size={138} />
            </span>
            <div className="tl-scroll" ref={bodyRef}>
                {posts.length > 0 &&
                    (hasMore ? (
                        <div className="tl-more">{loadingOlder ? '正在翻开更早的回忆…' : '往上滚动 · 翻看更早的回忆'}</div>
                    ) : (
                        <div className="tl-more">你们的故事从这里开始 ·</div>
                    ))}
                <div className="tl-pull" ref={pullRef}>
                    <div className="tl">
                        {posts.length === 0 && <div className="empty-hint">还没有回忆 · 在下面记录第一条吧</div>}
                        {items}
                    </div>
                    {posts.length > 0 && <div className={pullState === 'armed' ? 'tl-end armed' : 'tl-end'}>{endText}</div>}
                </div>
            </div>
            <Composer worldId={worldId} onPublished={publishAndFollow} />
            {detail && (
                <PostDetail
                    post={detail}
                    profile={profiles[detail.author_id]}
                    mine={!!currentUserId && detail.author_id === currentUserId}
                    tone={toneOf(detail.author_id, currentUserId, world)}
                    thumbUrls={thumbUrls}
                    onClose={closeDetail}
                />
            )}
        </>
    );
}

type LightboxPhoto = { path: string; thumb?: string; date: string };

function PhotosBody({ posts, thumbUrls }: { posts: FeedPost[]; thumbUrls: Record<string, string> }) {
    const [view, setView] = useState<LightboxPhoto | null>(null);
    const [fullUrl, setFullUrl] = useState<string | null>(null);
    // fullUrl resets in the open/close handlers (not the effect) so the effect
    // only talks to external systems: signing + the Esc listener.
    const openView = (p: LightboxPhoto) => {
        setFullUrl(null);
        setView(p);
    };
    const closeView = () => {
        setFullUrl(null);
        setView(null);
    };

    // Progressive lightbox: show the (already-signed) thumbnail immediately,
    // sign the original on demand and swap it in when ready. Esc closes.
    useEffect(() => {
        if (!view) return;
        let cancelled = false;
        signImageUrls([view.path])
            .then((m) => {
                if (!cancelled) setFullUrl(m[view.path] ?? null);
            })
            .catch(() => {
                /* keep showing the thumbnail */
            });
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeView();
        window.addEventListener('keydown', onKey);
        return () => {
            cancelled = true;
            window.removeEventListener('keydown', onKey);
        };
    }, [view]);

    // Flatten every post's images into polaroids, keeping only ones whose
    // thumbnail is already signed. Newest moments first, grouped by month.
    const now = new Date();
    const photos = [...posts]
        .reverse()
        .flatMap((p) =>
            (p.visible_images ?? []).map((path) => {
                const d = new Date(p.created_at);
                const day = fmtDay(p.created_at);
                const md = `${d.getMonth() + 1}.${d.getDate()}`;
                return {
                    key: `${p.post_id}:${path}`,
                    path,
                    src: thumbUrls[thumbPathOf(path)],
                    date: day,
                    // pencil note on the paper rim: "7.5 · 今天" for fresh ones
                    cap: day === '今天' || day === '昨天' ? `${md} · ${day}` : md,
                    month: `${d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()} 年 `}${d.getMonth() + 1} 月`,
                    // stable per-photo tilt (straightened on hover)
                    rot: ((hashOf(`${p.post_id}:${path}`) % 5) - 2) * 1.2
                };
            })
        )
        .filter((ph) => !!ph.src);
    const months: { label: string; items: typeof photos }[] = [];
    for (const ph of photos) {
        const g = months[months.length - 1];
        if (g && g.label === ph.month) g.items.push(ph);
        else months.push({ label: ph.month, items: [ph] });
    }
    return (
        <div>
            <div className="pw-head">来自时间线的 {photos.length} 个瞬间</div>
            {months.map((g) => (
                <div key={g.label}>
                    <div className="pw-month">
                        <b>{g.label}</b>
                        {g.items.length} 个瞬间
                    </div>
                    <div className="pw">
                        {g.items.map((ph) => (
                            <figure
                                className="pola"
                                key={ph.key}
                                style={{ '--rot': `${ph.rot}deg` } as React.CSSProperties}
                                onClick={() => openView({ path: ph.path, thumb: ph.src, date: ph.date })}
                            >
                                <i className="tape"></i>
                                <img src={ph.src} alt="" loading="lazy" />
                                <figcaption>{ph.cap}</figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            ))}
            {photos.length === 0 && (
                <div className="empty-hint">
                    {posts.some((p) => (p.visible_images ?? []).length > 0)
                        ? '正在加载照片…' // images exist, their signed URLs are still in flight
                        : '还没有照片 · 发一条带图的回忆吧'}
                </div>
            )}
            {view && (
                <div className="lb" onClick={closeView}>
                    <img src={fullUrl ?? view.thumb} alt="" />
                    <div className="lb-cap">
                        {view.date}
                        {!fullUrl && ' · 正在加载原图…'}
                    </div>
                </div>
            )}
        </div>
    );
}

function WishlistBody({
    wishes,
    setWishes
}: {
    wishes: Wish[];
    setWishes: React.Dispatch<React.SetStateAction<Wish[]>>;
}) {
    const [val, setVal] = useState('');
    const done = wishes.filter((w) => w.done).length;
    const pct = wishes.length ? Math.round((done / wishes.length) * 100) : 0;
    const toggle = (id: string) => setWishes((ws) => ws.map((w) => (w.id === id ? { ...w, done: !w.done } : w)));
    const add = () => {
        const v = val.trim();
        if (!v) return;
        setWishes((ws) => [...ws, { id: 'w' + Date.now(), text: v, done: false }]);
        setVal('');
    };
    return (
        <div>
            <div className="wl-bar">
                <div className="wl-prog">
                    <i style={{ width: pct + '%' }} />
                </div>
                <div className="wl-count">
                    已实现 <b>{done}</b>/{wishes.length}
                </div>
            </div>
            {wishes.map((w) => (
                <div className={`wish paper ${w.done ? 'done' : ''}`} key={w.id} onClick={() => toggle(w.id)}>
                    <span className="box">{w.done && <IHeart size={13} fill="currentColor" sw={0} />}</span>
                    <span className="wt">{w.text}</span>
                </div>
            ))}
            <div className="wl-add">
                <input
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && add()}
                    placeholder="再许一个一起完成的愿望…"
                />
                <button className="chip-accent" onClick={add} aria-label="添加">
                    <IPlus size={20} />
                </button>
            </div>
            <div className="empty-hint">慢慢来，我们有的是时间 ·</div>
        </div>
    );
}

export function SubScreen({ screen, onClose }: { screen: TabKey | null; onClose: () => void }) {
    const show = !!screen;
    const [tab, setTab] = useState<TabKey>('timeline');
    const [wishes, setWishes] = useState<Wish[]>(() => load('ow-wishes-v1', SEED_WISHES));
    // lazy: the feed fetch fires on first open, not at page load (the modal
    // stays mounted while hidden for its fade animation)
    const feed = useFeed(show);
    // Sign thumbnails once; timeline and photo wall share the map.
    const thumbUrls = useSignedThumbs(feed.posts);

    useEffect(() => {
        // Sync the open tab to the parent-driven `screen` when the modal opens.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- render-time sync would double-render the heavy modal
        if (screen) setTab(screen);
    }, [screen]);
    useEffect(() => save('ow-wishes-v1', wishes), [wishes]);

    const cfg = TABS.find((t) => t.k === tab) || TABS[0];

    return (
        <>
            <ScreenStyles />
            <div className={`modal-scrim ${show ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal glass tall ${show ? 'show' : ''}`} aria-hidden={!show}>
                <div className="modal-hd">
                    <span className="si" style={{ background: cfg.c }}>
                        <cfg.Icon size={19} />
                    </span>
                    <h2>{cfg.title}</h2>
                    <button className="modal-x" onClick={onClose} aria-label="关闭">
                        <IClose size={17} />
                    </button>
                </div>
                <div className="tabs">
                    {TABS.map((t) => (
                        <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
                            <span className="ic">
                                <t.Icon size={16} />
                            </span>
                            <span className="tab-lbl">{t.title}</span>
                        </button>
                    ))}
                </div>
                <div className={tab === 'timeline' ? 'modal-body tl-host' : 'modal-body'} key={tab}>
                    {tab === 'timeline' && <TimelineBody feed={feed} thumbUrls={thumbUrls} />}
                    {tab === 'photos' && <PhotosBody posts={feed.posts} thumbUrls={thumbUrls} />}
                    {tab === 'wishlist' && <WishlistBody wishes={wishes} setWishes={setWishes} />}
                </div>
            </div>
        </>
    );
}

export type { TabKey };
