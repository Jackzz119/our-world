/** 单包 Vite/TS 项目的结构扫描：文件规模、导入图（按 tsconfig 别名解析）、扇入/扇出、循环依赖、具名声明与注释线索、同体函数候选。只读，不改被审文件。 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, a) => (i % 2 === 0 && p.push([v.replace(/^--/, ''), a[i + 1]]), p), []));
if (!args.root || !args.output) throw new Error('用法：--root <项目根> --output <输出目录> [--include src,scripts,vite.config.ts]');
const root = path.resolve(args.root);
const out = path.resolve(args.output);
mkdirSync(out, { recursive: true });
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const include = (args.include || 'src,scripts,vite.config.ts,eslint.config.js').split(',');

/** 递归收集自有 TS/JS 源文件，跳过声明文件。 */
function collect(p) {
    const abs = path.join(root, p);
    if (!statSync(abs, { throwIfNoEntry: false })) return [];
    if (statSync(abs).isFile()) return /\.(?:[cm]?js|tsx?)$/.test(p) && !p.endsWith('.d.ts') ? [p] : [];
    return readdirSync(abs).flatMap((n) => collect(path.posix.join(p, n)));
}
const files = include.flatMap(collect).sort();
const fileSet = new Set(files);
const declFiles = collect('src').length ? files : files;

/** 解析 import 说明符：相对路径、`@/` 别名指向 src；外部包返回 null。 */
function resolveImport(from, spec) {
    let target = null;
    if (spec.startsWith('.')) target = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    else if (spec.startsWith('@/')) target = path.posix.join('src', spec.slice(2));
    else if (spec.startsWith('/src/')) target = spec.slice(1);
    if (!target) return { external: spec };
    for (const cand of [target, ...['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx'].map((e) => target + e)]) {
        if (fileSet.has(cand)) return { internal: cand };
        if (cand.endsWith('.css') && statSync(path.join(root, cand), { throwIfNoEntry: false })) return { asset: cand };
    }
    if (statSync(path.join(root, target), { throwIfNoEntry: false })) return { asset: target };
    return { unresolved: spec };
}

const printer = ts.createPrinter({ removeComments: true });
const modules = [], edges = [], decls = [], bodies = new Map();
for (const file of files) {
    const text = readFileSync(path.join(root, file), 'utf8');
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    const lines = text.split('\n').length;
    let imports = 0, exportsCount = 0, comments = 0;
    const commentRanges = (ts.getLeadingCommentRanges(text, 0) || []).length;
    /** 判断节点前是否紧邻注释（JSDoc 或行注释）。 */
    const hasLeadingComment = (node) => (ts.getLeadingCommentRanges(text, node.getFullStart()) || []).length > 0;
    /** 记录一个具名声明的规模与注释状态。 */
    const record = (name, node, type) => {
        const start = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
        const exported = !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export);
        const body = node.body ? printer.printNode(ts.EmitHint.Unspecified, node.body, sf).replace(/\s+/g, ' ') : '';
        const hash = body.length > 80 ? createHash('sha1').update(body).digest('hex').slice(0, 12) : null;
        if (hash) bodies.set(hash, [...(bodies.get(hash) || []), `${file}:${start} ${name}`]);
        decls.push({ file, name, type, start, end, lines: end - start + 1, exported, commented: hasLeadingComment(node), bodyHash: hash });
    };
    /** 遍历顶层与嵌套声明。 */
    const visit = (node) => {
        if (ts.isImportDeclaration(node) || (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)) {
            const spec = ts.isImportDeclaration(node) ? node.moduleSpecifier.text : node.arguments[0]?.text;
            if (spec) { imports++; const r = resolveImport(file, spec); edges.push({ from: file, spec, typeOnly: !!(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly), dynamic: !ts.isImportDeclaration(node), ...r }); }
        }
        if (ts.isExportDeclaration(node) || (ts.canHaveModifiers(node) && ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export)) exportsCount++;
        if (ts.isFunctionDeclaration(node) && node.name) record(node.name.text, node, 'function');
        else if (ts.isClassDeclaration(node) && node.name) record(node.name.text, node, 'class');
        else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && node.body) record(node.name.text, node, 'method');
        else if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) record(d.name.text, { ...d.initializer, getStart: () => node.getStart(), getEnd: () => node.getEnd(), getFullStart: () => node.getFullStart(), body: d.initializer.body, kind: node.kind, parent: node.parent, modifiers: node.modifiers, flags: node.flags }, 'arrow');
        ts.forEachChild(node, visit);
    };
    visit(sf);
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
    let tok; while ((tok = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) if (tok === ts.SyntaxKind.SingleLineCommentTrivia || tok === ts.SyntaxKind.MultiLineCommentTrivia) comments++;
    modules.push({ file, lines, bytes: Buffer.byteLength(text), imports, exports: exportsCount, commentTokens: comments, headerComment: commentRanges > 0 });
}
const internal = edges.filter((e) => e.internal);
const fanOut = Object.fromEntries(files.map((f) => [f, new Set(internal.filter((e) => e.from === f).map((e) => e.internal)).size]));
const fanIn = Object.fromEntries(files.map((f) => [f, new Set(internal.filter((e) => e.internal === f).map((e) => e.from)).size]));
/** Tarjan 求强连通分量，输出规模 >1 的环。 */
const adj = new Map(files.map((f) => [f, [...new Set(internal.filter((e) => e.from === f && !e.typeOnly).map((e) => e.internal))]]));
let index = 0; const idx = new Map(), low = new Map(), onStack = new Set(), stack = [], cycles = [];
function strong(v) { idx.set(v, index); low.set(v, index); index++; stack.push(v); onStack.add(v);
    for (const w of adj.get(v) || []) { if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w))); }
    if (low.get(v) === idx.get(v)) { const comp = []; let w; do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v); if (comp.length > 1) cycles.push(comp.sort()); } }
for (const f of files) if (!idx.has(f)) strong(f);
const orphans = files.filter((f) => fanIn[f] === 0 && !/^(src\/main\.tsx|vite\.config\.ts|eslint\.config\.js|scripts\/)/.test(f));
const dupBodies = [...bodies.values()].filter((v) => v.length > 1);
const summary = {
    files: files.length, totalLines: modules.reduce((s, m) => s + m.lines, 0),
    largest: [...modules].sort((a, b) => b.lines - a.lines).slice(0, 12).map((m) => [m.file, m.lines]),
    fanInTop: Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 10), fanOutTop: Object.entries(fanOut).sort((a, b) => b[1] - a[1]).slice(0, 10),
    cycles, orphans, unresolvedImports: edges.filter((e) => e.unresolved).map((e) => `${e.from} → ${e.unresolved}`),
    externals: [...new Set(edges.filter((e) => e.external).map((e) => e.external.split('/').slice(0, e.external.startsWith('@') ? 2 : 1).join('/')))].sort(),
    declarations: decls.length, declarationsWithoutComment: decls.filter((d) => !d.commented).length,
    longFunctions: decls.filter((d) => d.lines > 80).sort((a, b) => b.lines - a.lines).map((d) => [`${d.file}:${d.start}`, d.name, d.lines]),
    duplicateBodyCandidates: dupBodies,
    method: 'TypeScript AST；导入按相对路径与 @/ 别名解析；同体候选按去注释规范化打印哈希，仍须人工语义复核；不能替代跨模块阅读'
};
writeFileSync(path.join(out, 'structure-modules.json'), JSON.stringify(modules.map((m) => ({ ...m, fanIn: fanIn[m.file], fanOut: fanOut[m.file] })), null, 1));
writeFileSync(path.join(out, 'structure-edges.json'), JSON.stringify(edges, null, 1));
writeFileSync(path.join(out, 'structure-declarations.json'), JSON.stringify(decls, null, 1));
writeFileSync(path.join(out, 'structure-summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ files: summary.files, totalLines: summary.totalLines, cycles: summary.cycles.length, orphans: summary.orphans, unresolved: summary.unresolvedImports.length, decls: summary.declarations, uncommented: summary.declarationsWithoutComment, dupBodies: dupBodies.length, longFns: summary.longFunctions.length }, null, 1));
