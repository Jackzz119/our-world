// object-surfaces.tsx — the room-object surfaces: the memory page (journal + photo wall,
// memory-surface.tsx — the chestnut book the journal used to be is one of its views now) and the
// wishlist. Everything stays mounted so scroll, lightbox and composer drafts survive closing one
// object and opening another.
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import '@/themes/cinnaglass/surfaces/collection-surfaces.css';
import { useFeed, type UseFeed } from '@/hooks/useFeed';
import type { JournalStyle, PhotoStyle } from '@/themes/cinnaglass/tweaks';
import { useSignedThumbs } from '@/themes/cinnaglass/surfaces/use-signed-thumbs';
import { MemorySurface, type MemoryView } from '@/themes/cinnaglass/surfaces/memory-surface';
import { Wishlist } from '@/themes/cinnaglass/surfaces/wishlist';
// Last of the stylesheet imports on purpose: the shell's ties against
// diary.css / journal-room.css (loaded by the book view) are decided by load order.
import '@/themes/cinnaglass/surfaces/object-surfaces.css';

// Which room object is open. 'timeline' is the journal.
export type TabKey = 'timeline' | 'photos' | 'wishlist';
// Where the open gesture came from (furniture, rail or keyboard).
export type SurfaceOrigin = { x: number; y: number; source: 'object' | 'rail' | 'keyboard' };

// How the memory page draws its two tabs, and where a change of mind is saved (tweaks.ts).
export type MemoryStyles = {
    journalStyle: JournalStyle;
    photoStyle: PhotoStyle;
    onJournalStyle: (style: JournalStyle) => void;
    onPhotoStyle: (style: PhotoStyle) => void;
    musicPlaying?: boolean;
};

type SurfacesProps = MemoryStyles & {
    screen: TabKey | null;
    origin?: SurfaceOrigin | null;
    onClose: () => void;
};

// Feeds the surfaces. Lazy: the feed fetch fires on the first object open, not at page load.
export function SubScreen(props: SurfacesProps) {
    const feed = useFeed(!!props.screen);
    const thumbUrls = useSignedThumbs(feed.posts);
    return <ObjectSurfaces {...props} feed={feed} thumbUrls={thumbUrls} />;
}

// The surfaces themselves, fed from outside (SubScreen, or a layout fixture's local feed).
export function ObjectSurfaces({
    screen,
    onClose,
    feed,
    thumbUrls,
    journalStyle,
    photoStyle,
    onJournalStyle,
    onPhotoStyle,
    musicPlaying
}: SurfacesProps & { feed: UseFeed; thumbUrls: Record<string, string> }) {
    const memory: MemoryView | null = screen === 'photos' ? 'photos' : screen === 'timeline' ? 'journal' : null;
    return (
        <>
            <MemorySurface
                requested={memory}
                onClose={onClose}
                feed={feed}
                thumbUrls={thumbUrls}
                journalStyle={journalStyle}
                photoStyle={photoStyle}
                onJournalStyle={onJournalStyle}
                onPhotoStyle={onPhotoStyle}
                musicPlaying={musicPlaying}
            />
            <TaskDialog
                open={screen === 'wishlist'}
                onClose={onClose}
                title="心愿单"
                className="collection-task wishlist-task"
                description="心愿仅保存在当前浏览器，不会同步给对方。"
            >
                <Wishlist />
            </TaskDialog>
        </>
    );
}
