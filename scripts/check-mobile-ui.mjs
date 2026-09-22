// Production-component mobile regression, with isolated data and no external account/weather requests.
import { dependency, baseUrl } from './lib/deps.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const { chromium } = dependency('playwright');
const output = process.env.MOBILE_UI_OUTPUT || path.join(os.tmpdir(), 'our-world-mobile-ui');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.MOBILE_UI_BROWSER || 'chrome', headless: true });
const sizes = [
    [320, 568],
    [375, 667],
    [390, 844],
    [430, 932],
    [667, 375],
    [844, 390],
    [768, 1024],
    [1440, 900]
];
const screens = [
    'room',
    'compact-chat',
    'music',
    'chat',
    'settings',
    'calendar',
    'clock',
    'photos',
    'wishes',
    'login',
    'reset',
    'lobby'
];
const errors = [];
let layouts = 0;

// Use the same fixture for measurements and screenshots; test-only controls are never rendered.
async function visit(page, screen) {
    await page.goto(`${baseUrl()}/scripts/fixtures/mobile-ui.html?screen=${screen}`);
    await page.locator('.ui-environment').first().waitFor();
    if (['chat', 'settings', 'calendar', 'clock', 'photos', 'wishes'].includes(screen))
        await page.locator('dialog[open]').waitFor();
    if (screen === 'reset') await page.getByRole('alert').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(80);
}

// Pin synthetic keyboard events to a known viewport while leaving CSS layout dimensions unchanged.
async function observe(page) {
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.origin === new URL(baseUrl()).origin ? route.continue() : route.abort();
    });
    await page.addInitScript(() => {
        const nativeViewport = window.visualViewport;
        const viewport = new EventTarget();
        const overrides = {};
        for (const key of ['height', 'width', 'offsetTop', 'offsetLeft', 'scale']) {
            Object.defineProperty(viewport, key, { get: () => overrides[key] ?? nativeViewport[key] });
        }
        nativeViewport.addEventListener('resize', () => viewport.dispatchEvent(new Event('resize')));
        nativeViewport.addEventListener('scroll', () => viewport.dispatchEvent(new Event('scroll')));
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
        window.__mobileViewport = (height, offsetTop = 0, scale = 1) => {
            Object.assign(overrides, { height, offsetTop, scale });
            viewport.dispatchEvent(new Event('resize'));
        };
    });
}

// Check actual reading containers, excluding decorative rims and entry cards that intentionally scroll.
async function layout(page, label) {
    const problems = await page.evaluate(() => {
        const dialog = document.querySelector('dialog[open]');
        const selectors = dialog
            ? '.ui-dialog[open],.ui-dialog[open] .ui-dialog-header,.ui-dialog[open] .chsc-input'
            : '.rail,.amb-dock,.chat-card,.cc-input,.music-wrap';
        const bad = [];
        for (const el of document.querySelectorAll(selectors)) {
            if (!el.checkVisibility()) continue;
            const r = el.getBoundingClientRect();
            if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1)
                bad.push(`${el.className}: outside viewport`);
        }
        for (const el of document.querySelectorAll(
            '.ui-dialog[open] .ui-dialog-content,.cc-list,.chsc-main,.ui-entry'
        )) {
            if (el.checkVisibility() && el.scrollWidth > el.clientWidth + 2)
                bad.push(`${el.className}: horizontal overflow`);
        }
        const input = document.querySelector('.ui-dialog[open] .chsc-input');
        const list = document.querySelector('.ui-dialog[open] .chsc-msgs');
        if (input && list && list.getBoundingClientRect().height < 65) bad.push('chat has no usable reading area');
        if (!dialog) {
            const rail = document.querySelector('.rail')?.getBoundingClientRect();
            for (const el of document.querySelectorAll('.chat-card,.music-wrap')) {
                if (!el.checkVisibility() || !rail) continue;
                const r = el.getBoundingClientRect();
                if (r.left < rail.right && r.right > rail.left && r.top < rail.bottom && r.bottom > rail.top)
                    bad.push('active widget covers navigation');
            }
        }
        return bad;
    });
    assert.deepEqual(problems, [], label);
}

try {
    for (const [width, height] of sizes) {
        const mobile = width < 768 || height < 600;
        const page = await browser.newPage({
            viewport: { width, height },
            isMobile: mobile,
            hasTouch: mobile,
            deviceScaleFactor: 1
        });
        await observe(page);
        for (const screen of screens) {
            await visit(page, screen);
            await layout(page, `${screen} ${width}x${height}`);
            if (screen === 'compact-chat' && mobile)
                assert.equal(
                    await page.locator('.cc-input input').evaluate((e) => e === document.activeElement),
                    false,
                    'touch disclosure must not force the keyboard'
                );
            if (screen === 'chat' && mobile) {
                await page.getByRole('button', { name: '切换会话', exact: true }).click();
                await page.getByRole('button', { name: /今天想和你分享/ }).click();
                assert.equal(await page.locator('.chsc-msgs').count(), 1);
                assert.equal(await page.locator('.chsc-nav-content').isVisible(), false);
                await page.locator('.chsc-input input').fill('手机回归测试');
                await page.locator('.chsc-input button[type="submit"]').click();
                assert.equal(await page.locator('.chsc-msgs').getByText('手机回归测试', { exact: true }).count(), 1);
            }
            if (['settings', 'calendar', 'clock', 'photos', 'wishes'].includes(screen)) {
                await page.locator('dialog[open] .ui-dialog-content').evaluate((e) => {
                    e.scrollTop = e.scrollHeight;
                });
                await page.locator('dialog[open] .ui-dialog-header button').click();
                assert.equal(await page.locator('dialog[open]').count(), 0);
                await visit(page, screen);
            }
            if (width === 390 || (width === 667 && ['music', 'chat'].includes(screen)))
                await page.screenshot({ path: path.join(output, `${screen}-${width}x${height}.png`) });
            layouts++;
        }
        await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await observe(page);
    await visit(page, 'room');
    await page.locator('[data-nav-key="chat"]').tap();
    assert.equal(await page.locator('.chat-card').isVisible(), true);
    await page.locator('[data-nav-key="chat"]').tap();
    assert.equal(await page.locator('.chat-card').count(), 0);
    await page.locator('[data-nav-key="music"]').tap();
    assert.equal(await page.locator('.music-full').isVisible(), true);
    await page.locator('[data-nav-key="chat"]').tap();
    assert.equal(await page.locator('.music-wrap').isVisible(), false);
    await page.getByRole('button', { name: /天气：/ }).tap();
    await page.getByRole('radio', { name: '雨', exact: true }).tap();
    await page.getByRole('button', { name: /天气：/ }).tap();
    assert.equal(await page.locator('.amb-panel').isVisible(), false);

    await visit(page, 'chat');
    await page.getByRole('button', { name: '选择表情' }).tap();
    const picker = await page.locator('.chsc-pop').boundingBox();
    assert(picker.x >= 0 && picker.x + picker.width <= 390 && picker.y >= 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.chsc-pop').count(), 0);
    assert.equal(await page.locator('dialog[open]').count(), 1);
    await page.getByRole('button', { name: '切换会话', exact: true }).tap();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.chsc-nav-content').isVisible(), false);
    assert.equal(await page.locator('dialog[open]').count(), 1);

    // A real viewport resize exercises layout changes without remounting or losing a draft.
    await page.locator('.chsc-input input').fill('旋转之后还在');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(100);
    await layout(page, 'chat portrait to landscape');
    assert.equal(await page.locator('.chsc-input input').inputValue(), '旋转之后还在');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    await layout(page, 'chat landscape to portrait');

    for (const screen of ['compact-chat', 'chat', 'login', 'settings']) {
        await visit(page, screen);
        if (screen === 'settings') await page.getByRole('button', { name: /修改密码/ }).click();
        const input = page
            .locator(
                screen === 'compact-chat'
                    ? '.cc-input input'
                    : screen === 'chat'
                      ? '.chsc-input input'
                      : screen === 'settings'
                        ? 'input[type="password"]'
                        : 'input:not([type="hidden"])'
            )
            .first();
        await input.focus();
        await page.evaluate(() => window.__mobileViewport(360));
        await page.waitForTimeout(100);
        assert.equal(
            await page.locator('html').getAttribute('data-ui-keyboard'),
            'true',
            `${screen} keyboard detected`
        );
        if (screen === 'compact-chat' || screen === 'chat') {
            const rect = await input.boundingBox();
            assert(rect.y >= 0 && rect.y + rect.height <= 360, `${screen} composer above keyboard`);
            await input.fill('键盘收起后保留草稿');
        } else {
            await input.scrollIntoViewIfNeeded();
            const rect = await input.boundingBox();
            assert(rect.y >= 0 && rect.y + rect.height <= 360, `${screen} focused field reachable`);
        }
        await page.screenshot({ path: path.join(output, `${screen}-keyboard.png`) });
        await page.evaluate(() => window.__mobileViewport(innerHeight));
        await page.waitForTimeout(70);
        assert.equal(await page.locator('html').getAttribute('data-ui-keyboard'), 'false');
        if (screen === 'compact-chat' || screen === 'chat')
            assert.equal(await input.inputValue(), '键盘收起后保留草稿');
        await page.evaluate(() => window.__mobileViewport(422, 0, 2));
        await page.waitForTimeout(70);
        assert.equal(
            await page.locator('html').getAttribute('data-ui-keyboard'),
            'false',
            'pinch zoom is not keyboard'
        );
    }

    await visit(page, 'room');
    await page.evaluate(() => {
        document.documentElement.style.setProperty('--ui-safe-top', '47px');
        document.documentElement.style.setProperty('--ui-safe-bottom', '34px');
    });
    const rail = await page.locator('.rail').boundingBox();
    const dock = await page.locator('.amb-dock').boundingBox();
    assert(rail.y + rail.height <= 844 - 34 && dock.y >= 47);
    await page.screenshot({ path: path.join(output, 'room-safe-area.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: /天气：/ }).tap();
    assert.equal(await page.locator('.amb-selection').evaluate((e) => getComputedStyle(e).transitionDuration), '0s');
    await page.setViewportSize({ width: 844, height: 390 });
    await visit(page, 'music');
    await page.evaluate(() => {
        document.documentElement.style.setProperty('--ui-safe-left', '44px');
        document.documentElement.style.setProperty('--ui-safe-right', '44px');
    });
    const music = await page.locator('.music-wrap').boundingBox();
    assert(music.x >= 44 && music.x + music.width <= 844 - 44);
    await layout(page, 'landscape side safe areas');
    await page.close();
    assert.deepEqual(errors, []);
    console.log(
        JSON.stringify(
            {
                layouts,
                sizes: sizes.length,
                keyboardCases: 4,
                interactions: 'passed',
                safeArea: 'passed',
                reducedMotion: 'passed',
                pageErrors: errors,
                output
            },
            null,
            2
        )
    );
} finally {
    await browser.close();
}
