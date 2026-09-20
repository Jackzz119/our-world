// ResetPasswordPage.tsx — sets a new password after the user arrives from a
// recovery email link. supabase-js parses the #type=recovery hash on load and
// establishes a temporary session, so `user` from useAuth is the signal that
// the link is valid; without it the link is missing/expired.
// Shares the cinnaglass login shell styles (LoginPage.module.css).
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { IEye, IEyeOff, IHeart, ILock } from '@/themes/cinnaglass/icons';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/entry.css';
import styles from '@/pages/LoginPage.module.css';

import type { Msg } from '@/pages/LoginPage';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false); // one toggle drives both fields
    const [busy, setBusy] = useState(false);
    const [complete, setComplete] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);

    // Validates locally (6+ chars, both fields equal) before calling updateUser —
    // some Supabase projects accept a short password silently.
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (busy || complete) return;
        if (password.length < 6) {
            setMsg({ type: 'error', text: '密码至少 6 位。' });
            return;
        }
        if (password !== confirm) {
            setMsg({ type: 'error', text: '两次输入的密码不一致。' });
            return;
        }
        setBusy(true);
        setMsg(null);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setComplete(true);
            setMsg({ type: 'info', text: '密码已更新 ✿ 正在回到你们的小世界…' });
            setTimeout(() => navigate('/'), 900);
        } catch (err) {
            setMsg({ type: 'error', text: err instanceof Error ? err.message : '设置失败，请重试。' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="ui-entry ui-environment" data-mood="twilight">
            <section className={`${styles.card} ui-surface`} aria-label="重置密码" aria-busy={loading || busy}>
                <div className={styles.brand}>
                    <span className={styles.mark}>
                        <IHeart size={22} fill="currentColor" sw={0} />
                    </span>
                    <h1>Our World</h1>
                    <p>设置一个新密码</p>
                </div>

                <div className={`${styles.content} ui-liner`}>
                    {loading ? (
                        <div className={`${styles.msg} ${styles.info}`} role="status">
                            正在确认链接…
                        </div>
                    ) : user ? (
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <label className={styles.field}>
                                <ILock size={17} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="新密码（至少 6 位）"
                                    aria-label="新密码（至少 6 位）"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.eye}
                                    onClick={() => setShowPw((v) => !v)}
                                    title={showPw ? '隐藏密码' : '显示密码'}
                                    aria-label={showPw ? '隐藏密码' : '显示密码'}
                                    aria-pressed={showPw}
                                >
                                    {showPw ? <IEyeOff size={17} /> : <IEye size={17} />}
                                </button>
                            </label>
                            <label className={styles.field}>
                                <ILock size={17} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="再输一遍新密码"
                                    aria-label="确认新密码"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                />
                            </label>

                            {msg && (
                                <div
                                    className={`${styles.msg} ${styles[msg.type]}`}
                                    role={msg.type === 'error' ? 'alert' : 'status'}
                                >
                                    {msg.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={`ui-button ui-button-primary ${styles.submit}`}
                                disabled={busy || complete || !password || !confirm}
                            >
                                {complete ? '密码已更新' : busy ? '稍等…' : '更新密码'}
                            </button>
                        </form>
                    ) : (
                        <>
                            <div className={`${styles.msg} ${styles.error}`} role="alert">
                                链接无效或已过期，请回到登录页重新发送重置邮件。
                            </div>
                            <div className={styles.switchRow}>
                                <button type="button" onClick={() => navigate('/login')}>
                                    回到登录
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};

export default ResetPasswordPage;
