// conv-nav.tsx — the chat hub's left column: the pinned 好友 entry (Discord-style, above the DM
// list), then this world's text channels, then my DMs. It renders exactly the set convsFor() gives
// the stage-side ChatCard, so both surfaces always agree on what a conversation is.
// Split out of channel-screen.tsx; it holds no state, it only reports the id you clicked.
import { IHash } from '@/themes/cinnaglass/icons';
import { FRIENDS_VIEW } from '@/themes/cinnaglass/chat/chat-data';
import type { Conv } from '@/themes/cinnaglass/chat/chat-data';

type ConvNavProps = {
    convId: string | null; // the active entry, or FRIENDS_VIEW
    isFriends: boolean;
    chConvs: Conv[]; // this world's text channels (empty in the lobby)
    dmConvs: Conv[];
    pendingCount: number; // incoming friend requests — the badge on the 好友 entry
    onSelect: (convId: string) => void;
};

// The switcher. The friends entry is always first and always present; channels only exist in a
// world, DMs are account-level and therefore show up in the lobby too.
export function ConvNav({ convId, isFriends, chConvs, dmConvs, pendingCount, onSelect }: ConvNavProps) {
    return (
        <nav className="chsc-nav" aria-label="聊天目的地">
            {chConvs.length > 0 && (
                <>
                    <div className="chsc-cat">房间聊天</div>
                    {chConvs.map((c) => (
                        <button
                            type="button"
                            key={c.id}
                            className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`}
                            onClick={() => onSelect(c.id)}
                            aria-current={convId === c.id ? 'page' : undefined}
                            title={c.hint}
                        >
                            <span className="ic">
                                <IHash size={15} />
                            </span>
                            <span className="nm">{c.name}</span>
                        </button>
                    ))}
                </>
            )}
            <details
                className="chsc-social"
                key={isFriends || dmConvs.some((c) => c.id === convId) ? 'social' : 'room'}
                open={isFriends || dmConvs.some((c) => c.id === convId) || undefined}
            >
                <summary>好友与私信{pendingCount > 0 && <span className="chsc-nav-bdg">{pendingCount}</span>}</summary>
                <button
                    type="button"
                    className={`chsc-nav-item friends ${isFriends ? 'on' : ''}`}
                    onClick={() => onSelect(FRIENDS_VIEW)}
                    aria-current={isFriends ? 'page' : undefined}
                >
                    <span className="nm">好友</span>
                    {pendingCount > 0 && <span className="chsc-nav-bdg">{pendingCount}</span>}
                </button>
                {dmConvs.length === 0 && <div className="chsc-empty">添加好友后这里会出现私信</div>}
                {dmConvs.map((c) => (
                    <button
                        type="button"
                        key={c.id}
                        className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`}
                        onClick={() => onSelect(c.id)}
                        aria-current={convId === c.id ? 'page' : undefined}
                        title={`私信 ${c.name}`}
                    >
                        <span className="ava-s" style={{ background: c.color }}>
                            {c.ini}
                        </span>
                        <span className="nm">{c.name}</span>
                    </button>
                ))}
            </details>
        </nav>
    );
}
