import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase.ts';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@/pages/HomePage.tsx';
import LoginPage from '@/pages/LoginPage.tsx';
import ProtectedRoute from '@/pages/ProtectedRoute.tsx';

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data.session);
            setLoading(false);
        });

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute session={session} loading={loading}>
                            <HomePage session={session!} />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
