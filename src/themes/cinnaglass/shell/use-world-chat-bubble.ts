// use-world-chat-bubble.ts — how a new message reaches the world before it
// reaches a chat surface: a red pip on the rail, and a short-lived speech
// bubble over her character (ai/codex-visual/20260811-044310Z/codex-report.md
// M2; world-first chat in ai/design_system/uiux/interaction.md). Split out of
// WorldPage (shell-structure-review.md §2.2 S5).
import { useEffect, useRef, useState } from 'react';
import type { Msg } from '@/themes/cinnaglass/chat-data';

/** Transient overhead bubble; `key` restarts the animation for a repeat text. */
export type WorldBubble = { seatId: string; text: string; key: number };

/** Which chat surfaces are on screen — either one counts as "she is being read". */
type ChatSurfaces = { chatOpen: boolean; convOpen: string | null };

// How long her bubble stays over the seat.
const BUBBLE_MS = 4500;

// Derives the rail's unread pip and the in-world bubble from the newest message
// of the world conversation. `unread` needs no state: a pip is exactly "her
// message is the latest one and no chat surface is open", so opening either
// surface clears it and closing it again re-lights it.
export function useWorldChatBubble(lastMsg: Msg | undefined, { chatOpen, convOpen }: ChatSurfaces) {
    const unread = !!lastMsg && lastMsg.from !== 'me' && !chatOpen && !convOpen;

    const [bubble, setBubble] = useState<WorldBubble | null>(null);
    // one bubble per message id, so a re-render never replays the same line
    const lastBubbledId = useRef<string | null>(null);
    useEffect(() => {
        if (!lastMsg || lastMsg.from === 'me' || lastMsg.pending) return;
        if (lastBubbledId.current === lastMsg.id) return;
        lastBubbledId.current = lastMsg.id;
        const text = lastMsg.kind === 'sticker' ? '发来一张贴纸' : (lastMsg.text ?? '');
        if (!text) return;
        // Announcing her message is the effect's whole purpose — this state has
        // to be set the moment the message lands, not from a later callback.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBubble({ seatId: 'pink', text, key: Date.now() });
        const id = setTimeout(() => setBubble(null), BUBBLE_MS);
        return () => clearTimeout(id);
    }, [lastMsg]);

    return { unread, bubble };
}
