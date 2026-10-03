// ingest-plan.ts — turns the files a user picked (a dropped folder, a folder picker or a multi-select)
// into ingest items: each audio file with its lyrics files, cover image and CUE sheet, plus the files
// left out and why. Pairing goes by folder and name only; reading tags and hashing come later
// (metadata.ts, sha256.ts). Feature doc: ai/features/music/music.md (上传与入库: 同名 .lrc 与 cover 配对).
import { matchCueFile, parseCue, type CueSheet } from '@/lib/music/cue';
import { decodeText } from '@/lib/music/text';

export type PickedFile = { file: File; path: string };
export type IngestItem = {
    key: string;
    audio: PickedFile;
    lyrics: PickedFile[];
    cover: PickedFile | null;
    cue: PickedFile | null;
    folder: string;
};
export type IngestPlan = { items: IngestItem[]; ignored: { file: PickedFile; reason: string }[] };

// Reason given for files from music services that only their own apps can decrypt.
export const ENCRYPTED_REASON = '受版权保护的加密文件，无法导入';
// Reason given for every other file that is not audio and was not paired with an audio file.
export const NOT_AUDIO_REASON = '不是音频';

// Extensions taken as audio.
const AUDIO_EXTENSIONS = new Set([
    'flac',
    'm4a',
    'mp4',
    'alac',
    'aac',
    'mp3',
    'wav',
    'aif',
    'aiff',
    'aifc',
    'ogg',
    'oga',
    'opus',
    'webm',
    'ape',
    'wv',
    'dsf',
    'dff',
    'tta'
]);
// Extensions of the images considered as covers.
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
// Folder image names that mean "the album cover", in order of preference.
const COVER_NAMES = ['cover', 'folder', 'front', 'albumart', 'album'];
// DRM-protected or vendor-encrypted downloads: iTunes .m4p, NetEase .ncm, QQ Music .qmc*/.mflac*/.mgg*,
// Kugou .kgm*/.vpr, Kuwo .kwm.
const ENCRYPTED_EXTENSION = /^(?:m4p|ncm|kwm|vpr|qmc\w*|kgm\w*|mflac\w*|mgg\w*)$/;
// A language suffix between a song's name and .lrc: song.en.lrc, song.zh-Hant.lrc.
const LANGUAGE_SUFFIX = /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})?$/i;
// A per-disc sub-folder of an album (CD1, Disc 2, disk_3), whose cover often sits one folder up.
const DISC_FOLDER = /^(?:cd|disc|disk)[\s_-]*\d+$/i;
// Largest .cue file read (anything bigger is not a cue sheet).
const MAX_CUE_BYTES = 1024 * 1024;

type Entry = {
    picked: PickedFile;
    folder: string;
    name: string;
    /** lower-case NFC name without the extension, for matching */
    base: string;
    ext: string;
};

// Folder, name, comparable base name and lower-case extension of a picked file ('/' separated path).
const describe = (picked: PickedFile): Entry => {
    const path = picked.path.replace(/\\/g, '/').replace(/^\.?\/+/, '');
    const slash = path.lastIndexOf('/');
    const name = path.slice(slash + 1) || picked.file.name;
    const dot = name.lastIndexOf('.');
    return {
        picked,
        folder: slash >= 0 ? path.slice(0, slash) : '',
        name,
        base: (dot > 0 ? name.slice(0, dot) : name).normalize('NFC').toLowerCase(),
        ext: dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
    };
};

// Compares names the way a file browser lists them: case-insensitive, numbers by value.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// Order items by folder, then by path, with numbers compared as numbers ("2 …" before "10 …").
const byFolderThenPath = (a: IngestItem, b: IngestItem): number =>
    collator.compare(a.folder, b.folder) || collator.compare(a.audio.path, b.audio.path);

// The parent of a folder path ('' for a top-level folder).
const parentFolder = (folder: string): string => folder.slice(0, Math.max(0, folder.lastIndexOf('/')));

// The folder's own cover: a named cover image (cover > folder > front > albumart > album), else its only
// image; null when neither exists.
const folderCover = (images: Entry[]): Entry | null => {
    for (const name of COVER_NAMES) {
        const named = images.find((image) => image.base === name);
        if (named) return named;
    }
    return images.length === 1 ? images[0] : null;
};

// The lyrics files of one audio file: base.lrc (else base.txt) first, then base.<lang>.lrc extras, leaving
// out names that belong to another audio file in the folder (song.live.lrc next to song.live.flac).
const lyricsFor = (track: Entry, visible: Entry[], audioBases: Set<string>): Entry[] => {
    const main =
        visible.find((entry) => entry.ext === 'lrc' && entry.base === track.base) ??
        visible.find((entry) => entry.ext === 'txt' && entry.base === track.base);
    const extras = visible.filter(
        (entry) =>
            entry.ext === 'lrc' &&
            entry.base.startsWith(`${track.base}.`) &&
            !audioBases.has(entry.base) &&
            LANGUAGE_SUFFIX.test(entry.base.slice(track.base.length + 1))
    );
    return main ? [main, ...extras] : extras;
};

// Read and parse a picked .cue file; returns the sheet, or the reason it cannot be used.
const readCue = async (entry: Entry): Promise<{ sheet: CueSheet } | { reason: string }> => {
    if (entry.picked.file.size > MAX_CUE_BYTES) return { reason: NOT_AUDIO_REASON };
    try {
        const { text } = decodeText(new Uint8Array(await entry.picked.file.arrayBuffer()));
        return { sheet: parseCue(text) };
    } catch (error) {
        return { reason: error instanceof Error ? error.message : NOT_AUDIO_REASON };
    }
};

// Pair picked files into ingest items. Audio is recognized by extension. Lyrics: the same base name in the
// same folder as .lrc (else .txt), plus base.<lang>.lrc files as extra entries. Cover: an image with the
// same base name, else the folder's named cover or only image, else (for a CD1/Disc 2 folder) the parent
// folder's. CUE: a .cue in the same folder whose FILE line names this audio. Encrypted downloads and
// everything left unpaired are listed as ignored with a reason; a broken .cue carries its parse error.
// Items are sorted by folder then path; key is folder/name:size, and repeated paths count once.
export const planIngest = async (files: PickedFile[]): Promise<IngestPlan> => {
    const seen = new Set<string>();
    const entries: Entry[] = [];
    for (const picked of files) {
        const entry = describe(picked);
        const id = `${entry.folder}/${entry.name}:${picked.file.size}`;
        if (seen.has(id)) continue;
        seen.add(id);
        entries.push(entry);
    }
    const folders = new Map<string, Entry[]>();
    for (const entry of entries) {
        const list = folders.get(entry.folder);
        if (list) list.push(entry);
        else folders.set(entry.folder, [entry]);
    }

    const items: IngestItem[] = [];
    const ignored: IngestPlan['ignored'] = [];
    const used = new Set<Entry>();
    // The visible images of a folder, the cover candidates.
    const imagesIn = (folder: string): Entry[] =>
        (folders.get(folder) ?? []).filter((entry) => IMAGE_EXTENSIONS.has(entry.ext) && !entry.name.startsWith('.'));

    for (const [folder, list] of folders) {
        const visible = list.filter((entry) => !entry.name.startsWith('.'));
        const audio = visible.filter((entry) => AUDIO_EXTENSIONS.has(entry.ext));
        const audioBases = new Set(audio.map((entry) => entry.base));
        const images = imagesIn(folder);
        const ownCover = folderCover(images);
        const leaf = folder.slice(folder.lastIndexOf('/') + 1);
        const parentCover = !ownCover && DISC_FOLDER.test(leaf) ? folderCover(imagesIn(parentFolder(folder))) : null;
        const cues: { entry: Entry; sheet: CueSheet }[] = [];
        for (const entry of visible.filter((item) => item.ext === 'cue')) {
            const parsed = await readCue(entry);
            if ('sheet' in parsed) {
                cues.push({ entry, sheet: parsed.sheet });
            } else {
                ignored.push({ file: entry.picked, reason: parsed.reason });
                used.add(entry);
            }
        }

        for (const track of audio) {
            const lyrics = lyricsFor(track, visible, audioBases);
            const cover = images.find((image) => image.base === track.base) ?? ownCover ?? parentCover;
            const cue =
                cues.find(({ entry, sheet }) => entry.base === track.base && matchCueFile(sheet, track.name)) ??
                cues.find(({ sheet }) => matchCueFile(sheet, track.name));
            for (const entry of [...lyrics, cover, cue?.entry]) if (entry) used.add(entry);
            used.add(track);
            items.push({
                key: `${folder}/${track.name}:${track.picked.file.size}`,
                audio: track.picked,
                lyrics: lyrics.map((entry) => entry.picked),
                cover: cover?.picked ?? null,
                cue: cue?.entry.picked ?? null,
                folder
            });
        }
    }

    for (const entry of entries) {
        if (used.has(entry)) continue;
        const reason = ENCRYPTED_EXTENSION.test(entry.ext) ? ENCRYPTED_REASON : NOT_AUDIO_REASON;
        ignored.push({ file: entry.picked, reason });
    }
    items.sort(byFolderThenPath);
    ignored.sort((a, b) => collator.compare(a.file.path, b.file.path));
    return { items, ignored };
};
