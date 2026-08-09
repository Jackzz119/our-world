// settings.tsx — 设置 modal. Reuses the .modal.mini shell + .glass + .sw switch.
// Three concise sections: 个人资料 / 账号与密码 / 主题外观 (theme is live via setTweak).
import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { supabase } from '@/lib/supabase.ts';
import type { IcoProps } from './icons';
import { ICheck, IChevron, IClose, ICog, IDusk, IHeart, IKey, ILock, ILogout, IMail, IMoon, IPaint, IShield, ISun, IUser } from './icons';
import type { Profile } from './model';
import type { ChatAlign, GlassStyle, Mood, SetTweak, Tweaks } from './tweaks';

const SettingsStyles = () => (
    <style>{`
  .set-label{font-size:11px;letter-spacing:.16em;color:var(--glass-sub);font-weight:600;
    margin:20px 2px 9px;display:flex;align-items:center;gap:7px;}
  .set-label:first-child{margin-top:2px;}
  .set-label .ic{display:inline-flex;color:var(--accent-deep);}
  .set-group{border-radius:18px;overflow:hidden;}
  .set-row{display:flex;align-items:center;gap:13px;padding:13px 15px;position:relative;}
  .set-row + .set-row::before{content:"";position:absolute;left:15px;right:15px;top:0;height:1px;
    background:linear-gradient(90deg,transparent,var(--glass-line) 16%,var(--glass-line) 84%,transparent);}
  .set-row.tap{cursor:pointer;transition:background .16s;}
  .set-row.tap:hover{background:var(--glass-hover);}
  .set-ico{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;color:#fff;flex:0 0 auto;
    box-shadow:0 4px 10px -4px rgba(40,90,140,.45);}

  /* avatar with photo slot */
  .set-ava{width:46px;height:46px;border-radius:50%;overflow:hidden;flex:0 0 auto;position:relative;
    display:grid;place-items:center;color:#fff;font-size:17px;font-weight:700;
    border:2px solid rgba(255,255,255,.7);box-shadow:0 5px 13px -5px rgba(20,29,51,.5);}
  .set-ava image-slot{position:absolute;inset:0;width:100%;height:100%;}

  .set-body{flex:1;min-width:0;}
  .set-t{font-size:14.5px;font-weight:600;color:var(--glass-text);}
  .set-s{font-size:11.5px;color:var(--glass-sub);margin-top:2px;}
  .set-val{font-size:13px;color:var(--glass-sub);font-weight:500;white-space:nowrap;}
  .set-chev{color:var(--glass-sub);display:inline-flex;opacity:.7;flex:0 0 auto;}

  /* inline editable field — looks like text, reveals on focus */
  .set-edit{font:inherit;font-size:14.5px;font-weight:600;color:var(--glass-text);
    border:0;background:transparent;outline:none;width:100%;padding:4px 8px;border-radius:9px;
    transition:background .18s,box-shadow .18s;}
  .set-edit:hover{background:var(--glass-hover);}
  .set-edit:focus{background:var(--glass-hi);box-shadow:0 0 0 1.5px var(--accent);}
  .set-tag{font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--accent-deep);
    background:var(--glass-bg-2);border:1px solid var(--glass-line);border-radius:99px;padding:3px 9px;flex:0 0 auto;}

  /* expandable password block (grid-rows trick — animates open/close without JS height measurement) */
  .set-expand{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s cubic-bezier(.3,.8,.35,1);}
  .set-expand.open{grid-template-rows:1fr;}
  .set-pw{overflow:hidden;min-height:0;padding:4px 15px 15px;display:flex;flex-direction:column;gap:10px;}
  .set-pw input{height:42px;border-radius:12px;border:1px solid var(--glass-line);background:var(--glass-paper);
    color:var(--glass-text);padding:0 14px;font:inherit;font-size:14px;outline:none;transition:border-color .18s,background .18s;}
  .set-pw input::placeholder{color:var(--glass-sub);}
  .set-pw input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .set-pw .row{display:flex;gap:10px;align-items:center;justify-content:flex-end;}
  .set-pw .ok{font-size:11.5px;font-weight:600;color:#46a06f;margin-right:auto;display:flex;align-items:center;gap:5px;
    opacity:0;transition:opacity .2s;}
  .set-pw .ok.show{opacity:1;}
  .btn-save{appearance:none;border:0;cursor:pointer;font:inherit;font-weight:700;border-radius:var(--r-pill);
    color:#0d2336;padding:9px 18px;font-size:13px;background:var(--accent-grad);
    box-shadow:0 5px 13px -5px rgba(47,154,211,.6);transition:transform .16s,filter .2s;}
  .btn-save:hover{transform:translateY(-1px);filter:brightness(1.04);}
  .btn-save:active{transform:scale(.96);}
  .btn-save:disabled{opacity:.4;cursor:default;transform:none;filter:none;}

  /* segmented theme control */
  .seg{display:flex;gap:3px;background:var(--glass-hover);border:1px solid var(--glass-line);
    border-radius:var(--r-pill);padding:3px;flex:0 0 auto;box-shadow:inset 0 1px 3px rgba(33,57,92,.12);}
  .seg button{appearance:none;border:0;background:transparent;cursor:pointer;font:inherit;font-size:12px;font-weight:600;
    color:var(--glass-sub);padding:7px 13px;border-radius:var(--r-pill);display:flex;align-items:center;gap:5px;
    transition:background .2s,color .2s;}
  .seg button.on{background:var(--glass-paper);color:var(--glass-text);
    box-shadow:0 2px 7px -2px rgba(20,29,51,.3), inset 0 1px 0 rgba(255,255,255,.95);}
  .seg button:not(.on):hover{color:var(--glass-text);}
  .seg button .ic{display:inline-flex;}

  .set-foot{text-align:center;font-size:11px;color:var(--glass-sub);letter-spacing:.05em;
    margin:22px 0 4px;display:flex;align-items:center;justify-content:center;gap:6px;}
  .set-foot .hh{color:#F39DB4;display:inline-flex;}
  `}</style>
);

type SegOpt = { k: string; label: string; Icon?: (p: IcoProps) => ReactNode };
const GLASS_OPTS: SegOpt[] = [
    { k: 'cloud', label: '云朵' },
    { k: 'sky', label: '天空' },
    { k: 'twilight', label: '暮光' }
];
const CHAT_ALIGN_OPTS: SegOpt[] = [
    { k: 'left', label: '全部靠左' },
    { k: 'sides', label: '左右分侧' }
];
const MOOD_OPTS: SegOpt[] = [
    { k: 'golden', label: '黄昏', Icon: ISun },
    { k: 'twilight', label: '暮色', Icon: IDusk },
    { k: 'night', label: '夜晚', Icon: IMoon }
];

function Segmented({ opts, value, onChange, withIcon }: { opts: SegOpt[]; value: string; onChange: (k: string) => void; withIcon?: boolean }) {
    return (
        <div className="seg">
            {opts.map((o) => (
                <button key={o.k} className={value === o.k ? 'on' : ''} onClick={() => onChange(o.k)}>
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

function PersonRow({
    slotId,
    color,
    initial,
    role,
    name,
    onName
}: {
    slotId: string;
    color: string;
    initial: string;
    role: string;
    name: string;
    onName: (v: string) => void;
}) {
    return (
        <div className="set-row">
            <span className="set-ava" style={{ background: color }}>
                {initial}
                <image-slot id={slotId} shape="circle" placeholder=""></image-slot>
            </span>
            <div className="set-body">
                <input className="set-edit" value={name} onChange={(e) => onName(e.target.value)} spellCheck={false} maxLength={12} aria-label="昵称" />
            </div>
            <span className="set-tag">{role}</span>
        </div>
    );
}

export function SettingsScreen({
    open,
    onClose,
    t,
    setTweak,
    profile,
    setP
}: {
    open: boolean;
    onClose: () => void;
    t: Tweaks;
    setTweak: SetTweak;
    profile: Profile;
    setP: Dispatch<SetStateAction<Profile>>;
}) {
    const p = profile;
    const set = (k: keyof Profile, v: string | boolean) => setP((o) => ({ ...o, [k]: v }));
    const [pwOpen, setPwOpen] = useState(false);
    const [pw, setPw] = useState({ cur: '', a: '', b: '' });
    const [saved, setSaved] = useState(false);

    const pwValid = pw.cur && pw.a.length >= 4 && pw.a === pw.b;
    const savePw = () => {
        if (!pwValid) return;
        setSaved(true);
        setPw({ cur: '', a: '', b: '' });
        setTimeout(() => {
            setSaved(false);
            setPwOpen(false);
        }, 1400);
    };

    // Sign out (settings is the account-level exit, Discord-style). The
    // explicit-logout flag keeps dev auto-login from bouncing us straight
    // back in; ProtectedRoute redirects to /login once the session clears.
    const [loggingOut, setLoggingOut] = useState(false);
    const logout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            sessionStorage.setItem('ow-explicit-logout', '1');
        } catch {
            /* storage blocked — auto-login may bounce, sign out anyway */
        }
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[auth][web][SettingsScreen]\nsign-out failed:', e);
            setLoggingOut(false);
        }
    };

    return (
        <>
            <SettingsStyles />
            <div className={`modal-scrim ${open ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal mini glass ${open ? 'show' : ''}`} aria-hidden={!open}>
                <div className="modal-hd">
                    <span className="si" style={{ background: 'linear-gradient(135deg,#C9D6F0,#9AA8D6)' }}>
                        <ICog size={19} />
                    </span>
                    <h2>设置</h2>
                    <button className="modal-x" onClick={onClose} aria-label="关闭">
                        <IClose size={17} />
                    </button>
                </div>
                <div className="modal-body">
                    {/* ── 个人资料 ── (world name + anniversary moved to the
                        world settings modal, which writes to DB — see
                        world-settings.tsx / world.md W-3) */}
                    <div className="set-label">
                        <span className="ic">
                            <IUser size={14} />
                        </span>
                        个人资料
                    </div>
                    <div className="set-group paper">
                        <PersonRow
                            slotId="set-ava-her"
                            color="linear-gradient(135deg,#F8C8D6,#EF9DB4)"
                            initial={p.her.slice(0, 1)}
                            role="她"
                            name={p.her}
                            onName={(v) => set('her', v)}
                        />
                        <PersonRow
                            slotId="set-ava-me"
                            color="linear-gradient(135deg,#FCD9A0,#F1B45A)"
                            initial={p.me.slice(0, 1)}
                            role="他"
                            name={p.me}
                            onName={(v) => set('me', v)}
                        />
                    </div>

                    {/* ── 账号与密码 ── */}
                    <div className="set-label">
                        <span className="ic">
                            <IShield size={14} />
                        </span>
                        账号与密码
                    </div>
                    <div className="set-group paper">
                        <div className="set-row">
                            <span className="set-ico" style={{ background: 'var(--accent-grad)' }}>
                                <IMail size={16} />
                            </span>
                            <div className="set-body">
                                <input
                                    className="set-edit"
                                    value={p.email}
                                    onChange={(e) => set('email', e.target.value)}
                                    spellCheck={false}
                                    aria-label="绑定邮箱"
                                />
                                <div className="set-s" style={{ paddingLeft: 8 }}>绑定的邮箱</div>
                            </div>
                        </div>
                        <div className="set-row tap" onClick={() => setPwOpen((o) => !o)}>
                            <span className="set-ico" style={{ background: 'linear-gradient(135deg,#FBE6A8,#F1C75A)' }}>
                                <IKey size={16} />
                            </span>
                            <div className="set-body">
                                <div className="set-t">修改密码</div>
                                <div className="set-s">{pwOpen ? '输入旧密码与新密码' : '上次更新于 3 个月前'}</div>
                            </div>
                            <span className="set-chev" style={{ transform: pwOpen ? 'rotate(90deg)' : 'none', transition: 'transform .25s' }}>
                                <IChevron size={17} />
                            </span>
                        </div>
                        <div className={`set-expand ${pwOpen ? 'open' : ''}`}>
                            <div className="set-pw">
                                <input type="password" placeholder="当前密码" value={pw.cur} onChange={(e) => setPw((s) => ({ ...s, cur: e.target.value }))} />
                                <input
                                    type="password"
                                    placeholder="新密码（至少 4 位）"
                                    value={pw.a}
                                    onChange={(e) => setPw((s) => ({ ...s, a: e.target.value }))}
                                />
                                <input
                                    type="password"
                                    placeholder="再次输入新密码"
                                    value={pw.b}
                                    onChange={(e) => setPw((s) => ({ ...s, b: e.target.value }))}
                                />
                                <div className="row">
                                    <span className={`ok ${saved ? 'show' : ''}`}>
                                        <ICheck size={14} />
                                        已更新
                                    </span>
                                    <button className="btn-save" onClick={savePw} disabled={!pwValid}>
                                        保存
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="set-row">
                            <span className="set-ico" style={{ background: 'linear-gradient(135deg,#C9E8C2,#86C99A)' }}>
                                <ILock size={16} />
                            </span>
                            <div className="set-body">
                                <div className="set-t">应用锁</div>
                                <div className="set-s">{p.lock ? '进入小世界需要密码' : '关闭后无需验证即可进入'}</div>
                            </div>
                            <span className={`sw ${p.lock ? 'on' : ''}`} onClick={() => set('lock', !p.lock)}>
                                <i />
                            </span>
                        </div>
                        <div className="set-row tap" onClick={logout}>
                            <span className="set-ico" style={{ background: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)' }}>
                                <ILogout size={16} />
                            </span>
                            <div className="set-body">
                                <div className="set-t" style={{ color: '#C25A72' }}>退出账号</div>
                                <div className="set-s">{loggingOut ? '正在退出…' : '回到登录页 · 回忆都在云端，不会丢'}</div>
                            </div>
                            <span className="set-chev">
                                <IChevron size={17} />
                            </span>
                        </div>
                    </div>

                    {/* ── 主题外观 ── */}
                    <div className="set-label">
                        <span className="ic">
                            <IPaint size={14} />
                        </span>
                        主题外观
                    </div>
                    <div className="set-group paper">
                        <div className="set-row">
                            <div className="set-body">
                                <div className="set-t">玻璃质感</div>
                                <div className="set-s">界面卡片的材质</div>
                            </div>
                            <Segmented opts={GLASS_OPTS} value={t.glassStyle} onChange={(k) => setTweak('glassStyle', k as GlassStyle)} />
                        </div>
                        <div className="set-row" style={{ flexWrap: 'wrap' }}>
                            <div className="set-body">
                                <div className="set-t">光线时段</div>
                                <div className="set-s">一天里的光与氛围</div>
                            </div>
                            <Segmented opts={MOOD_OPTS} value={t.mood} onChange={(k) => setTweak('mood', k as Mood)} withIcon />
                        </div>
                        <div className="set-row">
                            <div className="set-body">
                                <div className="set-t">聊天消息排列</div>
                                <div className="set-s">全部靠左（Discord 式）或自己的消息靠右</div>
                            </div>
                            <Segmented opts={CHAT_ALIGN_OPTS} value={t.chatAlign} onChange={(k) => setTweak('chatAlign', k as ChatAlign)} />
                        </div>
                    </div>

                    <div className="set-foot">
                        {p.world} · v1.0 · 只属于你们
                        <span className="hh">
                            <IHeart size={11} fill="currentColor" sw={0} />
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}