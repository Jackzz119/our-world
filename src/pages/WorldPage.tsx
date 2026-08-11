// WorldPage.tsx — root orchestration for the cinnaglass "Our World" UI.
// Ported from the design prototype's app.jsx: live clock, real weather,
// tweaks, navigation, and all shared state (profile, rooms, current room,
// events, alarms, widgets) + localStorage persistence.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

// the pixi room compositor loads its own chunk on demand (pixi.js is chunky)
const RoomScene = lazy(() =>
    import('@/themes/cinnaglass/room/room-scene').then((m) => ({ default: m.RoomScene }))
);
import { LobbyScene, type LobbyStatus } from '@/themes/cinnaglass/lobby';
import { SubScreen, type TabKey } from '@/themes/cinnaglass/screens';
import { CalendarScreen, ClockScreen } from '@/themes/cinnaglass/calendar';
import { SettingsScreen } from '@/themes/cinnaglass/settings';
import { WorldSettingsScreen } from '@/themes/cinnaglass/world-settings';
import { PROFILE_DEFAULT, gload } from '@/themes/cinnaglass/profile';
import { Rail, RoomHandle, type RailKey } from '@/themes/cinnaglass/shell/rail';
import { Ambience } from '@/themes/cinnaglass/shell/ambience';
import { MomentCard, MusicMini } from '@/themes/cinnaglass/shell/floaters';
import { ChatCard } from '@/themes/cinnaglass/shell/chat-card';
import { ChannelScreen } from '@/themes/cinnaglass/channel-screen';
import { useChatThreads, convsFor } from '@/themes/cinnaglass/chat-data';
import { owLoad } from '@/themes/cinnaglass/rooms';
import { useTweaks } from '@/themes/cinnaglass/tweaks';
import type { Alarm, CalEvent, Profile, Weather, Widgets } from '@/themes/cinnaglass/model';
import { getMyWorld, createWorld } from '@/lib/worlds.ts';
import { signImageUrls } from '@/lib/storage.ts';
import { getProfilesByIds } from '@/lib/profiles.ts';
import type { FeedProfile, World } from '@/types/feed.ts';
import { getEnvFlag } from '@/utils';

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

// addon widgets are removable; required stay on always
const REQUIRED = ['days', 'minimap'];
const ADDON = ['memory', 'anniv', 'ambient', 'music', 'lighting'];
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

// WMO weather code → kind + label
const mapWmo = (code: number): { kind: string; label: string } => {
    if (code === 0) return { kind: 'sun', label: '晴' };
    if (code <= 3) return { kind: 'cloud', label: '多云' };
    if (code <= 48) return { kind: 'cloud', label: '雾' };
    if (code <= 67) return { kind: 'rain', label: '小雨' };
    if (code <= 77) return { kind: 'snow', label: '雪' };
    if (code <= 82) return { kind: 'rain', label: '阵雨' };
    if (code <= 86) return { kind: 'snow', label: '阵雪' };
    return { kind: 'rain', label: '雷雨' };
};
const MANUAL_WX: Record<string, { kind: string; label: string; temp: number }> = {
    sun: { kind: 'sun', label: '晴', temp: 26 },
    cloud: { kind: 'cloud', label: '多云', temp: 22 },
    rain: { kind: 'rain', label: '小雨', temp: 18 },
    snow: { kind: 'snow', label: '雪', temp: 1 }
};

const futureDate = (addDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const SEED_EVENTS: CalEvent[] = [
    { id: 'ev-seed1', date: futureDate(3), title: '看那部期待很久的电影 🎬' },
    { id: 'ev-seed2', date: futureDate(9), title: '去新开的那家面包店 🥐' }
];
const SEED_ALARMS: Alarm[] = [
    { id: 'al1', time: '07:30', label: '早安，一起醒来', on: true },
    { id: 'al2', time: '22:30', label: '晚安，说句悄悄话', on: true }
];

const MODAL_TABS: TabKey[] = ['timeline', 'photos', 'wishlist'];

const WorldPage = () => {
    const [t, setTweak] = useTweaks();
    // v2 shell (concept-c): narrow rail + floating widgets. The chat card is
    // the stage-side chat surface; the covering hub stays one expand away.
    const [chatOpen, setChatOpen] = useState(false);
    const [musicOpen, setMusicOpen] = useState(false);
    const [unread, setUnread] = useState(false);
    const [convOpen, setConvOpen] = useState<string | null>(null);
    const [screen, setScreen] = useState<string | null>(null);
    const [profile, setProfile] = useState(() => gload('ow-profile-v1', PROFILE_DEFAULT));
    const [widgets, setWidgets] = useState<Widgets>(loadWidgets);
    const [nowTs, setNowTs] = useState(() => Date.now());
    const [weather, setWeather] = useState<Weather>({ kind: 'cloud', label: '多云', temp: 22, place: '' });
    const [events, setEvents] = useState<CalEvent[]>(() => owLoad('ow-dates-v1', SEED_EVENTS));
    const [alarms, setAlarms] = useState<Alarm[]>(() => owLoad('ow-alarms-v1', SEED_ALARMS));

    // World state (DB `worlds` row — the couple's shared space, see
    // channel.md). NOT the in-world scene rooms mock above (living/bedroom
    // lighting + navigation, local).
    const [world, setWorld] = useState<World | null>(null);
    // signed display URL for world.icon_path (private bucket) — see effect below
    const [worldIconUrl, setWorldIconUrl] = useState<string | null>(null);
    const [uid, setUid] = useState<string | null>(null);
    // DB profiles of the world's members, by id — display names for the
    // chrome and for chat message authorship; fall back to the localStorage
    // profile until fetched (or on failure)
    const [profiles, setProfiles] = useState<Record<string, FeedProfile>>({});
    const [memberNames, setMemberNames] = useState<{ me?: string; her?: string }>({});
    const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('loading');
    const [lobbyError, setLobbyError] = useState<string | null>(null);
    const [lobbyBusy, setLobbyBusy] = useState(false);
    // Entering the world is explicit (portal click) unless AUTO_ENTER is on.
    const [entered, setEntered] = useState(false);
    const [lobbyTick, setLobbyTick] = useState(0);

    // chat (see ai/Features/chat.md): one thread store, two surfaces, two
    // owners — the sidebar only opens the covering conversation window
    // (channels + DMs); the dock is stage-owned (chat button / Enter only).
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

    useEffect(() => {
        let cancelled = false;
        getMyWorld()
            .then(({ world, userId }) => {
                if (cancelled) return;
                setWorld(world);
                setUid(userId);
                setLobbyStatus('ready');
                if (AUTO_ENTER && world) setEntered(true);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setLobbyError(e instanceof Error ? e.message : String(e));
                setLobbyStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [lobbyTick]);

    // World icon lives in the private memories bucket, so display needs a
    // signed URL. Re-sign every 40min (TTL is 1h — same margin as timeline's
    // image renewal) so a long-lived tab never shows a broken icon.
    const iconPath = world?.icon_path ?? null;
    useEffect(() => {
        if (!iconPath) {
            setWorldIconUrl(null);
            return;
        }
        let cancelled = false;
        const sign = () =>
            signImageUrls([iconPath])
                .then((m) => {
                    if (!cancelled) setWorldIconUrl(m[iconPath] ?? null);
                })
                .catch(() => {
                    /* keep the last URL; emoji/letter fallback covers first load */
                });
        sign();
        const id = setInterval(sign, 40 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [iconPath]);

    // live clock
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
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

    // unread pip on the rail: a partner message landed while the chat card
    // was closed. Opening any chat surface clears it.
    const worldConvId = convsFor(entered && world !== null, channels, dmConvs)[0]?.id ?? '';
    const lastMsg = (threads[worldConvId] || []).at(-1);
    useEffect(() => {
        if (!lastMsg) return;
        if (chatOpen || convOpen) {
            setUnread(false);
            return;
        }
        if (lastMsg.from !== 'me') setUnread(true);
    }, [lastMsg, chatOpen, convOpen]);

    // her message surfaces in the world first: a short-lived speech bubble
    // over her character (codex audit M2 / ai/UX.md §4 — world-first chat)
    const [bubble, setBubble] = useState<{ seatId: string; text: string; key: number } | null>(null);
    const lastBubbledId = useRef<string | null>(null);
    useEffect(() => {
        if (!lastMsg || lastMsg.from === 'me' || lastMsg.pending) return;
        if (lastBubbledId.current === lastMsg.id) return;
        lastBubbledId.current = lastMsg.id;
        const text = lastMsg.kind === 'sticker' ? '发来一张贴纸' : (lastMsg.text ?? '');
        if (!text) return;
        setBubble({ seatId: 'pink', text, key: Date.now() });
        const id = setTimeout(() => setBubble(null), 4500);
        return () => clearTimeout(id);
    }, [lastMsg]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-dates-v1', JSON.stringify(events));
        } catch {
            /* ignore */
        }
    }, [events]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-alarms-v1', JSON.stringify(alarms));
        } catch {
            /* ignore */
        }
    }, [alarms]);
    useEffect(() => {
        try {
            localStorage.setItem('ow-profile-v1', JSON.stringify(profile));
        } catch {
            /* ignore */
        }
    }, [profile]);

    // weather: manual override OR real-time (geolocation → open-meteo)
    useEffect(() => {
        if (t.weather !== 'auto') {
            // Manual tweak forces a fixed kind; auto path resolves async below.
            setWeather({ ...MANUAL_WX[t.weather], place: '' });
            return;
        }
        let cancel = false;
        const fallback = () => !cancel && setWeather({ kind: 'cloud', label: '多云', temp: 22, place: '' });
        if (!navigator.geolocation) {
            fallback();
            return;
        }
        const to = setTimeout(fallback, 7000);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: la, longitude: lo } = pos.coords;
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (cancel) return;
                        clearTimeout(to);
                        const c = d.current;
                        setWeather({ ...mapWmo(c.weather_code), temp: Math.round(c.temperature_2m), place: '当前位置' });
                    })
                    .catch(() => {
                        clearTimeout(to);
                        fallback();
                    });
            },
            () => {
                clearTimeout(to);
                fallback();
            },
            { timeout: 6500, maximumAge: 6e5 }
        );
        return () => {
            cancel = true;
            clearTimeout(to);
        };
    }, [t.weather]);

    const setWidget = (k: string, v: boolean) => {
        if (REQUIRED.includes(k)) return; // required widgets can't be removed
        setWidgets((w) => {
            const next = { ...w, [k]: v };
            try {
                localStorage.setItem('ow-widgets-v1', JSON.stringify(next));
            } catch {
                /* ignore */
            }
            return next;
        });
    };
    const navigate = (k: string) => setScreen(k);

    // rail actions → surfaces (both entry channels open the same surface)
    const onRail = (k: RailKey) => {
        if (k === 'chat') setChatOpen(true);
        else if (k === 'photos') navigate('photos');
        else if (k === 'calendar') navigate('calendar');
        else if (k === 'music') setMusicOpen(true);
        else if (k === 'settings') navigate('settings');
    };
    // furniture hotspots → the very same surfaces (ai/UX.md §2)
    const onHotspot = (id: string) => {
        if (id === 'timeline' || id === 'photos' || id === 'wishlist') navigate(id);
        else if (id === 'clock') navigate('clock');
        else if (id === 'music') setMusicOpen(true);
    };

    // Lobby → world flow. retryLobby resets in the event handler (not the
    // effect body) and bumps the tick so the effect refetches.
    const retryLobby = () => {
        setLobbyStatus('loading');
        setLobbyError(null);
        setLobbyTick((t) => t + 1);
    };
    const enterWorld = () => {
        if (world) setEntered(true);
        else retryLobby(); // a world may have appeared elsewhere — re-check
    };
    const createAndEnter = async () => {
        setLobbyBusy(true);
        setLobbyError(null);
        try {
            const created = await createWorld();
            setWorld(created);
            setEntered(true);
        } catch (e) {
            setLobbyError(e instanceof Error ? e.message : String(e));
        } finally {
            setLobbyBusy(false);
        }
    };
    const inWorld = entered && world !== null;

    // S-4 step 2: identity now lives in the DB. Fetch the two members'
    // display names once the world is known; render keeps working off the
    // localStorage fallback if this fails.
    useEffect(() => {
        if (!world) return;
        let cancelled = false;
        getProfilesByIds([world.owner_id, world.member_id])
            .then((m) => {
                if (cancelled) return;
                setProfiles(m);
                const otherId = [world.owner_id, world.member_id].find((i) => i && i !== uid);
                setMemberNames({
                    me: (uid && m[uid]?.display_name) || undefined,
                    her: (otherId && m[otherId]?.display_name) || undefined
                });
            })
            .catch(() => {
                /* keep localStorage names */
            });
        return () => {
            cancelled = true;
        };
    }, [world, uid]);

    // What the chrome (sidebar/HUD/space) displays: DB world identity first,
    // localStorage as fallback. Settings still edits the raw local profile —
    // the write-back to worlds/profiles is S-4 step 3.
    const liveProfile: Profile = {
        ...profile,
        world: world?.name ?? profile.world,
        anniv: world?.anniversary ?? profile.anniv,
        me: memberNames.me ?? profile.me,
        her: memberNames.her ?? profile.her
    };

    // World-settings save: swap in the fresh DB row (chrome updates at once)
    // and sync the localStorage profile buffer so offline fallbacks agree
    // (S-4 step 3 — the DB is now the source of truth for these fields).
    const onWorldSaved = (w: World) => {
        setWorld(w);
        setProfile((o) => ({ ...o, world: w.name, anniv: w.anniversary ?? o.anniv }));
    };

    // Leave the world back to the lobby. Voice + shared music will
    // auto-disconnect here once they exist.
    const leaveRoom = () => {
        setEntered(false);
        setScreen(null); // world modals don't outlive the room
        setChatOpen(false);
    };

    return (
        <div className="app" data-glass={t.glassStyle} data-mood={t.mood} style={{ position: 'absolute', inset: 0 }}>
            {/* v2 shell (concept-c): the scene owns the full viewport; every
                chrome piece floats above it. The Discord-era sidebar/HUD
                retired with the idle-companion pivot (ai/UX.md). */}
            <div className="stage" style={{ position: 'absolute', inset: 0 }}>
                {inWorld ? (
                    <Suspense fallback={null}>
                        <RoomScene
                            active={screen === null}
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
                        />
                    </>
                )}
                <SubScreen screen={MODAL_TABS.includes(screen as TabKey) ? (screen as TabKey) : null} onClose={() => setScreen(null)} />
                <CalendarScreen open={screen === 'calendar'} onClose={() => setScreen(null)} events={events} setEvents={setEvents} />
                <ClockScreen open={screen === 'clock'} onClose={() => setScreen(null)} nowTs={nowTs} weather={weather} alarms={alarms} setAlarms={setAlarms} />
                <SettingsScreen open={screen === 'settings'} onClose={() => setScreen(null)} t={t} setTweak={setTweak} profile={profile} setP={setProfile} />
                <WorldSettingsScreen open={screen === 'world-settings'} onClose={() => setScreen(null)} world={world} iconUrl={worldIconUrl} onSaved={onWorldSaved} />
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
                    chatAlign={t.chatAlign}
                />
            </div>
        </div>
    );
};

export default WorldPage;