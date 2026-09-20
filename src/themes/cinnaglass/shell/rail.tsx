// Navigation approved 2026-09-07: textured, mood-reflecting glass and warm
// hover/press light. Material stays scoped here until other surfaces migrate.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { IcoProps } from '@/themes/cinnaglass/icons';
import { IBag, ICalendar, ILock, ILogout, IPhoto } from '@/themes/cinnaglass/icons';
import { RailHome, RailChat, RailMusic, RailTools, RailSettings } from '@/themes/cinnaglass/shell/rail-icons';
import '@/themes/cinnaglass/shell/navigation-glass.css';
import type { Widgets } from '@/themes/cinnaglass/model';

// Rail actions. 'rooms' and 'modules' toggle a popover in place; every other
// key is forwarded to onAction.
export type RailKey = 'rooms' | 'chat' | 'photos' | 'calendar' | 'music' | 'modules' | 'shop' | 'settings';

type RoomDef = {
    id: string;
    name: string;
    thumb: string;
    locked?: boolean;
};

// The three planned rooms. Only 'study' has a scene today; the others render locked.
const ROOM_DEFS: RoomDef[] = [
    { id: 'study', name: '书房', thumb: '/rooms/study/thumb.png' },
    { id: 'gameroom', name: '棋牌室', thumb: '/rooms/gameroom/thumb.png', locked: true },
    { id: 'garden', name: '植物园', thumb: '/rooms/garden/thumb.png', locked: true }
];

// Fixed companion widgets; only switches with active consumers are shown.
const MODULE_DEFS: { key: string; label: string }[] = [
    { key: 'anniv', label: '纪念日卡' },
    { key: 'music', label: '音乐迷你条' }
];

type RailProps = {
    chatOpen?: boolean;
    musicOpen?: boolean;
    unread: boolean;
    activeRoom: string;
    onRoom: (id: string) => void;
    onAction: (k: RailKey, origin: { x: number; y: number; source: 'rail' }) => void;
    widgets: Widgets;
    setWidget: (k: string, v: boolean) => void;
    onLeaveWorld: () => void;
};

// Left navigation rail. Owns one popover at a time (rooms or modules) and closes
// it on Escape or an outside pointer-down, both captured at window level so a
// popover inside a modal still wins.
export function Rail({
    chatOpen = false,
    musicOpen = false,
    unread,
    activeRoom,
    onRoom,
    onAction,
    widgets,
    setWidget,
    onLeaveWorld
}: RailProps) {
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

    // One rail button. Pointer down/up/cancel/leave/blur all clear the pressed
    // flag, because a pointer that leaves the button never fires pointerup on it.
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
            aria-expanded={
                key === 'rooms' || key === 'modules'
                    ? pop === key
                    : key === 'chat'
                      ? chatOpen
                      : key === 'music'
                        ? musicOpen
                        : undefined
            }
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
                {btn('chat', RailChat, '聊天', { dot: unread, active: chatOpen })}
                {btn('music', RailMusic, '一起听', { active: musicOpen })}
                {btn('modules', RailTools, '工具', { active: pop === 'modules' })}
                {btn('settings', RailSettings, '设置')}
            </nav>

            {pop === 'rooms' && (
                <div className="rail-pop rooms-pop">
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
