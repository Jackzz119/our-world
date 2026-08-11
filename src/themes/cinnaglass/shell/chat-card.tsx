// chat-card.tsx — bottom-left chat card, rebuilt 1:1 against the codex
// pixel spec (§5.6): 277-wide dense-glass card, 61px ringed avatars
// (real avatar art), 17px-radius bubbles, a floating reaction pill and a
// 56px input group. Materials come from --cg-* tokens.

import { useEffect, useRef, useState } from 'react';
import type { Channel } from '@/types/chat.ts';
import type { Conv } from '../chat-data';
import { convsFor } from '../chat-data';
import type { Msg } from '../model';
import { IClose, IExpand, ISend } from '../icons';

const QUICK = [
    { emoji: '❤️', cls: 'q-heart' },
    { emoji: '🌟', cls: 'q-star' }
];

const AVATARS: Record<'me' | 'her', string> = {
    me: '/avatars/blue.png',
    her: '/avatars/pink.png'
};

type ChatCardProps = {
    open: boolean;
    onClose: () => void;
    onExpand: () => void; // full conversation hub
    inWorld: boolean;
    channels: Channel[];
    dmConvs: Conv[];
    threads: Record<string, Msg[]>;
    onSend: (convId: string, text: string) => void;
    onSeen: (convId: string) => void;
};

export function ChatCard({ open, onClose, onExpand, inWorld, channels, dmConvs, threads, onSend, onSeen }: ChatCardProps) {
    const [text, setText] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const convs = convsFor(inWorld, channels, dmConvs);
    const cur = convs[0]?.id ?? '';
    const msgs = (threads[cur] || []).filter((m) => !m.vanishing).slice(-40);

    // reading the card = reading the conversation
    useEffect(() => {
        if (open && cur) onSeen(cur);
    }, [open, cur, msgs.length, onSeen]);

    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [msgs.length, open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    if (!open || !cur) return null;

    const submit = () => {
        const t = text.trim();
        if (!t) return;
        onSend(cur, t);
        setText('');
    };

    return (
        <div className="chat-card">
            <ChatCardStyles />
            <div className="cc-head">
                <button className="cc-hbtn" title="展开完整聊天" onClick={onExpand}>
                    <IExpand size={14} sw={2.2} />
                </button>
                <button className="cc-hbtn" title="收起" onClick={onClose}>
                    <IClose size={15} sw={2.2} />
                </button>
            </div>
            <div className="cc-list" ref={listRef}>
                {msgs.map((m) => (
                    <div key={m.id} className={`cc-msg ${m.from === 'me' ? 'me' : ''}`}>
                        <span className={`cc-ava ${m.from === 'me' ? 'blue' : 'pink'}`}>
                            <img src={m.from === 'me' ? AVATARS.me : AVATARS.her} alt="" draggable={false} />
                            <i className="cc-on" />
                        </span>
                        {m.kind === 'sticker' && m.stickerUrl ? (
                            <img className="cc-sticker" src={m.stickerUrl} alt="" draggable={false} />
                        ) : (
                            <span className="cc-bubble">{m.text}</span>
                        )}
                    </div>
                ))}
                {msgs.length === 0 && <div className="cc-empty">说点什么吧，她会看到的</div>}
            </div>
            {/* spec: floating reaction pill (101×46 r23) */}
            <div className="cc-quick">
                {QUICK.map((q) => (
                    <button key={q.emoji} className={`cc-q ${q.cls}`} onClick={() => onSend(cur, q.emoji)}>
                        {q.emoji}
                    </button>
                ))}
            </div>
            {/* spec: input group 244×56 r28, 38px round send */}
            <div className="cc-input">
                <input
                    ref={inputRef}
                    value={text}
                    placeholder="悄悄说…"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                        e.stopPropagation();
                    }}
                />
                <button className="cc-send" onClick={submit} title="发送">
                    <ISend size={18} sw={2.6} />
                </button>
            </div>
        </div>
    );
}

const ChatCardStyles = () => (
    <style>{`
    /* spec 5.6: 277 wide, r22, dense glass for readability */
    .chat-card{
        position:absolute;left:101px;bottom:44px;z-index:38;
        width:277px;display:flex;flex-direction:column;
        border-radius:22px;
        background:var(--cg-panel-dense);
        border:1px solid var(--cg-stroke);
        backdrop-filter:var(--cg-blur);
        box-shadow:var(--cg-shadow), var(--cg-inset);
        animation:ccpop 220ms cubic-bezier(0.34,1.3,0.5,1);
        transform-origin:left bottom;
    }
    @keyframes ccpop{0%{opacity:0;transform:scale(0.92) translateY(6px);}100%{opacity:1;transform:scale(1) translateY(0);}}
    .cc-head{display:flex;justify-content:flex-end;gap:2px;padding:10px 12px 0;}
    .cc-hbtn{
        appearance:none;border:0;cursor:pointer;display:flex;padding:5px;
        border-radius:8px;background:transparent;color:var(--cg-icon);
        opacity:0.65;transition:opacity 160ms ease,background 160ms ease;
    }
    .cc-hbtn:hover{opacity:1;background:var(--cg-control);}
    .cc-list{
        max-height:236px;min-height:100px;overflow-y:auto;
        display:flex;flex-direction:column;gap:20px;padding:8px 16px 10px;
        scrollbar-width:thin;
    }
    .cc-msg{display:flex;align-items:flex-start;gap:14px;}
    .cc-msg.me{flex-direction:row-reverse;}
    /* spec: 61px outer ring (2px light + color ring), 53px visible avatar,
       15px green presence dot at the lower-right of the ring */
    .cc-ava{
        flex:none;position:relative;width:61px;height:61px;border-radius:50%;
        padding:4px;
    }
    .cc-ava.blue{box-shadow:inset 0 0 0 2px #E9EDF4, inset 0 0 0 4px rgba(126,164,244,0.85);}
    .cc-ava.pink{box-shadow:inset 0 0 0 2px #F4E8EB, inset 0 0 0 4px rgba(244,168,190,0.85);}
    .cc-ava img{display:block;width:53px;height:53px;border-radius:50%;}
    .cc-on{
        position:absolute;right:1px;bottom:3px;width:15px;height:15px;border-radius:50%;
        background:#7FF48E;border:2px solid #DFF6E2;
        box-shadow:0 0 6px rgba(127,244,142,0.7);
    }
    /* spec: bubble r17, misty blank tone — real text needs a darker ink */
    .cc-bubble{
        max-width:150px;margin-top:6px;padding:11px 14px;border-radius:17px;
        font-size:13px;line-height:1.45;color:#2A3040;
        background:rgba(224,216,226,0.92);
        overflow-wrap:anywhere;
    }
    .cc-sticker{width:84px;height:84px;object-fit:contain;margin-top:4px;}
    .cc-empty{padding:26px 0;text-align:center;font-size:12px;color:var(--cg-icon-muted);}
    /* spec: reaction pill 101×46 r23 rgba(91,91,116,.54), centered-ish */
    .cc-quick{
        align-self:center;margin:0 0 4px -20px;
        display:flex;align-items:center;justify-content:center;gap:10px;
        width:101px;height:46px;border-radius:23px;
        background:rgba(91,91,116,0.54);
        border:1px solid rgba(233,231,242,0.28);
    }
    .cc-q{
        appearance:none;border:0;cursor:pointer;padding:2px;
        background:transparent;font-size:20px;line-height:1;
        transition:transform 120ms ease,filter 160ms ease;
    }
    .cc-q.q-heart{filter:drop-shadow(0 0 7px rgba(251,167,185,0.8));}
    .cc-q.q-star{filter:drop-shadow(0 0 7px rgba(253,203,125,0.8));}
    .cc-q:hover{transform:translateY(-1px) scale(1.08);}
    .cc-q:active{transform:scale(0.9);}
    /* spec: input group 244×56 r28 with its own 1px edge */
    .cc-input{
        display:flex;align-items:center;gap:8px;
        width:244px;height:56px;border-radius:28px;
        margin:0 auto 14px;padding:0 9px;
        border:1px solid rgba(220,218,231,0.32);
    }
    .cc-input input{
        flex:1;min-width:0;appearance:none;border:0;outline:0;
        height:37px;padding:0 14px;border-radius:18.5px;
        font-size:13px;color:var(--cg-icon);
        background:rgba(101,102,115,0.75);
    }
    .cc-input input::placeholder{color:rgba(240,244,252,0.4);}
    .cc-send{
        flex:none;appearance:none;border:0;cursor:pointer;
        width:38px;height:38px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        background:var(--cg-control-strong);color:var(--cg-icon);
        border:1px solid var(--cg-stroke);
        transition:filter 160ms ease,transform 120ms ease;
    }
    .cc-send:hover{filter:brightness(1.12);}
    .cc-send:active{transform:scale(0.9);}
    `}</style>
);
