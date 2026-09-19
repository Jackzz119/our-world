// conv-nav.tsx — the chat hub's left column: the pinned 好友 entry (Discord-style, above the DM
// list), then this world's text channels, then my DMs. It renders exactly the set convsFor() gives
// the stage-side ChatCard, so both surfaces always agree on what a conversation is.
// Split out of channel-screen.tsx; it holds no state, it only reports the id you clicked.
import { IHash } from './icons';
import { FRIENDS_VIEW } from './chat-data';
import type { Conv } from './chat-data';

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
        <div className="chsc-nav">
            <div
                className={`chsc-nav-item friends ${isFriends ? 'on' : ''}`}
                onClick={() => onSelect(FRIENDS_VIEW)}
                title="好友"
            >
                <span className="ic">💗</span>
                <span className="nm">好友</span>
                {pendingCount > 0 && <span className="chsc-nav-bdg">{pendingCount}</span>}
            </div>
            {chConvs.length > 0 && (
                <>
                    <div className="chsc-cat">文字频道</div>
                    {chConvs.map((c) => (
                        <div
                            key={c.id}
                            className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`}
                            onClick={() => onSelect(c.id)}
                            title={c.hint}
                        >
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
                <div
                    key={c.id}
                    className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`}
                    onClick={() => onSelect(c.id)}
                    title={`私信 ${c.name}`}
                >
                    <span className="ava-s" style={{ background: c.color }}>
                        {c.ini}
                    </span>
                    <span className="nm">{c.name}</span>
                </div>
            ))}
        </div>
    );
}
