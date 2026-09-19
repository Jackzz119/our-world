// Fresh-browser, read-only fixtures. Never publishes a post or changes shared data.
import { dependency, baseUrl } from './lib/deps.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = dependency('playwright');
const sharp = dependency('sharp');
const dir = path.resolve('ai/design_system/uiux/cinnaglass/journal-room-object/turn-verification');
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const base = baseUrl();
const errors = [];
const results = {};
page.on('pageerror', (error) => errors.push(error.stack || error.message));
await page.addInitScript(() =>
    localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: 'night', weather: 'rain' }))
);
const words = [
    ['雨落了一整晚，屋里刚好暖。', '一起发呆，也是很好的约会。', '把这些小小的日子，慢慢收好。'],
    ['翻过这一页，明天也在一起。', '有你在，平凡的日子也会发光。', '窗外的雨，是今晚的背景音乐。'],
    ['今天在花园里发现了一朵小花。', '给你留了一杯热茶。', '不用赶路，慢慢看风景。'],
    ['风停了，窗边有一点点月光。', '把喜欢的故事，再讲一遍。', '日记的下一页，仍然写着我们。']
];
let historyMode = false;
let failOlder = false;
await page.route('**/rest/v1/rpc/get_feed_posts', async (route) => {
    const before = route.request().postDataJSON().p_before;
    if (historyMode && before && failOlder) {
        await route.fulfill({ status: 503, json: { message: 'Local history retry test' } });
        return;
    }
    const reply = await route.fetch();
    const original = (await reply.json())[0];
    const posts = words.flatMap((group, n) =>
        group.map((text, i) => ({
            ...original,
            post_id: `10000000-0000-4000-8000-${String(n * 3 + i).padStart(12, '0')}`,
            author_id: i === 1 ? '11111111-1111-4111-8111-111111111111' : original.author_id,
            created_at: `2026-09-${String(5 + n).padStart(2, '0')}T12:00:00Z`,
            privacy: 'shared',
            is_placeholder: false,
            visible_content: text,
            visible_images: i === 2 ? ['turn-review/photo.png'] : []
        }))
    );
    if (historyMode) {
        const count = before ? 3 : 20;
        await route.fulfill({
            json: Array.from({ length: count }, (_, i) => ({
                ...posts[i % posts.length],
                post_id: `20000000-0000-4000-8000-${String(i + (before ? 0 : 20)).padStart(12, '0')}`,
                created_at: `2026-${before ? '08' : '09'}-${String(count - i).padStart(2, '0')}T12:00:00Z`,
                visible_content: `${before ? '更早' : '现在'}的回忆 ${count - i}。`,
                visible_images: []
            }))
        });
    } else await route.fulfill({ json: posts.reverse() });
});
await page.route('**/storage/v1/object/sign/memories*', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
        json: body.paths.map((p) => ({
            path: p,
            signedURL: '/object/sign/memories/turn-review.png?token=test-only',
            error: null
        }))
    });
});
await page.route('**/storage/v1/object/sign/memories/turn-review.png?*', (route) =>
    route.fulfill({
        path: path.resolve(
            'ai/design_system/uiux/cinnaglass/journal-room-object/book-verification/reference-photo.png'
        ),
        contentType: 'image/png'
    })
);
const state = () =>
    page.evaluate(() => {
        const book = document.querySelector('.journal-room-book');
        return {
            page: Number(book.dataset.page),
            target: Number(book.dataset.target),
            busy: book.dataset.turning === 'true',
            pages: document.querySelector('.journal-room-pages').children.length,
            sheets: document.querySelectorAll('.journal-turn-sheet').length
        };
    });
const settle = () =>
    page.waitForFunction(() => document.querySelector('.journal-room-book')?.dataset.turning === 'false', null, {
        timeout: 20000
    });
const jumpFirst = async () => {
    await page.locator('.journal-bookmark').click();
    await page.locator('.journal-index-dates button').first().click();
    await settle();
    assert.equal((await state()).page, 0);
};
try {
    await page.goto(`${base}/?enter=1&surface=timeline`);
    await page.locator('.journal-room-entry').first().waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1800);
    await jumpFirst();
    assert.equal((await state()).pages, 8);
    await page.screenshot({ path: path.join(dir, 'runtime-flat.png') });

    // Single turn: inspect actual browser DOM while a sheet is upright.
    await page.locator('.journal-room-next').click();
    await page.waitForFunction(() => {
        const p = Number(document.querySelector('.journal-turn-sheet')?.dataset.progress);
        return p >= 0.3 && p <= 0.7;
    });
    results.single = await page.evaluate(() => {
        const sheet = document.querySelector('.journal-turn-sheet');
        const front = sheet.querySelector('.journal-turn-front .journal-turn-copy');
        const back = sheet.querySelector('.journal-turn-back .journal-turn-copy');
        return {
            from: sheet.dataset.from,
            to: sheet.dataset.to,
            progress: sheet.dataset.progress,
            frontText: [...front.querySelectorAll('.journal-copy')].map((n) => n.textContent),
            backText: [...back.querySelectorAll('.journal-copy')].map((n) => n.textContent),
            photo: [...front.querySelectorAll('.journal-photo img')].every(
                (img) => img.complete && img.naturalWidth > 0
            ),
            nextText: document.querySelector('.journal-turn-bases .journal-turn-copy.--right').textContent,
            strips: sheet.querySelectorAll('.journal-turn-strip').length,
            lifted: [...sheet.querySelectorAll('.journal-turn-strip')].some(
                (n) => new DOMMatrix(getComputedStyle(n).transform).m43 > 150
            ),
            sourceHidden: getComputedStyle(document.querySelector('.journal-room-pages')).visibility === 'hidden',
            inert: document.querySelector('.journal-turn-stage').inert,
            backface: getComputedStyle(sheet.querySelector('.journal-turn-back')).backfaceVisibility
        };
    });
    await page.screenshot({ path: path.join(dir, 'runtime-upright.png') });
    assert.deepEqual(results.single.frontText, [words[0][2]]);
    assert.deepEqual(results.single.backText, words[1].slice(0, 2));
    assert.ok(results.single.nextText.includes(words[1][2]));
    assert.ok(results.single.photo && results.single.lifted && results.single.sourceHidden && results.single.inert);
    assert.equal(results.single.backface, 'hidden');
    await settle();
    assert.equal((await state()).page, 2);
    assert.equal((await state()).sheets, 0);

    await jumpFirst();
    // Observe timing without screenshots, which themselves stall the renderer.
    results.continuous = await page.evaluate(async () => {
        const times = [];
        let maxSheets = 0;
        let last = performance.now();
        let blurred = false;
        const button = document.querySelector('.journal-room-next');
        button.click();
        button.click();
        button.click();
        const start = performance.now();
        await new Promise((resolve) => {
            function tick(now) {
                times.push(now - last);
                last = now;
                maxSheets = Math.max(maxSheets, document.querySelectorAll('.journal-turn-sheet').length);
                const copy = document.querySelector('.journal-turn-copy .journal-copy');
                if (copy && getComputedStyle(copy).filter.includes('blur')) blurred = true;
                if (document.querySelector('.journal-turn-stage')) requestAnimationFrame(tick);
                else resolve();
            }
            requestAnimationFrame(tick);
        });
        times.sort((a, b) => a - b);
        return {
            maxSheets,
            blurred,
            frames: times.length,
            p50: times[Math.floor(times.length * 0.5)],
            p95: times[Math.floor(times.length * 0.95)],
            elapsed: performance.now() - start
        };
    });
    assert.equal((await state()).page, 6);
    assert.ok(results.continuous.maxSheets >= 2 && results.continuous.maxSheets <= 3);
    assert.equal(results.continuous.blurred, false);
    await page.screenshot({ path: path.join(dir, 'runtime-destination.png') });

    // Reverse, including a direction change while in flight.
    await page.locator('.journal-room-prev').click();
    await page.waitForTimeout(220);
    await page.locator('.journal-room-next').click();
    await settle();
    assert.equal((await state()).page, 6);
    await page.locator('.journal-room-prev').click();
    await settle();
    assert.equal((await state()).page, 4);
    results.reverse = true;

    // Starting an editor cancels at the nearest spread, not at the queued endpoint.
    await page.locator('.journal-room-prev').click();
    await page.locator('.compose-collapsed').click();
    assert.equal((await state()).busy, false);
    const textarea = page.getByPlaceholder('今天发生了什么温柔的事？');
    await textarea.fill('翻页中的草稿检查，不发布。');
    await textarea.press('ArrowLeft');
    assert.equal((await state()).busy, false);
    await textarea.press('Escape');
    await page.locator('.compose-collapsed.draft').click();
    assert.equal(await textarea.inputValue(), '翻页中的草稿检查，不发布。');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    results.draft = true;

    await page.locator('.journal-room-prev').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(550);
    assert.equal((await state()).busy, false);
    assert.equal(await page.locator('.journal-room-pages > :not([hidden])').count(), 1);
    await jumpFirst();
    await page.locator('.journal-room-next').click();
    await page.waitForTimeout(380);
    await page.screenshot({ path: path.join(dir, 'runtime-mobile-upright.png') });
    await settle();
    assert.equal((await state()).page, 1);
    await page.locator('.journal-room-prev').click();
    await settle();
    assert.equal((await state()).page, 0);
    results.resizeAndMobile = true;

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.journal-room-next').click();
    assert.equal((await state()).page, 1);
    assert.equal((await state()).sheets, 0);
    results.reducedMotion = true;
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(450);
    await jumpFirst();
    await page.locator('.journal-room-next').click();
    await page.locator('.diary-surface .object-x').click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.journal-turn-stage').count(), 0);
    results.close = true;

    await page.goto(`${base}/?enter=1&surface=timeline`);
    await page.locator('.journal-room-entry').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(1100);
    // Pixel changes on the actual scene canvas prove it continues rendering.
    const canvas = page.locator('.room-scene canvas');
    const first = await canvas.screenshot();
    await page.waitForTimeout(450);
    const second = await canvas.screenshot();
    results.roomKeepsRunning = !first.equals(second);
    assert.equal(results.roomKeepsRunning, true);

    // Numeric geometry and signed-image refresh, using the same renderer module.
    results.geometry = await page.evaluate(async () => {
        const { sheetPose, JournalTurnStage } = await import('/src/themes/cinnaglass/journal/turn.ts');
        let maxLengthError = 0;
        for (const direction of [1, -1])
            for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
                const poses = sheetPose(progress, direction, 434);
                for (let i = 1; i < poses.length; i++) {
                    const d = Math.hypot(poses[i].x - poses[i - 1].x, poses[i].z - poses[i - 1].z);
                    maxLengthError = Math.max(maxLengthError, Math.abs(d - 434 / 24));
                }
            }
        const pages = [...document.querySelector('.journal-room-pages').children];
        const stage = new JournalTurnStage(pages, {
            width: 434,
            height: 542,
            bookWidth: 1040,
            bookHeight: 670,
            left: 78,
            top: 29.48,
            single: false
        });
        stage.render(0, [{ id: 1, from: 0, to: 2, direction: 1, progress: 0.49 }]);
        const firstImage = stage.element.querySelector('img[data-image-path]');
        const oldUrl = firstImage.src;
        stage.updateImages(() => `${location.origin}/ui/journal/avatar-blue.webp?renewed=1`);
        const renewed = [...stage.element.querySelectorAll('img[data-image-path]')].every(
            (img) => img.src.endsWith('?renewed=1') && img.alt === '回忆照片'
        );
        stage.destroy();
        return { maxLengthError, oldUrlWasPresent: !!oldUrl, renewed };
    });
    assert.ok(results.geometry.maxLengthError < 1e-10 && results.geometry.renewed);

    // Loading earlier history keeps the same remembered paragraph; failure keeps
    // its contents and offers the existing explicit retry, not invented pages.
    historyMode = true;
    await page.reload();
    await page.locator('.journal-room-entry').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(550);
    const remembered = await page
        .locator('.journal-room-pages > :not([hidden]) .journal-entry')
        .first()
        .getAttribute('data-post-id');
    const originalPages = (await state()).pages;
    await page.locator('.journal-bookmark').click();
    failOlder = true;
    await page.getByRole('button', { name: '载入更早的回忆', exact: true }).click();
    await page.waitForTimeout(650);
    assert.equal((await state()).pages, originalPages);
    assert.equal(await page.getByRole('button', { name: '载入更早的回忆', exact: true }).isEnabled(), true);
    failOlder = false;
    await page.getByRole('button', { name: '载入更早的回忆', exact: true }).click();
    await page.waitForFunction((n) => document.querySelector('.journal-room-pages').children.length > n, originalPages);
    assert.equal(
        await page.locator(`.journal-room-pages > :not([hidden]) .journal-entry[data-post-id="${remembered}"]`).count(),
        1
    );
    results.historyPreservesAnchorAndRetries = true;

    historyMode = false;
    await page.reload();
    await page.locator('.journal-room-entry').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(650);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await jumpFirst();
    // Repeated mount/cleanup of moving layers must not accumulate inert copies.
    for (let i = 0; i < 20; i++) {
        await page.locator('.journal-room-next').click();
        await page.locator('.journal-room-prev').click();
    }
    assert.equal((await state()).sheets, 0);
    assert.equal(await page.locator('.journal-turn-stage').count(), 0);
    results.repeatedReducedCleanup = true;
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    if (process.env.JOURNAL_EXPORT_GIF) {
        // Advance the actual app's clock frame by frame; this isn't a mock render.
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 100));
        for (const kind of ['single', 'continuous']) {
            if (kind === 'continuous') {
                await page.evaluate(() => document.querySelector('.journal-room-prev').click());
                await page.clock.runFor(1100);
            }
            const frames = [];
            for (let i = 0; i <= 28; i++) {
                if (i === 1)
                    await page.evaluate((kind) => {
                        const button = document.querySelector('.journal-room-next');
                        button.click();
                        if (kind === 'continuous') {
                            button.click();
                            button.click();
                        }
                    }, kind);
                if (i) await page.clock.runFor(40);
                const png = await page.screenshot();
                if ([0, 7, 13, 19, 28].includes(i)) await writeFile(path.join(dir, `live-${kind}-${i}.png`), png);
                frames.push(await sharp(png).resize(960, 600).removeAlpha().raw().toBuffer());
            }
            await sharp(Buffer.concat(frames), {
                raw: { width: 960, height: 600 * frames.length, channels: 3, pageHeight: 600 }
            })
                .gif({
                    loop: 0,
                    delay: frames.map((_, i) => (i === 0 || i === frames.length - 1 ? 650 : 40)),
                    effort: 7,
                    dither: 0.25
                })
                .toFile(path.join(dir, `live-${kind}.gif`));
            assert.equal((await state()).page, kind === 'single' ? 2 : 6);
            console.log('exported actual app', kind);
        }
    }
    const docsPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    docsPage.on('pageerror', (error) => errors.push(error.stack || error.message));
    await docsPage.goto(`${base}/ai/design_system/uiux/cinnaglass/ui-system.html#journal-turn`);
    for (const name of ['live-single.gif', 'live-continuous.gif']) {
        const preview = docsPage.locator(`img[src$="/${name}"]`);
        await preview.scrollIntoViewIfNeeded();
        await preview.evaluate((img) => img.decode());
    }
    results.designSystem = await docsPage.evaluate(() => ({
        liveCss: [...document.styleSheets].some((sheet) => sheet.href?.includes('journal-turn.css')),
        gifs: [...document.images].filter(
            (img) => /live-(single|continuous)\.gif$/.test(img.src) && img.naturalWidth === 960
        ).length
    }));
    assert.equal(results.designSystem.liveCss, true);
    assert.equal(results.designSystem.gifs, 2);
    await docsPage.locator('#journal-turn').scrollIntoViewIfNeeded();
    await docsPage.screenshot({ path: path.join(dir, 'design-system-turn.png') });
    await docsPage.close();
    assert.deepEqual(errors, []);
    results.errors = errors;
    await writeFile(path.join(dir, 'runtime-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
} catch (error) {
    console.log(JSON.stringify({ results, errors }, null, 2));
    await page.screenshot({ path: path.join(dir, 'runtime-failure.png') });
    throw error;
} finally {
    await browser.close();
}
