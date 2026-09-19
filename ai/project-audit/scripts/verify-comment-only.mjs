/** 校验一批文件相对某个提交是否只改了注释：去注释后规范化打印的 AST 必须逐字相同。false 只说明有非注释差异，仍须人工看 diff。 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, a) => (i % 2 === 0 && p.push([v.replace(/^--/, ''), a[i + 1]]), p), []));
if (!args.root || !args.revision) throw new Error('用法：--root <项目根> --revision <提交> [--output <json>] [--files a,b]');
const root = path.resolve(args.root);
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const printer = ts.createPrinter({ removeComments: true });
const files = (args.files ? args.files.split(',') : execFileSync('git', ['diff', '--name-only', args.revision, '--'], { cwd: root, encoding: 'utf8' }).trim().split('\n'))
    .filter((f) => /\.(?:[cm]?js|tsx?)$/.test(f) && !f.endsWith('.d.ts'));
/** 去注释规范化打印；解析失败返回 null。 */
function normalized(file, text) {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    return printer.printFile(sf).replace(/\s+/g, ' ');
}
const results = files.map((file) => {
    let before;
    try { before = execFileSync('git', ['show', `${args.revision}:${file}`], { cwd: root, encoding: 'utf8' }); } catch { return { file, status: 'new-file' }; }
    let after;
    try { after = readFileSync(path.join(root, file), 'utf8'); } catch { return { file, status: 'deleted' }; }
    const same = normalized(file, before) === normalized(file, after);
    return { file, status: same ? 'comment-only' : 'code-changed' };
});
if (args.output) writeFileSync(args.output, JSON.stringify(results, null, 1));
console.log(JSON.stringify({ total: results.length, commentOnly: results.filter((r) => r.status === 'comment-only').length, codeChanged: results.filter((r) => r.status === 'code-changed').map((r) => r.file) }, null, 1));
