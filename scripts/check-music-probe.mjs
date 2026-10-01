// Browser check of the M0 device-check probes (src/lib/music/probe.ts, ai/features/music/m0.md).
// Serves tmp/music-fixtures from a second origin with Range support — /cors/ with CORS headers,
// /plain/ without — and asserts what Chromium reports: 206 for the two-byte request, sound and a
// working seek for FLAC, a Web Audio signal only when CORS is present, a clean failure for WavPack.
// Needs `pnpm dev` running, `python3 scripts/make-music-fixtures.py` already run, and playwright
// (scripts/lib/deps.mjs). Usage: node scripts/check-music-probe.mjs
import { dependency, baseUrl } from './lib/deps.mjs';
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = dependency('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'tmp/music-fixtures');
if (!existsSync(path.join(fixtures, 'manifest.json'))) {
    console.error('Run python3 scripts/make-music-fixtures.py first.');
    process.exit(2);
}

const TYPES = { '.flac': 'audio/flac', '.wv': 'audio/x-wavpack', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };

// A tiny static server that answers Range requests the way object storage does.
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const [, area, ...rest] = url.pathname.split('/');
    const cors = area === 'cors';
    if (cors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    }
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    const file = path.join(fixtures, ...rest.map(decodeURIComponent));
    if (!file.startsWith(fixtures) || !existsSync(file)) return res.writeHead(404).end();
    const size = statSync(file).size;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (!range) {
        res.writeHead(200, { 'Content-Length': size });
        return createReadStream(file).pipe(res);
    }
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
    channel: process.env.MUSIC_PROBE_BROWSER || undefined,
    args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage();
const failures = [];
page.on('pageerror', (error) => failures.push(String(error)));
try {
    await page.goto(`${baseUrl()}/scripts/fixtures/music-probe.html`);
    await page.locator('#status', { hasText: 'ready' }).waitFor();
    const probe = (fn, ...args) => page.evaluate(([name, list]) => window.musicProbe[name](...list), [fn, args]);

    const device = await probe('deviceReport');
    assert.ok(device.canPlay.FLAC, 'Chromium should claim FLAC');
    assert.equal(device.canPlay.WavPack, '', 'no browser claims WavPack');

    const output = await probe('outputReport');
    assert.ok(output && output.sampleRate >= 8000, 'an AudioContext reports the mixer rate');

    const range = await probe('rangeProbe', `${origin}/cors/formats/15-flac-16-44-4min.flac`);
    assert.equal(range.status, 206, 'two-byte request answers 206');
    assert.equal(range.bytes, 2, 'exactly two bytes come back');
    assert.match(range.contentRange ?? '', /^bytes 0-1\/\d+$/, 'Content-Range is readable through CORS');

    const flac = await probe('run', `${origin}/cors/formats/15-flac-16-44-4min.flac`);
    assert.ok(flac.playback.ok, `FLAC plays: ${flac.playback.error ?? ''}`);
    assert.ok(flac.playback.duration > 239 && flac.playback.duration < 241, 'duration is four minutes');
    assert.ok(flac.playback.seekMs !== null, 'seeking to the middle resumes');
    assert.ok(flac.webAudio.ok, `Web Audio hears the CORS file: ${flac.webAudio.error ?? ''}`);

    const hires = await probe('run', `${origin}/cors/formats/16-flac-24-192-30s.flac`);
    assert.ok(hires.playback.ok, `24/192 FLAC plays: ${hires.playback.error ?? ''}`);

    const plain = await probe('run', `${origin}/plain/formats/01-flac-16-44.flac`);
    assert.equal(plain.webAudio.ok, false, 'without CORS Web Audio gets nothing');
    assert.ok(plain.range.error, 'without CORS the fetch is refused');

    const wavpack = await probe('run', `${origin}/cors/formats/14-wavpack-16-44.wv`);
    assert.equal(wavpack.playback.ok, false, 'WavPack does not play');
    assert.ok(wavpack.playback.error, 'and says why');

    assert.deepEqual(failures, [], 'no page errors');
    console.log(
        JSON.stringify(
            {
                mixerRate: output.sampleRate,
                flac: { ...flac.playback, webAudioRms: flac.webAudio.peakRms },
                hires: hires.playback,
                noCors: { webAudio: plain.webAudio, range: plain.range.error },
                wavpack: wavpack.playback.error
            },
            null,
            2
        )
    );
    console.log('music probe check passed');
} finally {
    await browser.close();
    server.close();
}
