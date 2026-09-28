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
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import { PhotoWall } from '@/themes/cinnaglass/surfaces/photo-wall';
import { thumbPathOf } from '@/lib/storage';
import type { FeedPost } from '@/types/feed';
import '@/themes/cinnaglass/surfaces/object-surfaces.css';
import '@/themes/cinnaglass/surfaces/collection-surfaces.css';
import { Wishlist } from '@/themes/cinnaglass/surfaces/wishlist';
import { useUiEnvironment, useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import { TWEAK_DEFAULTS } from '@/themes/cinnaglass/tweaks';
import type { Tweaks } from '@/themes/cinnaglass/tweaks';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';
import type { Channel } from '@/types/chat';
import type { Msg } from '@/themes/cinnaglass/chat/chat-data';
import type { Alarm, CalEvent } from '@/themes/cinnaglass/model';
import { FRIENDS_VIEW } from '@/themes/cinnaglass/chat/chat-data';
import { WorldSettingsScreen } from '@/themes/cinnaglass/world-settings';
import type { World } from '@/types/feed';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import '@/index.css';
import '@/themes/cinnaglass/cinnaglass.css';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/shell/shell-layout.css';
import '@/themes/cinnaglass/image-slot';

const noop = () => {};
const done = async () => {};
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

const photos: FeedPost[] = ['golden', 'twilight', 'night'].map((mood, index) => ({
    post_id: `photo-${index}`,
    world_id: 'layout-fixture',
    author_id: 'fixture',
    privacy: 'shared',
    created_at: '2026-09-21T18:25:00Z',
    updated_at: '2026-09-21T18:25:00Z',
    unlock_cost: 0,
    is_unlocked: true,
    is_placeholder: false,
    visible_content: null,
    visible_images: [`${mood}.png`]
}));
// the study's empty-table plate for each hour stands in for photos
const PLATE: Record<string, string> = {
    golden: '/rooms/study/plate-golden-on.webp',
    twilight: '/rooms/study/plate-twilight-on.webp',
    night: '/rooms/study/plate-night-on-dry.webp'
};
const photoUrls = Object.fromEntries(
    ['golden', 'twilight', 'night'].map((mood) => [thumbPathOf(`${mood}.png`), PLATE[mood]])
);

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
        weather: query.get('weather') === 'rain' ? 'rain' : 'sun'
    });
    const ref = useUiEnvironment(t.mood, true);
    const compact = useCompactUi();
    const [chat, setChat] = useState(initial === 'compact-chat');
    const [music, setMusic] = useState(initial === 'music');
    const [letter, setLetter] = useState(initial === 'letter');
    const [conv, setConv] = useState(channels[0].id);
    const [messages, setMessages] = useState(initialMessages);
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const close = () => setScreen('room');
    const openChat = () => {
        setChat(true);
        setLetter(false);
        if (compact) setMusic(false);
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
        >
            {/* the real scene behind every in-world screen; its dev presence panel is not part of the layout under test */}
            <style>{'.table-dev.ui-surface { display: none; }'}</style>
            {screen !== 'lobby' && (
                <RoomScene
                    mood={t.mood}
                    weatherKind={t.weather === 'rain' ? 'rain' : 'sun'}
                    presence={{ partner: { name: '阿屿', status: '' } }}
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
                        onAction={(key) => {
                            if (key === 'chat') {
                                if (chat) setChat(false);
                                else openChat();
                            }
                            if (key === 'music') {
                                setMusic(!music);
                                if (compact && !music) setChat(false);
                            }
                            if (key === 'settings') setScreen('settings');
                            if (key === 'calendar') setScreen('calendar');
                        }}
                    />
                    <Ambience
                        mood={t.mood}
                        setMood={(mood) => setT({ ...t, mood })}
                        wx={t.weather}
                        setWx={(weather) => setT({ ...t, weather } as typeof t)}
                        weather={{ kind: 'cloud', label: '实况不可用', temp: null, place: '', status: 'unavailable' }}
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
                            if (compact && value) setChat(false);
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
            {screen === 'photos' && (
                <TaskDialog
                    open
                    onClose={close}
                    title="照片墙"
                    className="collection-task photos-task"
                    description="把一起留下的瞬间，慢慢看。"
                    wide
                >
                    <PhotoWall posts={photos} thumbUrls={photoUrls} />
                </TaskDialog>
            )}
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

createRoot(document.getElementById('root')!).render(<MobileFixture />);
