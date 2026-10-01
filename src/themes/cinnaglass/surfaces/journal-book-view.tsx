// journal-book-view.tsx — the chestnut book as one of the memory page's journal views
// (memory-views.ts, 书本): the book the journal used to be (journal/room-book.tsx, kept on request
// 2026-09-30), open in the middle of the page — two pages on a desktop, one on a phone — with its own
// paging, index and composer, and the post detail over it. The page around it owns closing.
import { useCallback, useState } from 'react';
import type { FeedPost } from '@/types/feed';
import { toneOf } from '@/themes/cinnaglass/surfaces/author-tone';
import type { JournalViewProps } from '@/themes/cinnaglass/surfaces/memory-views';
import { PostDetail } from '@/themes/cinnaglass/surfaces/post-detail';
import '@/themes/cinnaglass/journal/diary.css';
import { JournalRoomBook } from '@/themes/cinnaglass/journal/room-book';

export function JournalBookView({ feed, thumbUrls, open }: JournalViewProps) {
    const [detail, setDetail] = useState<FeedPost | null>(null);
    const closeDetail = useCallback(() => setDetail(null), []);
    return (
        <div className="mem-book-view">
            <section className="object-surface diary-surface show mem-book" aria-label="棕皮书日记">
                <header className="object-hd">
                    <div>
                        <div className="object-kicker">MEMORY DIARY</div>
                        <h2>我们的日记</h2>
                    </div>
                </header>
                <div className="object-body tl-host">
                    <JournalRoomBook feed={feed} thumbUrls={thumbUrls} active={open} onDetail={setDetail} />
                </div>
            </section>
            {detail && (
                <PostDetail
                    post={detail}
                    profile={feed.profiles[detail.author_id]}
                    mine={detail.author_id === feed.currentUserId}
                    tone={toneOf(detail.author_id, feed.currentUserId, feed.world)}
                    thumbUrls={thumbUrls}
                    onClose={closeDetail}
                />
            )}
        </div>
    );
}

export default JournalBookView;
