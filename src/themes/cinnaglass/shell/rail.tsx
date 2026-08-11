// rail.tsx — the slim left rail of the v2 shell, rebuilt 1:1 against the
// codex pixel spec (codex-visual/20260811-055917Z). Eight entries as drawn
// in the comp; every material value comes from the --cg-* token block in
// cinnaglass.css — reskin the game UI by retuning tokens, not components.

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { IcoProps } from '../icons';
import {
    IBag,
    ICalendar,
    IChat,
    IChevron,
    ICog,
    IGrid,
    ILock,
    ILogout,
    IMusic,
    IPhoto,
    ISofa
} from '../icons';
import type { Widgets } from '../model';

export type RailKey =
    | 'rooms'
    | 'chat'
    | 'photos'
    | 'calendar'
    | 'music'
    | 'modules'
    | 'shop'
    | 'settings';

type RoomDef = {
    id: string;
    name: string;
    thumb: string;
    locked?: boolean;
};

export const ROOM_DEFS: RoomDef[] = [
    { id: 'study', name: '书房', thumb: '/rooms/study/thumb.png' },
    { id: 'gameroom', name: '棋牌室', thumb: '/rooms/gameroom/thumb.png', locked: true },
    { id: 'garden', name: '植物园', thumb: '/rooms/garden/thumb.png', locked: true }
];

// fixed-layout module toggles (drag editing retired — ai/UX.md §2)
const MODULE_DEFS: { key: string; label: string }[] = [
    { key: 'anniv', label: '纪念日卡' },
    { key: 'music', label: '音乐迷你条' },
    { key: 'presence', label: '对方状态胶囊' }
];

type RailProps = {
    unread: boolean;
    activeRoom: string;
    onRoom: (id: string) => void;
    onAction: (k: RailKey) => void;
    widgets: Widgets;
    setWidget: (k: string, v: boolean) => void;
    onLeaveWorld: () => void;
};

export function Rail({ unread, activeRoom, onRoom, onAction, widgets, setWidget, onLeaveWorld }: RailProps) {
    const [pop, setPop] = useState<'rooms' | 'modules' | null>(null);

    const btn = (
        key: RailKey,
        Icon: (p: IcoProps) => ReactNode,
        label: string,
        opts?: { dot?: boolean; disabled?: boolean; active?: boolean }
    ) => (
        <button
            key={key}
            className={`rail-btn ${opts?.active ? 'on' : ''}`}
            title={label}
            disabled={opts?.disabled}
            onClick={() => {
                if (key === 'rooms') setPop(pop === 'rooms' ? null : 'rooms');
                else if (key === 'modules') setPop(pop === 'modules' ? null : 'modules');
                else {
                    setPop(null);
                    onAction(key);
                }
            }}
        >
            <Icon size={24} sw={2.5} />
            {opts?.dot && <span className="rail-dot" />}
        </button>
    );

    return (
        <div className="rail-wrap">
            <RailStyles />
            <nav className="rail">
                {/* spec 5.1 — eight entries, top group then system group */}
                {btn('rooms', ISofa, '房间', { active: pop === 'rooms' })}
                {btn('chat', IChat, '聊天', { dot: unread })}
                {btn('photos', IPhoto, '照片墙')}
                {btn('calendar', ICalendar, '日历·纪念日')}
                {btn('music', IMusic, '一起听')}
                <span className="rail-sep" />
                {btn('modules', IGrid, '悬浮组件', { active: pop === 'modules' })}
                {btn('shop', IBag, '装扮（敬请期待）', { disabled: true })}
                {btn('settings', ICog, '设置')}
            </nav>

            {pop === 'rooms' && (
                <div className="rail-pop rooms-pop">
                    <span className="rooms-tip" />
                    {ROOM_DEFS.map((r) => (
                        <button
                            key={r.id}
                            className={`room-card ${activeRoom === r.id ? 'cur' : ''} ${r.locked ? 'locked' : ''}`}
                            title={r.locked ? `${r.name}（敬请期待）` : r.name}
                            onClick={() => {
                                if (r.locked) return;
                                onRoom(r.id);
                                setPop(null);
                            }}
                        >
                            <img src={r.thumb} alt={r.name} draggable={false} />
                            {r.locked && (
                                <span className="room-lock">
                                    <ILock size={15} />
                                </span>
                            )}
                            {activeRoom === r.id && <span className="room-cur-dot" />}
                        </button>
                    ))}
                </div>
            )}

            {pop === 'modules' && (
                <div className="rail-pop modules-pop">
                    {MODULE_DEFS.map((m) => (
                        <label key={m.key} className="module-row">
                            <span>{m.label}</span>
                            <span
                                className={`sw ${widgets[m.key] !== false ? 'on' : ''}`}
                                onClick={() => setWidget(m.key, widgets[m.key] === false)}
                            />
                        </label>
                    ))}
                    <button className="modules-lobby" onClick={onLeaveWorld}>
                        <ILogout size={13} /> 回大厅
                    </button>
                </div>
            )}

            {pop && <div className="rail-scrim" onClick={() => setPop(null)} />}
        </div>
    );
}

/**
 * Right-edge room handle (spec §5.8): 55px visible, clipped by the viewport
 * edge, left corners r24. Real switching arrives with the second room —
 * today it reads as the affordance the comp promises.
 */
export function RoomHandle({ onTap }: { onTap: () => void }) {
    return (
        <button className="room-handle" title="切换房间（更多房间即将开放）" onClick={onTap}>
            <RoomHandleStyles />
            <IChevron size={20} sw={4} />
        </button>
    );
}

const RoomHandleStyles = () => (
    <style>{`
    .room-handle{
        position:absolute;right:-10px;top:29%;z-index:36;
        width:65px;height:99px;
        border-radius:24px 0 0 24px;
        display:flex;align-items:center;justify-content:flex-start;
        padding-left:14px;
        appearance:none;cursor:pointer;
        background:rgba(67,68,91,0.8);
        border:1px solid var(--cg-stroke);border-right:0;
        box-shadow:var(--cg-shadow), var(--cg-inset);
        backdrop-filter:var(--cg-blur);
        color:var(--cg-icon);
        transition:transform 160ms ease,filter 160ms ease;
    }
    .room-handle:hover{transform:translateX(-4px);filter:brightness(1.08);}
    .room-handle:active{transform:translateX(-2px) scale(0.97);}
    `}</style>
);

const RailStyles = () => (
    <style>{`
    /* spec 5.1: x14, w56, r23, near full height (y39..953 of 992 ≈ 4% margins) */
    .rail-wrap{position:absolute;left:14px;top:4%;bottom:4%;z-index:40;display:flex;}
    .rail{
        display:flex;flex-direction:column;align-items:center;
        gap:31px;
        width:56px;padding:20px 0;border-radius:23px;
        background:var(--cg-panel);
        border:1px solid var(--cg-stroke);
        backdrop-filter:var(--cg-blur);
        box-shadow:var(--cg-shadow), var(--cg-inset);
        justify-content:flex-start;
    }
    /* spec: button plate 42×47 r19, icon 24px #F8F8F9 */
    .rail-btn{
        position:relative;appearance:none;border:0;cursor:pointer;flex:none;
        width:42px;height:47px;border-radius:19px;
        display:flex;align-items:center;justify-content:center;
        background:var(--cg-control);color:var(--cg-icon);
        transition:background 160ms ease,transform 120ms ease;
    }
    .rail-btn:hover{background:rgba(151,149,169,0.38);transform:translateY(-1px);}
    .rail-btn:active{transform:scale(0.94);}
    .rail-btn.on{background:var(--cg-highlight-blue);}
    .rail-btn:disabled{opacity:0.4;cursor:default;transform:none;}
    .rail-btn:disabled:hover{background:var(--cg-control);}
    /* spec: unread dot 14px #FA9FB2, pink halo */
    .rail-dot{
        position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;
        background:#FA9FB2;border:2px solid rgba(255,223,231,0.75);
        box-shadow:0 0 7px rgba(250,159,178,0.55);
    }
    /* spec: separator 29×2 */
    .rail-sep{width:29px;height:2px;border-radius:1px;margin:-12px 0;
        background:#9291A0;box-shadow:0 1px 0 #616173;flex:none;}
    .rail-scrim{position:fixed;inset:0;z-index:-1;}
    .rail-pop{
        position:absolute;
        background:var(--cg-panel-grad);
        border:1px solid var(--cg-stroke);
        backdrop-filter:var(--cg-blur);
        box-shadow:var(--cg-shadow), var(--cg-inset);
        animation:railpop 220ms cubic-bezier(0.34,1.3,0.5,1);
        transform-origin:left top;
    }
    @keyframes railpop{0%{opacity:0;transform:scale(0.92) translateX(-4px);}100%{opacity:1;transform:scale(1) translateX(0);}}
    /* spec 5.2: body 422×173 r21, padding 27/19/20/21, diamond tip on the left */
    .rooms-pop{
        left:101px;top:0;
        width:422px;height:173px;border-radius:21px;
        display:flex;gap:15px;align-items:flex-start;
        padding:19px 20px 21px 27px;
    }
    .rooms-tip{
        position:absolute;left:-9px;top:41px;width:18px;height:18px;
        background:rgba(61,73,122,0.78);
        border-left:1px solid var(--cg-stroke);border-bottom:1px solid var(--cg-stroke);
        transform:rotate(45deg);border-radius:3px;
    }
    /* spec: card 116×133 r17, NO name footer (the comp has none), blue
       selected edge 3px + glow, 16px selection dot at the bottom center */
    .room-card{
        position:relative;appearance:none;cursor:pointer;padding:0;flex:none;
        width:116px;height:133px;border-radius:17px;overflow:hidden;background:transparent;
        border:3px solid transparent;transition:transform 140ms ease,border-color 160ms ease,box-shadow 160ms ease;
    }
    .room-card:hover{transform:translateY(-2px);}
    .room-card.cur{border-color:var(--cg-sel-edge);box-shadow:0 0 9px rgba(86,118,255,0.72);}
    .room-card img{display:block;width:100%;height:100%;object-fit:cover;}
    .room-card.locked img{filter:grayscale(0.5) brightness(0.62);}
    .room-lock{position:absolute;top:7px;right:7px;color:rgba(255,255,255,0.88);
        filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));}
    .room-cur-dot{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);
        width:16px;height:16px;border-radius:50%;
        background:#CDE9FF;border:2px solid #F0F7FF;box-shadow:0 0 8px #6EA8FF;}
    .modules-pop{
        left:101px;top:170px;
        display:flex;flex-direction:column;gap:2px;min-width:200px;
        border-radius:19px;padding:10px;
        background:var(--cg-panel);
    }
    .module-row{
        display:flex;align-items:center;justify-content:space-between;gap:18px;
        padding:8px 10px;border-radius:10px;font-size:13px;color:var(--cg-icon);
    }
    .module-row:hover{background:var(--cg-control);}
    .modules-lobby{
        appearance:none;border:0;cursor:pointer;
        display:flex;align-items:center;gap:5px;margin-top:4px;padding:8px 10px;
        border-radius:10px;background:transparent;color:var(--cg-icon-muted);
        font-size:12px;transition:background 160ms ease,color 160ms ease;
    }
    .modules-lobby:hover{background:var(--cg-control);color:var(--cg-icon);}
    `}</style>
);
