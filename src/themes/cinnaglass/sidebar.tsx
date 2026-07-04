// sidebar.tsx — persistent Discord-style left sidebar, in the same layout
// layer as the stage (opening it squeezes the scene right, no overlay):
// an always-on rail of room-entry icons + a collapsible full-height panel.
// Panel body switches on inRoom: lobby = room status cards (no channels),
// in-room = text/voice channel management (scene-area switching lives in the
// map feature, not here). Text channel click opens the covering ChannelScreen;
// the DM section is persistent and solidifies the in-scene ChatDock.
// See ai/Features/sidebar.md + ai/Features/chat.md.
import { useState, type Dispatch, type SetStateAction } from 'react';
import { IChat, IChevron, ICog, IHash, IHeart, IMic, IMicOff, IPlus, IVolume } from './icons';
import { VOICE_DEFAULT } from './rooms';
import { CONTACTS } from './contacts';
import { TEXT_CHANNELS } from './chat-data';
import type { Profile } from './model';
import type { Room as SharedRoom } from '@/types/feed.ts';

const daysSince = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return 0;
    return Math.max(1, Math.floor((Date.now() - d.getTime()) / 864e5) + 1);
};

const SidebarStyles = () => (
    <style>{`
  /* ── persistent two-column shell — in-flow, full height, squeezes the
        stage to the right instead of floating over it ── */
  .owsb2{position:relative;z-index:13;height:100%;flex:0 0 auto;display:flex;}

  /* rail: always-on room-entry column */
  .sb-rail{width:64px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;
    gap:10px;padding:14px 0;border-radius:0;border-left:0;}
  .sb-rail-btn{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;
    font-size:17px;font-weight:800;color:#fff;border:2px solid rgba(255,255,255,.72);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55);flex:0 0 auto;position:relative;
    transition:border-radius .22s,transform .2s,box-shadow .2s;}
  .sb-rail-btn:hover{border-radius:16px;transform:translateY(-1px);}
  .sb-rail-btn.on{border-radius:16px;box-shadow:0 0 0 2.5px var(--accent),0 6px 16px -5px rgba(20,29,51,.55);}
  .sb-rail-btn.on::before{content:"";position:absolute;left:-12px;top:50%;transform:translateY(-50%);
    width:4px;height:22px;border-radius:0 4px 4px 0;background:var(--accent);}
  .sb-rail-btn:disabled{opacity:.45;cursor:default;transform:none;}
  .sb-rail-add{background:var(--glass-bg-2);color:var(--accent-deep);border:1.5px dashed var(--glass-border);
    box-shadow:none;font-weight:700;}
  .sb-rail-add:hover{border-color:var(--accent);color:var(--accent);}
  .sb-rail-sp{flex:1;}
  .sb-rail-fold{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;cursor:pointer;
    color:var(--glass-sub);border:1px solid var(--glass-border);background:var(--glass-bg-2);
    transition:color .18s,background .18s;}
  .sb-rail-fold:hover{color:var(--glass-text);background:var(--glass-hi);}
  .sb-rail-fold .ic{display:inline-flex;transition:transform .3s;}
  .sb-rail-fold.folded .ic{transform:rotate(180deg);}

  /* panel: collapsible context column (full height, in-flow) */
  .sb-panel{width:min(252px,calc(100vw - 84px));display:flex;flex-direction:column;min-height:0;
    border-radius:0;border-left:1px solid var(--glass-border);overflow:hidden;
    box-shadow:18px 0 50px -18px rgba(20,29,51,.4);animation:sbPanelIn .28s ease both;}
  @keyframes sbPanelIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
  @media (prefers-reduced-motion: reduce){.sb-panel{animation:none}}

  .sb-hd{padding:16px 14px 12px;background:linear-gradient(160deg,var(--glass-hi),transparent);}
  .sb-hd-top{display:flex;align-items:center;gap:11px;}
  .sb-avas{display:flex;}
  .sb-avas .ava{width:40px;height:40px;font-size:15px;margin-left:-13px;}
  .sb-avas .ava:first-child{margin-left:0;}
  .sb-id{flex:1;min-width:0;}
  .sb-id h3{margin:0;font-size:15.5px;font-weight:800;color:var(--glass-text);letter-spacing:.01em;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-id .meta{font-size:11.5px;color:var(--glass-sub);margin-top:2px;display:flex;align-items:center;gap:6px;}
  .sb-id .meta .num{font-family:"Baloo 2",sans-serif;color:var(--accent-deep);font-weight:700;}
  .sb-id .meta .dot{width:6px;height:6px;border-radius:50%;background:#5fcf8e;box-shadow:0 0 6px #5fcf8e;flex:0 0 auto;}

  .sb-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 10px 12px;}
  .sb-scroll::-webkit-scrollbar{width:6px;}
  .sb-scroll::-webkit-scrollbar-thumb{background:var(--glass-border);border-radius:9px;}

  .sb-cat{display:flex;align-items:center;justify-content:space-between;
    font-size:10.5px;letter-spacing:.15em;font-weight:700;color:var(--glass-sub);
    padding:14px 8px 6px;text-transform:uppercase;}
  .sb-cat .cog{display:inline-flex;cursor:pointer;color:var(--glass-sub);transition:color .18s,transform .2s;}
  .sb-cat .cog:hover{color:var(--accent-deep);}
  .sb-cat .cog.on{color:var(--accent-deep);transform:rotate(60deg);}

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

  /* ── DM section (persistent in both states) ── */
  .sb-dm{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .sb-dm:hover{background:var(--glass-bg-2);color:var(--glass-text);}
  .sb-dm .ava{width:30px;height:30px;font-size:12px;}
  .sb-dm .nm{flex:1;font-size:13.5px;font-weight:600;color:var(--glass-text);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-dm .st{font-size:11px;color:var(--glass-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;}

  /* ── lobby: room status cards ── */
  .sb-rcard{border:1px solid var(--glass-border);background:var(--glass-bg-2);border-radius:16px;
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
    color:#0d2336;border-radius:99px;padding:6px 14px;background:linear-gradient(135deg,#9fd6f4,#5fb0e2);
    box-shadow:0 5px 14px -6px rgba(79,169,220,.7);transition:transform .18s;}
  .sb-rcard .rc-go:hover{transform:translateY(-1px);}
  .sb-rcard .rc-go:disabled{opacity:.5;cursor:default;transform:none;}
  .sb-rcard.invite{border-style:dashed;opacity:.85;}
  .sb-rcard .rc-tag{font-size:9.5px;font-weight:700;letter-spacing:.06em;color:var(--accent-deep);
    background:var(--glass-hi);border:1px solid var(--glass-border);border-radius:99px;padding:2px 8px;flex:0 0 auto;}
  .sb-lob-empty{text-align:center;font-size:12.5px;color:var(--glass-sub);padding:14px 8px;line-height:1.7;}
  .sb-err{font-size:12px;color:#d96a84;padding:4px 10px;}

  /* ── in-room: scene areas / config / voice / presence ── */
  .sb-room{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;position:relative;}
  .sb-room:hover{background:var(--glass-bg-2);color:var(--glass-text);}
  .sb-room.on{background:var(--glass-hi);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-border);}
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
  .sb-vc-head:hover{background:var(--glass-bg-2);color:var(--glass-text);}
  .sb-vc-head.live{color:var(--glass-text);}
  .sb-vc-head .ic{display:inline-flex;flex:0 0 auto;}
  .sb-vc-head .nm{flex:1;font-size:14px;font-weight:600;}
  .sb-vc-head .join{font-size:11px;font-weight:700;color:var(--accent-deep);}
  .sb-vc-members{padding:2px 10px 4px 30px;display:flex;flex-direction:column;gap:6px;}
  .sb-vc-m{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--glass-text);font-weight:600;}
  .sb-vc-m .ava{width:26px;height:26px;font-size:11px;}
  .sb-vc-m .mc{margin-left:auto;display:inline-flex;color:#5fcf8e;}
  .sb-vc-m .mc.muted{color:#e08aa0;}

  .sb-pcard{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;background:var(--glass-bg-2);
    border:1px solid var(--glass-border);margin-bottom:8px;cursor:pointer;transition:background .16s;}
  .sb-pcard:hover{background:var(--glass-hi);}
  .sb-pcard .ava{width:42px;height:42px;font-size:15px;}
  .sb-pcard .pc-b{flex:1;min-width:0;}
  .sb-pcard .pc-nm{font-size:14px;font-weight:700;color:var(--glass-text);display:flex;align-items:center;gap:6px;}
  .sb-pcard .pc-tag{font-size:9px;font-weight:700;letter-spacing:.05em;color:var(--accent-deep);
    background:var(--glass-hi);border:1px solid var(--glass-border);border-radius:99px;padding:2px 7px;}
  .sb-pcard .pc-st{font-size:11.5px;color:var(--glass-sub);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  /* footer user panel */
  .sb-user{display:flex;align-items:center;gap:10px;padding:11px 12px;
    border-top:1px solid var(--glass-border);background:var(--glass-bg-2);}
  .sb-user .ava{width:38px;height:38px;font-size:14px;}
  .sb-user .u-b{flex:1;min-width:0;}
  .sb-user .u-nm{font-size:13.5px;font-weight:700;color:var(--glass-text);line-height:1.2;}
  .sb-user .u-st{font:inherit;font-size:11px;color:var(--glass-sub);border:0;background:transparent;outline:none;
    width:100%;padding:2px 4px;margin-left:-4px;border-radius:7px;transition:background .16s;}
  .sb-user .u-st:hover{background:var(--glass-hi);}
  .sb-user .u-st:focus{background:var(--glass-card,var(--glass-bg));box-shadow:0 0 0 1.5px var(--accent);}
  .sb-ubtn{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-border);background:var(--glass-bg);transition:all .18s;}
  .sb-ubtn:hover{color:var(--glass-text);background:var(--glass-hi);}
  .sb-ubtn.muted{color:#e08aa0;border-color:rgba(224,138,160,.5);}
  `}</style>
);

type Person = { id: string; name: string; ini: string; color: string; couple?: boolean; online?: boolean };

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
    sharedRoom,
    lobbyStatus,
    lobbyError,
    busy,
    inRoom,
    onEnterRoom,
    onCreateRoom,
    onOpenDm,
    onOpenChannel
}: {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    profile: Profile;
    setProfile: Dispatch<SetStateAction<Profile>>;
    onOpenSettings: () => void;
    sharedRoom: SharedRoom | null;
    lobbyStatus: 'loading' | 'ready' | 'error';
    lobbyError: string | null;
    busy: boolean;
    inRoom: boolean;
    onEnterRoom: () => void;
    onCreateRoom: () => void;
    onOpenDm: (contactId: string) => void;
    onOpenChannel: (channelId: string) => void;
}) {
    const [voice, setVoice] = useState<string | null>(null); // joined voice channel id
    const [muted, setMuted] = useState(false);
    const [spk, setSpk] = useState<Record<string, boolean>>({}); // speaking preview flags

    const her: Person = { id: 'her', name: profile.her || '她', ini: (profile.her || '她').slice(0, 1), color: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)', couple: true, online: true };
    const me: Person = { id: 'me', name: profile.me || '我', ini: (profile.me || '我').slice(0, 1), color: 'linear-gradient(135deg,#FCD9A0,#F1B45A)', couple: true, online: true };
    const here = [her, me]; // presence mock: both of us in the room

    const days = daysSince(profile.anniv);
    const worldName = profile.world || '我们的小世界';
    const memberCount = sharedRoom ? (sharedRoom.member_id ? 2 : 1) : 0;
    // DM contacts: lover pinned first, groups excluded from the compact list
    const dms = CONTACTS.filter((c) => !c.group).slice(0, 3);

    return (
        <>
            <SidebarStyles />
            <div className="owsb2">
                {/* ── rail: room entries, always on ── */}
                <div className="sb-rail glass">
                    {sharedRoom && (
                        <button
                            type="button"
                            className={`sb-rail-btn ${inRoom ? 'on' : ''}`}
                            style={{ background: 'linear-gradient(135deg,#9fd6f4,#5fb0e2)' }}
                            title={inRoom ? worldName : `进入 · ${worldName}`}
                            onClick={onEnterRoom}
                            disabled={busy}
                        >
                            {worldName.slice(0, 1)}
                        </button>
                    )}
                    <button
                        type="button"
                        className="sb-rail-btn sb-rail-add"
                        title={sharedRoom ? '当前一人一房，敬请期待更多空间' : '创建房间'}
                        onClick={sharedRoom ? undefined : onCreateRoom}
                        disabled={!!sharedRoom || busy || lobbyStatus !== 'ready'}
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

                {/* ── panel: collapsible context column ── */}
                {open && (
                    <div className="sb-panel glass">
                        <div className="sb-hd">
                            <div className="sb-hd-top">
                                <div className="sb-avas">
                                    <MiniAva person={her} />
                                    <MiniAva person={me} />
                                </div>
                                <div className="sb-id">
                                    <h3>{worldName}</h3>
                                    <div className="meta">
                                        <span className="dot" />在一起 <span className="num">{days}</span> 天
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sb-scroll">
                            {/* DM — persistent in both states */}
                            <div className="sb-cat">私信</div>
                            {dms.map((c) => (
                                <div key={c.id} className="sb-dm" onClick={() => onOpenDm(c.id)} title={`私信 ${c.name}`}>
                                    <MiniAva person={{ id: c.id, name: c.name, ini: c.ini, color: c.color, couple: c.lover, online: c.online }} size={30} />
                                    <span className="nm">{c.name}</span>
                                    <span className="st">{c.status}</span>
                                </div>
                            ))}

                            {inRoom ? (
                                <>
                                    {/* text channels — click opens the covering ChannelScreen.
                                        (scene-area switching belongs to the map feature, not here) */}
                                    <div className="sb-cat">文字频道</div>
                                    {TEXT_CHANNELS.map((ch) => (
                                        <div key={ch.id} className="sb-room" onClick={() => onOpenChannel(ch.id)} title={ch.topic}>
                                            <span className="ic">
                                                <IHash size={17} />
                                            </span>
                                            <span className="nm">{ch.name}</span>
                                        </div>
                                    ))}

                                    {/* voice channels (mock) */}
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

                                    {/* who's here (presence mock) */}
                                    <div className="sb-cat">在房间的人 — {here.length}</div>
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
                                    {/* lobby: room status cards — no channels here */}
                                    <div className="sb-cat">房间动态</div>
                                    {lobbyStatus === 'loading' ? (
                                        <div className="sb-lob-empty">正在寻找你们的小世界…</div>
                                    ) : lobbyStatus === 'error' ? (
                                        <div className="sb-err">{lobbyError || '出了点问题，稍后再试。'}</div>
                                    ) : sharedRoom ? (
                                        <div className="sb-rcard">
                                            <div className="rc-top">
                                                <IHeart size={15} style={{ color: 'var(--accent-deep)', flex: '0 0 auto' }} />
                                                <span className="rc-nm">{worldName}</span>
                                            </div>
                                            <div className="rc-doing">像是在等你回来…</div>
                                            <div className="rc-foot">
                                                <span className="rc-ppl">
                                                    <MiniAva person={me} size={24} />
                                                    {memberCount > 1 && <MiniAva person={her} size={24} />}
                                                </span>
                                                <span className="rc-cnt">{memberCount} 位成员</span>
                                                <button type="button" className="rc-go" onClick={onEnterRoom} disabled={busy}>
                                                    进入
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="sb-rcard">
                                            <div className="rc-top">
                                                <IHeart size={15} style={{ color: 'var(--accent-deep)', flex: '0 0 auto' }} />
                                                <span className="rc-nm">还没有你们的小世界</span>
                                            </div>
                                            <div className="rc-doing">创建一个房间，开始收藏你们的回忆。</div>
                                            <div className="rc-foot">
                                                <span className="rc-cnt" />
                                                <button type="button" className="rc-go" onClick={onCreateRoom} disabled={busy}>
                                                    {busy ? '创建中…' : '创建房间'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* activity invites — UI placeholder, see ai/Features/activity.md (TBD) */}
                                    <div className="sb-cat">活动邀请</div>
                                    <div className="sb-rcard invite">
                                        <div className="rc-top">
                                            <IChat size={15} style={{ color: 'var(--accent-deep)', flex: '0 0 auto' }} />
                                            <span className="rc-nm">找人一起玩？</span>
                                            <span className="rc-tag">敬请期待</span>
                                        </div>
                                        <div className="rc-doing">房间里的人可以发出邀请：打扑克、看电影、一起听歌…</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* footer user panel */}
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