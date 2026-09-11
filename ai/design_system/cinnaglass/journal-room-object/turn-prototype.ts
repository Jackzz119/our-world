import { buildJournalPages } from '/src/themes/cinnaglass/journal-layout.ts';
import { JournalTurnStage } from '/src/themes/cinnaglass/journal-turn.ts';
await document.fonts.load('17px "Journal WenKai"');
const surface = document.querySelector('.diary-surface');
const width = Math.floor((surface.clientWidth * 0.835) / 2);
const height = Math.floor(surface.clientHeight * 0.81);
const posts = [];
const words = [
    ['雨落了一整晚，屋里刚好暖。', '一起发呆，也是很好的约会。', '把这些小小的日子，慢慢收好。'],
    ['翻过这一页，明天也在一起。', '有你在，平凡的日子也会发光。', '窗外的雨，是今晚的背景音乐。'],
    ['今天在花园里发现了一朵小花。', '给你留了一杯热茶。', '不用赶路，慢慢看风景。'],
    ['风停了，窗边有一点点月光。', '把喜欢的故事，再讲一遍。', '日记的下一页，仍然写着我们。']
];
words.forEach((group, n) =>
    group.forEach((text, i) =>
        posts.push({
            post_id: `sample-${n}-${i}`,
            author_id: i === 1 ? 'partner' : 'self',
            created_at: `2026-09-${String(5 + n).padStart(2, '0')}T12:00:00Z`,
            visible_content: text,
            visible_images: i === 2 ? ['photo.png'] : [],
            is_placeholder: false
        })
    )
);
const pages = buildJournalPages(posts, width, height, {
    profiles: {},
    userId: 'self',
    urls: { 'photo.thumb.webp': './book-verification/reference-photo.png' },
    roomArt: true
});
pages.forEach((p) =>
    p.element
        .querySelectorAll('img[data-image-path]')
        .forEach((img) => (img.src = './book-verification/reference-photo.png'))
);
const stage = new JournalTurnStage(
    pages.map((p) => p.element),
    {
        width,
        height,
        bookWidth: surface.clientWidth,
        bookHeight: surface.clientHeight,
        left: surface.clientWidth * 0.075,
        top: surface.clientHeight * 0.044,
        single: false
    }
);
document.querySelector('.journal-turn-host').append(stage.element);
stage.render(0, []);
window.turnDemo = {
    pages: pages.length,
    frame: (p) => stage.render(0, [{ id: 1, from: 0, to: 2, direction: 1, progress: p }]),
    sequence: (t) => {
        const frames = [0, 1, 2]
            .map((i) => ({
                id: i + 1,
                from: i * 2,
                to: i * 2 + 2,
                direction: 1,
                progress: Math.max(0, Math.min(1, (t - i * 0.22) / 0.56))
            }))
            .filter((f) => f.progress > 0 && f.progress < 1);
        const current = t >= 1 ? 6 : t >= 0.78 ? 4 : t >= 0.56 ? 2 : 0;
        stage.render(current, frames);
    },
    back: (p) => stage.render(2, [{ id: 7, from: 2, to: 0, direction: -1, progress: p }]),
    reset: () => stage.render(0, [])
};
let frame = 0;
function animate(kind) {
    cancelAnimationFrame(frame);
    const start = performance.now();
    const duration = kind === 'sequence' ? 1800 : 1200;
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        window.turnDemo[kind](t);
        if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
}
document.querySelector('#play').onclick = () => animate('frame');
document.querySelector('#riffle').onclick = () => animate('sequence');
document.querySelector('#reverse').onclick = () => animate('back');
