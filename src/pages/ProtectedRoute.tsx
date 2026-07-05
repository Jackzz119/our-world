// ProtectedRoute.tsx — auth gate for the world space.
// VITE_DEV no longer BYPASSES auth: a session-less UI cannot reach any
// backend data anyway (every worlds/posts/Storage request carries the session
// JWT, and RLS resolves auth.uid() from it — no session, no rows). Instead
// the flag AUTO-LOGS-IN with a real dev account (VITE_DEV_EMAIL /
// VITE_DEV_PASSWORD in .env.local, never committed) so the dev flow runs on
// a genuine session end to end.
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth.ts';
import { supabase } from '@/lib/supabase.ts';
import { getEnvFlag, getEnvOptional } from '@/utils';

const DEV_EMAIL = getEnvOptional('VITE_DEV_EMAIL');
const DEV_PASSWORD = getEnvOptional('VITE_DEV_PASSWORD');
// auto-login engages only when the switch is on AND both credentials exist;
// otherwise the flag is inert and the normal login flow applies
const DEV_AUTO_LOGIN = getEnvFlag('VITE_DEV') && !!DEV_EMAIL && !!DEV_PASSWORD;

const Splash = () => (
    <div
        style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(180deg,#BFE6FA 0%,#DFF1FB 55%,#F3FAFE 100%)',
            color: '#5A6B7D',
            font: '600 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif',
            letterSpacing: '.04em'
        }}
    >
        正在回到我们的小世界…
    </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const [devTried, setDevTried] = useState(false);

    // one-shot dev auto-login, attempted once the initial session check
    // settles with no user; success flips `user` via onAuthStateChange,
    // failure falls through to the login page
    useEffect(() => {
        if (!DEV_AUTO_LOGIN || loading || user || devTried) return;
        let cancelled = false;
        supabase.auth.signInWithPassword({ email: DEV_EMAIL!, password: DEV_PASSWORD! }).finally(() => {
            if (!cancelled) setDevTried(true);
        });
        return () => {
            cancelled = true;
        };
    }, [loading, user, devTried]);

    if (loading || (DEV_AUTO_LOGIN && !user && !devTried)) return <Splash />;
    return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
