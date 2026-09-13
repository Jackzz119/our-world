// Validates the maintained Markdown graph and local previews; writes no project reports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const designRoot = path.join(root, 'ai/design_system');
const failures = [];
const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
        const target = path.join(dir, item.name);
        return item.isDirectory() ? walk(target) : [target];
    });
const slash = (value) => value.replaceAll('\\', '/');
let checkedLinks = 0;
const documents = walk(designRoot).filter((file) => /\.(html|md)$/.test(file));
const edges = new Map();
for (const filename of documents) {
    const text = fs.readFileSync(filename, 'utf8');
    const refs = filename.endsWith('.html')
        ? [...text.matchAll(/<(?:a|img|link|script|source|video|audio|iframe)\b[^>]*>/gi)]
              .flatMap((tag) =>
                  [...tag[0].matchAll(/\b(?:href|src|poster)\s*=\s*(["'])([^"'<>]+)\1/g)].map((match) => match[2])
              )
              .concat(
                  [
                      ...text
                          .replace(/url\(\s*(["'])data:[\s\S]*?\1\s*\)/gi, '')
                          .matchAll(/url\(\s*["']?([^\s'"()]+)["']?\s*\)/g)
                  ].map((match) => match[1])
              )
        : [...text.replace(/```[\s\S]*?```/g, '').matchAll(/\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)].map(
              (match) => match[1] || match[2]
          );
    for (const ref of refs) {
        if (!ref || /^(https?:|data:|mailto:|javascript:|tel:)/i.test(ref) || /[${}]/.test(ref)) continue;
        const [targetPart, hash] = ref.split('#');
        const targetName = decodeURIComponent(targetPart.split('?')[0]);
        let target = targetName ? path.resolve(path.dirname(filename), targetName) : filename;
        if (targetName.startsWith('/')) {
            target = path.join(root, targetName);
            if (!fs.existsSync(target)) target = path.join(root, 'public', targetName);
        }
        if (!fs.existsSync(target)) {
            failures.push(`Broken link: ${slash(path.relative(root, filename))} -> ${ref}`);
            continue;
        }
        checkedLinks++;
        if (filename.endsWith('.md') && target.endsWith('.md')) {
            const links = edges.get(filename) || [];
            links.push(target);
            edges.set(filename, links);
        }
        if (hash && target.endsWith('.html')) {
            const destination = fs.readFileSync(target, 'utf8');
            const ids = [...destination.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]);
            if (!ids.includes(decodeURIComponent(hash)))
                failures.push(`Missing anchor: ${slash(path.relative(root, filename))} -> ${ref}`);
        }
    }
}

const entry = path.join(designRoot, 'design-system.md');
const reached = new Set();
const queue = [entry];
while (queue.length) {
    const file = queue.pop();
    if (reached.has(file)) continue;
    reached.add(file);
    queue.push(...(edges.get(file) || []));
}
const maintained = documents.filter((file) => {
    const relative = slash(path.relative(designRoot, file));
    return (
        relative.endsWith('.md') &&
        !relative.endsWith('README.md') &&
        !/(^|\/)(concept|research|journal-room-object|ui-unification)\//.test(relative)
    );
});
for (const file of maintained) {
    const relative = slash(path.relative(designRoot, file));
    if (!reached.has(file)) failures.push(`Not linked from design-system.md: ${relative}`);
    if (
        !/(decisions|interaction)\.md$/.test(relative) &&
        !/!\[[^\]]*\]\(|<img\b|<video\b/.test(fs.readFileSync(file, 'utf8'))
    ) {
        failures.push(`Current design lacks visual media: ${relative}`);
    }
}
if (!fs.existsSync(entry)) failures.push('Missing maintained entry: design-system.md');
const report = { maintainedDocuments: maintained.length, documents: documents.length, checkedLinks, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
