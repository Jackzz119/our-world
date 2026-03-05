import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import './App.css';

function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data.session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setSubmitting(true);
        setMessage('');

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                setMessage('注册成功，请检查邮箱验证链接。');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '认证失败，请重试。');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSignOut(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setMessage(error.message);
        }
    }

    if (loading) {
        return (
            <main className="page">
                <section className="card">
                    <p>正在检查登录状态...</p>
                </section>
            </main>
        );
    }

    if (!session) {
        return (
            <main className="page">
                <section className="card">
                    <h1 className="title">Still Love</h1>
                    <p className="subtitle">{isSignUp ? '创建账号' : '登录后继续'}</p>
                    <form className="form" onSubmit={handleAuthSubmit}>
                        <label className="label">
                            Email
                            <input
                                className="input"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </label>

                        <label className="label">
                            Password
                            <input
                                className="input"
                                type="password"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                minLength={6}
                            />
                        </label>

                        <button className="primaryButton" type="submit" disabled={submitting}>
                            {submitting ? '处理中...' : isSignUp ? '注册' : '登录'}
                        </button>
                    </form>

                    <button
                        className="textButton"
                        type="button"
                        onClick={() => {
                            setIsSignUp((prev) => !prev);
                            setMessage('');
                        }}
                    >
                        {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
                    </button>

                    {message && <p className="message">{message}</p>}
                </section>
            </main>
        );
    }

    return (
        <main className="page">
            <section className="card">
                <h1 className="title">主应用页面</h1>
                <p className="subtitle">当前登录用户：{session.user.email}</p>
                <p className="subtitle">你可以在这里接入 todos 或其他主功能页面。</p>
                <button className="primaryButton" type="button" onClick={handleSignOut}>
                    退出登录
                </button>
                {message && <p className="message">{message}</p>}
            </section>
        </main>
    );
}

export default App;
