// Browser check of the annotation layer (scripts/annotate/annotate.js). Builds a small sample report in a temp dir,
// inlines the layer, serves it locally and drives it at desktop 1280×800 and phone 390×844 (touch): local mode
// (select → chip → note, annotate mode on a card, an image and a table row, links and buttons that must not fire,
// pins, drawer, export, reload) and claude mode against a fake comments namespace (send, plain comment, error paths,
// nothing written without a click). Screenshots go to ANNOTATE_SHOTS (default: <tmp>/annotate-shots).
// DIARY_NODE_MODULES=$(npm root -g) node scripts/check-annotate.mjs
import { dependency } from './lib/deps.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { inlineAnnotate } from './annotate/inline.mjs';

const { chromium } = dependency('playwright');
const shots = path.resolve(process.env.ANNOTATE_SHOTS || path.join(os.tmpdir(), 'annotate-shots'));
fs.mkdirSync(shots, { recursive: true });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'annotate-'));

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>批注层测试页</title>
<style>
    body { margin: 0; font: 16px/1.7 system-ui, sans-serif; color: #222; background: #f6f6f4; }
    main { max-width: 860px; margin: 0 auto; padding: 24px 16px 120px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .card { padding: 16px; border: 1px solid #ccc; border-radius: 12px; background: #fff; }
    img { display: block; max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 10px; border: 1px solid #ccc; text-align: left; }
</style>
</head>
<body>
<main>
<h1>批注层测试页</h1>
<p id="intro">这是一份用来检查批注层的样例报告：标题、段落、卡片、图片、表格、链接和按钮都有。</p>
<section>
<h2>1 · 背景</h2>
<p id="p-bg">播放引擎现在把音频解码后直接送进扬声器，中间不做任何效果处理，我们把这种方式叫做纯净直出。</p>
<h3>1.1 现状</h3>
<p id="p-link">更多细节见 <a id="link" href="#elsewhere">另一份文档</a>，或者按下面的按钮。</p>
<button id="btn" type="button">一个按钮</button>
<details id="more"><summary>展开细节</summary><p>细节内容</p></details>
</section>
<section>
<h2>2 · 方案</h2>
<div class="grid">
<article class="card" data-anchor="E1"><h3>E1 纯净直出</h3><p>不做任何处理，延迟最低。</p></article>
<article class="card" data-anchor="E2"><h3>E2 轻度均衡</h3><p>加一点低频，听感更暖。</p></article>
</div>
<figure><img id="fig" src="figure.svg" alt="两种方案的频谱对比" width="640" height="240" /><figcaption>图 1 · 频谱对比</figcaption></figure>
<table>
<caption>表 1 · 指标对比</caption>
<thead><tr><th>指标</th><th>E1</th><th>E2</th></tr></thead>
<tbody>
<tr id="row-latency"><td>延迟</td><td>12 ms</td><td>18 ms</td></tr>
<tr><td>功耗</td><td>低</td><td>中</td></tr>
</tbody>
</table>
</section>
</main>
<script>
    document.getElementById('btn').addEventListener('click', () => (window.buttonClicks = (window.buttonClicks || 0) + 1));
</script>
</body>
</html>
`;
const FIGURE = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
<rect width="640" height="240" fill="#e9eef5"/>
<polyline fill="none" stroke="#3f5f9e" stroke-width="4" points="0,200 80,150 160,170 240,90 320,120 400,60 480,100 560,40 640,80"/>
<polyline fill="none" stroke="#a5531f" stroke-width="4" points="0,210 80,180 160,190 240,140 320,150 400,110 480,130 560,90 640,120"/>
</svg>
`;
const SOURCE = 'scripts/check-annotate.mjs sample';
fs.writeFileSync(path.join(dir, 'figure.svg'), FIGURE);
fs.writeFileSync(path.join(dir, 'index.html'), inlineAnnotate(PAGE, { source: SOURCE }));
fs.writeFileSync(
    path.join(dir, 'codex.html'),
    inlineAnnotate(PAGE, { source: SOURCE, agent: 'codex', label: '提意见' })
);

const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const VIEWS = {
    desktop: { viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] },
    phone: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        colorScheme: 'dark'
    }
};
const results = [];
const check = async (name, fn) => {
    try {
        await fn();
        results.push({ name, ok: true });
    } catch (error) {
        const values = error && 'actual' in error ? ` (actual ${JSON.stringify(error.actual)})` : '';
        results.push({ name, ok: false, error: String(error && error.message).split('\n')[0] + values });
    }
};
const shot = (page, name) => page.screenshot({ path: path.join(shots, `${name}.png`) });
const notes = (page) => page.evaluate(() => window.__annotate.notes());
const mode = (page) => page.evaluate(() => window.__annotate.mode);
const writes = (page) =>
    page.evaluate(() => window.__calls.filter(([method]) => method === 'create' || method === 'sendToClaude'));
const button = (box, name) => box.getByRole('button', { name, exact: true });
// the reader's text selection, made the way a long press or a drag would leave it
const select = (page, selector, text) =>
    page.evaluate(
        ([selector, text]) => {
            const walker = document.createTreeWalker(document.querySelector(selector), NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const at = node.data.indexOf(text);
                if (at < 0) continue;
                const range = document.createRange();
                range.setStart(node, at);
                range.setEnd(node, at + text.length);
                getSelection().removeAllRanges();
                getSelection().addRange(range);
                return range.getBoundingClientRect().toJSON();
            }
            throw new Error(`no "${text}" in ${selector}`);
        },
        [selector, text]
    );

// A stand-in for claude.ai's comments namespace: records every call, can fail a verb with a code or hold it pending.
const FAKE = ({ can, hang }) => {
    const calls = (window.__calls = []);
    const fake = (window.__fake = { can, fail: {}, hold: false });
    const write = (method) => (args) => {
        calls.push([method, JSON.parse(JSON.stringify(args))]);
        const code = fake.fail[method];
        if (code) return Promise.reject(Object.assign(new Error(code), { code }));
        const result = { threadId: `t${calls.length}`, commentId: `c${calls.length}` };
        return fake.hold ? new Promise((resolve) => (fake.release = () => resolve(result))) : Promise.resolve(result);
    };
    const comments = Object.freeze({
        anchorFor: async (el) => (
            calls.push(['anchorFor', el.localName]),
            { path: `fake ${el.localName}`, x: 0.5, y: 0.5 }
        ),
        canSendToClaude: async () => (calls.push(['canSendToClaude']), fake.can),
        openComposer: async () => ({ opened: true }),
        create: write('create'),
        reply: write('reply'),
        sendToClaude: write('sendToClaude')
    });
    // like the shell, use() never resolves synchronously (and can hang)
    const use = (name) =>
        new Promise((resolve) => !hang && setTimeout(() => resolve(name === 'comments' && comments), 50));
    window.claude = { use };
};

const browser = await chromium.launch({ channel: process.env.ANNOTATE_BROWSER || undefined });

async function open(view, file = 'index.html', fake) {
    const context = await browser.newContext(VIEWS[view]);
    if (fake) await context.addInitScript(FAKE, fake);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(5000);
    await page.goto(`${origin}/${file}`);
    await page.waitForFunction(() => window.__annotate);
    const touch = view === 'phone';
    const tap = (locator, options) => (touch ? locator.tap(options) : locator.click(options));
    const done = async () => {
        await check(`${view} ${file}${fake ? ' (fake claude)' : ''}: no page errors`, () =>
            assert.equal(errors.length, 0, errors.join(' | '))
        );
        await context.close();
    };
    return { page, tap, touch, done, box: page.locator('.ann-composer') };
}

async function localFlow(view) {
    const { page, tap, touch, done, box } = await open(view);
    const name = (text) => `${view} local: ${text}`;

    await check(name('starts local, pill is 44px at the bottom right, page focus order untouched'), async () => {
        assert.equal(await mode(page), 'local');
        const pill = await page.locator('.ann-pill').boundingBox();
        const { width, height } = VIEWS[view].viewport;
        assert.ok(pill.width >= 44 && pill.height >= 44, `pill ${pill.width}×${pill.height}`);
        assert.ok(pill.x + pill.width <= width - 10 && pill.y + pill.height <= height - 10, 'pill sits bottom right');
        assert.equal(await page.locator('.ann-root[data-uncommentable][data-annotate-ui]').count(), 1);
        assert.equal(await page.locator('[data-annotate-ui]:not(.ann-root [data-annotate-ui], .ann-root)').count(), 0);
        if (!touch) {
            await page.keyboard.press('Tab');
            assert.equal(await page.evaluate(() => document.activeElement.id), 'link');
            await page.evaluate(() => document.activeElement.blur());
        }
        const theme = await page
            .locator('.ann-root')
            .evaluate((el) => getComputedStyle(el).getPropertyValue('--ann-bg'));
        assert.equal(theme.trim(), touch ? '#27242c' : '#fffdf9', 'dark on the phone (dark scheme), light on desktop');
    });

    await check(name('a text selection shows the chip; the note keeps location, quote and a pin'), async () => {
        const rect = await select(page, '#p-bg', '纯净直出');
        const chip = page.locator('.ann-chip');
        await chip.waitFor();
        const at = await chip.boundingBox();
        if (touch) assert.ok(at.y >= rect.bottom, 'chip below the selection on touch');
        else assert.ok(at.y + at.height <= rect.top, 'chip above the selection with a mouse');
        if (touch) await shot(page, 'phone-chip');
        await tap(chip);
        await box.waitFor();
        assert.equal(await box.locator('.ann-loc').textContent(), '1 · 背景 › #p-bg');
        assert.equal(await box.locator('.ann-quote').textContent(), '纯净直出');
        assert.ok(await box.locator('textarea').evaluate((el) => el === document.activeElement), 'textarea focused');
        const frame = await box.boundingBox();
        if (touch) assert.ok(frame.width === 390 && Math.abs(frame.y + frame.height - 844) < 2, 'bottom sheet');
        else assert.ok((await box.getAttribute('class')).includes('ann-pop') && frame.width <= 380, 'popover');
        await box.locator('textarea').fill('「纯净」要解释一下');
        assert.match(await box.locator('.ann-count').textContent(), /^\d+ \/ \d+ 字节$/);
        await shot(page, touch ? 'phone-composer-local' : 'desktop-popover-local');
        await tap(button(box, '存下来'));
        await box.waitFor({ state: 'detached' });
        const [note, ...rest] = await notes(page);
        assert.equal(rest.length, 0);
        assert.deepEqual(
            [note.kind, note.label, note.quote, note.note],
            ['local', '1 · 背景 › #p-bg', '纯净直出', '「纯净」要解释一下']
        );
        await page.locator('.ann-pin', { hasText: '1' }).waitFor();
        assert.equal(await page.locator('.ann-badge').textContent(), '1');
    });

    await check(name('the export names the location, the quote and the note'), async () => {
        const md = await page.evaluate(() => window.__annotate.exportMarkdown());
        assert.match(
            md,
            /^# 页面批注：批注层测试页\n来源：scripts\/check-annotate\.mjs sample {2}· {2}\d{4}-\d\d-\d\d \d\d:\d\d\n/
        );
        assert.ok(md.includes('请逐条处理下面的批注（位置 + 原文 + 我的意见）；改完一条在回复里说改了什么。\n\n'));
        assert.ok(md.includes('1. 位置：1 · 背景 › #p-bg\n   原文：「纯净直出」\n   批注：「纯净」要解释一下\n'), md);
    });

    await check(name('annotate mode picks a card, an image and a table row'), async () => {
        await tap(page.locator('.ann-pill'));
        assert.equal(await page.locator('.ann-pill').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('.ann-banner').isVisible(), true);
        const cases = [
            ['[data-anchor="E1"]', { position: { x: 6, y: 6 } }, '2 · 方案 › E1 纯净直出', /^E1 纯净直出 不做任何处理/],
            ['#fig', undefined, '2 · 方案 › 图 1 · 频谱对比', /^两种方案的频谱对比$/],
            ['#row-latency td >> nth=1', undefined, '2 · 方案 › 表 1 · 指标对比', /^延迟 12 ms 18 ms$/]
        ];
        for (const [selector, options, label, quote] of cases) {
            await tap(page.locator(selector), options);
            await box.waitFor();
            assert.equal(await box.locator('.ann-loc').textContent(), label);
            assert.match(await box.locator('.ann-quote').textContent(), quote);
            await box.locator('textarea').fill(`关于 ${label}`);
            await tap(button(box, '存下来'));
            await box.waitFor({ state: 'detached' });
        }
        assert.equal((await notes(page)).length, 4);
        await page.waitForFunction(() => document.querySelectorAll('.ann-pin').length === 4);
        if (touch) await shot(page, 'phone-mode-pins');
    });

    await check(name('a stray tap does not drop a half-written note'), async () => {
        await tap(page.locator('#intro'));
        await box.waitFor();
        const quote = await box.locator('.ann-quote').textContent();
        await box.locator('textarea').fill('写了一半');
        // the phone's sheet sits over a scrim; on desktop the page itself takes the tap
        if (touch) await tap(page.locator('.ann-scrim'), { position: { x: 20, y: 20 } });
        else await tap(page.locator('h1'));
        assert.equal(await box.locator('.ann-quote').textContent(), quote);
        assert.equal(await box.locator('textarea').inputValue(), '写了一半');
        await tap(box.locator('.ann-x'));
        await box.waitFor({ state: 'detached' });
    });

    await check(name('links, buttons and details do not fire in annotate mode, and do again after it'), async () => {
        const state = () =>
            page.evaluate(() => [location.hash, window.buttonClicks || 0, document.querySelector('#more').open]);
        for (const selector of ['#link', '#btn', '#more summary']) {
            await tap(page.locator(selector));
            await box.waitFor();
            await tap(box.locator('.ann-x'));
            await box.waitFor({ state: 'detached' });
        }
        assert.deepEqual(await state(), ['', 0, false]);
        if (touch) await tap(page.locator('.ann-pill'));
        else await page.keyboard.press('Escape');
        assert.equal(await page.locator('.ann-pill').getAttribute('aria-pressed'), 'false');
        for (const selector of ['#link', '#btn', '#more summary']) await tap(page.locator(selector));
        assert.deepEqual(await state(), ['#elsewhere', 1, true]);
        assert.equal(await box.count(), 0);
        await page.evaluate(() => {
            history.replaceState(null, '', location.pathname);
            document.querySelector('#more').open = false;
        });
    });

    await check(name('the drawer lists the notes and deletes one in two taps'), async () => {
        await tap(page.locator('.ann-list'));
        const drawer = page.locator('.ann-drawer');
        await drawer.waitFor();
        assert.equal(await drawer.locator('.ann-item').count(), 4);
        await shot(page, `${view}-drawer`);
        await tap(button(drawer.locator('.ann-item').nth(1), '删除'));
        await tap(button(drawer.locator('.ann-item').nth(1), '确认删除'));
        await page.waitForFunction(() => window.__annotate.notes().length === 3);
        assert.equal(await page.locator('.ann-drawer .ann-item').count(), 3);
        assert.deepEqual(await page.locator('.ann-pin').allTextContents(), ['1', '2', '3']);
    });

    await check(name('复制给 agent copies the export (manual-copy fallback on the phone)'), async () => {
        const drawer = page.locator('.ann-drawer');
        if (touch) {
            // the iOS frame case: no async clipboard, so the text is selected for a manual copy
            await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
            await tap(button(drawer, '复制给 agent'));
            const manual = drawer.locator('textarea');
            await manual.waitFor();
            const [text, selected] = await manual.evaluate((el) => [el.value, el.selectionEnd - el.selectionStart]);
            assert.ok(text.startsWith('# 页面批注：批注层测试页') && text.includes('3. 位置：'), text);
            assert.equal(selected, text.length, 'all of it selected');
        } else {
            await tap(button(drawer, '复制给 agent'));
            await page.locator('.ann-toast', { hasText: '已复制' }).waitFor();
            const text = await page.evaluate(() => navigator.clipboard.readText());
            assert.ok(text.startsWith('# 页面批注：批注层测试页') && text.includes('3. 位置：'), text);
        }
    });

    await check(name('下载 .md saves the export'), async () => {
        const drawer = page.locator('.ann-drawer');
        const [download] = await Promise.all([page.waitForEvent('download'), tap(button(drawer, '下载 .md'))]);
        assert.match(download.suggestedFilename(), /^annotations-\d{12}\.md$/);
        assert.ok(fs.readFileSync(await download.path(), 'utf8').startsWith('# 页面批注：批注层测试页'));
        await tap(drawer.locator('.ann-x'));
    });

    await check(name('notes and pins survive a reload; clear() empties them'), async () => {
        await page.reload();
        await page.waitForFunction(() => window.__annotate);
        assert.equal((await notes(page)).length, 3);
        await page.waitForFunction(() => document.querySelectorAll('.ann-pin').length === 3);
        assert.equal(await page.locator('.ann-badge').textContent(), '3');
        await page.evaluate(() => window.__annotate.clear());
        assert.equal(await page.locator('.ann-pin').count(), 0);
        assert.equal(await page.locator('.ann-badge').isVisible(), false);
    });
    await done();
}

async function claudeFlow(view) {
    const { page, tap, touch, done, box } = await open(view, 'index.html', { can: 'available' });
    const name = (text) => `${view} claude: ${text}`;
    // one tap on 发给 Claude that the fake rejects with `code`; exactly one write goes out
    const rejected = async (selector, code, note) => {
        await page.evaluate((code) => (window.__fake.fail = { sendToClaude: code }), code);
        await tap(page.locator(selector));
        await box.waitFor();
        await box.locator('textarea').fill(note);
        const before = (await writes(page)).length;
        await tap(button(box, '发给 Claude'));
        await box.locator('.ann-hint.ann-bad').waitFor();
        await page.waitForTimeout(300);
        assert.equal((await writes(page)).length, before + 1, 'one attempt, no automatic retry');
        assert.equal(await box.locator('textarea').inputValue(), note, 'the draft stays');
    };

    await check(name('switches to claude mode and writes nothing at load'), async () => {
        await page.waitForFunction(() => window.__annotate.mode === 'claude');
        await page.waitForTimeout(300);
        assert.deepEqual(await writes(page), []);
    });

    await check(name('发给 Claude sends {anchor, text} with the location, quote and note lines'), async () => {
        await select(page, '#p-bg', '纯净直出');
        await tap(page.locator('.ann-chip'));
        await box.waitFor();
        await box.locator('textarea').fill('这一句改成口语');
        assert.deepEqual(await writes(page), [], 'opening and typing write nothing');
        await shot(page, touch ? 'phone-composer-claude' : 'desktop-popover-claude');
        await tap(button(box, '发给 Claude'));
        await box.waitFor({ state: 'detached' });
        const [[method, args], ...rest] = await writes(page);
        assert.equal(rest.length, 0);
        assert.equal(method, 'sendToClaude');
        assert.deepEqual(args, {
            anchor: { path: 'fake p', x: 0.5, y: 0.5 },
            text: '〔1 · 背景 › #p-bg〕\n「纯净直出」\n\n这一句改成口语'
        });
        assert.deepEqual(
            (await notes(page)).map((n) => n.kind),
            ['claude']
        );
        assert.equal(await page.locator('.ann-badge').textContent(), '1');
        assert.equal(await page.locator('.ann-pin').count(), 0, 'the shell draws the pins of its threads');
        assert.ok(
            (await page.evaluate(() => window.__annotate.exportMarkdown())).includes('   批注：这一句改成口语\n')
        );
    });

    await check(name('只留批注 creates a plain comment at the tapped card'), async () => {
        await tap(page.locator('.ann-pill'));
        await tap(page.locator('[data-anchor="E2"]'), { position: { x: 6, y: 6 } });
        await box.waitFor();
        await box.locator('textarea').fill('E2 先不做');
        await tap(button(box, '只留批注'));
        await box.waitFor({ state: 'detached' });
        const [method, args] = (await writes(page)).pop();
        assert.equal(method, 'create');
        assert.deepEqual(args, {
            anchor: { path: 'fake article', x: 0.5, y: 0.5 },
            text: '〔2 · 方案 › E2 轻度均衡〕\n「E2 轻度均衡 加一点低频，听感更暖。」\n\nE2 先不做'
        });
    });

    await check(name('consent_required keeps the draft and says where to allow it'), async () => {
        await rejected('#fig', 'consent_required', '图换成实拍');
        assert.match(
            await box.locator('.ann-hint').textContent(),
            /没有授权这页代你评论，可以在 claude\.ai 的评论面板里允许/
        );
        await tap(box.locator('.ann-x'));
    });

    await check(name('rate_limited asks to slow down'), async () => {
        await rejected('#fig', 'rate_limited', '再说一遍');
        assert.equal(await box.locator('.ann-hint').textContent(), '发得太快了，稍后再试');
        await tap(box.locator('.ann-x'));
    });

    await check(name('an unknown error shows its code and keeps the draft'), async () => {
        await rejected('#fig', 'upstream_error', '第三次');
        assert.match(await box.locator('.ann-hint').textContent(), /upstream_error/);
        await tap(box.locator('.ann-x'));
    });

    await check(name('claude_unavailable keeps the draft and offers 只留批注'), async () => {
        await rejected('#row-latency td >> nth=1', 'claude_unavailable', '加一列 E3');
        assert.equal(await button(box, '发给 Claude').isDisabled(), true);
        assert.match(await button(box, '只留批注').getAttribute('class'), /ann-primary/);
        await tap(button(box, '只留批注'));
        await box.waitFor({ state: 'detached' });
        assert.equal((await writes(page)).pop()[0], 'create');
    });

    await check(name('a write held for consent waits with the buttons off, then finishes'), async () => {
        await page.evaluate(() => Object.assign(window.__fake, { fail: {}, hold: true }));
        await tap(page.locator('#intro'));
        await box.waitFor();
        await box.locator('textarea').fill('开头太长');
        await tap(button(box, '发给 Claude'));
        await page.waitForTimeout(300);
        assert.equal(await button(box, '发给 Claude').isDisabled(), true);
        assert.equal(await button(box, '只留批注').isDisabled(), true);
        await page.evaluate(() => {
            window.__fake.hold = false;
            window.__fake.release();
        });
        await box.waitFor({ state: 'detached' });
        assert.equal(await page.locator('.ann-badge').textContent(), '4');
    });

    await check(name('forbidden falls back to local mode with the draft kept'), async () => {
        await rejected('[data-anchor="E1"] p', 'forbidden', 'E1 留着');
        assert.equal(await mode(page), 'local');
        assert.match(await box.locator('.ann-hint').textContent(), /不能代你评论/);
        await tap(button(box, '存下来'));
        await box.waitFor({ state: 'detached' });
        const kinds = (await notes(page)).map((n) => n.kind);
        assert.deepEqual(kinds, ['claude', 'comment', 'comment', 'claude', 'local']);
        await page.locator('.ann-pin', { hasText: '5' }).waitFor();
        const before = (await writes(page)).length;
        await tap(page.locator('#intro'));
        await box.waitFor();
        assert.equal(await button(box, '存下来').count(), 1);
        assert.equal(await button(box, '发给 Claude').count(), 0);
        await tap(box.locator('.ann-x'));
        assert.equal((await writes(page)).length, before, 'nothing more goes to the platform');
        const md = await page.evaluate(() => window.__annotate.exportMarkdown());
        assert.ok(
            md.includes('5. 位置：2 · 方案 › E1 纯净直出\n   原文：「不做任何处理，延迟最低。」\n   批注：E1 留着\n'),
            md
        );
    });
    await done();
}

async function otherModes(view) {
    {
        const { page, tap, done, box } = await open(view, 'index.html', { can: 'writers_only' });
        await check(`${view} comments: writers_only offers 留批注 and says why`, async () => {
            await page.waitForFunction(() => window.__annotate.mode === 'comments');
            await tap(page.locator('.ann-pill'));
            await tap(page.locator('#fig'));
            await box.waitFor();
            assert.equal(await box.locator('.ann-hint').textContent(), '只有能编辑这页的人能发给 Claude');
            assert.equal(await button(box, '发给 Claude').count(), 0);
            await box.locator('textarea').fill('图注字太小');
            await tap(button(box, '留批注'));
            await box.waitFor({ state: 'detached' });
            const [[method, args], ...rest] = await writes(page);
            assert.equal(rest.length, 0);
            assert.equal(method, 'create');
            assert.equal(args.text, '〔2 · 方案 › 图 1 · 频谱对比〕\n「两种方案的频谱对比」\n\n图注字太小');
        });
        await done();
    }
    {
        const { page, done } = await open(view, 'codex.html', { can: 'available' });
        await check(`${view} config: data-agent="codex" stays local, data-label renames the pill`, async () => {
            await page.waitForTimeout(400);
            assert.equal(await mode(page), 'local');
            assert.deepEqual(await page.evaluate(() => window.__calls), []);
            assert.equal(await page.locator('.ann-pill span').first().textContent(), '提意见');
        });
        await done();
    }
    {
        const { page, tap, done, box } = await open(view, 'index.html', { can: 'available', hang: true });
        await check(`${view} hanging use(): the page works locally meanwhile`, async () => {
            await page.waitForTimeout(400);
            assert.equal(await mode(page), 'local');
            await tap(page.locator('.ann-pill'));
            await tap(page.locator('#intro'));
            await box.waitFor();
            await box.locator('textarea').fill('先存着');
            await tap(button(box, '存下来'));
            await box.waitFor({ state: 'detached' });
            assert.equal((await notes(page)).length, 1);
        });
        await done();
    }
}

await check('inline.mjs: idempotent, before </body>, or at the end without one', async () => {
    const once = inlineAnnotate(PAGE, { source: 'a "quoted" <source>' });
    assert.equal(inlineAnnotate(once, { source: 'a "quoted" <source>' }), once);
    assert.equal(once.match(/<script data-annotate/g).length, 1);
    assert.ok(once.includes('<script data-annotate data-source="a &quot;quoted&quot; &lt;source&gt;">'));
    assert.ok(/<\/script>\n<\/body>/.test(once), 'right before </body>');
    const bare = inlineAnnotate('<p>hi</p>');
    assert.ok(bare.startsWith('<p>hi</p>\n<script data-annotate>\n') && bare.endsWith('})();\n</script>\n'));
    const size = fs.statSync(new URL('./annotate/annotate.js', import.meta.url)).size;
    assert.ok(size <= 30 * 1024, `annotate.js is ${size} bytes`);
});
try {
    for (const view of ['desktop', 'phone']) {
        await localFlow(view);
        await claudeFlow(view);
        await otherModes(view);
    }
} finally {
    await browser.close();
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.ok);
for (const result of results)
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.ok ? '' : `\n      ${result.error}`}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed · screenshots in ${shots}`);
process.exitCode = failed.length ? 1 : 0;
