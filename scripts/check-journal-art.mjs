// Visual and read-only regression checks. Synthetic examples are intercepted
// only inside this fresh browser, never inserted into the shared database.
import { dependency, baseUrl } from './lib/deps.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = dependency('playwright');
const sharp = dependency('sharp');
const dir = path.resolve('ai/design_system/uiux/cinnaglass/journal-room-object/book-verification');
await mkdir(dir, { recursive: true });
const reference = path.resolve('ai/design_system/uiux/cinnaglass/journal-room-object/room-journal-concept.png');
await sharp(reference)
    .extract({ left: 828, top: 224, width: 328, height: 209 })
    .png()
    .toFile(path.join(dir, 'reference-photo.png'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const base = baseUrl();
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || e.message));
await page.addInitScript(() => {
    if (!localStorage.getItem('ow-tweaks-v1'))
        localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: 'night', weather: 'rain' }));
});
const images = [];
try {
    await page.goto(`${base}/?enter=1&surface=timeline`);
    await page.locator('.journal-room-entry').first().waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(dir, 'real-memories.png') });
    const measurements = [];
    for (const [width, height] of [
        [1440, 900],
        [960, 700],
        [640, 400],
        [390, 844]
    ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(450);
        const metrics = await page.evaluate(() => {
            const surface = document.querySelector('.diary-surface');
            const leaves = [...document.querySelectorAll('.journal-room-leaf:not([hidden])')];
            const rect = surface.getBoundingClientRect();
            return {
                viewport: [innerWidth, innerHeight],
                book: rect.toJSON(),
                center: [rect.x + rect.width / 2, rect.y + rect.height / 2],
                visiblePages: leaves.length,
                overflow: leaves.map((leaf) => {
                    const body = leaf.querySelector('.journal-page-content');
                    return [body.scrollWidth - body.clientWidth, body.scrollHeight - body.clientHeight];
                }),
                font: getComputedStyle(leaves[0].querySelector('.journal-copy') || leaves[0]).fontFamily,
                noFlipEngine: document.querySelectorAll('.stf__parent').length === 0,
                quillPointerEvents: getComputedStyle(document.querySelector('.journal-room-quill')).pointerEvents,
                nav: document.querySelector('.rail').getBoundingClientRect().toJSON()
            };
        });
        await page.screenshot({ path: path.join(dir, `real-${width}.png`) });
        measurements.push(metrics);
        assert.ok(
            metrics.overflow.every(([x, y]) => x <= 1 && y <= 1),
            JSON.stringify(metrics)
        );
        assert.equal(metrics.center[0], width / 2);
        if (width >= 768 && height >= 600) assert.ok(Math.abs(metrics.center[1] - height / 2) < 1);
        assert.equal(metrics.visiblePages, width >= 768 && height >= 600 ? 2 : 1);
        assert.equal(metrics.noFlipEngine, true);
        assert.equal(metrics.quillPointerEvents, 'none');
        assert.match(metrics.font, /Journal WenKai/);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(350);
    await page.locator('.journal-bookmark').click();
    await page.locator('.journal-index-dates button').first().click();
    await page.locator('.compose-collapsed').click();
    const textarea = page.getByPlaceholder('今天发生了什么温柔的事？');
    await textarea.fill('旧纸书本草稿检查，不发布。');
    await page
        .locator('.compose input[type=file]')
        .setInputFiles(Array(10).fill(path.resolve('public/avatars/blue.png')));
    assert.equal(await page.locator('.compose .pk').count(), 9);
    await textarea.press('Escape');
    await page.locator('.compose-collapsed.draft').click();
    assert.equal(await textarea.inputValue(), '旧纸书本草稿检查，不发布。');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.locator('.journal-room-leaf:not([hidden]) .journal-open').first().focus();
    await page.locator('.journal-room-leaf:not([hidden]) .journal-open').first().click();
    await page.getByRole('dialog', { name: '回忆详情', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭回忆详情' }).press('Escape');
    assert.equal(await page.locator('.pd').count(), 0);

    // Same-content comparison in the actual product UI. No backend writes.
    await page.route('**/rest/v1/rpc/get_feed_posts', async (route) => {
        const reply = await route.fetch();
        const actual = await reply.json();
        const original = actual[0];
        const create = (n, text, author, photos = []) => ({
            ...original,
            post_id: `art-review-${n}`,
            author_id: author,
            created_at: `2026-09-0${n + 4}T20:00:00Z`,
            updated_at: `2026-09-0${n + 4}T20:00:00Z`,
            visible_content: text,
            visible_images: photos,
            is_placeholder: false
        });
        await route.fulfill({
            json: [
                create(3, '把这些小小的日子，慢慢收好。', original.author_id, ['art-review/photo.png']),
                create(2, '一起发呆，也是很好的约会。', '11111111-1111-4111-8111-111111111111'),
                create(1, '雨落了一整晚，屋里刚好暖。', original.author_id)
            ]
        });
    });
    await page.route('**/storage/v1/object/sign/memories*', async (route) => {
        const body = route.request().postDataJSON();
        await route.fulfill({
            json: body.paths.map((p) => ({
                path: p,
                signedURL: '/object/sign/memories/art-review.png?token=visual-only',
                error: null
            }))
        });
    });
    await page.route('**/storage/v1/object/sign/memories/art-review.png?*', (route) =>
        route.fulfill({ path: path.join(dir, 'reference-photo.png'), contentType: 'image/png' })
    );
    await page.goto(`${base}/?enter=1&surface=timeline`);
    await page.locator('.journal-room-entry').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(800);
    for (const mood of ['night', 'golden', 'twilight']) {
        if (mood !== 'night') {
            await page.evaluate(
                (value) => localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: value, weather: 'rain' })),
                mood
            );
            await page.reload();
            await page.locator('.journal-room-entry').first().waitFor({ state: 'attached' });
            await page.waitForTimeout(1100);
        }
        await page.screenshot({ path: path.join(dir, `design-content-${mood}.png`) });
        const box = await page.locator('.diary-surface').boundingBox();
        await page.screenshot({
            path: path.join(dir, `book-${mood}.png`),
            clip: {
                x: Math.floor(box.x),
                y: Math.floor(box.y),
                width: Math.ceil(box.width),
                height: Math.ceil(box.height)
            }
        });
        images.push({ mood, box });
    }
    const pagination = [];
    for (const [viewport, dimensions] of [
        [
            [1440, 900],
            [434, 542]
        ],
        [
            [960, 700],
            [334, 417]
        ],
        [
            [640, 400],
            [344, 255]
        ],
        [
            [390, 844],
            [303, 547]
        ]
    ]) {
        await page.setViewportSize({ width: viewport[0], height: viewport[1] });
        await page.waitForTimeout(250);
        const outcome = await page.evaluate(async ([width, height]) => {
            const { buildJournalPages } = await import('/src/themes/cinnaglass/journal-layout.ts');
            const content = ('雨天与旧日记。👩🏽‍🌾🌷\n' + 'unbroken-long-link-'.repeat(12) + '\n').repeat(6);
            const post = {
                post_id: 'local-layout',
                author_id: 'local',
                created_at: '2026-09-07T12:00:00Z',
                visible_content: content,
                visible_images: Array.from({ length: 9 }, (_, i) => `photo-${i}.png`)
            };
            const pages = buildJournalPages([post], width, height, {
                profiles: {},
                userId: 'local',
                urls: {},
                roomArt: true
            });
            const parts = pages.flatMap((p) => p.parts);
            let overflow = 0;
            const wrapper = document.createElement('div');
            wrapper.className = 'journal-room-book';
            wrapper.style.cssText = 'position:fixed;left:-20000px;top:0;visibility:hidden';
            document.body.append(wrapper);
            for (const { element } of pages) {
                wrapper.replaceChildren(element);
                const body = element.querySelector('.journal-page-content');
                overflow = Math.max(
                    overflow,
                    body.scrollHeight - body.clientHeight,
                    body.scrollWidth - body.clientWidth
                );
            }
            wrapper.remove();
            return {
                width,
                height,
                pages: pages.length,
                textPreserved: parts.map((p) => p.text).join('') === content,
                photosPreserved: JSON.stringify(parts.flatMap((p) => p.images)) === JSON.stringify(post.visible_images),
                overflow
            };
        }, dimensions);
        pagination.push(outcome);
        assert.ok(outcome.textPreserved && outcome.photosPreserved && outcome.overflow <= 1, JSON.stringify(outcome));
    }
    for (const name of ['book-open.webp', 'book-single.webp', 'quill.webp']) {
        const meta = await sharp(path.resolve('public/ui/journal', name)).metadata();
        assert.equal(meta.hasAlpha, true, name);
    }
    const docsPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    docsPage.on('pageerror', (error) => errors.push(error.message));
    await docsPage.goto(`${base}/ai/design_system/uiux/cinnaglass/ui-system.html#journal-static-art`);
    const sample = docsPage.locator('img[src="journal-room-object/book-verification/design-content-night.png"]');
    await sample.scrollIntoViewIfNeeded();
    await sample.evaluate((img) => img.decode());
    const docs = await docsPage.evaluate(() => ({
        liveCss: [...document.styleSheets].some((sheet) => sheet.href?.includes('journal-room.css')),
        sampleLoaded: [...document.images].some(
            (img) => img.src.endsWith('/design-content-night.png') && img.complete && img.naturalWidth === 1440
        )
    }));
    assert.equal(docs.liveCss && docs.sampleLoaded, true);
    await docsPage.screenshot({ path: path.join(dir, 'design-system.png') });
    await docsPage.close();
    assert.deepEqual(errors, []);
    await writeFile(
        path.join(dir, 'results.json'),
        JSON.stringify({ measurements, images, pagination, draft: true, detail: true, docs, errors }, null, 2)
    );
    console.log(JSON.stringify({ measurements, pagination, errors }, null, 2));
} catch (error) {
    await page.screenshot({ path: path.join(dir, 'failure.png') });
    throw error;
} finally {
    await browser.close();
}
