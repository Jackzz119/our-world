// music-tracks.ts — the built-in generative playlist (no audio files). Kept out
// of music.tsx so that component file only exports components (react-refresh).

export type Track = { title: string; artist: string; root: number; chord: number[]; dur: number; cover: string };

export const TRACKS: Track[] = [
    { title: '云朵上的下午', artist: '小满 & 知夏', root: 261.63, chord: [0, 4, 7, 11], dur: 214, cover: 'linear-gradient(145deg,#FCE3B0,#F5B774)' },
    { title: '雨天的窗边', artist: 'Lo-fi 时光', root: 220.0, chord: [0, 3, 7, 10], dur: 198, cover: 'linear-gradient(145deg,#BFD0F2,#8C9DDB)' },
    { title: '暖灯电台', artist: '夜晚频率', root: 196.0, chord: [0, 4, 7, 11], dur: 236, cover: 'linear-gradient(145deg,#E7C4F0,#B68FD9)' },
    { title: '一起散步', artist: '周末', root: 293.66, chord: [0, 5, 7, 12], dur: 188, cover: 'linear-gradient(145deg,#BFE8D2,#86C9A6)' }
];
