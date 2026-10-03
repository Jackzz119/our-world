// music-parsers.test.ts — checks for the music parsing modules in src/lib/music (lyrics, cue, text,
// sha256, sniff, metadata, ingest-plan) on hand-made cases and on the generated corpus in
// tmp/music-fixtures (scripts/make-music-fixtures.py). Bundled with esbuild and run by
// scripts/check-music-parsers.mjs; plain node:assert, no test framework. Feature doc:
// ai/features/music/music.md.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { cueSlices, framesToSamples, matchCueFile, parseCue, type CueSheet } from '@/lib/music/cue';
import { ENCRYPTED_REASON, NOT_AUDIO_REASON, planIngest, type PickedFile } from '@/lib/music/ingest-plan';
import { detectLyricsFormat, lyricLineAt, parseLyrics, serializeLrc, shiftLyrics } from '@/lib/music/lyrics';
import { readAudioMetadata, type ParsedAudio } from '@/lib/music/metadata';
import { Sha256, sha256Blob } from '@/lib/music/sha256';
import { browserFamily, canBrowserPlay, readAudioHeader, sniffAudio, type BrowserFamily } from '@/lib/music/sniff';
import { decodeMojibake, decodeText, detectAlbumMojibake, repairMojibake } from '@/lib/music/text';

type Check = { name: string; run: () => void | Promise<void> };
type ManifestEntry = {
    path: string;
    codec: string;
    container: string;
    sample_rate: number;
    channels: number;
    bit_depth: number | null;
    duration_s: number;
    sha256: string;
    lossless: boolean;
    browsers: Record<string, boolean | string>;
    cue_starts_samples?: number[];
    lyric_lines?: number;
};

const checks: Check[] = [];
let fixtures = '';
let manifest: { files: ManifestEntry[] } = { files: [] };

// Register a named check.
const check = (name: string, run: Check['run']): void => {
    checks.push({ name, run });
};

// Absolute path of a corpus file.
const fixture = (relative: string): string => path.join(fixtures, relative);

// A corpus file as a File, the way a browser hands picked files over.
const fileOf = (relative: string): File => new File([readFileSync(fixture(relative))], path.basename(relative));

// Bytes from a hex string.
const hex = (text: string): Uint8Array<ArrayBuffer> =>
    Uint8Array.from(text.match(/../g) ?? [], (pair) => parseInt(pair, 16));

// What a latin1 decoder makes of these bytes (the shape of mojibake in old ID3 tags).
const latin1 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1');

// Bytes of a string encoded as UTF-8.
const utf8 = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);

// SHA-256 with node:crypto, the reference.
const nodeSha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

// The output of a command line tool, or null when it is not installed or fails.
const tool = (command: string, args: string[]): string | null => {
    try {
        return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
        return null;
    }
};

// The STREAMINFO MD5 of a FLAC file according to metaflac (or ffmpeg's PCM hash at the native depth).
const referenceFlacMd5 = (file: string, bitDepth: number): string | null => {
    const fromMetaflac = tool('metaflac', ['--show-md5sum', file])?.trim();
    if (fromMetaflac && /^[0-9a-f]{32}$/.test(fromMetaflac)) return fromMetaflac;
    const codec = bitDepth > 16 ? 'pcm_s24le' : 'pcm_s16le';
    const hash = tool('ffmpeg', [
        '-v',
        'error',
        '-i',
        file,
        '-map',
        '0:a',
        '-c:a',
        codec,
        '-f',
        'hash',
        '-hash',
        'md5',
        '-'
    ]);
    return /MD5=([0-9a-f]{32})/.exec(hash ?? '')?.[1] ?? null;
};

// Every file under a folder, as paths relative to it.
const walk = (folder: string, prefix = ''): string[] =>
    readdirSync(folder).flatMap((name) => {
        const full = path.join(folder, name);
        const relative = prefix ? `${prefix}/${name}` : name;
        return statSync(full).isDirectory() ? walk(full, relative) : [relative];
    });

// A picked file with in-memory content.
const picked = (filePath: string, content: string | Uint8Array<ArrayBuffer> = 'x'): PickedFile => ({
    file: new File([typeof content === 'string' ? utf8(content) : content], filePath.split('/').pop() as string),
    path: filePath
});

// A minimal FLAC file: STREAMINFO (44.1 kHz, stereo, 16 bit) and a VORBIS_COMMENT block, no audio frames.
const flacWithTags = (tags: [string, string][], totalSamples = 44100): File => {
    const vendor = utf8('check');
    const comments = tags.map(([key, value]) => utf8(`${key}=${value}`));
    const commentBytes = 8 + vendor.length + comments.reduce((sum, comment) => sum + 4 + comment.length, 0);
    const bytes = new Uint8Array(8 + 34 + 4 + commentBytes);
    const view = new DataView(bytes.buffer);
    bytes.set([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 34]);
    bytes.set([0x10, 0x00, 0x10, 0x00, 0, 0, 0, 0, 0, 0, 0x0a, 0xc4, 0x42, 0xf0], 8);
    view.setUint32(8 + 14, totalSamples);
    let pos = 42;
    bytes.set([0x84, (commentBytes >> 16) & 0xff, (commentBytes >> 8) & 0xff, commentBytes & 0xff], pos);
    pos += 4;
    view.setUint32(pos, vendor.length, true);
    bytes.set(vendor, pos + 4);
    pos += 4 + vendor.length;
    view.setUint32(pos, comments.length, true);
    pos += 4;
    for (const comment of comments) {
        view.setUint32(pos, comment.length, true);
        bytes.set(comment, pos + 4);
        pos += 4 + comment.length;
    }
    return new File([bytes], 'tags.flac');
};

// One ID3v2.3 frame.
const id3Frame = (id: string, payload: number[]): Uint8Array => {
    const frame = new Uint8Array(10 + payload.length);
    frame.set(utf8(id));
    new DataView(frame.buffer).setUint32(4, payload.length);
    frame.set(payload, 10);
    return frame;
};

// Latin1 bytes of a string whose characters are all at most U+00FF.
const latinBytes = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));

// The corpus MP3's audio frames behind a new ID3v2.3 tag made of the given frames.
const mp3WithFrames = (frames: Uint8Array[]): File => {
    const original = readFileSync(fixture('formats/07-mp3-320-gbk-tags.mp3'));
    const oldSize = 10 + ((original[6] << 21) | (original[7] << 14) | (original[8] << 7) | original[9]);
    const body = frames.reduce((sum, frame) => sum + frame.length, 0);
    const tag = new Uint8Array(10 + body);
    tag.set([0x49, 0x44, 0x33, 3, 0, 0, (body >> 21) & 0x7f, (body >> 14) & 0x7f, (body >> 7) & 0x7f, body & 0x7f]);
    let pos = 10;
    for (const frame of frames) {
        tag.set(frame, pos);
        pos += frame.length;
    }
    return new File([tag, original.subarray(oldSize)], 'tagged.mp3');
};

// The expected sniff container for an ffprobe format name from the manifest.
const SNIFF_CONTAINER: Record<string, string> = {
    flac: 'flac',
    'mov,mp4,m4a,3gp,3g2,mj2': 'mp4',
    mp3: 'mp3',
    wav: 'wav',
    aiff: 'aiff',
    ogg: 'ogg',
    'matroska,webm': 'webm',
    wv: 'wavpack'
};
// The expected sniff codec hint for an ffprobe codec name from the manifest.
const SNIFF_CODEC: Record<string, string> = {
    flac: 'flac',
    alac: 'alac',
    aac: 'mp4a',
    mp3: 'mp3',
    pcm_s24le: 'pcm',
    pcm_f32le: 'float',
    pcm_s16be: 'pcm',
    opus: 'opus',
    vorbis: 'vorbis',
    wavpack: 'wavpack'
};
// The expected ParsedAudio codec for an ffprobe codec name.
const PARSED_CODEC: Record<string, string> = { pcm_s24le: 'pcm', pcm_f32le: 'pcm', pcm_s16be: 'pcm' };

// ---------------------------------------------------------------------------------------------- lyrics

check('lyrics: time tag variants, minutes past 99', () => {
    const doc = parseLyrics(
        ['[00:01]a', '[00:02.5]b', '[00:03.25]c', '[00:04.125]d', '[00:05:50]e', '[123:45.67]f'].join('\n')
    );
    assert.equal(doc.synced, true);
    assert.equal(doc.wordSynced, false);
    assert.deepEqual(
        doc.lines.map((line) => [line.start, line.end, line.text]),
        [
            [1000, 2500, 'a'],
            [2500, 3250, 'b'],
            [3250, 4125, 'c'],
            [4125, 5500, 'd'],
            [5500, 7425670, 'e'],
            [7425670, null, 'f']
        ]
    );
});

check('lyrics: several time tags on a line, sorting, instrumental gaps', () => {
    const doc = parseLyrics('[00:30.00][00:10.00]chorus\n[00:20.00]verse\n[00:40.00]\n[00:45.00]outro');
    assert.deepEqual(
        doc.lines.map((line) => [line.start, line.end, line.text]),
        [
            [10000, 20000, 'chorus'],
            [20000, 30000, 'verse'],
            [30000, 40000, 'chorus'],
            [40000, 45000, ''],
            [45000, null, 'outro']
        ]
    );
});

check('lyrics: same timestamp means translation', () => {
    const doc = parseLyrics('[00:01.00]你好\n[00:01.00]Hello\n[00:01.00]Bonjour\n[00:03.00]再见\n[00:03.00]Bye');
    assert.deepEqual(doc.lines, [
        { start: 1000, end: 3000, text: '你好', translation: 'Hello' },
        { start: 3000, end: null, text: '再见', translation: 'Bye' }
    ]);
    const block = parseLyrics('[00:01.00]一\n[00:02.00]二\n[00:01.00]one\n[00:02.00]two');
    assert.deepEqual(
        block.lines.map((line) => [line.text, line.translation]),
        [
            ['一', 'one'],
            ['二', 'two']
        ]
    );
    const gap = parseLyrics('[00:05.00]\n[00:05.00]Hello\n[00:06.00]World');
    assert.deepEqual(gap.lines[0], { start: 5000, end: 6000, text: 'Hello' });
});

check('lyrics: enhanced word timing with <mm:ss.xx>', () => {
    const raw =
        '[00:12.00]<00:12.00>Hello <00:12.50>world <00:13.10>\n[00:14.00]<00:14.00>Next <00:14.40>line\n[00:16.00]end';
    assert.equal(detectLyricsFormat(raw), 'lrc_word');
    const doc = parseLyrics(raw);
    assert.equal(doc.wordSynced, true);
    assert.equal(doc.lines[0].text, 'Hello world');
    assert.deepEqual(doc.lines[0].words, [
        { start: 12000, end: 12500, text: 'Hello ' },
        { start: 12500, end: 13100, text: 'world' }
    ]);
    assert.deepEqual(doc.lines[1].words, [
        { start: 14000, end: 14400, text: 'Next ' },
        { start: 14400, end: 16000, text: 'line' }
    ]);
    assert.equal(doc.lines[2].words, undefined);
    const gap = parseLyrics('[00:01.00]<00:01.00>a<00:01.20> <00:01.50>b<00:02.00>\n[00:03.00]c');
    assert.deepEqual(gap.lines[0].words, [
        { start: 1000, end: 1200, text: 'a ' },
        { start: 1500, end: 2000, text: 'b' }
    ]);
    const bare = parseLyrics('<00:01.00>x <00:01.50>y\n<00:03.00>z');
    assert.deepEqual(
        bare.lines.map((line) => [line.start, line.text]),
        [
            [1000, 'x y'],
            [3000, 'z']
        ]
    );
});

check('lyrics: word timing with [mm:ss.xx] after the line start', () => {
    const raw = '[00:12.00]Hello [00:12.50]world\n[00:14.00]x [00:15.00]y [00:15.50]';
    assert.equal(detectLyricsFormat(raw), 'lrc_word');
    const doc = parseLyrics(raw);
    assert.deepEqual(doc.lines[0].words, [
        { start: 12000, end: 12500, text: 'Hello ' },
        { start: 12500, end: 14000, text: 'world' }
    ]);
    assert.deepEqual(doc.lines[1].words, [
        { start: 14000, end: 15000, text: 'x ' },
        { start: 15000, end: 15500, text: 'y' }
    ]);
    assert.equal(doc.lines[1].text, 'x y');
});

check('lyrics: [offset:] sign and lyricLineAt', () => {
    const doc = parseLyrics('[offset:+500]\n[00:01.00]a\n[00:02.00]b\n[00:03.00]c');
    assert.equal(doc.offset, 500);
    assert.equal(doc.meta.offset, '+500');
    assert.equal(lyricLineAt(doc, 0), -1);
    assert.equal(lyricLineAt(doc, 499), -1);
    assert.equal(lyricLineAt(doc, 500), 0, 'a positive offset shows lines earlier');
    assert.equal(lyricLineAt(doc, 1499), 0);
    assert.equal(lyricLineAt(doc, 1500), 1);
    assert.equal(lyricLineAt(doc, 99999), 2);
    assert.equal(lyricLineAt(doc, 500, -500), -1, 'extra offset adds to the tag');
    assert.equal(lyricLineAt(doc, 500, 1000), 1, '500 + 500 + 1000 reaches the second line');
    assert.equal(parseLyrics('[offset:-250]\n[00:01.00]a\n[00:02.00]b').offset, -250);
});

check('lyrics: BOM, CRLF and ID tags', () => {
    const bom = String.fromCharCode(0xfeff);
    const raw = `${bom}[ti:雨天的窗边]\r\n[ar:Lo-fi 时光]\r\n[al:测试 [Live]]\r\n[by:me]\r\n[length: 03:18]\r\n[re:tool]\r\n[ve:1.0]\r\n[00:01.00]第一句\r\n[00:02.00]第二句\r\n`;
    const doc = parseLyrics(raw);
    assert.deepEqual(doc.meta, {
        ti: '雨天的窗边',
        ar: 'Lo-fi 时光',
        al: '测试 [Live]',
        by: 'me',
        length: '03:18',
        re: 'tool',
        ve: '1.0'
    });
    assert.deepEqual(
        doc.lines.map((line) => line.text),
        ['第一句', '第二句']
    );
    assert.equal(parseLyrics('[00:01.00]a\r[00:02.00]b').lines.length, 2, 'old Mac line ends');
});

check('lyrics: plain text', () => {
    const raw = '\n\n第一行\n第二行\n\n第三段  \n\n\n\n\n第四段\n\n\n第五段\n[Chorus]\n\n';
    assert.equal(detectLyricsFormat(raw), 'plain');
    const doc = parseLyrics(raw);
    assert.equal(doc.synced, false);
    assert.deepEqual(
        doc.lines.map((line) => line.text),
        ['第一行', '第二行', '', '第三段', '', '第四段', '', '', '第五段', '[Chorus]']
    );
    assert.ok(doc.lines.every((line) => line.start === null && line.end === null));
    assert.equal(lyricLineAt(doc, 5000), -1);
});

check('lyrics: LRC detection thresholds', () => {
    assert.equal(detectLyricsFormat('[00:01.00]only line'), 'lrc');
    assert.equal(detectLyricsFormat('[00:01.00]line\nplain line'), 'lrc');
    assert.equal(detectLyricsFormat('[00:01.00]line\nplain\nplain'), 'plain');
    assert.equal(detectLyricsFormat('[ti:x]\n[ar:y]\n[00:01.00]line'), 'lrc');
    assert.equal(detectLyricsFormat('[00:01.00]a\n[00:02.00]b\nuntimed\nuntimed'), 'lrc');
    assert.equal(detectLyricsFormat('just text\nmore'), 'plain');
    assert.equal(detectLyricsFormat('[Intro: Someone]\nla la'), 'plain');
    assert.equal(detectLyricsFormat(''), 'plain');
    assert.deepEqual(
        parseLyrics('[Intro: Someone]\nla la').lines.map((line) => line.text),
        ['[Intro: Someone]', 'la la']
    );
});

check('lyrics: shiftLyrics copies and clamps', () => {
    const doc = parseLyrics('[00:00.50]<00:00.50>a <00:00.80>b\n[00:02.00]c\n[00:02.00]C');
    const later = shiftLyrics(doc, 1000);
    assert.deepEqual(
        later.lines.map((line) => [line.start, line.end]),
        [
            [1500, 3000],
            [3000, null]
        ]
    );
    assert.deepEqual(
        later.lines[0].words?.map((word) => [word.start, word.end]),
        [
            [1500, 1800],
            [1800, 3000]
        ]
    );
    assert.equal(later.lines[1].translation, 'C');
    assert.equal(doc.lines[0].start, 500, 'the input is untouched');
    const earlier = shiftLyrics(doc, -1000);
    assert.deepEqual(
        earlier.lines.map((line) => line.start),
        [0, 1000]
    );
    assert.equal(earlier.lines[0].words?.[1].start, 0);
    const plain = parseLyrics('a\nb');
    assert.deepEqual(shiftLyrics(plain, 500), plain);
});

check('lyrics: serializeLrc round-trips parseLyrics', () => {
    const sources = [
        '[ti:t]\n[ar:a]\n[offset:+500]\n[00:01.00]a\n[00:02.00]\n[00:03.00]b',
        '[00:01.00]你好\n[00:01.00]Hello\n[00:03.00]再见\n[00:03.00]Bye',
        '[00:12.00]<00:12.00>Hello <00:12.50>world <00:13.10>\n[00:14.00]<00:14.00>Next <00:14.40>line\n[00:16.00]end',
        '[00:12.00]Hello [00:12.50]world\n[00:14.00]x [00:15.00]y [00:15.50]',
        '[00:01.00]<00:01.00>a<00:01.20> <00:01.50>b<00:02.00>\n[00:03.00]c',
        '[00:01.005]precise\n[00:02.1]tenths\n[120:00.00]long',
        '[offset:0]\n[00:01.00]a\n[00:02.00]b',
        '[00:30.00][00:10.00]chorus\n[00:20.00]verse',
        '[al:x]\nplain one\n\nplain two\n\n\nplain three'
    ];
    for (const source of sources) {
        const doc = parseLyrics(source);
        assert.deepEqual(parseLyrics(serializeLrc(doc)), doc, source);
    }
    const written = serializeLrc(parseLyrics(sources[2]));
    assert.ok(written.includes('[00:12.00]<00:12.00>Hello <00:12.50>world<00:13.10>\n'), written);
    const shifted = { ...parseLyrics('[00:01.00]a\n[00:02.00]b'), offset: -300 };
    assert.ok(serializeLrc(shifted).startsWith('[offset:-300]\n'));
});

check('lyrics: corpus .lrc files', () => {
    const lines = Object.fromEntries(
        manifest.files
            .filter((entry) => entry.lyric_lines)
            .map((entry) => [path.basename(entry.path, '.flac'), entry.lyric_lines])
    );
    const plain = parseLyrics(readFileSync(fixture('lyrics/雨天的窗边.lrc'), 'utf8'));
    assert.equal(plain.lines.length, lines['雨天的窗边']);
    assert.equal(plain.meta.ti, '雨天的窗边');
    const bilingual = parseLyrics(readFileSync(fixture('lyrics/暖灯电台.lrc'), 'utf8'));
    assert.equal(bilingual.lines.length, lines['暖灯电台']);
    assert.equal(bilingual.lines[0].text, '收音机里有人在念晚安');
    assert.equal(bilingual.lines[0].translation, 'Someone on the radio is saying goodnight');
    assert.ok(bilingual.lines.every((line) => line.translation));
    const worded = parseLyrics(readFileSync(fixture('lyrics/一起散步.lrc'), 'utf8'));
    assert.equal(worded.wordSynced, true);
    assert.equal(worded.lines.length, lines['一起散步']);
    assert.equal(worded.lines[0].words?.length, [...'周末的早上不定闹钟'].length);
    assert.equal(worded.lines[0].words?.at(-1)?.end, 6000, 'the trailing tag ends the last word');
    const { text, encoding } = decodeText(readFileSync(fixture('lyrics/云朵上的下午.lrc')));
    assert.equal(encoding, 'gb18030');
    const gbk = parseLyrics(text);
    assert.equal(gbk.lines.length, lines['云朵上的下午']);
    assert.equal(gbk.lines[0].text, '午后的风把窗帘吹成一朵云');
    assert.equal(gbk.meta.ar, '小满 & 知夏');
});

check('lyrics: lyricLineAt agrees with a linear scan', () => {
    const starts = Array.from({ length: 200 }, (_, i) => i * 1000 + (i % 7) * 13);
    const doc = parseLyrics(
        starts
            .map(
                (ms) =>
                    `[${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}]l`
            )
            .join('\n')
    );
    for (let t = -50; t < 205000; t += 97) {
        let expected = -1;
        doc.lines.forEach((line, i) => {
            if ((line.start as number) <= t) expected = i;
        });
        assert.equal(lyricLineAt(doc, t), expected, `t=${t}`);
    }
});

// ------------------------------------------------------------------------------------------------- cue

// The corpus album.cue, decoded from GBK.
const corpusCue = (): CueSheet => parseCue(decodeText(readFileSync(fixture('gapless/album.cue'))).text);

check('cue: corpus album.cue (GBK)', () => {
    assert.equal(decodeText(readFileSync(fixture('gapless/album.cue'))).encoding, 'gb18030');
    const sheet = corpusCue();
    assert.equal(sheet.title, '无缝测试专辑');
    assert.equal(sheet.performer, '测试乐队');
    assert.deepEqual(sheet.rem, { GENRE: '测试', DATE: '2026' });
    assert.equal(sheet.files.length, 1);
    assert.equal(sheet.files[0].name, 'album.flac');
    assert.equal(sheet.files[0].type, 'WAVE');
    assert.deepEqual(
        sheet.files[0].tracks.map((track) => [track.number, track.title, track.performer, track.index1]),
        [
            [1, '第一段 · 上升', '测试乐队', 0],
            [2, '第二段 · 继续', '测试乐队', 1125],
            [3, '第三段 · 结束', '测试乐队', 2287]
        ]
    );
});

check('cue: slices line up with the split files sample for sample', async () => {
    const album = await readAudioMetadata(fileOf('gapless/album.flac'), 'album.flac');
    const file = matchCueFile(corpusCue(), 'album.flac');
    assert.ok(file);
    assert.ok(album.sampleRate && album.durationSamples);
    const slices = cueSlices(file, album.sampleRate, album.durationSamples);
    const entry = manifest.files.find((item) => item.path === 'gapless/album.flac');
    assert.deepEqual(
        slices.map((slice) => slice.startSample),
        entry?.cue_starts_samples
    );
    assert.equal(slices.at(-1)?.endSample, album.durationSamples);
    for (const [i, slice] of slices.entries()) {
        const part = await readAudioMetadata(fileOf(`gapless/0${i + 1}.flac`), `0${i + 1}.flac`);
        assert.equal(slice.endSample - slice.startSample, part.durationSamples, `slice ${i + 1}`);
        assert.equal(slice.title, part.title);
    }
});

check('cue: frames to samples is exact at every common rate', () => {
    const frames = [0, 1, 74, 75, 1125, 2287, 99 * 60 * 75 + 59 * 75 + 74, 123456789];
    for (const rate of [44100, 48000, 88200, 96000, 176400, 192000]) {
        for (const count of frames) {
            const exact = BigInt(count) * BigInt(rate);
            assert.equal(exact % 75n, 0n);
            assert.equal(framesToSamples(count, rate), Number(exact / 75n), `${count} frames at ${rate}`);
        }
    }
    assert.equal(framesToSamples(1, 32000), 427, 'other rates round to the nearest sample');
});

check('cue: commands, data tracks, gaps and multiple FILE blocks', () => {
    const sheet = parseCue(
        [
            'REM GENRE Pop',
            'REM DATE 1999',
            'REM DISCID 860B640B',
            'REM COMMENT "ExactAudioCopy v1.6"',
            'REM REPLAYGAIN_ALBUM_GAIN -7.89 dB',
            'REM REPLAYGAIN_ALBUM_PEAK 0.988800',
            'CATALOG 1234567890123',
            'CDTEXTFILE "disc.cdt"',
            'performer "The Band"',
            'title "Two Files"',
            'songwriter "Writer"',
            'FILE "C:\\rips\\part one.wav" WAVE',
            '  TRACK 01 MODE1/2352',
            '    TITLE "Data track"',
            '    INDEX 01 00:00:00',
            '  track 02 audio',
            '    title "Song A"',
            '    isrc USRC17607839',
            '    flags DCP PRE',
            '    REM REPLAYGAIN_TRACK_GAIN -6.50 dB',
            '    REM REPLAYGAIN_TRACK_PEAK 0.912',
            '    PREGAP 00:02:00',
            '    INDEX 01 00:00:00',
            '  TRACK 03 AUDIO',
            '    TITLE "Song B"',
            '    PERFORMER "Guest"',
            '    INDEX 00 03:58:10',
            'FILE part2.flac WAVE',
            '    INDEX 01 00:00:00',
            '  TRACK 04 AUDIO',
            '    TITLE "Song C"',
            '    POSTGAP 00:01:00',
            '    INDEX 00 04:01:00',
            '    INDEX 01 04:03:00'
        ].join('\r\n')
    );
    assert.equal(sheet.title, 'Two Files');
    assert.equal(sheet.performer, 'The Band');
    assert.equal(sheet.songwriter, 'Writer');
    assert.equal(sheet.catalog, '1234567890123');
    assert.deepEqual(sheet.rem, {
        GENRE: 'Pop',
        DATE: '1999',
        DISCID: '860B640B',
        COMMENT: 'ExactAudioCopy v1.6',
        REPLAYGAIN_ALBUM_GAIN: '-7.89 dB',
        REPLAYGAIN_ALBUM_PEAK: '0.988800'
    });
    assert.deepEqual(
        sheet.files.map((file) => [file.name, file.type, file.tracks.map((track) => track.number)]),
        [
            ['C:\\rips\\part one.wav', 'WAVE', [2]],
            ['part2.flac', 'WAVE', [3, 4]]
        ]
    );
    assert.deepEqual(sheet.files[0].tracks[0], {
        number: 2,
        title: 'Song A',
        performer: 'The Band',
        songwriter: '',
        isrc: 'USRC17607839',
        flags: ['DCP', 'PRE'],
        index0: null,
        index1: 0,
        rem: { REPLAYGAIN_TRACK_GAIN: '-6.50 dB', REPLAYGAIN_TRACK_PEAK: '0.912', PREGAP: '00:02:00' }
    });
    const [songB, songC] = sheet.files[1].tracks;
    assert.equal(songB.performer, 'Guest');
    assert.equal(songB.index0, null, 'its INDEX 00 lies in the previous file');
    assert.equal(songB.index1, 0);
    assert.equal(songC.index0, (4 * 60 + 1) * 75);
    assert.equal(songC.index1, (4 * 60 + 3) * 75);
    assert.deepEqual(songC.rem, { POSTGAP: '00:01:00' });
    assert.equal(matchCueFile(sheet, 'Part One.FLAC'), sheet.files[0], 'other extension, Windows path in the sheet');
    assert.equal(matchCueFile(sheet, 'music/rips/part2.flac'), sheet.files[1]);
    assert.equal(matchCueFile(sheet, 'part2.wv'), sheet.files[1]);
    assert.equal(matchCueFile(sheet, 'other.flac'), null);
    const nfd = parseCue('FILE "Café.wav" WAVE\n TRACK 01 AUDIO\n  INDEX 01 00:00:00');
    assert.equal(matchCueFile(nfd, 'Café.flac'.normalize('NFD')), nfd.files[0], 'NFC and NFD names match');
    const slices = cueSlices(sheet.files[1], 44100, 44100 * 600);
    assert.deepEqual(
        slices.map((slice) => [slice.number, slice.startSample, slice.endSample]),
        [
            [3, 0, (4 * 60 + 3) * 75 * 588],
            [4, (4 * 60 + 3) * 75 * 588, 44100 * 600]
        ]
    );
});

check('cue: malformed sheets and impossible slices throw', () => {
    assert.throws(() => parseCue('FILE "a.wav" WAVE\n  TRACK 01 AUDIO\n    TITLE "x"\n'), /缺少 INDEX 01/);
    assert.throws(() => parseCue('TRACK 01 AUDIO\n INDEX 01 00:00:00'), /FILE/);
    assert.throws(() => parseCue('FILE "a.wav" WAVE\nTRACK 01 AUDIO\nINDEX 01 00:61:00'), /看不懂/);
    assert.deepEqual(parseCue('').files, []);
    const sheet = parseCue(
        'FILE "a.wav" WAVE\nTRACK 01 AUDIO\nINDEX 01 00:00:00\nTRACK 02 AUDIO\nINDEX 01 00:20:00\nTRACK 03 AUDIO\nINDEX 01 00:10:00'
    );
    assert.throws(() => cueSlices(sheet.files[0], 44100, 44100 * 60), /顺序不对/);
    const long = parseCue('FILE "a.wav" WAVE\nTRACK 01 AUDIO\nINDEX 01 00:00:00\nTRACK 02 AUDIO\nINDEX 01 01:40:00');
    assert.throws(() => cueSlices(long.files[0], 44100, 44100 * 50), /超出/);
});

// ------------------------------------------------------------------------------------------------ text

// Big5 bytes of a few names (Node has no Big5 encoder).
const hexOfBig5: Record<string, string> = { 周杰倫: 'a950aa4eaddb', 七里香: 'a443a8bdadbb', 晴天: 'b4b8a4d1' };

check('text: byte order marks and UTF-16', () => {
    const bom = String.fromCharCode(0xfeff);
    assert.deepEqual(decodeText(utf8(`${bom}[00:01.00]雨天`)), { text: '[00:01.00]雨天', encoding: 'utf-8' });
    const le = Buffer.from(`${bom}[00:01.00]雨天`, 'utf16le');
    assert.deepEqual(decodeText(le), { text: '[00:01.00]雨天', encoding: 'utf-16le' });
    const be = Buffer.from(le).swap16();
    assert.deepEqual(decodeText(be), { text: '[00:01.00]雨天', encoding: 'utf-16be' });
    const bareLe = Buffer.from('[00:01.00]hello\n[00:02.00]雨天的窗边', 'utf16le');
    assert.deepEqual(decodeText(bareLe), { text: '[00:01.00]hello\n[00:02.00]雨天的窗边', encoding: 'utf-16le' });
    assert.equal(decodeText(Buffer.from(bareLe).swap16()).encoding, 'utf-16be');
    assert.deepEqual(decodeText(utf8('plain ascii')), { text: 'plain ascii', encoding: 'utf-8' });
    assert.deepEqual(decodeText(new Uint8Array(0)), { text: '', encoding: 'utf-8' });
});

check('text: GBK, Big5, Shift_JIS and windows-1252 files', () => {
    const gbk = decodeText(readFileSync(fixture('lyrics/云朵上的下午.lrc')));
    assert.equal(gbk.encoding, 'gb18030');
    assert.ok(gbk.text.includes('[00:00.00]午后的风把窗帘吹成一朵云'));
    const big5 = decodeText(
        hex(
            '5b30303a30312e30305da4ebab47a54eaaeda7daaabaa4df0a5b30303a30352e30305da741b0dda7dab752a741a6b3a668b2600a5b30303a30392e30305da7dab752a741a6b3b458a4c0'
        )
    );
    assert.deepEqual(big5, {
        text: '[00:01.00]月亮代表我的心\n[00:05.00]你問我愛你有多深\n[00:09.00]我愛你有幾分',
        encoding: 'big5'
    });
    const sjis = decodeText(
        hex(
            '5b30303a30312e30305d96e982c98bec82af82e90a5b30303a30352e30305d92be82de82e682a482c9976e82af82c482e482ad82e682a482c90a5b30303a30392e30305d93f1906c82be82af82cc8bf382aa8d4c82aa82e996e982c9'
        )
    );
    assert.deepEqual(sjis, {
        text: '[00:01.00]夜に駆ける\n[00:05.00]沈むように溶けてゆくように\n[00:09.00]二人だけの空が広がる夜に',
        encoding: 'shift_jis'
    });
    const western = decodeText(hex('436166e9206372e86d65206272fb6ce9650a4e61ef7665206661e761646520972064e96ae0207675'));
    assert.deepEqual(western, { text: 'Café crème brûlée\nNaïve façade — déjà vu', encoding: 'windows-1252' });
});

check('text: repairMojibake repairs', () => {
    assert.deepEqual(repairMojibake('ÓêÌìµÄ´°±ß'), { text: '雨天的窗边', encoding: 'gb18030' });
    assert.deepEqual(repairMojibake(latin1(hex('a4ebab47a54eaaeda7daaabaa4df'))), {
        text: '月亮代表我的心',
        encoding: 'big5'
    });
    assert.deepEqual(repairMojibake(latin1(hex('96e982c98bec82af82e9'))), {
        text: '夜に駆ける',
        encoding: 'shift_jis'
    });
    assert.deepEqual(repairMojibake(latin1(utf8('雨天的窗边'))), { text: '雨天的窗边', encoding: 'utf-8' });
    const cp1252 = new TextDecoder('windows-1252').decode(utf8('雨天的窗边'));
    assert.ok(/[\u0152-\u2122]/.test(cp1252), 'windows-1252 reading has its own punctuation');
    assert.deepEqual(repairMojibake(cp1252), { text: '雨天的窗边', encoding: 'utf-8' });
    assert.deepEqual(repairMojibake(latin1(utf8('Beyoncé'))), { text: 'Beyoncé', encoding: 'utf-8' });
});

check('text: repairMojibake leaves correct strings alone', () => {
    const fine = [
        'Café',
        'Beyoncé',
        'Ünïcödé',
        'hello world',
        '',
        '雨天的窗边',
        'Lo-fi 时光',
        'Plácido Domingo',
        'Pavane pour une infante défunte',
        'Ça plane pour moi',
        'Motörhead',
        'Sigur Rós',
        'Tom’s Diner',
        '½ price',
        'Hélène Grimaud',
        'Ølstykke',
        'Coração'
    ];
    for (const value of fine) assert.equal(repairMojibake(value), null, value);
});

check('text: album-level decisions', () => {
    const album = ['ÓêÌìµÄ´°±ß', 'Lo-fi Ê±¹â', 'ÒôÀÖÄ£¿é²âÊÔ¼¯'];
    assert.equal(detectAlbumMojibake(album), 'gb18030');
    assert.deepEqual(
        album.map((value) => decodeMojibake(value, 'gb18030')),
        ['雨天的窗边', 'Lo-fi 时光', '音乐模块测试集']
    );
    assert.equal(
        detectAlbumMojibake([...album, 'Live', '雨天的窗边']),
        'gb18030',
        'ASCII and real Unicode are not suspects'
    );
    assert.equal(detectAlbumMojibake([...album, 'Café']), null, 'one value no encoding explains blocks the album');
    assert.equal(detectAlbumMojibake(['Live', '2026']), null);
    assert.equal(detectAlbumMojibake([]), null);
    const big5 = ['周杰倫', '七里香', '晴天'].map((value) =>
        latin1(new Uint8Array(Buffer.from(hexOfBig5[value], 'hex')))
    );
    assert.equal(detectAlbumMojibake(big5), 'big5');
    assert.equal(decodeMojibake('Café', 'gb18030'), 'Café', 'values that do not decode stay as they are');
    assert.equal(decodeMojibake('雨天', 'gb18030'), '雨天');
});

// ---------------------------------------------------------------------------------------------- sha256

check('sha256: incremental class against node:crypto', () => {
    for (const size of [0, 1, 55, 56, 63, 64, 65, 1000, 5 * 1024 * 1024 + 7]) {
        const bytes = new Uint8Array(randomBytes(size));
        const expected = nodeSha256(bytes);
        assert.equal(new Sha256().update(bytes).digestHex(), expected, `one update, ${size} bytes`);
        const hash = new Sha256();
        let pos = 0;
        while (pos < size) {
            const step = Math.min(size - pos, Math.floor(Math.random() * 200));
            hash.update(bytes.subarray(pos, pos + step));
            pos += step;
        }
        assert.equal(hash.digestHex(), expected, `random chunks, ${size} bytes`);
        assert.equal(hash.digestHex(), expected, 'digest is repeatable');
        assert.throws(() => hash.update(bytes));
    }
});

check('sha256: sha256Blob with WebCrypto, progress and abort', async () => {
    for (const size of [0, 1, 4 * 1024 * 1024, 9 * 1024 * 1024 + 3]) {
        const bytes = new Uint8Array(randomBytes(size));
        const seen: [number, number][] = [];
        const hash = await sha256Blob(new Blob([bytes]), (done, total) => seen.push([done, total]));
        assert.equal(hash, nodeSha256(bytes), `${size} bytes`);
        assert.deepEqual(seen.at(-1), [size, size]);
        assert.ok(seen.every(([done], i) => i === 0 || done > seen[i - 1][0]));
    }
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(sha256Blob(new Blob([new Uint8Array(10)]), undefined, controller.signal), {
        name: 'AbortError'
    });
    const midway = new AbortController();
    await assert.rejects(
        sha256Blob(new Blob([new Uint8Array(9 * 1024 * 1024)]), () => midway.abort(), midway.signal),
        { name: 'AbortError' }
    );
});

check('sha256: sha256Blob without crypto.subtle (insecure origin)', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
        for (const size of [0, 63, 64, 4 * 1024 * 1024, 9 * 1024 * 1024 + 3]) {
            const bytes = new Uint8Array(randomBytes(size));
            let calls = 0;
            const hash = await sha256Blob(new Blob([bytes]), () => (calls += 1));
            assert.equal(hash, nodeSha256(bytes), `${size} bytes`);
            assert.equal(calls, Math.max(1, Math.ceil(size / (4 * 1024 * 1024))));
        }
        const midway = new AbortController();
        await assert.rejects(
            sha256Blob(new Blob([new Uint8Array(9 * 1024 * 1024)]), () => midway.abort(), midway.signal),
            { name: 'AbortError' }
        );
    } finally {
        if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    }
});

check('sha256: files over 128 MiB use the incremental hash', async () => {
    const subtle = globalThis.crypto.subtle as SubtleCrypto & { digest: SubtleCrypto['digest'] };
    const original = subtle.digest;
    let digests = 0;
    subtle.digest = ((...args: Parameters<SubtleCrypto['digest']>) => {
        digests += 1;
        return original.apply(subtle, args);
    }) as SubtleCrypto['digest'];
    try {
        const bytes = new Uint8Array(129 * 1024 * 1024);
        for (let i = 0; i < bytes.length; i += 4096) bytes[i] = i & 0xff;
        const started = performance.now();
        const hash = await sha256Blob(new Blob([bytes]));
        const seconds = (performance.now() - started) / 1000;
        assert.equal(hash, nodeSha256(bytes));
        assert.equal(digests, 0, 'crypto.subtle.digest is not used');
        console.log(`       pure TypeScript SHA-256: ${Math.round(129 / seconds)} MiB/s`);
    } finally {
        delete (subtle as Partial<SubtleCrypto>).digest;
        if (subtle.digest !== original) subtle.digest = original;
    }
});

check('sha256: corpus files match the manifest', async () => {
    for (const entry of manifest.files) {
        assert.equal(await sha256Blob(fileOf(entry.path)), entry.sha256, entry.path);
    }
});

// ----------------------------------------------------------------------------------------------- sniff

check('sniff: every corpus audio file', async () => {
    for (const entry of manifest.files) {
        const result = await sniffAudio(fileOf(entry.path));
        assert.equal(result.container, SNIFF_CONTAINER[entry.container], `${entry.path} container`);
        assert.equal(result.codecHint, SNIFF_CODEC[entry.codec], `${entry.path} codec`);
    }
    const mimes = await Promise.all(
        [
            'formats/01-flac-16-44.flac',
            'formats/06-aac-256.m4a',
            'formats/12-opus-160.webm',
            'formats/14-wavpack-16-44.wv'
        ].map(async (relative) => (await sniffAudio(fileOf(relative))).mime)
    );
    assert.deepEqual(mimes, ['audio/flac', 'audio/mp4', 'audio/webm', 'audio/x-wavpack']);
    for (const name of readdirSync(fixture('formats'))) {
        const result = await sniffAudio(fileOf(`formats/${name}`));
        if (name.endsWith('.jpg')) assert.equal(result.container, 'unknown');
        else assert.notEqual(result.container, 'unknown', name);
    }
});

check('sniff: synthetic headers', async () => {
    const flac = readFileSync(fixture('formats/02-flac-24-96.flac'));
    const id3 = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 1, 0]);
    const tagged = await readAudioHeader(new Blob([id3, new Uint8Array(128), flac]));
    assert.equal(tagged.container, 'flac', 'an ID3v2 tag in front of FLAC');
    assert.equal(tagged.sampleRate, 96000);
    // A blob whose bytes start with the given values.
    const head = (...parts: (number[] | string)[]) =>
        new Blob([
            ...parts.map((part) => (typeof part === 'string' ? utf8(part) : new Uint8Array(part))),
            new Uint8Array(64)
        ]);
    const cases: [Blob, string, string | null, string][] = [
        [head('MAC ', [0x96, 0x0f]), 'ape', 'ape', 'audio/x-ape'],
        [head('wvpk'), 'wavpack', 'wavpack', 'audio/x-wavpack'],
        [head('DSD ', [28, 0, 0, 0, 0, 0, 0, 0]), 'dsf', 'dsd', 'audio/x-dsf'],
        [head('FRM8', [0, 0, 0, 0, 0, 0, 0, 0], 'DSD '), 'dff', 'dsd', 'audio/x-dff'],
        [head('TTA1'), 'tta', 'tta', 'audio/x-tta'],
        [head([0xff, 0xf1, 0x50, 0x80, 0x02, 0x1f, 0xfc]), 'mp3', 'aac', 'audio/aac'],
        [head([0xff, 0xfb, 0x90, 0x64]), 'mp3', 'mp3', 'audio/mpeg'],
        [head([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 4], [1, 2, 3, 4], 'junk'), 'mp3', 'mp3', 'audio/mpeg'],
        [head('RF64', [0xff, 0xff, 0xff, 0xff], 'WAVE'), 'wav', null, 'audio/wav'],
        [head('OggS', [0, 2], new Array(20).fill(0), [1, 30], 'OpusHead'), 'ogg', 'opus', 'audio/ogg'],
        [head([0x1a, 0x45, 0xdf, 0xa3], 'matroska', 'A_VORBIS'), 'webm', 'vorbis', 'audio/x-matroska'],
        [new Blob([new Uint8Array(1), randomBytes(4095)]), 'unknown', null, 'application/octet-stream'],
        [new Blob([]), 'unknown', null, 'application/octet-stream']
    ];
    for (const [blob, container, codec, mime] of cases) {
        const result = await sniffAudio(blob);
        assert.deepEqual(result, { container, codecHint: codec, mime }, `${container}/${codec}`);
    }
});

check('sniff: header facts for metadata', async () => {
    const flac = await readAudioHeader(fileOf('formats/02-flac-24-96.flac'));
    assert.equal(flac.sampleRate, 96000);
    assert.equal(flac.bitDepth, 24);
    assert.equal(flac.channels, 2);
    assert.equal(flac.totalSamples, 1920000);
    assert.equal(flac.md5, referenceFlacMd5(fixture('formats/02-flac-24-96.flac'), 24) ?? flac.md5);
    const alac = await readAudioHeader(fileOf('formats/05-alac-24-96.m4a'));
    assert.deepEqual([alac.codecHint, alac.sampleRate, alac.bitDepth, alac.channels], ['alac', 96000, 24, 2]);
    const wav = await readAudioHeader(fileOf('formats/08-wav-24-48.wav'));
    assert.deepEqual([wav.codecHint, wav.sampleRate, wav.bitDepth, wav.channels], ['pcm', 48000, 24, 2]);
    const aiff = await readAudioHeader(fileOf('formats/10-aiff-16-44.aiff'));
    assert.deepEqual([aiff.codecHint, aiff.sampleRate, aiff.bitDepth, aiff.channels], ['pcm', 44100, 16, 2]);
});

check('sniff: canBrowserPlay matches the corpus browser table', async () => {
    const families: [string, BrowserFamily][] = [
        ['chrome', 'chromium'],
        ['firefox', 'firefox'],
        ['safari', 'safari']
    ];
    for (const entry of manifest.files) {
        const sniffed = await sniffAudio(fileOf(entry.path));
        const parsed = await readAudioMetadata(fileOf(entry.path), path.basename(entry.path));
        for (const [column, family] of families) {
            const cell = entry.browsers[column];
            const expected = cell === true ? 'yes' : cell === false ? 'no' : 'maybe';
            assert.equal(
                canBrowserPlay(sniffed.container, sniffed.codecHint, family),
                expected,
                `${entry.path} ${family}`
            );
            assert.equal(
                canBrowserPlay(sniffed.container, parsed.codec, family),
                expected,
                `${entry.path} ${family} (parsed codec)`
            );
        }
    }
    assert.equal(canBrowserPlay('mp4', null, 'chromium'), 'maybe', 'an MP4 whose codec is unknown might be ALAC');
    assert.equal(canBrowserPlay('dsf', 'dsd', 'safari'), 'no');
    assert.equal(canBrowserPlay('unknown', null, 'firefox'), 'no');
});

check('sniff: browserFamily', () => {
    const agents: [string, BrowserFamily][] = [
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'chromium'
        ],
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
            'chromium'
        ],
        ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0', 'firefox'],
        ['Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0', 'firefox'],
        [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
            'safari'
        ],
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
            'safari'
        ],
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
            'safari'
        ],
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
            'safari'
        ],
        [
            'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36',
            'chromium'
        ],
        [
            'Mozilla/5.0 (Linux; Android 14; SM-S9180) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
            'chromium'
        ],
        [
            'Mozilla/5.0 (Linux; Android 14; V2307A Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160117 MicroMessenger/8.0.47',
            'chromium'
        ],
        ['', 'chromium']
    ];
    for (const [agent, family] of agents) assert.equal(browserFamily(agent), family, agent);
});

// -------------------------------------------------------------------------------------------- metadata

check('metadata: FLAC 24/96', async () => {
    const parsed = await readAudioMetadata(fileOf('formats/02-flac-24-96.flac'), '02-flac-24-96.flac');
    assert.equal(parsed.container, 'flac');
    assert.equal(parsed.codec, 'flac');
    assert.equal(parsed.lossless, true);
    assert.equal(parsed.sampleRate, 96000);
    assert.equal(parsed.bitDepth, 24);
    assert.equal(parsed.channels, 2);
    assert.equal(parsed.durationSamples, 1920000);
    assert.equal(parsed.durationMs, 20000);
    assert.ok(parsed.bitrate && parsed.bitrate > 700000);
    assert.equal(parsed.title, 'Hi-Res 检查 96 kHz');
    assert.deepEqual(parsed.artists, ['Lo-fi 时光']);
    assert.equal(parsed.album, '音乐模块测试集');
    assert.equal(parsed.year, '2026');
    assert.equal(parsed.mojibake, null);
    assert.deepEqual(parsed.tagsRaw.TITLE, ['Hi-Res 检查 96 kHz']);
});

check('metadata: FLAC audioMd5 is the STREAMINFO MD5', async () => {
    const flacs = manifest.files.filter((entry) => entry.codec === 'flac');
    let compared = 0;
    for (const entry of flacs) {
        const parsed = await readAudioMetadata(fileOf(entry.path), path.basename(entry.path));
        const reference = referenceFlacMd5(fixture(entry.path), entry.bit_depth ?? 16);
        assert.match(parsed.audioMd5 ?? '', /^[0-9a-f]{32}$/, entry.path);
        if (reference) {
            assert.equal(parsed.audioMd5, reference, entry.path);
            compared += 1;
        }
    }
    if (!compared) console.log('       (metaflac and ffmpeg missing: MD5 values not cross-checked)');
});

check('metadata: GBK-tagged MP3 is repaired, raw tags are kept', async () => {
    const parsed = await readAudioMetadata(fileOf('formats/07-mp3-320-gbk-tags.mp3'), '07-mp3-320-gbk-tags.mp3');
    assert.equal(parsed.title, '雨天的窗边');
    assert.deepEqual(parsed.artists, ['Lo-fi 时光']);
    assert.equal(parsed.album, '音乐模块测试集');
    assert.equal(parsed.mojibake, 'gb18030');
    assert.deepEqual(parsed.tagsRaw.TIT2, ['ÓêÌìµÄ´°±ß']);
    assert.equal(parsed.codec, 'mp3');
    assert.equal(parsed.container, 'mp3');
    assert.equal(parsed.lossless, false);
    assert.equal(parsed.bitDepth, null);
    assert.equal(parsed.trackNo, 7);
    assert.equal(parsed.year, '2026');
    assert.equal(parsed.sampleRate, 44100);
    assert.ok(Math.abs((parsed.durationMs ?? 0) - 30041) <= 30);
    assert.ok(parsed.lyrics?.includes('[00:00.00]窗外的灯一盏一盏亮起来'));
    assert.equal(parsed.pictures.length, 1);
    assert.equal(parsed.pictures[0].mime, 'image/jpeg');
    assert.equal(parsed.pictures[0].type, 'Cover (front)');
    assert.equal(parsed.pictures[0].data.length, statSync(fixture('cover/cover.jpg')).size);
});

check('metadata: AAC with ©lyr lyrics and a cover', async () => {
    const parsed = await readAudioMetadata(fileOf('formats/06-aac-256.m4a'), '06-aac-256.m4a');
    assert.equal(parsed.lyrics, '[00:00.00]AAC 文件的内嵌歌词（©lyr）');
    assert.equal(parsed.container, 'mp4');
    assert.equal(parsed.codec, 'aac');
    assert.equal(parsed.lossless, false);
    assert.equal(parsed.pictures[0]?.mime, 'image/jpeg');
});

check('metadata: ALAC 24/96 takes its rate from the magic cookie', async () => {
    const parsed = await readAudioMetadata(fileOf('formats/05-alac-24-96.m4a'), '05-alac-24-96.m4a');
    assert.deepEqual(
        [parsed.codec, parsed.lossless, parsed.sampleRate, parsed.bitDepth, parsed.durationSamples],
        ['alac', true, 96000, 24, 1920000]
    );
});

check('metadata: Vorbis LYRICS and ReplayGain', async () => {
    const parsed = await readAudioMetadata(fileOf('lyrics/列车清晨.flac'), '列车清晨.flac');
    assert.ok(parsed.lyrics?.startsWith('[ti:列车清晨]'));
    assert.equal(detectLyricsFormat(parsed.lyrics ?? ''), 'lrc');
    assert.equal(parsed.gain.trackGain, -0.7);
    assert.ok(Math.abs((parsed.gain.trackPeak ?? 0) - 0.350752) < 1e-6);
    assert.equal(parsed.gain.albumGain, null);
    assert.equal(parsed.pictures[0]?.mime, 'image/png');
});

check('metadata: every corpus file agrees with ffprobe', async () => {
    for (const entry of manifest.files) {
        const parsed: ParsedAudio = await readAudioMetadata(fileOf(entry.path), path.basename(entry.path));
        const label = entry.path;
        assert.equal(parsed.codec, PARSED_CODEC[entry.codec] ?? entry.codec, `${label} codec`);
        assert.equal(parsed.lossless, entry.lossless, `${label} lossless`);
        assert.equal(parsed.sampleRate, entry.sample_rate, `${label} rate`);
        assert.equal(parsed.channels, entry.channels, `${label} channels`);
        assert.equal(parsed.bitDepth, entry.lossless ? entry.bit_depth : null, `${label} depth`);
        const expected = entry.duration_s * entry.sample_rate;
        const tolerance = entry.lossless ? entry.sample_rate * 0.001 : entry.sample_rate * 0.05;
        assert.ok(
            Math.abs((parsed.durationSamples ?? 0) - expected) <= tolerance,
            `${label} duration ${parsed.durationSamples} vs ${expected}`
        );
    }
    const opus = await readAudioMetadata(fileOf('formats/11-opus-160.ogg'), '11-opus-160.ogg');
    assert.equal(opus.durationSamples, 1440000, 'Opus pre-skip is not counted');
    const float = await readAudioMetadata(fileOf('formats/09-wav-f32-48.wav'), '09-wav-f32-48.wav');
    assert.deepEqual([float.codec, float.lossless, float.bitDepth], ['pcm', true, 32]);
});

check('metadata: artist splitting and Vorbis mojibake', async () => {
    // The artists readAudioMetadata reports for a FLAC with these ARTIST values.
    const artists = async (...values: string[]) =>
        (await readAudioMetadata(flacWithTags(values.map((value) => ['ARTIST', value])), 'tags.flac')).artists;
    assert.deepEqual(await artists('周杰伦 / 费玉清'), ['周杰伦', '费玉清']);
    assert.deepEqual(await artists('A; B'), ['A', 'B']);
    assert.deepEqual(await artists('陈奕迅、王菲'), ['陈奕迅', '王菲']);
    assert.deepEqual(await artists('A feat. B'), ['A', 'B']);
    assert.deepEqual(await artists('Simon & Garfunkel'), ['Simon', 'Garfunkel']);
    assert.deepEqual(await artists('AC/DC'), ['AC/DC']);
    assert.deepEqual(await artists('周杰伦/费玉清'), ['周杰伦', '费玉清'], 'a bare slash between CJK names splits');
    assert.deepEqual(await artists('Earth/Wind'), ['Earth/Wind'], 'a bare slash between Latin names does not');
    assert.deepEqual(await artists('A & B', 'C'), ['A & B', 'C'], 'several tag values stay as they are');
    const broken = await readAudioMetadata(
        flacWithTags([
            ['TITLE', 'ÓêÌìµÄ´°±ß'],
            ['ARTIST', 'Lo-fi Ê±¹â'],
            ['ALBUM', 'ÒôÀÖÄ£¿é²âÊÔ¼¯']
        ]),
        'tags.flac'
    );
    assert.deepEqual(
        [broken.title, broken.artists, broken.album, broken.mojibake],
        ['雨天的窗边', ['Lo-fi 时光'], '音乐模块测试集', 'gb18030']
    );
    assert.deepEqual(broken.tagsRaw.TITLE, ['ÓêÌìµÄ´°±ß']);
    assert.equal(broken.durationSamples, 44100);
    assert.equal(broken.audioMd5, null, 'an all-zero STREAMINFO MD5 means none');
});

check('metadata: ID3v2.3 slash splits are undone, SYLT becomes LRC', async () => {
    // An ID3v2.3 text frame in ISO-8859-1.
    const text = (id: string, value: string) => id3Frame(id, [0, ...latinBytes(value)]);
    const sylt = id3Frame('SYLT', [
        0,
        ...latinBytes('eng'),
        2,
        1,
        0,
        ...latinBytes('Hello'),
        0,
        0,
        0,
        0x03,
        0xe8,
        ...latinBytes('World'),
        0,
        0,
        0,
        0x09,
        0xc4
    ]);
    const uslt = id3Frame('USLT', [0, ...latinBytes('eng'), 0, ...latinBytes('Hello World')]);
    const parsed = await readAudioMetadata(
        mp3WithFrames([text('TIT2', 'Thunderstruck'), text('TPE1', 'AC/DC'), text('TPE2', 'AC/DC'), uslt, sylt]),
        'tagged.mp3'
    );
    assert.deepEqual(parsed.artists, ['AC/DC']);
    assert.equal(parsed.albumArtist, 'AC/DC');
    assert.equal(parsed.lyrics, '[00:01.00]Hello\n[00:02.50]World\n', 'synced lyrics win over plain ones');
    assert.equal(parsed.mojibake, null);
});

check('metadata: TTA, which music-metadata cannot parse, comes from its header', async () => {
    const out = path.join(path.dirname(fixtures), 'music-parsers-check', 'check.tta');
    const made = tool('ffmpeg', [
        '-v',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100:duration=3',
        '-ac',
        '2',
        '-c:a',
        'tta',
        out
    ]);
    if (made === null) {
        console.log('       (ffmpeg missing: TTA not checked)');
        return;
    }
    const tta = new File([readFileSync(out)], 'check.tta');
    assert.deepEqual(await sniffAudio(tta), { container: 'tta', codecHint: 'tta', mime: 'audio/x-tta' });
    const parsed = await readAudioMetadata(tta, 'check.tta');
    assert.deepEqual(
        [parsed.container, parsed.codec, parsed.lossless, parsed.sampleRate, parsed.bitDepth, parsed.channels],
        ['tta', 'tta', true, 44100, 16, 2]
    );
    assert.equal(parsed.durationSamples, 3 * 44100);
    assert.equal(parsed.durationMs, 3000);
    assert.equal(parsed.title, null);
    assert.equal(canBrowserPlay('tta', parsed.codec, 'safari'), 'no');
});

check('metadata: unreadable files throw a user-facing error', async () => {
    const noise = new File([new Uint8Array(2048).fill(0x5a)], 'noise.flac');
    await assert.rejects(readAudioMetadata(noise, 'noise.flac'), /读不出/);
});

// ------------------------------------------------------------------------------------------ ingest plan

check('ingest plan: the corpus folders', async () => {
    const files = walk(fixtures).map((relative) => ({
        file: new File([readFileSync(fixture(relative))], path.basename(relative)),
        path: `music-fixtures/${relative}`
    }));
    const plan = await planIngest(files);
    const audioCount = manifest.files.length;
    assert.equal(plan.items.length, audioCount);
    const byPath = new Map(plan.items.map((item) => [item.audio.path, item]));
    // The lyrics paths paired with an audio file of the lyrics folder.
    const lyricsOf = (name: string) =>
        byPath.get(`music-fixtures/lyrics/${name}.flac`)?.lyrics.map((file) => file.path);
    assert.deepEqual(lyricsOf('雨天的窗边'), ['music-fixtures/lyrics/雨天的窗边.lrc']);
    assert.deepEqual(lyricsOf('云朵上的下午'), ['music-fixtures/lyrics/云朵上的下午.lrc']);
    assert.deepEqual(lyricsOf('列车清晨'), []);
    const album = byPath.get('music-fixtures/gapless/album.flac');
    assert.equal(album?.cue?.path, 'music-fixtures/gapless/album.cue');
    assert.equal(album?.cover?.path, 'music-fixtures/gapless/cover.jpg');
    assert.equal(album?.key, `music-fixtures/gapless/album.flac:${statSync(fixture('gapless/album.flac')).size}`);
    assert.equal(album?.folder, 'music-fixtures/gapless');
    assert.equal(byPath.get('music-fixtures/gapless/01.flac')?.cue, null);
    assert.equal(byPath.get('music-fixtures/gapless/album-image.wv')?.cue, null);
    assert.equal(byPath.get('music-fixtures/formats/06-aac-256.m4a')?.cover?.path, 'music-fixtures/formats/cover.jpg');
    assert.equal(byPath.get('music-fixtures/lyrics/暖灯电台.flac')?.cover, null);
    assert.deepEqual(
        plan.ignored.map((entry) => [entry.file.path, entry.reason]),
        [
            ['music-fixtures/cover/cover.jpg', NOT_AUDIO_REASON],
            ['music-fixtures/cover/cover.png', NOT_AUDIO_REASON],
            ['music-fixtures/manifest.json', NOT_AUDIO_REASON]
        ]
    );
    const order = plan.items.map((item) => item.audio.path);
    assert.deepEqual(order.slice(0, 2), [
        'music-fixtures/formats/01-flac-16-44.flac',
        'music-fixtures/formats/02-flac-24-96.flac'
    ]);
    assert.ok(
        order.indexOf('music-fixtures/gapless/01.flac') >
            order.indexOf('music-fixtures/formats/16-flac-24-192-30s.flac')
    );
});

check('ingest plan: pairing rules', async () => {
    // A one-track CUE sheet whose FILE line names the given file.
    const cue = (fileLine: string) =>
        `PERFORMER "X"\nFILE "${fileLine}" WAVE\n  TRACK 01 AUDIO\n    INDEX 01 00:00:00\n`;
    const files: PickedFile[] = [
        picked('Album/01 Song.flac'),
        picked('Album/01 Song.lrc'),
        picked('Album/01 Song.en.lrc'),
        picked('Album/01 song.zh-Hant.lrc'),
        picked('Album/01 Song.txt'),
        picked('Album/02 Other.mp3'),
        picked('Album/02 Other.txt'),
        picked('Album/02 Other.jpg'),
        picked('Album/Folder.JPG'),
        picked('Album/back.png'),
        picked('Album/notes.pdf'),
        picked('Album/.DS_Store'),
        picked('Album/._01 Song.flac'),
        picked('Album/10 Last.flac'),
        picked('Album/2 Second.flac'),
        picked('Album/song.ncm'),
        picked('Album/x.qmcflac'),
        picked('Album/y.mflac0'),
        picked('Album/z.kgm'),
        picked('Album/w.kwm'),
        picked('Album/v.mgg1'),
        picked('Album/u.m4p'),
        picked('Single/only.ogg'),
        picked('Single/whatever.webp'),
        picked('Box/cover.png'),
        picked('Box/CD1/a.flac'),
        picked('Box/Disc 2/b.flac'),
        picked('Mixed/x.wav'),
        picked('Mixed/scan1.jpg'),
        picked('Mixed/scan2.jpg'),
        picked('Rip/Artist - Album.ape'),
        picked('Rip/Artist - Album.cue', cue('C:\\EAC\\Artist - Album.wav')),
        picked('Rip/broken.cue', 'TRACK 01 AUDIO\n'),
        picked('Rip/other.cue', cue('missing.wav')),
        picked('Accents/Café.flac'.normalize('NFD')),
        picked('Accents/any.cue', cue('Café.wav')),
        picked('loose.mp3', 'abc'),
        picked('loose.mp3', 'abc')
    ];
    const plan = await planIngest(files);
    // The item of an audio path.
    const item = (filePath: string) => plan.items.find((entry) => entry.audio.path === filePath);
    assert.deepEqual(
        plan.items.map((entry) => entry.audio.path),
        [
            'loose.mp3',
            'Accents/Café.flac'.normalize('NFD'),
            'Album/01 Song.flac',
            'Album/02 Other.mp3',
            'Album/2 Second.flac',
            'Album/10 Last.flac',
            'Box/CD1/a.flac',
            'Box/Disc 2/b.flac',
            'Mixed/x.wav',
            'Rip/Artist - Album.ape',
            'Single/only.ogg'
        ]
    );
    assert.equal(item('loose.mp3')?.key, '/loose.mp3:3');
    assert.deepEqual(
        item('Album/01 Song.flac')?.lyrics.map((file) => file.path),
        ['Album/01 Song.lrc', 'Album/01 Song.en.lrc', 'Album/01 song.zh-Hant.lrc']
    );
    assert.equal(item('Album/01 Song.flac')?.cover?.path, 'Album/Folder.JPG');
    assert.deepEqual(
        item('Album/02 Other.mp3')?.lyrics.map((file) => file.path),
        ['Album/02 Other.txt']
    );
    assert.equal(
        item('Album/02 Other.mp3')?.cover?.path,
        'Album/02 Other.jpg',
        'same-name image beats the folder cover'
    );
    assert.equal(item('Single/only.ogg')?.cover?.path, 'Single/whatever.webp', 'the only image in the folder');
    assert.equal(item('Box/CD1/a.flac')?.cover?.path, 'Box/cover.png', 'disc folders use the album folder cover');
    assert.equal(item('Box/Disc 2/b.flac')?.cover?.path, 'Box/cover.png');
    assert.equal(item('Mixed/x.wav')?.cover, null);
    assert.equal(item('Rip/Artist - Album.ape')?.cue?.path, 'Rip/Artist - Album.cue');
    assert.equal(item('Accents/Café.flac'.normalize('NFD'))?.cue?.path, 'Accents/any.cue');
    const reasons = Object.fromEntries(plan.ignored.map((entry) => [entry.file.path, entry.reason]));
    for (const name of ['song.ncm', 'x.qmcflac', 'y.mflac0', 'z.kgm', 'w.kwm', 'v.mgg1', 'u.m4p']) {
        assert.equal(reasons[`Album/${name}`], ENCRYPTED_REASON, name);
    }
    for (const name of [
        'Album/01 Song.txt',
        'Album/back.png',
        'Album/notes.pdf',
        'Album/.DS_Store',
        'Album/._01 Song.flac',
        'Mixed/scan1.jpg',
        'Rip/other.cue'
    ]) {
        assert.equal(reasons[name], NOT_AUDIO_REASON, name);
    }
    assert.match(reasons['Rip/broken.cue'], /FILE/, 'a broken sheet carries its parse error');
    assert.equal(plan.ignored.length, 16);
});

// Run every check in order and report; returns the counts for the runner's exit code.
export const run = async (fixtureFolder: string): Promise<{ passed: number; failed: number }> => {
    fixtures = fixtureFolder;
    manifest = JSON.parse(readFileSync(path.join(fixtures, 'manifest.json'), 'utf8'));
    let passed = 0;
    let failed = 0;
    for (const { name, run: body } of checks) {
        const started = performance.now();
        try {
            await body();
            passed += 1;
            console.log(`  ok    ${name} (${Math.round(performance.now() - started)} ms)`);
        } catch (error) {
            failed += 1;
            const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
            console.log(`  FAIL  ${name}\n        ${detail.split('\n').slice(0, 8).join('\n        ')}`);
        }
    }
    return { passed, failed };
};
