import type { FeedPost, FeedProfile } from '@/types/feed';
import { thumbPathOf } from '@/lib/storage';

export type JournalPart = { post: FeedPost; text: string; start: number; images: string[]; continued: boolean };
export type JournalPage = { element: HTMLElement; parts: JournalPart[] };
type Context = {
    profiles: Record<string, FeedProfile>;
    userId: string | null;
    urls: Record<string, string>;
    roomArt?: boolean;
};

const element = (tag: string, className: string, text?: string) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

// User content is always textContent, never interpreted as markup. These
// nodes belong to the book renderer, not React's reconciler.
export function journalEntry(part: JournalPart, context: Context): HTMLElement {
    const { post, text, images, continued } = part;
    const mine = post.author_id === context.userId;
    const profile = context.profiles[post.author_id];
    const name = mine ? '我' : profile?.display_name || '你';
    const entry = element('article', `journal-entry ${mine ? 'mine' : 'theirs'}`);
    if (context.roomArt) entry.classList.add('journal-room-entry');
    if (images.length) entry.classList.add('has-photos');
    entry.dataset.postId = post.post_id;
    entry.dataset.offset = String(part.start);
    const meta = element('div', 'journal-meta');
    const avatar = document.createElement('img');
    avatar.className = 'journal-avatar';
    const defaultAvatar = mine ? 'blue' : 'pink';
    const customAvatar = profile?.avatar_url && !profile.avatar_url.startsWith('/avatars/');
    avatar.src =
        context.roomArt && !customAvatar
            ? `/ui/journal/avatar-${defaultAvatar}.webp`
            : profile?.avatar_url || `/avatars/${defaultAvatar}.png`;
    avatar.alt = context.roomArt ? name : '';
    avatar.draggable = false;
    meta.append(avatar, element('b', 'journal-author', name));
    const date = new Date(post.created_at);
    meta.append(
        element(
            'time',
            'journal-date',
            context.roomArt
                ? `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}${continued ? ' · 续' : ''}`
                : `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')} · ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}${continued ? ' · 续' : ''}`
        )
    );
    const card = element('div', 'journal-entry-body');
    if (text) card.append(element('p', 'journal-copy', text));
    if (post.is_placeholder && !text && !images.length)
        card.append(element('p', 'journal-copy', '这段回忆暂时珍藏着。'));
    if (images.length) {
        const grid = element('div', `journal-photos ${images.length === 1 ? 'single' : 'multiple'}`);
        images.forEach((path) => {
            const mount = element('span', 'journal-photo');
            const image = document.createElement('img');
            image.dataset.imagePath = path;
            const url = context.urls[thumbPathOf(path)];
            if (url) image.src = url;
            image.alt = url ? '回忆照片' : '照片加载中';
            image.draggable = false;
            mount.append(image);
            if (context.roomArt) {
                for (const corner of ['tl', 'tr', 'bl', 'br']) {
                    const paperCorner = element('i', `journal-photo-corner ${corner}`);
                    paperCorner.setAttribute('aria-hidden', 'true');
                    mount.append(paperCorner);
                }
            }
            grid.append(mount);
        });
        if (context.roomArt) card.prepend(grid);
        else card.append(grid);
    }
    const open = element('button', 'journal-open', '↗');
    open.setAttribute('type', 'button');
    open.setAttribute('aria-label', `查看${name}的回忆 · ${date.toLocaleDateString('zh-CN')}`);
    open.dataset.postId = post.post_id;
    card.append(open);
    entry.append(meta, card);
    return entry;
}

// Real DOM measurements drive pagination. Long text is split only when the
// complete record cannot fit on an empty page; no lost characters or photos.
export function buildJournalPages(posts: FeedPost[], width: number, height: number, context: Context): JournalPage[] {
    const measure = element('div', 'journal-measure');
    if (context.roomArt) measure.classList.add('journal-room-measure');
    // The real leaf has a 1px border on both sides. Measure its inner width,
    // otherwise a long line can gain a line after pagination.
    measure.style.width = `${width - 2}px`;
    document.body.append(measure);
    const pages: JournalPage[] = [];
    const measured = getComputedStyle(measure);
    const reserved = context.roomArt
        ? parseFloat(measured.getPropertyValue('--journal-content-top')) +
          parseFloat(measured.getPropertyValue('--journal-content-bottom'))
        : 132;
    const available = Math.max(90, height - reserved);
    const photoHeight = context.roomArt
        ? Math.max(64, Math.min(225, width * 0.51, available - 88))
        : Math.max(24, Math.min(132, available - 104));
    const gridHeight = context.roomArt
        ? Math.max(44, Math.min(122, Math.floor((available - 88) / 2)))
        : Math.max(20, Math.min(70, Math.floor((available - 112) / 2)));
    measure.style.setProperty('--journal-photo-height', `${photoHeight}px`);
    measure.style.setProperty('--journal-grid-height', `${gridHeight}px`);
    let used = 0;
    let current: JournalPage;
    const addPage = () => {
        const node = element('div', 'journal-page');
        if (context.roomArt) node.classList.add('journal-room-leaf');
        node.dataset.density = 'soft';
        node.style.width = `${width}px`;
        node.style.height = `${height}px`;
        node.style.setProperty('--journal-photo-height', `${photoHeight}px`);
        node.style.setProperty('--journal-grid-height', `${gridHeight}px`);
        const body = element('div', 'journal-page-content');
        node.append(body);
        current = { element: node, parts: [] };
        pages.push(current);
        used = 0;
    };
    const size = (part: JournalPart) => {
        const node = journalEntry(part, context);
        measure.replaceChildren(node);
        return Math.ceil(node.getBoundingClientRect().height) + 22;
    };
    const add = (part: JournalPart) => {
        const h = size(part);
        current.parts.push(part);
        current.element.firstElementChild!.append(journalEntry(part, context));
        used += h;
    };
    try {
        addPage();
        for (const post of posts) {
            let text = post.visible_content || '';
            let images = [...(post.visible_images || [])];
            let start = 0;
            let continued = false;
            do {
                const whole = { post, text, start, images, continued };
                const wholeSize = size(whole);
                if (wholeSize <= available - used) {
                    add(whole);
                    break;
                }
                if (used > 0) {
                    addPage();
                    continue;
                }
                if (text) {
                    // Binary search grapheme boundaries, preserving emoji and
                    // surrogate pairs. Prefer a paragraph break near the end.
                    const segments = [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)];
                    let low = 1;
                    let high = segments.length;
                    let count = 1;
                    while (low <= high) {
                        const mid = Math.floor((low + high) / 2);
                        const end = mid === segments.length ? text.length : segments[mid].index;
                        if (size({ ...whole, text: text.slice(0, end), images: [] }) <= available) {
                            count = mid;
                            low = mid + 1;
                        } else high = mid - 1;
                    }
                    let end = count === segments.length ? text.length : segments[count].index;
                    const paragraph = text.lastIndexOf('\n', end - 1);
                    if (paragraph > end * 0.65) end = paragraph + 1;
                    add({ ...whole, text: text.slice(0, end), images: [] });
                    text = text.slice(end);
                    start += end;
                } else {
                    let count = Math.min(4, images.length);
                    while (count > 1 && size({ ...whole, images: images.slice(0, count) }) > available) count--;
                    add({ ...whole, images: images.slice(0, count) });
                    images = images.slice(count);
                }
                continued = true;
                if (text || images.length) addPage();
            } while (text || images.length);
        }
        if (pages.length % 2 !== 0) addPage();
        pages.forEach((page, i) => {
            const first = page.parts[0];
            const label = first
                ? context.roomArt
                    ? `${new Date(first.post.created_at).getFullYear()} · ${String(new Date(first.post.created_at).getMonth() + 1).padStart(2, '0')}`
                    : new Date(first.post.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
                : context.roomArt
                  ? ''
                  : '慢慢收好 · 小小的日子';
            page.element.prepend(element('div', 'journal-running-title', label));
            page.element.append(element('span', 'journal-page-number', String(i + 1).padStart(2, '0')));
            if (!page.parts.length)
                page.element.firstElementChild!.after(
                    element(
                        'div',
                        'journal-empty-page',
                        posts.length ? '下一段回忆，留给明天。' : '一起写下，平凡而温柔的日子。'
                    )
                );
        });
        return pages;
    } finally {
        measure.remove();
    }
}
