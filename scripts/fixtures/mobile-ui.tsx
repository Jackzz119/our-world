// Isolated layout fixture: production components, local callbacks, no account writes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Ambience } from '@/themes/cinnaglass/shell/ambience';
import { Rail } from '@/themes/cinnaglass/shell/rail';
import { ChatCard } from '@/themes/cinnaglass/shell/chat-card';
import { MusicMini, MomentCard } from '@/themes/cinnaglass/shell/floaters';
import { SunlitLetter } from '@/themes/cinnaglass/shell/sunlit-letter';
import { SettingsScreen } from '@/themes/cinnaglass/settings';
import { CalendarScreen, ClockScreen } from '@/themes/cinnaglass/calendar';
import { ChannelScreen } from '@/themes/cinnaglass/chat/chat-hub';
import { LobbyScene } from '@/themes/cinnaglass/lobby';
import { RoomScene } from '@/themes/cinnaglass/room/room-scene';
import { WorldLoader } from '@/themes/cinnaglass/shell/world-loader';
import { createLoadProgress } from '@/themes/cinnaglass/shell/load-progress';
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import { ObjectSurfaces } from '@/themes/cinnaglass/surfaces/object-surfaces';
import { useFixtureFeed, fixtureThumbs } from './memory-feed';
import '@/themes/cinnaglass/surfaces/object-surfaces.css';
import '@/themes/cinnaglass/surfaces/collection-surfaces.css';
import { Wishlist } from '@/themes/cinnaglass/surfaces/wishlist';
import { useUiEnvironment, useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import { TWEAK_DEFAULTS } from '@/themes/cinnaglass/tweaks';
import type { Tweaks } from '@/themes/cinnaglass/tweaks';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';
import { useMotionPreference } from '@/themes/cinnaglass/ui/motion-preference';
import { applyLook } from '@/themes/cinnaglass/ui/look';
import type { Channel } from '@/types/chat';
import type { Msg } from '@/themes/cinnaglass/chat/chat-data';
import type { Alarm, CalEvent } from '@/themes/cinnaglass/model';
import { FRIENDS_VIEW } from '@/themes/cinnaglass/chat/chat-data';
import { WorldSettingsScreen } from '@/themes/cinnaglass/world-settings';
import type { World } from '@/types/feed';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import '@/index.css';
// the app loads the title face lazily from main.tsx; the fixture takes it up front so shots show it
import '@fontsource/zcool-xiaowei/400.css';
import '@/themes/cinnaglass/cinnaglass.css';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/shell/shell-layout.css';
import '@/themes/cinnaglass/image-slot';

const noop = () => {};
const done = async () => {};
// screens that put a page or a dialog over the room; it holds still under them, as in WorldPage
const COVERING = new Set(['settings', 'calendar', 'clock', 'journal', 'photos', 'wishes', 'world', 'chat', 'friends']);
// ?screen=friends and ?screen=world: one demo friend and a demo world, never saved
const demoFriends = [{ otherId: 'friend-fixture', name: '阿屿', color: '#7aa0c8', dmChannelId: null }];
const demoWorld: World = {
    id: 'layout-fixture',
    owner_id: 'fixture',
    member_id: 'fixture-partner',
    name: '我们的小屋',
    anniversary: '2023-05-20',
    icon_emoji: '🌙',
    icon_path: null,
    intimacy_points: 0,
    created_at: '2023-05-20T00:00:00Z'
};

const channels: Channel[] = ['悄悄话', '今天想和你分享的许多小事'].map((name, index) => ({
    id: `mobile-${index}`,
    name,
    type: 'text',
    position: index,
    world_id: 'layout-fixture',
    topic: '长一点的说明也应该能在手机上清楚阅读，而不把输入区域挤出画面。',
    scene_id: null,
    dm_user_a: null,
    dm_user_b: null
}));
const initialMessages: Msg[] = Array.from({ length: 18 }, (_, index) => ({
    id: `message-${index}`,
    from: index % 2 ? 'me' : 'them',
    text:
        index % 3
            ? '今晚一起听雨声吧。'
            : '一段较长的信息，用来检查窄屏上的换行与阅读空间。https://example.com/averylongunbrokentextwithoutspaces',
    time: '18:25',
    ts: '2026-09-21T18:25:00Z',
    authorId: index % 2 ? 'me' : 'them',
    kind: 'text'
}));

// Screen query selects a production surface without adding a product route or a visible test toolbar;
// ?mood and ?weather pick the light, as for screenshots.
export function MobileFixture() {
    useUiViewport();
    const query = new URLSearchParams(location.search);
    const initial = query.get('screen') || 'room';
    const [screen, setScreen] = useState(initial);
    const [t, setT] = useState<Tweaks>({
        ...TWEAK_DEFAULTS,
        mood: (query.get('mood') as Tweaks['mood']) || TWEAK_DEFAULTS.mood,
        weather: query.get('weather') === 'rain' ? 'rain' : 'sun',
        // ?journal= and ?photo= pick how the memory page draws its tabs
        journalStyle: (query.get('journal') as Tweaks['journalStyle']) || TWEAK_DEFAULTS.journalStyle,
        photoStyle: (query.get('photo') as Tweaks['photoStyle']) || TWEAK_DEFAULTS.photoStyle
    });
    // html[data-motion] as the app publishes it (?motion=reduced forces the low-motion mode)
    useMotionPreference(query.get('motion') === 'reduced' ? 'reduced' : t.motion);
    const ref = useUiEnvironment(t.mood, true);
    // ?empty=1 empties the memory feed, for the journal / photo wall empty notes
    const fixtureFeed = useFixtureFeed();
    const memories = query.get('empty') ? { ...fixtureFeed, posts: [] } : fixtureFeed;
    const compact = useCompactUi();
    const [chat, setChat] = useState(initial === 'compact-chat');
    const [music, setMusic] = useState(initial === 'music');
    const [letter, setLetter] = useState(initial === 'letter');
    const [conv, setConv] = useState(channels[0].id);
    const [messages, setMessages] = useState(initialMessages);
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    // ?screen=enter: the room behind the entry loader, wired the way WorldPage wires it
    const entering = initial === 'enter';
    const [loadProgress] = useState(createLoadProgress);
    const [roomState, setRoomState] = useState<'loading' | 'ready' | 'failed'>('loading');
    const close = () => setScreen('room');
    // one window at a time on a phone, wired the way WorldPage wires it
    const [railDismiss, setRailDismiss] = useState(0);
    const others = (keep: 'chat' | 'music' | 'rail' | 'ambience' | 'surface') => {
        if (!compact) return;
        if (keep !== 'chat') setChat(false);
        if (keep !== 'music') setMusic(false);
        if (keep !== 'rail') setRailDismiss((n) => n + 1);
        if (keep !== 'surface' && screen !== 'room') close();
    };
    const openScreen = (next: string) => {
        others('surface');
        setScreen(next);
    };
    const openChat = () => {
        setChat(true);
        setLetter(false);
        others('chat');
    };
    const send = (_: string, text: string) =>
        setMessages((old) => [
            ...old,
            {
                id: String(Date.now()),
                from: 'me',
                text,
                time: '18:26',
                ts: new Date().toISOString(),
                authorId: 'me',
                kind: 'text'
            }
        ]);
    if (screen === 'login')
        return (
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );
    if (screen === 'reset')
        return (
            <MemoryRouter>
                <ResetPasswordPage />
            </MemoryRouter>
        );
    return (
        <div
            ref={ref}
            className="app ui-environment"
            style={{ position: 'fixed', inset: 0 }}
            data-mood={t.mood}
            data-chat-open={chat}
            data-music-open={music}
            data-letter-visible={letter}
            data-world={entering ? roomState : undefined}
        >
            {/* the real scene behind every in-world screen; its dev presence panel is not part of the layout under test */}
            <style>{'.table-dev.ui-surface { display: none; }'}</style>
            {screen !== 'lobby' && (
                <RoomScene
                    active={!COVERING.has(screen)}
                    mood={t.mood}
                    weatherKind={t.weather === 'rain' ? 'rain' : 'sun'}
                    presence={{ partner: { name: '阿屿', status: '' } }}
                    onProgress={entering ? loadProgress.set : undefined}
                    onReady={entering ? () => setRoomState('ready') : undefined}
                    onFailed={entering ? () => setRoomState('failed') : undefined}
                />
            )}
            {entering && (
                <WorldLoader
                    active={roomState === 'loading'}
                    progress={loadProgress}
                    mood={t.mood}
                    rainy={t.weather === 'rain'}
                    partnerName="阿屿"
                />
            )}
            {screen === 'lobby' ? (
                <LobbyScene status="ready" hasWorld busy={false} error={null} onEnter={close} onCreate={noop} />
            ) : (
                <>
                    <Rail
                        unread={letter}
                        chatOpen={chat}
                        musicOpen={music}
                        activeRoom="study"
                        onRoom={noop}
                        widgets={{}}
                        setWidget={noop}
                        onLeaveWorld={() => setScreen('lobby')}
                        onPopOpen={() => others('rail')}
                        dismissSignal={railDismiss}
                        onAction={(key) => {
                            if (key === 'chat') {
                                if (chat) setChat(false);
                                else openChat();
                            }
                            if (key === 'music') {
                                setMusic(!music);
                                if (!music) others('music');
                            }
                            if (key === 'settings') openScreen('settings');
                            if (key === 'calendar') openScreen('calendar');
                            if (key === 'journal') openScreen('journal');
                            if (key === 'photos') openScreen('photos');
                        }}
                    />
                    <Ambience
                        mood={t.mood}
                        setMood={(mood) => setT({ ...t, mood })}
                        wx={t.weather}
                        setWx={(weather) => setT({ ...t, weather } as typeof t)}
                        weather={{ kind: 'cloud', label: '实况不可用', temp: null, place: '', status: 'unavailable' }}
                        onOpen={() => others('ambience')}
                    />
                    <MomentCard anniv="2023-05-20" onHide={noop} />
                    <SunlitLetter mood={t.mood} visible={letter} onOpen={openChat} />
                    <ChatCard
                        open={chat}
                        inWorld
                        onClose={() => setChat(false)}
                        onExpand={() => setScreen('chat')}
                        channels={channels}
                        dmConvs={[]}
                        threads={{ [channels[0].id]: messages }}
                        onSend={send}
                        onSeen={noop}
                    />
                    <MusicMini
                        open={music}
                        setOpen={(value) => {
                            setMusic(value);
                            if (value) others('music');
                        }}
                    />
                </>
            )}
            <SettingsScreen
                open={screen === 'settings'}
                onClose={close}
                t={t}
                setTweak={(key, value) => setT((old) => ({ ...old, [key]: value }))}
                profile={{
                    world: '我们的小屋',
                    her: '一个比较长的昵称用来检查手机排版',
                    me: '小蓝',
                    anniv: '2023-05-20',
                    status: ''
                }}
                onSaveMyName={done}
            />
            <CalendarScreen
                open={screen === 'calendar'}
                onClose={close}
                anniv="2023-05-20"
                events={events}
                setEvents={setEvents}
            />
            <ClockScreen
                open={screen === 'clock'}
                onClose={close}
                nowTs={Date.parse('2026-09-21T18:25:00')}
                weather={{ kind: 'rain', label: '雨', temp: null, place: '', status: 'manual' }}
                alarms={alarms}
                setAlarms={setAlarms}
            />
            {/* ?screen=journal | photos: the memory page over a local feed (?journal= / ?photo= pick its views) */}
            <ObjectSurfaces
                screen={screen === 'journal' ? 'timeline' : screen === 'photos' ? 'photos' : null}
                onClose={close}
                feed={memories}
                thumbUrls={fixtureThumbs}
                journalStyle={t.journalStyle}
                photoStyle={t.photoStyle}
                onJournalStyle={(journalStyle) => setT((old) => ({ ...old, journalStyle }))}
                onPhotoStyle={(photoStyle) => setT((old) => ({ ...old, photoStyle }))}
                musicPlaying={music}
            />
            {screen === 'wishes' && (
                <TaskDialog
                    open
                    onClose={close}
                    title="心愿单"
                    className="collection-task wishlist-task"
                    description="心愿仅保存在当前浏览器，不会同步给对方。"
                >
                    <Wishlist />
                </TaskDialog>
            )}
            <WorldSettingsScreen
                open={screen === 'world'}
                onClose={close}
                world={demoWorld}
                iconUrl={null}
                onSaved={noop}
            />
            {(screen === 'chat' || screen === 'friends') && (
                <ChannelScreen
                    convId={screen === 'friends' ? FRIENDS_VIEW : conv}
                    onSelect={setConv}
                    inWorld
                    channels={channels}
                    dmConvs={[]}
                    friends={screen === 'friends' ? demoFriends : []}
                    requestsIn={[]}
                    requestsOut={[]}
                    onAddFriend={async () => ''}
                    onAcceptFriend={noop}
                    onRemoveFriend={noop}
                    onClose={close}
                    threads={Object.fromEntries(channels.map((c) => [c.id, messages]))}
                    onSend={send}
                    onLoadOlder={noop}
                    reachedStart={{ [conv]: true }}
                    reads={{}}
                    onRetry={noop}
                    onDiscard={noop}
                    onEdit={noop}
                    onDelete={noop}
                    onReact={noop}
                    emotes={[]}
                    hasWorld
                    onSendSticker={noop}
                    onSearchWeb={async () => []}
                    onImportUrl={done}
                    onImportFile={done}
                    onRemoveEmote={noop}
                    onSeen={noop}
                    chatAlign="left"
                />
            )}
        </div>
    );
}

applyLook();
createRoot(document.getElementById('root')!).render(<MobileFixture />);
