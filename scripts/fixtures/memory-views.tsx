// Isolated harness for the memory page's views (surfaces/memory-views.ts): one view at a time in
// a frame the size of the memory page body — a centred window on a desktop viewport, the whole
// screen on a phone — over a still of the study, fed by the local fixture feed.
//   ?view=calendar | cork | album | projector     which view (each module default-exports it)
//   ?mood=golden | twilight | night               the light
//   ?motion=reduced                               the low-motion mode
//   ?empty=1                                      an empty feed (the empty states)
import { useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import type { UseFeed } from '@/hooks/useFeed';
import { MemoryLightbox, type LightboxRequest } from '@/themes/cinnaglass/surfaces/memory-lightbox';
import { wallPhotos } from '@/themes/cinnaglass/surfaces/memory-photos';
import type { JournalViewProps, PhotoViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { TWEAK_DEFAULTS, type Tweaks } from '@/themes/cinnaglass/tweaks';
import { useMotionPreference } from '@/themes/cinnaglass/ui/motion-preference';
import { applyLook } from '@/themes/cinnaglass/ui/look';
import { useUiEnvironment, useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';
import { fixtureThumbs, useFixtureFeed } from './memory-feed';
import '@/index.css';
import '@fontsource/zcool-xiaowei/400.css';
import '@/themes/cinnaglass/cinnaglass.css';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/surfaces/memory.css';
// the composer's base styles, which the app shell loads with the object surfaces
import '@/themes/cinnaglass/surfaces/object-surfaces.css';

type ViewModule = { default: ComponentType<JournalViewProps> | ComponentType<PhotoViewProps> };
const journalViews: Record<string, string> = { calendar: 'journal-calendar' };
const photoViews: Record<string, string> = { cork: 'photo-cork', album: 'photo-album', projector: 'photo-projector' };
// Missing files are fine: a view that is not written yet shows a note instead.
const modules = import.meta.glob<ViewModule>(
    '/src/themes/cinnaglass/surfaces/{journal-calendar,photo-cork,photo-album,photo-projector}.tsx',
    { eager: true }
);
const PLATES: Record<string, string> = {
    golden: '/rooms/study/plate-golden-on.webp',
    twilight: '/rooms/study/plate-twilight-on.webp',
    night: '/rooms/study/plate-night-on-dry.webp'
};

export function Harness() {
    useUiViewport();
    const query = new URLSearchParams(location.search);
    const view = query.get('view') || 'calendar';
    const mood = (query.get('mood') as Tweaks['mood']) || TWEAK_DEFAULTS.mood;
    useMotionPreference(query.get('motion') === 'reduced' ? 'reduced' : 'system');
    const ref = useUiEnvironment(mood, true);
    const compact = useCompactUi();
    const fixture = useFixtureFeed();
    const feed: UseFeed = query.get('empty') ? { ...fixture, posts: [] } : fixture;
    const [lightbox, setLightbox] = useState<LightboxRequest | null>(null);
    const photos = wallPhotos(feed.posts, fixtureThumbs);
    const file = journalViews[view] ?? photoViews[view];
    const mod = file && modules[`/src/themes/cinnaglass/surfaces/${file}.tsx`];

    let body = (
        <p className="mvh-note">
            还没有 {view} 视图（surfaces/{file ?? '?'}.tsx）
        </p>
    );
    if (mod && journalViews[view]) {
        const View = mod.default as ComponentType<JournalViewProps>;
        body = (
            <View
                feed={feed}
                thumbUrls={fixtureThumbs}
                open
                onPhoto={(list, index) => setLightbox({ photos: list, index, source: 'journal' })}
                focus={null}
            />
        );
    } else if (mod) {
        const View = mod.default as ComponentType<PhotoViewProps>;
        body = (
            <View
                feed={feed}
                photos={photos}
                status={feed.status}
                anyImages={feed.posts.some((p) => (p.visible_images ?? []).length > 0)}
                open
                onPhoto={(index) => setLightbox({ photos, index, source: 'photos' })}
                musicPlaying={query.get('music') === '1'}
            />
        );
    }

    return (
        <div
            ref={ref}
            className="app ui-environment"
            data-mood={mood}
            style={{ position: 'fixed', inset: 0, background: `#111 url(${PLATES[mood]}) center / cover` }}
        >
            <style>{`
                .mvh-frame { position: fixed; display: flex; flex-direction: column; overflow: hidden; }
                .mvh-frame[data-compact='false'] { inset: 0; margin: auto; width: min(1120px, 94vw); height: min(800px, 92dvh); border-radius: 28px; }
                .mvh-frame[data-compact='true'] { inset: 0; border-radius: 0; }
                .mvh-head { flex: none; display: flex; align-items: center; gap: 12px; padding: 14px 20px 10px;
                    font-family: var(--ui-display); font-size: 22px; color: var(--ui-text); }
                .mvh-body { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
                .mvh-note { margin: auto; color: var(--ui-muted); }
            `}</style>
            <section className="mvh-frame memory-panel ui-surface" data-compact={compact} aria-label="回忆视图验证">
                <header className="mvh-head">{view}</header>
                <div className="mvh-body mem-body">{body}</div>
            </section>
            <MemoryLightbox
                request={lightbox}
                feed={feed}
                onClose={() => setLightbox(null)}
                onJournal={() => setLightbox(null)}
            />
        </div>
    );
}

applyLook();
createRoot(document.getElementById('root')!).render(<Harness />);
