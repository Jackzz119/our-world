// Read-only visual regression against the local app. Never publishes a post.
// DIARY_NODE_MODULES can point to the Codex bundled node_modules directory.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const dependency = (name) =>
    require(process.env.DIARY_NODE_MODULES ? path.join(process.env.DIARY_NODE_MODULES, name) : name);
const { chromium } = dependency('playwright');
const { PNG } = dependency('pngjs');
const output = path.resolve('ai/design_system/cinnaglass/timeline-night-glass/verification');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => {
    if (!localStorage.getItem('ow-tweaks-v1'))
        localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: 'night', weather: 'rain' }));
});
const results = [];
const luminance = (rgb) =>
    rgb
        .map((c) => c / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
    const x = luminance(a);
    const y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

try {
    await page.goto('http://localhost:5173/?enter=1&surface=timeline');
    await page.locator('.diary-surface.show .tl-card').first().waitFor({ timeout: 30000 });
    await page.locator('.diary-surface .compose-collapsed').click();
    const textarea = page.getByPlaceholder('今天发生了什么温柔的事？');
    await textarea.fill('本地样式验证，不发布。');
    await page
        .locator('.compose input[type=file]')
        .setInputFiles(Array(10).fill(path.resolve('public/avatars/blue.png')));
    assert.equal(await page.locator('.compose .pk').count(), 9);
    await page.getByRole('button', { name: '移除这张' }).first().click();
    assert.equal(await page.locator('.compose .pk').count(), 8);
    await textarea.press('Escape');
    await page.locator('.diary-surface.show .compose-collapsed.draft').waitFor();
    await page.locator('.diary-surface .compose-collapsed').click();
    assert.equal(await textarea.inputValue(), '本地样式验证，不发布。');
    assert.equal(await page.locator('.compose .pk').count(), 8);
    await page.getByRole('heading', { name: '我们的日记', exact: true }).click();
    await page.locator('.diary-surface.show .compose-collapsed.draft').waitFor();
    await page.locator('.diary-surface .compose-collapsed').click();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    assert.equal(await page.locator('.compose-collapsed.draft').count(), 0);
    const card = page.locator('.diary-surface .tl-card').last();
    await card.click();
    await page.getByRole('dialog', { name: '回忆详情', exact: true }).waitFor();
    await page.getByRole('button', { name: '关闭回忆详情' }).press('Escape');
    assert.equal(await page.locator('.pd').count(), 0);
    assert.equal(await page.locator('.diary-surface.show').count(), 1);

    for (const [width, height, mood] of [
        [1440, 900, 'night'],
        [1440, 900, 'golden'],
        [1440, 900, 'twilight'],
        [960, 700, 'night'],
        [640, 400, 'night']
    ]) {
        await page.setViewportSize({ width, height });
        // Isolated browser preferences feed the same mood source to CSS and Pixi.
        await page.evaluate(
            (mood) => localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood, weather: 'rain' })),
            mood
        );
        await page.reload();
        await page.locator('.diary-surface.show .tl-card').last().waitFor();
        await page.locator('.diary-surface .tl-card').last().focus();
        await page.getByRole('heading', { name: '我们的日记', exact: true }).click();
        await page.waitForTimeout(1100); // actual scene crossfade is 900ms
        const metrics = await page.evaluate(() => {
            const panel = document.querySelector('.diary-surface');
            const entry = panel.querySelector('.tl-card:last-child');
            const sampleCard = [...panel.querySelectorAll('.tl-card')].at(-1);
            const rect = (e) => e.getBoundingClientRect().toJSON();
            return {
                viewport: [innerWidth, innerHeight],
                panel: rect(panel),
                card: rect(sampleCard),
                horizontalOverflow: [...panel.querySelectorAll('.tl-card, .compose')].some(
                    (e) => e.scrollWidth > e.clientWidth + 1
                ),
                borderLeft: getComputedStyle(entry).borderLeftWidth,
                mask: getComputedStyle(panel, '::before').maskComposite,
                textColor: getComputedStyle(sampleCard.querySelector('.tt')).color,
                subColor: getComputedStyle(panel.querySelector('.tl-time')).color,
                panelBlur: getComputedStyle(panel).backdropFilter,
                composer: rect(panel.querySelector('.compose'))
            };
        });
        assert.deepEqual(metrics.viewport, [width, height]);
        assert.equal(metrics.horizontalOverflow, false);
        assert.equal(metrics.borderLeft, '1px');
        const bytes = await page.screenshot({ path: path.join(output, `${mood}-${width}.png`) });
        const png = PNG.sync.read(bytes);
        // Sample the panel's clear left gutter, not lettering or image content.
        const x = Math.round(metrics.panel.x + 12),
            y = Math.round(metrics.panel.y + 150);
        const offset = (y * png.width + x) * 4;
        const background = [...png.data.subarray(offset, offset + 3)];
        metrics.sampledPanel = background;
        metrics.secondaryOnPanelContrast = +contrast([191, 180, 164], background).toFixed(2);
        assert.ok(metrics.secondaryOnPanelContrast >= 4.5);
        results.push({ width, height, mood, ...metrics });
    }
    // Small-screen composer may scroll internally; its actions must remain reachable.
    await page.locator('.compose-collapsed').click();
    await textarea.fill('小窗草稿验证，不发布。');
    await page.getByRole('button', { name: '取消', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'composer-640.png') });
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await writeFile(
        path.join(output, 'results.json'),
        JSON.stringify(
            {
                checks: [
                    'Esc preserves text and images and keeps diary open',
                    'outside click preserves draft',
                    'cancel clears draft',
                    '10 local images capped at 9; removal leaves 8',
                    'detail Escape closes only detail',
                    'no horizontal overflow',
                    'small composer actions reachable'
                ],
                results,
                errors
            },
            null,
            2
        )
    );
    assert.deepEqual(errors, []);
    process.stdout.write(JSON.stringify({ passed: true, captures: results.length + 1, output }));
} finally {
    await browser.close();
}
