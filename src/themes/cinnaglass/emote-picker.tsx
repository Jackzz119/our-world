// emote-picker.tsx — the full emoji/sticker picker (chat.md EMO-4, mockup
// emoji-picker.html 方案 B): search + tabs 🕐recent / 😊emoji / 💗world
// stickers / 🎞️gif(placeholder). One component, reused by the composer 😊
// (mode 'composer': emoji inserts, stickers send) and the reaction bar ➕
// (mode 'reaction': emoji only — stickers aren't reactions, D-7/B-1).
// The world tab hosts the import flow: web search (Tenor via edge function)
// + local upload + paste-URL fallback. Panel is paper-solid (D-9).
import { useRef, useState } from 'react';
import { ALL_EMOJI, EMOJI_CATEGORIES } from './emoji-data';
import type { EmoteRow, EmoteSearchResult } from '@/types/chat.ts';

export type EmoteView = EmoteRow & { url: string | null };

const RECENT_KEY = 'ow-emoji-recent-v1';
const RECENT_MAX = 16;
const loadRecent = (): string[] => {
    try {
        const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(v) ? v.slice(0, RECENT_MAX) : [];
    } catch {
        return [];
    }
};

const PickerStyles = () => (
    <style>{`
  .epk{width:318px;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
    background:var(--glass-paper);border:1px solid var(--glass-line);
    box-shadow:0 18px 44px -14px rgba(20,29,51,.5);}
  .epk-search{margin:10px 10px 8px;display:flex;align-items:center;gap:7px;height:32px;border-radius:10px;
    background:rgba(34,51,90,.06);padding:0 10px;}
  .epk-search input{flex:1;min-width:0;border:0;background:transparent;outline:none;font:inherit;
    font-size:12px;color:var(--glass-text);}
  .epk-tabs{display:flex;gap:2px;padding:0 10px 6px;border-bottom:1px solid rgba(34,51,90,.08);}
  .epk-tab{flex:1;height:30px;border-radius:9px;display:grid;place-items:center;font-size:15px;cursor:pointer;
    border:0;background:transparent;padding:0;}
  .epk-tab.on{background:rgba(89,197,237,.18);box-shadow:inset 0 -2px 0 var(--accent-deep);}
  .epk-tab:disabled{opacity:.35;cursor:default;}
  .epk-bd{max-height:288px;overflow-y:auto;padding-bottom:8px;}
  .epk-bd::-webkit-scrollbar{width:6px;}
  .epk-bd::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}
  .epk-sec{font-size:10px;letter-spacing:.1em;font-weight:700;color:var(--glass-sub);padding:8px 12px 2px;text-transform:uppercase;}
  .epk-grid{display:grid;grid-template-columns:repeat(8,34px);gap:1px;padding:2px 10px 4px;}
  .epk-grid button{width:34px;height:34px;display:grid;place-items:center;font-size:19px;border-radius:8px;
    cursor:pointer;border:0;background:transparent;padding:0;}
  .epk-grid button:hover{background:rgba(89,197,237,.15);}
  .epk-empty{font-size:12px;color:var(--glass-sub);padding:16px 12px;text-align:center;}

  /* world sticker tiles */
  .epk-stk{display:grid;grid-template-columns:repeat(4,68px);gap:6px;padding:4px 10px 8px;}
  .epk-stk .tile{position:relative;width:68px;height:68px;border-radius:12px;cursor:pointer;border:0;padding:0;
    background:rgba(34,51,90,.05);overflow:hidden;}
  .epk-stk .tile img{width:100%;height:100%;object-fit:contain;}
  .epk-stk .tile:hover{background:rgba(89,197,237,.15);}
  .epk-stk .tile .rmv{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:7px;border:0;
    display:none;place-items:center;cursor:pointer;font-size:10px;color:#fff;background:rgba(224,113,143,.9);padding:0;}
  .epk-stk .tile:hover .rmv{display:grid;}
  .epk-stk .add{display:grid;place-items:center;font-size:20px;color:var(--glass-sub);
    border:1.5px dashed rgba(34,51,90,.25);background:transparent;}
  .epk-stk .add:hover{color:var(--accent-deep);border-color:var(--accent);}

  /* import view */
  .epk-imp{padding:10px 12px;}
  .epk-imp .row{display:flex;gap:6px;margin-bottom:8px;}
  .epk-imp input{flex:1;min-width:0;height:30px;border-radius:9px;border:1px solid var(--glass-line);
    background:rgba(255,255,255,.9);padding:0 9px;font:inherit;font-size:12px;outline:none;color:var(--glass-text);}
  .epk-imp input:focus{border-color:var(--accent);}
  .epk-imp button{appearance:none;border:0;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;
    padding:0 11px;border-radius:9px;color:#fff;background:linear-gradient(135deg,#86c99a,#5fa878);}
  .epk-imp button:disabled{opacity:.5;cursor:default;}
  .epk-imp .alt{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--glass-sub);margin:4px 0 6px;}
  .epk-imp .alt .lnk{text-decoration:underline;cursor:pointer;color:var(--accent-deep);}
  .epk-imp .msg{font-size:11px;color:var(--glass-sub);margin-top:4px;}
  .epk-imp .msg.err{color:#e0718f;}
  .epk-imp .res{display:grid;grid-template-columns:repeat(4,68px);gap:6px;margin-top:6px;}
  .epk-imp .res button{width:68px;height:68px;border-radius:12px;padding:0;overflow:hidden;
    background:rgba(34,51,90,.05);}
  .epk-imp .res img{width:100%;height:100%;object-fit:cover;}
  .epk-back{font-size:11px;color:var(--accent-deep);cursor:pointer;padding:8px 12px 0;font-weight:700;}
  `}</style>
);

type Tab = 'recent' | 'emoji' | 'world';

type EmotePickerProps = {
    mode: 'composer' | 'reaction';
    emotes: EmoteView[];
    canImport: boolean; // has a world (the library is world-scoped)
    onPickEmoji: (ch: string) => void;
    onPickSticker?: (emote: EmoteView) => void;
    onSearchWeb: (q: string) => Promise<EmoteSearchResult[]>;
    onImportUrl: (url: string, name: string) => Promise<void>;
    onImportFile: (file: File, name: string) => Promise<void>;
    onRemoveEmote: (id: string) => void;
};

export function EmotePicker({ mode, emotes, canImport, onPickEmoji, onPickSticker, onSearchWeb, onImportUrl, onImportFile, onRemoveEmote }: EmotePickerProps) {
    const [tab, setTab] = useState<Tab>('emoji');
    const [q, setQ] = useState('');
    const [importing, setImporting] = useState(false);
    const [impQ, setImpQ] = useState('');
    const [impName, setImpName] = useState('');
    const [impUrl, setImpUrl] = useState('');
    const [impBusy, setImpBusy] = useState(false);
    const [impMsg, setImpMsg] = useState<{ text: string; err: boolean } | null>(null);
    const [results, setResults] = useState<EmoteSearchResult[]>([]);
    const [recent, setRecent] = useState<string[]>(loadRecent);
    const fileRef = useRef<HTMLInputElement>(null);

    const pickEmoji = (ch: string) => {
        const next = [ch, ...recent.filter((x) => x !== ch)].slice(0, RECENT_MAX);
        setRecent(next);
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
        onPickEmoji(ch);
    };

    const query = q.trim().toLowerCase();
    const emojiHits = query ? ALL_EMOJI.filter((x) => x.k.toLowerCase().includes(query)) : null;
    const worldHits = query ? emotes.filter((e) => e.name.toLowerCase().includes(query)) : emotes;

    const runWebSearch = async () => {
        const v = impQ.trim();
        if (!v || impBusy) return;
        setImpBusy(true);
        setImpMsg(null);
        try {
            const r = await onSearchWeb(v);
            setResults(r);
            if (!impName) setImpName(v.slice(0, 24));
            if (!r.length) setImpMsg({ text: '没搜到，换个词试试', err: false });
        } catch (e) {
            setImpMsg({ text: e instanceof Error ? e.message : String(e), err: true });
        } finally {
            setImpBusy(false);
        }
    };

    const doImport = async (fn: () => Promise<void>) => {
        if (impBusy) return;
        setImpBusy(true);
        setImpMsg(null);
        try {
            await fn();
            setImpMsg({ text: '已加入你们的表情库 ✨', err: false });
            setResults([]);
            setImpUrl('');
        } catch (e) {
            setImpMsg({ text: e instanceof Error ? e.message : String(e), err: true });
        } finally {
            setImpBusy(false);
        }
    };
    const nameOr = (fallback: string) => (impName.trim() || fallback).slice(0, 24);

    return (
        <div className="epk" onClick={(e) => e.stopPropagation()}>
            <PickerStyles />
            {!importing && (
                <>
                    <div className="epk-search">
                        🔍
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索表情…" spellCheck={false} />
                    </div>
                    <div className="epk-tabs">
                        <button type="button" className={`epk-tab ${tab === 'recent' ? 'on' : ''}`} title="最近使用" onClick={() => setTab('recent')}>
                            🕐
                        </button>
                        <button type="button" className={`epk-tab ${tab === 'emoji' ? 'on' : ''}`} title="Emoji" onClick={() => setTab('emoji')}>
                            😊
                        </button>
                        {mode === 'composer' && (
                            <button type="button" className={`epk-tab ${tab === 'world' ? 'on' : ''}`} title="世界表情" onClick={() => setTab('world')}>
                                💗
                            </button>
                        )}
                        <button type="button" className="epk-tab" title="GIF（后续开放）" disabled>
                            🎞️
                        </button>
                    </div>
                    <div className="epk-bd">
                        {query && tab !== 'world' && (
                            <>
                                <div className="epk-sec">搜索结果</div>
                                {emojiHits!.length === 0 && <div className="epk-empty">没找到「{q}」</div>}
                                <div className="epk-grid">
                                    {emojiHits!.map((x) => (
                                        <button key={x.e} type="button" title={x.k} onClick={() => pickEmoji(x.e)}>
                                            {x.e}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {!query && tab === 'recent' && (
                            <>
                                <div className="epk-sec">最近使用</div>
                                {recent.length === 0 && <div className="epk-empty">还没用过表情，去别的 tab 逛逛</div>}
                                <div className="epk-grid">
                                    {recent.map((ch) => (
                                        <button key={ch} type="button" onClick={() => pickEmoji(ch)}>
                                            {ch}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {!query && tab === 'emoji' &&
                            EMOJI_CATEGORIES.map((cat) => (
                                <div key={cat.name}>
                                    <div className="epk-sec">{cat.name}</div>
                                    <div className="epk-grid">
                                        {cat.items.map((x) => (
                                            <button key={x.e} type="button" title={x.k} onClick={() => pickEmoji(x.e)}>
                                                {x.e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        {tab === 'world' && mode === 'composer' && (
                            <>
                                <div className="epk-sec">世界表情 · 你们的专属库</div>
                                {worldHits.length === 0 && <div className="epk-empty">{query ? `没有叫「${q}」的贴纸` : '还没有贴纸，点 ＋ 去收集'}</div>}
                                <div className="epk-stk">
                                    {worldHits.map((e) => (
                                        <button key={e.id} type="button" className="tile" title={`:${e.name}:`} onClick={() => onPickSticker?.(e)}>
                                            {e.url ? <img src={e.url} alt={e.name} /> : <span style={{ fontSize: 10 }}>{e.name}</span>}
                                            <span
                                                className="rmv"
                                                title="移出表情库"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    if (window.confirm(`把 :${e.name}: 移出你们的表情库？已发送的贴纸会变成占位。`)) onRemoveEmote(e.id);
                                                }}
                                            >
                                                ✕
                                            </span>
                                        </button>
                                    ))}
                                    {canImport && (
                                        <button type="button" className="tile add" title="添加贴纸" onClick={() => setImporting(true)}>
                                            ＋
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
            {importing && (
                <>
                    <div className="epk-back" onClick={() => setImporting(false)}>
                        ← 返回表情库
                    </div>
                    <div className="epk-imp">
                        <div className="row">
                            <input
                                value={impQ}
                                onChange={(e) => setImpQ(e.target.value)}
                                placeholder="搜表情加进你们的世界…"
                                spellCheck={false}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void runWebSearch();
                                }}
                            />
                            <button type="button" disabled={impBusy || !impQ.trim()} onClick={() => void runWebSearch()}>
                                {impBusy ? '…' : '搜索'}
                            </button>
                        </div>
                        <div className="row">
                            <input value={impName} onChange={(e) => setImpName(e.target.value)} placeholder="给它起个名字（:别名:）" spellCheck={false} />
                        </div>
                        {results.length > 0 && (
                            <div className="res">
                                {results.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        title="点击加入表情库"
                                        onClick={() => void doImport(() => onImportUrl(r.url, nameOr(impQ.trim() || 'sticker')))}
                                    >
                                        <img src={r.preview ?? r.url} alt={r.title} loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="alt">
                            或
                            <span className="lnk" onClick={() => fileRef.current?.click()}>
                                上传图片
                            </span>
                            /
                            <span className="lnk" onClick={() => setImpUrl(impUrl ? '' : ' ')}>
                                粘贴图片链接
                            </span>
                        </div>
                        {impUrl !== '' && (
                            <div className="row">
                                <input value={impUrl.trim()} onChange={(e) => setImpUrl(e.target.value || ' ')} placeholder="https://…" spellCheck={false} />
                                <button
                                    type="button"
                                    disabled={impBusy || !impUrl.trim()}
                                    onClick={() => void doImport(() => onImportUrl(impUrl.trim(), nameOr('sticker')))}
                                >
                                    导入
                                </button>
                            </div>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (f) void doImport(() => onImportFile(f, nameOr(f.name.replace(/\.[^.]+$/, '').slice(0, 24))));
                            }}
                        />
                        {impMsg && <div className={`msg ${impMsg.err ? 'err' : ''}`}>{impMsg.text}</div>}
                    </div>
                </>
            )}
        </div>
    );
}
