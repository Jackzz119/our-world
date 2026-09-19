// date-format.ts — the diary's date strings. fmtDay is the short label used on
// captions and dividers, fmtFullDate the absolute stamp for the detail view.
// Moved out of screens.tsx verbatim (only the `export` keywords are new).

// Day label for dividers and captions (time-of-day lives in fmtMeta).
export const fmtDay = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return '今天';
    const yst = new Date(now);
    yst.setDate(now.getDate() - 1);
    if (d.toDateString() === yst.toDateString()) return '昨天';
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
};
// Wall-clock time, 24h. Paired with fmtDay wherever a full stamp is needed.
const fmtMeta = (iso: string): string => {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};
// Absolute stamp for the detail view, where a relative "今天" would be ambiguous.
export const fmtFullDate = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${fmtMeta(iso)}`;
};
