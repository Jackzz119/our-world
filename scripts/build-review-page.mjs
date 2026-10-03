// Builds the published copy of the design system's UI/UX review page (ai/design_system/uiux/cinnaglass/ux/index.html).
// The artifact host wraps the page in its own document, so the page's wrapper is dropped; images from elsewhere in the
// design system are copied next to it under short folders; links to repo documents become links to GitHub (dev).
// node scripts/build-review-page.mjs <out-dir>   then publish <out-dir>/index.html with the files it lists.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inlineAnnotate } from '../ai/jaSkills/annotated-report/assets/inline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageDir = path.join(root, 'ai/design_system/uiux/cinnaglass/ux');
const REPO = 'https://github.com/Jackzz119/our-world/blob/dev/';
// page-relative prefix -> folder in the published copy
const MOUNTS = {
    '../../../codex-visual/ui-motion/img/': 'board/',
    '../../../codex-visual/art-requests/img/': 'art/',
    '../../../codex-visual/nav-dock/img/': 'dock/'
};

const out = process.argv[2];
if (!out) {
    process.stderr.write('usage: node scripts/build-review-page.mjs <out-dir>\n');
    process.exit(1);
}
const outDir = path.resolve(out);
let html = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf8');

// the host supplies doctype, html, head, body, charset and viewport
html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?html\b[^>]*>\s*/gi, '')
    .replace(/<\/?head>\s*/gi, '')
    .replace(/<\/?body>\s*/gi, '')
    .replace(/<meta\s+charset=[^>]*>\s*/i, '')
    .replace(/<meta\s+name="viewport"[^>]*>\s*/i, '');

const copies = new Map();
const failures = [];
const rewrite = (ref) => {
    if (/^(https?:|data:|mailto:|#)/i.test(ref)) return ref;
    const [file, hash] = ref.split('#');
    const source = path.resolve(pageDir, file);
    if (!fs.existsSync(source)) {
        failures.push(ref);
        return ref;
    }
    const mount = Object.keys(MOUNTS).find((prefix) => file.startsWith(prefix));
    let published = null;
    if (mount) published = MOUNTS[mount] + file.slice(mount.length);
    else if (!file.startsWith('../') && !file.endsWith('.md') && fs.statSync(source).isFile()) published = file;
    if (published) {
        copies.set(published, source);
        return published + (hash ? `#${hash}` : '');
    }
    // a document or folder of the repo: read it on GitHub
    return REPO + path.relative(root, source).split(path.sep).join('/') + (hash ? `#${hash}` : '');
};
html = html
    .replace(/\b(src|href|poster|data-full)="([^"]+)"/g, (_, attr, ref) => `${attr}="${rewrite(ref)}"`)
    .replace(/url\('([^']+)'\)/g, (_, ref) => `url('${rewrite(ref)}')`);
if (failures.length) {
    process.stderr.write(`missing files:\n  ${failures.join('\n  ')}\n`);
    process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
// the annotation layer (skill annotated-report): publish with capabilities: {comments: {}} so notes can reach Claude
html = inlineAnnotate(html, { source: 'ai/design_system/uiux/cinnaglass/ux/index.html' });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
const files = {};
for (const [published, source] of [...copies].sort()) {
    const target = path.join(outDir, published);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    files[published] = target;
}
const bytes = Object.values(files).reduce((sum, file) => sum + fs.statSync(file).size, 0);
process.stdout.write(
    `${JSON.stringify({ page: path.join(outDir, 'index.html'), count: copies.size, megabytes: +(bytes / 1048576).toFixed(1), files }, null, 2)}\n`
);
