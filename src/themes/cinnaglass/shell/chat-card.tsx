// A scene-side conversation window; the full hub owns history and advanced message actions.
import { useEffect, useRef, useState } from 'react';
import type { Channel } from '@/types/chat';
import { convsFor, type Conv, type Msg } from '@/themes/cinnaglass/chat/chat-data';
import type { ChatAlign } from '@/themes/cinnaglass/tweaks';
import '@/themes/cinnaglass/shell/chat-card.css';
import { IClose, IExpand, ISend } from '@/themes/cinnaglass/icons';
import { avatarSrc, PARTNER, VIEWER } from '@/themes/cinnaglass/cast';

// One-tap reactions; they send as ordinary messages, not as reaction rows.
const QUICK = [
    { emoji: '❤️', cls: 'q-heart' },
    { emoji: '🌟', cls: 'q-star' }
];

// The two people's portraits by who is on this device (cast.ts); real per-account avatars are not wired yet.
const AVATARS: Record<'me' | 'her', string> = {
    me: avatarSrc(VIEWER),
    her: avatarSrc(PARTNER)
};

// The card owns no server state — everything comes from useChatThreads through WorldPage.
type ChatCardProps = {
    open: boolean;
    chatAlign?: ChatAlign;
    onClose: () => void;
    onExpand: () => void; // full conversation hub
    inWorld: boolean;
    channels: Channel[];
    dmConvs: Conv[];
    threads: Record<string, Msg[]>;
    onSend: (convId: string, text: string) => void;
    onSeen: (convId: string) => void;
    notice?: string | null; // one-line "that did not save" from the write side
};

// Renders the first conversation only (no switcher, by design) and keeps the list pinned to the
// bottom. Opening the card, or a new message arriving while it is open, moves our read cursor.
export function ChatCard({
    open,
    chatAlign = 'left',
    onClose,
    onExpand,
    inWorld,
    channels,
    dmConvs,
    threads,
    onSend,
    onSeen,
    notice
}: ChatCardProps) {
    const [text, setText] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // The tail the card shows: 40 messages, already-deleted ones filtered out so no particle plays
    // here.
    const convs = convsFor(inWorld, channels, dmConvs);
    const cur = convs[0]?.id ?? '';
    const msgs = (threads[cur] || []).filter((m) => !m.vanishing).slice(-40);

    // reading the card = reading the conversation
    useEffect(() => {
        if (open && cur) onSeen(cur);
    }, [open, cur, msgs.length, onSeen]);

    // Stick to the newest message.
    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [msgs.length, open]);

    // Keyboard users can type immediately; touch users open the keyboard only by tapping the input.
    useEffect(() => {
        if (!open || !cur) return;
        const opener = document.activeElement;
        const card = cardRef.current;
        if (matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
        return () => {
            if (
                opener instanceof HTMLElement &&
                opener.isConnected &&
                (document.activeElement === document.body || card?.contains(document.activeElement))
            )
                opener.focus();
        };
    }, [open, cur]);

    if (!open) return null;

    // Send the trimmed draft and clear the box; empty input is a no-op.
    const submit = () => {
        const t = text.trim();
        if (!t || !cur) return;
        onSend(cur, t);
        setText('');
    };

    return (
        <div
            ref={cardRef}
            className="chat-card ui-surface"
            data-align={chatAlign}
            role="region"
            aria-label="聊天窗口"
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }
            }}
        >
            <div className="cc-head">
                <span className="cc-title">悄悄话</span>
                <button className="cc-hbtn ui-icon-button" title="展开完整聊天" onClick={onExpand}>
                    <IExpand size={14} sw={2.2} />
                </button>
                <button className="cc-hbtn ui-icon-button" title="收起" onClick={onClose}>
                    <IClose size={15} sw={2.2} />
                </button>
            </div>
            <div className="cc-list ui-liner" ref={listRef}>
                {msgs.map((m) => (
                    <div key={m.id} className={`cc-msg ${m.from === 'me' ? 'me' : ''}`}>
                        <span className={`cc-ava ${m.from === 'me' ? 'blue' : 'pink'}`}>
                            <img src={m.from === 'me' ? AVATARS.me : AVATARS.her} alt="" draggable={false} />
                        </span>
                        {m.kind === 'sticker' && m.emoteUrl ? (
                            <img className="cc-sticker" src={m.emoteUrl} alt="" draggable={false} />
                        ) : (
                            <span className="cc-bubble">
                                {m.text}
                                {m.failed && <small className="cc-failed">未发送 · 展开聊天可重试</small>}
                                {m.pending && <small>发送中…</small>}
                            </span>
                        )}
                    </div>
                ))}
                {msgs.length === 0 && (
                    <div className="cc-empty">{cur ? '说点什么吧，对方会看到的' : '聊天暂未准备好，请稍后再试'}</div>
                )}
            </div>
            {/* spec: floating reaction pill (101×46 r23) */}
            <div className="cc-quick">
                {QUICK.map((q) => (
                    <button
                        type="button"
                        key={q.emoji}
                        className={`cc-q ${q.cls}`}
                        aria-label={`发送${q.emoji}`}
                        disabled={!cur}
                        onClick={() => onSend(cur, q.emoji)}
                    >
                        {q.emoji}
                    </button>
                ))}
            </div>
            {notice && (
                <div className="cc-notice" role="status">
                    {notice}
                </div>
            )}
            {/* spec: input group 244×56 r28, 38px round send */}
            <div className="cc-input">
                <input
                    ref={inputRef}
                    value={text}
                    placeholder="悄悄说…"
                    aria-label="聊天消息"
                    autoComplete="off"
                    disabled={!cur}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) submit();
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            onClose();
                        }
                        e.stopPropagation();
                    }}
                />
                <button
                    type="button"
                    className="cc-send ui-icon-button ui-button-primary"
                    onClick={submit}
                    title="发送"
                    disabled={!cur || !text.trim()}
                >
                    <ISend size={18} sw={2.6} />
                </button>
            </div>
        </div>
    );
}
