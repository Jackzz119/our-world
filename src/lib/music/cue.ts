// cue.ts — CUE sheets for whole-album rips: parse the sheet, then cut the album file into virtual
// tracks by exact sample positions (no re-encoding; playing them back to back is gapless by nature).
// CUE positions are CD frames (1/75 s); every common sample rate is a multiple of 75, so the sample
// math is exact. Text decoding (GBK sheets are common) is the caller's job: decodeText in text.ts.
// Feature doc: ai/features/music/music.md (上传与入库: CUE 解析成按采样点的虚拟分轨).

export type CueTrack = {
    number: number;
    title: string;
    performer: string;
    songwriter: string;
    isrc: string;
    flags: string[];
    /** INDEX 00 (pregap start) in CD frames, when it lies in the same FILE as INDEX 01 */
    index0: number | null;
    /** INDEX 01 (track start) in CD frames */
    index1: number;
    rem: Record<string, string>;
};
export type CueFile = { name: string; type: string; tracks: CueTrack[] };
export type CueSheet = {
    title: string;
    performer: string;
    songwriter: string;
    catalog: string;
    rem: Record<string, string>;
    files: CueFile[];
};
export type CueSlice = {
    number: number;
    title: string;
    performer: string;
    isrc: string;
    startSample: number;
    endSample: number;
    rem: Record<string, string>;
};

// CD frames per second.
const FRAMES_PER_SECOND = 75;

// Strip one pair of surrounding quotes; a quoted value runs to the last quote on the line.
const unquote = (value: string): string => {
    const text = value.trim();
    if (!text.startsWith('"')) return text;
    const close = text.lastIndexOf('"');
    return close > 0 ? text.slice(1, close) : text.slice(1);
};

// Split `"name with spaces.wav" WAVE` (or a bare `name.wav WAVE`) into the file name and its type.
const fileArgs = (args: string): { name: string; type: string } => {
    const text = args.trim();
    const quoted = text.startsWith('"');
    const close = quoted ? text.lastIndexOf('"') : text.lastIndexOf(' ');
    if (close <= 0) return { name: quoted ? text.slice(1) : text, type: '' };
    const type = text
        .slice(close + 1)
        .trim()
        .toUpperCase();
    return { name: quoted ? text.slice(1, close) : text.slice(0, close).trim(), type };
};

// Read an mm:ss:ff position into CD frames; minutes may exceed 99. Throws a user-facing error when the
// position is malformed.
const parseFrames = (value: string, trackNumber: number): number => {
    const match = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec(value.trim());
    if (!match || Number(match[2]) >= 60 || Number(match[3]) >= FRAMES_PER_SECOND) {
        throw new Error(`CUE 文件格式不对：第 ${trackNumber} 轨的时间「${value.trim()}」看不懂`);
    }
    return (Number(match[1]) * 60 + Number(match[2])) * FRAMES_PER_SECOND + Number(match[3]);
};

// Parse a CUE sheet. Commands are case-insensitive; non-AUDIO tracks are skipped but keep their numbers;
// PREGAP/POSTGAP go into the track's rem. A track whose INDEX 01 appears after the next FILE line (the
// "gaps appended" multi-file layout) moves to that file. Throws a user-facing error when a TRACK comes
// before any FILE or an audio track has no INDEX 01.
export const parseCue = (text: string): CueSheet => {
    const sheet: CueSheet = { title: '', performer: '', songwriter: '', catalog: '', rem: {}, files: [] };
    let file: CueFile | null = null;
    let track: CueTrack | null = null;
    let trackFile: CueFile | null = null;
    let index0File: CueFile | null = null;
    let inDataTrack = false;
    for (const raw of text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)) {
        const line = raw.trim();
        const match = /^(\S+)\s*(.*)$/.exec(line);
        if (!match) continue;
        const command = match[1].toUpperCase();
        const args = match[2];
        switch (command) {
            case 'REM': {
                const rem = /^(\S+)\s*(.*)$/.exec(args);
                if (rem && !inDataTrack) (track ? track.rem : sheet.rem)[rem[1].toUpperCase()] = unquote(rem[2]);
                break;
            }
            case 'CATALOG':
                sheet.catalog = unquote(args);
                break;
            case 'TITLE':
            case 'PERFORMER':
            case 'SONGWRITER': {
                if (inDataTrack) break;
                const key = command === 'TITLE' ? 'title' : command === 'PERFORMER' ? 'performer' : 'songwriter';
                (track ?? sheet)[key] = unquote(args);
                break;
            }
            case 'FILE':
                file = { ...fileArgs(args), tracks: [] };
                sheet.files.push(file);
                break;
            case 'TRACK': {
                const head = /^(\d+)\s+(\S+)/.exec(args);
                if (!file) throw new Error('CUE 文件格式不对：TRACK 出现在 FILE 之前');
                if (!head) throw new Error(`CUE 文件格式不对：「${line}」看不懂`);
                inDataTrack = head[2].toUpperCase() !== 'AUDIO';
                track = null;
                if (inDataTrack) break;
                track = {
                    number: Number(head[1]),
                    title: '',
                    performer: '',
                    songwriter: '',
                    isrc: '',
                    flags: [],
                    index0: null,
                    index1: -1,
                    rem: {}
                };
                file.tracks.push(track);
                trackFile = file;
                index0File = null;
                break;
            }
            case 'INDEX': {
                if (!track || !file) break;
                const index = /^(\d+)\s+(\S+)$/.exec(args.trim());
                if (!index) throw new Error(`CUE 文件格式不对：第 ${track.number} 轨的 INDEX 看不懂`);
                const frames = parseFrames(index[2], track.number);
                const number = Number(index[1]);
                if (number === 0) {
                    track.index0 = frames;
                    index0File = file;
                } else if (number === 1) {
                    track.index1 = frames;
                    if (index0File !== file) track.index0 = null;
                    if (trackFile && trackFile !== file) {
                        trackFile.tracks.splice(trackFile.tracks.indexOf(track), 1);
                        file.tracks.push(track);
                        trackFile = file;
                    }
                }
                break;
            }
            case 'PREGAP':
            case 'POSTGAP':
                if (track) track.rem[command] = args.trim();
                break;
            case 'ISRC':
                if (track) track.isrc = unquote(args);
                break;
            case 'FLAGS':
                if (track) track.flags = args.toUpperCase().split(/\s+/).filter(Boolean);
                break;
            default:
                break;
        }
    }
    for (const cueFile of sheet.files) {
        for (const cueTrack of cueFile.tracks) {
            if (cueTrack.index1 < 0) throw new Error(`CUE 文件格式不对：第 ${cueTrack.number} 轨缺少 INDEX 01`);
            if (!cueTrack.performer) cueTrack.performer = sheet.performer;
        }
    }
    return sheet;
};

// CD frames to samples at the given rate: frames × rate / 75, exact for every rate that is a multiple
// of 75 (44.1, 48, 88.2, 96, 176.4, 192 kHz, DSD); other rates round to the nearest sample.
export const framesToSamples = (frames: number, sampleRate: number): number =>
    Math.round((frames * sampleRate) / FRAMES_PER_SECOND);

// The virtual tracks of one CUE FILE: each starts at its INDEX 01 and ends at the next track's INDEX 01
// (so the next track's pregap stays with the previous one, as on the disc), the last at totalSamples.
// Throws a user-facing error when the starts are out of order or past the end of the audio.
export const cueSlices = (file: CueFile, sampleRate: number, totalSamples: number): CueSlice[] => {
    if (!(sampleRate > 0) || !(totalSamples >= 0)) throw new Error('音频的采样率或长度未知，无法按 CUE 分轨');
    // The error for a track whose start lies past the end of the audio.
    const beyondEnd = (number: number) => new Error(`CUE 分轨超出了音频长度：第 ${number} 轨的开始时间在文件结尾之后`);
    return file.tracks.map((track, i) => {
        const next = file.tracks[i + 1];
        const startSample = framesToSamples(track.index1, sampleRate);
        const endSample = next ? framesToSamples(next.index1, sampleRate) : totalSamples;
        if (startSample >= totalSamples) throw beyondEnd(track.number);
        if (next && endSample > totalSamples) throw beyondEnd(next.number);
        if (endSample <= startSample) {
            throw new Error(`CUE 分轨顺序不对：第 ${next ? next.number : track.number} 轨没有排在前一轨之后`);
        }
        return {
            number: track.number,
            title: track.title,
            performer: track.performer,
            isrc: track.isrc,
            startSample,
            endSample,
            rem: { ...track.rem }
        };
    });
};

// The last path segment of a FILE value or a picked file's path ("C:\rips\album.wav" -> "album.wav"),
// normalized to NFC and lower case for comparison.
const comparableName = (path: string): string => (path.split(/[\\/]/).pop() ?? '').normalize('NFC').toLowerCase();

// A file name without its extension.
const stem = (name: string): string => {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
};

// The FILE block of a sheet that describes this audio file: same name ignoring case and folders, or else
// the same name with a different extension (the sheet says album.wav, the disk holds album.flac).
export const matchCueFile = (sheet: CueSheet, audioFileName: string): CueFile | null => {
    const target = comparableName(audioFileName);
    const exact = sheet.files.find((file) => comparableName(file.name) === target);
    if (exact) return exact;
    const targetStem = stem(target);
    return sheet.files.find((file) => stem(comparableName(file.name)) === targetStem) ?? null;
};
