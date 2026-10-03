// lyrics.ts — lyrics in the shapes people have them (plain text, line-timed LRC, word-timed "enhanced"
// LRC, bilingual LRC with a translation under each line) parsed into one structure for the player and
// the lyrics editor, plus the lookup the player runs every frame, the shift the offset editor applies and
// the writer it saves with. Times are milliseconds from the start of the track.
// Feature doc: ai/features/music/music.md (歌词与海报).

export type LyricWord = { start: number; end: number | null; text: string };
export type LyricLine = {
    start: number | null;
    end: number | null;
    text: string;
    words?: LyricWord[];
    translation?: string;
};
export type LyricDoc = {
    synced: boolean;
    wordSynced: boolean;
    /** LRC [offset:]; a positive value shows every line that many milliseconds earlier */
    offset: number;
    lines: LyricLine[];
    meta: Record<string, string>;
};
export type LyricFormat = 'plain' | 'lrc' | 'lrc_word';

// The LRC ID tags kept in meta, in the order serializeLrc writes them.
const META_KEYS = ['ti', 'ar', 'al', 'au', 'lr', 'by', 'length', 're', 've', 'la', 'tool', '#', 'offset'];

// The body of a time tag: mm:ss, mm:ss.x, mm:ss.xx, mm:ss.xxx or mm:ss:xx; minutes may run past 99.
const TIME_BODY = '\\d+:[0-5]?\\d(?:[.:]\\d{1,3})?';
const TIME_TAG = new RegExp(`^(\\d+):([0-5]?\\d)(?:[.:](\\d{1,3}))?$`);
// Word timings inside a line: <mm:ss.xx> anywhere, or [mm:ss.xx] once the text has started.
const INLINE_TAGS = new RegExp(`<(${TIME_BODY})>|\\[(${TIME_BODY})\\]`, 'g');
const HAS_INLINE_TAG = new RegExp(`<${TIME_BODY}>|\\[${TIME_BODY}\\]`);
// A line that opens with a word timing and has no [time] tag of its own.
const LEADING_WORD_TAG = new RegExp(`^<(${TIME_BODY})>`);
// ID tags written one after another on a line, and a single ID tag whose value contains brackets.
const ID_TAGS = /\[([A-Za-z#]+):([^\]]*)\]/g;
const ID_LINE = /^\[([A-Za-z#]+):(.*)\]$/;

// Split raw lyrics into lines, dropping a byte order mark and accepting CRLF or CR line ends.
const splitRows = (raw: string): string[] => raw.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);

// A time tag body such as 01:02.50 in milliseconds, or null when it is not a time.
const parseTime = (body: string): number | null => {
    const match = TIME_TAG.exec(body.trim());
    if (!match) return null;
    const fraction = match[3] ?? '';
    const ms = fraction ? Number(fraction) * 10 ** (3 - fraction.length) : 0;
    return (Number(match[1]) * 60 + Number(match[2])) * 1000 + ms;
};

// A time in LRC form, mm:ss.xx, or mm:ss.xxx when the milliseconds need it (so writing loses nothing).
const formatTime = (ms: number): string => {
    const total = Math.max(0, Math.round(ms));
    const minutes = String(Math.floor(total / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((total % 60000) / 1000)).padStart(2, '0');
    const millis = total % 1000;
    const fraction = millis % 10 === 0 ? String(millis / 10).padStart(2, '0') : String(millis).padStart(3, '0');
    return `${minutes}:${seconds}.${fraction}`;
};

// The key/value pairs of a line made only of known ID tags ([ti:…][ar:…]), or null for any other line.
const idTags = (row: string): [string, string][] | null => {
    const text = row.trim();
    if (!text.startsWith('[') || !text.endsWith(']')) return null;
    let pairs: [string, string][] = [];
    let covered = 0;
    for (const match of text.matchAll(ID_TAGS)) {
        if (match.index !== covered) break;
        pairs.push([match[1].toLowerCase(), match[2].trim()]);
        covered += match[0].length;
    }
    if (covered !== text.length) {
        const single = ID_LINE.exec(text);
        if (!single) return null;
        pairs = [[single[1].toLowerCase(), single[2].trim()]];
    }
    return pairs.every(([key]) => META_KEYS.includes(key)) ? pairs : null;
};

// The [time] tags a line opens with, and the rest of the line (which may hold word timings).
const leadingTimes = (row: string): { times: number[]; rest: string } => {
    const times: number[] = [];
    let rest = row.trimStart();
    while (rest.startsWith('[')) {
        const close = rest.indexOf(']');
        const time = close > 0 ? parseTime(rest.slice(1, close)) : null;
        if (time === null) break;
        times.push(time);
        rest = rest.slice(close + 1).trimStart();
    }
    return { times, rest };
};

// The start times of a lyric row: its [time] tags, or the word tag it opens with; empty when untimed.
const rowTimes = (row: string): { times: number[]; rest: string } => {
    const { times, rest } = leadingTimes(row);
    if (times.length) return { times, rest };
    const word = LEADING_WORD_TAG.exec(rest);
    const time = word ? parseTime(word[1]) : null;
    return { times: time === null ? [] : [time], rest };
};

// Split the text after the line tags into timed words. Text before the first tag starts at the line's
// start; a tag followed by nothing (or only spaces) ends the word before it. Returns words: null when
// the text has no word timings.
const parseWords = (rest: string, lineStart: number): { text: string; words: LyricWord[] | null } => {
    const tags = [...rest.matchAll(INLINE_TAGS)];
    if (!tags.length) return { text: rest.trim(), words: null };
    const words: LyricWord[] = [];
    const lead = rest.slice(0, tags[0].index);
    if (lead.trim()) words.push({ start: lineStart, end: null, text: lead });
    tags.forEach((tag, i) => {
        const time = parseTime(tag[1] ?? tag[2]) as number;
        const segment = rest.slice(tag.index + tag[0].length, tags[i + 1]?.index ?? rest.length);
        const previous = words[words.length - 1];
        if (previous && previous.end === null) previous.end = time;
        if (segment.trim()) words.push({ start: time, end: null, text: segment });
        else if (previous) previous.text += segment;
    });
    if (!words.length) return { text: '', words: null };
    words[0].text = words[0].text.trimStart();
    words[words.length - 1].text = words[words.length - 1].text.trimEnd();
    return { text: words.map((word) => word.text).join(''), words };
};

// Store ID tags in meta (later tags of the same key win).
const addMeta = (meta: Record<string, string>, pairs: [string, string][]): void => {
    for (const [key, value] of pairs) meta[key] = value;
};

// The [offset:] value in milliseconds, 0 when absent or unreadable.
const parseOffset = (value: string | undefined): number => {
    const offset = Number.parseInt((value ?? '').replace(/\s+/g, ''), 10);
    return Number.isFinite(offset) ? offset : 0;
};

// Classify rows: LRC when at least two lyric rows carry time tags, or one does in a text of one or two
// lyric rows (ID tag rows do not count); word-timed when any timed row has word tags.
const formatOf = (rows: string[]): LyricFormat => {
    let content = 0;
    let timed = 0;
    let worded = false;
    for (const row of rows) {
        if (!row.trim() || idTags(row)) continue;
        content += 1;
        const { times, rest } = rowTimes(row);
        if (!times.length) continue;
        timed += 1;
        if (HAS_INLINE_TAG.test(rest)) worded = true;
    }
    if (timed >= 2 || (timed === 1 && content <= 2)) return worded ? 'lrc_word' : 'lrc';
    return 'plain';
};

// Fold lines that share a timestamp (input sorted by start, file order kept): the first line with text
// is the main line, the next one becomes its translation, any further ones are dropped.
const mergeSameTime = (sorted: LyricLine[]): LyricLine[] => {
    const lines: LyricLine[] = [];
    for (const line of sorted) {
        const previous = lines[lines.length - 1];
        if (!previous || previous.start !== line.start) lines.push(line);
        else if (!line.text) continue;
        else if (!previous.text) lines[lines.length - 1] = line;
        else if (previous.translation === undefined) previous.translation = line.text;
    }
    return lines;
};

// Parse LRC rows: one line per time tag (word times move with each copy), untimed rows dropped, sorted,
// same-time lines folded into translations, then each line ends where the next begins and an open last
// word ends with its line.
const parseLrc = (rows: string[]): LyricDoc => {
    const meta: Record<string, string> = {};
    const entries: LyricLine[] = [];
    for (const row of rows) {
        const tags = idTags(row);
        if (tags) {
            addMeta(meta, tags);
            continue;
        }
        const { times, rest } = rowTimes(row);
        if (!times.length) continue;
        const { text, words } = parseWords(rest, times[0]);
        for (const start of times) {
            const line: LyricLine = { start, end: null, text };
            const shift = start - times[0];
            if (words) {
                line.words = words.map((word) => ({
                    start: word.start + shift,
                    end: word.end === null ? null : word.end + shift,
                    text: word.text
                }));
            }
            entries.push(line);
        }
    }
    entries.sort((a, b) => (a.start as number) - (b.start as number));
    const lines = mergeSameTime(entries);
    lines.forEach((line, i) => {
        line.end = lines[i + 1]?.start ?? null;
        const last = line.words?.[line.words.length - 1];
        if (last && last.end === null) last.end = line.end;
    });
    return {
        synced: true,
        wordSynced: lines.some((line) => line.words !== undefined),
        offset: parseOffset(meta.offset),
        lines,
        meta
    };
};

// Parse plain text: every non-empty row is an untimed line; blank rows between lines are kept, a run of
// three or more collapses to one, and blank rows at either end are dropped. ID tag rows go to meta and
// stray leading time tags are removed.
const parsePlain = (rows: string[]): LyricDoc => {
    const meta: Record<string, string> = {};
    const lines: LyricLine[] = [];
    let blanks = 0;
    for (const row of rows) {
        const tags = idTags(row);
        if (tags) {
            addMeta(meta, tags);
            continue;
        }
        const text = leadingTimes(row).rest.trim();
        if (!text) {
            blanks += 1;
            continue;
        }
        if (lines.length) {
            for (let i = 0; i < (blanks >= 3 ? 1 : blanks); i++) lines.push({ start: null, end: null, text: '' });
        }
        blanks = 0;
        lines.push({ start: null, end: null, text });
    }
    return { synced: false, wordSynced: false, offset: parseOffset(meta.offset), lines, meta };
};

// Tell plain text, line-timed LRC and word-timed LRC apart (see formatOf for the rule).
export const detectLyricsFormat = (raw: string): LyricFormat => formatOf(splitRows(raw));

// Parse lyrics of any supported shape into a LyricDoc; plain text gives unsynced lines (start null).
export const parseLyrics = (raw: string): LyricDoc => {
    const rows = splitRows(raw);
    return formatOf(rows) === 'plain' ? parsePlain(rows) : parseLrc(rows);
};

// Index of the line being sung at positionMs, -1 before the first line or for unsynced lyrics. The
// lookup time is positionMs + doc.offset + extraOffsetMs, so a positive offset brings lines earlier.
export const lyricLineAt = (doc: LyricDoc, positionMs: number, extraOffsetMs = 0): number => {
    if (!doc.synced) return -1;
    const time = positionMs + doc.offset + extraOffsetMs;
    let low = 0;
    let high = doc.lines.length - 1;
    let found = -1;
    while (low <= high) {
        const middle = (low + high) >> 1;
        if ((doc.lines[middle].start ?? 0) <= time) {
            found = middle;
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return found;
};

// A copy of the lyrics with every line and word time moved by deltaMs (clamped at 0); the offset tag and
// the input are left as they are. Unsynced lyrics come back as an unchanged copy.
export const shiftLyrics = (doc: LyricDoc, deltaMs: number): LyricDoc => {
    // A time moved by deltaMs, never before the start of the track.
    const move = (time: number): number => Math.max(0, time + deltaMs);
    return {
        ...doc,
        meta: { ...doc.meta },
        lines: doc.lines.map((line) => {
            const copy: LyricLine = {
                ...line,
                start: line.start === null ? null : move(line.start),
                end: line.end === null ? null : move(line.end)
            };
            if (line.words) {
                copy.words = line.words.map((word) => ({
                    start: move(word.start),
                    end: word.end === null ? null : move(word.end),
                    text: word.text
                }));
            }
            return copy;
        })
    };
};

// Where an ID tag goes when written: known tags in META_KEYS order, any others after them.
const metaRank = (key: string): number => (META_KEYS.includes(key) ? META_KEYS.indexOf(key) : META_KEYS.length);

// A line's words as enhanced LRC: <start>word for each, plus <end> when a word ends before the next one
// starts and after the last word.
const wordsToLrc = (words: LyricWord[]): string =>
    words
        .map((word, i) => {
            const next = words[i + 1];
            const end = word.end !== null && (!next || next.start !== word.end) ? `<${formatTime(word.end)}>` : '';
            return `<${formatTime(word.start)}>${word.text}${end}`;
        })
        .join('');

// Write lyrics back as LRC text: ID tags first, [offset:] when there is one, then one row per
// line ([mm:ss.xx]text, word timings as enhanced LRC) followed by a same-time row for its translation.
// Unsynced lyrics are written as plain rows. parseLyrics(serializeLrc(doc)) gives the same doc back.
export const serializeLrc = (doc: LyricDoc): string => {
    const rows: string[] = [];
    const keys = Object.keys(doc.meta).filter((key) => key !== 'offset');
    keys.sort((a, b) => metaRank(a) - metaRank(b));
    for (const key of keys) rows.push(`[${key}:${doc.meta[key]}]`);
    const keepOffset = doc.meta.offset !== undefined && parseOffset(doc.meta.offset) === doc.offset;
    if (keepOffset) rows.push(`[offset:${doc.meta.offset}]`);
    else if (doc.offset) rows.push(`[offset:${doc.offset > 0 ? `+${doc.offset}` : doc.offset}]`);
    for (const line of doc.lines) {
        if (!doc.synced || line.start === null) {
            rows.push(line.text);
            continue;
        }
        const stamp = `[${formatTime(line.start)}]`;
        rows.push(stamp + (line.words ? wordsToLrc(line.words) : line.text));
        if (line.translation !== undefined) rows.push(stamp + line.translation);
    }
    return `${rows.join('\n')}\n`;
};
