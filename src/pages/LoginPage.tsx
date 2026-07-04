// LoginPage.tsx — cinnaglass (Cinnamoroll-toned) sign-in screen.
// Original auth logic (Google OAuth + email/password) wrapped in cinnaglass UI.
// Styling split: shared atoms (.glass / .btn-primary / .field) come from the
// global cinnaglass.css; login-specific pieces from the scoped CSS Module.
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { RoomScene } from '@/themes/cinnaglass/scene.tsx';
import { Ico, IHeart } from '@/themes/cinnaglass/icons.tsx';
import styles from './LoginPage.module.css';

const IMail = (p: Parameters<typeof Ico>[0]) => (
    <Ico {...p}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m3.5 7.5 8.5 5.5 8.5-5.5" />
    </Ico>
);
const ILock = (p: Parameters<typeof Ico>[0]) => (
    <Ico {...p}>
        <rect x="4.5" y="11" width="15" height="9" rx="2.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Ico>
);

const GoogleMark = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

type Msg = { type: 'info' | 'error'; text: string } | null;

const LoginPage = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);

    const signUpMode = mode === 'signup';

    const handleGoogle = async () => {
        setMsg(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/' }
        });
        if (error) setMsg({ type: 'error', text: error.message });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
            if (signUpMode) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMsg({ type: 'info', text: '注册成功 ✿ 若开启了邮箱确认，请查收邮件后再登录。' });
                setMode('signin');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/');
            }
        } catch (err) {
            setMsg({ type: 'error', text: err instanceof Error ? err.message : '操作失败，请重试。' });
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
                    <p>{signUpMode ? '创建只属于我们的小世界' : '回到只属于我们的小世界'}</p>
                </div>

                <button type="button" className={styles.google} onClick={handleGoogle}>
                    <GoogleMark />
                    使用 Google 继续
                </button>

                <div className={styles.or}>
                    <span />
                    或用邮箱
                    <span />
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className="field">
                        <IMail size={17} />
                        <input
                            type="email"
                            autoComplete="email"
                            placeholder="邮箱"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label className="field">
                        <ILock size={17} />
                        <input
                            type="password"
                            autoComplete={signUpMode ? 'new-password' : 'current-password'}
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    {msg && <div className={`${styles.msg} ${styles[msg.type]}`}>{msg.text}</div>}

                    <button type="submit" className={`btn-primary ${styles.submit}`} disabled={busy || !email || !password}>
                        {busy ? '稍等…' : signUpMode ? '注册' : '登录'}
                    </button>
                </form>

                <div className={styles.switchRow}>
                    {signUpMode ? '已经有账号了？' : '还没有账号？'}
                    <button
                        type="button"
                        onClick={() => {
                            setMode(signUpMode ? 'signin' : 'signup');
                            setMsg(null);
                        }}
                    >
                        {signUpMode ? '去登录' : '创建一个'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;