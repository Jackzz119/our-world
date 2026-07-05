// screens.tsx — centered pop-out modal with tabs: timeline / photos / notes / wishlist.
// Stays mounted (state + scroll persist, scene never re-renders). Posts are shared
// between the timeline and the photo wall via reused image-slot ids.
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useFeed, type UseFeed } from '@/hooks/useFeed.ts';
import { createPost } from '@/lib/posts.ts';
import { signImageUrls, thumbPathOf, uploadMemoryImage } from '@/lib/storage.ts';
import type { FeedPost } from '@/types/feed.ts';
import type { IcoProps } from './icons';
import { IClock, IClose, IHeart, INote, IPhoto, IPlus, ISparkle } from './icons';

const ScreenStyles = () => (
    <style>{`
  .modal-scrim{position:absolute;inset:0;z-index:20;background:rgba(20,29,51,.40);
    -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
    opacity:0;pointer-events:none;transition:opacity .34s ease;}
  .modal-scrim.show{opacity:1;pointer-events:auto;}

  .modal{position:absolute;left:50%;top:50%;z-index:21;
    width:min(760px,calc(100vw - 32px));
    height:min(720px,calc(100vh - 56px));
    border-radius:26px;display:flex;flex-direction:column;overflow:hidden;
    transform:translate(-50%,-50%) scale(.9);opacity:0;pointer-events:none;
    transform-origin:center center;
    transition:opacity .26s ease, transform .4s cubic-bezier(.34,1.32,.5,1);}
  .modal.show{transform:translate(-50%,-50%) scale(1);opacity:1;pointer-events:auto;}

  .modal-hd{display:flex;align-items:center;gap:12px;padding:16px 16px 14px 20px;flex:0 0 auto;}
  .modal-hd .si{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;color:#fff;flex:0 0 auto;
    box-shadow:0 5px 13px -4px rgba(40,90,140,.5);transition:background .3s;}
  .modal-hd h2{margin:0;font-size:19px;font-weight:700;letter-spacing:.01em;flex:1;}
  .modal-x{appearance:none;border:1px solid var(--glass-border);background:var(--glass-bg-2);color:var(--glass-text);
    width:34px;height:34px;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:background .2s,transform .2s;}
  .modal-x:hover{background:var(--glass-hi);}
  .modal-x:active{transform:scale(.9);}

  /* tab bar */
  .tabs{display:flex;gap:4px;padding:0 16px 12px;flex:0 0 auto;}
  .tabs button{flex:1;appearance:none;border:0;background:transparent;cursor:pointer;font:inherit;
    font-size:13px;font-weight:600;color:var(--glass-sub);padding:9px 6px;border-radius:13px;
    display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s,color .2s;}
  .tabs button .ic{display:inline-flex;}
  .tabs button.on{background:var(--glass-hi);color:var(--glass-text);box-shadow:0 2px 9px -3px rgba(20,29,51,.3);}
  .tabs button:not(.on):hover{color:var(--glass-text);background:var(--glass-bg-2);}
  .tab-lbl{display:none;}
  @media(min-width:560px){.tab-lbl{display:inline;}}

  .modal-body{flex:1;overflow-y:auto;padding:4px 20px 24px;-webkit-overflow-scrolling:touch;}
  .modal-body::-webkit-scrollbar{width:0;}

  /* ── composer ── */
  .compose{border-radius:18px;padding:14px;margin-bottom:20px;}
  .compose-collapsed{display:flex;align-items:center;gap:11px;cursor:pointer;}
  .compose-collapsed .pchip{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;
    background:radial-gradient(120% 120% at 30% 25%,#BFE6FA,#7CC6EC 46%,#4FA9DC);flex:0 0 auto;
    box-shadow:0 4px 11px -4px rgba(79,169,220,.6);}
  .compose-collapsed .ph{color:var(--glass-sub);font-size:14px;}
  .compose-open{display:flex;flex-direction:column;gap:12px;}
  .compose textarea{width:100%;min-height:70px;resize:none;border:0;background:transparent;outline:none;
    font:inherit;font-size:15px;line-height:1.6;color:var(--glass-text);}
  .compose textarea::placeholder{color:var(--glass-sub);}
  .compose-row{display:flex;align-items:center;gap:12px;}
  .compose-photo{width:62px;height:62px;border-radius:14px;overflow:hidden;flex:0 0 auto;}
  .compose-photo image-slot{width:100%;height:100%;}
  .compose-actions{margin-left:auto;display:flex;gap:9px;align-items:center;}
  .btn-ghost,.btn-pub{appearance:none;border:0;cursor:pointer;font:inherit;font-weight:600;border-radius:var(--r-pill);
    transition:transform .18s,filter .2s,background .2s;}
  .btn-ghost{background:var(--glass-bg-2);color:var(--glass-sub);padding:9px 15px;font-size:13px;
    border:1px solid var(--glass-border);}
  .btn-ghost:hover{color:var(--glass-text);}
  .btn-pub{color:#0d2336;padding:10px 19px;font-size:13.5px;
    background:linear-gradient(135deg,#9FD6F4,#5FB0E2);box-shadow:0 5px 14px -5px rgba(79,169,220,.6);}
  .btn-pub:hover{transform:translateY(-1px);filter:brightness(1.04);}
  .btn-pub:active{transform:scale(.96);}
  .btn-pub:disabled{opacity:.45;cursor:default;transform:none;filter:none;}

  /* ── timeline ── */
  .tl{position:relative;padding-left:26px;}
  .tl::before{content:"";position:absolute;left:6px;top:8px;bottom:14px;width:2px;
    background:linear-gradient(var(--accent),transparent);border-radius:2px;}
  .tl-item{position:relative;margin-bottom:16px;}
  @keyframes tlIn{from{transform:translateY(8px)}to{transform:none}}
  @media (prefers-reduced-motion: no-preference){
    .tl-item{animation:tlIn .42s cubic-bezier(.3,.9,.4,1) both;}
  }
  .tl-dot{position:absolute;left:-26px;top:6px;width:13px;height:13px;border-radius:50%;
    background:var(--cream);border:3px solid var(--accent-deep);box-shadow:0 0 0 4px var(--glass-glow);}
  .tl-date{font-size:11px;letter-spacing:.1em;color:var(--glass-sub);font-weight:600;margin-bottom:6px;}
  .tl-card{border-radius:16px;padding:13px 15px;display:flex;gap:13px;align-items:flex-start;}
  .tl-card image-slot{width:64px;height:64px;border-radius:13px;overflow:hidden;flex:0 0 auto;}
  .tl-card .tbody{flex:1;min-width:0;}
  .tl-card .tt{font-size:14.5px;font-weight:500;line-height:1.55;color:var(--glass-text);text-wrap:pretty;}
  .tl-card .ts{font-size:11px;color:var(--glass-sub);margin-top:6px;letter-spacing:.04em;}

  /* ── photo wall ── */
  .pw-head{font-size:12px;color:var(--glass-sub);margin-bottom:14px;letter-spacing:.03em;}
  .pw{columns:2;column-gap:11px;}
  @media(min-width:560px){.pw{columns:3;}}
  .pw figure{margin:0 0 11px;break-inside:avoid;position:relative;border-radius:16px;overflow:hidden;
    box-shadow:0 6px 16px -8px rgba(20,29,51,.4);}
  .pw figure image-slot{width:100%;display:block;}
  .pw figcaption{position:absolute;left:0;right:0;bottom:0;padding:16px 11px 8px;font-size:10.5px;
    color:#fff;letter-spacing:.05em;font-weight:600;
    background:linear-gradient(to top,rgba(20,29,51,.6),transparent);pointer-events:none;}

  /* ── notes ── */
  .note{border-radius:16px;padding:15px 17px;margin-bottom:13px;}
  .note .nt{font-size:14.5px;line-height:1.7;text-wrap:pretty;}
  .note .nm{display:flex;justify-content:space-between;margin-top:12px;font-size:11.5px;color:var(--glass-sub);}
  .note .nm b{font-weight:700;color:var(--accent-deep);}

  /* ── wishlist ── */
  .wl-bar{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
  .wl-prog{flex:1;height:9px;border-radius:99px;background:var(--glass-bg-2);overflow:hidden;
    border:1px solid var(--glass-border);}
  .wl-prog i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#9FD6F4,#5FB0E2);
    transition:width .5s cubic-bezier(.3,.8,.35,1);}
  .wl-count{font-size:12px;color:var(--glass-sub);font-weight:600;white-space:nowrap;}
  .wl-count b{color:var(--accent-deep);}
  .wish{display:flex;align-items:center;gap:12px;border-radius:15px;padding:13px 15px;margin-bottom:10px;
    cursor:pointer;transition:transform .16s,background .2s;}
  .wish:active{transform:scale(.99);}
  .wish .box{width:24px;height:24px;border-radius:9px;border:2px solid var(--glass-border);flex:0 0 auto;
    display:grid;place-items:center;color:#fff;transition:background .25s,border-color .25s,transform .25s;}
  .wish.done .box{background:linear-gradient(135deg,#F8C8D6,#EF9DB4);border-color:transparent;transform:scale(1);}
  .wish .wt{font-size:14.5px;font-weight:500;color:var(--glass-text);transition:opacity .25s;}
  .wish.done .wt{opacity:.5;text-decoration:line-through;text-decoration-color:var(--glass-sub);}
  .wl-add{display:flex;gap:10px;margin-top:6px;}
  .wl-add input{flex:1;height:44px;border-radius:var(--r-pill);border:1px solid var(--glass-border);
    background:var(--glass-bg-2);color:var(--glass-text);padding:0 17px;font:inherit;font-size:14px;outline:none;
    transition:border-color .2s,background .2s;}
  .wl-add input::placeholder{color:var(--glass-sub);}
  .wl-add input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .wl-add button{width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;color:#fff;
    background:radial-gradient(120% 120% at 30% 25%,#BFE6FA,#7CC6EC 46%,#4FA9DC);flex:0 0 auto;
    box-shadow:0 5px 14px -5px rgba(79,169,220,.6);transition:transform .18s;}
  .wl-add button:hover{transform:scale(1.06);}
  .wl-add button:active{transform:scale(.9);}

  .empty-hint{text-align:center;color:var(--glass-sub);font-size:12px;margin-top:16px;letter-spacing:.04em;}
  `}</style>
);

type TabKey = 'timeline' | 'photos' | 'notes' | 'wishlist';
type TabDef = { k: TabKey; title: string; Icon: (p: IcoProps) => ReactNode; c: string };
type Wish = { id: string; text: string; done: boolean };

const TABS: TabDef[] = [
    { k: 'timeline', title: '时间线', Icon: IClock, c: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)' },
    { k: 'photos', title: '照片墙', Icon: IPhoto, c: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)' },
    { k: 'notes', title: '文字回忆', Icon: INote, c: 'linear-gradient(135deg,#FBE6A8,#F1C75A)' },
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
// Format a post's ISO timestamp as a relative day label + a time detail line.
const fmtDate = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    if (now.getTime() - d.getTime() < 60_000) return '刚刚';
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
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${hh}:${mm}`;
};

type Picked = { file: File; dataUrl: string };

function Composer({ worldId, onPublished }: { worldId: string | null; onPublished: () => void }) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [imgId, setImgId] = useState(() => `ow-img-${Date.now()}`);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const slotRef = useRef<HTMLElement | null>(null);
    const pickedRef = useRef<Picked | null>(null);

    // Collect the original File + webp thumbnail the <image-slot> emits (ST-4).
    // Re-bound whenever the slot is remounted (imgId changes after publish).
    useEffect(() => {
        const el = slotRef.current;
        if (!el) return;
        const onSlot = (e: Event) => {
            const d = (e as CustomEvent).detail as { file?: File; dataUrl?: string } | null;
            pickedRef.current = d && d.file && d.dataUrl ? { file: d.file, dataUrl: d.dataUrl } : null;
        };
        el.addEventListener('slot-change', onSlot);
        return () => el.removeEventListener('slot-change', onSlot);
    }, [imgId]);

    const publish = async () => {
        const v = text.trim();
        if (!v || !worldId || busy) return;
        setBusy(true);
        setErr(null);
        try {
            let images: string[] = [];
            const picked = pickedRef.current;
            if (picked) {
                const { originalPath } = await uploadMemoryImage(worldId, picked.file, picked.dataUrl);
                images = [originalPath];
            }
            await createPost({ worldId, content: v, images });
            setText('');
            setOpen(false);
            pickedRef.current = null;
            setImgId(`ow-img-${Date.now()}`); // fresh, empty slot next time
            onPublished();
        } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <div className="compose glass">
                <div className="compose-collapsed" onClick={() => setOpen(true)}>
                    <span className="pchip">
                        <IPlus size={18} />
                    </span>
                    <span className="ph">记录此刻的我们…</span>
                </div>
            </div>
        );
    }
    return (
        <div className="compose glass">
            <div className="compose-open">
                <textarea
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="今天发生了什么温柔的事？"
                />
                <div className="compose-row">
                    <div className="compose-photo glass">
                        {/* No id → the pick stays in-component (no localStorage orphan);
                            key remounts a fresh empty slot after each publish. */}
                        <image-slot
                            ref={slotRef}
                            key={imgId}
                            shape="rounded"
                            radius="14"
                            placeholder="照片"
                        ></image-slot>
                    </div>
                    <div className="compose-actions">
                        <button
                            className="btn-ghost"
                            disabled={busy}
                            onClick={() => {
                                setOpen(false);
                                setText('');
                                setErr(null);
                            }}
                        >
                            取消
                        </button>
                        <button className="btn-pub" onClick={publish} disabled={!text.trim() || !worldId || busy}>
                            {busy ? '发布中…' : '发布'}
                        </button>
                    </div>
                </div>
                {err && <div className="empty-hint">发布失败：{err}</div>}
            </div>
        </div>
    );
}

// Sign the thumbnails for a set of feed posts once, shared by the timeline and
// photo wall (private bucket → short-lived signed URLs). Returns a path -> url map.
function useSignedThumbs(posts: FeedPost[]): Record<string, string> {
    const [urls, setUrls] = useState<Record<string, string>>({});
    useEffect(() => {
        let cancelled = false;
        // signImageUrls([]) resolves to {} — covers the no-image case too.
        const thumbs = posts.flatMap((p) => (p.visible_images ?? []).map(thumbPathOf));
        signImageUrls(thumbs)
            .then((m) => {
                if (!cancelled) setUrls(m);
            })
            .catch(() => {
                /* leave thumbnails blank on signing failure */
            });
        return () => {
            cancelled = true;
        };
    }, [posts]);
    return urls;
}

function TimelineBody({ feed, thumbUrls }: { feed: UseFeed; thumbUrls: Record<string, string> }) {
    const { status, posts, error, worldId, reload } = feed;

    if (status === 'loading') return <div className="empty-hint">正在加载你们的回忆…</div>;
    if (status === 'error')
        return (
            <div className="empty-hint">
                加载失败：{error} ·{' '}
                <button className="btn-ghost" onClick={reload}>
                    重试
                </button>
            </div>
        );
    return (
        <div>
            <Composer worldId={worldId} onPublished={reload} />
            <div className="tl">
                {posts.length === 0 && <div className="empty-hint">还没有回忆 · 记录第一条吧</div>}
                {posts.map((p) => {
                    const path = p.visible_images?.[0];
                    const src = path ? thumbUrls[thumbPathOf(path)] : undefined;
                    return (
                        <div className="tl-item" key={p.post_id}>
                            <div className="tl-dot" />
                            <div className="tl-date">{fmtDate(p.created_at)}</div>
                            <div className="tl-card glass">
                                {src && <image-slot src={src} shape="rounded" radius="13" placeholder=""></image-slot>}
                                <div className="tbody">
                                    <div className="tt">{p.visible_content}</div>
                                    <div className="ts">{fmtMeta(p.created_at)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {posts.length > 0 && <div className="empty-hint">往下继续记录你们的故事 ·</div>}
            </div>
        </div>
    );
}

function PhotosBody({ posts, thumbUrls }: { posts: FeedPost[]; thumbUrls: Record<string, string> }) {
    // Flatten every post's images into photo tiles, keeping only ones whose
    // thumbnail is already signed.
    const photos = posts
        .flatMap((p) =>
            (p.visible_images ?? []).map((path) => ({
                key: `${p.post_id}:${path}`,
                src: thumbUrls[thumbPathOf(path)],
                date: fmtDate(p.created_at)
            }))
        )
        .filter((ph) => !!ph.src);
    return (
        <div>
            <div className="pw-head">来自时间线的 {photos.length} 个瞬间</div>
            <div className="pw">
                {photos.map((ph) => (
                    <figure key={ph.key}>
                        <image-slot src={ph.src} shape="rect" placeholder=""></image-slot>
                        <figcaption>{ph.date}</figcaption>
                    </figure>
                ))}
            </div>
            {photos.length === 0 && <div className="empty-hint">还没有照片 · 发一条带图的回忆吧</div>}
        </div>
    );
}

function NotesBody() {
    const notes = [
        { t: '今天你睡着的样子很可爱，我看了好久。', a: '小满', d: '昨天' },
        { t: '谢谢你今天接我下班，雨好大但你一直在笑。', a: '知夏', d: '6 月 2 日' }
    ];
    return (
        <div>
            {notes.map((n, i) => (
                <div className="note glass" key={i}>
                    <div className="nt">{n.t}</div>
                    <div className="nm">
                        <b>{n.a}</b>
                        <span>{n.d}</span>
                    </div>
                </div>
            ))}
            <div className="empty-hint">给对方写一句悄悄话 ·</div>
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
                <div className={`wish glass ${w.done ? 'done' : ''}`} key={w.id} onClick={() => toggle(w.id)}>
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
                <button onClick={add} aria-label="添加">
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (screen) setTab(screen);
    }, [screen]);
    useEffect(() => save('ow-wishes-v1', wishes), [wishes]);

    const cfg = TABS.find((t) => t.k === tab) || TABS[0];

    return (
        <>
            <ScreenStyles />
            <div className={`modal-scrim ${show ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal glass ${show ? 'show' : ''}`} aria-hidden={!show}>
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
                <div className="modal-body" key={tab}>
                    {tab === 'timeline' && <TimelineBody feed={feed} thumbUrls={thumbUrls} />}
                    {tab === 'photos' && <PhotosBody posts={feed.posts} thumbUrls={thumbUrls} />}
                    {tab === 'notes' && <NotesBody />}
                    {tab === 'wishlist' && <WishlistBody wishes={wishes} setWishes={setWishes} />}
                </div>
            </div>
        </>
    );
}

export type { TabKey };
