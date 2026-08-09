// world-settings.tsx — 世界设置 modal (Discord server-settings style).
// Owns the world's shared identity: icon (emoji or uploaded image), name and
// anniversary. Unlike the personal settings modal these fields write straight
// to DB `worlds` on save (S-4 step 3 — both members see the change), with the
// caller syncing the localStorage fallback buffer via onSaved.
// Entry: clicking the sidebar world-panel header (icon + name strip).
// Icon display priority everywhere: image > emoji > first letter of the name.
import { useRef, useState } from 'react';
import { updateWorld } from '@/lib/worlds.ts';
import { uploadWorldIcon } from '@/lib/storage.ts';
import type { World } from '@/types/feed.ts';
import { ICheck, IClose, IHeart, IPhoto, ISparkle } from './icons';

const WorldSettingsStyles = () => (
    <style>{`
  .ws-label{font-size:11px;letter-spacing:.16em;color:var(--glass-sub);font-weight:600;
    margin:20px 2px 9px;display:flex;align-items:center;gap:7px;}
  .ws-label:first-child{margin-top:2px;}
  .ws-label .ic{display:inline-flex;color:var(--accent-deep);}
  .ws-group{border-radius:18px;overflow:hidden;padding:15px;display:flex;flex-direction:column;gap:13px;}
  .ws-row{display:flex;align-items:center;gap:13px;}

  /* current icon preview — the same three-way fallback the sidebar renders */
  .ws-ico{width:64px;height:64px;border-radius:20px;flex:0 0 auto;display:grid;place-items:center;
    color:#fff;font-size:30px;font-weight:800;overflow:hidden;background:var(--accent-grad);
    border:2px solid rgba(255,255,255,.72);box-shadow:0 8px 20px -8px rgba(20,29,51,.55);}
  .ws-ico img{width:100%;height:100%;object-fit:cover;display:block;}
  .ws-ico-hint{font-size:11.5px;color:var(--glass-sub);line-height:1.6;}

  /* emoji picker grid */
  .ws-emojis{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;}
  .ws-emojis button{appearance:none;border:1.5px solid transparent;background:transparent;cursor:pointer;
    font-size:19px;line-height:1;padding:6px 0;border-radius:11px;transition:background .15s,transform .15s,border-color .15s;}
  .ws-emojis button:hover{background:var(--glass-hover);transform:translateY(-1px);}
  .ws-emojis button.on{background:var(--glass-hi);border-color:var(--accent);}

  .ws-actions{display:flex;gap:8px;flex-wrap:wrap;}
  .ws-chipbtn{appearance:none;cursor:pointer;font:inherit;font-size:12px;font-weight:700;color:var(--accent-deep);
    background:var(--glass-bg-2);border:1.5px dashed var(--glass-line);border-radius:99px;padding:7px 14px;
    display:inline-flex;align-items:center;gap:6px;transition:border-color .18s,color .18s;}
  .ws-chipbtn:hover{border-color:var(--accent);color:var(--accent);}
  .ws-chipbtn.plain{border-style:solid;color:var(--glass-sub);}
  .ws-chipbtn.plain:hover{color:#d96a84;border-color:#e6a9ba;}

  /* text fields (same feel as the personal settings' inline edits) */
  .ws-edit{font:inherit;font-size:16px;font-weight:700;color:var(--glass-text);
    border:0;background:transparent;outline:none;width:100%;padding:6px 8px;border-radius:9px;
    transition:background .18s,box-shadow .18s;}
  .ws-edit:hover{background:var(--glass-hover);}
  .ws-edit:focus{background:var(--glass-hi);box-shadow:0 0 0 1.5px var(--accent);}
  .ws-sub{font-size:11.5px;color:var(--glass-sub);padding-left:8px;margin-top:2px;}
  .ws-date{font:inherit;font-size:13.5px;font-weight:600;font-family:"Baloo 2",sans-serif;color:var(--accent-deep);
    border:1px solid var(--glass-line);background:var(--glass-paper);border-radius:11px;padding:7px 11px;outline:none;
    transition:border-color .18s;}
  .ws-date:focus{border-color:var(--accent);}

  /* footer: error + save */
  .ws-foot{display:flex;align-items:center;gap:10px;margin-top:18px;}
  .ws-err{flex:1;font-size:12px;color:#d96a84;line-height:1.5;}
  .ws-ok{flex:1;font-size:12px;font-weight:600;color:#46a06f;display:flex;align-items:center;gap:5px;
    opacity:0;transition:opacity .2s;}
  .ws-ok.show{opacity:1;}
  .ws-save{appearance:none;border:0;cursor:pointer;font:inherit;font-weight:700;border-radius:var(--r-pill);
    color:#0d2336;padding:10px 22px;font-size:13.5px;background:var(--accent-grad);
    box-shadow:0 5px 13px -5px rgba(47,154,211,.6);transition:transform .16s,filter .2s;}
  .ws-save:hover{transform:translateY(-1px);filter:brightness(1.04);}
  .ws-save:active{transform:scale(.96);}
  .ws-save:disabled{opacity:.4;cursor:default;transform:none;filter:none;}
  `}</style>
);

// Curated Cinnamoroll-adjacent set — a picker, not an emoji keyboard.
const ICON_EMOJIS = [
    '💗', '🏠', '🌸', '🌙', '⭐', '☁️', '🌈', '🍓',
    '🐰', '🐶', '🦊', '🐻', '🌻', '🍀', '🎀', '🧸',
    '🍰', '🫧', '🌊', '🔮', '🎠', '🪐', '🍭', '💌'
];

type Draft = {
    name: string;
    anniv: string; // '' = unset
    emoji: string; // '' = none
    keepImage: boolean; // existing icon_path still wanted
};

const draftOf = (w: World | null): Draft => ({
    name: w?.name ?? '',
    anniv: w?.anniversary ?? '',
    emoji: w?.icon_emoji ?? '',
    keepImage: !!w?.icon_path
});

export function WorldSettingsScreen({
    open,
    onClose,
    world,
    iconUrl,
    onSaved
}: {
    open: boolean;
    onClose: () => void;
    world: World | null;
    iconUrl: string | null; // signed URL for world.icon_path (WorldPage owns signing)
    onSaved: (w: World) => void;
}) {
    const [draft, setDraft] = useState<Draft>(() => draftOf(world));
    const [file, setFile] = useState<File | null>(null); // pending upload
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // re-seed the draft each time the modal opens (render-time, no effect)
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setDraft(draftOf(world));
            setFile(null);
            setFilePreview(null);
            setError(null);
            setSaved(false);
        }
    }

    if (!world) return null;

    const pickFile = (f: File | null) => {
        if (!f) return;
        setFile(f);
        setFilePreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return URL.createObjectURL(f);
        });
        setDraft((d) => ({ ...d, keepImage: true }));
        setError(null);
    };
    const pickEmoji = (e: string) => {
        // choosing an emoji makes it THE icon — drop any image form
        setDraft((d) => ({ ...d, emoji: e, keepImage: false }));
        setFile(null);
        setFilePreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return null;
        });
    };
    const removeImage = () => {
        setFile(null);
        setFilePreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return null;
        });
        setDraft((d) => ({ ...d, keepImage: false }));
    };

    const showImage = filePreview ?? (draft.keepImage && world.icon_path ? iconUrl : null);
    const fallbackGlyph = draft.emoji || (draft.name || world.name).slice(0, 1);

    const save = async () => {
        if (saving) return;
        setSaving(true);
        setError(null);
        try {
            let icon_path: string | null = draft.keepImage ? world.icon_path : null;
            if (file) {
                const up = await uploadWorldIcon(world.id, file).catch((e: unknown) => {
                    throw e instanceof Error && e.name === 'InvalidStateError'
                        ? new Error('这张图片打不开，换一张试试？')
                        : e;
                });
                icon_path = up.iconPath;
            }
            const updated = await updateWorld(world.id, {
                name: draft.name.trim() || world.name,
                anniversary: draft.anniv || null,
                icon_emoji: draft.emoji || null,
                icon_path
            });
            onSaved(updated);
            setFile(null);
            setSaved(true);
            setTimeout(() => setSaved(false), 1600);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <WorldSettingsStyles />
            <div className={`modal-scrim ${open ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal mini glass ${open ? 'show' : ''}`} aria-hidden={!open}>
                <div className="modal-hd">
                    <span className="si" style={{ background: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)' }}>
                        <IHeart size={19} />
                    </span>
                    <h2>世界设置</h2>
                    <button className="modal-x" onClick={onClose} aria-label="关闭">
                        <IClose size={17} />
                    </button>
                </div>
                <div className="modal-body">
                    {/* ── 世界形象（icon） ── */}
                    <div className="ws-label">
                        <span className="ic">
                            <ISparkle size={14} />
                        </span>
                        世界形象
                    </div>
                    <div className="ws-group paper">
                        <div className="ws-row">
                            <span className="ws-ico">{showImage ? <img src={showImage} alt="世界 icon" /> : fallbackGlyph}</span>
                            <div className="ws-ico-hint">
                                这是世界的小脸——会出现在侧边栏和大厅卡片上。
                                <br />
                                挑一个 emoji，或上传一张自己的图（图片优先显示）。
                            </div>
                        </div>
                        <div className="ws-emojis">
                            {ICON_EMOJIS.map((e) => (
                                <button key={e} type="button" className={!showImage && draft.emoji === e ? 'on' : ''} onClick={() => pickEmoji(e)} aria-label={`选择 ${e}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                        <div className="ws-actions">
                            <button type="button" className="ws-chipbtn" onClick={() => fileRef.current?.click()}>
                                <IPhoto size={14} />
                                上传图片
                            </button>
                            {showImage && (
                                <button type="button" className="ws-chipbtn plain" onClick={removeImage}>
                                    <IClose size={13} />
                                    移除图片
                                </button>
                            )}
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                    pickFile(e.target.files?.[0] ?? null);
                                    e.target.value = ''; // same file re-pickable
                                }}
                            />
                        </div>
                    </div>

                    {/* ── 世界资料 ── */}
                    <div className="ws-label">
                        <span className="ic">
                            <IHeart size={14} />
                        </span>
                        世界资料
                    </div>
                    <div className="ws-group paper">
                        <div>
                            <input
                                className="ws-edit"
                                value={draft.name}
                                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                spellCheck={false}
                                maxLength={16}
                                aria-label="世界名称"
                            />
                            <div className="ws-sub">这个世界的名字</div>
                        </div>
                        <div className="ws-row">
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--glass-text)' }}>在一起的那天</div>
                                <div className="ws-sub" style={{ paddingLeft: 0 }}>从这天开始数你们的日子</div>
                            </div>
                            <input className="ws-date" type="date" value={draft.anniv} onChange={(e) => setDraft((d) => ({ ...d, anniv: e.target.value }))} aria-label="纪念日" />
                        </div>
                    </div>

                    <div className="ws-foot">
                        {error ? (
                            <span className="ws-err">{error}</span>
                        ) : (
                            <span className={`ws-ok ${saved ? 'show' : ''}`}>
                                <ICheck size={14} />
                                已保存，你们俩都会看到
                            </span>
                        )}
                        <button type="button" className="ws-save" onClick={save} disabled={saving}>
                            {saving ? '保存中…' : '保存'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
