// memory-surface.tsx — the memory panel: our journal and the photo wall under two
// title tabs (concepts G1 + H1 in ai/design_system/codex-visual/memories/). On a
// desktop it docks in the right-hand column like the music player; on a phone it
// rises as a sheet over the viewer's side of the table. Either way TA stays in
// view while you read. Both views stay mounted while the panel is closed, so the
// scroll, a draft and the photo list survive (ai/features/timeline.md §七.2).
// The lightbox is a sibling of the panel, so its Escape never reaches the sheet.
import { useRef, useState } from 'react';
import type { UseFeed } from '@/hooks/useFeed';
import { ICalendar, IClose } from '@/themes/cinnaglass/icons';
import { fmtDay } from '@/themes/cinnaglass/surfaces/date-format';
import { JournalStream } from '@/themes/cinnaglass/surfaces/journal-stream';
import { MemoryLightbox, type LightboxRequest } from '@/themes/cinnaglass/surfaces/memory-lightbox';
import { wallPhotos, type MemoryPhoto } from '@/themes/cinnaglass/surfaces/memory-photos';
import { PhotoWall } from '@/themes/cinnaglass/surfaces/photo-wall';
import { Sheet, type SheetDetent } from '@/themes/cinnaglass/ui/sheet';
import { usePanelFocus } from '@/themes/cinnaglass/ui/use-panel-focus';
import { usePresence } from '@/themes/cinnaglass/ui/use-presence';
import { useCompactUi } from '@/themes/cinnaglass/ui/use-ui-environment';
import '@/themes/cinnaglass/surfaces/memory.css';

export type MemoryView = 'journal' | 'photos';

const TABS: { key: MemoryView; label: string }[] = [
    { key: 'journal', label: '日记' },
    { key: 'photos', label: '照片墙' }
];
// Matches .memory-dock[data-state='closing'] in memory.css.
const DOCK_EXIT_MS = 220;

type MemorySurfaceProps = {
    /** which view the opener asked for (the book → journal, the polaroid → photos); null = closed */
    requested: MemoryView | null;
    onClose: () => void;
    feed: UseFeed;
    thumbUrls: Record<string, string>;
    /** false in book mode: the journal is the chestnut book, the panel keeps the photos */
    journal: boolean;
};

export function MemorySurface({ requested, onClose, feed, thumbUrls, journal }: MemorySurfaceProps) {
    const compact = useCompactUi();
    const open = requested !== null;
    const [view, setView] = useState<MemoryView>(requested ?? 'journal');
    const [detent, setDetent] = useState<SheetDetent>('half');
    const [indexOpen, setIndexOpen] = useState(false);
    const [asked, setAsked] = useState(requested);
    // each opening shows what the opener asked for, at half height on a phone, calendar folded
    if (requested !== asked) {
        setAsked(requested);
        if (requested) {
            setView(requested);
            setDetent('half');
            setIndexOpen(false);
        }
    }
    const [lightbox, setLightbox] = useState<LightboxRequest | null>(null);
    const [focus, setFocus] = useState<{ postId: string } | null>(null);
    const shown: MemoryView = journal ? view : 'photos';
    const photos = wallPhotos(feed.posts, thumbUrls);

    const newest = feed.posts.at(-1);
    const sub =
        shown === 'journal'
            ? newest
                ? `一起写下的 ${feed.posts.length}${feed.hasMore ? '+' : ''} 页 · 最近一页 ${fmtDay(newest.created_at)}`
                : '一起写下的日子'
            : `来自日记的 ${photos.length} 个瞬间`;
    const label = shown === 'journal' ? '我们的日记' : '照片墙';

    const pick = (next: MemoryView) => {
        setView(next);
        setIndexOpen(false);
    };
    const body = (
        <>
            <header className="mem-head" data-sheet-grab>
                {journal ? (
                    <div
                        className="mem-tabs"
                        role="tablist"
                        aria-label="回忆"
                        style={{ '--at': shown === 'journal' ? 0 : 1 } as React.CSSProperties}
                        onKeyDown={(event) => {
                            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                            event.preventDefault();
                            const next = shown === 'journal' ? 'photos' : 'journal';
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
                                aria-selected={shown === tab.key}
                                aria-controls={`mem-${tab.key}`}
                                tabIndex={shown === tab.key ? 0 : -1}
                                onClick={() => pick(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <span className="mem-tab-ink" aria-hidden="true" />
                    </div>
                ) : (
                    <h2 className="mem-title">照片墙</h2>
                )}
                {shown === 'journal' && (
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
                <button
                    type="button"
                    className="ui-icon-button mem-close"
                    aria-label={`收起${label}`}
                    onClick={onClose}
                >
                    <IClose size={18} />
                </button>
                <p className="mem-sub">{sub}</p>
            </header>
            <div className="mem-views">
                {journal && (
                    <JournalStream
                        feed={feed}
                        thumbUrls={thumbUrls}
                        hidden={shown !== 'journal'}
                        open={open}
                        onPhoto={(list: MemoryPhoto[], index: number) =>
                            setLightbox({ photos: list, index, source: 'journal' })
                        }
                        focus={focus}
                        onWrite={() => {
                            if (compact) setDetent('full');
                        }}
                        indexOpen={indexOpen && shown === 'journal'}
                        onIndexOpen={setIndexOpen}
                    />
                )}
                <PhotoWall
                    photos={photos}
                    status={feed.status}
                    anyImages={feed.posts.some((p) => (p.visible_images ?? []).length > 0)}
                    hidden={shown !== 'photos'}
                    onPhoto={(index) => setLightbox({ photos, index, source: 'photos' })}
                />
            </div>
        </>
    );

    return (
        <>
            {compact ? (
                <Sheet
                    open={open}
                    onClose={onClose}
                    label={label}
                    expandable
                    detent={detent}
                    onDetentChange={setDetent}
                    keepMounted
                    className="memory-panel memory-sheet"
                >
                    {body}
                </Sheet>
            ) : (
                <MemoryDock open={open} label={label} onClose={onClose}>
                    {body}
                </MemoryDock>
            )}
            <MemoryLightbox
                request={lightbox}
                feed={feed}
                onClose={() => setLightbox(null)}
                onJournal={
                    journal
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

// The desktop dock: the right-hand column, non-modal, the scene stays live beside it.
function MemoryDock({
    open,
    label,
    onClose,
    children
}: {
    open: boolean;
    label: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const { mounted, closing } = usePresence(open, DOCK_EXIT_MS);
    const ref = useRef<HTMLElement>(null);
    usePanelFocus(open, ref);
    return (
        <section
            ref={ref}
            className="memory-panel memory-dock ui-surface"
            role="dialog"
            aria-modal="false"
            aria-label={label}
            tabIndex={-1}
            hidden={!mounted}
            inert={!mounted}
            data-state={!mounted ? 'closed' : closing ? 'closing' : 'open'}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && !(event.target as Element).closest('[data-esc-own]')) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            {children}
        </section>
    );
}
