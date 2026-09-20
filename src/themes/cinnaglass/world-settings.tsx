// World settings uses the shared task dialog and persists the shared identity.
// Owns the world's shared identity: icon (emoji or uploaded image), name and
// anniversary. Unlike the personal settings modal these fields write straight
// to DB `worlds` on save (both members see the change — ai/features/supabase.md),
// with the caller syncing the localStorage fallback buffer via onSaved.
// NOTE: no UI entry point today — the sidebar header that opened this retired
// with the v2 shell. Reachable only by setting screen='world-settings'.
// Icon display priority everywhere: image > emoji > first letter of the name.
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import '@/themes/cinnaglass/task-surfaces.css';
import { useRef, useState } from 'react';
import { updateWorld } from '@/lib/worlds';
import { uploadWorldIcon } from '@/lib/storage';
import type { World } from '@/types/feed';
import { ICheck, IClose, IHeart, IPhoto, ISparkle } from '@/themes/cinnaglass/icons';

// Curated Cinnamoroll-adjacent set — a picker, not an emoji keyboard.
const ICON_EMOJIS = [
    '💗',
    '🏠',
    '🌸',
    '🌙',
    '⭐',
    '☁️',
    '🌈',
    '🍓',
    '🐰',
    '🐶',
    '🦊',
    '🐻',
    '🌻',
    '🍀',
    '🎀',
    '🧸',
    '🍰',
    '🫧',
    '🌊',
    '🔮',
    '🎠',
    '🪐',
    '🍭',
    '💌'
];

type Draft = {
    name: string;
    anniv: string; // '' = unset
    emoji: string; // '' = none
    keepImage: boolean; // existing icon_path still wanted
};

// Snapshot the row into an editable draft; '' stands for "unset" in every field.
const draftOf = (w: World | null): Draft => ({
    name: w?.name ?? '',
    anniv: w?.anniversary ?? '',
    emoji: w?.icon_emoji ?? '',
    keepImage: !!w?.icon_path
});

// World settings modal. Writes name/anniversary/icon straight to the worlds row,
// so both members see the change; the caller syncs its localStorage fallback via
// onSaved.
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

    // Object URLs are revoked as they are replaced, so an open modal never leaks
    // more than one.
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

    // Upload first (if a file is pending), then patch the row. A failed upload
    // aborts before any DB write, so the row never points at a missing object.
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
        <TaskDialog
            open={open}
            onClose={onClose}
            title="世界设置"
            className="world-settings-task"
            description="保存后，你们会看到同一个世界。关闭未保存的更改会在下次打开时重置。"
            footer={
                <div className="ws-foot">
                    {error ? (
                        <span className="ws-err" role="alert">
                            {error}
                        </span>
                    ) : (
                        <span className={`ws-ok ${saved ? 'show' : ''}`} role="status">
                            <ICheck size={14} />
                            已保存，你们俩都会看到
                        </span>
                    )}
                    <button type="button" className="ws-save" onClick={save} disabled={saving}>
                        {saving ? '保存中…' : '保存'}
                    </button>
                </div>
            }
        >
            <div>
                {/* ── 世界形象（icon） ── */}
                <div className="ws-label">
                    <span className="ic">
                        <ISparkle size={14} />
                    </span>
                    世界形象
                </div>
                <div className="ws-group">
                    <div className="ws-row">
                        <span className="ws-ico">
                            {showImage ? <img src={showImage} alt="世界 icon" /> : fallbackGlyph}
                        </span>
                        <div className="ws-ico-hint">
                            这是世界的小脸——会出现在侧边栏和大厅卡片上。
                            <br />
                            挑一个 emoji，或上传一张自己的图（图片优先显示）。
                        </div>
                    </div>
                    <div className="ws-emojis">
                        {ICON_EMOJIS.map((e) => (
                            <button
                                key={e}
                                type="button"
                                className={!showImage && draft.emoji === e ? 'on' : ''}
                                onClick={() => pickEmoji(e)}
                                aria-label={`选择 ${e}`}
                                aria-pressed={!showImage && draft.emoji === e}
                            >
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
                <div className="ws-group">
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
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ui-text)' }}>在一起的那天</div>
                            <div className="ws-sub" style={{ paddingLeft: 0 }}>
                                从这天开始数你们的日子
                            </div>
                        </div>
                        <input
                            className="ws-date"
                            type="date"
                            value={draft.anniv}
                            onChange={(e) => setDraft((d) => ({ ...d, anniv: e.target.value }))}
                            aria-label="纪念日"
                        />
                    </div>
                </div>
            </div>
        </TaskDialog>
    );
}
