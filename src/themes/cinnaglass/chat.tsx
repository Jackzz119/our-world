// chat.tsx — multi-conversation chat. Docks bottom-left, expands to fullscreen.
// One mounted instance; dock↔full is a CSS morph so state/scroll persist and the
// scene underneath is never re-rendered. Docked = list↔thread; full = two-pane.
import { useEffect, useRef, useState } from 'react';
import { IChat, IChevron, IClose, IExpand, IHeart, ISend, IShrink, ISmile } from './icons';

const ChatStyles = () => (
    <style>{`
  /* launcher */
  .chat-launch{position:fixed;left:18px;bottom:24px;z-index:14;width:58px;height:58px;border-radius:50%;
    display:grid;place-items:center;cursor:pointer;color:var(--accent-deep);border:1px solid var(--glass-border);
    transition:transform .32s cubic-bezier(.34,1.5,.5,1),opacity .25s,box-shadow .2s;}
  .chat-launch:hover{transform:scale(1.07) translateY(-1px);}
  .chat-launch:active{transform:scale(.92);}
  .chat-launch.gone{opacity:0;transform:scale(.55);pointer-events:none;}
  .chat-launch .udot{position:absolute;top:9px;right:9px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;
    background:#F39DB4;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;
    box-shadow:0 0 0 2.5px var(--glass-bg),0 0 8px rgba(243,157,180,.9);}

  /* fullscreen scrim */
  .chat-scrim{position:fixed;inset:0;z-index:30;background:rgba(14,20,38,.5);
    -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
    opacity:0;pointer-events:none;transition:opacity .42s ease;}
  .chat-scrim.show{opacity:1;pointer-events:auto;}

  /* panel */
  .chat{position:fixed;z-index:31;display:flex;overflow:hidden;
    left:16px;bottom:16px;
    width:min(384px,calc(100vw - 32px));
    height:min(564px,calc(100vh - 92px));
    border-radius:24px;transform-origin:left bottom;
    opacity:0;transform:translateY(18px) scale(.95);pointer-events:none;
    transition:opacity .28s ease, transform .36s cubic-bezier(.34,1.3,.5,1),
      width .44s cubic-bezier(.32,.82,.36,1), height .44s cubic-bezier(.32,.82,.36,1),
      left .44s cubic-bezier(.32,.82,.36,1), bottom .44s cubic-bezier(.32,.82,.36,1),
      border-radius .44s ease;}
  .chat.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
  .chat.full{left:0;bottom:0;width:100vw;height:100vh;height:100dvh;border-radius:0;}
  .chat.full{--glass-bg:rgba(236,244,252,.9);--glass-bg-2:rgba(220,234,248,.82);}
  [data-glass="twilight"] .chat.full{--glass-bg:rgba(34,46,76,.92);--glass-bg-2:rgba(24,34,60,.88);}
  .chat.resizing{transition:none;}

  /* resize handles (docked only) */
  .chat-rz{position:absolute;z-index:7;touch-action:none;}
  .chat-rz-r{top:12px;bottom:12px;right:0;width:11px;cursor:ew-resize;}
  .chat-rz-t{left:12px;right:24px;top:0;height:11px;cursor:ns-resize;}
  .chat-rz-c{top:0;right:0;width:20px;height:20px;cursor:nesw-resize;}
  .chat-rz-c::after{content:"";position:absolute;top:6px;right:6px;width:7px;height:7px;
    border-top:2px solid var(--glass-sub);border-right:2px solid var(--glass-sub);opacity:.55;border-radius:0 2px 0 0;}
  .chat.full .chat-rz{display:none;}

  .chat-panes{flex:1;display:flex;min-height:0;min-width:0;width:100%;}

  /* ── list pane ── */
  .chat-list{display:flex;flex-direction:column;min-height:0;width:100%;}
  .chat.full .chat-list{flex:0 0 296px;width:296px;border-right:1px solid var(--glass-border);}
  .chat.dock.view-thread .chat-list{display:none;}
  .list-hd{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:14px 12px 12px 18px;
    border-bottom:1px solid var(--glass-border);}
  .list-hd h3{margin:0;flex:1;font-size:17px;font-weight:700;letter-spacing:.01em;}
  .list-scroll{flex:1;overflow-y:auto;padding:6px;-webkit-overflow-scrolling:touch;}
  .list-scroll::-webkit-scrollbar{width:0;}
  .chat-li{display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:15px;cursor:pointer;
    transition:background .18s;}
  .chat-li:hover{background:var(--glass-bg-2);}
  .chat-li.active{background:var(--glass-hi);}
  .li-ava{position:relative;width:44px;height:44px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;
    color:#fff;font-size:16px;font-weight:700;box-shadow:0 3px 9px -3px rgba(20,29,51,.4);}
  .li-ava.grp{border-radius:15px;}
  .li-ava .on{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;
    background:#5fcf8e;border:2.5px solid var(--glass-bg);box-shadow:0 0 6px #5fcf8e;}
  .li-body{flex:1;min-width:0;}
  .li-top{display:flex;align-items:baseline;gap:8px;}
  .li-nm{font-size:14.5px;font-weight:600;color:var(--glass-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .li-nm .hk{color:#F39DB4;margin-left:1px;vertical-align:-1px;}
  .li-tm{margin-left:auto;font-size:10.5px;color:var(--glass-sub);flex:0 0 auto;}
  .li-prev{font-size:12.5px;color:var(--glass-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
  .li-badge{flex:0 0 auto;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#F39DB4;color:#fff;
    font-size:10.5px;font-weight:700;display:grid;place-items:center;margin-left:8px;}

  /* ── thread pane ── */
  .chat-thread{flex:1;display:flex;flex-direction:column;min-height:0;min-width:0;}
  .chat.dock.view-list .chat-thread{display:none;}
  .th-hd{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:11px 12px 11px 14px;
    border-bottom:1px solid var(--glass-border);}
  .th-back{appearance:none;border:0;background:transparent;color:var(--glass-text);cursor:pointer;
    width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;transition:background .2s;}
  .th-back:hover{background:var(--glass-bg-2);}
  .th-ava{width:36px;height:36px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;color:#fff;
    font-size:14px;font-weight:700;box-shadow:0 3px 8px -3px rgba(20,29,51,.4);}
  .th-ava.grp{border-radius:12px;}
  .th-meta{flex:1;min-width:0;}
  .th-nm{font-size:15px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .th-st{font-size:11px;color:var(--glass-sub);display:flex;align-items:center;gap:5px;margin-top:2px;}
  .th-st i{width:6px;height:6px;border-radius:50%;background:#5fcf8e;box-shadow:0 0 6px #5fcf8e;flex:0 0 auto;}
  .chat-ico{appearance:none;border:1px solid var(--glass-border);background:var(--glass-bg-2);
    color:var(--glass-text);width:32px;height:32px;border-radius:50%;display:grid;place-items:center;
    cursor:pointer;flex:0 0 auto;transition:background .2s,transform .2s;}
  .chat-ico:hover{background:var(--glass-hi);}
  .chat-ico:active{transform:scale(.9);}

  .chat-msgs{flex:1;overflow-y:auto;padding:16px 14px;-webkit-overflow-scrolling:touch;}
  .chat-msgs::-webkit-scrollbar{width:0;}
  .chat-col{width:100%;display:flex;flex-direction:column;gap:9px;}
  .chat.full .chat-col{max-width:680px;margin:0 auto;}
  .chat-day{align-self:center;font-size:10.5px;letter-spacing:.08em;color:var(--glass-sub);
    background:var(--glass-bg-2);padding:3px 12px;border-radius:99px;margin-bottom:3px;}
  .msg{display:flex;align-items:flex-end;gap:8px;max-width:82%;}
  .msg.them{align-self:flex-start;}
  .msg.me{align-self:flex-end;flex-direction:row-reverse;}
  .msg .ava-s{width:28px;height:28px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;
    font-size:11px;font-weight:700;color:#fff;box-shadow:0 2px 6px -2px rgba(40,90,140,.4);}
  .bub-wrap{display:flex;flex-direction:column;min-width:0;}
  .bub-sender{font-size:10.5px;font-weight:600;color:var(--glass-sub);margin:0 0 3px 4px;}
  .bub{padding:9px 13px;border-radius:17px;font-size:14px;line-height:1.5;word-break:break-word;text-wrap:pretty;}
  .msg.them .bub{background:var(--glass-bg);border:1px solid var(--glass-border);
    color:var(--glass-text);border-bottom-left-radius:6px;}
  .msg.me .bub{background:linear-gradient(135deg,#9FD6F4,#5FB0E2);color:#0d2336;
    border-bottom-right-radius:6px;box-shadow:0 4px 12px -5px rgba(79,169,220,.6);}
  .tm{font-size:9.5px;color:var(--glass-sub);flex:0 0 auto;padding-bottom:2px;}
  .typing{display:flex;gap:4px;padding:11px 14px;}
  .typing span{width:7px;height:7px;border-radius:50%;background:var(--glass-sub);opacity:.6;
    animation:tdot 1.1s ease-in-out infinite;}
  .typing span:nth-child(2){animation-delay:.18s}
  .typing span:nth-child(3){animation-delay:.36s}
  @keyframes tdot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:.9}}

  .chat-input{flex:0 0 auto;border-top:1px solid var(--glass-border);padding:11px 13px;position:relative;}
  .chat-inwrap{display:flex;align-items:center;gap:7px;width:100%;}
  .chat.full .chat-inwrap{max-width:680px;margin:0 auto;}
  .chat-emo{appearance:none;border:1px solid var(--glass-border);background:var(--glass-bg-2);
    color:var(--glass-sub);width:42px;height:42px;border-radius:50%;display:grid;place-items:center;
    cursor:pointer;flex:0 0 auto;transition:background .2s,color .2s,transform .2s;}
  .chat-emo:hover{background:var(--glass-hi);color:var(--accent-deep);}
  .chat-emo.on{background:var(--glass-hi);color:var(--accent-deep);}
  .chat-emo:active{transform:scale(.9);}

  /* emoji picker panel — floats above the input */
  .emo-pop{position:absolute;left:13px;right:13px;bottom:64px;z-index:3;border-radius:18px;overflow:hidden;
    transform-origin:bottom left;opacity:0;transform:translateY(8px) scale(.96);pointer-events:none;
    transition:opacity .2s ease, transform .26s cubic-bezier(.34,1.3,.5,1);}
  .chat.full .emo-pop{left:50%;right:auto;transform-origin:bottom center;width:min(680px,calc(100% - 26px));
    margin-left:calc(min(680px,100% - 26px) / -2);transform:translateY(8px) scale(.96);}
  .emo-pop.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
  .chat.full .emo-pop.show{transform:translateY(0) scale(1);}
  .emo-tabs{display:flex;gap:2px;padding:8px 9px 6px;border-bottom:1px solid var(--glass-border);}
  .emo-tabs button{appearance:none;border:0;background:transparent;cursor:pointer;font-size:18px;line-height:1;
    width:34px;height:30px;border-radius:10px;display:grid;place-items:center;opacity:.55;transition:background .18s,opacity .18s;}
  .emo-tabs button.on{background:var(--glass-hi);opacity:1;}
  .emo-tabs button:hover{opacity:1;}
  .emo-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:9px;max-height:184px;overflow-y:auto;}
  .chat.full .emo-grid{grid-template-columns:repeat(12,1fr);}
  .emo-grid::-webkit-scrollbar{width:0;}
  .emo-grid button{appearance:none;border:0;background:transparent;cursor:pointer;font-size:22px;line-height:1;
    aspect-ratio:1;border-radius:11px;display:grid;place-items:center;transition:background .14s,transform .14s;}
  .emo-grid button:hover{background:var(--glass-bg-2);transform:scale(1.18);}
  .emo-grid button:active{transform:scale(.9);}
  .chat-field{flex:1;min-width:0;height:42px;border-radius:var(--r-pill);border:1px solid var(--glass-border);
    background:var(--glass-bg-2);color:var(--glass-text);padding:0 17px;font:inherit;font-size:14px;outline:none;
    transition:border-color .2s,background .2s;}
  .chat-field::placeholder{color:var(--glass-sub);}
  .chat-field:focus{border-color:var(--accent);background:var(--glass-hi);}
  .chat-send{width:42px;height:42px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;
    color:#fff;flex:0 0 auto;background:radial-gradient(120% 120% at 30% 25%,#BFE6FA,#7CC6EC 46%,#4FA9DC);
    box-shadow:0 6px 16px -5px rgba(79,169,220,.7),inset 0 1px 0 rgba(255,255,255,.6);
    transition:transform .2s,opacity .2s;}
  .chat-send:hover{transform:scale(1.06);}
  .chat-send:active{transform:scale(.9);}
  .chat-send:disabled{opacity:.45;cursor:default;transform:none;}
  `}</style>
);

type GroupMember = { n: string; c: string };
type Contact = {
    id: string;
    name: string;
    ini: string;
    color: string;
    lover?: boolean;
    online?: boolean;
    status: string;
    group?: boolean;
    members?: Record<string, GroupMember>;
    replies: (string | { s: string; t: string })[];
};
type Msg = { id: number; from: 'me' | 'them'; text: string; time: string; sender?: string };

const CONTACTS: Contact[] = [
    {
        id: 'xm',
        name: '小满',
        ini: '满',
        color: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)',
        lover: true,
        online: true,
        status: '在线 · 在想你',
        replies: ['在呢，刚刚还在想你', '今天也好想见你呀', '晚上一起看日落好不好', '我也是，远远地抱抱你', '嗯，都听你的', '在回家的路上啦，等我']
    },
    {
        id: 'mom',
        name: '妈妈',
        ini: '妈',
        color: 'linear-gradient(135deg,#FBE6A8,#F1C75A)',
        online: false,
        status: '30 分钟前在线',
        replies: ['吃饭了没？别老熬夜', '周末回来吃饭吗，给你们留门', '天凉了，记得加衣服', '钱够不够花，跟妈说']
    },
    {
        id: 'yue',
        name: '阿乐',
        ini: '乐',
        color: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)',
        online: true,
        status: '在线',
        replies: ['哈哈哈太对了', '周末打球不？', '下次带嫂子一起呀', '我也刚到家', '可以可以，安排']
    },
    {
        id: 'grp',
        name: '周末野餐 🧺',
        ini: '餐',
        color: 'linear-gradient(135deg,#C9E8C2,#86C99A)',
        group: true,
        online: true,
        status: '5 人 · 3 人在线',
        members: { lin: { n: '林林', c: '#7CC6EC' }, ada: { n: '阿达', c: '#EF9DB4' }, yue: { n: '阿乐', c: '#86C99A' } },
        replies: [
            { s: 'lin', t: '那这周六老地方见！' },
            { s: 'ada', t: '我带三明治和气泡水～' },
            { s: 'yue', t: '我负责飞盘和音箱🎶' },
            { s: 'lin', t: '记得带防晒呀，太阳挺大' }
        ]
    }
];

const EMOJI: Record<string, string[]> = {
    '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🩷', '💖', '💕', '💞', '💗', '💓', '💝', '💘', '😍', '🥰', '😘', '😚', '🫶', '🤗', '💑', '💏', '👩‍❤️‍👨'],
    '😊': ['😊', '😄', '😁', '😆', '🥹', '😋', '😌', '😏', '🙂', '🥲', '😇', '🤭', '😴', '🤤', '😪', '🥱', '😎', '🤩', '🥳', '😜', '😝', '🤪', '😬', '🙃', '😮', '😯', '😳', '🥺', '😢', '😭', '😤', '🫠'],
    '🌙': ['🌙', '⭐', '✨', '🌟', '💫', '☁️', '🌤️', '🌈', '🌅', '🌇', '🌃', '🌌', '❄️', '🌸', '🌷', '🌹', '🌻', '🌼', '🪷', '🍀', '🌿', '🍃', '🦋', '🐰'],
    '🍰': ['🍰', '🧁', '🍓', '🍑', '🍒', '🍉', '🍦', '🍨', '🍮', '🍪', '🍫', '☕', '🍵', '🧋', '🥂', '🍷', '🍜', '🍕', '🍙', '🎁', '🎈', '🧸', '🏠', '🛋️']
};
const EMOJI_TABS = Object.keys(EMOJI);

const SEED_THREADS: Record<string, Msg[]> = {
    xm: [
        { id: 1, from: 'them', text: '今天的云好软，我拍下来了，回家给你看', time: '18:31' },
        { id: 2, from: 'me', text: '好呀，像棉花糖一样吧', time: '18:32' },
        { id: 3, from: 'them', text: '晚饭想吃什么？我顺路买', time: '18:33' }
    ],
    mom: [
        { id: 1, from: 'them', text: '在忙吗，记得按时吃饭', time: '12:10' },
        { id: 2, from: 'me', text: '在呢妈，刚吃完～', time: '12:25' }
    ],
    yue: [
        { id: 1, from: 'them', text: '周末有空不，约个饭', time: '昨天' },
        { id: 2, from: 'me', text: '行啊，我问下小满', time: '昨天' }
    ],
    grp: [
        { id: 1, from: 'them', sender: 'lin', text: '周末天气不错，要不要去公园野餐？', time: '10:02' },
        { id: 2, from: 'them', sender: 'ada', text: '我超想去！', time: '10:05' },
        { id: 3, from: 'me', text: '算我们俩一个～', time: '10:08' }
    ]
};

export function Chat() {
    const [open, setOpen] = useState(false);
    const [full, setFull] = useState(false);
    const [view, setView] = useState<'list' | 'thread'>('list'); // docked sub-view
    const [activeId, setActiveId] = useState('xm');
    const [threads, setThreads] = useState<Record<string, Msg[]>>(SEED_THREADS);
    const [unread, setUnread] = useState<Record<string, number>>({ mom: 1, grp: 2 });
    const [text, setText] = useState('');
    const [emoOpen, setEmoOpen] = useState(false);
    const [emoTab, setEmoTab] = useState(EMOJI_TABS[0]);
    const [typingId, setTypingId] = useState<string | null>(null);
    const [size, setSize] = useState<{ w: number; h: number }>(() => {
        try {
            return JSON.parse(localStorage.getItem('ow-chat-size') || 'null') || { w: 384, h: 564 };
        } catch {
            return { w: 384, h: 564 };
        }
    });
    const [rz, setRz] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const idRef = useRef(1000);

    const active = CONTACTS.find((c) => c.id === activeId) as Contact;
    const showThread = full || view === 'thread';

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [threads, typingId, activeId, open, full, view]);

    const now = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const openContact = (id: string) => {
        setActiveId(id);
        setView('thread');
        setUnread((u) => (u[id] ? { ...u, [id]: 0 } : u));
    };

    const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

    const startResize = (axis: string) => (e: React.PointerEvent) => {
        const start = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
        setRz(true);
        const move = (ev: PointerEvent) => {
            let w = start.w,
                h = start.h;
            if (axis.includes('w')) w = start.w + (ev.clientX - start.x);
            if (axis.includes('h')) h = start.h - (ev.clientY - start.y);
            w = Math.max(300, Math.min(window.innerWidth - 32, w));
            h = Math.max(360, Math.min(window.innerHeight - 88, h));
            setSize({ w, h });
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            setRz(false);
            setSize((s) => {
                try {
                    localStorage.setItem('ow-chat-size', JSON.stringify(s));
                } catch {
                    /* ignore */
                }
                return s;
            });
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        e.preventDefault();
    };

    const send = (e: React.FormEvent) => {
        e.preventDefault();
        const v = text.trim();
        if (!v) return;
        const id = activeId;
        const c = CONTACTS.find((x) => x.id === id) as Contact;
        setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { id: ++idRef.current, from: 'me', text: v, time: now() }] }));
        setText('');
        setEmoOpen(false);
        setTypingId(id);
        setTimeout(() => {
            setTypingId(null);
            const pick = c.replies[Math.floor(Math.random() * c.replies.length)];
            const reply: Msg =
                typeof pick === 'string'
                    ? { id: ++idRef.current, from: 'them', text: pick, time: now() }
                    : { id: ++idRef.current, from: 'them', sender: pick.s, text: pick.t, time: now() };
            setThreads((t) => ({ ...t, [id]: [...(t[id] || []), reply] }));
        }, 1500);
    };

    const addEmoji = (e: string) => {
        setText((t) => t + e);
    };

    const lastPreview = (c: Contact) => {
        const arr = threads[c.id] || [];
        const m = arr[arr.length - 1];
        if (!m) return '开始聊天吧';
        let p = m.text;
        if (c.group && m.from === 'them' && m.sender) p = `${c.members?.[m.sender]?.n || ''}: ${p}`;
        if (m.from === 'me') p = '我: ' + p;
        return p;
    };
    const lastTime = (c: Contact) => {
        const arr = threads[c.id] || [];
        return arr.length ? arr[arr.length - 1].time : '';
    };

    const senderInfo = (m: Msg): { n: string; c: string; full?: string } => {
        if (!active.group) return { n: active.ini, c: active.color };
        const mem = (m.sender && active.members?.[m.sender]) || { n: '?', c: '#9aa' };
        return { n: mem.n.slice(0, 1), full: mem.n, c: mem.c };
    };

    // Rendered inline (not a nested component) to keep window state stable across re-renders.
    const winControls = () => (
        <>
            <button className="chat-ico" onClick={() => setFull((f) => !f)} aria-label={full ? '缩小' : '全屏'}>
                {full ? <IShrink size={16} /> : <IExpand size={16} />}
            </button>
            <button className="chat-ico" onClick={() => setOpen(false)} aria-label="收起">
                <IClose size={16} />
            </button>
        </>
    );

    return (
        <>
            <ChatStyles />
            <button className={`chat-launch glass ${open ? 'gone' : ''}`} onClick={() => setOpen(true)} aria-label="消息">
                <IChat size={24} />
                {totalUnread > 0 && <span className="udot">{totalUnread}</span>}
            </button>

            <div className={`chat-scrim ${open && full ? 'show' : ''}`} onClick={() => setFull(false)} />

            <div
                className={`chat glass ${open ? 'open' : ''} ${full ? 'full' : 'dock'} ${showThread ? 'view-thread' : 'view-list'} ${rz ? 'resizing' : ''}`}
                style={full ? undefined : { width: size.w, height: size.h }}
                aria-hidden={!open}
            >
                {!full && (
                    <>
                        <div className="chat-rz chat-rz-t" onPointerDown={startResize('h')} />
                        <div className="chat-rz chat-rz-r" onPointerDown={startResize('w')} />
                        <div className="chat-rz chat-rz-c" onPointerDown={startResize('wh')} />
                    </>
                )}
                <div className="chat-panes">
                    {/* ── list pane ── */}
                    <aside className="chat-list">
                        <div className="list-hd">
                            <h3>消息</h3>
                            {(full || view === 'list') && winControls()}
                        </div>
                        <div className="list-scroll">
                            {CONTACTS.map((c) => (
                                <div key={c.id} className={`chat-li ${activeId === c.id && showThread ? 'active' : ''}`} onClick={() => openContact(c.id)}>
                                    <span className={`li-ava ${c.group ? 'grp' : ''}`} style={{ background: c.color }}>
                                        {c.ini}
                                        {c.online && !c.group && <span className="on" />}
                                    </span>
                                    <div className="li-body">
                                        <div className="li-top">
                                            <span className="li-nm">
                                                {c.name}
                                                {c.lover && <IHeart className="hk" size={12} fill="currentColor" sw={0} />}
                                            </span>
                                            <span className="li-tm">{lastTime(c)}</span>
                                        </div>
                                        <div className="li-prev">{lastPreview(c)}</div>
                                    </div>
                                    {unread[c.id] > 0 && <span className="li-badge">{unread[c.id]}</span>}
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* ── thread pane ── */}
                    <section className="chat-thread">
                        <div className="th-hd">
                            {!full && (
                                <button className="th-back" onClick={() => setView('list')} aria-label="返回">
                                    <IChevron size={20} style={{ transform: 'rotate(180deg)' }} />
                                </button>
                            )}
                            <span className={`th-ava ${active.group ? 'grp' : ''}`} style={{ background: active.color }}>
                                {active.ini}
                            </span>
                            <div className="th-meta">
                                <div className="th-nm">
                                    {active.name}
                                    {active.lover && <IHeart className="hk" size={12} fill="#F39DB4" sw={0} style={{ marginLeft: 3, verticalAlign: -1 }} />}
                                </div>
                                <div className="th-st">
                                    {active.online && <i />}
                                    {active.status}
                                </div>
                            </div>
                            {!full && view === 'thread' && winControls()}
                        </div>

                        <div className="chat-msgs" ref={scrollRef}>
                            <div className="chat-col">
                                <div className="chat-day">今天</div>
                                {(threads[activeId] || []).map((m) => {
                                    const si = m.from === 'them' ? senderInfo(m) : null;
                                    return (
                                        <div className={`msg ${m.from}`} key={m.id}>
                                            {m.from === 'them' && si && (
                                                <span className="ava-s" style={{ background: si.c }}>
                                                    {si.n}
                                                </span>
                                            )}
                                            <div className="bub-wrap">
                                                {m.from === 'them' && active.group && si && <div className="bub-sender">{si.full}</div>}
                                                <div className="bub">{m.text}</div>
                                            </div>
                                            <span className="tm">{m.time}</span>
                                        </div>
                                    );
                                })}
                                {typingId === activeId && (
                                    <div className="msg them">
                                        <span className="ava-s" style={{ background: active.color }}>
                                            {active.ini}
                                        </span>
                                        <div className="bub typing">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <form className="chat-input" onSubmit={send}>
                            <div className={`emo-pop glass ${emoOpen ? 'show' : ''}`}>
                                <div className="emo-tabs">
                                    {EMOJI_TABS.map((tb) => (
                                        <button type="button" key={tb} className={emoTab === tb ? 'on' : ''} onClick={() => setEmoTab(tb)}>
                                            {tb}
                                        </button>
                                    ))}
                                </div>
                                <div className="emo-grid">
                                    {EMOJI[emoTab].map((e, i) => (
                                        <button type="button" key={e + i} onClick={() => addEmoji(e)} aria-label={e}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="chat-inwrap">
                                <button type="button" className={`chat-emo ${emoOpen ? 'on' : ''}`} onClick={() => setEmoOpen((o) => !o)} aria-label="表情">
                                    <ISmile size={20} />
                                </button>
                                <input
                                    ref={inputRef}
                                    className="chat-field"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onFocus={() => setEmoOpen(false)}
                                    placeholder={active.lover ? '对她说点什么…' : `发消息给 ${active.name}…`}
                                />
                                <button className="chat-send" type="submit" disabled={!text.trim()} aria-label="发送">
                                    <ISend size={18} />
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </>
    );
}