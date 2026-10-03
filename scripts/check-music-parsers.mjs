// Node check of the music parsing modules in src/lib/music (lyrics, cue, text, sha256, sniff, metadata,
// ingest-plan; feature doc ai/features/music/music.md). Bundles scripts/fixtures/music-parsers.test.ts
// with esbuild (taken from Vite's own dependency, so nothing extra to install), mapping @/ to src/, into
// tmp/music-parsers-check/ (gitignored, and inside the project so music-metadata resolves from
// node_modules), then runs it against the corpus in tmp/music-fixtures. Builds the corpus first when it
// is missing (python3 + ffmpeg). Exits non-zero when any check fails.
// Usage: node scripts/check-music-parsers.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'tmp/music-fixtures');
const outDir = path.join(root, 'tmp/music-parsers-check');
const outFile = path.join(outDir, 'music-parsers.test.mjs');

// esbuild as installed for Vite (pnpm keeps it out of the top-level node_modules).
const require = createRequire(import.meta.url);
const esbuild = require(createRequire(require.resolve('vite')).resolve('esbuild'));

if (!existsSync(path.join(fixtures, 'manifest.json'))) {
    console.log('tmp/music-fixtures is missing; building it with scripts/make-music-fixtures.py …');
    const built = spawnSync('python3', [path.join(root, 'scripts/make-music-fixtures.py')], { stdio: 'inherit' });
    if (built.status !== 0) {
        console.error('Could not build the corpus (needs python3 and ffmpeg).');
        process.exit(2);
    }
}

mkdirSync(outDir, { recursive: true });
await esbuild.build({
    entryPoints: [path.join(root, 'scripts/fixtures/music-parsers.test.ts')],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    alias: { '@': path.join(root, 'src') },
    external: ['music-metadata'],
    logLevel: 'warning'
});

const started = performance.now();
const { run } = await import(pathToFileURL(outFile).href);
console.log('music parsers check');
const { passed, failed } = await run(fixtures);
const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`\n${passed} passed, ${failed} failed (${seconds} s)`);
process.exit(failed ? 1 : 0);
