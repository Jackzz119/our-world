// Navigation approved 2026-09-07: textured, mood-reflecting glass and warm
// hover/press light. Material stays scoped here until other surfaces migrate.
// 2026-10-01: the tools wrench became 回忆 — the door to the journal, the photo
// wall and the anniversaries (the product's other half, next to the room); what
// the tools menu also held about the room itself moved into 房间.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { IcoProps } from '@/themes/cinnaglass/icons';
import { IBag, IBook, ICalendar, ILock, ILogout, IPhoto } from '@/themes/cinnaglass/icons';
import { RailHome, RailChat, RailMusic, RailMemories, RailSettings } from '@/themes/cinnaglass/shell/rail-icons';
import { Sheet, SheetHead } from '@/themes/cinnaglass/ui/sheet';
import { usePresence } from '@/themes/cinnaglass/ui/use-presence';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/shell/navigation-glass.css';
import type { Widgets } from '@/themes/cinnaglass/model';

// Rail actions. 'rooms' and 'memories' toggle a popover in place; every other
// key is forwarded to onAction.
export type RailKey = 'rooms' | 'chat' | 'journal' | 'photos' | 'calendar' | 'music' | 'memories' | 'shop' | 'settings';
type Pop = 'rooms' | 'memories';

type RoomDef = {
    id: string;
    name: string;
    thumb: string;
    locked?: boolean;
};

// Rooms with a scene. The across-the-table concept plans ten (ai/design_system/scene.md); a
// room is listed here once its art ships, `locked` shows one that is announced but not open.
const ROOM_DEFS: RoomDef[] = [{ id: 'study', name: '书房', thumb: '/rooms/study/thumb.webp' }];

// Fixed companion widgets in the room; only switches with active consumers are shown.
const MODULE_DEFS: { key: string; label: string }[] = [
    { key: 'anniv', label: '纪念日卡' },
    { key: 'music', label: '音乐迷你条' }
];

// What lives behind 回忆.
const MEMORY_LINKS: { key: RailKey; Icon: (p: IcoProps) => ReactNode; label: string; hint: string }[] = [
    { key: 'journal', Icon: IBook, label: '日记', hint: '一起写下的每一页' },
    { key: 'photos', Icon: IPhoto, label: '照片墙', hint: '日记里的每一张照片' },
    { key: 'calendar', Icon: ICalendar, label: '纪念日', hint: '日历与重要的日子' }
];

type RailProps = {
    chatOpen?: boolean;
    musicOpen?: boolean;
    /** sound is playing: the music button carries a small equaliser */
    musicPlaying?: boolean;
    unread: boolean;
    activeRoom: string;
    onRoom: (id: string) => void;
    onAction: (k: RailKey, origin: { x: number; y: number; source: 'rail' }) => void;
    widgets: Widgets;
    setWidget: (k: string, v: boolean) => void;
    onLeaveWorld: () => void;
    /** a popover (a sheet on a phone) opened: a phone shows one window at a time */
    onPopOpen?: () => void;
    /** a new value closes the open popover (another window opened) */
    dismissSignal?: number;
};

// How long a popover takes to leave.
const POP_EXIT_MS = 140;

// Left navigation rail. Owns one popover at a time (rooms or memories) and closes
// it on Escape or an outside pointer-down, both captured at window level so a
// popover inside a modal still wins. On the phone layout the two popovers are
// sheets rising behind the bar (ui/sheet.tsx), like every other companion panel there.
export function Rail({
    chatOpen = false,
    musicOpen = false,
    musicPlaying = false,
    unread,
    activeRoom,
    onRoom,
    onAction,
    widgets,
    setWidget,
    onLeaveWorld,
    onPopOpen,
    dismissSignal = 0
}: RailProps) {
    const [pop, setPop] = useState<Pop | null>(null);
    const [pressed, setPressed] = useState<RailKey | null>(null);
    const [dismissed, setDismissed] = useState(dismissSignal);
    if (dismissSignal !== dismissed) {
        setDismissed(dismissSignal);
        setPop(null);
    }
    const compact = useCompactUi();
    const roomsPop = usePresence(pop === 'rooms' && !compact, POP_EXIT_MS);
    const memoriesPop = usePresence(pop === 'memories' && !compact, POP_EXIT_MS);
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

    const toggle = (key: Pop) => {
        if (pop === key) setPop(null);
        else {
            setPop(key);
            onPopOpen?.();
        }
    };
    const act = (key: RailKey, target: HTMLElement) => {
        setPop(null);
        const box = target.getBoundingClientRect();
        onAction(key, { x: box.left + box.width / 2, y: box.top + box.height / 2, source: 'rail' });
    };

    // One rail button. Pointer down/up/cancel/leave/blur all clear the pressed
    // flag, because a pointer that leaves the button never fires pointerup on it.
    const btn = (
        key: RailKey,
        Icon: (p: IcoProps) => ReactNode,
        label: string,
        opts?: { dot?: boolean; disabled?: boolean; active?: boolean; playing?: boolean }
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
                key === 'rooms' || key === 'memories'
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
                if (key === 'rooms' || key === 'memories') toggle(key);
                else act(key, event.currentTarget);
            }}
        >
            <Icon size={32} sw={1.15} aria-hidden="true" />
            <span className="rail-label">{label}</span>
            {opts?.dot && <span className="rail-dot" />}
            {opts?.playing && (
                <span className="rail-eq" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </span>
            )}
        </button>
    );

    // Popover bodies, shared by the desktop popovers and the phone sheets.
    const roomsBody = (
        <>
            <div className="rail-rooms">
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
            <div className="rail-room-tools">
                {/* phones have no floating music bar to switch off: the sheet opens from the navigation */}
                {MODULE_DEFS.filter((m) => !(compact && m.key === 'music')).map((m) => (
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
                <div className="rail-room-actions">
                    <button type="button" className="modules-lobby" disabled title="装扮（敬请期待）">
                        <IBag size={13} /> 装扮（敬请期待）
                    </button>
                    <button type="button" className="modules-lobby" onClick={onLeaveWorld}>
                        <ILogout size={13} /> 回大厅
                    </button>
                </div>
            </div>
        </>
    );
    const memoriesBody = (
        <div className="rail-memory-links">
            {MEMORY_LINKS.map(({ key, Icon, label, hint }) => (
                <button
                    type="button"
                    key={key}
                    className="memory-link"
                    data-nav-key={key}
                    onClick={(event) => act(key, event.currentTarget)}
                >
                    <span className="memory-link-icon" aria-hidden="true">
                        <Icon size={22} />
                    </span>
                    <span className="memory-link-text">
                        <b>{label}</b>
                        <small>{hint}</small>
                    </span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="rail-wrap">
            <nav className="rail" aria-label="房间导航">
                {btn('rooms', RailHome, '房间', { active: pop === 'rooms' })}
                {btn('chat', RailChat, '聊天', { dot: unread, active: chatOpen })}
                {btn('music', RailMusic, '一起听', { active: musicOpen, playing: musicPlaying })}
                {btn('memories', RailMemories, '回忆', { active: pop === 'memories' })}
                {btn('settings', RailSettings, '设置')}
            </nav>

            {roomsPop.mounted && (
                <div className="rail-pop rooms-pop" data-state={roomsPop.closing ? 'closing' : 'open'}>
                    {roomsBody}
                </div>
            )}

            {memoriesPop.mounted && (
                <div className="rail-pop memories-pop" data-state={memoriesPop.closing ? 'closing' : 'open'}>
                    <b className="rail-pop-title">回忆</b>
                    {memoriesBody}
                </div>
            )}

            {compact && (
                <>
                    <Sheet open={pop === 'rooms'} onClose={() => setPop(null)} label="房间" className="rail-sheet">
                        <SheetHead title="房间" onClose={() => setPop(null)} />
                        <div className="rail-sheet-rooms">{roomsBody}</div>
                    </Sheet>
                    <Sheet open={pop === 'memories'} onClose={() => setPop(null)} label="回忆" className="rail-sheet">
                        <SheetHead title="回忆" onClose={() => setPop(null)} />
                        <div className="rail-sheet-memories">{memoriesBody}</div>
                    </Sheet>
                </>
            )}
        </div>
    );
}
