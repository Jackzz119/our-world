// chat-card.tsx — the narrow chat card of the v2 shell (concept-c,
// bottom-left). Replaces the WoW-style ChatDock: message list on a
// semi-solid backing (glass + small text is a documented readability
// trap), quick-reaction row, one input line. The full hub stays one
// click away via the expand glyph.

import { useEffect, useRef, useState } from 'react';
import type { Channel } from '@/types/chat.ts';
import type { Conv } from '../chat-data';
import { convsFor } from '../chat-data';
import type { Msg } from '../model';
import { IClose, IExpand, ISend } from '../icons';

const QUICK_EMOJI = ['❤️', '🌟', '🫂', '😴'];

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
                    <IExpand size={13} />
                </button>
                <button className="cc-hbtn" title="收起" onClick={onClose}>
                    <IClose size={14} />
                </button>
            </div>
            <div className="cc-list" ref={listRef}>
                {msgs.map((m) => (
                    <div key={m.id} className={`cc-msg ${m.from === 'me' ? 'me' : ''}`}>
                        <span className="cc-ava">{(m.from === 'me' ? '我' : (m.sender ?? '她')).slice(0, 1)}</span>
                        {m.kind === 'sticker' && m.stickerUrl ? (
                            <img className="cc-sticker" src={m.stickerUrl} alt="" draggable={false} />
                        ) : (
                            <span className="cc-bubble">{m.text}</span>
                        )}
                    </div>
                ))}
                {msgs.length === 0 && <div className="cc-empty">说点什么吧，她会看到的</div>}
            </div>
            <div className="cc-quick">
                {QUICK_EMOJI.map((e) => (
                    <button key={e} className="cc-q" onClick={() => onSend(cur, e)}>
                        {e}
                    </button>
                ))}
            </div>
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
                    <ISend size={14} />
                </button>
            </div>
        </div>
    );
}

const ChatCardStyles = () => (
    <style>{`
    .chat-card{
        position:absolute;left:80px;bottom:16px;z-index:38;
        width:290px;display:flex;flex-direction:column;
        border-radius:18px;overflow:hidden;
        background:linear-gradient(160deg,rgba(58,66,102,0.66),rgba(36,42,72,0.64));
        border:1px solid rgba(255,255,255,0.22);
        backdrop-filter:blur(22px) saturate(1.2);
        box-shadow:0 16px 44px rgba(8,12,30,0.45),
                   inset 0 1px 0 rgba(255,255,255,0.16);
        animation:ccpop 220ms cubic-bezier(0.34,1.3,0.5,1);
        transform-origin:left bottom;
    }
    @keyframes ccpop{0%{opacity:0;transform:scale(0.92) translateY(6px);}100%{opacity:1;transform:scale(1) translateY(0);}}
    .cc-head{display:flex;justify-content:flex-end;gap:2px;padding:6px 8px 0;}
    .cc-hbtn{
        appearance:none;border:0;cursor:pointer;display:flex;padding:5px;
        border-radius:8px;background:transparent;color:rgba(238,242,252,0.5);
        transition:background 160ms ease,color 160ms ease;
    }
    .cc-hbtn:hover{background:rgba(255,255,255,0.1);color:rgba(238,242,252,0.95);}
    .cc-list{
        max-height:230px;min-height:96px;overflow-y:auto;
        display:flex;flex-direction:column;gap:8px;padding:6px 12px 8px;
        scrollbar-width:thin;
    }
    .cc-msg{display:flex;align-items:flex-end;gap:7px;}
    .cc-msg.me{flex-direction:row-reverse;}
    .cc-ava{
        flex:none;width:24px;height:24px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;color:#fff;background:linear-gradient(135deg,#EF9DB4,#D97BA0);
    }
    .cc-msg.me .cc-ava{background:linear-gradient(135deg,#8FC4EE,#5E9FD8);}
    .cc-bubble{
        max-width:200px;padding:7px 11px;border-radius:14px;
        font-size:13px;line-height:1.45;color:#2A3040;
        background:rgba(248,250,255,0.95);
        overflow-wrap:anywhere;
    }
    .cc-msg.me .cc-bubble{background:rgba(210,230,250,0.95);}
    .cc-sticker{width:84px;height:84px;object-fit:contain;}
    .cc-empty{padding:24px 0;text-align:center;font-size:12px;color:rgba(238,242,252,0.4);}
    .cc-quick{display:flex;gap:4px;padding:0 10px 6px;}
    .cc-q{
        appearance:none;border:0;cursor:pointer;padding:4px 8px;
        border-radius:10px;background:rgba(255,255,255,0.07);font-size:14px;
        transition:background 160ms ease,transform 120ms ease;
    }
    .cc-q:hover{background:rgba(255,255,255,0.16);transform:translateY(-1px);}
    .cc-q:active{transform:scale(0.9);}
    .cc-input{
        display:flex;align-items:center;gap:6px;padding:8px 10px 10px;
        border-top:1px solid rgba(255,255,255,0.08);
    }
    .cc-input input{
        flex:1;appearance:none;border:0;outline:0;padding:8px 12px;
        border-radius:999px;font-size:13px;color:#F0F4FC;
        background:rgba(255,255,255,0.1);
    }
    .cc-input input::placeholder{color:rgba(240,244,252,0.35);}
    .cc-send{
        appearance:none;border:0;cursor:pointer;display:flex;padding:8px;
        border-radius:50%;color:#fff;
        background:linear-gradient(135deg,#8FC4EE,#6FA8DC);
        transition:transform 120ms ease,filter 160ms ease;
    }
    .cc-send:hover{filter:brightness(1.08);}
    .cc-send:active{transform:scale(0.9);}
    `}</style>
);
