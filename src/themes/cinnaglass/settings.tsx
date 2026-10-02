// Personal settings: native modal with a continuous glass shell and a mood-tinted reading liner.
// Three concise sections: 个人资料 / 账号与密码 / 主题外观 (theme is live via setTweak; the look via ui/look.ts).
// Every row here is real: the nickname writes profiles.display_name, the
// password change re-authenticates then calls auth.updateUser, the email is
// the auth user's and read-only.
import { useId, useState, type ReactNode } from 'react';
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import '@/themes/cinnaglass/settings.css';
import { supabase } from '@/lib/supabase';
import { Logman } from '@/lib/logman';
import { useAuth } from '@/hooks/useAuth';
import type { IcoProps } from '@/themes/cinnaglass/icons';
import {
    ICheck,
    IChevron,
    IDusk,
    IHeart,
    IKey,
    ILogout,
    IMail,
    IMoon,
    IPaint,
    IShield,
    ISun,
    IUser
} from '@/themes/cinnaglass/icons';
import type { Profile } from '@/themes/cinnaglass/model';
import { setLook, type Look } from '@/themes/cinnaglass/ui/look';
import { useLook } from '@/themes/cinnaglass/ui/use-look';
import type {
    ChatAlign,
    JournalStyle,
    Mood,
    MotionPref,
    PhotoStyle,
    SetTweak,
    Tweaks
} from '@/themes/cinnaglass/tweaks';

const TAG = '[auth][web][settings]';

// Auth errors that mean "the network, not you".
const isNetworkError = (e: { name?: string }) => e.name === 'AuthRetryableFetchError';

type SegOpt = { k: string; label: string; Icon?: (p: IcoProps) => ReactNode };
// Option sets for the segmented controls in 主题外观.
const CHAT_ALIGN_OPTS: SegOpt[] = [
    { k: 'left', label: '全部靠左' },
    { k: 'sides', label: '左右分侧' }
];
// the looks Settings offers (ui/look.ts); classic stays a ?look= review, so none is lit while it is on
const LOOK_OPTS: SegOpt[] = [
    { k: 'default', label: '深玻璃' },
    { k: 'gilded', label: '描金暗夜' },
    { k: 'porcelain', label: '暖瓷' }
];
const MOTION_OPTS: SegOpt[] = [
    { k: 'system', label: '跟随系统' },
    { k: 'full', label: '完整动效' },
    { k: 'reduced', label: '低动效' }
];
// the same choices as the switch in the memory page's header (surfaces/memory-views.ts)
const JOURNAL_OPTS: SegOpt[] = [
    { k: 'scrapbook', label: '手帐' },
    { k: 'calendar', label: '日历' },
    { k: 'book', label: '书本' }
];
const PHOTO_OPTS: SegOpt[] = [
    { k: 'polaroid', label: '拍立得' },
    { k: 'cork', label: '软木板' },
    { k: 'album', label: '相册' },
    { k: 'projector', label: '放映' }
];
const MOOD_OPTS: SegOpt[] = [
    { k: 'golden', label: '黄昏', Icon: ISun },
    { k: 'twilight', label: '暮色', Icon: IDusk },
    { k: 'night', label: '夜晚', Icon: IMoon }
];

// Segmented control: one option is always on; the caller owns the value.
function Segmented({
    opts,
    value,
    onChange,
    withIcon
}: {
    opts: SegOpt[];
    value: string;
    onChange: (k: string) => void;
    withIcon?: boolean;
}) {
    return (
        <div className="seg">
            {opts.map((o) => (
                <button
                    type="button"
                    key={o.k}
                    aria-pressed={value === o.k}
                    className={value === o.k ? 'on' : ''}
                    onClick={() => onChange(o.k)}
                >
                    {withIcon && o.Icon && (
                        <span className="ic">
                            <o.Icon size={14} />
                        </span>
                    )}
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// One person row: avatar slot plus the nickname. With `onSave` the name is an
// inline edit that commits on blur / Enter to profiles.display_name and shows
// the reason if that fails; without it (the partner's row — her name is her
// own to change) it is plain text.
function PersonRow({
    slotId,
    color,
    initial,
    role,
    name,
    onSave
}: {
    slotId: string;
    color: string;
    initial: string;
    role: string;
    name: string;
    onSave?: (v: string) => Promise<void>;
}) {
    // A failed edit keeps its draft until retry succeeds; idle text follows the DB.
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(name);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const commit = async () => {
        if (busy) return;
        const v = draft.trim();
        if (!onSave || !v || v === name) {
            setEditing(false);
            setErr(null);
            return;
        }
        setBusy(true);
        try {
            await onSave(v);
            setEditing(false);
            setErr(null);
        } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="set-row">
            <span className="set-ava" style={{ background: color }}>
                <span className="set-initial" aria-hidden="true">
                    {initial}
                </span>
                <image-slot
                    id={slotId}
                    data-ui="avatar"
                    aria-label={`${name}的本机头像`}
                    shape="circle"
                    placeholder=""
                ></image-slot>
            </span>
            <div className="set-body">
                {onSave ? (
                    <input
                        className="set-edit"
                        value={editing ? draft : name}
                        disabled={busy}
                        aria-busy={busy}
                        aria-invalid={!!err}
                        onFocus={() => {
                            if (!editing) setDraft(name);
                            setEditing(true);
                        }}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        spellCheck={false}
                        maxLength={12}
                        aria-label="昵称"
                    />
                ) : (
                    <div className="set-t" style={{ padding: '4px 8px' }}>
                        {name}
                    </div>
                )}
                {err && (
                    <div role="alert" className="set-s" style={{ paddingLeft: 8, color: 'var(--set-error)' }}>
                        没改成：{err}
                    </div>
                )}
            </div>
            <span className="set-tag">{role}</span>
        </div>
    );
}

// Personal settings modal. Theme edits apply immediately to local state; the
// nickname, the password and sign-out talk to Supabase.
export function SettingsScreen({
    open,
    onClose,
    t,
    setTweak,
    profile,
    onSaveMyName
}: {
    open: boolean;
    onClose: () => void;
    t: Tweaks;
    setTweak: SetTweak;
    /** names / world as WorldPage composes them (DB first, localStorage fallback) */
    profile: Profile;
    /** writes profiles.display_name; rejects with the reason on failure */
    onSaveMyName: (name: string) => Promise<void>;
}) {
    const passwordId = useId();
    const p = profile;
    const look = useLook();
    // the account email is the auth user's — shown, never edited here
    const { user } = useAuth();
    const [pwOpen, setPwOpen] = useState(false);
    const [pw, setPw] = useState({ cur: '', a: '', b: '' });
    const [saved, setSaved] = useState(false);
    const [pwErr, setPwErr] = useState<string | null>(null);
    const [pwBusy, setPwBusy] = useState(false);

    // Change password: prove the current one first (a fresh sign-in with it —
    // Supabase has no "verify password" call), then auth.updateUser. Same
    // 6-character floor as the reset page.
    const pwValid = pw.cur && pw.a.length >= 6 && pw.a === pw.b && !pwBusy;
    const savePw = async () => {
        if (!pwValid) return;
        setPwBusy(true);
        setPwErr(null);
        try {
            const email = user?.email;
            if (!email) throw new Error('没有登录邮箱，无法验证当前密码。');
            const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pw.cur });
            if (authErr) {
                throw new Error(
                    isNetworkError(authErr)
                        ? '网络好像断了，稍后再试。'
                        : authErr.code === 'invalid_credentials'
                          ? '当前密码不对。'
                          : authErr.message
                );
            }
            const { error } = await supabase.auth.updateUser({ password: pw.a });
            if (error) throw new Error(isNetworkError(error) ? '网络好像断了，稍后再试。' : error.message);
            setSaved(true);
            setPw({ cur: '', a: '', b: '' });
            setTimeout(() => {
                setSaved(false);
                setPwOpen(false);
            }, 1400);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            Logman.warn(TAG, `改密失败：${msg}`);
            setPwErr(msg);
        } finally {
            setPwBusy(false);
        }
    };

    // Sign out (settings is the account-level exit, Discord-style). The
    // explicit-logout flag keeps dev auto-login from bouncing us straight
    // back in; ProtectedRoute redirects to /login once the session clears.
    // signOut() does not throw — it returns { error }, and on a network or
    // server failure auth-js keeps the local session, so the row must recover
    // (flag back off, button clickable again) and say what happened.
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutErr, setLogoutErr] = useState<string | null>(null);
    const logout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setLogoutErr(null);
        try {
            sessionStorage.setItem('ow-explicit-logout', '1');
        } catch {
            /* storage blocked — auto-login may bounce, sign out anyway */
        }
        const { error } = await supabase.auth.signOut();
        if (error) {
            Logman.warn(TAG, `退出失败：${error.message}`);
            try {
                sessionStorage.removeItem('ow-explicit-logout');
            } catch {
                /* ignore */
            }
            setLoggingOut(false);
            setLogoutErr(
                isNetworkError(error) ? '网络好像断了，退出没成功，再试一次。' : `退出没成功：${error.message}`
            );
        }
    };

    return (
        <TaskDialog
            open={open}
            onClose={onClose}
            title="设置"
            description="留一点安静给自己"
            className="settings-dialog"
            footer={
                <div className="set-foot">
                    外观即时生效 · {p.world}
                    <span className="hh">
                        <IHeart size={11} fill="currentColor" sw={0} />
                    </span>
                </div>
            }
        >
            {/* ── 个人资料 ── (world name + anniversary moved to the
                        world settings modal, which writes to DB — see
                        world-settings.tsx and ai/features/supabase.md) */}
            <div className="set-label">
                <span className="ic">
                    <IUser size={14} />
                </span>
                个人资料
            </div>
            <div className="set-group">
                <PersonRow
                    slotId="set-ava-her"
                    color="linear-gradient(135deg,#F8C8D6,#EF9DB4)"
                    initial={p.her.slice(0, 1)}
                    role="她"
                    name={p.her}
                />
                <PersonRow
                    slotId="set-ava-me"
                    color="linear-gradient(135deg,#FCD9A0,#F1B45A)"
                    initial={p.me.slice(0, 1)}
                    role="他"
                    name={p.me}
                    onSave={onSaveMyName}
                />
            </div>

            {/* ── 账号与密码 ── */}
            <div className="set-label">
                <span className="ic">
                    <IShield size={14} />
                </span>
                账号与密码
            </div>
            <div className="set-group">
                <div className="set-row">
                    <span className="set-ico">
                        <IMail size={16} />
                    </span>
                    <div className="set-body">
                        <div className="set-t">{user?.email ?? '—'}</div>
                        <div className="set-s">登录邮箱</div>
                    </div>
                </div>
                <button
                    type="button"
                    className="set-row tap"
                    aria-expanded={pwOpen}
                    aria-controls={passwordId}
                    onClick={() => setPwOpen((o) => !o)}
                >
                    <span className="set-ico">
                        <IKey size={16} />
                    </span>
                    <span className="set-body">
                        <span className="set-t">修改密码</span>
                        <span className="set-s">{pwOpen ? '输入当前密码与新密码' : '点开修改'}</span>
                    </span>
                    <span className="set-chev" style={{ transform: pwOpen ? 'rotate(90deg)' : 'none' }}>
                        <IChevron size={17} />
                    </span>
                </button>
                <div id={passwordId} className="set-expand" hidden={!pwOpen}>
                    <div className="set-pw">
                        <input
                            type="password"
                            placeholder="当前密码"
                            aria-label="当前密码"
                            autoComplete="current-password"
                            value={pw.cur}
                            onChange={(e) => setPw((s) => ({ ...s, cur: e.target.value }))}
                        />
                        <input
                            type="password"
                            placeholder="新密码（至少 6 位）"
                            aria-label="新密码（至少 6 位）"
                            autoComplete="new-password"
                            value={pw.a}
                            onChange={(e) => setPw((s) => ({ ...s, a: e.target.value }))}
                        />
                        <input
                            type="password"
                            placeholder="再次输入新密码"
                            aria-label="再次输入新密码"
                            autoComplete="new-password"
                            value={pw.b}
                            onChange={(e) => setPw((s) => ({ ...s, b: e.target.value }))}
                        />
                        <div className="row">
                            {pwErr ? (
                                <span role="alert" className="err">
                                    {pwErr}
                                </span>
                            ) : (
                                <span role="status" className="ok">
                                    {saved && (
                                        <>
                                            <ICheck size={14} />
                                            已更新
                                        </>
                                    )}
                                </span>
                            )}
                            <button className="btn-save" onClick={savePw} disabled={!pwValid}>
                                {pwBusy ? '保存中…' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" className="set-row tap" onClick={logout} disabled={loggingOut}>
                    <span className="set-ico">
                        <ILogout size={16} />
                    </span>
                    <span className="set-body">
                        <span className="set-t" style={{ color: 'var(--set-error)' }}>
                            退出账号
                        </span>
                        <span
                            role="status"
                            className="set-s"
                            style={logoutErr ? { color: 'var(--set-error)' } : undefined}
                        >
                            {loggingOut ? '正在退出…' : (logoutErr ?? '回到登录页 · 回忆都在云端，不会丢')}
                        </span>
                    </span>
                    <span className="set-chev">
                        <IChevron size={17} />
                    </span>
                </button>
            </div>

            {/* ── 主题外观 ── */}
            <div className="set-label">
                <span className="ic">
                    <IPaint size={14} />
                </span>
                主题外观
            </div>
            <div className="set-group">
                <div className="set-row">
                    <div className="set-body">
                        <div className="set-t">减少透明效果</div>
                        <div className="set-s">使用稳定底色，减少场景干扰</div>
                    </div>
                    <button
                        type="button"
                        className="ui-button"
                        role="switch"
                        aria-label="减少透明效果"
                        aria-checked={t.reduceTransparency}
                        onClick={() => setTweak('reduceTransparency', !t.reduceTransparency)}
                    >
                        {t.reduceTransparency ? '已开启' : '已关闭'}
                    </button>
                </div>
                <div className="set-row" style={{ flexWrap: 'wrap' }}>
                    <div className="set-body">
                        <div className="set-t">界面风格</div>
                        <div className="set-s">深玻璃稳重，描金像游戏，暖瓷是浅色</div>
                    </div>
                    <Segmented opts={LOOK_OPTS} value={look} onChange={(k) => setLook(k as Look | 'default')} />
                </div>
                <div className="set-row" style={{ flexWrap: 'wrap' }}>
                    <div className="set-body">
                        <div className="set-t">动效</div>
                        <div className="set-s">低动效只留淡入淡出，关掉弹跳、位移、粒子和场景微动</div>
                    </div>
                    <Segmented
                        opts={MOTION_OPTS}
                        value={t.motion}
                        onChange={(k) => setTweak('motion', k as MotionPref)}
                    />
                </div>
                <div className="set-row" style={{ flexWrap: 'wrap' }}>
                    <div className="set-body">
                        <div className="set-t">光线时段</div>
                        <div className="set-s">一天里的光与氛围</div>
                    </div>
                    <Segmented opts={MOOD_OPTS} value={t.mood} onChange={(k) => setTweak('mood', k as Mood)} withIcon />
                </div>
                <div className="set-row" style={{ flexWrap: 'wrap' }}>
                    <div className="set-body">
                        <div className="set-t">日记的样子</div>
                        <div className="set-s">打开日记时先看到哪一种；回忆页里也能随时换，书本是原来那本棕皮日记</div>
                    </div>
                    <Segmented
                        opts={JOURNAL_OPTS}
                        value={t.journalStyle}
                        onChange={(k) => setTweak('journalStyle', k as JournalStyle)}
                    />
                </div>
                <div className="set-row" style={{ flexWrap: 'wrap' }}>
                    <div className="set-body">
                        <div className="set-t">照片墙的样子</div>
                        <div className="set-s">拍立得、软木板、方格相册，或者一张张放映</div>
                    </div>
                    <Segmented
                        opts={PHOTO_OPTS}
                        value={t.photoStyle}
                        onChange={(k) => setTweak('photoStyle', k as PhotoStyle)}
                    />
                </div>
                <div className="set-row">
                    <div className="set-body">
                        <div className="set-t">聊天消息排列</div>
                        <div className="set-s">选择自己的消息是否靠右</div>
                    </div>
                    <Segmented
                        opts={CHAT_ALIGN_OPTS}
                        value={t.chatAlign}
                        onChange={(k) => setTweak('chatAlign', k as ChatAlign)}
                    />
                </div>
            </div>
        </TaskDialog>
    );
}
