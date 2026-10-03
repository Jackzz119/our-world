// A song's cover: the signed image, or its tint with a note while there is none (yet).
// Feature doc: ai/features/music/music.md §歌词与海报.
import { IMusic } from '@/themes/cinnaglass/icons';
import type { MusicItem } from '@/themes/cinnaglass/music/music-model';

// `small` picks the row-size image (falls back to the large one).
export function Cover({ item, className, small = false }: { item: MusicItem; className: string; small?: boolean }) {
    const src = small ? item.thumb : item.poster;
    return src ? (
        <img className={className} src={src} alt="" draggable={false} style={{ background: item.tint }} />
    ) : (
        <span className={`${className} mp-cover-blank`} style={{ background: item.tint }} aria-hidden="true">
            <IMusic size={small ? 18 : 30} />
        </span>
    );
}
