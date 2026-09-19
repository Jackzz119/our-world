// post-detail.tsx — the read-only overlay for one memory: full text, author,
// absolute date and the archival original. Avatar lives here because the
// detail view is its only consumer. Moved out of screens.tsx verbatim.
import { useEffect, useRef, useState } from 'react';
import { signImageUrls, thumbPathOf } from '@/lib/storage';
import type { FeedPost, FeedProfile } from '@/types/feed';
import { IClose } from '@/themes/cinnaglass/icons';
import { fmtFullDate } from '@/themes/cinnaglass/surfaces/date-format';
import { avaGrad, type AuthorTone } from '@/themes/cinnaglass/surfaces/author-tone';

// Circular author avatar: uploaded image, else the first letter of the name,
// else a dot. The ring colour carries identity (see toneOf).
function Avatar({
    authorId,
    profile,
    ring,
    fallback
}: {
    authorId: string;
    profile?: FeedProfile;
    ring: string;
    fallback?: string;
}) {
    const name = profile?.display_name?.trim() || '';
    return (
        <span className="ava" style={{ background: avaGrad(authorId), boxShadow: `0 0 0 1px ${ring}` }}>
            {profile?.avatar_url || fallback ? (
                <img src={profile?.avatar_url || fallback} alt={name} />
            ) : name ? (
                [...name][0].toUpperCase()
            ) : (
                '·'
            )}
        </span>
    );
}

// Read-only detail view for a single post: full text, author, exact date,
// and the archival original (progressive: thumbnail first, signed original
// swaps in). Esc / click-outside closes.
export function PostDetail({
    post,
    profile,
    mine,
    tone,
    thumbUrls,
    onClose
}: {
    post: FeedPost;
    profile?: FeedProfile;
    mine: boolean;
    tone: AuthorTone;
    thumbUrls: Record<string, string>;
    onClose: () => void;
}) {
    // Every image, progressive: the already-signed thumbnail shows instantly,
    // the signed original swaps in per path once ready.
    const [fullUrls, setFullUrls] = useState<Record<string, string>>({});
    const detailCloseRef = useRef<HTMLButtonElement>(null);
    const paths = post.visible_images ?? [];

    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        detailCloseRef.current?.focus();
        return () => previous?.focus();
    }, []);

    useEffect(() => {
        let cancelled = false;
        const p = post.visible_images ?? [];
        if (p.length) {
            signImageUrls(p)
                .then((m) => {
                    if (!cancelled) setFullUrls(m);
                })
                .catch(() => {
                    /* keep showing the thumbnails */
                });
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopImmediatePropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            cancelled = true;
            window.removeEventListener('keydown', onKey);
        };
    }, [post, onClose]);

    return (
        <div className="pd" onClick={onClose}>
            <div
                className="pd-card"
                role="dialog"
                aria-modal="true"
                aria-label="回忆详情"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pd-hd">
                    <Avatar
                        authorId={post.author_id}
                        profile={profile}
                        ring={tone.ring}
                        fallback={mine ? '/avatars/blue.png' : '/avatars/pink.png'}
                    />
                    <div>
                        <div className="pd-name" style={{ color: mine ? 'var(--diary-blue)' : 'var(--diary-pink)' }}>
                            {mine ? '我' : (profile?.display_name ?? 'TA')}
                        </div>
                        <div className="pd-date">{fmtFullDate(post.created_at)}</div>
                    </div>
                    <button
                        ref={detailCloseRef}
                        className="modal-x object-x"
                        onClick={onClose}
                        aria-label="关闭回忆详情"
                    >
                        <IClose size={17} />
                    </button>
                </div>
                {paths.map((path) => {
                    const src = fullUrls[path] ?? thumbUrls[thumbPathOf(path)];
                    return src ? (
                        <div className="pd-img" key={path}>
                            <img src={src} alt="" />
                            {!fullUrls[path] && <div className="pd-load">正在加载原图…</div>}
                        </div>
                    ) : null;
                })}
                <div className="pd-text">{post.visible_content}</div>
            </div>
        </div>
    );
}
