// End-to-end check of the music library in Chromium (ai/features/music/impl.md §七): the production
// player over the in-memory backend (scripts/fixtures/music-library.html). Uploads part of the test
// corpus through the upload page, then checks the library, playback from the stored original, a
// gapless move from one CUE slice to the next (same element, same source, the clock keeps going),
// lyrics, the quality page (version switch, download to this device), and the phone sheet; saves
// screenshots for the UX docs.
// Needs the dev server (without .env.local: VITE_SUPABASE_URL=https://example.supabase.co
// VITE_SUPABASE_ANON_KEY=x pnpm dev), `python3 scripts/make-music-fixtures.py`, and playwright
// (scripts/lib/deps.mjs). Usage: DIARY_NODE_MODULES=$(npm root -g) node scripts/check-music-library.mjs [--shots <dir>]
// Files go in as buffers with their names: Playwright's path form silently drops files whose names
// are not ASCII (雨天的窗边.flac) in some locales.
import { dependency, baseUrl } from './lib/deps.mjs';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = dependency('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = path.join(root, 'tmp/music-fixtures');
if (!existsSync(path.join(corpus, 'manifest.json'))) {
    console.error('Run python3 scripts/make-music-fixtures.py first.');
    process.exit(2);
}
const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? path.resolve(args[shotsAt + 1]) : path.join(root, 'tmp/music-shots');
mkdirSync(shots, { recursive: true });

const results = [];
const check = async (name, fn) => {
    try {
        await fn();
        results.push([name, 'ok']);
    } catch (error) {
        results.push([name, `FAIL: ${error instanceof Error ? error.message.split('\n')[0] : error}`]);
    }
};
const URL_BASE = `${baseUrl()}/scripts/fixtures/music-library.html`;
const UPLOAD = [
    'lyrics/雨天的窗边.flac',
    'lyrics/雨天的窗边.lrc',
    'gapless/album.flac',
    'gapless/album.cue',
    'gapless/cover.jpg',
    'formats/02-flac-24-96.flac',
    'formats/07-mp3-320-gbk-tags.mp3',
    'formats/14-wavpack-16-44.wv'
].map((p) => ({
    name: path.basename(p),
    mimeType: 'application/octet-stream',
    buffer: readFileSync(path.join(corpus, p))
}));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];

// ---------- desktop: upload through the page, then play ----------
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
desk.on('pageerror', (e) => errors.push(`desk: ${e}`));
await desk.goto(URL_BASE);
const dock = desk.locator('.music-dock');
await dock.waitFor();

await check('empty library offers the first upload', async () => {
    await dock.getByRole('tab', { name: '曲库' }).click();
    await dock.getByText('还没有上传的歌').waitFor();
});

await check('the upload page reads the picked files', async () => {
    await dock.getByRole('button', { name: '上传第一首' }).click();
    await dock.getByRole('heading', { name: '上传音乐' }).waitFor();
    await dock.locator('input[type=file]').first().setInputFiles(UPLOAD);
    await dock.locator('.mp-draft').nth(4).waitFor({ timeout: 20000 });
    await desk.waitForFunction(() => !document.querySelector('.mp-draft[data-status="analyzing"]'), null, {
        timeout: 60000
    });
    const cards = await dock.locator('.mp-draft').allInnerTexts();
    const all = cards.join('\n');
    assert.match(all, /CUE 整轨 · 3 首/, 'the CUE album shows three slices');
    assert.match(all, /歌词 · 同名 lrc/, 'the .lrc pairs by name');
    assert.match(all, /Hi-Res · FLAC 24\/96/, 'the 24/96 file is Hi-Res');
    const titles = await dock.locator('.mp-draft-title').evaluateAll((els) => els.map((e) => e.value ?? e.textContent));
    assert.ok(
        titles.filter((t) => t === '雨天的窗边').length >= 2,
        `GBK tags come back as Chinese (${titles.join(' | ')})`
    );
    assert.match(all, /修复了乱码/, 'the repair is reported');
    assert.match(all, /WavPack|放不了/, 'WavPack is flagged as not playable here');
    await desk.waitForTimeout(900); // let the entrance animations finish
    await desk.screenshot({ path: path.join(shots, 'music-upload-desk.png') });
});

await check('uploading puts every song into the library', async () => {
    await dock.getByRole('button', { name: /上传 \d+ 首/ }).click();
    await desk.waitForFunction(
        () =>
            [...document.querySelectorAll('.mp-draft')].every((d) =>
                ['done', 'duplicate', 'failed', 'taken'].includes(d.getAttribute('data-status'))
            ),
        null,
        { timeout: 180000 }
    );
    const failed = await dock.locator('.mp-draft[data-status="failed"]').allInnerTexts();
    assert.equal(failed.length, 0, `failed: ${failed.join(' | ')}`);
    await desk.waitForTimeout(900); // let the entrance animations finish
    await desk.screenshot({ path: path.join(shots, 'music-upload-done-desk.png') });
});

await check('the library lists the uploads with their formats', async () => {
    await dock.getByRole('button', { name: '回到播放器' }).click();
    await dock.getByRole('tab', { name: '曲库' }).click();
    await dock.locator('ul[aria-label="曲库"] .mp-row').nth(5).waitFor();
    const text = await dock.locator('ul[aria-label="曲库"]').innerText();
    assert.match(text, /整轨第 1 段/, 'CUE slices are rows');
    assert.match(text, /Hi-Res · FLAC 24\/96/, 'format labels show');
    await desk.waitForTimeout(900); // let the entrance animations finish
    await desk.screenshot({ path: path.join(shots, 'music-library-desk.png') });
});

const engineState = () => desk.evaluate(() => window.__owMusic.engine.getState());
const element = () =>
    desk.evaluate(() => {
        const a = window.__owMusic.element;
        return { src: a.src, time: a.currentTime, paused: a.paused };
    });

await check('a tap plays the stored original', async () => {
    await dock.locator('ul[aria-label="曲库"] .mp-row', { hasText: '雨天的窗边' }).first().click();
    await desk.waitForFunction(() => window.__owMusic?.engine.getState().status === 'playing', null, {
        timeout: 15000
    });
    const a = await element();
    assert.ok(!a.paused, 'the element plays');
    assert.match(a.src, /^blob:/, 'from the stored object');
    const s = await engineState();
    assert.equal(s.version, 'original');
});

await check('lyrics follow the song', async () => {
    await dock.getByRole('tab', { name: '歌词' }).click();
    await dock.locator('.mp-lyrics button[aria-current="true"]').waitFor({ timeout: 20000 });
    const first = await dock.locator('.mp-lyrics button[aria-current="true"]').innerText();
    await desk.evaluate(() => window.__owMusic.engine.seek(31000));
    await desk.waitForFunction(
        (before) => document.querySelector('.mp-lyrics button[aria-current="true"]')?.textContent !== before,
        first,
        { timeout: 8000 }
    );
    await desk.waitForTimeout(900); // let the entrance animations finish
    await desk.screenshot({ path: path.join(shots, 'music-lyrics-desk.png') });
});

await check('one CUE slice runs into the next without a gap', async () => {
    await dock.getByRole('tab', { name: '曲库' }).click();
    await dock.locator('ul[aria-label="曲库"] .mp-row', { hasText: '整轨第 1 段' }).first().click();
    await desk.waitForFunction(() => window.__owMusic.engine.getState().status === 'playing', null, { timeout: 15000 });
    const first = await engineState();
    const before = await element();
    // jump to 1.2 s before the end of the slice and listen across the boundary
    await desk.evaluate((ms) => window.__owMusic.engine.seek(ms), first.durationMs - 1200);
    await desk.waitForFunction((index) => window.__owMusic.engine.getState().index !== index, first.index, {
        timeout: 8000
    });
    const second = await engineState();
    const after = await element();
    assert.equal(after.src, before.src, 'the same source keeps playing');
    assert.ok(!after.paused, 'it never paused');
    assert.ok(second.positionMs < 1500, `the new slice starts at its beginning (${second.positionMs} ms)`);
    assert.equal(second.queue[second.index].title !== first.queue[first.index].title, true, 'the title moved on');
});

await check('the quality page switches versions and keeps a download', async () => {
    await dock.locator('.mp-badge').click();
    await dock.getByRole('heading', { name: '这首歌的音质' }).waitFor();
    await desk.waitForTimeout(900); // let the entrance animations finish
    await desk.screenshot({ path: path.join(shots, 'music-quality-desk.png') });
    const compact = dock.getByRole('radio', { name: /^省流/ });
    if (await compact.isEnabled()) {
        await compact.click();
        await desk.waitForFunction(() => window.__owMusic.engine.getState().version === 'compact', null, {
            timeout: 15000
        });
        await dock.getByRole('radio', { name: /^自动/ }).click();
        await desk.waitForFunction(() => window.__owMusic.engine.getState().version === 'original', null, {
            timeout: 15000
        });
    } else {
        results.push(['(note) no compact copy was made in this browser', 'skipped']);
    }
    await dock.getByRole('button', { name: /把原件存到这台设备/ }).click();
    await dock.getByRole('button', { name: /原件已存在这台设备/ }).waitFor({ timeout: 30000 });
    await desk.waitForFunction(() => window.__owMusic.engine.getState().local === true, null, { timeout: 15000 });
});

// ---------- phone: the sheet ----------
const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
});
phone.on('pageerror', (e) => errors.push(`phone: ${e}`));
await check('the phone sheet shows the seeded library', async () => {
    await phone.goto(`${URL_BASE}?seed=1`);
    await phone.waitForFunction(() => window.__music?.seeded === true, null, { timeout: 120000 });
    const seedErrors = await phone.evaluate(() => window.__music.seedErrors);
    assert.deepEqual(seedErrors, [], 'the seed went through');
    const sheet = phone.locator('.music-sheet');
    await sheet.waitFor();
    await phone.waitForTimeout(600);
    await phone.screenshot({ path: path.join(shots, 'music-now-phone.png') });
    await sheet.getByRole('tab', { name: '曲库' }).click();
    await phone.waitForTimeout(700);
    await sheet.locator('ul[aria-label="曲库"] .mp-row').nth(3).waitFor();
    await phone.screenshot({ path: path.join(shots, 'music-library-phone.png') });
    await sheet
        .getByRole('button', { name: /的更多操作/ })
        .first()
        .click();
    await phone.waitForTimeout(400);
    await phone.screenshot({ path: path.join(shots, 'music-row-actions-phone.png') });
    await sheet.getByRole('button', { name: /^上传$/ }).click();
    await phone.waitForTimeout(500);
    await phone.screenshot({ path: path.join(shots, 'music-upload-phone.png') });
});

await browser.close();
const width = Math.max(...results.map(([n]) => n.length));
for (const [name, outcome] of results) console.log(`${name.padEnd(width)}  ${outcome}`);
if (errors.length) console.log(`page errors:\n  ${errors.join('\n  ')}`);
console.log(`screenshots: ${shots}`);
const failed = results.filter(([, o]) => o.startsWith('FAIL')).length + errors.length;
if (failed) {
    console.error(`${failed} problem(s)`);
    process.exit(1);
}
console.log('music library check passed');
