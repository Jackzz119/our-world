// use-signed-thumbs.ts — keeps a feed's thumbnail URLs signed. The private
// bucket hands out short-lived URLs, so this hook re-signs on a timer and on
// tab focus. Moved out of screens.tsx verbatim.
import { useEffect, useState } from 'react';
import { SIGNED_URL_REFRESH_MS, signImageUrls, thumbPathOf } from '@/lib/storage';
import type { FeedPost } from '@/types/feed';

// Sign the thumbnails for a set of feed posts, shared by the timeline and
// photo wall (private bucket → short-lived signed URLs). Signed URLs expire
// (storage.ts SIGNED_URL_TTL), so an idle page would silently lose its images —
// re-sign on an interval safely inside the TTL, and again when the tab regains
// visibility (a backgrounded tab may have throttled timers).
// Only this list re-signs. PostDetail and the lightbox sign originals once —
// they never live long enough to outlast the TTL.
export function useSignedThumbs(posts: FeedPost[]): Record<string, string> {
    const [urls, setUrls] = useState<Record<string, string>>({});
    useEffect(() => {
        let cancelled = false;
        const sign = () => {
            // signImageUrls([]) resolves to {} — covers the no-image case too.
            const thumbs = posts.flatMap((p) => (p.visible_images ?? []).map(thumbPathOf));
            signImageUrls(thumbs)
                .then((m) => {
                    if (!cancelled) setUrls(m);
                })
                .catch(() => {
                    /* keep the previous (possibly stale) URLs on failure */
                });
        };
        sign();
        const timer = window.setInterval(sign, SIGNED_URL_REFRESH_MS);
        const onVisible = () => {
            if (document.visibilityState === 'visible') sign();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [posts]);
    return urls;
}
