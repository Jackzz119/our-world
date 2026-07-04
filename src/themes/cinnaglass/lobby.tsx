// lobby.tsx — the pre-room "lobby" scene: a floating island with a glowing
// portal, shown when the user has no shared space (DB `rooms` row) yet.
// Static 2D placeholder for now; swapped for an R3F top-down island later.
// NOT related to the cinnaglass scene-area "rooms" mock (living/bedroom).

export type LobbyStatus = 'loading' | 'ready' | 'error';

type LobbySceneProps = {
    status: LobbyStatus; // loading = fetching getMyRoom; error = that fetch failed
    hasRoom: boolean; // a room exists — entering is still explicit (portal / button)
    error: string | null; // fetch failure OR createRoom failure message
    busy: boolean; // a createRoom request is in flight
    onEnter: () => void; // portal click → enter the room (or re-check if none known)
    onCreate: () => void; // card CTA → createRoom, then enter
};

const P = {
    grassT: '#86C99A',
    grassHi: '#9AD3A7',
    earthT: '#CBA47B',
    earthR: '#B68F66',
    earthL: '#A07B55',
    ring: '#BFE3F5',
    ringDeep: '#9FD6F4',
    spark: '#FCE7B0',
    trunk: '#A07B55'
};

// Floating island + portal, drawn in screen space to match the room diorama's
// pastel palette. The portal group is the clickable "enter" affordance.
function IslandArt({ onEnter, canEnter }: { onEnter: () => void; canEnter: boolean }) {
    return (
        <svg viewBox="0 0 520 440" role="img" aria-label="漂浮岛与传送门">
            <defs>
                <radialGradient id="portalGlow" cx=".5" cy=".5" r=".5">
                    <stop offset="0" stopColor={P.ring} stopOpacity=".85" />
                    <stop offset="1" stopColor={P.ring} stopOpacity="0" />
                </radialGradient>
                <linearGradient id="portalInner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#E8F6FF" />
                    <stop offset=".55" stopColor={P.ringDeep} />
                    <stop offset="1" stopColor="#5E97C8" />
                </linearGradient>
                <filter id="islandShadow" x="-30%" y="-30%" width="160%" height="170%">
                    <feDropShadow dx="0" dy="22" stdDeviation="22" floodColor="#1E2A47" floodOpacity="0.32" />
                </filter>
            </defs>

            {/* soft glow beneath the island (it floats in the sky) */}
            <ellipse cx="260" cy="408" rx="180" ry="30" fill="rgba(30,42,71,.22)" />

            {/* mini companion rocks */}
            <g opacity=".9">
                <ellipse cx="66" cy="196" rx="30" ry="10" fill={P.grassHi} />
                <path d="M40,198 Q54,232 66,236 Q80,230 92,198 Z" fill={P.earthR} />
                <ellipse cx="452" cy="150" rx="22" ry="8" fill={P.grassHi} />
                <path d="M433,152 Q444,178 452,181 Q462,176 471,152 Z" fill={P.earthR} />
            </g>

            {/* sparkles */}
            {[
                [120, 92, 3.4],
                [398, 74, 2.6],
                [468, 250, 3],
                [56, 300, 2.6],
                [352, 322, 2.2]
            ].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={P.spark} opacity=".85" />
            ))}

            <g filter="url(#islandShadow)">
                {/* island body: grass top + tapered earth underside */}
                <path d="M110,282 Q150,388 260,402 Q370,388 410,282 Z" fill={P.earthL} />
                <path d="M110,282 Q170,368 260,380 Q300,374 330,340 Q250,362 180,320 Q140,300 110,282 Z" fill={P.earthR} opacity=".75" />
                <ellipse cx="260" cy="280" rx="152" ry="46" fill={P.grassT} />
                <ellipse cx="260" cy="274" rx="140" ry="38" fill={P.grassHi} />

                {/* little tree */}
                <rect x="164" y="232" width="9" height="26" rx="4" fill={P.trunk} />
                <circle cx="168" cy="220" r="22" fill={P.grassT} />
                <circle cx="152" cy="230" r="14" fill={P.grassHi} />
                <circle cx="185" cy="228" r="13" fill="#74BC8A" />

                {/* flowers on the grass */}
                {[
                    [206, 288],
                    [318, 292],
                    [356, 276],
                    [232, 268]
                ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="4" fill={i % 2 ? '#F8D7DF' : P.spark} />
                ))}

                {/* stone platform under the portal */}
                <ellipse cx="260" cy="256" rx="52" ry="15" fill="#E9EEF5" />
                <ellipse cx="260" cy="252" rx="44" ry="12" fill="#FBFCFE" />

                {/* portal — the "enter" affordance */}
                <g
                    className="lobby-portal"
                    role="button"
                    aria-label="进入你们的小世界"
                    aria-disabled={!canEnter}
                    tabIndex={canEnter ? 0 : -1}
                    onClick={canEnter ? onEnter : undefined}
                    onKeyDown={(e) => {
                        if (canEnter && (e.key === 'Enter' || e.key === ' ')) onEnter();
                    }}
                >
                    <ellipse cx="260" cy="140" rx="86" ry="112" fill="url(#portalGlow)" />
                    <ellipse cx="260" cy="142" rx="56" ry="82" fill="url(#portalInner)" opacity=".92" />
                    <ellipse cx="260" cy="142" rx="62" ry="88" fill="none" stroke={P.ring} strokeWidth="9" />
                    <ellipse cx="260" cy="142" rx="62" ry="88" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity=".7" />
                    {/* inner swirl hints */}
                    <path d="M232,110 Q260,96 288,112" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity=".65" />
                    <path d="M236,176 Q262,190 286,174" fill="none" stroke="#E8F6FF" strokeWidth="4" strokeLinecap="round" opacity=".5" />
                </g>
            </g>
        </svg>
    );
}

export function LobbyScene({ status, hasRoom, error, busy, onEnter, onCreate }: LobbySceneProps) {
    const canEnter = status === 'ready' && !busy;
    return (
        <div className="scene-base">
            <div className="scene-ambient" />
            <div className="lobby-stage">
                <div className="lobby-float">
                    <IslandArt onEnter={onEnter} canEnter={canEnter} />
                </div>
                <div className="lobby-card glass">
                    {status === 'loading' ? (
                        <p className="lobby-sub">正在寻找你们的小世界…</p>
                    ) : status === 'error' ? (
                        <>
                            <h2>进入大厅时出了点问题</h2>
                            {error && <p className="lobby-err">{error}</p>}
                            <button type="button" className="btn-primary lobby-cta" onClick={onEnter}>
                                重试
                            </button>
                        </>
                    ) : hasRoom ? (
                        <>
                            <h2>你们的小世界已就绪</h2>
                            <p className="lobby-sub">穿过传送门，回到你们的房间</p>
                            {error && <p className="lobby-err">{error}</p>}
                            <button type="button" className="btn-primary lobby-cta" onClick={onEnter} disabled={busy}>
                                进入房间
                            </button>
                        </>
                    ) : (
                        <>
                            <h2>还没有你们的小世界</h2>
                            <p className="lobby-sub">创建一个房间，开始收藏你们的回忆</p>
                            {error && <p className="lobby-err">{error}</p>}
                            <button type="button" className="btn-primary lobby-cta" onClick={onCreate} disabled={busy}>
                                {busy ? '创建中…' : '创建房间'}
                            </button>
                            <p className="lobby-hint">已经有房间？点上方传送门进入</p>
                        </>
                    )}
                </div>
            </div>
            {/* same mood / weather layering as RoomScene so tweaks still apply */}
            <div className="mood mood-tint" />
            <div className="mood mood-glow" />
            <div className="mood-stars" />
            <div className="mood mood-vignette" />
            <div className="scrim-top" />
            <div className="scrim-bot" />
        </div>
    );
}