// sidebar.tsx — persistent Discord-style left sidebar, in the same layout
// layer as the stage (opening it squeezes the scene right, no overlay):
// an always-on rail + a collapsible full-height panel.
// Rail (Discord-style): product logo on top = the HOME / DM hub entry
// (friends, shop, open DM list), then the world entry icon below a divider.
// Panel switches on the rail selection: home = DM hub; world = the world
// column (in-world: rooms + text/voice channels + members; lobby: world
// status card + activity invites). DMs never mix with a world's channels.
// Terminology (see ai/Features/channel.md): world = the couple's shared
// space (DB `worlds` row); rooms = scene-bound voice channels inside the
// world (clicking one switches the scene, same action as the map module).
// Decoupling rule (chat.md): the sidebar's ONLY chat trigger is the covering
// conversation window (onOpenConv — text channels AND DMs); the in-scene
// ChatDock is stage-owned and never opened from here.
// See ai/Features/sidebar.md + ai/Features/chat.md.
import { useState, type Dispatch, type SetStateAction } from 'react';
import { IChat, IChevron, ICog, IHash, IHeart, IMic, IMicOff, IPlus, ISparkle, IVolume } from './icons';
import { ROOM_ICONS, VOICE_DEFAULT } from './rooms';
import { FRIENDS_VIEW, type Conv } from './chat-data';
import type { Channel } from '@/types/chat.ts';
import type { Profile, Room } from './model';
import { daysSince } from './profile';
import type { World } from '@/types/feed.ts';

const SidebarStyles = () => (
    <style>{`
  /* ── persistent two-column shell — in-flow, full height, squeezes the
        stage to the right instead of floating over it ── */
  .owsb2{position:relative;z-index:13;height:100%;flex:0 0 auto;display:flex;}

  /* rail two-state morph (texture-palette.html R-B, 2026-07-13 修订 v2):
     expanded = full-height column fused with the panel;
     folded   = the zone's width animates to 0 (the scene slides in to fill it)
     while the pill, overflowing the zero-width zone, floats DIRECTLY on the
     scene — no strip, no backdrop of its own. */
  .sb-railzone{position:relative;width:64px;flex:0 0 auto;display:flex;flex-direction:column;
    align-items:flex-start;justify-content:center;overflow:visible;
    transition:width .45s cubic-bezier(.3,.8,.35,1);}
  .owsb2.folded .sb-railzone{width:0;}
  .sb-rail{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
    gap:10px;padding:12px 0;width:64px;flex:1 1 auto;margin:0;border-radius:0;overflow:hidden;
    border:1.5px solid transparent;
    background:var(--glass-shell) padding-box,
      var(--rail-candy-border) border-box;
    box-shadow:inset 0 1px 0 var(--glass-hi);
    transition:flex-grow .45s cubic-bezier(.3,.8,.35,1), width .45s cubic-bezier(.3,.8,.35,1),
      margin .45s cubic-bezier(.3,.8,.35,1), border-radius .45s cubic-bezier(.34,1.2,.4,1),
      box-shadow .45s ease;}
  .owsb2.folded .sb-rail{flex-grow:0;width:52px;margin:0 0 0 10px;border-radius:99px;
    backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);
    box-shadow:0 14px 34px -12px rgba(30,42,71,.5), inset 0 1.5px 0 rgba(255,255,255,.9),
      inset 0 -1px 0 rgba(248,200,214,.5);}
  @media (prefers-reduced-motion: reduce){.sb-railzone,.sb-rail{transition:none}}
  .sb-rail-btn{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;
    font-size:17px;font-weight:800;color:#fff;border:2px solid rgba(255,255,255,.72);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55);flex:0 0 auto;position:relative;
    transition:border-radius .22s,transform .2s,box-shadow .2s;}
  .sb-rail-btn:hover{border-radius:16px;transform:translateY(-1px);}
  .sb-rail-btn.on{border-radius:16px;box-shadow:0 0 0 2.5px var(--accent),0 6px 16px -5px rgba(20,29,51,.55);}
  /* selection reads via the squircle + accent ring — the old left indicator
     bar would clip against the pill's rounded edge */
  .sb-rail-btn:disabled{opacity:.45;cursor:default;transform:none;}
  .sb-rail-logo{background:linear-gradient(135deg,#F8C8D6,#EF9DB4);}
  .sb-rail-div{width:26px;height:2px;border-radius:2px;flex:0 0 auto;
    background:linear-gradient(90deg,transparent,var(--glass-line) 25%,var(--glass-line) 75%,transparent);}
  .sb-rail-add{background:var(--glass-bg-2);color:var(--accent-deep);border:1.5px dashed var(--glass-line);
    box-shadow:none;font-weight:700;}
  .sb-rail-add:hover{border-color:var(--accent);color:var(--accent);}
  .sb-rail-sp{flex:1;}
  .sb-rail-fold{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;cursor:pointer;
    color:var(--glass-sub);border:1px solid var(--glass-line);background:var(--glass-bg-2);
    transition:color .18s,background .18s;}
  .sb-rail-fold:hover{color:var(--glass-text);background:var(--glass-hover);}
  .sb-rail-fold .ic{display:inline-flex;transition:transform .3s;}
  .sb-rail-fold.folded .ic{transform:rotate(180deg);}

  /* panel: collapsible context column (full height, in-flow) — folds via a
     width morph in sync with the rail's pill transformation */
  .sb-panel{width:min(252px,calc(100vw - 84px));display:flex;flex-direction:column;min-height:0;
    border-radius:0;border-left:1px solid var(--glass-line);overflow:hidden;
    box-shadow:18px 0 50px -18px rgba(20,29,51,.4);
    transition:width .45s cubic-bezier(.3,.8,.35,1), opacity .32s ease, border-left-width .45s;}
  /* children keep their natural width during the fold so text never rewraps —
     the panel just clips them like a closing curtain */
  .sb-panel>*{width:min(252px,calc(100vw - 84px));flex-shrink:0;}
  .sb-panel.closed{width:0;min-width:0;border-left-width:0;opacity:0;pointer-events:none;}
  @media (prefers-reduced-motion: reduce){.sb-panel{transition:none}}

  .sb-hd{padding:16px 14px 12px;background:linear-gradient(160deg,var(--glass-hi),transparent);}
  .sb-hd-top{display:flex;align-items:center;gap:11px;}
  /* world header doubles as the world-settings entry — the whole
     icon + name + days strip is one click target (2026-07-13, world.md W-4) */
  .sb-hd-top.tap{cursor:pointer;border-radius:14px;margin:-6px;padding:6px;transition:background .16s;}
  .sb-hd-top.tap:hover{background:var(--glass-hover);}
  .sb-hd-top.tap:focus-visible{outline:none;box-shadow:0 0 0 2px var(--accent);}

  /* world icon — image beats emoji beats first letter (world.md §六) */
  .sb-wic{display:grid;place-items:center;overflow:hidden;color:#fff;font-weight:800;flex:0 0 auto;
    background:var(--accent-grad);border:2px solid rgba(255,255,255,.72);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55);}
  .sb-wic img{width:100%;height:100%;object-fit:cover;display:block;}
  .sb-avas{display:flex;}
  .sb-avas .ava{width:40px;height:40px;font-size:15px;margin-left:-13px;}
  .sb-avas .ava:first-child{margin-left:0;}
  .sb-id{flex:1;min-width:0;}
  .sb-id h3{margin:0;font-size:15.5px;font-weight:800;color:var(--glass-text);letter-spacing:.01em;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-id .meta{font-size:11.5px;color:var(--glass-sub);margin-top:2px;display:flex;align-items:center;gap:6px;}
  .sb-id .meta .num{font-family:"Baloo 2",sans-serif;color:var(--accent-deep);font-weight:700;}
  .sb-id .meta .dot{width:6px;height:6px;border-radius:50%;background:#5fcf8e;box-shadow:0 0 6px #5fcf8e;flex:0 0 auto;}
  .sb-logo-badge{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;color:#fff;
    background:linear-gradient(135deg,#F8C8D6,#EF9DB4);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55), inset 0 1px 0 rgba(255,255,255,.45);flex:0 0 auto;}

  .sb-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 10px 12px;}
  .sb-scroll::-webkit-scrollbar{width:6px;}
  .sb-scroll::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}

  .sb-cat{display:flex;align-items:center;justify-content:space-between;
    font-size:10.5px;letter-spacing:.15em;font-weight:700;color:var(--glass-sub);
    padding:14px 8px 6px;text-transform:uppercase;}
  .sb-cat .cog{display:inline-flex;cursor:pointer;color:var(--glass-sub);transition:color .18s,transform .2s;}
  .sb-cat .cog:hover{color:var(--accent-deep);}
  .sb-cat .cog.on{color:var(--accent-deep);transform:rotate(60deg);}

  .sb-tag{font-size:9.5px;font-weight:700;letter-spacing:.06em;color:var(--accent-deep);
    background:var(--glass-hi);border:1px solid var(--glass-line);border-radius:99px;padding:2px 8px;flex:0 0 auto;}

  /* shared avatar */
  .ava{position:relative;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;
    border:2px solid rgba(255,255,255,.72);box-shadow:0 6px 16px -5px rgba(20,29,51,.55), inset 0 1px 0 rgba(255,255,255,.45);
    flex:0 0 auto;}
  .ava.couple{border-color:var(--butter);box-shadow:0 0 0 2px rgba(252,231,176,.55),0 6px 16px -5px rgba(20,29,51,.55);}
  .ava .odot{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;
    background:#5fcf8e;border:2.5px solid var(--glass-card,#fff);box-shadow:0 0 7px #5fcf8e;}
  .ava.off{filter:grayscale(.6) brightness(.93);}
  .ava.off .odot{background:#c6cdd8;box-shadow:none;}
  .ava.speaking{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent),0 0 22px 5px var(--glass-glow);animation:spkbob 1.1s ease-in-out infinite;}
  .ava.speaking::before,.ava.speaking::after{content:"";position:absolute;inset:-2px;border-radius:50%;
    border:2px solid var(--accent);animation:voicePulse 1.4s ease-out infinite;pointer-events:none;}
  .ava.speaking::after{animation-delay:.7s;}
  @keyframes voicePulse{0%{transform:scale(1);opacity:.75}100%{transform:scale(1.7);opacity:0}}
  @keyframes spkbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
  @media (prefers-reduced-motion: reduce){.ava.speaking{animation:none}.ava.speaking::before,.ava.speaking::after{animation:none;opacity:0}}

  /* ── DM rows (home panel) ── */
  .sb-dm{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .sb-dm:hover{background:var(--glass-hover);color:var(--glass-text);}
  .sb-dm.on{background:var(--glass-active);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-line);}
  .sb-dm .ava{width:30px;height:30px;font-size:12px;}
  .sb-dm .nm{flex:1;font-size:13.5px;font-weight:600;color:var(--glass-text);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-dm .st{font-size:11px;color:var(--glass-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;}

  /* ── lobby: world status cards ── */
  .sb-rcard{border:1px solid var(--glass-line);background:var(--glass-paper);border-radius:16px;
    padding:13px 14px;margin:4px 2px 10px;display:flex;flex-direction:column;gap:9px;}
  .sb-rcard .rc-top{display:flex;align-items:center;gap:10px;}
  .sb-rcard .rc-nm{flex:1;min-width:0;font-size:14px;font-weight:800;color:var(--glass-text);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-rcard .rc-doing{font-size:12px;color:var(--glass-sub);line-height:1.55;}
  .sb-rcard .rc-foot{display:flex;align-items:center;gap:8px;}
  .sb-rcard .rc-ppl{display:flex;}
  .sb-rcard .rc-ppl .ava{width:24px;height:24px;font-size:10px;margin-left:-8px;}
  .sb-rcard .rc-ppl .ava:first-child{margin-left:0;}
  .sb-rcard .rc-cnt{flex:1;font-size:11px;color:var(--glass-sub);}
  .sb-rcard .rc-go{appearance:none;border:0;cursor:pointer;font:inherit;font-size:12px;font-weight:700;
    color:#0d2336;border-radius:99px;padding:6px 14px;background:var(--accent-grad);
    box-shadow:0 5px 14px -6px rgba(47,154,211,.7);transition:transform .18s;}
  .sb-rcard .rc-go:hover{transform:translateY(-1px);}
  .sb-rcard .rc-go:disabled{opacity:.5;cursor:default;transform:none;}
  .sb-rcard.invite{border-style:dashed;opacity:.85;}
  .sb-lob-empty{text-align:center;font-size:12.5px;color:var(--glass-sub);padding:14px 8px;line-height:1.7;}
  .sb-err{font-size:12px;color:#d96a84;padding:4px 10px;}

  /* ── in-world: rooms / channels / presence ── */
  .sb-room{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;position:relative;}
  .sb-room:hover{background:var(--glass-hover);color:var(--glass-text);}
  .sb-room.on{background:var(--glass-active);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-line);}
  .sb-room.on::before{content:"";position:absolute;left:-10px;top:50%;transform:translateY(-50%);
    width:4px;height:20px;border-radius:0 4px 4px 0;background:var(--accent);}
  .sb-room .ic{display:inline-flex;flex:0 0 auto;}
  .sb-room .nm{flex:1;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-room .who{display:flex;}
  .sb-room .who .mini{width:20px;height:20px;border-radius:50%;margin-left:-7px;border:1.5px solid var(--glass-card,var(--glass-bg));
    display:grid;place-items:center;color:#fff;font-size:9px;font-weight:700;flex:0 0 auto;}
  .sb-room .who .mini:first-child{margin-left:0;}

  .sb-vc-head{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .sb-vc-head:hover{background:var(--glass-hover);color:var(--glass-text);}
  .sb-vc-head.live{color:var(--glass-text);}
  .sb-vc-head .ic{display:inline-flex;flex:0 0 auto;}
  .sb-vc-head .nm{flex:1;font-size:14px;font-weight:600;}
  .sb-vc-head .join{font-size:11px;font-weight:700;color:var(--accent-deep);}
  .sb-vc-members{padding:2px 10px 4px 30px;display:flex;flex-direction:column;gap:6px;}
  .sb-vc-m{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--glass-text);font-weight:600;}
  .sb-vc-m .ava{width:26px;height:26px;font-size:11px;}
  .sb-vc-m .mc{margin-left:auto;display:inline-flex;color:#5fcf8e;}
  .sb-vc-m .mc.muted{color:#e08aa0;}

  .sb-pcard{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;background:var(--glass-paper);
    border:1px solid var(--glass-line);margin-bottom:8px;cursor:pointer;transition:background .16s;}
  .sb-pcard:hover{background:var(--glass-hover);}
  .sb-pcard .ava{width:42px;height:42px;font-size:15px;}
  .sb-pcard .pc-b{flex:1;min-width:0;}
  .sb-pcard .pc-nm{font-size:14px;font-weight:700;color:var(--glass-text);display:flex;align-items:center;gap:6px;}
  .sb-pcard .pc-tag{font-size:9px;font-weight:700;letter-spacing:.05em;color:var(--accent-deep);
    background:var(--glass-hi);border:1px solid var(--glass-line);border-radius:99px;padding:2px 7px;}
  .sb-pcard .pc-st{font-size:11.5px;color:var(--glass-sub);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  /* footer user panel */
  .sb-user{display:flex;align-items:center;gap:10px;padding:11px 12px;
    border-top:1px solid var(--glass-line);background:var(--shell-hover);}
  .sb-user .ava{width:38px;height:38px;font-size:14px;}
  .sb-user .u-b{flex:1;min-width:0;}
  .sb-user .u-nm{font-size:13.5px;font-weight:700;color:var(--glass-text);line-height:1.2;}
  .sb-user .u-st{font:inherit;font-size:11px;color:var(--glass-sub);border:0;background:transparent;outline:none;
    width:100%;padding:2px 4px;margin-left:-4px;border-radius:7px;transition:background .16s;}
  .sb-user .u-st:hover{background:var(--glass-hover);}
  .sb-user .u-st:focus{background:var(--glass-card,var(--glass-bg));box-shadow:0 0 0 1.5px var(--accent);}
  .sb-ubtn{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-line);background:var(--glass-bg);transition:all .18s;}
  .sb-ubtn:hover{color:var(--glass-text);background:var(--glass-hover);}
  .sb-ubtn.muted{color:#e08aa0;border-color:rgba(224,138,160,.5);}

  /* ── friends entry + dm list (home panel) ── */
  .sb-bdg{display:inline-grid;place-items:center;min-width:16px;height:16px;border-radius:8px;padding:0 4px;
    font-size:9.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,#ef9db4,#e0718f);flex:0 0 auto;}
  .sb-hint{font-size:11px;color:var(--glass-sub);padding:2px 10px 4px;}
  `}</style>
);

type Person = { id: string; name: string; ini: string; color: string; couple?: boolean; online?: boolean };

// The world's face, three-way fallback: uploaded image (signed URL) > emoji >
// first letter of the world name on the accent gradient.
function WorldIcon({ world, iconUrl, name, size, radius, fz }: { world: World; iconUrl: string | null; name: string; size: number; radius: number; fz: number }) {
    const img = world.icon_path && iconUrl;
    return (
        <span className="sb-wic" style={{ width: size, height: size, borderRadius: radius, fontSize: fz }}>
            {img ? <img src={img} alt="" /> : world.icon_emoji || name.slice(0, 1)}
        </span>
    );
}

function MiniAva({ person, cls = '', size, speaking, onClick }: { person: Person; cls?: string; size?: number; speaking?: boolean; onClick?: () => void }) {
    const s = size
        ? { width: size, height: size, fontSize: Math.round(size * 0.38), background: person.color }
        : { background: person.color };
    return (
        <span
            className={`ava ${person.couple ? 'couple' : ''} ${person.online ? '' : 'off'} ${speaking ? 'speaking' : ''} ${cls}`}
            style={s}
            onClick={onClick}
        >
            {person.ini}
            <span className="odot" />
        </span>
    );
}

export function Sidebar({
    open,
    setOpen,
    profile,
    setProfile,
    onOpenSettings,
    onOpenWorldSettings,
    world,
    worldIconUrl,
    lobbyStatus,
    lobbyError,
    busy,
    inWorld,
    onEnterWorld,
    onCreateWorld,
    onOpenConv,
    activeConv,
    channels,
    dmConvs,
    pendingCount,
    rooms,
    meRoom,
    onEnterSpace
}: {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    profile: Profile;
    setProfile: Dispatch<SetStateAction<Profile>>;
    onOpenSettings: () => void;
    onOpenWorldSettings: () => void; // world panel header click (world.md W-4)
    world: World | null;
    worldIconUrl: string | null; // signed URL for world.icon_path (WorldPage signs)
    lobbyStatus: 'loading' | 'ready' | 'error';
    lobbyError: string | null;
    busy: boolean;
    inWorld: boolean;
    onEnterWorld: () => void;
    onCreateWorld: () => void;
    onOpenConv: (convId: string) => void; // channel id / dm id / FRIENDS_VIEW
    activeConv: string | null; // conv active in the chat hub — mirrors highlight
    channels: Channel[]; // the world's channels (DB-driven, chat.md CH-14)
    dmConvs: Conv[]; // my DM conversations (account-level, DB-driven)
    pendingCount: number; // incoming friend requests → badge on the 好友 entry
    rooms: Room[];
    meRoom: string;
    onEnterSpace: (r: Room) => void;
}) {
    const [voice, setVoice] = useState<string | null>(null); // joined voice channel id
    // mic defaults muted — joining any audio space never hot-mics you (channel.md)
    const [muted, setMuted] = useState(true);
    const [spk, setSpk] = useState<Record<string, boolean>>({}); // speaking preview flags

    // rail selection, Discord-style: home (DM hub) vs the world column.
    // Follows enter/leave transitions via render-time adjustment (no effect).
    const [railSel, setRailSel] = useState<'home' | 'world'>(inWorld ? 'world' : 'home');
    const [prevInWorld, setPrevInWorld] = useState(inWorld);
    if (inWorld !== prevInWorld) {
        setPrevInWorld(inWorld);
        setRailSel(inWorld ? 'world' : 'home');
    }
    const showHome = railSel === 'home' || !world;

    const her: Person = { id: 'her', name: profile.her || '她', ini: (profile.her || '她').slice(0, 1), color: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)', couple: true, online: true };
    const me: Person = { id: 'me', name: profile.me || '我', ini: (profile.me || '我').slice(0, 1), color: 'linear-gradient(135deg,#FCD9A0,#F1B45A)', couple: true, online: true };
    const here = [her, me]; // presence mock: both of us in the world
    const herRoom = rooms[0]?.id; // presence mock: she idles in the first room

    const days = daysSince(profile.anniv);
    const worldName = profile.world || '我们的小世界';
    const memberCount = world ? (world.member_id ? 2 : 1) : 0;

    return (
        <>
            <SidebarStyles />
            <div className={`owsb2 ${open ? '' : 'folded'}`}>
                {/* ── rail: expanded = full-height column fused with the panel;
                       folded = the zone collapses to 0 so the SCENE claims the
                       full width, and the candy pill floats directly on it. ── */}
                <div className="sb-railzone">
                    <div className="sb-rail glass">
                    <button
                        type="button"
                        className={`sb-rail-btn sb-rail-logo ${showHome ? 'on' : ''}`}
                        title="Our World · 私信"
                        onClick={() => setRailSel('home')}
                    >
                        <IHeart size={20} />
                    </button>
                    <div className="sb-rail-div" />
                    {world && (
                        <button
                            type="button"
                            className={`sb-rail-btn ${!showHome ? 'on' : ''}`}
                            style={{ background: 'var(--accent-grad)', overflow: 'hidden', padding: 0 }}
                            title={worldName}
                            onClick={() => setRailSel('world')}
                        >
                            {world.icon_path && worldIconUrl ? (
                                <img src={worldIconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                world.icon_emoji || worldName.slice(0, 1)
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className="sb-rail-btn sb-rail-add"
                        title={world ? '当前一人一个世界，敬请期待更多' : '创建世界'}
                        onClick={world ? undefined : onCreateWorld}
                        disabled={!!world || busy || lobbyStatus !== 'ready'}
                    >
                        <IPlus size={18} />
                    </button>
                    <div className="sb-rail-sp" />
                    <button type="button" className={`sb-rail-fold ${open ? '' : 'folded'}`} onClick={() => setOpen((o) => !o)} title={open ? '收起面板' : '展开面板'}>
                        <span className="ic">
                            <IChevron size={15} style={{ transform: 'rotate(180deg)' }} />
                        </span>
                    </button>
                    </div>
                </div>

                {/* ── panel: collapsible context column — stays mounted so the
                       fold/unfold can play as a width morph in sync with the rail ── */}
                {(
                    <div className={`sb-panel glass ${open ? '' : 'closed'}`} aria-hidden={!open}>
                        {showHome ? (
                            <>
                                {/* home / DM hub — Discord's "私信" column */}
                                <div className="sb-hd">
                                    <div className="sb-hd-top">
                                        <span className="sb-logo-badge">
                                            <IHeart size={18} />
                                        </span>
                                        <div className="sb-id">
                                            <h3>Our World</h3>
                                            <div className="meta">
                                                <span className="dot" />
                                                你们的私密小宇宙
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="sb-scroll">
                                    {/* friends entry — opens the friends page in the chat hub
                                        (Discord-style; management lives there, not here) */}
                                    <div className={`sb-room ${activeConv === FRIENDS_VIEW ? 'on' : ''}`} onClick={() => onOpenConv(FRIENDS_VIEW)} title="好友">
                                        <span className="ic">💗</span>
                                        <span className="nm">好友</span>
                                        {pendingCount > 0 && <span className="sb-bdg">{pendingCount}</span>}
                                    </div>
                                    <div className="sb-room" title="商店，敬请期待">
                                        <span className="ic">
                                            <ISparkle size={17} />
                                        </span>
                                        <span className="nm">商店</span>
                                        <span className="sb-tag">敬请期待</span>
                                    </div>

                                    <div className="sb-cat">私信</div>
                                    {dmConvs.length === 0 && <div className="sb-hint">添加好友后这里会出现私信</div>}
                                    {dmConvs.map((c) => (
                                        <div key={c.id} className={`sb-dm ${activeConv === c.id ? 'on' : ''}`} onClick={() => onOpenConv(c.id)} title={`私信 ${c.name}`}>
                                            <MiniAva person={{ id: c.id, name: c.name, ini: c.ini ?? c.name.slice(0, 1), color: c.color ?? '', online: true }} size={30} />
                                            <span className="nm">{c.name}</span>
                                            <span className="st">{c.hint}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* world column — channels in-world, status card in the lobby.
                                    The header strip (icon + name + days) is the world-settings
                                    entry: the WHOLE strip is one click target (world.md W-4). */}
                                <div className="sb-hd">
                                    <div
                                        className="sb-hd-top tap"
                                        role="button"
                                        tabIndex={0}
                                        title="世界设置"
                                        aria-label="打开世界设置"
                                        onClick={onOpenWorldSettings}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onOpenWorldSettings();
                                            }
                                        }}
                                    >
                                        {world && <WorldIcon world={world} iconUrl={worldIconUrl} name={worldName} size={40} radius={14} fz={17} />}
                                        <div className="sb-id">
                                            <h3>{worldName}</h3>
                                            <div className="meta">
                                                <span className="dot" />在一起 <span className="num">{days}</span> 天
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sb-scroll">
                                    {inWorld ? (
                                        <>
                                            {/* rooms — voice channels extended with a bound scene
                                                (channel.md). Clicking one switches the scene, the
                                                same action as the map module; clicking the room
                                                you're in is a no-op. Occupant minis preview the
                                                "see where she is" presence (mock for now). */}
                                            <div className="sb-cat">房间</div>
                                            {rooms.map((r) => {
                                                const Icon = ROOM_ICONS[r.icon] ?? IHash;
                                                const on = r.id === meRoom;
                                                const who = [...(on ? [me] : []), ...(r.id === herRoom ? [her] : [])];
                                                return (
                                                    <div
                                                        key={r.id}
                                                        className={`sb-room ${on ? 'on' : ''}`}
                                                        onClick={() => {
                                                            if (!on) onEnterSpace(r);
                                                        }}
                                                        title={on ? `正在 ${r.name}` : `去${r.name} · ${r.note || ''}`}
                                                    >
                                                        <span className="ic">
                                                            <Icon size={17} />
                                                        </span>
                                                        <span className="nm">{r.name}</span>
                                                        <span className="who">
                                                            {who.map((p) => (
                                                                <span key={p.id} className="mini" style={{ background: p.color }}>
                                                                    {p.ini}
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {/* text channels — summon buttons for the chat hub;
                                                highlight mirrors the hub's active conv */}
                                            <div className="sb-cat">文字频道</div>
                                            {channels
                                                .filter((ch) => ch.type === 'text')
                                                .map((ch) => (
                                                    <div
                                                        key={ch.id}
                                                        className={`sb-room ${activeConv === ch.id ? 'on' : ''}`}
                                                        onClick={() => onOpenConv(ch.id)}
                                                        title={ch.topic ?? ''}
                                                    >
                                                        <span className="ic">
                                                            <IHash size={17} />
                                                        </span>
                                                        <span className="nm">{ch.name}</span>
                                                    </div>
                                                ))}

                                            {/* voice channels (mock) — pure voice, no scene bound;
                                                rooms above are the scene-bound superset (channel.md) */}
                                            <div className="sb-cat">语音频道</div>
                                            {VOICE_DEFAULT.map((vc) => {
                                                const joined = voice === vc.id;
                                                return (
                                                    <div key={vc.id}>
                                                        <div className={`sb-vc-head ${joined ? 'live' : ''}`} onClick={() => setVoice(joined ? null : vc.id)}>
                                                            <span className="ic">
                                                                <IVolume size={17} />
                                                            </span>
                                                            <span className="nm">{vc.name}</span>
                                                            <span className="join">{joined ? '离开' : '加入'}</span>
                                                        </div>
                                                        {joined && (
                                                            <div className="sb-vc-members">
                                                                <div className="sb-vc-m">
                                                                    <MiniAva person={me} size={26} speaking={!muted} />
                                                                    {me.name}
                                                                    <span className={`mc ${muted ? 'muted' : ''}`}>{muted ? <IMicOff size={15} /> : <IMic size={15} />}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* who's in the world (presence mock) */}
                                            <div className="sb-cat">成员 — {here.length}</div>
                                            {here.map((pp) => (
                                                <div
                                                    key={pp.id}
                                                    className="sb-pcard"
                                                    onClick={() => setSpk((s) => ({ ...s, [pp.id]: !s[pp.id] }))}
                                                    title="轻点预览说话光晕"
                                                >
                                                    <MiniAva person={pp} speaking={!!spk[pp.id]} />
                                                    <div className="pc-b">
                                                        <div className="pc-nm">
                                                            {pp.name}
                                                            <span className="pc-tag">{pp.id === 'me' ? '你' : '她'}</span>
                                                        </div>
                                                        <div className="pc-st">{pp.id === 'me' ? profile.status || '在你身边' : '在看窗外发呆'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {/* lobby: world status card — enter from here or the portal */}
                                            <div className="sb-cat">世界动态</div>
                                            <div className="sb-rcard">
                                                <div className="rc-top">
                                                    {world && <WorldIcon world={world} iconUrl={worldIconUrl} name={worldName} size={22} radius={8} fz={11} />}
                                                    <span className="rc-nm">{worldName}</span>
                                                </div>
                                                <div className="rc-doing">像是在等你回来…</div>
                                                <div className="rc-foot">
                                                    <span className="rc-ppl">
                                                        <MiniAva person={me} size={24} />
                                                        {memberCount > 1 && <MiniAva person={her} size={24} />}
                                                    </span>
                                                    <span className="rc-cnt">{memberCount} 位成员</span>
                                                    <button type="button" className="rc-go" onClick={onEnterWorld} disabled={busy}>
                                                        进入
                                                    </button>
                                                </div>
                                            </div>
                                            {lobbyError && <div className="sb-err">{lobbyError}</div>}

                                            {/* activity invites — UI placeholder, see ai/Features/activity.md (TBD) */}
                                            <div className="sb-cat">活动邀请</div>
                                            <div className="sb-rcard invite">
                                                <div className="rc-top">
                                                    <IChat size={15} style={{ color: 'var(--accent-deep)', flex: '0 0 auto' }} />
                                                    <span className="rc-nm">找人一起玩？</span>
                                                    <span className="sb-tag">敬请期待</span>
                                                </div>
                                                <div className="rc-doing">世界里的人可以发出邀请：打扑克、看电影、一起听歌…</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {/* footer user panel — persistent in both columns */}
                        <div className="sb-user">
                            <MiniAva person={me} />
                            <div className="u-b">
                                <div className="u-nm">{me.name}</div>
                                <input
                                    className="u-st"
                                    value={profile.status || ''}
                                    placeholder="设置状态…"
                                    maxLength={20}
                                    onChange={(e) => setProfile((o) => ({ ...o, status: e.target.value }))}
                                    spellCheck={false}
                                />
                            </div>
                            <div className={`sb-ubtn ${muted ? 'muted' : ''}`} onClick={() => setMuted((m) => !m)} title={muted ? '取消静音' : '静音'}>
                                {muted ? <IMicOff size={16} /> : <IMic size={16} />}
                            </div>
                            <div className="sb-ubtn" onClick={onOpenSettings} title="设置">
                                <ICog size={16} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
