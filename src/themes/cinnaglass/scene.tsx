// scene.tsx — generated isometric room "diorama" (replaces the upload slot).
// A small iso-projection helper builds a cozy bedroom-study. The mood overlays
// in ow.css still tint this for twilight / golden / night lighting.
// RoomArt is exported so the minimap can reuse it.

const ROOM = {
    floorTop: '#ECDCC4',
    floorBase: '#C9B193',
    wallA: '#F3ECE0',
    wallB: '#E4D9C7', // lit / shaded wall
    woodT: '#CBA47B',
    woodR: '#B68F66',
    woodL: '#A07B55',
    creamT: '#FBFCFE',
    creamR: '#E7EFF8',
    creamL: '#D6E2F1',
    blushT: '#F8D7DF',
    blushR: '#EFC2CE',
    blushL: '#E3AEBD',
    skyT: '#BFE3F5',
    skyR: '#9FCDEA',
    skyL: '#83B7DD',
    rug: '#AEDFF2'
};

type BoxProps = {
    u0: number;
    u1: number;
    v0: number;
    v1: number;
    w0: number;
    w1: number;
    t: string;
    r: string;
    l: string;
};
type ShadowProps = { u: number; v: number; rx?: number; ry?: number; o?: number };

// iso-projection constants + helpers (fixed; module-scoped so Box/Shadow are
// static components rather than re-created on every RoomArt render)
const ux = 78,
    uy = 43,
    vx = -78,
    vy = 43,
    hz = 47,
    OX = 500,
    OY = 156;
const X = (u: number, v: number) => OX + u * ux + v * vx;
const Y = (u: number, v: number, w = 0) => OY + u * uy + v * vy - w * hz;
const pt = (u: number, v: number, w = 0) => `${X(u, v)},${Y(u, v, w)}`;
const f = (pts: number[][]) => pts.map((p) => pt(p[0], p[1], p[2] || 0)).join(' ');
const H = 2.5; // wall height

// isometric box → 3 faces (left=v1, right=u1, top=w1)
const Box = ({ u0, u1, v0, v1, w0, w1, t, r, l }: BoxProps) => (
    <g>
        <polygon points={f([[u0, v1, w1], [u1, v1, w1], [u1, v1, w0], [u0, v1, w0]])} fill={l} />
        <polygon points={f([[u1, v0, w1], [u1, v1, w1], [u1, v1, w0], [u1, v0, w0]])} fill={r} />
        <polygon points={f([[u0, v0, w1], [u1, v0, w1], [u1, v1, w1], [u0, v1, w1]])} fill={t} />
    </g>
);
const Shadow = ({ u, v, rx = 34, ry = 17, o = 0.16 }: ShadowProps) => (
    <ellipse cx={X(u, v)} cy={Y(u, v)} rx={rx} ry={ry} fill={`rgba(40,42,60,${o})`} />
);

export function RoomArt({ shadow = true }: { shadow?: boolean }) {
    return (
        <svg
            viewBox="0 0 1000 720"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <defs>
                <linearGradient id="winGlass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FCEFC9" />
                    <stop offset=".5" stopColor="#CFE6F6" />
                    <stop offset="1" stopColor="#A7C6E6" />
                </linearGradient>
                <radialGradient id="lampGlow" cx=".5" cy=".5" r=".5">
                    <stop offset="0" stopColor="#FFF0BE" stopOpacity=".95" />
                    <stop offset="1" stopColor="#FFF0BE" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8FD0F0" />
                    <stop offset="1" stopColor="#5E97C8" />
                </linearGradient>
                <filter id="roomShadow" x="-20%" y="-20%" width="140%" height="150%">
                    <feDropShadow dx="0" dy="26" stdDeviation="26" floodColor="#1E2A47" floodOpacity="0.34" />
                </filter>
            </defs>

            {/* floating ground shadow */}
            {shadow && <ellipse cx={X(2, 2)} cy={Y(2, 2) + 96} rx="330" ry="64" fill="rgba(30,42,71,.28)" />}

            <g filter={shadow ? 'url(#roomShadow)' : undefined}>
                {/* base slab (diorama thickness) */}
                <Box u0={0} u1={4} v0={0} v1={4} w0={-0.5} w1={0} t={ROOM.floorTop} r={ROOM.woodR} l={ROOM.woodL} />
                {/* floor top */}
                <polygon points={f([[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]])} fill={ROOM.floorTop} />
                {/* plank seams */}
                {[1, 2, 3].map((i) => (
                    <polyline key={i} points={f([[i, 0, 0], [i, 4, 0]])} fill="none" stroke="rgba(160,123,85,.28)" strokeWidth="1.5" />
                ))}

                {/* ── walls ── */}
                {/* right wall (v=0) — lit */}
                <polygon points={f([[0, 0, 0], [4, 0, 0], [4, 0, H], [0, 0, H]])} fill={ROOM.wallA} />
                {/* left wall (u=0) — shaded */}
                <polygon points={f([[0, 0, 0], [0, 4, 0], [0, 4, H], [0, 0, H]])} fill={ROOM.wallB} />
                {/* baseboards */}
                <polygon points={f([[0, 0, 0], [4, 0, 0], [4, 0, 0.14], [0, 0, 0.14]])} fill="#E4D6BE" />
                <polygon points={f([[0, 0, 0], [0, 4, 0], [0, 4, 0.14], [0, 0, 0.14]])} fill="#D8C8AE" />

                {/* window on right wall */}
                <polygon points={f([[0.95, 0, 0.85], [3.05, 0, 0.85], [3.05, 0, 2.15], [0.95, 0, 2.15]])} fill="#EFE6D6" />
                <polygon points={f([[1.12, 0, 0.98], [2.88, 0, 0.98], [2.88, 0, 2.02], [1.12, 0, 2.02]])} fill="url(#winGlass)" />
                <polyline points={f([[2.0, 0, 0.98], [2.0, 0, 2.02]])} stroke="#EFE6D6" strokeWidth="3" fill="none" />
                <polyline points={f([[1.12, 0, 1.5], [2.88, 0, 1.5]])} stroke="#EFE6D6" strokeWidth="3" fill="none" />
                {/* light spilling onto floor */}
                <polygon points={f([[1.2, 0, 0], [2.8, 0, 0], [3.4, 1.4, 0], [1.8, 1.4, 0]])} fill="rgba(255,240,200,.30)" />

                {/* framed picture on left wall */}
                <polygon points={f([[0, 2.7, 1.45], [0, 3.4, 1.45], [0, 3.4, 2.05], [0, 2.7, 2.05]])} fill="#EAD9C2" />
                <polygon points={f([[0, 2.78, 1.52], [0, 3.32, 1.52], [0, 3.32, 1.98], [0, 2.78, 1.98]])} fill="#BFE3F5" />
                <circle cx={X(0, 3.05)} cy={Y(0, 3.05, 1.62)} r="9" fill="#FCE7B0" />

                {/* shelf on left wall + keepsakes */}
                <polygon points={f([[0, 0.9, 1.55], [0, 2.3, 1.55], [0.42, 2.3, 1.55], [0.42, 0.9, 1.55]])} fill={ROOM.woodT} />
                <polygon points={f([[0, 0.9, 1.5], [0, 2.3, 1.5], [0, 2.3, 1.55], [0, 0.9, 1.55]])} fill={ROOM.woodL} />
                <Box u0={0.06} u1={0.3} v0={1.0} v1={1.25} w0={1.55} w1={1.95} t="#F1C75A" r="#E0B549" l="#CBA23C" />
                <Box u0={0.06} u1={0.28} v0={1.4} v1={1.62} w0={1.55} w1={1.82} t={ROOM.blushT} r={ROOM.blushR} l={ROOM.blushL} />
                <circle cx={X(0.18, 2.0)} cy={Y(0.18, 2.0, 1.7)} r="11" fill="#86C99A" />
                <rect x={X(0.18, 2.0) - 4} y={Y(0.18, 2.0, 1.62)} width="8" height="9" fill="#E0A37D" />

                {/* ── desk (back-right) ── */}
                <Shadow u={3.0} v={0.8} rx={62} ry={26} o={0.14} />
                <Box u0={2.4} u1={3.7} v0={0.25} v1={1.35} w0={0} w1={1.02} t={ROOM.woodT} r={ROOM.woodR} l={ROOM.woodL} />
                {/* monitor */}
                <Box u0={2.55} u1={2.64} v0={0.45} v1={1.02} w0={1.02} w1={1.78} t="#33405E" r="#2C3A56" l="url(#screen)" />
                <Box u0={2.55} u1={2.64} v0={0.66} v1={0.8} w0={1.0} w1={1.04} t="#3A4A6A" r="#33405E" l="#2C3A56" />
                {/* keyboard */}
                <Box u0={2.85} u1={3.25} v0={0.55} v1={1.0} w0={1.02} w1={1.06} t="#E9EEF5" r="#D4DCE8" l="#C6D0DF" />
                {/* books */}
                <Box u0={2.78} u1={3.18} v0={1.05} v1={1.28} w0={1.02} w1={1.18} t={ROOM.blushT} r={ROOM.blushR} l={ROOM.blushL} />
                <Box u0={2.82} u1={3.14} v0={1.08} v1={1.3} w0={1.18} w1={1.32} t="#9FD6F4" r="#83B7DD" l="#6FA6CF" />
                {/* lamp */}
                <Box u0={3.38} u1={3.46} v0={0.5} v1={0.58} w0={1.02} w1={1.72} t="#9AA7B8" r="#8794A6" l="#76859A" />
                <circle cx={X(3.42, 0.54)} cy={Y(3.42, 0.54, 1.62)} r="44" fill="url(#lampGlow)" />
                <Box u0={3.3} u1={3.56} v0={0.42} v1={0.68} w0={1.72} w1={1.92} t="#FCE7B0" r="#F1D88E" l="#E6C972" />
                {/* potted plant */}
                <Box u0={3.32} u1={3.6} v0={0.98} v1={1.26} w0={1.02} w1={1.32} t="#E0A37D" r="#CE916C" l="#B97F5C" />
                <circle cx={X(3.46, 1.12)} cy={Y(3.46, 1.12, 1.5)} r="15" fill="#86C99A" />
                <circle cx={X(3.46, 1.12) - 11} cy={Y(3.46, 1.12, 1.42)} r="11" fill="#9AD3A7" />
                <circle cx={X(3.46, 1.12) + 11} cy={Y(3.46, 1.12, 1.44)} r="10" fill="#74BC8A" />

                {/* chair */}
                <Shadow u={2.95} v={2.0} rx={40} ry={18} o={0.13} />
                <Box u0={2.65} u1={3.2} v0={1.65} v1={2.2} w0={0} w1={0.52} t={ROOM.skyT} r={ROOM.skyR} l={ROOM.skyL} />
                <Box u0={2.65} u1={2.78} v0={1.65} v1={2.2} w0={0.52} w1={1.18} t={ROOM.skyT} r={ROOM.skyR} l={ROOM.skyL} />

                {/* ── rug ── */}
                <polygon points={f([[0.7, 1.0, 0.012], [2.9, 1.0, 0.012], [2.9, 3.1, 0.012], [0.7, 3.1, 0.012]])} fill={ROOM.rug} opacity="0.82" />
                <polygon
                    points={f([[1.0, 1.3, 0.014], [2.6, 1.3, 0.014], [2.6, 2.8, 0.014], [1.0, 2.8, 0.014]])}
                    fill="none"
                    stroke="rgba(255,255,255,.55)"
                    strokeWidth="2.5"
                />

                {/* ── bed (front-left) ── */}
                <Shadow u={1.1} v={2.85} rx={86} ry={34} o={0.15} />
                <Box u0={0.3} u1={1.95} v0={2.0} v1={3.7} w0={0} w1={0.42} t={ROOM.woodT} r={ROOM.woodR} l={ROOM.woodL} />
                {/* mattress */}
                <Box u0={0.35} u1={1.9} v0={2.05} v1={3.65} w0={0.42} w1={0.74} t={ROOM.creamT} r={ROOM.creamR} l={ROOM.creamL} />
                {/* blanket (front portion) */}
                <Box u0={0.34} u1={1.91} v0={2.75} v1={3.66} w0={0.7} w1={0.9} t={ROOM.skyT} r={ROOM.skyR} l={ROOM.skyL} />
                {/* pillows */}
                <Box u0={0.5} u1={1.02} v0={2.12} v1={2.55} w0={0.74} w1={1.0} t={ROOM.creamT} r={ROOM.creamR} l={ROOM.creamL} />
                <Box u0={1.1} u1={1.6} v0={2.12} v1={2.55} w0={0.74} w1={0.98} t={ROOM.blushT} r={ROOM.blushR} l={ROOM.blushL} />

                {/* floor plant (front-left corner) */}
                <Box u0={0.25} u1={0.6} v0={3.35} v1={3.7} w0={0} w1={0.5} t="#E0A37D" r="#CE916C" l="#B97F5C" />
                <circle cx={X(0.42, 3.52)} cy={Y(0.42, 3.52, 0.78)} r="22" fill="#86C99A" />
                <circle cx={X(0.42, 3.52) - 14} cy={Y(0.42, 3.52, 0.66)} r="15" fill="#9AD3A7" />
                <circle cx={X(0.42, 3.52) + 15} cy={Y(0.42, 3.52, 0.68)} r="14" fill="#74BC8A" />

                {/* ── two chibi avatars (drawn in screen space, camera-facing) ── */}
                {[
                    { x: X(1.55, 1.85), y: Y(1.55, 1.85), accent: '#9FD6F4', ear: 30 },
                    { x: X(2.05, 1.6), y: Y(2.05, 1.6), accent: '#F8D7DF', ear: 18 }
                ].map((c, i) => (
                    <g key={i}>
                        <ellipse cx={c.x} cy={c.y + 2} rx="20" ry="8" fill="rgba(40,42,60,.18)" />
                        {/* ears */}
                        <ellipse cx={c.x - 9} cy={c.y - 46 - c.ear} rx="6.5" ry={c.ear} fill="#FBFCFE" />
                        <ellipse cx={c.x + 9} cy={c.y - 46 - c.ear} rx="6.5" ry={c.ear} fill="#FBFCFE" />
                        {/* body */}
                        <path d={`M${c.x - 16},${c.y} q-3,-30 16,-32 q19,2 16,32 z`} fill="#FBFCFE" />
                        {/* scarf / accent */}
                        <rect x={c.x - 15} y={c.y - 16} width="30" height="8" rx="4" fill={c.accent} />
                        {/* head */}
                        <circle cx={c.x} cy={c.y - 44} r="20" fill="#FBFCFE" />
                        {/* cheeks + eyes */}
                        <circle cx={c.x - 8} cy={c.y - 40} r="3.4" fill="#F6B8C6" />
                        <circle cx={c.x + 8} cy={c.y - 40} r="3.4" fill="#F6B8C6" />
                        <circle cx={c.x - 6} cy={c.y - 46} r="2.2" fill="#3A4A6A" />
                        <circle cx={c.x + 6} cy={c.y - 46} r="2.2" fill="#3A4A6A" />
                    </g>
                ))}
            </g>
        </svg>
    );
}

export function RoomScene({ weather = 'cloud' }: { weather?: string }) {
    return (
        <div className="scene-base" data-wx={weather}>
            <div className="scene-ambient" />
            <div className="room-stage">
                <RoomArt />
            </div>
            {/* lighting moods layered on top */}
            <div className="mood mood-tint" />
            <div className="mood mood-glow" />
            <div className="mood-stars" />
            <div className="mood mood-vignette" />
            {/* weather effects */}
            <div className="wx-layer wx-sun" />
            <div className="wx-layer wx-rain" />
            <div className="wx-layer wx-snow" />
            <div className="scrim-top" />
            <div className="scrim-bot" />
        </div>
    );
}