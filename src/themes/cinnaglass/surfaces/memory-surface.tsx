// memory-surface.tsx — the memory page: our journal and the photo wall under two title tabs. It
// is a content page (ui/content-page.tsx, 2026-10-01 product rule): you come here to read, so on a
// desktop it opens as a large window in the middle of the screen over the dimmed room, and on a
// phone it takes the whole screen straight away. Each tab can be drawn several ways
// (memory-views.ts) — the journal as a scrapbook, a calendar or the old chestnut book, the photos
// as polaroids, a cork board, an album or a projector — switched in the header and remembered.
// Everything stays mounted while the page is closed, so the scroll, a draft and the photo list
// survive (ai/features/timeline.md §七.2). The lightbox is a dialog of its own above the page.
import { useState, type CSSProperties, type ReactNode } from 'react';
import type { UseFeed } from '@/hooks/useFeed';
import { ICalendar } from '@/themes/cinnaglass/icons';
import { fmtDay } from '@/themes/cinnaglass/surfaces/date-format';
import { JournalBookView } from '@/themes/cinnaglass/surfaces/journal-book-view';
import { JournalCalendar } from '@/themes/cinnaglass/surfaces/journal-calendar';
import { JournalStream } from '@/themes/cinnaglass/surfaces/journal-stream';
import { MemoryLightbox, type LightboxRequest } from '@/themes/cinnaglass/surfaces/memory-lightbox';
import { wallPhotos, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import {
    JOURNAL_VIEWS,
    PHOTO_VIEWS,
    type JournalStyle,
    type JournalViewProps,
    type PhotoStyle,
    type PhotoViewProps
} from '@/themes/cinnaglass/surfaces/memory-views';
import { PhotoAlbum } from '@/themes/cinnaglass/surfaces/photo-album';
import { PhotoCork } from '@/themes/cinnaglass/surfaces/photo-cork';
import { PhotoProjector } from '@/themes/cinnaglass/surfaces/photo-projector';
import { PhotoWall } from '@/themes/cinnaglass/surfaces/photo-wall';
import { ContentPage } from '@/themes/cinnaglass/ui/content-page';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/surfaces/memory.css';

export type MemoryView = 'journal' | 'photos';

const TABS: { key: MemoryView; label: string }[] = [
    { key: 'journal', label: '日记' },
    { key: 'photos', label: '照片墙' }
];

type MemorySurfaceProps = {
    /** which tab the opener asked for (the book → journal, the polaroid → photos); null = closed */
    requested: MemoryView | null;
    onClose: () => void;
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    /** how each tab is drawn (tweaks.ts) */
    journalStyle: JournalStyle;
    photoStyle: PhotoStyle;
    onJournalStyle: (style: JournalStyle) => void;
    onPhotoStyle: (style: PhotoStyle) => void;
    musicPlaying?: boolean;
};

export function MemorySurface({
    requested,
    onClose,
    feed,
    thumbUrls,
    journalStyle,
    photoStyle,
    onJournalStyle,
    onPhotoStyle,
    musicPlaying = false
}: MemorySurfaceProps) {
    const compact = useCompactUi();
    const open = requested !== null;
    const [view, setView] = useState<MemoryView>(requested ?? 'journal');
    const [indexOpen, setIndexOpen] = useState(false);
    const [asked, setAsked] = useState(requested);
    // each opening shows the tab the opener asked for, calendar folded
    if (requested !== asked) {
        setAsked(requested);
        if (requested) {
            setView(requested);
            setIndexOpen(false);
        }
    }
    const [lightbox, setLightbox] = useState<LightboxRequest | null>(null);
    const [focus, setFocus] = useState<{ postId: string } | null>(null);
    const [focusStyle, setFocusStyle] = useState(journalStyle);
    // a jump to a page belongs to the view it was made in; a newly chosen view opens on the newest page
    if (journalStyle !== focusStyle) {
        setFocusStyle(journalStyle);
        setFocus(null);
    }
    const photos = wallPhotos(feed.posts, thumbUrls);

    const newest = feed.posts.at(-1);
    const sub =
        view === 'journal'
            ? newest
                ? `一起写下的 ${feed.posts.length}${feed.hasMore ? '+' : ''} 页 · 最近一页 ${fmtDay(newest.created_at)}`
                : '一起写下的日子'
            : `来自日记的 ${photos.length} 个瞬间`;

    const pick = (next: MemoryView) => {
        setView(next);
        setIndexOpen(false);
    };

    const journalProps: JournalViewProps = {
        feed,
        thumbUrls,
        open: open && view === 'journal',
        onPhoto: (list: MemoryPhoto[], index: number) => setLightbox({ photos: list, index, source: 'journal' }),
        focus
    };
    const photoProps: PhotoViewProps = {
        feed,
        photos,
        status: feed.status,
        anyImages: feed.posts.some((p) => (p.visible_images ?? []).length > 0),
        open: open && view === 'photos',
        onPhoto: (index) => setLightbox({ photos, index, source: 'photos' }),
        musicPlaying
    };
    const journalBody: Record<JournalStyle, () => ReactNode> = {
        scrapbook: () => <JournalStream {...journalProps} indexOpen={indexOpen} onIndexOpen={setIndexOpen} />,
        calendar: () => <JournalCalendar {...journalProps} />,
        book: () => <JournalBookView {...journalProps} />
    };
    const photoBody: Record<PhotoStyle, () => ReactNode> = {
        polaroid: () => <PhotoWall {...photoProps} />,
        cork: () => <PhotoCork {...photoProps} />,
        album: () => <PhotoAlbum {...photoProps} />,
        projector: () => <PhotoProjector {...photoProps} />
    };

    const header = (
        <div className="mem-page-head">
            <div
                className="mem-tabs"
                role="tablist"
                aria-label="回忆"
                style={{ '--at': view === 'journal' ? 0 : 1 } as CSSProperties}
                onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    const next = view === 'journal' ? 'photos' : 'journal';
                    pick(next);
                    event.currentTarget.querySelector<HTMLElement>(`#mem-tab-${next}`)?.focus();
                }}
            >
                {TABS.map((tab) => (
                    <button
                        type="button"
                        key={tab.key}
                        id={`mem-tab-${tab.key}`}
                        role="tab"
                        className="mem-tab"
                        aria-selected={view === tab.key}
                        aria-controls={`mem-${tab.key}`}
                        tabIndex={view === tab.key ? 0 : -1}
                        onClick={() => pick(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
                <span className="mem-tab-ink" aria-hidden="true" />
            </div>
            {!compact && <p className="mem-sub">{sub}</p>}
            {view === 'journal' ? (
                <ViewSwitch
                    label="日记的样子"
                    options={JOURNAL_VIEWS}
                    value={journalStyle}
                    onChange={(style) => {
                        setIndexOpen(false);
                        onJournalStyle(style);
                    }}
                />
            ) : (
                <ViewSwitch label="照片墙的样子" options={PHOTO_VIEWS} value={photoStyle} onChange={onPhotoStyle} />
            )}
            {compact && view === 'journal' && journalStyle === 'scrapbook' && (
                <button
                    type="button"
                    className={`ui-icon-button mem-index-btn ${indexOpen ? 'on' : ''}`}
                    aria-label="目录：按日子翻阅"
                    aria-expanded={indexOpen}
                    onClick={() => setIndexOpen((v) => !v)}
                >
                    <ICalendar size={19} />
                </button>
            )}
        </div>
    );

    return (
        <>
            <ContentPage
                open={open}
                onClose={onClose}
                label={view === 'journal' ? '我们的日记' : '照片墙'}
                closeLabel="收起回忆"
                header={header}
                className="memory-panel memory-page"
            >
                <div className="mem-views">
                    <div
                        key={journalStyle}
                        className="mem-view"
                        role="tabpanel"
                        id="mem-journal"
                        aria-labelledby="mem-tab-journal"
                        data-view={journalStyle}
                        hidden={view !== 'journal'}
                    >
                        {(journalBody[journalStyle] ?? journalBody.scrapbook)()}
                    </div>
                    <div
                        key={photoStyle}
                        className="mem-view"
                        role="tabpanel"
                        id="mem-photos"
                        aria-labelledby="mem-tab-photos"
                        data-view={photoStyle}
                        hidden={view !== 'photos'}
                    >
                        {(photoBody[photoStyle] ?? photoBody.polaroid)()}
                    </div>
                </div>
            </ContentPage>
            <MemoryLightbox
                request={lightbox}
                feed={feed}
                onClose={() => setLightbox(null)}
                onJournal={
                    journalStyle !== 'book'
                        ? (postId) => {
                              pick('journal');
                              setFocus({ postId });
                          }
                        : undefined
                }
            />
        </>
    );
}

// How a tab is drawn: a small segmented switch in the page header, remembered between visits.
function ViewSwitch<K extends string>({
    label,
    options,
    value,
    onChange
}: {
    label: string;
    options: { key: K; label: string; hint: string }[];
    value: K;
    onChange: (key: K) => void;
}) {
    const at = Math.max(
        0,
        options.findIndex((o) => o.key === value)
    );
    return (
        <div
            className="mem-switch"
            role="radiogroup"
            aria-label={label}
            style={{ '--n': options.length, '--at': at } as CSSProperties}
            onKeyDown={(event) => {
                const step =
                    event.key === 'ArrowRight' || event.key === 'ArrowDown'
                        ? 1
                        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                          ? -1
                          : 0;
                if (!step) return;
                event.preventDefault();
                const next = options[(at + step + options.length) % options.length];
                onChange(next.key);
                event.currentTarget.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus();
            }}
        >
            <span className="mem-switch-ink" aria-hidden="true" />
            {options.map((option) => (
                <button
                    type="button"
                    key={option.key}
                    role="radio"
                    data-key={option.key}
                    aria-checked={option.key === value}
                    tabIndex={option.key === value ? 0 : -1}
                    title={option.hint}
                    onClick={() => onChange(option.key)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
