import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase.ts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/' }
        });
        if (error) setMessage({ type: 'error', text: error.message });
    };

    const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage({ type: 'info', text: '注册成功，请检查邮箱验证链接。' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : '认证失败，请重试。' });
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass =
        'w-full px-3 py-2.5 text-sm text-stone-800 bg-stone-50 border border-stone-200 rounded-lg outline-none transition placeholder:text-stone-300 focus:border-stone-400 focus:ring-2 focus:ring-stone-200';

    return (
        <div className="min-h-screen bg-linear-to-br from-stone-50 via-stone-50 to-stone-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Logo + 副标题 */}
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-stone-700">still</h1>
                    <p className="text-sm text-stone-400">{isSignUp ? '创建你的账号' : '欢迎回来'}</p>
                </div>

                {/* 表单卡片 */}
                <Card className="border border-stone-100 shadow-sm bg-white/90">
                    <CardContent className="p-6 space-y-4">
                        {/* Google 登录（置顶） */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                            使用 Google 继续
                        </button>

                        {/* 分割线 */}
                        <div className="flex items-center gap-3">
                            <Separator className="flex-1 bg-stone-100" />
                            <span className="text-xs text-stone-400">或使用邮箱</span>
                            <Separator className="flex-1 bg-stone-100" />
                        </div>

                        {/* 邮箱密码表单 */}
                        <form className="space-y-3" onSubmit={handleAuthSubmit}>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-stone-500">邮箱</label>
                                <input
                                    className={inputClass}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-stone-500">密码</label>
                                <input
                                    className={inputClass}
                                    type="password"
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    placeholder="6 位以上"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-stone-700 hover:bg-stone-800 text-white mt-1"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        处理中...
                                    </>
                                ) : isSignUp ? (
                                    '注册'
                                ) : (
                                    '登录'
                                )}
                            </Button>
                        </form>

                        {/* 消息提示 */}
                        {message && (
                            <p
                                className={`text-xs text-center px-3 py-2 rounded-lg ${
                                    message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-stone-50 text-stone-600'
                                }`}
                            >
                                {message.text}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* 切换注册/登录 */}
                <p className="text-center text-sm text-stone-400">
                    {isSignUp ? '已有账号？' : '还没有账号？'}
                    <button
                        type="button"
                        className="ml-1 text-stone-600 font-medium hover:text-stone-800 transition"
                        onClick={() => {
                            setIsSignUp((prev) => !prev);
                            setMessage(null);
                        }}
                    >
                        {isSignUp ? '去登录' : '去注册'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
