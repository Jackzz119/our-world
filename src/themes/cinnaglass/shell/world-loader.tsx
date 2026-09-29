// The way into the room (concept D1 + D2 + D5 in ai/design_system/codex-visual/ui-motion/).
// While the study loads, the empty table from the lobby lights up with the real
// share loaded — the unlit plate under the lit one, the lamp coming on as the
// bar fills — and a glass card shows a steaming cup, the percentage and a small
// rotating line. When the room is ready the card sinks, the vignette opens and
// the scene settles in behind it. Low motion keeps the fades and the bar only.
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { RoomMood } from '@/themes/cinnaglass/room/room-types';
import { STUDY_TABLE } from '@/themes/cinnaglass/room/study-table';
import type { LoadProgress } from '@/themes/cinnaglass/shell/load-progress';
import { usePresence } from '@/themes/cinnaglass/ui/use-presence';
import '@/themes/cinnaglass/shell/world-loader.css';

// Matches the reveal in world-loader.css (vignette + fade).
const LEAVE_MS = 760;
// How often the small line under the bar changes.
const TIP_MS = 2200;

type WorldLoaderProps = {
    /** true until the room reports ready (or failed) */
    active: boolean;
    progress: LoadProgress;
    mood: RoomMood;
    rainy: boolean;
    partnerName: string;
};

export function WorldLoader({ active, progress, mood, rainy, partnerName }: WorldLoaderProps) {
    const { mounted, closing } = usePresence(active, LEAVE_MS);
    const share = useSyncExternalStore(progress.subscribe, progress.get);
    const [tip, setTip] = useState(0);
    useEffect(() => {
        if (!active) return;
        const id = window.setInterval(() => setTip((n) => n + 1), TIP_MS);
        return () => window.clearInterval(id);
    }, [active]);
    if (!mounted) return null;

    const plates = STUDY_TABLE.plates[mood] ?? STUDY_TABLE.plates.twilight!;
    const pair = rainy && plates.rain ? plates.rain : plates;
    const tips = [
        '把台灯拧亮…',
        '给杯子续上热水…',
        `${partnerName || 'TA'} 正在找座位…`,
        rainy ? '把窗外的雨声调到刚刚好…' : '窗外的灯一盏盏亮起来…',
        '把书翻到昨天那一页…'
    ];
    const shown = closing ? 1 : share;
    const percent = Math.round(shown * 100);
    return (
        <div
            className="world-loader"
            data-state={closing ? 'leaving' : 'loading'}
            style={{ '--p': shown } as CSSProperties}
            aria-busy={!closing}
        >
            <div
                className="wl-plate"
                data-dim={!pair.off || undefined}
                style={{ backgroundImage: `url(${pair.off ?? pair.on})` }}
            />
            <div className="wl-plate wl-lit" style={{ backgroundImage: `url(${pair.on})` }} />
            <div className="wl-vignette" />
            <section className="wl-card ui-surface" aria-label="正在进入书房">
                <svg className="wl-cup" viewBox="0 0 72 72" aria-hidden="true">
                    <path className="wl-steam" d="M26 27c-3-4 3-6 0-10" />
                    <path className="wl-steam" d="M34 25c-3-4 3-6 0-10" />
                    <path className="wl-steam" d="M42 27c-3-4 3-6 0-10" />
                    <path d="M16 34h34v10a15 15 0 0 1-15 15h-4a15 15 0 0 1-15-15z" />
                    <path d="M50 38h4a6 6 0 0 1 0 12h-5" />
                    <path d="M13 63h44" />
                </svg>
                {/* only this line is announced; the rotating tip below is decoration */}
                <h2 role="status">{closing ? '到了' : '正在进入书房'}</h2>
                <div
                    className="wl-bar"
                    role="progressbar"
                    aria-label="书房加载进度"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                >
                    <b />
                </div>
                <div className="wl-foot">
                    <span key={tip} className="wl-tip" aria-hidden="true">
                        {closing ? `${partnerName || 'TA'} 就在对面` : tips[tip % tips.length]}
                    </span>
                    <span className="wl-pct">{percent}%</span>
                </div>
            </section>
        </div>
    );
}
