import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/lib/supabase.ts';

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setSubmitting(true);
        setMessage('');

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password
                });
                if (error) throw error;

                setMessage('注册成功，请检查邮箱验证链接。');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;

                navigate('/');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '认证失败，请重试。');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
            <section className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Still Love</h1>
                <p className="text-center text-gray-600 mb-8">{isSignUp ? '创建账号' : '登录后继续'}</p>

                <form className="space-y-6" onSubmit={handleAuthSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                            type="password"
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting ? '处理中...' : isSignUp ? '注册' : '登录'}
                    </button>
                </form>

                <button
                    className="w-full mt-4 text-purple-600 hover:text-purple-700 font-medium transition"
                    type="button"
                    onClick={() => {
                        setIsSignUp((prev) => !prev);
                        setMessage('');
                    }}
                >
                    {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
                </button>

                {message && (
                    <p className="mt-4 text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{message}</p>
                )}
            </section>
        </main>
    );
};
export default LoginPage;
