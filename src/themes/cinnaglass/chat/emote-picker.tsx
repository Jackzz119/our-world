// emote-picker.tsx — the full emoji/sticker picker: search + tabs 🕐recent / 😊emoji / 💗world
// stickers / 🎞️gif(placeholder). One component, two modes — the composer's 😊 (emoji inserts,
// stickers send) and the reaction bar's ➕ (emoji only; stickers are not reactions, D-7 / B-1).
// The world tab hosts the import flow: Tenor search via the emotes edge function, local upload,
// paste-URL. The panel uses the adopted opaque reading liner and shared controls.
// Specs: ai/features/chat.md §三「emote-picker.tsx / emoji-data.ts」(subtask EMO-4 not yet
// backfilled — see ai/features/chat.md:13);
// Layout follows the first-iteration picker mockup 方案 B (B-1 / B-3), retired 2026-09-27 (see git
// history); D-7 lives in ai/features/chat.md (仍然生效的聊天交互规则) and the current UI register is
// ai/design_system/uiux/cinnaglass/decisions.md.
import { useRef, useState } from 'react';
import { IClose, IPlus } from '@/themes/cinnaglass/icons';
import '@/themes/cinnaglass/chat/emote-picker.css';
import { ALL_EMOJI, EMOJI_CATEGORIES } from '@/themes/cinnaglass/chat/emoji-data';
import type { EmoteSearchResult } from '@/types/chat';
import type { EmoteView } from '@/themes/cinnaglass/chat/chat-data';

// Recently picked emoji, per browser (localStorage — never synced, never server state).
const RECENT_KEY = 'ow-emoji-recent-v1';
const RECENT_MAX = 16;
// Read the recent list, tolerating absent or corrupted storage.
const loadRecent = (): string[] => {
    try {
        const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(v)
            ? v.filter((item): item is string => typeof item === 'string').slice(0, RECENT_MAX)
            : [];
    } catch {
        return [];
    }
};

// The world tab exists in composer mode only.
type Tab = 'recent' | 'emoji' | 'world';

// Emoji picking is always available; sticker picking and importing are composer-only.
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

// The picker. Two screens in one component: the browse screen (search + tabs) and the import screen
// reached from the world tab's ＋ tile. A non-empty search box overrides the emoji tabs but not the
// world tab, which filters its own tiles by sticker name.
export function EmotePicker({
    mode,
    emotes,
    canImport,
    onPickEmoji,
    onPickSticker,
    onSearchWeb,
    onImportUrl,
    onImportFile,
    onRemoveEmote
}: EmotePickerProps) {
    const [tab, setTab] = useState<Tab>('emoji');
    const [q, setQ] = useState('');
    const [importing, setImporting] = useState(false);
    const [removing, setRemoving] = useState<EmoteView | null>(null);
    const [impQ, setImpQ] = useState('');
    const [impName, setImpName] = useState('');
    const [impUrl, setImpUrl] = useState('');
    const [impBusy, setImpBusy] = useState(false);
    const [impMsg, setImpMsg] = useState<{ text: string; err: boolean } | null>(null);
    const [results, setResults] = useState<EmoteSearchResult[]>([]);
    const [recent, setRecent] = useState<string[]>(loadRecent);
    const fileRef = useRef<HTMLInputElement>(null);

    // Emit the pick and move it to the front of the per-browser recent list.
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

    // Search is case-insensitive over the Chinese-first keyword strings; null hits = not searching.
    const query = q.trim().toLowerCase();
    const emojiHits = query ? ALL_EMOJI.filter((x) => x.k.toLowerCase().includes(query)) : null;
    const worldHits = query ? emotes.filter((e) => e.name.toLowerCase().includes(query)) : emotes;

    // Search Tenor through the edge function; an unconfigured API key surfaces as an inline message,
    // not a throw. Seeds the sticker name from the query when the user hasn't typed one.
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

    // Shared wrapper for every import path (search result / pasted url / local file): one in-flight
    // guard, one success message, one error surface. The library itself refreshes via the
    // world_emotes broadcast, not from here.
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
    // The typed alias, or a fallback, clamped to the 24-char column limit.
    const nameOr = (fallback: string) => (impName.trim() || fallback).slice(0, 24);

    return (
        <div
            className="epk ui-liner"
            aria-label={mode === 'reaction' ? '选择回应表情' : '选择表情与贴纸'}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                    event.stopPropagation();
                    if (!event.nativeEvent.isComposing) event.preventDefault();
                }
            }}
        >
            {!importing && (
                <>
                    <div className="epk-search">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="搜索表情…"
                            aria-label="搜索表情"
                            autoFocus
                            spellCheck={false}
                        />
                    </div>
                    <div className="epk-tabs" aria-label="表情分类">
                        <button
                            type="button"
                            className={`epk-tab ${tab === 'recent' ? 'on' : ''}`}
                            title="最近使用"
                            aria-label="最近使用"
                            aria-pressed={tab === 'recent'}
                            onClick={() => setTab('recent')}
                        >
                            🕐
                        </button>
                        <button
                            type="button"
                            className={`epk-tab ${tab === 'emoji' ? 'on' : ''}`}
                            title="Emoji"
                            aria-label="Emoji 表情"
                            aria-pressed={tab === 'emoji'}
                            onClick={() => setTab('emoji')}
                        >
                            😊
                        </button>
                        {mode === 'composer' && (
                            <button
                                type="button"
                                className={`epk-tab ${tab === 'world' ? 'on' : ''}`}
                                title="世界表情"
                                aria-label="世界表情"
                                aria-pressed={tab === 'world'}
                                onClick={() => setTab('world')}
                            >
                                💗
                            </button>
                        )}
                        <button
                            type="button"
                            className="epk-tab"
                            title="GIF（后续开放）"
                            aria-label="GIF（后续开放）"
                            disabled
                        >
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
                                        <button
                                            key={x.e}
                                            type="button"
                                            title={x.k}
                                            aria-label={x.k}
                                            onClick={() => pickEmoji(x.e)}
                                        >
                                            {x.e}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {!query && tab === 'recent' && (
                            <>
                                <div className="epk-sec">最近使用</div>
                                {recent.length === 0 && (
                                    <div className="epk-empty">还没用过表情，去 Emoji 里选一个吧</div>
                                )}
                                <div className="epk-grid">
                                    {recent.map((ch) => (
                                        <button
                                            key={ch}
                                            type="button"
                                            aria-label={ALL_EMOJI.find((item) => item.e === ch)?.k || ch}
                                            onClick={() => pickEmoji(ch)}
                                        >
                                            {ch}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {!query &&
                            tab === 'emoji' &&
                            EMOJI_CATEGORIES.map((cat) => (
                                <div key={cat.name}>
                                    <div className="epk-sec">{cat.name}</div>
                                    <div className="epk-grid">
                                        {cat.items.map((x) => (
                                            <button
                                                key={x.e}
                                                type="button"
                                                title={x.k}
                                                aria-label={x.k}
                                                onClick={() => pickEmoji(x.e)}
                                            >
                                                {x.e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        {tab === 'world' && mode === 'composer' && (
                            <>
                                <div className="epk-sec">世界表情 · 你们的专属库</div>
                                {worldHits.length === 0 && (
                                    <div className="epk-empty">
                                        {query ? `没有叫「${q}」的贴纸` : '还没有贴纸，点 ＋ 去收集'}
                                    </div>
                                )}
                                {removing && (
                                    <div className="epk-confirm" role="alert">
                                        <p>移除「{removing.name}」？已发送的贴纸会显示为占位。</p>
                                        <div>
                                            <button
                                                type="button"
                                                className="ui-button"
                                                autoFocus
                                                onClick={() => setRemoving(null)}
                                            >
                                                取消
                                            </button>
                                            <button
                                                type="button"
                                                className="ui-button"
                                                onClick={() => {
                                                    onRemoveEmote(removing.id);
                                                    setRemoving(null);
                                                }}
                                            >
                                                确认移除
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="epk-stk">
                                    {worldHits.map((e) => (
                                        <div key={e.id} className="epk-sticker">
                                            <button
                                                type="button"
                                                className="tile"
                                                title={`:${e.name}:`}
                                                aria-label={`发送贴纸 ${e.name}`}
                                                onClick={() => onPickSticker?.(e)}
                                            >
                                                {e.url ? <img src={e.url} alt="" /> : <span>{e.name}</span>}
                                            </button>
                                            <button
                                                type="button"
                                                className="epk-remove"
                                                aria-label={`移除贴纸 ${e.name}`}
                                                onClick={() => setRemoving(e)}
                                            >
                                                <IClose size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {canImport && (
                                        <button
                                            type="button"
                                            className="tile add"
                                            title="添加贴纸"
                                            aria-label="添加贴纸"
                                            onClick={() => setImporting(true)}
                                        >
                                            <IPlus size={22} />
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
                    <button type="button" className="epk-back" onClick={() => setImporting(false)}>
                        ← 返回表情库
                    </button>
                    <div className="epk-imp">
                        <div className="row">
                            <input
                                value={impQ}
                                onChange={(e) => setImpQ(e.target.value)}
                                placeholder="搜表情加进你们的世界…"
                                aria-label="搜索网上贴纸"
                                autoFocus
                                spellCheck={false}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                        e.preventDefault();
                                        void runWebSearch();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                disabled={impBusy || !impQ.trim()}
                                onClick={() => void runWebSearch()}
                            >
                                {impBusy ? '…' : '搜索'}
                            </button>
                        </div>
                        <div className="row">
                            <input
                                value={impName}
                                onChange={(e) => setImpName(e.target.value)}
                                placeholder="给它起个名字（:别名:）"
                                aria-label="贴纸名称"
                                maxLength={24}
                                spellCheck={false}
                            />
                        </div>
                        {results.length > 0 && (
                            <div className="res">
                                {results.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        title="点击加入表情库"
                                        aria-label={`导入贴纸 ${r.title}`}
                                        disabled={impBusy}
                                        onClick={() =>
                                            void doImport(() => onImportUrl(r.url, nameOr(impQ.trim() || 'sticker')))
                                        }
                                    >
                                        <img src={r.preview ?? r.url} alt={r.title} loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="alt">
                            或
                            <button
                                type="button"
                                className="lnk"
                                disabled={impBusy}
                                onClick={() => fileRef.current?.click()}
                            >
                                上传图片
                            </button>
                            /
                            <button
                                type="button"
                                className="lnk"
                                disabled={impBusy}
                                aria-expanded={impUrl !== ''}
                                onClick={() => setImpUrl(impUrl ? '' : ' ')}
                            >
                                粘贴图片链接
                            </button>
                        </div>
                        {impUrl !== '' && (
                            <div className="row">
                                <input
                                    value={impUrl.trim()}
                                    onChange={(e) => setImpUrl(e.target.value || ' ')}
                                    placeholder="https://…"
                                    aria-label="贴纸图片链接"
                                    type="url"
                                    spellCheck={false}
                                />
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
                            aria-label="上传贴纸图片"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (f)
                                    void doImport(() =>
                                        onImportFile(f, nameOr(f.name.replace(/\.[^.]+$/, '').slice(0, 24)))
                                    );
                            }}
                        />
                        {impMsg && (
                            <div className={`msg ${impMsg.err ? 'err' : ''}`} role={impMsg.err ? 'alert' : 'status'}>
                                {impMsg.text}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
