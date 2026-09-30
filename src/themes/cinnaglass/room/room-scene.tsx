// room-scene.tsx — React shell for the world scene, the across-the-table study
// (ai/features/study-room/study-room.md). Mounts one Pixi Application per
// component life, feeds mood / weather / partner changes to the scene handle
// and anchors the speech bubble and name tag beside the partner's head. In dev
// a panel stands in for real presence until it is wired.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import type { HotspotOpenEvent, PartnerState, RoomMood, RoomWeather } from '@/themes/cinnaglass/room/room-types';
import type { WeatherKind } from '@/themes/cinnaglass/model';
import { buildTableScene, type TableCast, type TableSceneHandle } from '@/themes/cinnaglass/room/table-scene';
import type { HeadAnchors } from '@/themes/cinnaglass/room/partner-layer';
import { PARTNER_RIGS, STUDY_TABLE } from '@/themes/cinnaglass/room/study-table';
import { PARTNER, VIEWER } from '@/themes/cinnaglass/cast';
import { Logman } from '@/lib/logman';
import '@/themes/cinnaglass/room/room-overlays.css';

const TAG = '[room][web][room-scene]';

// The partner panel: always in development, and on any build with ?debug in the address
// (a query like the app's other switches, ?enter and ?surface).
const DEBUG_PANEL = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');

// Who sits where comes from cast.ts (her view by default, 阿屿 across; `?as=` switches).
const CAST: TableCast = { viewer: VIEWER, partner: PARTNER, rig: PARTNER_RIGS[PARTNER] };

const PARTNER_STATES: { id: PartnerState; label: string }[] = [
    { id: 'reading', label: '在线·看书' },
    { id: 'writing', label: '正在输入' },
    { id: 'away', label: '暂时离开' },
    { id: 'offline', label: '离线' },
    { id: 'asleep', label: '睡着了' }
];

type RoomSceneProps = {
    mood: RoomMood;
    weatherKind: WeatherKind;
    onHotspot?: (event: HotspotOpenEvent) => void;
    /** Overhead tag for the partner; only the name is known until presence is wired. */
    presence?: Record<string, { name: string; status: string; online?: boolean }>;
    /** Transient overhead speech bubble (new incoming message preview). */
    bubble?: { seatId: string; text: string; key: number } | null;
    /** false freezes the ticker while a full-screen surface covers the room. */
    active?: boolean;
    /** entry loader: share of the room loaded (0–1), then ready, or failed */
    onProgress?: (fraction: number) => void;
    onReady?: () => void;
    onFailed?: () => void;
};

const toRoomWeather = (kind: WeatherKind): RoomWeather => (kind === 'rain' ? 'rain' : 'sun');

// Draw at the screen's own pixel density (a phone is 3x) so the browser never
// stretches the canvas a second time, within a pixel budget that keeps big
// high-density desktop screens cheap.
const MAX_CANVAS_PX = 8_000_000;
const sceneResolution = () => {
    const dpr = window.devicePixelRatio || 1;
    const budget = Math.sqrt(MAX_CANVAS_PX / Math.max(1, window.innerWidth * window.innerHeight));
    return Math.max(1, Math.min(dpr, 3, budget));
};

// CSS px: the room a side needs to hold speech clear of the hair, the margin
// kept to the screen edge, and the least width a phone's bubble shrinks to.
const SIDE_ROOM = 150;
const EDGE = 12;
const EDGE_MIN = 96;

// `x` is where the bubble starts (right), ends (left), or the right margin it keeps (edge).
type Placement = { side: 'left' | 'right' | 'edge'; x: number; y: number; room: number };

/**
 * Speech sits beside the head on whichever side has room, so it never covers
 * the face. A phone has room on neither side (the head fills the width and
 * the top bar sits right above it), so the bubble hugs the right screen edge
 * at eye level and wraps inside the space right of the face, over the hair
 * at most (对坐 concept A3).
 */
function placeBeside(anchors: HeadAnchors, width: number): Placement {
    const right = width - anchors.right.x - EDGE;
    if (right >= SIDE_ROOM) return { side: 'right', ...anchors.right, room: right };
    const left = anchors.left.x - EDGE;
    if (left >= SIDE_ROOM) return { side: 'left', ...anchors.left, room: left };
    return {
        side: 'edge',
        x: EDGE,
        y: anchors.right.y,
        room: Math.max(EDGE_MIN, width - anchors.faceRight - 2 * EDGE)
    };
}

/** The across-the-table room: the scene, the overhead bubble on the partner, and the dev presence panel. */
export function RoomScene({
    mood,
    weatherKind,
    onHotspot,
    presence,
    bubble,
    active = true,
    onProgress,
    onReady,
    onFailed
}: RoomSceneProps) {
    const holderRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<TableSceneHandle | null>(null);
    const appRef = useRef<Application | null>(null);
    const [head, setHead] = useState<{ anchors: HeadAnchors | null; width: number }>({ anchors: null, width: 0 });
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);
    const [partnerState, setPartnerState] = useState<PartnerState>('reading');
    const [lampOn, setLampOn] = useState(true);
    const onHotspotRef = useRef(onHotspot);
    const loadRef = useRef({ onProgress, onReady, onFailed });
    const moodRef = useRef(mood);
    const weatherRef = useRef(weatherKind);
    const partnerRef = useRef(partnerState);
    // the async mount reads the latest props through these; layout effects land before it starts
    useLayoutEffect(() => {
        onHotspotRef.current = onHotspot;
        loadRef.current = { onProgress, onReady, onFailed };
        moodRef.current = mood;
        weatherRef.current = weatherKind;
        partnerRef.current = partnerState;
    });

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder) return;
        let disposed = false;
        let built = false;
        let ro: ResizeObserver | null = null;
        let headTimer = 0;
        let app: Application | null = null;
        const teardown = (a: Application) => {
            a.destroy(true, { children: true, texture: false });
            if (appRef.current === a) appRef.current = null;
            app = null;
        };

        (async () => {
            let a: Application | null = null;
            let inited = false;
            try {
                a = new Application();
                // the chunk is in and the renderer is next: the first sliver of the loader
                loadRef.current.onProgress?.(0.08);
                await a.init({
                    resizeTo: holder,
                    backgroundAlpha: 0,
                    antialias: true,
                    resolution: sceneResolution(),
                    autoDensity: true
                });
                inited = true;
                loadRef.current.onProgress?.(0.14);
                if (disposed) {
                    a.destroy(true);
                    return;
                }
                app = a;
                appRef.current = a;
                if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__owApp = a;
                holder.appendChild(a.canvas);
                const scene = await buildTableScene(
                    a,
                    STUDY_TABLE,
                    CAST,
                    {
                        mood: moodRef.current,
                        weather: toRoomWeather(weatherRef.current),
                        lampOn: true,
                        partner: partnerRef.current
                    },
                    {
                        // a room torn down mid-load must not feed the next entry's loader
                        onProgress: (fraction) => {
                            if (!disposed) loadRef.current.onProgress?.(0.14 + fraction * 0.84);
                        },
                        onHotspot: (event) => onHotspotRef.current?.(event),
                        onLamp: setLampOn
                    }
                );
                if (disposed) {
                    scene.destroy();
                    teardown(a);
                    return;
                }
                built = true;
                scene.setMood(moodRef.current, false);
                scene.setWeather(toRoomWeather(weatherRef.current), false);
                scene.setPartnerState(partnerRef.current);
                sceneRef.current = scene;
                const live = a;
                ro = new ResizeObserver(() => {
                    live.resize();
                    scene.resize();
                });
                ro.observe(holder);
                // the head sways only a few px, so a slow poll is calmer than per-frame tracking
                const syncHead = () => setHead({ anchors: scene.headAnchors(), width: holder.clientWidth });
                syncHead();
                headTimer = window.setInterval(syncHead, 600);
                loadRef.current.onProgress?.(1);
                setReady(true);
                loadRef.current.onReady?.();
            } catch (e) {
                Logman.error(TAG, `书房没能加载：${e instanceof Error ? e.message : String(e)}`);
                if (a && inited) teardown(a);
                if (!disposed) {
                    setFailed(true);
                    loadRef.current.onFailed?.();
                }
            }
        })();

        return () => {
            disposed = true;
            clearInterval(headTimer);
            ro?.disconnect();
            sceneRef.current?.destroy();
            sceneRef.current = null;
            if (app && built) teardown(app);
        };
        // mount once — prop changes go through the handle below
    }, []);

    useEffect(() => {
        sceneRef.current?.setMood(mood, true);
    }, [mood]);

    useEffect(() => {
        sceneRef.current?.setWeather(toRoomWeather(weatherKind), true);
    }, [weatherKind]);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        scene.setPartnerState(partnerState);
        setHead({ anchors: scene.headAnchors(), width: holderRef.current?.clientWidth ?? 0 });
    }, [partnerState]);

    useEffect(() => {
        const a = appRef.current;
        if (!a || !sceneRef.current) return;
        if (active) a.start();
        else a.stop();
    }, [active]);

    const partnerTag = Object.values(presence ?? {})[0];
    const place = head.anchors ? placeBeside(head.anchors, head.width) : null;
    // the name tag needs a free side, and a sleeper needs no label: the pose already says it
    const tagAt = place && place.side !== 'edge' && partnerState !== 'asleep' ? place : null;

    return (
        <div
            ref={holderRef}
            className="room-scene"
            data-ready={ready || undefined}
            style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
        >
            {failed && (
                <div className="room-scene-feedback" role="alert">
                    <div className="ui-surface">
                        <h2>书房暂时没能加载</h2>
                        <p>检查网络后刷新页面，已保存的内容仍会保留。</p>
                        <button className="ui-button" type="button" onClick={() => window.location.reload()}>
                            重新加载
                        </button>
                    </div>
                </div>
            )}
            {bubble && place && (
                <div
                    key={bubble.key}
                    className="room-bubble ui-surface"
                    data-side={place.side}
                    // anchored by its right side at the edge, so it can grow leftwards into the free space
                    style={{
                        ...(place.side === 'edge' ? { right: place.x } : { left: place.x }),
                        top: place.y,
                        maxWidth: Math.min(240, place.room)
                    }}
                >
                    {bubble.text}
                </div>
            )}
            {partnerTag?.name && tagAt && head.anchors && (
                <div
                    className="presence-tag ui-surface"
                    data-side={tagAt.side}
                    style={{ left: tagAt.x, top: head.anchors.shoulder }}
                >
                    <b>{partnerTag.name}</b>
                    {partnerTag.status && <span>{partnerTag.status}</span>}
                </div>
            )}
            {DEBUG_PANEL && (
                <div className="table-dev ui-surface" role="group" aria-label="对方状态模拟（开发用）">
                    <b>对方状态（开发模拟）</b>
                    <select
                        id="table-dev-state"
                        value={partnerState}
                        onChange={(e) => setPartnerState(e.target.value as PartnerState)}
                    >
                        {PARTNER_STATES.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            sceneRef.current?.setLamp(!lampOn, true);
                            setLampOn(!lampOn);
                        }}
                    >
                        {lampOn ? '关灯' : '开灯'}
                    </button>
                    <button type="button" onClick={() => sceneRef.current?.offerSip()}>
                        递一杯咖啡
                    </button>
                    <button type="button" onClick={() => sceneRef.current?.playReaction('glance')}>
                        抬眼
                    </button>
                    <button type="button" onClick={() => sceneRef.current?.playReaction('poked')}>
                        戳一下
                    </button>
                    <button type="button" onClick={() => sceneRef.current?.playReaction('patted')}>
                        摸头
                    </button>
                </div>
            )}
        </div>
    );
}
