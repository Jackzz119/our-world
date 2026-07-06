// chat-data.ts — shared conversation state for the two chat surfaces:
// the in-scene ChatDock (WoW-style ambient box) and the covering
// ChannelScreen. Same threads, two experiences — see ai/Features/chat.md.
// All mock/local for now; becomes Supabase Realtime + `messages` later.
import { useCallback, useRef, useState } from 'react';
import { CONTACTS } from './contacts';

export type Msg = { id: number; from: 'me' | 'them'; text: string; time: string; sender?: string };
export type TextChannel = { id: string; name: string; topic: string };

// text channels of the (single) room — mock until channel.md lands
export const TEXT_CHANNELS: TextChannel[] = [
    { id: 'ch-chat', name: '闲聊', topic: '随便聊聊，今天过得怎么样' },
    { id: 'ch-mem', name: '回忆', topic: '值得记住的瞬间都丢进来' },
    { id: 'ch-plan', name: '计划', topic: '下一次约会 · 旅行清单' }
];

export const isChannel = (convId: string) => convId.startsWith('ch-');

// One switchable conversation entry. convsFor is the single source for every
// conversation switcher (dock tabs + chat hub list + future unread badges):
// text channels belong to the world, DMs are persistent — so the set is
// "current world's channels + open DMs" in-world, DMs only in the lobby.
// "Open DMs" = all non-group contacts while mock; becomes recency-ordered
// threads with the messages backend.
export type Conv = { id: string; kind: 'channel' | 'dm'; name: string; hint: string };

export const convsFor = (inWorld: boolean): Conv[] => [
    ...(inWorld ? TEXT_CHANNELS.map((ch): Conv => ({ id: ch.id, kind: 'channel', name: ch.name, hint: ch.topic })) : []),
    ...CONTACTS.filter((c) => !c.group).map((c): Conv => ({ id: c.id, kind: 'dm', name: c.name, hint: c.status }))
];

export const SEED_THREADS: Record<string, Msg[]> = {
    xm: [
        { id: 1, from: 'them', text: '今天的云好软，我拍下来了，回家给你看', time: '18:31' },
        { id: 2, from: 'me', text: '好呀，像棉花糖一样吧', time: '18:32' },
        { id: 3, from: 'them', text: '晚饭想吃什么？我顺路买', time: '18:33' }
    ],
    mom: [
        { id: 1, from: 'them', text: '在忙吗，记得按时吃饭', time: '12:10' },
        { id: 2, from: 'me', text: '在呢妈，刚吃完～', time: '12:25' }
    ],
    yue: [
        { id: 1, from: 'them', text: '周末有空不，约个饭', time: '昨天' },
        { id: 2, from: 'me', text: '行啊，我问下小满', time: '昨天' }
    ],
    grp: [
        { id: 1, from: 'them', sender: 'lin', text: '周末天气不错，要不要去公园野餐？', time: '10:02' },
        { id: 2, from: 'them', sender: 'ada', text: '我超想去！', time: '10:05' },
        { id: 3, from: 'me', text: '算我们俩一个～', time: '10:08' }
    ],
    'ch-chat': [
        { id: 1, from: 'them', sender: '小满', text: '我到家啦，今天风好大', time: '19:02' },
        { id: 2, from: 'me', text: '抱抱，快喝点热的', time: '19:03' },
        { id: 3, from: 'them', sender: '小满', text: '嘿嘿，已经在煮奶茶了', time: '19:04' }
    ],
    'ch-mem': [
        { id: 1, from: 'them', sender: '小满', text: '上周的日落照片我放进相册了 🌇', time: '周一' },
        { id: 2, from: 'me', text: '那张真的绝，设成桌面了', time: '周一' }
    ],
    'ch-plan': [{ id: 1, from: 'me', text: '十一月想去看海，先记着', time: '周日' }]
};

const nowHM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Single source of truth for all conversations, shared by both surfaces.
// send() appends my message; DM contacts fake a reply (channel replies wait
// for the realtime backend).
export function useChatThreads() {
    const [threads, setThreads] = useState<Record<string, Msg[]>>(SEED_THREADS);
    const [typingId, setTypingId] = useState<string | null>(null);
    const idRef = useRef(1000);

    const send = useCallback((convId: string, text: string) => {
        const v = text.trim();
        if (!v) return;
        setThreads((t) => ({ ...t, [convId]: [...(t[convId] || []), { id: ++idRef.current, from: 'me', text: v, time: nowHM() }] }));
        const c = CONTACTS.find((x) => x.id === convId);
        if (!c) return; // channel: no fake reply
        setTypingId(convId);
        setTimeout(() => {
            setTypingId(null);
            const pick = c.replies[Math.floor(Math.random() * c.replies.length)];
            const reply: Msg =
                typeof pick === 'string'
                    ? { id: ++idRef.current, from: 'them', text: pick, time: nowHM() }
                    : { id: ++idRef.current, from: 'them', sender: pick.s, text: pick.t, time: nowHM() };
            setThreads((t) => ({ ...t, [convId]: [...(t[convId] || []), reply] }));
        }, 900 + Math.random() * 1100);
    }, []);

    return { threads, typingId, send };
}
