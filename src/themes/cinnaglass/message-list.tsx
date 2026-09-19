// message-list.tsx — the chat hub's right-hand message flow: the bubbles themselves, the hover
// action bar, inline edit, reaction chips, the failed-send row, the DM read avatar and the
// glass-dust canvas the delete effect draws on. The hub mounts it with key={convId}, so an open
// edit box or reaction picker cannot survive a conversation switch — that remount is the reset.
// Split out of channel-screen.tsx. Message states / hover bar / reactions / delete particles follow
// D-7 in ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:53; the read avatar
// renders in DMs ONLY (D-7-3 修订 — ai/features/chat.md:61).
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmotePicker } from '@/themes/cinnaglass/emote-picker';
import { explodeBubble } from '@/themes/cinnaglass/bubble-dust';
import type { Conv, EmoteView, Msg } from '@/themes/cinnaglass/chat-data';
import type { EmoteSearchResult } from '@/types/chat';
import type { ChatAlign } from '@/themes/cinnaglass/tweaks';

// quick reactions on the hover bar; the ➕ opens the full EmotePicker.
const QUICK_EMOJI = ['💗', '😆', '🥺'];

// Every mutation a single message can trigger, plus the upward pagination the scroll position asks
// for. Grouped into one object so the hub passes six callbacks as one prop.
type MessageActions = {
    onRetry: (msgId: string) => void;
    onDiscard: (msgId: string) => void;
    onEdit: (msgId: string, content: string) => void;
    onDelete: (msgId: string) => void;
    onReact: (msgId: string, emoji: string) => void;
    onLoadOlder: (convId: string) => void;
};

// What the reaction picker needs; the composer's palette is configured separately in chat-composer.
type MessageEmotePicker = {
    emotes: EmoteView[];
    onSearchWeb: (q: string) => Promise<EmoteSearchResult[]>;
    onImportUrl: (url: string, name: string) => Promise<void>;
    onImportFile: (file: File, name: string) => Promise<void>;
    onRemoveEmote: (id: string) => void;
};

type MessageListProps = {
    convId: string; // also the hub's remount key — switching conversations resets this component
    msgs: Msg[];
    isChannel: boolean; // channel or DM: only changes the "start of the conversation" wording
    reachedStart: boolean; // this conversation has no older page left
    dm?: Conv; // set for DMs only — the read avatar needs the friend's colour and initial
    readAt?: string; // the friend's read cursor, for the avatar's tooltip
    chatAlign: ChatAlign; // 'left' = everyone left (default) | 'sides'
    hostRef: React.RefObject<HTMLDivElement | null>; // .chsc-main — the box the dust canvas covers
    onPaletteClose: () => void; // clicking the flow also dismisses the composer's 😊 palette
    actions: MessageActions;
    emotePicker: MessageEmotePicker;
};

// The message flow. It keeps the view pinned to the newest message, restores the reading position
// when an older page is prepended above, and plays the dust effect once per vanishing message.
export function MessageList({
    convId,
    msgs,
    isChannel,
    reachedStart,
    dm,
    readAt,
    chatAlign,
    hostRef,
    onPaletteClose,
    actions,
    emotePicker
}: MessageListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [pickerFor, setPickerFor] = useState<string | null>(null);
    const msgsRef = useRef<HTMLDivElement>(null);
    const dustRef = useRef<HTMLCanvasElement>(null);
    const bubbleEls = useRef(new Map<string, HTMLElement>());
    const explodedIds = useRef(new Set<string>());
    // scroll anchor across an upward page load: keep the viewport pinned to
    // the messages it was showing while older ones are prepended above
    const anchorRef = useRef<{ h: number; top: number } | null>(null);

    // DM read cursor: index of the last message the friend has read (their
    // avatar renders right below it). Channels never show read state.
    const readCursorIdx = useMemo(() => {
        if (!dm?.otherId || !readAt) return -1;
        const t = Date.parse(readAt);
        let idx = -1;
        msgs.forEach((m, i) => {
            if (!m.pending && !m.failed && Date.parse(m.ts) <= t) idx = i;
        });
        return idx;
    }, [dm, readAt, msgs]);

    // Keep the view at the bottom on new messages, or restore the reading position after an older
    // page was prepended.
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
    }, [msgs]);

    // play the glass-dust effect once per vanishing message (both the local
    // delete and the remote DELETE echo land here via the vanishing flag)
    useEffect(() => {
        const canvas = dustRef.current;
        const host = hostRef.current;
        if (!canvas || !host) return;
        for (const m of msgs) {
            if (!m.vanishing || explodedIds.current.has(m.id)) continue;
            explodedIds.current.add(m.id);
            const el = bubbleEls.current.get(m.id);
            if (el) explodeBubble(canvas, host, el);
        }
    }, [msgs, hostRef]);

    // near the top of a conversation → pull the previous page (hook dedupes)
    const onScroll = () => {
        const el = msgsRef.current;
        if (!el || reachedStart) return;
        if (el.scrollTop < 40) {
            anchorRef.current = { h: el.scrollHeight, top: el.scrollTop };
            actions.onLoadOlder(convId);
        }
    };

    // Enter inline edit for one of my own messages (closes any open reaction picker first).
    const beginEdit = (m: Msg) => {
        setPickerFor(null);
        setEditingId(m.id);
        setEditText(m.text);
    };
    // Commit the inline edit and leave edit mode; an empty value is dropped by the hook.
    const commitEdit = () => {
        if (editingId) actions.onEdit(editingId, editText);
        setEditingId(null);
    };

    return (
        <>
            <div
                className={`chsc-msgs ${chatAlign === 'left' ? 'left' : ''}`}
                ref={msgsRef}
                onScroll={onScroll}
                onClick={() => {
                    setPickerFor(null);
                    onPaletteClose();
                }}
            >
                <div className="chsc-top-hint">
                    {reachedStart
                        ? isChannel
                            ? '这里是这个频道的开头 ✨'
                            : '这里是你们私信的开头 ✨'
                        : '上滚加载更早的消息…'}
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
                        <div
                            key={m.id}
                            className={`chsc-m ${own ? 'me' : ''} ${m.pending ? 'sending' : ''} ${m.failed ? 'failed' : ''} ${m.vanishing ? 'vanish' : ''}`}
                        >
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
                                        <button key={em} type="button" onClick={() => actions.onReact(m.id, em)}>
                                            {em}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        title="更多表情"
                                        onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                                    >
                                        ➕
                                    </button>
                                    {own && (
                                        <>
                                            {m.kind !== 'sticker' && (
                                                <button type="button" title="编辑" onClick={() => beginEdit(m)}>
                                                    ✏️
                                                </button>
                                            )}
                                            <button type="button" title="删除" onClick={() => actions.onDelete(m.id)}>
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
                                        emotes={emotePicker.emotes}
                                        canImport={false}
                                        onPickEmoji={(em) => {
                                            actions.onReact(m.id, em);
                                            setPickerFor(null);
                                        }}
                                        onSearchWeb={emotePicker.onSearchWeb}
                                        onImportUrl={emotePicker.onImportUrl}
                                        onImportFile={emotePicker.onImportFile}
                                        onRemoveEmote={emotePicker.onRemoveEmote}
                                    />
                                </div>
                            )}
                            {m.failed && (
                                <div className="chsc-fail">
                                    🌧️ 没送出去
                                    <span className="lnk" onClick={() => actions.onRetry(m.id)}>
                                        重试
                                    </span>
                                    <span className="lnk mute" onClick={() => actions.onDiscard(m.id)}>
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
                                            onClick={() => canOp && actions.onReact(m.id, rx.emoji)}
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
                                        title={
                                            readAt
                                                ? `${dm.name} 已读 ${new Date(readAt).toTimeString().slice(0, 5)}`
                                                : `${dm.name} 已读`
                                        }
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
        </>
    );
}
