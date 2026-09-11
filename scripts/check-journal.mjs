// Local read-only browser checks. Never publishes or mutates shared records.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const dependency = (name) =>
    require(process.env.DIARY_NODE_MODULES ? path.join(process.env.DIARY_NODE_MODULES, name) : name);
const { chromium } = dependency('playwright');
const output = path.resolve('ai/design_system/cinnaglass/journal-book-directions/verification');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text().slice(0, 400));
});
page.on('requestfailed', (request) => console.error(new URL(request.url()).pathname, request.failure()?.errorText));
await page.addInitScript(() =>
    localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: 'night', weather: 'rain' }))
);
const results = [];
try {
    await page.goto(`${process.env.JOURNAL_URL || 'http://localhost:5175'}/?enter=1&surface=timeline`);
    await page.locator('.journal-entry').first().waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: '关闭我们的日记', exact: true }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(output, 'room-closed.png') });
    await page.goto(`${process.env.JOURNAL_URL || 'http://localhost:5175'}/?enter=1&surface=timeline`);
    await page.locator('.journal-entry').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    for (const [width, height] of [
        [1440, 900],
        [960, 700],
        [640, 400],
        [390, 844]
    ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(output, `night-${width}.png`) });
        const metrics = await page.evaluate(() => {
            const book = document.querySelector('.diary-surface');
            const pages = [...document.querySelectorAll('.journal-page[aria-hidden="false"]')];
            return {
                viewport: [innerWidth, innerHeight],
                book: book.getBoundingClientRect().toJSON(),
                visiblePages: pages.length,
                pageCount: document.querySelectorAll('.journal-page').length,
                overflow: pages.map((p) => {
                    const body = p.querySelector('.journal-page-content');
                    return { w: body.scrollWidth - body.clientWidth, h: body.scrollHeight - body.clientHeight };
                }),
                paper: getComputedStyle(pages[0]).backgroundColor,
                nav: document.querySelector('.rail').getBoundingClientRect().toJSON()
            };
        });
        results.push(metrics);
        assert.ok(
            metrics.overflow.every((r) => r.w <= 1 && r.h <= 1),
            `page overflow at ${width}`
        );
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.locator('.journal-bookmark').click();
    await page.locator('.journal-index-dates button').first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(output, 'first-spread.png') });
    const next = page.getByRole('button', { name: '下一页', exact: true });
    if (await next.isEnabled()) {
        await next.click();
        await page.waitForTimeout(170);
        await page.screenshot({ path: path.join(output, 'single-turn.png') });
        await page.waitForTimeout(650);
    }
    await page.locator('.diary-surface .compose-collapsed').click();
    const textarea = page.getByPlaceholder('今天发生了什么温柔的事？');
    await textarea.fill('苔绿手札草稿验证，不发布。');
    await page
        .locator('.compose input[type=file]')
        .setInputFiles(Array(10).fill(path.resolve('public/avatars/blue.png')));
    assert.equal(await page.locator('.compose .pk').count(), 9);
    await textarea.press('Escape');
    await page.locator('.compose-collapsed.draft').waitFor();
    await page.locator('.compose-collapsed').click();
    assert.equal(await textarea.inputValue(), '苔绿手札草稿验证，不发布。');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    assert.equal(await page.locator('.compose-collapsed.draft').count(), 0);
    await page.locator('.journal-page[aria-hidden="false"] .journal-open').first().click();
    await page.getByRole('dialog', { name: '回忆详情', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭回忆详情' }).press('Escape');
    assert.equal(await page.locator('.pd').count(), 0);
    assert.equal(await page.locator('.diary-surface.show').count(), 1);
    const renderer = await page.evaluate(() => {
        const flip = document.querySelector('.journal-engine').journalEngine;
        return { state: flip.getState(), running: flip.getRender().owRunning };
    });
    assert.equal(renderer.state, 'read');
    assert.equal(renderer.running, false);

    // Capture the actual number of intermediate leaves, not just the final page.
    await page.locator('.journal-bookmark').click();
    await page.getByRole('button', { name: '翻到末页', exact: true }).click();
    await page.waitForTimeout(1100);
    await page.evaluate(() => {
        window.journalTurns = [];
        window.journalJumpStart = document.querySelector('.journal-engine').journalEngine.getCurrentPageIndex();
        document.querySelector('.journal-engine').journalEngine.on('flip', (e) => window.journalTurns.push(e.data));
    });
    await page.locator('.journal-bookmark').click();
    await page.locator('.journal-index-dates button').first().click();
    await page.waitForTimeout(1100);
    const turns = await page.evaluate(() => window.journalTurns);
    assert.ok(
        turns.length >= 2,
        `multi-page jump must show several leaves: ${JSON.stringify({ turns, start: await page.evaluate(() => window.journalJumpStart) })}`
    );
    assert.equal(turns.at(-1), 0);

    // Corner drag commits only after passing the spine.
    const slot = await page.locator('.journal-engine-slot').boundingBox();
    await page.mouse.move(slot.x + slot.width - 12, slot.y + slot.height - 48);
    await page.mouse.down();
    await page.mouse.move(slot.x + 60, slot.y + slot.height - 90, { steps: 14 });
    await page.screenshot({ path: path.join(output, 'corner-drag.png') });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const draggedPage = await page.evaluate(() =>
        document.querySelector('.journal-engine').journalEngine.getCurrentPageIndex()
    );
    assert.equal(draggedPage, 2);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.journal-bookmark').click();
    await page.locator('.journal-index-dates button').first().click();
    await page.waitForTimeout(100);
    assert.equal(
        await page.evaluate(() => document.querySelector('.journal-engine').journalEngine.getCurrentPageIndex()),
        0
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Restarting a stopped renderer must be stable, not just the first turn.
    for (let i = 0; i < 12; i++) {
        await page.getByRole('button', { name: i % 2 ? '上一页' : '下一页', exact: true }).click();
        await page.waitForTimeout(520);
        assert.equal(
            await page.evaluate(() => document.querySelector('.journal-engine').journalEngine.getCurrentPageIndex()),
            i % 2 ? 0 : 2
        );
    }

    // Layout stress test with local synthetic content; no test posts are sent.
    const pagination = await page.evaluate(async () => {
        const { buildJournalPages } = await import('/src/themes/cinnaglass/journal-layout.ts');
        const source = ('下雨了，我们一起看书。👩🏽‍🌾🌷\n' + 'long-unbroken-link-'.repeat(12) + '\n').repeat(8);
        const post = {
            post_id: 'layout-test',
            author_id: 'local',
            created_at: '2026-09-06T00:00:00Z',
            visible_content: source,
            visible_images: Array.from({ length: 9 }, (_, i) => `photo-${i}.png`)
        };
        return [
            [368, 406],
            [267, 291],
            [340, 278]
        ].map(([w, h]) => {
            const pages = buildJournalPages([post], w, h, { profiles: {}, userId: 'local', urls: {} });
            const text = pages
                .flatMap((p) => p.parts)
                .map((p) => p.text)
                .join('');
            const photos = pages.flatMap((p) => p.parts).flatMap((p) => p.images);
            let overflow = 0;
            for (const { element } of pages) {
                element.style.position = 'fixed';
                element.style.left = '-20000px';
                element.style.visibility = 'hidden';
                document.body.append(element);
                const body = element.querySelector('.journal-page-content');
                overflow = Math.max(
                    overflow,
                    body.scrollHeight - body.clientHeight,
                    body.scrollWidth - body.clientWidth
                );
                element.remove();
            }
            return {
                w,
                h,
                pages: pages.length,
                textPreserved: text === source,
                photosPreserved: JSON.stringify(photos) === JSON.stringify(post.visible_images),
                overflow
            };
        });
    });
    assert.ok(
        pagination.every((r) => r.textPreserved && r.photosPreserved && r.overflow <= 1),
        JSON.stringify(pagination)
    );

    for (const [mood, label] of [
        ['golden', '黄昏'],
        ['twilight', '暮色']
    ]) {
        await page.getByTitle('灯光与天气', { exact: true }).click();
        await page.locator('.amb-panel').getByTitle(label, { exact: true }).click();
        await page.locator('.amb-tab').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(output, `${mood}-1440.png`) });
    }
    await page.getByRole('button', { name: '关闭我们的日记', exact: true }).click();
    await page.getByRole('button', { name: '工具', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'navigation-tools.png') });
    await page.getByRole('button', { name: '照片墙', exact: true }).click();
    await page.locator('[data-surface="photos"].show').waitFor();
    await page.screenshot({ path: path.join(output, 'photos.png') });
    await page.getByRole('button', { name: '关闭照片墙', exact: true }).click();
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(output, 'settings.png') });
    assert.deepEqual(errors, []);
    await writeFile(
        path.join(output, 'results.json'),
        JSON.stringify(
            { results, renderer, turns, draggedPage, pagination, errors, draft: true, images: 9, detailEsc: true },
            null,
            2
        )
    );
    console.log(JSON.stringify(results, null, 2));
} catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png') });
    console.error(JSON.stringify({ errors, body: (await page.locator('body').innerText()).slice(0, 1800) }));
    throw error;
} finally {
    await browser.close();
}
