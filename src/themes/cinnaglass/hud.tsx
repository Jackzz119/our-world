// hud.tsx — weightless floating game HUD. Widgets toggle from the Toolbox;
// "解锁编辑" enables dragging widgets to reposition them. Minimap reuses RoomArt.
import { useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { IcoProps } from './icons';
import {
    ICalendar,
    IChat,
    ICheck,
    IClock,
    ICloud,
    IClose,
    IDusk,
    IGrid,
    IHeart,
    ILock,
    IMapPin,
    IMoon,
    IMove,
    IMusic,
    IPhoto,
    IRain,
    ISnow,
    ISparkle,
    ISun,
    IUsers,
    IWand
} from './icons';
import { RoomArt } from './scene';
import { MusicPlayer } from './music';
import type { Density, HudLayout, Mood } from './tweaks';
import type { Weather, Widgets, WidgetPos } from './model';

const HudStyles = () => (
    <style>{`
  .hud{position:absolute;inset:0;pointer-events:none;z-index:5;}
  .hud > *{pointer-events:auto;}
  .float{position:absolute;touch-action:none;}
  .floatI{will-change:transform;}
  .float.draggable{cursor:move;}
  .float.draggable .floatI{outline:1.6px dashed var(--accent-deep);outline-offset:5px;border-radius:20px;}
  .float.draggable.dragging{z-index:30;}
  .float.draggable.dragging .floatI{outline-color:#EF9DB4;}
  .float.draggable .tappable{cursor:move;}
  .float.draggable .tappable:hover{transform:none;filter:none;}
  .float.draggable .minimap,.float.draggable .ambient,.float.draggable .lighting{cursor:move;}

  .edit-banner{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);z-index:9;
    border-radius:99px;padding:8px 16px;font-size:12.5px;font-weight:600;color:var(--glass-text);
    display:flex;align-items:center;gap:8px;pointer-events:auto;white-space:nowrap;cursor:pointer;
    transition:transform .18s, box-shadow .2s;}
  .edit-banner:hover{transform:translateX(-50%) translateY(-1px);}
  .edit-banner:active{transform:translateX(-50%) scale(.97);}
  .edit-banner .eb-done{display:inline-flex;color:#fff;background:linear-gradient(135deg,#9FD6F4,#5FB0E2);
    border-radius:50%;width:21px;height:21px;align-items:center;justify-content:center;margin-left:2px;
    box-shadow:0 2px 6px -2px rgba(79,169,220,.6);}
  .edit-banner .ic{display:inline-flex;color:var(--accent-deep);}

  .snap-guides{position:absolute;inset:0;pointer-events:none;z-index:26;}
  .snap-line{position:absolute;background:var(--accent-deep);opacity:.85;
    box-shadow:0 0 7px 1px var(--glass-glow);border-radius:2px;}
  .snap-line.x{top:0;bottom:0;width:1.5px;transform:translateX(-50%);}
  .snap-line.y{left:0;right:0;height:1.5px;transform:translateY(-50%);}

  .card{border-radius:var(--r-md);padding:13px 15px;}
  .tappable{cursor:pointer;transition:transform .22s cubic-bezier(.3,.7,.4,1), box-shadow .22s, filter .22s;}
  .tappable:hover{transform:translateY(-2px) scale(1.025);filter:saturate(1.05) brightness(1.03);}
  .tappable:active{transform:translateY(0) scale(.97);}

  .lbl{font-size:11px;letter-spacing:.16em;color:var(--glass-sub);font-weight:500;}
  .sub{font-size:11.5px;color:var(--glass-sub);}

  .days-row{display:flex;align-items:baseline;gap:6px;margin-top:3px;}
  .days-n{font-size:38px;line-height:.92;font-weight:700;letter-spacing:-.01em;}
  .days-u{font-size:15px;font-weight:500;color:var(--glass-sub);}
  .days-heart{color:#F39DB4;display:inline-flex;margin-left:2px;animation:beat 2.6s ease-in-out infinite;}

  .mem{display:flex;align-items:center;gap:11px;max-width:240px;}
  .mem image-slot{width:46px;height:46px;flex:0 0 auto;border-radius:13px;overflow:hidden;
    box-shadow:0 4px 12px -4px rgba(20,29,51,.4);}
  .mem-t{font-size:14px;font-weight:600;line-height:1.25;}

  .chip{display:inline-flex;align-items:center;gap:7px;border-radius:var(--r-pill);
    padding:8px 14px 8px 11px;font-size:12.5px;font-weight:500;white-space:nowrap;}
  .chip .ic{display:inline-flex;color:var(--accent-deep);}
  .chip b{font-weight:700;}
  .chip .num{font-size:14px;}

  .ambient{display:flex;align-items:center;gap:10px;border-radius:var(--r-pill);padding:8px 15px;}
  .ambient .t{font-size:15px;font-weight:600;letter-spacing:.01em;}
  .ambient .div{width:1px;height:16px;background:var(--glass-border);}
  .ambient .w{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--glass-sub);font-weight:500;}
  .ambient .w .ic{color:var(--accent-deep);}

  .minimap{width:78px;height:78px;border-radius:50%;overflow:hidden;position:relative;padding:0;}  .minimap .mini-room{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
  .minimap .mini-room svg{width:150%;height:150%;}
  .minimap .ringdot{position:absolute;left:50%;top:54%;width:9px;height:9px;border-radius:50%;
    background:#F39DB4;box-shadow:0 0 0 3px rgba(255,255,255,.7),0 0 10px 2px rgba(243,157,180,.8);
    transform:translate(-50%,-50%);}
  .minimap .lbl-m{position:absolute;left:0;right:0;bottom:5px;text-align:center;font-size:8.5px;
    letter-spacing:.12em;color:var(--glass-text);font-weight:600;text-shadow:0 1px 3px rgba(255,255,255,.6);}

  .lighting{position:absolute;left:50%;transform:translateX(-50%);bottom:24px;display:flex;gap:3px;padding:4px;border-radius:var(--r-pill);}
  .lighting button{pointer-events:auto;appearance:none;border:0;background:transparent;cursor:pointer;
    display:flex;align-items:center;gap:5px;padding:7px 11px;border-radius:var(--r-pill);
    color:var(--glass-sub);font:inherit;font-size:11.5px;font-weight:600;font-family:inherit;
    transition:background .2s,color .2s;}
  .lighting button.on{background:var(--glass-hi);color:var(--glass-text);
    box-shadow:0 2px 8px -2px rgba(20,29,51,.3);}
  .lighting button .ic{display:inline-flex;}

  /* ── Toolbox (bottom-right) ── */
  .tb-wrap{position:absolute;right:20px;bottom:22px;display:flex;flex-direction:column;align-items:flex-end;gap:12px;}
  .tb-panel{width:268px;border-radius:20px;overflow:hidden;transform-origin:bottom right;
    opacity:0;transform:translateY(14px) scale(.92);pointer-events:none;
    transition:opacity .24s ease, transform .32s cubic-bezier(.34,1.32,.5,1);}
  .tb-panel.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
  .tb-hd{padding:15px 16px 11px;}
  .tb-hd h4{margin:0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;}
  .tb-hd .tb-wand{display:inline-flex;color:var(--accent-deep);}
  .tb-hd p{margin:4px 0 0;font-size:11.5px;color:var(--glass-sub);}
  .tb-list{padding:4px 8px 8px;}
  .tb-sec{font-size:10px;letter-spacing:.14em;color:var(--glass-sub);font-weight:600;
    padding:9px 9px 5px;text-transform:uppercase;}
  .tb-row{display:flex;align-items:center;gap:11px;padding:9px 9px;border-radius:13px;
    transition:background .16s;}
  .tb-row.live{cursor:pointer;}
  .tb-row.live:hover{background:var(--glass-bg-2);}
  .tb-row.soon{opacity:.6;}
  .tb-row.edit{cursor:pointer;}
  .tb-row.edit:hover{background:var(--glass-bg-2);}
  .tb-row.req .tb-lock{color:var(--glass-sub);display:inline-flex;opacity:.7;}
  .tb-reset{text-align:center;font-size:12px;font-weight:600;color:var(--accent-deep);padding:8px;
    margin:2px 9px 6px;border-radius:11px;cursor:pointer;background:var(--glass-bg-2);border:1px solid var(--glass-border);}
  .tb-reset:hover{background:var(--glass-hi);}
  .tb-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#fff;flex:0 0 auto;
    box-shadow:0 3px 8px -3px rgba(40,90,140,.4);}
  .tb-row .tb-nm{flex:1;font-size:13.5px;font-weight:600;color:var(--glass-text);}
  .tb-soon-tag{font-size:9.5px;font-weight:700;letter-spacing:.06em;color:var(--accent-deep);
    background:var(--glass-bg-2);border:1px solid var(--glass-border);border-radius:99px;padding:3px 8px;}

  .sw{width:42px;height:25px;border-radius:99px;background:var(--glass-bg-2);border:1px solid var(--glass-border);
    position:relative;cursor:pointer;flex:0 0 auto;transition:background .22s,border-color .22s;}
  .sw.on{background:linear-gradient(135deg,#9FD6F4,#5FB0E2);border-color:transparent;}
  .sw i{position:absolute;top:2px;left:2px;width:19px;height:19px;border-radius:50%;background:#fff;
    box-shadow:0 2px 5px rgba(20,29,51,.3);transition:transform .24s cubic-bezier(.34,1.4,.5,1);}
  .sw.on i{transform:translateX(17px);}

  .fab{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;
    color:#fff;background:radial-gradient(120% 120% at 30% 25%, #BFE6FA 0%, #7CC6EC 46%, #4FA9DC 100%);
    box-shadow:0 10px 26px -6px rgba(79,169,220,.7), 0 2px 8px rgba(30,42,71,.3), inset 0 1.5px 0 rgba(255,255,255,.7);
    transition:transform .3s cubic-bezier(.34,1.4,.5,1), box-shadow .25s;}
  .fab:hover{box-shadow:0 14px 32px -6px rgba(79,169,220,.85), 0 2px 8px rgba(30,42,71,.3), inset 0 1.5px 0 rgba(255,255,255,.7);}
  .fab:active{transform:scale(.93);}
  .fab.open{transform:rotate(90deg);}
  `}</style>
);

type Guide = { axis: 'x' | 'y'; p: number };
type DragState = {
    px: number;
    py: number;
    left: number;
    top: number;
    w: number;
    h: number;
    last: WidgetPos;
    moved: boolean;
    xs: number[];
    ys: number[];
    guides?: Guide[];
};

type DraggableFloatProps = {
    widgetKey: string;
    pos: CSSProperties;
    custom?: WidgetPos;
    dragMode: boolean;
    onDrag: (k: string, pt: WidgetPos) => void;
    onCommit: (k: string, pt: WidgetPos) => void;
    onGuides?: (g: Guide[]) => void;
    anim: string;
    children: ReactNode;
};

function DraggableFloat({ widgetKey, pos, custom, dragMode, onDrag, onCommit, onGuides, anim, children }: DraggableFloatProps) {
    const ref = useRef<HTMLDivElement>(null);
    const st = useRef<DragState | null>(null);
    const raf = useRef(0);
    const style: CSSProperties = custom ? { left: custom.x, top: custom.y, right: 'auto', transform: 'none' } : pos;
    const begin = (e: React.PointerEvent) => {
        if (!dragMode) return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        // collect snap targets from siblings + viewport (fixed for the drag)
        const xs: number[] = [],
            ys: number[] = [];
        document.querySelectorAll('.hud .float').forEach((o) => {
            if (o === el) return;
            const b = o.getBoundingClientRect();
            xs.push(b.left, b.left + b.width / 2, b.right);
            ys.push(b.top, b.top + b.height / 2, b.bottom);
        });
        const vw = window.innerWidth,
            vh = window.innerHeight;
        xs.push(vw / 2, 20, vw - 20);
        ys.push(vh / 2, 20, vh - 20);
        st.current = { px: e.clientX, py: e.clientY, left: r.left, top: r.top, w: r.width, h: r.height, last: { x: r.left, y: r.top }, moved: false, xs, ys };
        try {
            el.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        el.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();
    };
    const move = (e: React.PointerEvent) => {
        if (!st.current) return;
        const s = st.current;
        let nl = s.left + (e.clientX - s.px);
        let nt = s.top + (e.clientY - s.py);
        nl = Math.max(8, Math.min(window.innerWidth - s.w - 8, nl));
        nt = Math.max(8, Math.min(window.innerHeight - s.h - 8, nt));
        // alignment snap (to sibling edges/centers + viewport) with guide lines
        const SNAP = 8;
        const guides: Guide[] = [];
        let bx: { d: number; line: number } | null = null;
        const ex = [nl, nl + s.w / 2, nl + s.w];
        for (const tx of s.xs) for (const v of ex) { const d = tx - v; if (Math.abs(d) <= SNAP && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, line: tx }; }
        if (bx) { nl += bx.d; guides.push({ axis: 'x', p: bx.line }); }
        let by: { d: number; line: number } | null = null;
        const ey = [nt, nt + s.h / 2, nt + s.h];
        for (const ty of s.ys) for (const v of ey) { const d = ty - v; if (Math.abs(d) <= SNAP && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, line: ty }; }
        if (by) { nt += by.d; guides.push({ axis: 'y', p: by.line }); }
        s.last = { x: nl, y: nt };
        s.moved = true;
        s.guides = guides;
        if (!raf.current)
            raf.current = requestAnimationFrame(() => {
                raf.current = 0;
                onDrag(widgetKey, s.last);
                if (onGuides) onGuides(s.guides || []);
            });
    };
    const end = (e: React.PointerEvent) => {
        if (!st.current) return;
        const el = ref.current;
        if (el) {
            el.classList.remove('dragging');
            try {
                el.releasePointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        }
        if (st.current.moved) onCommit(widgetKey, st.current.last);
        st.current = null;
        if (onGuides) onGuides([]);
    };
    return (
        <div
            ref={ref}
            className={`float ${dragMode ? 'draggable' : ''}`}
            style={style}
            onPointerDown={begin}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
        >
            <div className="floatI" style={{ animation: dragMode ? 'none' : anim }}>
                {children}
            </div>
        </div>
    );
}

function DaysCard({ density, onClick }: { density: Density; onClick?: () => void }) {
    return (
        <div className="card glass tappable" onClick={onClick}>
            <div className="lbl">在一起</div>
            <div className="days-row">
                <span className="num days-n">365</span>
                <span className="days-u">天</span>
                <span className="days-heart">
                    <IHeart size={17} fill="currentColor" sw={0} />
                </span>
            </div>
            {density === 'rich' && <div className="sub" style={{ marginTop: 6 }}>从 2025.6.4 起</div>}
        </div>
    );
}
function MemoryCard({ density, onClick }: { density: Density; onClick?: () => void }) {
    return (
        <div className="card glass tappable" onClick={onClick}>
            <div className="mem">
                <image-slot id="mem-thumb" shape="rounded" radius="13" placeholder=""></image-slot>
                <div>
                    <div className="lbl" style={{ marginBottom: 4 }}>最近回忆</div>
                    <div className="mem-t">阳台看日落</div>
                    {density === 'rich' && <div className="sub" style={{ marginTop: 4 }}>昨天 18:42 · 3 张照片</div>}
                </div>
            </div>
        </div>
    );
}
function AnniversaryChip({ onClick }: { onClick?: () => void }) {
    return (
        <div className="chip glass tappable" onClick={onClick}>
            <span className="ic">
                <ISparkle size={16} />
            </span>
            <span>
                距纪念日还有 <b className="num">18</b> 天
            </span>
        </div>
    );
}
function AmbientPill({ density, weather, nowTs, onClick }: { density: Density; weather: Weather; nowTs: number; onClick?: () => void }) {
    const d = new Date(nowTs);
    const hh = String(d.getHours()).padStart(2, '0'),
        mm = String(d.getMinutes()).padStart(2, '0');
    const WIcon = weather.kind === 'sun' ? ISun : weather.kind === 'rain' ? IRain : weather.kind === 'snow' ? ISnow : ICloud;
    return (
        <div className="ambient glass tappable" onClick={onClick}>
            <span className="t num">
                {hh}:{mm}
            </span>
            <span className="div" />
            <span className="w">
                <span className="ic">
                    <WIcon size={16} />
                </span>
                {weather.temp}°{density === 'rich' ? ` · ${weather.label}` : ''}
            </span>
        </div>
    );
}
function Minimap({ label, onClick }: { label?: string; onClick?: () => void }) {
    return (
        <div className="minimap glass tappable" onClick={onClick} title="切换空间">
            <div className="mini-room">
                <RoomArt shadow={false} />
            </div>
            <div className="ringdot" />
            <div className="lbl-m">{label || '我们的房间'}</div>
        </div>
    );
}
function LightingToggle({ mood, onChange }: { mood: Mood; onChange: (k: Mood) => void }) {
    const opts: { k: Mood; label: string; Icon: (p: IcoProps) => ReactNode }[] = [
        { k: 'golden', label: '黄昏', Icon: ISun },
        { k: 'twilight', label: '暮色', Icon: IDusk },
        { k: 'night', label: '夜晚', Icon: IMoon }
    ];
    return (
        <div className="lighting glass">
            {opts.map(({ k, label, Icon }) => (
                <button key={k} className={mood === k ? 'on' : ''} onClick={() => onChange(k)}>
                    <span className="ic">
                        <Icon size={15} />
                    </span>
                    {label}
                </button>
            ))}
        </div>
    );
}

/* widgets — required (always on) vs addon (toggleable when editing) */
type WidgetDef = { key: string; label: string; Icon: (p: IcoProps) => ReactNode; c: string };
const WIDGET_REQUIRED: WidgetDef[] = [
    { key: 'days', label: '时间线入口', Icon: IClock, c: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)' },
    { key: 'minimap', label: '房间小地图', Icon: IMapPin, c: 'linear-gradient(135deg,#C9E8C2,#86C99A)' },
    { key: 'chat', label: '悄悄话', Icon: IChat, c: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)' }
];
const WIDGET_ADDONS: WidgetDef[] = [
    { key: 'presence', label: '侧边栏 · 房间 / 头像', Icon: IUsers, c: 'linear-gradient(135deg,#C9E8C2,#86C99A)' },
    { key: 'anniv', label: '日历 · 纪念日', Icon: ICalendar, c: 'linear-gradient(135deg,#D8C2F0,#A98FD6)' },
    { key: 'memory', label: '照片集', Icon: IPhoto, c: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)' },
    { key: 'ambient', label: '时间 · 闹钟 · 天气', Icon: ICloud, c: 'linear-gradient(135deg,#AEDFF2,#7CC6EC)' },
    { key: 'music', label: '一起听歌 · 播放器', Icon: IMusic, c: 'linear-gradient(135deg,#FCD9A0,#F1B45A)' },
    { key: 'lighting', label: '灯光切换', Icon: ISun, c: 'linear-gradient(135deg,#FCE7B0,#F1C75A)' }
];
const WIDGET_SOON: WidgetDef[] = [{ key: 'custom', label: '自创组件', Icon: IWand, c: 'linear-gradient(135deg,#BFE6FA,#9FD6F4)' }];

type ToolboxProps = {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    widgets: Widgets;
    setWidget: (k: string, v: boolean) => void;
    dragMode: boolean;
    setDragMode: Dispatch<SetStateAction<boolean>>;
    resetPos: () => void;
};

function Toolbox({ open, setOpen, widgets, setWidget, dragMode, setDragMode, resetPos }: ToolboxProps) {
    return (
        <div className="tb-wrap">
            <div className={`tb-panel glass ${open ? 'show' : ''}`}>
                <div className="tb-hd">
                    <h4>
                        <span className="tb-wand">
                            <IWand size={18} />
                        </span>
                        自定义界面
                    </h4>
                    <p>开关组件 · 解锁编辑后可拖动摆放</p>
                </div>
                <div className="tb-list">
                    <div className="tb-row edit" onClick={() => setDragMode((d) => !d)}>
                        <span
                            className="tb-ic"
                            style={{
                                background: dragMode ? 'linear-gradient(135deg,#9FD6F4,#5FB0E2)' : 'var(--glass-bg-2)',
                                color: dragMode ? '#fff' : 'var(--accent-deep)'
                            }}
                        >
                            <IMove size={16} />
                        </span>
                        <span className="tb-nm">解锁编辑 · 拖动摆放</span>
                        <span className={`sw ${dragMode ? 'on' : ''}`}>
                            <i />
                        </span>
                    </div>
                    {dragMode && (
                        <div className="tb-reset" onClick={resetPos}>
                            恢复默认位置
                        </div>
                    )}

                    <div className="tb-sec">必备组件</div>
                    {WIDGET_REQUIRED.map((w) => (
                        <div key={w.key} className="tb-row req">
                            <span className="tb-ic" style={{ background: w.c }}>
                                <w.Icon size={16} />
                            </span>
                            <span className="tb-nm">{w.label}</span>
                            <span className="tb-lock">
                                <ILock size={14} />
                            </span>
                        </div>
                    ))}

                    <div className="tb-sec">附加组件</div>
                    {WIDGET_ADDONS.map((w) => (
                        <div key={w.key} className="tb-row live" onClick={() => setWidget(w.key, !widgets[w.key])}>
                            <span className="tb-ic" style={{ background: w.c }}>
                                <w.Icon size={16} />
                            </span>
                            <span className="tb-nm">{w.label}</span>
                            <span className={`sw ${widgets[w.key] ? 'on' : ''}`}>
                                <i />
                            </span>
                        </div>
                    ))}

                    <div className="tb-sec">即将推出</div>
                    {WIDGET_SOON.map((w) => (
                        <div key={w.key} className="tb-row soon">
                            <span className="tb-ic" style={{ background: w.c }}>
                                <w.Icon size={16} />
                            </span>
                            <span className="tb-nm">{w.label}</span>
                            <span className="tb-soon-tag">敬请期待</span>
                        </div>
                    ))}
                </div>
            </div>
            <button
                className={`fab ${open ? 'open' : ''}`}
                onClick={() =>
                    setOpen((o) => {
                        const n = !o;
                        if (!n) setDragMode(false);
                        return n;
                    })
                }
                aria-label="自定义界面"
            >
                {open ? <IClose size={24} /> : <IGrid size={24} />}
            </button>
        </div>
    );
}

function hudPositions(layout: HudLayout): Record<string, CSSProperties> {
    const C: CSSProperties = { left: '50%', transform: 'translateX(-50%)' };
    const RAIL: CSSProperties = { top: '50%', left: 14, transform: 'translateY(-50%)' };
    if (layout === 'cluster') {
        return {
            minimap: { top: 18, left: 18 },
            presence: RAIL,
            ambient: { top: 22, right: 20 },
            memory: { top: 96, right: 20 },
            days: { top: 204, right: 20 },
            anniv: { top: 312, right: 20 },
            music: { left: 18, bottom: 22 }
        };
    }
    if (layout === 'topbar') {
        return {
            minimap: { top: 18, left: 18 },
            ambient: { top: 22, right: 20 },
            presence: RAIL,
            anniv: { top: 24, ...C },
            days: { top: 64, ...C },
            memory: { top: 108, right: 20 },
            music: { left: 92, bottom: 22 }
        };
    }
    return {
        minimap: { top: 18, left: 18 },
        ambient: { top: 22, right: 20 },
        presence: RAIL,
        anniv: { top: 26, ...C },
        days: { top: 200, right: 20 },
        memory: { top: 96, right: 20 },
        music: { left: 92, bottom: 22 }
    };
}

type HUDProps = {
    layout: HudLayout;
    mood: Mood;
    density: Density;
    weather: Weather;
    nowTs: number;
    widgets: Widgets;
    setWidget: (k: string, v: boolean) => void;
    tbOpen: boolean;
    setTbOpen: Dispatch<SetStateAction<boolean>>;
    setMood: (k: Mood) => void;
    onNavigate: (k: string) => void;
    spaceName: string;
};

export function HUD({ layout, mood, density, weather, nowTs, widgets, setWidget, tbOpen, setTbOpen, setMood, onNavigate, spaceName }: HUDProps) {
    const p = hudPositions(layout);
    const [dragMode, setDragMode] = useState(false);
    const [wpos, setWpos] = useState<Record<string, WidgetPos>>(() => {
        try {
            return JSON.parse(localStorage.getItem('ow-wpos-v1') || '{}');
        } catch {
            return {};
        }
    });
    const [guides, setGuides] = useState<Guide[]>([]);
    const onDrag = (k: string, pt: WidgetPos) => setWpos((o) => ({ ...o, [k]: pt }));
    const onCommit = (k: string, pt: WidgetPos) =>
        setWpos((o) => {
            const n = { ...o, [k]: pt };
            try {
                localStorage.setItem('ow-wpos-v1', JSON.stringify(n));
            } catch {
                /* ignore */
            }
            return n;
        });
    const resetPos = () => {
        setWpos({});
        try {
            localStorage.removeItem('ow-wpos-v1');
        } catch {
            /* ignore */
        }
    };
    const nav = (k: string) => (dragMode ? undefined : () => onNavigate(k));
    const df = (key: string, anim: string) => ({ widgetKey: key, pos: p[key], custom: wpos[key], dragMode, onDrag, onCommit, onGuides: setGuides, anim });
    return (
        <div className="hud">
            <HudStyles />
            {widgets.minimap && (
                <DraggableFloat {...df('minimap', 'floatC 7s ease-in-out infinite')}>
                    <Minimap label={spaceName} onClick={nav('space')} />
                </DraggableFloat>
            )}
            {widgets.ambient && (
                <DraggableFloat {...df('ambient', 'floatA 6.5s ease-in-out infinite .4s')}>
                    <AmbientPill density={density} weather={weather} nowTs={nowTs} onClick={nav('clock')} />
                </DraggableFloat>
            )}
            {widgets.anniv && (
                <DraggableFloat {...df('anniv', 'floatB 6s ease-in-out infinite .2s')}>
                    <AnniversaryChip onClick={nav('calendar')} />
                </DraggableFloat>
            )}
            {widgets.days && (
                <DraggableFloat {...df('days', 'floatA 7.5s ease-in-out infinite')}>
                    <DaysCard density={density} onClick={nav('timeline')} />
                </DraggableFloat>
            )}
            {widgets.memory && (
                <DraggableFloat {...df('memory', 'floatB 6.8s ease-in-out infinite .6s')}>
                    <MemoryCard density={density} onClick={nav('photos')} />
                </DraggableFloat>
            )}
            {widgets.music && (
                <DraggableFloat {...df('music', 'floatA 7.2s ease-in-out infinite .3s')}>
                    <MusicPlayer spaceName={spaceName} />
                </DraggableFloat>
            )}
            {widgets.lighting && <LightingToggle mood={mood} onChange={setMood} />}
            {dragMode && (
                <div className="edit-banner glass" onClick={() => setDragMode(false)} title="完成编辑">
                    <span className="ic">
                        <IMove size={15} />
                    </span>
                    拖动摆放组件 · 点此完成
                    <span className="eb-done">
                        <ICheck size={14} />
                    </span>
                </div>
            )}
            {dragMode && guides.length > 0 && (
                <div className="snap-guides">
                    {guides.map((g, k) => (
                        <div key={k} className={`snap-line ${g.axis}`} style={g.axis === 'x' ? { left: g.p } : { top: g.p }} />
                    ))}
                </div>
            )}
            <Toolbox open={tbOpen} setOpen={setTbOpen} widgets={widgets} setWidget={setWidget} dragMode={dragMode} setDragMode={setDragMode} resetPos={resetPos} />
        </div>
    );
}