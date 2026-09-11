// Navigation approved 2026-09-07: textured, mood-reflecting glass and warm
// hover/press light. Material stays scoped here until other surfaces migrate.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { IcoProps } from '../icons';
import { IBag, ICalendar, IChevron, ILock, ILogout, IPhoto } from '../icons';
import { RailHome, RailChat, RailMusic, RailTools, RailSettings } from './rail-icons';
import './navigation-glass.css';
import type { Widgets } from '../model';

export type RailKey = 'rooms' | 'chat' | 'photos' | 'calendar' | 'music' | 'modules' | 'shop' | 'settings';

type RoomDef = {
    id: string;
    name: string;
    thumb: string;
    locked?: boolean;
};

const ROOM_DEFS: RoomDef[] = [
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
    onAction: (k: RailKey, origin: { x: number; y: number; source: 'rail' }) => void;
    widgets: Widgets;
    setWidget: (k: string, v: boolean) => void;
    onLeaveWorld: () => void;
};

export function Rail({ unread, activeRoom, onRoom, onAction, widgets, setWidget, onLeaveWorld }: RailProps) {
    const [pop, setPop] = useState<'rooms' | 'modules' | null>(null);
    const [pressed, setPressed] = useState<RailKey | null>(null);
    useEffect(() => {
        if (!pop) return;
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopImmediatePropagation();
                setPop(null);
            }
        };
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Element && !event.target.closest('.rail-wrap')) setPop(null);
        };
        window.addEventListener('keydown', escape, true);
        window.addEventListener('pointerdown', outside, true);
        return () => {
            window.removeEventListener('keydown', escape, true);
            window.removeEventListener('pointerdown', outside, true);
        };
    }, [pop]);

    const btn = (
        key: RailKey,
        Icon: (p: IcoProps) => ReactNode,
        label: string,
        opts?: { dot?: boolean; disabled?: boolean; active?: boolean }
    ) => (
        <button
            type="button"
            key={key}
            className={`rail-btn ${opts?.active ? 'on' : ''}`}
            title={label}
            aria-label={label}
            data-nav-key={key}
            data-pressed={pressed === key || undefined}
            aria-expanded={key === 'rooms' || key === 'modules' ? pop === key : undefined}
            disabled={opts?.disabled}
            onPointerDown={(event) => {
                if (event.isPrimary && event.button === 0) setPressed(key);
            }}
            onPointerUp={() => setPressed(null)}
            onPointerCancel={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            onLostPointerCapture={() => setPressed(null)}
            onBlur={() => setPressed(null)}
            onClick={(event) => {
                if (key === 'rooms') setPop(pop === 'rooms' ? null : 'rooms');
                else if (key === 'modules') setPop(pop === 'modules' ? null : 'modules');
                else {
                    setPop(null);
                    const box = event.currentTarget.getBoundingClientRect();
                    onAction(key, { x: box.left + box.width / 2, y: box.top + box.height / 2, source: 'rail' });
                }
            }}
        >
            <Icon size={32} sw={1.15} aria-hidden="true" />
            <span className="rail-label">{label}</span>
            {opts?.dot && <span className="rail-dot" />}
        </button>
    );

    return (
        <div className="rail-wrap">
            <nav className="rail" aria-label="房间导航">
                {btn('rooms', RailHome, '房间', { active: pop === 'rooms' })}
                {btn('chat', RailChat, '聊天', { dot: unread })}
                {btn('music', RailMusic, '一起听')}
                {btn('modules', RailTools, '工具', { active: pop === 'modules' })}
                {btn('settings', RailSettings, '设置')}
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
                    <div className="rail-tool-links">
                        {btn('photos', IPhoto, '照片墙')}
                        {btn('calendar', ICalendar, '日历·纪念日')}
                        {btn('shop', IBag, '装扮（敬请期待）', { disabled: true })}
                    </div>
                    {MODULE_DEFS.map((m) => (
                        <label key={m.key} className="module-row">
                            <span>{m.label}</span>
                            <button
                                type="button"
                                role="switch"
                                aria-label={m.label}
                                aria-checked={widgets[m.key] !== false}
                                className={`sw ${widgets[m.key] !== false ? 'on' : ''}`}
                                onClick={() => setWidget(m.key, widgets[m.key] === false)}
                            >
                                <i aria-hidden="true" />
                            </button>
                        </label>
                    ))}
                    <button className="modules-lobby" onClick={onLeaveWorld}>
                        <ILogout size={13} /> 回大厅
                    </button>
                </div>
            )}
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
