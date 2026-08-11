// room-scene.tsx — React shell for the PixiJS room compositor. Mounts one
// Application per component life, feeds mood/weather prop changes to the
// scene handle, and resizes with its host. This is the world scene of the
// product (replaces the retired 3D metaspace).

import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import type { RoomMood, RoomWeather } from './room-types';
import { buildScene, type CharacterAssets, type SceneHandle } from './pixi-scene';
import { STUDY_ROOM } from './study-room';

const CHARACTERS: CharacterAssets = {
    blue: {
        open: '/characters/blue-reading-open.png',
        closed: '/characters/blue-reading-closed.png'
    },
    pink: {
        open: '/characters/pink-writing-open.png',
        closed: '/characters/pink-writing-closed.png'
    }
};

export type SeatPresence = {
    name: string;
    status: string;
    online: boolean;
};

type RoomSceneProps = {
    mood: RoomMood;
    /** WorldPage weather kind (sun/cloud/rain/snow) — collapsed to the scene's sun/rain. */
    weatherKind: string;
    /** furniture hotspot taps (feature keys from the room template) */
    onHotspot?: (id: string) => void;
    /** overhead presence tags keyed by seat id (the partner's, usually) */
    presence?: Record<string, SeatPresence>;
    /** transient overhead speech bubble (new incoming message preview) */
    bubble?: { seatId: string; text: string; key: number } | null;
};

const toRoomWeather = (kind: string): RoomWeather => (kind === 'rain' ? 'rain' : 'sun');

export function RoomScene({ mood, weatherKind, onHotspot, presence, bubble, active = true }: RoomSceneProps & { active?: boolean }) {
    const holderRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<SceneHandle | null>(null);
    const appRef = useRef<Application | null>(null);
    const [tagPos, setTagPos] = useState<Record<string, { x: number; y: number }>>({});
    const onHotspotRef = useRef(onHotspot);
    onHotspotRef.current = onHotspot;

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder) return;
        let disposed = false;
        // v8: Application.start/stop/destroy only exist after init() resolves,
        // so the instance is published to appRef strictly post-init
        let app: Application | null = null;
        let ro: ResizeObserver | null = null;
        let tagTimer = 0;

        (async () => {
            const a = new Application();
            await a.init({
                resizeTo: holder,
                backgroundAlpha: 0,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true
            });
            if (disposed) {
                a.destroy(true);
                return;
            }
            app = a;
            appRef.current = a;
            // dev-only handle for headless visual checks (pixi extract)
            if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__owApp = a;
            holder.appendChild(a.canvas);
            const scene = await buildScene(
                a,
                STUDY_ROOM,
                CHARACTERS,
                moodRef.current,
                toRoomWeather(weatherRef.current),
                (id) => onHotspotRef.current?.(id)
            );
            if (disposed) return; // unmount cleanup below owns app teardown
            sceneRef.current = scene;
            // pixi's resizeTo only reacts to window resizes; layout-driven
            // size changes (sidebar collapse squeezing the stage) must be
            // pushed through manually: renderer first, then cover-fit.
            ro = new ResizeObserver(() => {
                a.resize();
                scene.resize();
            });
            ro.observe(holder);
            // overhead tags track seat anchors (sway amplitude is tiny, a
            // slow poll is cheaper and calmer than per-frame tracking)
            const syncTags = () => {
                const next: Record<string, { x: number; y: number }> = {};
                for (const seat of STUDY_ROOM.seats) {
                    const p = scene.getSeatScreenPos(seat.id);
                    if (p) next[seat.id] = p;
                }
                setTagPos(next);
            };
            syncTags();
            tagTimer = window.setInterval(syncTags, 600);
        })();

        return () => {
            disposed = true;
            clearInterval(tagTimer);
            ro?.disconnect();
            sceneRef.current?.destroy();
            sceneRef.current = null;
            if (app) app.destroy(true, { children: true, texture: false });
            appRef.current = null;
        };
        // mount once — prop changes go through the handle below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // latest props are readable inside the async mount above
    const moodRef = useRef(mood);
    moodRef.current = mood;
    const weatherRef = useRef(weatherKind);
    weatherRef.current = weatherKind;

    useEffect(() => {
        sceneRef.current?.setMood(mood, true);
    }, [mood]);

    useEffect(() => {
        sceneRef.current?.setWeather(toRoomWeather(weatherKind), true);
    }, [weatherKind]);

    // pause rendering while a fullscreen overlay covers the stage
    // (appRef is only set post-init, so start/stop are safe; a not-yet-ready
    // scene simply skips — init leaves the ticker running by default)
    useEffect(() => {
        const app = appRef.current;
        if (!app || !sceneRef.current) return;
        if (active) app.start();
        else app.stop();
    }, [active]);

    return (
        <div
            ref={holderRef}
            className="room-scene"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
        >
            {bubble && tagPos[bubble.seatId] && (
                <div
                    key={bubble.key}
                    className="room-bubble"
                    style={{
                        // codex spec §5.9: in-scene bubbles are dark glass with a
                        // warm-white keyline, not white paper
                        position: 'absolute',
                        left: tagPos[bubble.seatId].x,
                        top: tagPos[bubble.seatId].y - 52,
                        transform: 'translate(-50%, -100%)',
                        maxWidth: 240,
                        padding: '10px 14px',
                        borderRadius: 18,
                        fontSize: 13,
                        lineHeight: 1.4,
                        color: '#EEEAF0',
                        background: 'rgba(82,76,91,0.83)',
                        border: '1px solid rgba(242,220,224,0.66)',
                        boxShadow: '0 6px 12px rgba(15,8,15,0.28)',
                        backdropFilter: 'blur(10px)',
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        animation: 'bubble-in 320ms cubic-bezier(0.34,1.4,0.5,1)'
                    }}
                >
                    <style>{`
                    @keyframes bubble-in {
                        0%{opacity:0;transform:translate(-50%,-92%) scale(0.85);}
                        60%{transform:translate(-50%,-102%) scale(1.03) rotate(1deg);}
                        100%{opacity:1;transform:translate(-50%,-100%) scale(1);}
                    }`}</style>
                    {bubble.text}
                </div>
            )}
            {presence &&
                Object.entries(presence).map(([seatId, p]) => {
                    const pos = tagPos[seatId];
                    if (!pos) return null;
                    return (
                        <div
                            key={seatId}
                            className="presence-tag"
                            style={{
                                // codex spec §5.5: 50px pill r25, 17px green dot,
                                // pink heart at the right end
                                position: 'absolute',
                                left: pos.x,
                                top: pos.y,
                                transform: 'translate(-50%, -100%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                height: 50,
                                padding: '0 16px',
                                borderRadius: 25,
                                fontSize: 14,
                                color: 'var(--cg-icon, #F8F8F9)',
                                background: 'rgba(55,56,84,0.8)',
                                border: '1px solid var(--cg-stroke, rgba(233,231,242,0.54))',
                                backdropFilter: 'blur(12px) saturate(112%)',
                                boxShadow:
                                    '0 10px 24px rgba(3,3,12,0.32), inset 0 1px 0 rgba(255,255,255,0.23)',
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                transition: 'left 600ms linear, top 600ms linear, opacity 300ms ease'
                            }}
                        >
                            <span
                                style={{
                                    width: 17,
                                    height: 17,
                                    borderRadius: '50%',
                                    background: p.online ? '#73EF82' : 'rgba(200,205,220,0.4)',
                                    border: p.online ? '2px solid #A6E7B5' : '2px solid transparent',
                                    boxShadow: p.online ? '0 0 6px rgba(115,239,130,0.8)' : 'none'
                                }}
                            />
                            {p.name && <b style={{ fontWeight: 600 }}>{p.name}</b>}
                            <span style={{ opacity: 0.78 }}>{p.status}</span>
                            <span style={{ color: '#F9ABBD', filter: 'drop-shadow(0 0 5px rgba(249,171,189,0.7))', display: 'flex' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#F9ABBD">
                                    <path d="M12 20s-7-4.5-9.3-9C1.2 8 2.6 4.7 5.8 4.5 8 4.4 9.3 5.6 12 8c2.7-2.4 4-3.6 6.2-3.5 3.2.2 4.6 3.5 3.1 6.5C19 15.5 12 20 12 20z" />
                                </svg>
                            </span>
                        </div>
                    );
                })}
        </div>
    );
}
