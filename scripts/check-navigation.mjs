// Browser-only checks: no posts, messages or shared data are written.
import { dependency, baseUrl } from './lib/deps.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = dependency('playwright');
const sharp = dependency('sharp');
const dir = path.resolve('ai/design_system/uiux/cinnaglass/journal-room-object/navigation-verification');
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() =>
    localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: 'night', weather: 'rain' }))
);
const result = [];
try {
    await page.goto(`${baseUrl()}/?enter=1`);
    const rail = page.getByRole('navigation', { name: '房间导航' });
    await rail.waitFor({ timeout: 30000 });
    await page.waitForTimeout(1800);
    const home = rail.getByRole('button', { name: '房间', exact: true });
    assert.equal(await rail.getByRole('button').count(), 5);
    for (const [mood, label] of [
        ['night', '深夜'],
        ['golden', '黄昏'],
        ['twilight', '暮色']
    ]) {
        if (mood !== 'night') {
            await page.getByTitle('灯光与天气', { exact: true }).click();
            await page.locator('.amb-panel').getByTitle(label, { exact: true }).click();
            await page.locator('.amb-tab').click();
            await page.waitForTimeout(1100);
        }
        await page.mouse.move(1100, 850);
        await page.waitForTimeout(300);
        const bounds = await rail.boundingBox();
        const clip = {
            x: Math.floor(bounds.x) - 14,
            y: Math.floor(bounds.y) - 14,
            width: Math.ceil(bounds.width) + 28,
            height: Math.ceil(bounds.height) + 28
        };
        const idle = await page.screenshot({ path: path.join(dir, `${mood}-idle.png`), clip });
        const iconRects = await rail.locator(':scope > button > svg').evaluateAll((nodes) =>
            nodes.map((n) => {
                const r = n.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height };
            })
        );
        const hideIcons = await page.addStyleTag({ content: '.rail > button > svg{visibility:hidden!important}' });
        const bare = await page.screenshot({ clip });
        await hideIcons.evaluate((el) => el.remove());
        const fg = await sharp(idle).removeAlpha().raw().toBuffer();
        const bg = await sharp(bare).removeAlpha().raw().toBuffer();
        const luminance = (buffer, i) =>
            [0.2126, 0.7152, 0.0722].reduce((s, w, k) => {
                const v = buffer[i + k] / 255;
                return s + w * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            }, 0);
        const contrast = iconRects.map((r) => {
            const samples = [];
            for (let y = Math.ceil(r.y - clip.y); y < r.y - clip.y + r.h; y++)
                for (let x = Math.ceil(r.x - clip.x); x < r.x - clip.x + r.w; x++) {
                    const i = (y * clip.width + x) * 3;
                    if (fg[i] > 185 && fg[i] - bg[i] > 65)
                        samples.push((luminance(fg, i) + 0.05) / (luminance(bg, i) + 0.05));
                }
            samples.sort((a, b) => a - b);
            return { corePixels: samples.length, p10: samples[Math.floor(samples.length * 0.1)] };
        });
        assert.ok(
            contrast.every((c) => c.corePixels > 10 && c.p10 >= 3),
            JSON.stringify({ mood, contrast })
        );
        if (mood === 'night') {
            const debug = await page.addStyleTag({ content: '.rail::before{display:none!important}' });
            await page.screenshot({ path: path.join(dir, 'no-texture.png'), clip });
            await debug.evaluate((el) => el.remove());
            const debug2 = await page.addStyleTag({ content: '.rail{visibility:hidden!important}' });
            await page.screenshot({ path: path.join(dir, 'underlay.png'), clip });
            await debug2.evaluate((el) => el.remove());
        }
        await page.screenshot({ path: path.join(dir, `${mood}-scene.png`) });
        await home.hover();
        await page.waitForTimeout(270);
        const hover = await page.screenshot({ path: path.join(dir, `${mood}-hover.png`), clip });
        await page.mouse.down();
        await page.waitForTimeout(170);
        const pressed = await page.screenshot({ path: path.join(dir, `${mood}-pressed.png`), clip });
        await page.mouse.up();
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(dir, `${mood}-menu.png`) });
        assert.equal(await home.getAttribute('aria-expanded'), 'true');
        await page.mouse.move(1100, 850);
        await page.waitForTimeout(250);
        assert.equal(await home.evaluate((el) => getComputedStyle(el, '::before').opacity), '0.7');
        await page.keyboard.press('Escape');
        assert.equal(await home.getAttribute('aria-expanded'), 'false');
        await page.mouse.move(1100, 850);
        await home.focus();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dir, `${mood}-focus.png`), clip });
        const metrics = await home.evaluate((el) => ({
            filter: getComputedStyle(el.querySelector('svg')).filter,
            focus: el.matches(':focus-visible'),
            paper: getComputedStyle(document.documentElement).getPropertyValue('--craft-paper'),
            blur: getComputedStyle(el.parentElement).backdropFilter,
            tint: getComputedStyle(el.parentElement).getPropertyValue('--nav-tint'),
            grain: getComputedStyle(el.parentElement, '::before').backgroundImage
        }));
        const raw = async (b) => sharp(b).removeAlpha().raw().toBuffer();
        const [a, b, c] = await Promise.all([raw(idle), raw(hover), raw(pressed)]);
        const diff = (x, y) => x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0) / x.length;
        const changes = { hover: diff(a, b), pressed: diff(b, c) };
        assert.ok(changes.hover > 0.2 && changes.pressed > 0.03, JSON.stringify(changes));
        assert.equal(metrics.focus, true);
        assert.match(metrics.grain, /frost.webp/);
        result.push({ mood, bounds, metrics, changes, contrast });
        await home.evaluate((el) => el.blur());
    }
    await rail.getByRole('button', { name: '工具', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '装扮（敬请期待）', exact: true }).isDisabled(), true);
    const toggle = page.getByRole('switch', { name: '纪念日卡', exact: true });
    assert.equal(await toggle.locator('i[aria-hidden=true]').count(), 1);
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    assert.notEqual(await toggle.getAttribute('aria-checked'), before);
    assert.equal(
        await toggle.locator('i').evaluate((el) => getComputedStyle(el).backgroundColor),
        'rgb(230, 214, 185)'
    );
    await toggle.click();
    await page.getByRole('button', { name: '照片墙', exact: true }).click();
    await page.getByRole('button', { name: '关闭照片墙', exact: true }).waitFor();
    assert.equal(await page.locator('.modules-pop').count(), 0);
    await page.getByRole('button', { name: '关闭照片墙', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await home.focus();
    assert.equal(await home.evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
    const screens = [];
    for (const [width, height] of [
        [960, 700],
        [640, 400],
        [390, 844]
    ]) {
        await page.setViewportSize({ width, height });
        await page.mouse.move(width - 10, 10);
        await home.evaluate((el) => el.blur());
        await page.waitForTimeout(450);
        const box = await rail.boundingBox();
        assert.equal(box.x, width >= 768 && height >= 600 ? 38 : (width - 292) / 2);
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
        await page.screenshot({ path: path.join(dir, `viewport-${width}.png`) });
        await home.click();
        const pop = await page.locator('.rooms-pop').boundingBox();
        assert.ok(pop.x >= 0 && pop.x + pop.width <= width && pop.y >= 0 && pop.y + pop.height <= height);
        await page.keyboard.press('Escape');
        screens.push({ width, height, box, pop });
    }
    // Real coarse-pointer emulation, not only a narrow desktop viewport.
    const touchContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true
    });
    const touchPage = await touchContext.newPage();
    touchPage.on('pageerror', (e) => errors.push(e.message));
    await touchPage.addInitScript(() =>
        localStorage.setItem('ow-tweaks-v1', JSON.stringify({ mood: 'night', weather: 'rain' }))
    );
    await touchPage.goto(`${baseUrl()}/?enter=1`);
    const touchRail = touchPage.getByRole('navigation', { name: '房间导航' });
    const touchHome = touchRail.getByRole('button', { name: '房间', exact: true });
    await touchHome.waitFor();
    await touchPage.waitForTimeout(1500);
    const touchBox = await touchHome.boundingBox();
    const cdp = await touchContext.newCDPSession(touchPage);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: touchBox.x + touchBox.width / 2, y: touchBox.y + touchBox.height / 2 }]
    });
    await touchPage.waitForTimeout(270);
    const touch = await touchHome.evaluate((el) => ({
        coarse: matchMedia('(pointer: coarse)').matches,
        noHover: matchMedia('(hover: none)').matches,
        active: el.matches(':active'),
        pointerPressed: el.dataset.pressed === 'true',
        glow: getComputedStyle(el, '::before').opacity,
        transform: getComputedStyle(el).transform
    }));
    assert.equal(touch.coarse, true);
    assert.equal(touch.noHover, true);
    assert.equal(touch.pointerPressed, true);
    assert.equal(touch.glow, '1');
    await touchPage.screenshot({ path: path.join(dir, 'touch-pressed.png') });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touchPage.waitForTimeout(400);
    assert.equal(await touchHome.getAttribute('data-pressed'), null);
    assert.equal(await touchHome.getAttribute('aria-expanded'), 'true');
    await touchPage.touchscreen.tap(10, 10);
    assert.equal(await touchHome.getAttribute('aria-expanded'), 'false');
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: touchBox.x + touchBox.width / 2, y: touchBox.y + touchBox.height / 2 }]
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal(await touchHome.getAttribute('data-pressed'), null);
    await touchRail.getByRole('button', { name: '工具', exact: true }).tap();
    assert.equal(await touchPage.getByRole('button', { name: '装扮（敬请期待）', exact: true }).isDisabled(), true);
    await touchPage.waitForTimeout(300);
    await touchPage.screenshot({ path: path.join(dir, 'touch-tools.png') });
    await touchPage.touchscreen.tap(10, 10);
    assert.equal(await touchPage.locator('.modules-pop').count(), 0);
    await touchContext.close();
    const docsPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    docsPage.on('pageerror', (e) => errors.push(e.message));
    await docsPage.goto(`${baseUrl()}/ai/design_system/uiux/cinnaglass/ui-system.html#navigation-glass`);
    await docsPage.locator('#navigation-glass').scrollIntoViewIfNeeded();
    // The comparison is lazy-loaded; wait for its pixels, not just the heading.
    const comparisonImage = docsPage.locator('img[src="journal-room-object/navigation-verification/comparison.png"]');
    await comparisonImage.scrollIntoViewIfNeeded();
    await comparisonImage.evaluate((img) => img.decode());
    const docs = await docsPage.evaluate(() => ({
        imageLoaded: [...document.images].some(
            (img) => img.src.endsWith('/comparison.png') && img.complete && img.naturalWidth === 408
        ),
        liveStylesheet: [...document.styleSheets].some((sheet) => sheet.href?.includes('navigation-glass.css'))
    }));
    assert.equal(docs.imageLoaded, true);
    assert.equal(docs.liveStylesheet, true);
    await docsPage.screenshot({ path: path.join(dir, 'design-system.png') });
    await docsPage.close();
    // QA crops only; this does not modify the reference or become a runtime asset.
    await sharp(path.resolve('ai/design_system/uiux/cinnaglass/journal-room-object/room-journal-concept.png'))
        .extract({ left: 26, top: 102, width: 102, height: 412 })
        .png()
        .toFile(path.join(dir, 'reference-nav.png'));
    const panels = ['reference-nav.png', 'night-hover.png', 'golden-hover.png', 'twilight-hover.png'];
    await sharp({ create: { width: 102 * panels.length, height: 412, channels: 4, background: '#292824' } })
        .composite(
            await Promise.all(
                panels.map(async (p, i) => ({
                    input: await sharp(path.join(dir, p))
                        .resize(102, 412, { fit: 'contain', background: '#292824' })
                        .toBuffer(),
                    left: i * 102,
                    top: 0
                }))
            )
        )
        .png()
        .toFile(path.join(dir, 'comparison.png'));
    assert.deepEqual(errors, []);
    await writeFile(path.join(dir, 'results.json'), JSON.stringify({ result, screens, touch, docs, errors }, null, 2));
    console.log(JSON.stringify({ result, screens, touch, docs, errors }, null, 2));
} catch (error) {
    await page.screenshot({ path: path.join(dir, 'failure.png') });
    console.error(JSON.stringify({ errors }));
    throw error;
} finally {
    await browser.close();
}
