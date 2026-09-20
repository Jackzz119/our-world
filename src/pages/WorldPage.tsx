// WorldPage.tsx — root orchestration for the cinnaglass shell. Each domain
// lives in its own hook (world session, surface router, weather, clock,
// persisted slices, chat bubble); this file reads them, composes the few
// cross-domain actions they must not do for each other (leaving the world
// closes surfaces and the chat card; saving world settings also syncs the
// local profile buffer), and renders the two subtrees — in-world and lobby.
// See ai/project-audit/runs/2026-09-19-01/evidence/shell-refactor-log.md.
import { lazy, Suspense, useEffect, useState } from 'react';

// the pixi room compositor loads its own chunk on demand (pixi.js is chunky)
const RoomScene = lazy(() => import('@/themes/cinnaglass/room/room-scene').then((m) => ({ default: m.RoomScene })));
import { LobbyScene } from '@/themes/cinnaglass/lobby';
import { PROFILE_DEFAULT, gload } from '@/themes/cinnaglass/profile';
import { updateMyDisplayName } from '@/lib/profiles';
import { Rail, RoomHandle } from '@/themes/cinnaglass/shell/rail';
import { Ambience } from '@/themes/cinnaglass/shell/ambience';
import { MomentCard, MusicMini } from '@/themes/cinnaglass/shell/floaters';
import { ChatCard } from '@/themes/cinnaglass/shell/chat-card';
import { WorldSurfaces } from '@/themes/cinnaglass/shell/world-surfaces';
import { useWorldChatBubble } from '@/themes/cinnaglass/shell/use-world-chat-bubble';
import { ChannelScreen } from '@/themes/cinnaglass/chat/chat-hub';
import { useChatThreads, convsFor } from '@/themes/cinnaglass/chat/chat-data';
import { loadJson as owLoad } from '@/lib/local-store';
import { useTweaks } from '@/themes/cinnaglass/tweaks';
import type { Alarm, CalEvent, Profile, Widgets } from '@/themes/cinnaglass/model';
import type { World } from '@/types/feed';
import { getEnvFlag } from '@/utils';
import { useLiveClock } from '@/pages/world/useLiveClock';
import { useWeather } from '@/pages/world/useWeather';
import { usePersistedState } from '@/pages/world/usePersistedState';
import { useSurfaceRouter } from '@/pages/world/useSurfaceRouter';
import { useWorldSession } from '@/pages/world/useWorldSession';

// Entry switch (see .env.example). AUTO_ENTER skips the lobby on mount when
// a world already exists (dev convenience — players always land in the lobby
// and enter through the portal). Defaults to false when unset.
// VITE_DEV (dev auto-login with a real session) lives in ProtectedRoute —
// by the time this page renders, a session always exists.
const AUTO_ENTER =
    getEnvFlag('VITE_AUTO_ENTER') ||
    // ?enter=1 — headless screenshot convenience, skips the lobby without
    // touching .env (dev verification only)
    new URLSearchParams(window.location.search).has('enter');

// Widget registry. REQUIRED entries can never be switched off, ADDON entries
// can. NOTE: only 'anniv' and 'music' are read by the render today — see
// MODULE_DEFS in shell/rail.tsx.
const REQUIRED = ['days', 'minimap'];
const ADDON = ['memory', 'anniv', 'ambient', 'music', 'lighting'];
// Merge the persisted widget map over the all-on defaults, so a key added in a
// later version defaults to on instead of undefined.
const loadWidgets = (): Widgets => {
    const base: Widgets = {};
    REQUIRED.forEach((k) => (base[k] = true));
    ADDON.forEach((k) => (base[k] = true));
    try {
        return { ...base, ...JSON.parse(localStorage.getItem('ow-widgets-v1') || '{}') };
    } catch {
        return base;
    }
};

// yyyy-mm-dd N days from today, for the seeded demo events.
const futureDate = (addDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// First-run demo content; replaced as soon as the user edits and localStorage
// takes over.
const SEED_EVENTS: CalEvent[] = [
    { id: 'ev-seed1', date: futureDate(3), title: '看那部期待很久的电影 🎬' },
    { id: 'ev-seed2', date: futureDate(9), title: '去新开的那家面包店 🥐' }
];
const SEED_ALARMS: Alarm[] = [
    { id: 'al1', time: '07:30', label: '早安，一起醒来', on: true },
    { id: 'al2', time: '22:30', label: '晚安，说句悄悄话', on: true }
];

// ?surface=<tab> opens one SubScreen tab straight from the URL (dev/headless
// screenshots only — gated on import.meta.env.DEV).
const DEV_SURFACE = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('surface') : null;

const WorldPage = () => {
    const [t, setTweak] = useTweaks();
    // v2 shell (concept-c): narrow rail + floating widgets. The chat card is
    // the stage-side chat surface; the covering hub stays one expand away.
    const [chatOpen, setChatOpen] = useState(false);
    const [musicOpen, setMusicOpen] = useState(false);
    const [convOpen, setConvOpen] = useState<string | null>(null);
    // which surface is open, and the rail / hotspot routes that open one
    const {
        screen,
        tab,
        surfaceOrigin,
        close: closeSurface,
        onRail,
        onHotspot
    } = useSurfaceRouter({
        initialScreen: DEV_SURFACE,
        onOpenChat: () => setChatOpen(true),
        onOpenMusic: () => setMusicOpen(true)
    });
    // Four localStorage-backed slices; usePersistedState mirrors each one back
    // on every change (the read strategy stays per-slice — see the hook).
    const [profile, setProfile] = usePersistedState('ow-profile-v1', () => gload('ow-profile-v1', PROFILE_DEFAULT));
    const [widgets, setWidgets] = usePersistedState<Widgets>('ow-widgets-v1', loadWidgets);
    const [events, setEvents] = usePersistedState('ow-dates-v1', () => owLoad('ow-dates-v1', SEED_EVENTS));
    const [alarms, setAlarms] = usePersistedState('ow-alarms-v1', () => owLoad('ow-alarms-v1', SEED_ALARMS));
    const nowTs = useLiveClock();
    const weather = useWeather(t.weather);

    // The shared world row plus the lobby flow around it.
    const {
        world,
        uid,
        profiles,
        memberNames,
        worldIconUrl,
        lobbyStatus,
        lobbyError,
        lobbyBusy,
        entered,
        enterWorld,
        createAndEnter,
        leaveWorld,
        applySavedWorld,
        applyMyName
    } = useWorldSession(AUTO_ENTER);

    // chat (see ai/features/chat.md): one thread store, two surfaces, two
    // owners — the covering conversation window holds channels + DMs; the chat
    // card is stage-owned (chat button / Enter only).
    // Channel messages are real (DB + world broadcast topic); DMs stay mock.
    const {
        channels,
        dmConvs,
        friends,
        requestsIn,
        requestsOut,
        threads,
        reads,
        emoteViews,
        send,
        sendStickerTo,
        retrySend,
        discardFailed,
        editMessage,
        deleteMsg,
        toggleReaction,
        markRead,
        writeError,
        loadOlder,
        reachedStart,
        addFriend,
        acceptRequest,
        removeFriend,
        searchWeb,
        importEmoteUrl,
        addEmoteFile,
        removeEmoteById
    } = useChatThreads(world?.id ?? null, uid, profiles);

    // Bare Enter (no input focused) opens the chat card. Layer gate: while
    // any UI-layer surface is open, scene shortcuts stay disabled.
    useEffect(() => {
        if (convOpen || screen) return; // UI layer open — scene shortcuts off
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
            setChatOpen(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [convOpen, screen]);

    // The world conversation's newest message drives both the rail's unread pip
    // and her in-world speech bubble.
    const worldConvId = convsFor(entered && world !== null, channels, dmConvs)[0]?.id ?? '';
    const lastMsg = (threads[worldConvId] || []).at(-1);
    const myReadAt = uid ? reads[worldConvId]?.[uid] : undefined;
    const { unread, bubble } = useWorldChatBubble(lastMsg, { chatOpen, convOpen, myReadAt });

    // Toggle an addon widget; the write-back rides on usePersistedState.
    // Required widgets are silently ignored.
    const setWidget = (k: string, v: boolean) => {
        if (REQUIRED.includes(k)) return; // required widgets can't be removed
        setWidgets((w) => ({ ...w, [k]: v }));
    };
    const inWorld = entered && world !== null;

    // What the chrome displays: DB world identity first, localStorage as
    // fallback. Settings still edits the raw local profile — the write-back to
    // worlds/profiles is still open (ai/features/supabase.md).
    const liveProfile: Profile = {
        ...profile,
        world: world?.name ?? profile.world,
        anniv: world?.anniversary ?? profile.anniv,
        me: memberNames.me ?? profile.me,
        her: memberNames.her ?? profile.her
    };

    // World-settings save: swap in the fresh DB row (chrome updates at once)
    // and sync the localStorage profile buffer so offline fallbacks agree
    // (the DB is the source of truth for these fields — ai/features/supabase.md).
    const onWorldSaved = (w: World) => {
        applySavedWorld(w);
        setProfile((o) => ({ ...o, world: w.name, anniv: w.anniversary ?? o.anniv }));
    };
    // Nickname saved from settings: DB first (profiles.display_name), then the
    // in-memory member names and the localStorage fallback follow.
    const saveMyName = async (name: string) => {
        const v = await updateMyDisplayName(name);
        applyMyName(v);
        setProfile((o) => ({ ...o, me: v }));
    };

    // Leave the world back to the lobby. Voice + shared music will
    // auto-disconnect here once they exist.
    const leaveRoom = () => {
        leaveWorld();
        closeSurface(); // world modals don't outlive the room
        setChatOpen(false);
    };

    return (
        <div className="app" data-glass={t.glassStyle} data-mood={t.mood} style={{ position: 'absolute', inset: 0 }}>
            {/* v2 shell (concept-c): the scene owns the full viewport; every
                chrome piece floats above it. The Discord-era sidebar/HUD
                retired with the idle-companion pivot
                (ai/design_system/uiux/uiux.md). */}
            <div
                className="stage"
                data-reading={screen === 'timeline' || undefined}
                style={{ position: 'absolute', inset: 0 }}
            >
                {inWorld ? (
                    <Suspense fallback={null}>
                        <RoomScene
                            active={screen === null || screen === 'timeline'}
                            mood={t.mood}
                            weatherKind={weather.kind}
                            onHotspot={onHotspot}
                            bubble={bubble}
                            presence={{
                                pink: {
                                    name: liveProfile.her,
                                    // placeholder copy until Realtime Presence
                                    // lands (TODO R1) — layout is final
                                    status: '在你身边',
                                    online: true
                                }
                            }}
                        />
                    </Suspense>
                ) : (
                    <LobbyScene
                        status={lobbyStatus}
                        hasWorld={world !== null}
                        error={lobbyError}
                        busy={lobbyBusy}
                        onEnter={enterWorld}
                        onCreate={createAndEnter}
                    />
                )}
                {inWorld && (
                    <>
                        <Rail
                            unread={unread}
                            activeRoom="study"
                            onRoom={() => {
                                /* single room today — switch lands with the gameroom/garden scenes */
                            }}
                            onAction={onRail}
                            widgets={widgets}
                            setWidget={setWidget}
                            onLeaveWorld={leaveRoom}
                        />
                        <Ambience
                            mood={t.mood}
                            setMood={(k) => setTweak('mood', k)}
                            wx={t.weather}
                            setWx={(k) => setTweak('weather', k)}
                        />
                        {widgets.anniv !== false && (
                            <MomentCard anniv={liveProfile.anniv} onHide={() => setWidget('anniv', false)} />
                        )}
                        {widgets.music !== false && (
                            <MusicMini spaceName={liveProfile.world} open={musicOpen} setOpen={setMusicOpen} />
                        )}
                        <RoomHandle
                            onTap={() => {
                                /* room carousel arrives with the gameroom/garden scenes */
                            }}
                        />
                        <ChatCard
                            open={chatOpen}
                            onClose={() => setChatOpen(false)}
                            onExpand={() => {
                                setChatOpen(false);
                                setConvOpen(worldConvId || null);
                            }}
                            inWorld={inWorld}
                            channels={channels}
                            dmConvs={dmConvs}
                            threads={threads}
                            onSend={send}
                            onSeen={markRead}
                            notice={writeError}
                        />
                    </>
                )}
                <WorldSurfaces
                    screen={screen}
                    tab={tab}
                    origin={surfaceOrigin}
                    onClose={closeSurface}
                    anniv={liveProfile.anniv}
                    events={events}
                    setEvents={setEvents}
                    alarms={alarms}
                    setAlarms={setAlarms}
                    nowTs={nowTs}
                    weather={weather}
                    t={t}
                    setTweak={setTweak}
                    profile={liveProfile}
                    onSaveMyName={saveMyName}
                    world={world}
                    worldIconUrl={worldIconUrl}
                    onWorldSaved={onWorldSaved}
                />
                {/* covering chat hub — one expand away from the chat card */}
                <ChannelScreen
                    convId={convOpen}
                    onSelect={(id) => setConvOpen(id)}
                    inWorld={inWorld}
                    channels={channels}
                    dmConvs={dmConvs}
                    friends={friends}
                    requestsIn={requestsIn}
                    requestsOut={requestsOut}
                    onAddFriend={addFriend}
                    onAcceptFriend={acceptRequest}
                    onRemoveFriend={removeFriend}
                    onClose={() => setConvOpen(null)}
                    threads={threads}
                    onSend={send}
                    onLoadOlder={loadOlder}
                    reachedStart={reachedStart}
                    reads={reads}
                    onRetry={retrySend}
                    onDiscard={discardFailed}
                    onEdit={editMessage}
                    onDelete={deleteMsg}
                    onReact={toggleReaction}
                    emotes={emoteViews}
                    hasWorld={world !== null}
                    onSendSticker={sendStickerTo}
                    onSearchWeb={searchWeb}
                    onImportUrl={importEmoteUrl}
                    onImportFile={addEmoteFile}
                    onRemoveEmote={removeEmoteById}
                    onSeen={markRead}
                    notice={writeError}
                    chatAlign={t.chatAlign}
                />
            </div>
        </div>
    );
};

export default WorldPage;
