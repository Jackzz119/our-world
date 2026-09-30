// A local memory feed for the layout fixture: two authors, a summer of posts, real
// art from public/ standing in for photos. Never fetched, never saved: a page
// written here lives in memory until the fixture reloads.
import { useState } from 'react';
import { thumbPathOf } from '@/lib/storage';
import type { UseFeed } from '@/hooks/useFeed';
import type { FeedPost, World } from '@/types/feed';

const ME = 'fixture';
const TA = 'fixture-partner';

export const fixtureWorld: World = {
    id: 'layout-fixture',
    owner_id: ME,
    member_id: TA,
    name: '我们的小屋',
    anniversary: '2023-05-20',
    icon_emoji: '🌙',
    icon_path: null,
    intimacy_points: 0,
    created_at: '2023-05-20T00:00:00Z'
};

// photo name → the public image that stands in for its signed thumbnail
const ART: Record<string, string> = {
    rain: '/music/covers/rainy-window.webp',
    clouds: '/music/covers/afternoon-clouds.webp',
    golden: '/rooms/study/plate-golden-on.webp',
    records: '/music/covers/record-corner.webp',
    sea: '/music/covers/seaside-stars.webp',
    train: '/music/covers/dawn-train.webp',
    walk: '/music/covers/spring-walk.webp',
    lamp: '/music/covers/lamp-radio.webp',
    twilight: '/rooms/study/plate-twilight-on.webp',
    night: '/rooms/study/plate-night-on-dry.webp',
    snow: '/music/covers/first-snow.webp'
};

const post = (id: number, author: string, at: string, text: string, photos: string[] = []): FeedPost => ({
    post_id: `memory-${id}`,
    world_id: fixtureWorld.id,
    author_id: author,
    privacy: 'shared',
    created_at: at,
    updated_at: at,
    unlock_cost: 0,
    is_unlocked: true,
    is_placeholder: false,
    visible_content: text,
    visible_images: photos.map((name) => `${fixtureWorld.id}/${name}.jpg`)
});

// oldest → newest, the order useFeed exposes
export const fixturePosts: FeedPost[] = [
    post(1, TA, '2026-07-05T21:40:00+08:00', '第一次在这张桌子上写日记。窗外下着雨，你说雨声像老唱片的底噪。', [
        'rain'
    ]),
    post(2, ME, '2026-07-18T19:02:00+08:00', '晚霞把整条江都染成橘色了，我们在阳台上看了很久，谁也没说话。', [
        'clouds',
        'golden'
    ]),
    post(3, TA, '2026-08-02T23:15:00+08:00', '唱片机修好了！第一张放的是你送的那张爵士。', ['records']),
    post(
        4,
        ME,
        '2026-08-14T08:30:00+08:00',
        '早起去海边。风很大，头发一直往嘴里飘，你笑了一路。\n回来的车上睡着了，醒来发现你把外套盖在我身上。',
        ['sea', 'train', 'walk']
    ),
    post(
        5,
        TA,
        '2026-08-30T22:48:00+08:00',
        '今天加班到很晚，回来的时候你已经睡着了，桌上留着一杯还温着的牛奶和一张便签：“辛苦啦，明天周末，我们去看展。”\n\n我把便签夹进了这本日记里。其实那天很累，项目里的事情一件接一件，可是推开门看到台灯还亮着，就觉得一切都还好。\n\n以后也想这样，不管多晚，都有一盏灯在等。'
    ),
    post(6, ME, '2026-09-12T20:10:00+08:00', '台灯换了新的灯泡，暖一点的那种。', ['lamp']),
    post(7, TA, '2026-09-21T18:25:00+08:00', '今天的晚饭是你做的番茄炖牛腩，好吃到想写进日记。', ['twilight', 'night']),
    post(8, ME, '2026-09-28T22:05:00+08:00', '初雪的预报说还要等很久，先把这张图存起来。', ['snow'])
];

export const fixtureThumbs: Record<string, string> = Object.fromEntries(
    Object.entries(ART).map(([name, src]) => [thumbPathOf(`${fixtureWorld.id}/${name}.jpg`), src])
);

// The feed as useFeed shapes it. publish resolves like a write would, and the new page (text
// only) arrives a moment later like the reload after it, so the landing and the stamp can be
// seen without an account.
export function useFixtureFeed(): UseFeed {
    const [posts, setPosts] = useState(fixturePosts);
    return {
        status: 'ready',
        world: fixtureWorld,
        worldId: fixtureWorld.id,
        currentUserId: ME,
        posts,
        profiles: {
            [ME]: { id: ME, display_name: '小满', avatar_url: '' },
            [TA]: { id: TA, display_name: '阿屿', avatar_url: '' }
        },
        hasMore: false,
        loadingOlder: false,
        loadOlder: () => {},
        error: null,
        reload: () => {},
        publish: async (content) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const at = new Date().toISOString();
            setTimeout(() => setPosts((old) => [...old, post(old.length + 1, ME, at, content)]), 300);
        }
    };
}
