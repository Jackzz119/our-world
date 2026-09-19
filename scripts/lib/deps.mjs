// deps.mjs — resolve the heavy tooling deps (playwright, sharp, pngjs) that are
// deliberately NOT in package.json: point DIARY_NODE_MODULES at a node_modules
// that has them (e.g. the Codex bundle); otherwise fall back to normal resolution.
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export const dependency = (name) =>
    require(process.env.DIARY_NODE_MODULES ? path.join(process.env.DIARY_NODE_MODULES, name) : name);

// Dev server base URL for the browser checks; `pnpm dev` serves 5173.
export const baseUrl = () => process.env.JOURNAL_URL || 'http://localhost:5173';
