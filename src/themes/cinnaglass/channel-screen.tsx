// channel-screen.tsx — the covering CHAT HUB: opened from the sidebar (text
// channels AND DMs — the sidebar's only chat trigger), it floats over the
// stage so you can chat with the scene tucked away. The sidebar entries are
// summon buttons; once open, the hub's own left column switches between all
// open conversations (current world's text channels + my DMs — same set as
// the dock tabs via convsFor). Threads are shared with the in-scene ChatDock.
// Message states / hover actions / reactions / delete particles follow
// ux decisions.md D-7; the read cursor avatar renders in DMs ONLY
// (D-7-3 修订: 频道不显示已读). See ai/Features/chat.md.
import { useEffect, useMemo, useRef, useState } from 'react';
import { IClose, IHash, ISend } from './icons';
import { FriendsPage } from './friends-page';
import { EmotePicker, type EmoteView } from './emote-picker';
import { FRIENDS_VIEW, convsFor, type Conv, type FriendEntry, type FriendRequest, type Msg } from './chat-data';
import type { Channel, EmoteSearchResult } from '@/types/chat.ts';
import type { ChatAlign } from './tweaks';

// quick reactions on the hover bar; the ➕ opens the full EmotePicker.
const QUICK_EMOJI = ['💗', '😆', '🥺'];

const VANISH_COLORS = ['#9fd6f4', '#5fb0e2', '#f8c8d6', '#ef9db4', '#ffffff', '#fce7b0'];

const ChannelStyles = () => (
    <style>{`
  .chsc-scrim{position:absolute;inset:0;z-index:22;background:rgba(14,20,38,.45);
    -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:chscFade .3s ease both;}
  @keyframes chscFade{from{opacity:0}to{opacity:1}}
  .chsc{position:absolute;inset:3% 4%;z-index:23;display:flex;flex-direction:row;overflow:hidden;
    border-radius:24px;animation:chscIn .34s cubic-bezier(.3,.8,.4,1) both;}
  @keyframes chscIn{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){.chsc,.chsc-scrim{animation:none}}

  /* left column: conversation switcher (channels of this world + DMs) */
  .chsc-nav{width:188px;flex:0 0 auto;border-right:1px solid var(--glass-line);
    background:linear-gradient(160deg,var(--glass-hi),transparent);
    overflow-y:auto;overflow-x:hidden;padding:12px 9px;}
  .chsc-nav::-webkit-scrollbar{width:5px;}
  .chsc-nav::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}
  .chsc-cat{font-size:10.5px;letter-spacing:.15em;font-weight:700;color:var(--glass-sub);
    padding:10px 8px 5px;text-transform:uppercase;}
  .chsc-nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:11px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .chsc-nav-item:hover{background:var(--glass-hover);color:var(--glass-text);}
  .chsc-nav-item.on{background:var(--glass-active);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-line);}
  .chsc-nav-item .ic{display:inline-flex;flex:0 0 auto;}
  .chsc-nav-item .nm{flex:1;min-width:0;font-size:13.5px;font-weight:600;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chsc-nav-item .ava-s{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:10px;font-weight:700;border:1.5px solid rgba(255,255,255,.72);flex:0 0 auto;}
  .chsc-empty{font-size:12px;color:var(--glass-sub);padding:6px 10px;}
  .chsc-nav-item.friends{font-weight:700;color:var(--glass-text);margin-bottom:2px;}
  .chsc-nav-bdg{display:inline-grid;place-items:center;min-width:16px;height:16px;border-radius:8px;padding:0 4px;
    font-size:9.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,#ef9db4,#e0718f);flex:0 0 auto;}

  /* right column: the conversation itself */
  .chsc-main{flex:1;min-width:0;display:flex;flex-direction:column;position:relative;}
  canvas.chsc-dust{position:absolute;inset:0;z-index:5;pointer-events:none;}

  .chsc-hd{display:flex;align-items:center;gap:11px;padding:16px 18px 13px;border-bottom:1px solid var(--glass-line);}
  .chsc-hd .ic{display:inline-flex;color:var(--accent-deep);}
  .chsc-ava{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,.72);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55);flex:0 0 auto;}
  .chsc-hd h3{margin:0;font-size:16.5px;font-weight:800;color:var(--glass-text);}
  .chsc-hd .topic{flex:1;min-width:0;font-size:12px;color:var(--glass-sub);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chsc-x{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-line);background:var(--glass-bg-2);transition:all .18s;}
  .chsc-x:hover{color:var(--glass-text);background:var(--glass-hover);}

  .chsc-msgs{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
  /* chatAlign='left' (default, Discord-style): own messages join the left
     flow too — identity stays readable via the blue bubble + 「我」 meta */
  .chsc-msgs.left .chsc-m.me{align-self:flex-start;align-items:flex-start;}
  .chsc-msgs.left .chsc-m.me .abar{right:auto;left:0;}
  .chsc-msgs.left .chsc-m.me .chsc-pop{right:auto;left:0;}
  .chsc-msgs.left .chsc-m.me .chsc-rx{justify-content:flex-start;}
  .chsc-msgs.left .chsc-read{align-self:flex-start;margin:-6px 0 0 4px;}
  .chsc-top-hint{text-align:center;font-size:11px;color:var(--glass-sub);padding:0 0 4px;flex:0 0 auto;}
  .chsc-msgs::-webkit-scrollbar{width:6px;}
  .chsc-msgs::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}
  .chsc-m{display:flex;flex-direction:column;max-width:68%;position:relative;}
  .chsc-m.me{align-self:flex-end;align-items:flex-end;}
  .chsc-m .meta{font-size:11px;color:var(--glass-sub);margin:0 6px 3px;}
  .chsc-m .bub{position:relative;padding:9px 13px;border-radius:15px;font-size:13.5px;line-height:1.6;color:var(--glass-text);
    background:var(--glass-paper);border:1px solid var(--glass-line);overflow-wrap:anywhere;}
  .chsc-m.me .bub{background:var(--accent-grad);color:#0d2336;border-color:transparent;}
  .chsc-m .edited{font-size:10px;color:var(--glass-sub);margin-left:5px;}
  .chsc-m.me .edited{color:rgba(13,35,54,.55);}

  /* sending: optimistic bubble, translucent shimmer + bobbing cloud (D-7 ①) */
  .chsc-m.sending .bub{opacity:.58;animation:chscSend 1.4s ease-in-out infinite;}
  @keyframes chscSend{0%,100%{opacity:.58}50%{opacity:.78}}
  .chsc-m .send-cloud{position:absolute;right:-22px;bottom:2px;font-size:13px;opacity:.75;
    animation:chscCloud 1.4s ease-in-out infinite;}
  @keyframes chscCloud{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

  /* failed: blush warning bubble + retry/discard row (D-7 ②) */
  .chsc-m.failed .bub{background:linear-gradient(135deg,rgba(248,215,223,.92),rgba(239,157,180,.82));
    border:1.5px solid #e0718f;color:#5e2a3a;}
  .chsc-fail{display:flex;align-items:center;gap:9px;font-size:11.5px;color:#e0718f;margin:4px 6px 0;font-weight:600;}
  .chsc-fail .lnk{cursor:pointer;text-decoration:underline;text-underline-offset:2px;}
  .chsc-fail .lnk.mute{color:var(--glass-sub);font-weight:500;}

  /* vanishing: bubble fades under the particles (D-7 ⑦) */
  .chsc-m.vanish{pointer-events:none;}
  .chsc-m.vanish .bub{opacity:0;transition:opacity .35s;}
  .chsc-m.vanish .abar,.chsc-m.vanish .chsc-rx{display:none;}

  /* hover action bar — the single entry for message ops (D-7 ④) */
  .abar{position:absolute;top:-30px;right:0;z-index:6;display:none;gap:2px;padding:3px 5px;border-radius:12px;
    background:var(--glass-paper);border:1px solid var(--glass-line);
    box-shadow:0 10px 24px -10px rgba(20,29,51,.4);}
  .chsc-m:not(.me) .abar{right:auto;left:0;}
  .chsc-m:hover .abar{display:flex;}
  .chsc-m.sending .abar,.chsc-m.failed .abar{display:none!important;}
  .abar button{appearance:none;border:0;background:transparent;cursor:pointer;font-size:14px;line-height:1;
    width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--glass-sub);padding:0;}
  .abar button:hover{background:var(--glass-hover);color:var(--glass-text);}
  .abar button:disabled{opacity:.35;cursor:default;}

  /* EmotePicker positioning wrapper (panel styles live in emote-picker.tsx) */
  .chsc-pop{position:absolute;top:26px;z-index:8;}
  .chsc-m.me .chsc-pop{right:0;} .chsc-m:not(.me) .chsc-pop{left:0;}

  /* sticker messages: naked render, no bubble (B-1/B-3, LINE-style) */
  .chsc-stkm{position:relative;width:110px;height:110px;}
  .chsc-stkm img{width:100%;height:100%;object-fit:contain;transition:transform .18s cubic-bezier(.34,1.5,.5,1);
    filter:drop-shadow(0 8px 16px rgba(20,29,51,.25));}
  .chsc-m:hover .chsc-stkm img{transform:translateY(-3px) scale(1.04);}
  .chsc-stk-ghost{width:110px;height:110px;border-radius:16px;display:grid;place-items:center;text-align:center;
    font-size:10.5px;color:var(--glass-sub);background:rgba(34,51,90,.06);border:1.5px dashed rgba(34,51,90,.2);padding:8px;}

  /* reaction chips (D-7 ⑤) */
  .chsc-rx{display:flex;gap:5px;margin:4px 4px 0;flex-wrap:wrap;}
  .chsc-m.me .chsc-rx{justify-content:flex-end;}
  .chsc-rx .rx{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;padding:2px 8px;border-radius:999px;
    cursor:pointer;background:var(--glass-paper);border:1px solid var(--glass-line);color:var(--glass-sub);}
  .chsc-rx .rx.on{background:var(--glass-active);border-color:var(--accent);color:var(--glass-text);font-weight:700;}

  /* inline edit (D-7 ⑥) */
  .chsc-edit{width:min(420px,100%);}
  .chsc-edit textarea{width:100%;resize:none;border-radius:13px;border:1.5px solid var(--accent);outline:none;
    background:var(--glass-paper);font:inherit;font-size:13.5px;line-height:1.6;padding:9px 13px;color:var(--glass-text);}
  .chsc-edit .hint{font-size:10.5px;color:var(--glass-sub);margin:3px 6px 0;}

  /* read cursor avatar — DMs ONLY (D-7-3 修订) */
  .chsc-read{align-self:flex-end;display:flex;gap:4px;margin:-6px 4px 0;}
  .chsc-read .ava{width:16px;height:16px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:8.5px;font-weight:700;border:1.5px solid rgba(255,255,255,.85);
    box-shadow:0 3px 8px -3px rgba(224,113,143,.6);animation:readPop .38s cubic-bezier(.34,1.6,.5,1) both;}
  @keyframes readPop{from{transform:translateY(-8px) scale(.5);opacity:0}to{transform:none;opacity:1}}

  .chsc-input{display:flex;gap:9px;padding:12px 16px 16px;border-top:1px solid var(--glass-line);position:relative;}
  .chsc-emo{appearance:none;cursor:pointer;width:42px;height:42px;border-radius:13px;flex:0 0 auto;
    border:1px solid var(--glass-line);background:var(--glass-bg-2);font-size:18px;line-height:1;
    display:grid;place-items:center;padding:0;transition:background .18s;}
  .chsc-emo:hover{background:var(--glass-hover);}
  /* anchored above its trigger (the 😊 button sits at the row's LEFT edge) */
  .chsc-pop.for-input{position:absolute;bottom:64px;left:14px;top:auto;right:auto;}
  .chsc-input input{flex:1;height:42px;border-radius:13px;border:1px solid var(--glass-line);
    background:var(--glass-paper);color:var(--glass-text);padding:0 14px;font:inherit;font-size:14px;outline:none;
    transition:border-color .18s,background .18s;}
  .chsc-input input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .chsc-input button[type=submit]{appearance:none;border:0;cursor:pointer;width:42px;height:42px;border-radius:13px;
    display:grid;place-items:center;color:#0d2336;background:var(--accent-grad);
    box-shadow:0 6px 16px -7px rgba(47,154,211,.75);}
  .chsc-input button[type=submit]:active{transform:scale(.94);}
  `}</style>
);

type ChannelScreenProps = {
    convId: string | null; // active conv: channel id, dm channel id, or FRIENDS_VIEW
    onSelect: (convId: string) => void; // hub-internal switching (same lifted state)
    inWorld: boolean; // channels are a world concept — lobby shows DMs only
    channels: Channel[]; // the world's channels (DB-driven)
    dmConvs: Conv[]; // my DM conversations (account-level, DB-driven)
    friends: FriendEntry[]; // friends page data + actions (chat.md DM 阶段)
    requestsIn: FriendRequest[];
    requestsOut: FriendRequest[];
    onAddFriend: (email: string) => Promise<string>;
    onAcceptFriend: (otherId: string) => void;
    onRemoveFriend: (otherId: string) => void;
    onClose: () => void;
    threads: Record<string, Msg[]>;
    onSend: (convId: string, text: string) => void;
    onLoadOlder: (convId: string) => void; // upward pagination
    reachedStart: Record<string, boolean>; // conversation has no older messages
    reads: Record<string, Record<string, string>>; // channelId → userId → last_read_at
    onRetry: (msgId: string) => void;
    onDiscard: (msgId: string) => void;
    onEdit: (msgId: string, content: string) => void;
    onDelete: (msgId: string) => void;
    onReact: (msgId: string, emoji: string) => void;
    // emote system (chat.md 表情系统): shared world sticker library
    emotes: EmoteView[];
    hasWorld: boolean; // the library is world-scoped — no world, no importing
    onSendSticker: (convId: string, emote: EmoteView) => void;
    onSearchWeb: (q: string) => Promise<EmoteSearchResult[]>;
    onImportUrl: (url: string, name: string) => Promise<void>;
    onImportFile: (file: File, name: string) => Promise<void>;
    onRemoveEmote: (id: string) => void;
    // viewing a conversation moves our own read cursor — displayed in DMs,
    // silent bookkeeping in channels (D-7-3 修订)
    onSeen: (convId: string) => void;
    chatAlign: ChatAlign; // 'left' = everyone left (default) | 'sides'
};

// dissolve a bubble into glass-star dust (telegram-style, D-7 ⑦)
function explodeBubble(canvas: HTMLCanvasElement, host: HTMLElement, el: HTMLElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sr = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    canvas.width = sr.width;
    canvas.height = sr.height;
    const x0 = r.left - sr.left;
    const y0 = r.top - sr.top;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number; c: string; delay: number };
    const parts: P[] = [];
    const cols = Math.max(4, Math.floor(r.width / 7));
    const rows = Math.max(3, Math.floor(r.height / 7));
    for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++)
            parts.push({
                x: x0 + i * 7 + Math.random() * 4,
                y: y0 + j * 7 + Math.random() * 4,
                vx: (Math.random() - 0.3) * 1.6,
                vy: -Math.random() * 1.8 - 0.4,
                r: Math.random() * 2.2 + 0.8,
                a: 1,
                da: 0.012 + Math.random() * 0.02,
                c: VANISH_COLORS[Math.floor(Math.random() * VANISH_COLORS.length)],
                delay: (i / cols) * 18 // dissolve left→right
            });
    const tick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of parts) {
            if (p.delay > 0) {
                p.delay--;
                alive = true;
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.01;
            p.a -= p.da;
            if (p.a <= 0) continue;
            alive = true;
            ctx.globalAlpha = p.a;
            ctx.fillStyle = p.c;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 7);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (alive) requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    tick();
}

export function ChannelScreen({
    convId,
    onSelect,
    inWorld,
    channels,
    dmConvs,
    friends,
    requestsIn,
    requestsOut,
    onAddFriend,
    onAcceptFriend,
    onRemoveFriend,
    onClose,
    threads,
    onSend,
    onLoadOlder,
    reachedStart,
    reads,
    onRetry,
    onDiscard,
    onEdit,
    onDelete,
    onReact,
    emotes,
    hasWorld,
    onSendSticker,
    onSearchWeb,
    onImportUrl,
    onImportFile,
    onRemoveEmote,
    onSeen,
    chatAlign
}: ChannelScreenProps) {
    const [text, setText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [pickerFor, setPickerFor] = useState<string | null>(null);
    const [inputPicker, setInputPicker] = useState(false); // composer emoji palette
    const composerRef = useRef<HTMLInputElement>(null);
    const msgsRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const dustRef = useRef<HTMLCanvasElement>(null);
    const bubbleEls = useRef(new Map<string, HTMLElement>());
    const explodedIds = useRef(new Set<string>());
    // scroll anchor across an upward page load: keep the viewport pinned to
    // the messages it was showing while older ones are prepended above
    const anchorRef = useRef<{ h: number; top: number } | null>(null);
    // render-time adjustment: drop the unsent draft + edit/picker state when
    // switching conversations
    const [prevConv, setPrevConv] = useState(convId);
    if (convId !== prevConv) {
        setPrevConv(convId);
        setText('');
        setEditingId(null);
        setPickerFor(null);
        setInputPicker(false);
    }
    const isFriends = convId === FRIENDS_VIEW;
    const ch = isFriends ? undefined : channels.find((c) => c.id === convId && c.type === 'text');
    const dm = ch || isFriends ? undefined : dmConvs.find((c) => c.id === convId);
    const msgs = useMemo(() => (convId && threads[convId]) || [], [convId, threads]);
    const convs = convsFor(inWorld, channels, dmConvs);
    const chConvs = convs.filter((c) => c.kind === 'channel');

    // DM read cursor: index of the last message the friend has read (their
    // avatar renders right below it). Channels never show read state.
    const readCursorIdx = useMemo(() => {
        if (!dm?.otherId || !convId) return -1;
        const at = reads[convId]?.[dm.otherId];
        if (!at) return -1;
        const t = Date.parse(at);
        let idx = -1;
        msgs.forEach((m, i) => {
            if (!m.pending && !m.failed && Date.parse(m.ts) <= t) idx = i;
        });
        return idx;
    }, [dm, convId, reads, msgs]);
    const readAt = dm?.otherId && convId ? reads[convId]?.[dm.otherId] : undefined;

    // a stale anchor must not survive a conversation switch (declared before
    // the scroll effect so it clears first on the same commit)
    useEffect(() => {
        anchorRef.current = null;
    }, [convId]);

    useEffect(() => {
        const el = msgsRef.current;
        if (!el) return;
        const a = anchorRef.current;
        if (a) {
            // older page prepended — restore the visual position
            anchorRef.current = null;
            el.scrollTop = el.scrollHeight - a.h + a.top;
        } else {
            el.scrollTop = el.scrollHeight;
        }
    }, [threads, convId]);

    // viewing a conversation = reading it (throttled inside the hook;
    // the friends page is not a conversation)
    useEffect(() => {
        if (convId && convId !== FRIENDS_VIEW) onSeen(convId);
    }, [convId, threads, onSeen]);

    // play the glass-dust effect once per vanishing message (both the local
    // delete and the remote DELETE echo land here via the vanishing flag)
    useEffect(() => {
        const canvas = dustRef.current;
        const host = mainRef.current;
        if (!canvas || !host) return;
        for (const m of msgs) {
            if (!m.vanishing || explodedIds.current.has(m.id)) continue;
            explodedIds.current.add(m.id);
            const el = bubbleEls.current.get(m.id);
            if (el) explodeBubble(canvas, host, el);
        }
    }, [msgs]);

    // near the top of a conversation → pull the previous page (hook dedupes)
    const onScroll = () => {
        const el = msgsRef.current;
        if (!el || !convId || (!ch && !dm) || reachedStart[convId]) return;
        if (el.scrollTop < 40) {
            anchorRef.current = { h: el.scrollHeight, top: el.scrollTop };
            onLoadOlder(convId);
        }
    };

    if (!convId || (!isFriends && !ch && !dm)) return null;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(convId, text);
        setText('');
        setInputPicker(false);
    };

    // insert an emoji at the composer caret, keep typing position; the
    // picker stays open for multi-pick (click outside / send to dismiss)
    const insertEmoji = (em: string) => {
        const el = composerRef.current;
        const pos = el?.selectionStart ?? text.length;
        setText(text.slice(0, pos) + em + text.slice(pos));
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(pos + em.length, pos + em.length);
        });
    };

    const beginEdit = (m: Msg) => {
        setPickerFor(null);
        setEditingId(m.id);
        setEditText(m.text);
    };
    const commitEdit = () => {
        if (editingId) onEdit(editingId, editText);
        setEditingId(null);
    };

    return (
        <>
            <ChannelStyles />
            <div className="chsc-scrim" onClick={onClose} />
            <div className="chsc glass">
                {/* conversation switcher — same set as the dock tabs (convsFor),
                    plus the pinned friends entry (Discord-style, above DMs) */}
                <div className="chsc-nav">
                    <div className={`chsc-nav-item friends ${isFriends ? 'on' : ''}`} onClick={() => onSelect(FRIENDS_VIEW)} title="好友">
                        <span className="ic">💗</span>
                        <span className="nm">好友</span>
                        {requestsIn.length > 0 && <span className="chsc-nav-bdg">{requestsIn.length}</span>}
                    </div>
                    {chConvs.length > 0 && (
                        <>
                            <div className="chsc-cat">文字频道</div>
                            {chConvs.map((c) => (
                                <div key={c.id} className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`} onClick={() => onSelect(c.id)} title={c.hint}>
                                    <span className="ic">
                                        <IHash size={15} />
                                    </span>
                                    <span className="nm">{c.name}</span>
                                </div>
                            ))}
                        </>
                    )}
                    <div className="chsc-cat">私信</div>
                    {dmConvs.length === 0 && <div className="chsc-empty">添加好友后这里会出现私信</div>}
                    {dmConvs.map((c) => (
                        <div key={c.id} className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`} onClick={() => onSelect(c.id)} title={`私信 ${c.name}`}>
                            <span className="ava-s" style={{ background: c.color }}>
                                {c.ini}
                            </span>
                            <span className="nm">{c.name}</span>
                        </div>
                    ))}
                </div>

                <div className="chsc-main" ref={mainRef}>
                    {isFriends ? (
                        <FriendsPage
                            friends={friends}
                            requestsIn={requestsIn}
                            requestsOut={requestsOut}
                            onAddFriend={onAddFriend}
                            onAccept={onAcceptFriend}
                            onRemove={onRemoveFriend}
                            onOpenDm={onSelect}
                            onClose={onClose}
                        />
                    ) : (
                        <>
                    <div className="chsc-hd">
                        {ch ? (
                            <span className="ic">
                                <IHash size={18} />
                            </span>
                        ) : (
                            <span className="chsc-ava" style={{ background: dm!.color }}>
                                {dm!.ini}
                            </span>
                        )}
                        <h3>{ch ? ch.name : dm!.name}</h3>
                        <span className="topic">{ch ? ch.topic : '私信 · 只有你们两个人看得到'}</span>
                        <div className="chsc-x" onClick={onClose} title="关闭">
                            <IClose size={16} />
                        </div>
                    </div>
                    <div
                        className={`chsc-msgs ${chatAlign === 'left' ? 'left' : ''}`}
                        ref={msgsRef}
                        onScroll={onScroll}
                        onClick={() => {
                            setPickerFor(null);
                            setInputPicker(false);
                        }}
                    >
                        <div className="chsc-top-hint">
                            {reachedStart[convId] ? (ch ? '这里是这个频道的开头 ✨' : '这里是你们私信的开头 ✨') : '上滚加载更早的消息…'}
                        </div>
                        {msgs.map((m, i) => {
                            const own = m.from === 'me';
                            const canOp = !m.pending && !m.failed && !m.vanishing;
                            if (editingId === m.id && own) {
                                return (
                                    <div key={m.id} className="chsc-m me chsc-edit">
                                        <textarea
                                            rows={Math.min(6, Math.max(1, editText.split('\n').length))}
                                            value={editText}
                                            autoFocus
                                            onChange={(e) => setEditText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    commitEdit();
                                                } else if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                }
                                            }}
                                        />
                                        <div className="hint">Enter 保存 · Esc 取消</div>
                                    </div>
                                );
                            }
                            return (
                                <div key={m.id} className={`chsc-m ${own ? 'me' : ''} ${m.pending ? 'sending' : ''} ${m.failed ? 'failed' : ''} ${m.vanishing ? 'vanish' : ''}`}>
                                    <span className="meta">
                                        {own ? '我' : m.sender || '对方'} · {m.time}
                                        {m.edited && <span className="edited">(已编辑)</span>}
                                    </span>
                                    {m.kind === 'sticker' ? (
                                        <span
                                            className="chsc-stkm"
                                            ref={(el) => {
                                                if (el) bubbleEls.current.set(m.id, el);
                                                else bubbleEls.current.delete(m.id);
                                            }}
                                        >
                                            {m.emoteGone ? (
                                                <span className="chsc-stk-ghost">✨ 这张贴纸已被移出表情库</span>
                                            ) : m.emoteUrl ? (
                                                <img src={m.emoteUrl} alt={m.text} title={m.text} />
                                            ) : (
                                                <span className="chsc-stk-ghost">{m.text}</span>
                                            )}
                                            {m.pending && <span className="send-cloud">☁️</span>}
                                        </span>
                                    ) : (
                                        <span
                                            className="bub"
                                            ref={(el) => {
                                                if (el) bubbleEls.current.set(m.id, el);
                                                else bubbleEls.current.delete(m.id);
                                            }}
                                        >
                                            {m.text}
                                            {m.pending && <span className="send-cloud">☁️</span>}
                                        </span>
                                    )}
                                    {canOp && (
                                        <div className="abar" onClick={(e) => e.stopPropagation()}>
                                            {QUICK_EMOJI.map((em) => (
                                                <button key={em} type="button" onClick={() => onReact(m.id, em)}>
                                                    {em}
                                                </button>
                                            ))}
                                            <button type="button" title="更多表情" onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}>
                                                ➕
                                            </button>
                                            {own && (
                                                <>
                                                    {m.kind !== 'sticker' && (
                                                        <button type="button" title="编辑" onClick={() => beginEdit(m)}>
                                                            ✏️
                                                        </button>
                                                    )}
                                                    <button type="button" title="删除" onClick={() => onDelete(m.id)}>
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                            <button type="button" title="回复（即将上线）" disabled>
                                                ↩︎
                                            </button>
                                        </div>
                                    )}
                                    {pickerFor === m.id && (
                                        <div className="chsc-pop" onClick={(e) => e.stopPropagation()}>
                                            <EmotePicker
                                                mode="reaction"
                                                emotes={emotes}
                                                canImport={false}
                                                onPickEmoji={(em) => {
                                                    onReact(m.id, em);
                                                    setPickerFor(null);
                                                }}
                                                onSearchWeb={onSearchWeb}
                                                onImportUrl={onImportUrl}
                                                onImportFile={onImportFile}
                                                onRemoveEmote={onRemoveEmote}
                                            />
                                        </div>
                                    )}
                                    {m.failed && (
                                        <div className="chsc-fail">
                                            🌧️ 没送出去
                                            <span className="lnk" onClick={() => onRetry(m.id)}>
                                                重试
                                            </span>
                                            <span className="lnk mute" onClick={() => onDiscard(m.id)}>
                                                删除
                                            </span>
                                        </div>
                                    )}
                                    {!!m.reactions?.length && (
                                        <div className="chsc-rx">
                                            {m.reactions.map((rx) => (
                                                <span
                                                    key={rx.emoji}
                                                    className={`rx ${rx.mine ? 'on' : ''}`}
                                                    title={rx.users.join('、')}
                                                    onClick={() => canOp && onReact(m.id, rx.emoji)}
                                                >
                                                    {rx.emoji} {rx.count}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {dm && i === readCursorIdx && (
                                        <div className="chsc-read">
                                            <span
                                                // remount at a new position replays the pop-in
                                                key={`${dm.otherId}:${i}`}
                                                className="ava"
                                                style={{ background: dm.color }}
                                                title={readAt ? `${dm.name} 已读 ${new Date(readAt).toTimeString().slice(0, 5)}` : `${dm.name} 已读`}
                                            >
                                                {dm.ini}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <canvas className="chsc-dust" ref={dustRef} />
                    <form className="chsc-input" onSubmit={submit}>
                        <button type="button" className="chsc-emo" title="表情" onClick={() => setInputPicker((v) => !v)}>
                            😊
                        </button>
                        {inputPicker && (
                            <div className="chsc-pop for-input" onClick={(e) => e.stopPropagation()}>
                                <EmotePicker
                                    mode="composer"
                                    emotes={emotes}
                                    canImport={hasWorld}
                                    onPickEmoji={insertEmoji}
                                    onPickSticker={(emote) => {
                                        onSendSticker(convId, emote);
                                        setInputPicker(false);
                                    }}
                                    onSearchWeb={onSearchWeb}
                                    onImportUrl={onImportUrl}
                                    onImportFile={onImportFile}
                                    onRemoveEmote={onRemoveEmote}
                                />
                            </div>
                        )}
                        <input
                            key={convId}
                            ref={composerRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={ch ? `在 #${ch.name} 说点什么…` : `发给 ${dm!.name}…`}
                            maxLength={500}
                            spellCheck={false}
                            autoFocus
                        />
                        <button type="submit" aria-label="发送">
                            <ISend size={17} />
                        </button>
                    </form>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
