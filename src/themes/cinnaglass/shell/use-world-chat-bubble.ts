// use-world-chat-bubble.ts — how a new message reaches the world before it
// reaches a chat surface: a red pip on the rail, and a short-lived speech
// bubble over her character (ai/codex-visual/20260811-044310Z/codex-report.md
// M2; world-first chat in ai/design_system/uiux/interaction.md). Split out of
// WorldPage (shell-structure-review.md §2.2 S5).
import { useEffect, useRef, useState } from 'react';
import type { Msg } from '@/themes/cinnaglass/chat/chat-data';

/** Transient overhead bubble; `key` restarts the animation for a repeat text. */
export type WorldBubble = { seatId: string; text: string; key: number };

/** Which chat surfaces are on screen — either one counts as "she is being read" —
 *  plus my read cursor for the world conversation (ISO, undefined = never read). */
type ChatSurfaces = { chatOpen: boolean; convOpen: string | null; myReadAt?: string };

// How long her bubble stays over the seat.
const BUBBLE_MS = 4500;

// Derives the rail's unread pip and the in-world bubble from the newest message
// of the world conversation. `unread` needs no state: a pip is exactly "her
// message is the latest one, it is newer than my read cursor, and no chat
// surface is open" — opening a surface marks the conversation read, so
// closing it again no longer re-lights the pip.
export function useWorldChatBubble(lastMsg: Msg | undefined, { chatOpen, convOpen, myReadAt }: ChatSurfaces) {
    const unseen = !!lastMsg && (!myReadAt || Date.parse(lastMsg.ts) > Date.parse(myReadAt));
    const unread = !!lastMsg && lastMsg.from !== 'me' && unseen && !chatOpen && !convOpen;

    const [bubble, setBubble] = useState<WorldBubble | null>(null);
    // one bubble per message id, so a re-render never replays the same line
    const lastBubbledId = useRef<string | null>(null);
    // the hide timer lives in a ref: `threads` is rebuilt on every store change,
    // so an effect keyed on the message object was cleaned up (timer cleared,
    // bubble frozen on screen) whenever I replied or reacted within 4.5s
    const hideTimer = useRef(0);
    const id = lastMsg?.id;
    const from = lastMsg?.from;
    const pending = !!lastMsg?.pending;
    const text = !lastMsg ? '' : lastMsg.kind === 'sticker' ? '发来一张贴纸' : (lastMsg.text ?? '');
    useEffect(() => {
        if (!id || from !== 'them' || pending) return;
        if (lastBubbledId.current === id) return;
        lastBubbledId.current = id;
        if (!text) return;
        // Announcing her message is the effect's whole purpose — this state has
        // to be set the moment the message lands, not from a later callback.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBubble({ seatId: 'pink', text, key: Date.now() });
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    }, [id, from, pending, text]);
    // only unmount clears the timer; a newer message simply restarts it above
    useEffect(() => () => window.clearTimeout(hideTimer.current), []);

    return { unread, bubble };
}
