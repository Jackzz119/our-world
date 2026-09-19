// channel-screen.tsx — the covering CHAT HUB: it floats over the stage so you can talk with the
// scene tucked away. Opened from the ChatCard's expand button (WorldPage.tsx); once open, its own
// left column switches between every conversation convsFor() yields, plus a pinned friends entry.
// Threads are shared with the stage-side ChatCard — same store, two experiences.
// Specs: ai/features/chat.md §三; message states / hover bar / reactions / delete particles follow
// D-7 in ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:53 (historical register;
// the current one is ai/design_system/uiux/cinnaglass/decisions.md). The read cursor avatar renders
// in DMs ONLY (D-7-3 修订: 频道不显示已读 — ai/features/chat.md:61).
// This file is now the shell only: it resolves convId and lays the hub out. Its CSS is in
// channel-screen.styles.tsx, the switcher in conv-nav.tsx, the message flow in message-list.tsx,
// the input row in chat-composer.tsx and the delete effect in bubble-dust.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { IClose, IHash } from './icons';
import { FriendsPage } from './friends-page';
import { ChannelStyles } from './channel-screen.styles';
import { ChatComposer } from './chat-composer';
import { ConvNav } from './conv-nav';
import { MessageList } from './message-list';
import {
    FRIENDS_VIEW,
    convsFor,
    type Conv,
    type EmoteView,
    type FriendEntry,
    type FriendRequest,
    type Msg
} from './chat-data';
import type { Channel, EmoteSearchResult } from '@/types/chat.ts';
import type { ChatAlign } from './tweaks';

// Everything the hub renders and every mutation it can trigger; all state is lifted to WorldPage so
// the ChatCard and the hub read the same store.
type ChannelScreenProps = {
    convId: string | null; // active conv: channel id, dm channel id, or FRIENDS_VIEW
    onSelect: (convId: string) => void; // hub-internal switching (same lifted state)
    inWorld: boolean; // channels are a world concept — lobby shows DMs only
    channels: Channel[]; // the world's channels (DB-driven)
    dmConvs: Conv[]; // my DM conversations (account-level, DB-driven)
    friends: FriendEntry[]; // friends page data + actions (ai/features/chat.md §五.3)
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
    // emote system (ai/features/chat.md §三「lib/emotes.ts」): shared world sticker library
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

// The hub. Resolves convId into a text channel, a DM or the friends page, then renders the switcher
// plus that conversation. Viewing a conversation reports the read cursor (onSeen); scrolling to the
// top pulls the previous page and keeps the viewport pinned while it prepends.
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
    const [inputPicker, setInputPicker] = useState(false); // composer emoji palette
    const mainRef = useRef<HTMLDivElement>(null);
    // render-time adjustment: drop the composer palette when switching conversations. The draft,
    // the open edit box and the reaction picker all reset on their own, because ChatComposer and
    // MessageList are mounted with key={convId}.
    const [prevConv, setPrevConv] = useState(convId);
    if (convId !== prevConv) {
        setPrevConv(convId);
        setInputPicker(false);
    }
    const isFriends = convId === FRIENDS_VIEW;
    const ch = isFriends ? undefined : channels.find((c) => c.id === convId && c.type === 'text');
    const dm = ch || isFriends ? undefined : dmConvs.find((c) => c.id === convId);
    const msgs = useMemo(() => (convId && threads[convId]) || [], [convId, threads]);
    const convs = convsFor(inWorld, channels, dmConvs);
    const chConvs = convs.filter((c) => c.kind === 'channel');

    // the friend's read cursor for this DM; MessageList turns it into the avatar's position
    const readAt = dm?.otherId && convId ? reads[convId]?.[dm.otherId] : undefined;

    // viewing a conversation = reading it (throttled inside the hook;
    // the friends page is not a conversation)
    useEffect(() => {
        if (convId && convId !== FRIENDS_VIEW) onSeen(convId);
    }, [convId, threads, onSeen]);

    if (!convId || (!isFriends && !ch && !dm)) return null;

    return (
        <>
            <ChannelStyles />
            <div className="chsc-scrim" onClick={onClose} />
            <div className="chsc glass">
                {/* conversation switcher — the same set convsFor() gives the ChatCard,
                    plus the pinned friends entry (Discord-style, above DMs) */}
                <ConvNav
                    convId={convId}
                    isFriends={isFriends}
                    chConvs={chConvs}
                    dmConvs={dmConvs}
                    pendingCount={requestsIn.length}
                    onSelect={onSelect}
                />

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
                            <MessageList
                                key={convId}
                                convId={convId}
                                msgs={msgs}
                                isChannel={!!ch}
                                reachedStart={!!reachedStart[convId]}
                                dm={dm}
                                readAt={readAt}
                                chatAlign={chatAlign}
                                hostRef={mainRef}
                                onPaletteClose={() => setInputPicker(false)}
                                actions={{ onRetry, onDiscard, onEdit, onDelete, onReact, onLoadOlder }}
                                emotePicker={{ emotes, onSearchWeb, onImportUrl, onImportFile, onRemoveEmote }}
                            />
                            <ChatComposer
                                key={convId}
                                placeholder={ch ? `在 #${ch.name} 说点什么…` : `发给 ${dm!.name}…`}
                                onSubmit={(v) => onSend(convId, v)}
                                paletteOpen={inputPicker}
                                onPaletteToggle={() => setInputPicker((v) => !v)}
                                onPaletteClose={() => setInputPicker(false)}
                                emotes={emotes}
                                canImport={hasWorld}
                                onSendSticker={(emote) => onSendSticker(convId, emote)}
                                onSearchWeb={onSearchWeb}
                                onImportUrl={onImportUrl}
                                onImportFile={onImportFile}
                                onRemoveEmote={onRemoveEmote}
                            />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
