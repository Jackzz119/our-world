// Isolated check page for the across-the-table study (ai/features/study-room/study-room.md):
// the real RoomScene under the real shell, demo messages, no account and no writes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Ambience } from '@/themes/cinnaglass/shell/ambience';
import { Rail } from '@/themes/cinnaglass/shell/rail';
import { ChatCard } from '@/themes/cinnaglass/shell/chat-card';
import { MusicMini, MomentCard } from '@/themes/cinnaglass/shell/floaters';
import { RoomScene } from '@/themes/cinnaglass/room/room-scene';
import { useUiEnvironment, useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';
import { TWEAK_DEFAULTS, type Tweaks } from '@/themes/cinnaglass/tweaks';
import type { WeatherKind } from '@/themes/cinnaglass/model';
import type { Channel } from '@/types/chat';
import type { Msg } from '@/themes/cinnaglass/chat/chat-data';
import '@/index.css';
import '@/themes/cinnaglass/cinnaglass.css';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/shell/shell-layout.css';

const noop = () => {};
const channel: Channel = {
    id: 'table-fixture',
    name: '悄悄话',
    type: 'text',
    position: 0,
    world_id: 'table-fixture',
    topic: '',
    scene_id: null,
    dm_user_a: null,
    dm_user_b: null
};
const initialMessages: Msg[] = [
    {
        id: 'm1',
        from: 'them',
        text: '今天也辛苦啦',
        time: '21:10',
        ts: '2026-09-27T13:10:00Z',
        authorId: 'them',
        kind: 'text'
    },
    {
        id: 'm2',
        from: 'me',
        text: '有你陪着真好',
        time: '21:11',
        ts: '2026-09-27T13:11:00Z',
        authorId: 'me',
        kind: 'text'
    }
];

// ?mood=golden|twilight|night and ?weather=sun|rain pick the starting light for screenshots;
// ?bubble shows the partner's reply from the start, to check where it lands at each size.
export function StudyTableFixture() {
    useUiViewport();
    const query = new URLSearchParams(location.search);
    const [t, setT] = useState<Tweaks>({
        ...TWEAK_DEFAULTS,
        mood: (query.get('mood') as Tweaks['mood']) || 'night',
        weather: (query.get('weather') as Tweaks['weather']) || 'rain'
    });
    const ref = useUiEnvironment(t.mood, true);
    const compact = useCompactUi();
    const [chat, setChat] = useState(false);
    const [music, setMusic] = useState(false);
    const [messages, setMessages] = useState(initialMessages);
    const [bubble, setBubble] = useState<{ seatId: string; text: string; key: number } | null>(
        query.has('bubble') ? { seatId: 'partner', text: '嗯嗯，我也是', key: 0 } : null
    );
    const weatherKind: WeatherKind = t.weather === 'rain' ? 'rain' : 'sun';
    const send = (_: string, text: string) => {
        setMessages((old) => [
            ...old,
            {
                id: String(Date.now()),
                from: 'me',
                text,
                time: '21:12',
                ts: new Date().toISOString(),
                authorId: 'me',
                kind: 'text'
            }
        ]);
        // the partner's reply bubble, to check where it lands above the head
        window.setTimeout(() => setBubble({ seatId: 'partner', text: '嗯嗯，我也是', key: Date.now() }), 900);
        window.setTimeout(() => setBubble(null), 5400);
    };

    return (
        <div
            ref={ref}
            className="app ui-environment"
            style={{ position: 'fixed', inset: 0 }}
            data-mood={t.mood}
            data-chat-open={chat}
            data-music-open={music}
        >
            <div className="stage" style={{ position: 'absolute', inset: 0 }}>
                <RoomScene
                    mood={t.mood}
                    weatherKind={weatherKind}
                    bubble={bubble}
                    presence={{ partner: { name: '阿屿', status: '' } }}
                />
                <Rail
                    unread={false}
                    chatOpen={chat}
                    musicOpen={music}
                    activeRoom="study"
                    onRoom={noop}
                    widgets={{}}
                    setWidget={noop}
                    onLeaveWorld={noop}
                    onAction={(key) => {
                        if (key === 'chat') {
                            setChat(!chat);
                            if (compact && !chat) setMusic(false);
                        }
                        if (key === 'music') {
                            setMusic(!music);
                            if (compact && !music) setChat(false);
                        }
                    }}
                />
                <Ambience
                    mood={t.mood}
                    setMood={(mood) => setT({ ...t, mood })}
                    wx={t.weather}
                    setWx={(weather) => setT({ ...t, weather } as Tweaks)}
                    weather={{ kind: 'cloud', label: '实况不可用', temp: null, place: '', status: 'unavailable' }}
                />
                <MomentCard anniv="2023-05-20" onHide={noop} />
                <ChatCard
                    open={chat}
                    inWorld
                    onClose={() => setChat(false)}
                    onExpand={noop}
                    channels={[channel]}
                    dmConvs={[]}
                    threads={{ [channel.id]: messages }}
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
            </div>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<StudyTableFixture />);
