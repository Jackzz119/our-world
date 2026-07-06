// ResetPasswordPage.tsx — sets a new password after the user arrives from a
// recovery email link. supabase-js parses the #type=recovery hash on load and
// establishes a temporary session, so `user` from useAuth is the signal that
// the link is valid; without it the link is missing/expired.
// Shares the cinnaglass login shell styles (LoginPage.module.css).
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { useAuth } from '@/hooks/useAuth.ts';
import { RoomScene } from '@/themes/cinnaglass/scene.tsx';
import { IEye, IEyeOff, IHeart, ILock } from '@/themes/cinnaglass/icons.tsx';
import styles from './LoginPage.module.css';

type Msg = { type: 'info' | 'error'; text: string } | null;

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false); // one toggle drives both fields
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
            setMsg({ type: 'info', text: '密码已更新 ✿ 正在回到你们的小世界…' });
            setTimeout(() => navigate('/'), 900);
        } catch (err) {
            setMsg({ type: 'error', text: err instanceof Error ? err.message : '设置失败，请重试。' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.bg}>
                <RoomScene />
            </div>
            <div className={styles.veil} />

            <div className={`${styles.card} glass`}>
                <div className={styles.brand}>
                    <span className={styles.mark}>
                        <IHeart size={22} fill="currentColor" sw={0} />
                    </span>
                    <h1>Our World</h1>
                    <p>设置一个新密码</p>
                </div>

                {loading ? (
                    <div className={`${styles.msg} ${styles.info}`}>正在确认链接…</div>
                ) : user ? (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <label className="field">
                            <ILock size={17} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="新密码（至少 6 位）"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" className={styles.eye} onClick={() => setShowPw((v) => !v)} title={showPw ? '隐藏密码' : '显示密码'}>
                                {showPw ? <IEyeOff size={17} /> : <IEye size={17} />}
                            </button>
                        </label>
                        <label className="field">
                            <ILock size={17} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="再输一遍新密码"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </label>

                        {msg && <div className={`${styles.msg} ${styles[msg.type]}`}>{msg.text}</div>}

                        <button type="submit" className={`btn-primary ${styles.submit}`} disabled={busy || !password || !confirm}>
                            {busy ? '稍等…' : '更新密码'}
                        </button>
                    </form>
                ) : (
                    <>
                        <div className={`${styles.msg} ${styles.error}`}>链接无效或已过期，请回到登录页重新发送重置邮件。</div>
                        <div className={styles.switchRow}>
                            <button type="button" onClick={() => navigate('/login')}>
                                回到登录
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
