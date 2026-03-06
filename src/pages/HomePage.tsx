import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { supabase } from '@/lib/supabase.ts';

interface HomePageProps {
    session: Session;
}
const HomePage = ({ session }: HomePageProps) => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');

    async function handleSignOut(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setMessage(error.message);
        } else {
            navigate('/login');
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
            <section className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">主应用页面</h1>
                <p className="text-center text-gray-600 mb-2">
                    当前登录用户：<span className="font-semibold text-purple-600">{session.user.email}</span>
                </p>
                <p className="text-center text-gray-500 mb-8">你可以在这里接入 todos 或其他主功能页面。</p>

                <button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition"
                    type="button"
                    onClick={handleSignOut}
                >
                    退出登录
                </button>

                {message && <p className="mt-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">{message}</p>}
            </section>
        </main>
    );
};

export default HomePage;
