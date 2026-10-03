// builtin-tracks.ts — the built-in generative playlist (no audio files): eight chord recipes the
// soundscape synth (src/lib/music/synth.ts) plays when the library is empty or the listener picks
// 本机音景. Posters are the playlist's own generated covers, one still life per track
// (public/music/covers/, originals and provenance in arts/ui/music/manifest.json); lyrics are written
// for each soundscape and timed in seconds on its generated timeline.

export type LyricLine = { t: number; text: string };
export type Track = {
    title: string;
    artist: string;
    root: number;
    chord: number[];
    dur: number;
    poster: string;
    /** paint while the poster loads: the poster's own top-left to bottom-right average */
    tint: string;
    lyrics: LyricLine[];
};

// Timed lines from [seconds, text] pairs, kept short to read at a glance.
const lines = (pairs: [number, string][]): LyricLine[] => pairs.map(([t, text]) => ({ t, text }));

// Built-in "tracks": each one is a chord recipe for the WebAudio pad (four voices), not an audio file.
export const TRACKS: Track[] = [
    {
        title: '云朵上的下午',
        artist: '小满 & 知夏',
        root: 261.63,
        chord: [0, 4, 7, 11],
        dur: 214,
        poster: '/music/covers/afternoon-clouds.webp',
        tint: 'linear-gradient(145deg,#ceaf86,#b98653)',
        lyrics: lines([
            [0, '午后的风把窗帘吹成一朵云'],
            [16, '你把橘子分我一半'],
            [32, '阳光在桌上慢慢挪位置'],
            [48, '我们谁也不急着说话'],
            [66, '云把下午拉得很长'],
            [84, '长到够我们走完这条街'],
            [102, '杯子里的冰块轻轻碰了一下'],
            [120, '像你刚才那句玩笑'],
            [140, '如果可以，就停在这一格'],
            [160, '让影子再靠近一点'],
            [182, '云朵上的下午，刚刚好']
        ])
    },
    {
        title: '雨天的窗边',
        artist: 'Lo-fi 时光',
        root: 220.0,
        chord: [0, 3, 7, 10],
        dur: 198,
        poster: '/music/covers/rainy-window.webp',
        tint: 'linear-gradient(145deg,#755f63,#694b49)',
        lyrics: lines([
            [0, '窗外的灯一盏一盏亮起来'],
            [15, '杯子里的热气慢慢变细'],
            [30, '你说今天的雨好适合发呆'],
            [46, '雨一直敲着玻璃'],
            [60, '像在替我们数心跳'],
            [76, '你翻过一页书'],
            [90, '我把灯拧暗一点'],
            [106, '城市在远处安静地亮着'],
            [122, '我们谁也不用说话'],
            [140, '雨声把房间填得满满的'],
            [158, '就这样，再坐一会儿']
        ])
    },
    {
        title: '暖灯电台',
        artist: '夜晚频率',
        root: 196.0,
        chord: [0, 4, 7, 11],
        dur: 236,
        poster: '/music/covers/lamp-radio.webp',
        tint: 'linear-gradient(145deg,#84587d,#694167)',
        lyrics: lines([
            [0, '收音机里有人在念晚安'],
            [18, '旋钮转过一格，换成老情歌'],
            [36, '台灯把你的影子'],
            [50, '放在我这边的桌上'],
            [68, '频率有一点点沙沙声'],
            [86, '像你困了时候的声音'],
            [104, '这首歌唱到第二段'],
            [122, '你已经跟着哼了'],
            [142, '夜晚把我们调到同一个频道'],
            [162, '我们就这样听'],
            [184, '听到电台说再见'],
            [206, '晚安，明天见']
        ])
    },
    {
        title: '一起散步',
        artist: '周末',
        root: 293.66,
        chord: [0, 5, 7, 12],
        dur: 188,
        poster: '/music/covers/spring-walk.webp',
        tint: 'linear-gradient(145deg,#a4b19b,#d1bda8)',
        lyrics: lines([
            [0, '周末的早上不定闹钟'],
            [14, '你的鞋带又松了'],
            [28, '樱花落在你的肩上'],
            [42, '我假装没看见，偷偷拍了一张'],
            [58, '河边的风有一点甜'],
            [74, '我们走得很慢很慢'],
            [90, '像要把这条路走成回忆'],
            [108, '路口的面包店刚出炉'],
            [126, '你说下次还来这里'],
            [144, '那就说好了'],
            [162, '下一次，还是一起散步']
        ])
    },
    {
        title: '落针的唱片角',
        artist: '唱片角',
        root: 246.94,
        chord: [0, 3, 7, 10],
        dur: 205,
        poster: '/music/covers/record-corner.webp',
        tint: 'linear-gradient(145deg,#71558c,#4f3b58)',
        lyrics: lines([
            [0, '唱针落下的那一秒'],
            [14, '房间忽然安静了'],
            [30, '封套上的晚霞是紫色的'],
            [46, '你说这张要慢慢听'],
            [62, '沙沙的底噪像下雨'],
            [80, '我们各自靠着书架'],
            [98, '第三首是你最喜欢的'],
            [116, '你把音量调大了一格'],
            [136, '唱片转了一圈又一圈'],
            [156, '像我们反复说的那几句话'],
            [178, '翻面之前，再听一遍']
        ])
    },
    {
        title: '海边的星星',
        artist: '潮汐',
        root: 329.63,
        chord: [0, 4, 9, 14],
        dur: 222,
        poster: '/music/covers/seaside-stars.webp',
        tint: 'linear-gradient(145deg,#0b1223,#050b18)',
        lyrics: lines([
            [0, '海风把窗帘吹起来'],
            [16, '贝壳风铃叮叮地响'],
            [32, '你指着天上说那颗最亮'],
            [48, '我看的是你的侧脸'],
            [66, '浪一层一层地铺过来'],
            [84, '把白天的事都带走了'],
            [104, '灯塔在远处眨眼睛'],
            [124, '像在跟我们打招呼'],
            [146, '星星掉进海里'],
            [166, '我们把它们捡回来'],
            [188, '放进今晚的梦里']
        ])
    },
    {
        title: '列车清晨',
        artist: '远行',
        root: 293.66,
        chord: [0, 2, 7, 11],
        dur: 196,
        poster: '/music/covers/dawn-train.webp',
        tint: 'linear-gradient(145deg,#df997d,#b38060)',
        lyrics: lines([
            [0, '列车穿过清晨的海岸'],
            [15, '太阳刚刚醒过来'],
            [30, '你在明信片上写字'],
            [45, '写一半又抬头看我'],
            [62, '便当里有你爱吃的玉子烧'],
            [80, '窗外的小镇一格一格地过去'],
            [98, '下一站叫什么名字'],
            [116, '我们都没有看站牌'],
            [136, '反正终点'],
            [152, '是有你的地方'],
            [172, '轨道轻轻地摇']
        ])
    },
    {
        title: '初雪的夜',
        artist: '冬至',
        root: 174.61,
        chord: [0, 4, 7, 11],
        dur: 240,
        poster: '/music/covers/first-snow.webp',
        tint: 'linear-gradient(145deg,#726a7d,#4f475f)',
        lyrics: lines([
            [0, '窗玻璃结了一层薄霜'],
            [18, '你在上面画了一颗心'],
            [36, '雪落得没有声音'],
            [54, '城市被盖上一层白'],
            [74, '热可可冒着小小的烟'],
            [94, '你的围巾借我一半'],
            [114, '今年的第一场雪'],
            [134, '要和你一起看'],
            [156, '灯光在雪里变得很软'],
            [178, '我们也是'],
            [200, '初雪的夜，晚安']
        ])
    }
];
