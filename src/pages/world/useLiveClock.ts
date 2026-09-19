// useLiveClock.ts — the wall clock the shell reads from. Split out of
// WorldPage (ai/project-audit/runs/2026-09-19-01/evidence/shell-structure-review.md
// §2.2 S2); WorldPage stays its only consumer and forwards the value to the
// clock surface.
import { useEffect, useState } from 'react';

// Milliseconds since the epoch, refreshed every `intervalMs`. The interval is
// restarted only if the caller changes it, so the default case ticks once a
// second for the component's whole life.
export function useLiveClock(intervalMs = 1000): number {
    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return nowTs;
}
