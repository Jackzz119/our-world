// rail.tsx — the slim left rail of the v2 shell (concept-c). A floating
// graphite glass strip: room switcher on top, feature entries in the
// middle, system entries at the bottom. Replaces the Discord-era sidebar.
// Popovers (rooms / modules) anchor to their rail buttons.

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { IcoProps } from '../icons';
import { IChat, IChevron, ICog, IGrid, ILock, INote, IPhoto, ISofa, ILogout } from '../icons';
import type { Widgets } from '../model';

export type RailKey = 'rooms' | 'chat' | 'photos' | 'timeline' | 'music' | 'modules' | 'shop' | 'settings';

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

// fixed-layout module toggles (drag editing retired — cozy products ship a
// good layout instead of a layout editor, see ai/UX.md §2)
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
            <Icon size={20} />
            {opts?.dot && <span className="rail-dot" />}
        </button>
    );

    return (
        <div className="rail-wrap">
            <RailStyles />
            <nav className="rail">
                {/* codex audit H2: one primary set of 4, system pair below —
                    music lives in its own bottom-right bar, shop waits for
                    the dress-up era */}
                {btn('rooms', ISofa, '房间', { active: pop === 'rooms' })}
                {btn('chat', IChat, '聊天', { dot: unread })}
                {btn('timeline', INote, '时间线')}
                {btn('photos', IPhoto, '照片墙')}
                <span className="rail-sep" />
                {btn('modules', IGrid, '悬浮组件', { active: pop === 'modules' })}
                {btn('settings', ICog, '设置')}
            </nav>

            {pop === 'rooms' && (
                <div className="rail-pop rooms-pop">
                    {ROOM_DEFS.map((r) => (
                        <button
                            key={r.id}
                            className={`room-card ${activeRoom === r.id ? 'cur' : ''} ${r.locked ? 'locked' : ''}`}
                            onClick={() => {
                                if (r.locked) return;
                                onRoom(r.id);
                                setPop(null);
                            }}
                        >
                            <img src={r.thumb} alt={r.name} draggable={false} />
                            {r.locked && (
                                <span className="room-lock">
                                    <ILock size={14} />
                                </span>
                            )}
                            {activeRoom === r.id && <span className="room-cur-dot" />}
                            <span className="room-name">{r.name}</span>
                        </button>
                    ))}
                    <button className="rooms-lobby" onClick={onLeaveWorld}>
                        <ILogout size={13} /> 回大厅
                    </button>
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
                </div>
            )}

            {pop && <div className="rail-scrim" onClick={() => setPop(null)} />}
            <span className="rail-handle">
                <IChevron size={12} />
            </span>
        </div>
    );
}

const RailStyles = () => (
    <style>{`
    .rail-wrap{position:absolute;left:12px;top:50%;transform:translateY(-50%);z-index:40;}
    .rail{
        display:flex;flex-direction:column;align-items:center;gap:6px;
        width:58px;padding:11px 0;border-radius:29px;
        background:linear-gradient(160deg,rgba(64,72,110,0.52),rgba(38,44,74,0.5));
        border:1px solid rgba(255,255,255,0.22);
        backdrop-filter:blur(20px) saturate(1.2);
        box-shadow:0 12px 36px rgba(8,12,30,0.35),
                   inset 0 1px 0 rgba(255,255,255,0.18);
    }
    .rail-btn{
        position:relative;appearance:none;border:0;cursor:pointer;
        width:44px;height:44px;border-radius:15px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,0.07);color:rgba(242,246,255,0.92);
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);
        transition:background 160ms ease,transform 120ms ease,color 160ms ease;
    }
    .rail-btn:hover{background:rgba(255,255,255,0.16);transform:translateY(-1px);}
    .rail-btn:active{transform:scale(0.94);}
    .rail-btn.on{background:rgba(255,255,255,0.18);color:#fff;}
    .rail-btn:disabled{opacity:0.35;cursor:default;transform:none;}
    .rail-btn:disabled:hover{background:transparent;}
    .rail-dot{
        position:absolute;top:7px;right:7px;width:8px;height:8px;border-radius:50%;
        background:#F17E9A;border:2px solid rgba(22,26,46,0.9);
    }
    .rail-sep{width:22px;height:1px;margin:4px 0;background:rgba(255,255,255,0.18);}
    .rail-handle{
        position:absolute;left:100%;top:50%;transform:translateY(-50%);
        margin-left:2px;color:rgba(255,255,255,0.35);pointer-events:none;
    }
    .rail-scrim{position:fixed;inset:0;z-index:-1;}
    .rail-pop{
        position:absolute;left:64px;top:0;
        border-radius:18px;padding:10px;
        background:rgba(26,30,52,0.72);
        border:1px solid rgba(255,255,255,0.16);
        backdrop-filter:blur(20px) saturate(1.15);
        box-shadow:0 16px 44px rgba(8,12,30,0.45);
        animation:railpop 220ms cubic-bezier(0.34,1.3,0.5,1);
        transform-origin:left top;
    }
    @keyframes railpop{0%{opacity:0;transform:scale(0.92) translateX(-4px);}100%{opacity:1;transform:scale(1) translateX(0);}}
    .rooms-pop{display:flex;gap:10px;align-items:stretch;}
    .room-card{
        position:relative;appearance:none;border:0;cursor:pointer;padding:0;
        width:118px;border-radius:14px;overflow:hidden;background:transparent;
        border:2px solid transparent;transition:transform 140ms ease,border-color 160ms ease;
    }
    .room-card:hover{transform:translateY(-2px);}
    .room-card.cur{border-color:#8FC4EE;}
    .room-card img{display:block;width:100%;height:76px;object-fit:cover;}
    .room-card.locked img{filter:grayscale(0.5) brightness(0.62);}
    .room-lock{position:absolute;top:6px;right:6px;color:rgba(255,255,255,0.85);}
    .room-cur-dot{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);
        width:7px;height:7px;border-radius:50%;background:#8FC4EE;box-shadow:0 0 8px #8FC4EE;}
    .room-name{
        display:block;padding:4px 0 5px;font-size:12px;color:rgba(240,244,252,0.9);
        background:rgba(255,255,255,0.06);
    }
    .rooms-lobby{
        appearance:none;border:0;cursor:pointer;align-self:center;
        display:flex;align-items:center;gap:5px;margin-left:2px;padding:8px 10px;
        border-radius:12px;background:transparent;color:rgba(238,242,252,0.6);
        font-size:12px;white-space:nowrap;transition:background 160ms ease,color 160ms ease;
    }
    .rooms-lobby:hover{background:rgba(255,255,255,0.1);color:rgba(238,242,252,0.95);}
    .modules-pop{display:flex;flex-direction:column;gap:2px;min-width:190px;}
    .module-row{
        display:flex;align-items:center;justify-content:space-between;gap:18px;
        padding:8px 10px;border-radius:10px;font-size:13px;color:rgba(240,244,252,0.9);
    }
    .module-row:hover{background:rgba(255,255,255,0.07);}
    `}</style>
);
