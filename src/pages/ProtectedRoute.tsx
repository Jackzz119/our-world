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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getEnvFlag, getEnvOptional } from '@/utils';
import '@/themes/cinnaglass/ui/ui-system.css';
import '@/themes/cinnaglass/entry.css';

const DEV_EMAIL = getEnvOptional('VITE_DEV_EMAIL');
const DEV_PASSWORD = getEnvOptional('VITE_DEV_PASSWORD');
// auto-login engages only when the switch is on AND both credentials exist;
// otherwise the flag is inert and the normal login flow applies
const DEV_AUTO_LOGIN = getEnvFlag('VITE_DEV') && !!DEV_EMAIL && !!DEV_PASSWORD;

// Full-screen placeholder shown while the session check (and the optional dev
// auto-login) is still pending.
const Splash = () => (
    <main className="ui-entry ui-environment" data-mood="twilight" aria-busy="true">
        <section className="ui-entry-card ui-surface">
            <h1>Our World</h1>
            <div className="ui-entry-content ui-liner" role="status">
                正在回到我们的小世界…
            </div>
        </section>
    </main>
);

// An explicit sign-out (settings → 退出账号) must stick: without this flag a
// remount would auto-log the dev account right back in. sessionStorage scoped
// — a fresh tab restores the dev convenience.
const explicitLogout = (): boolean => {
    try {
        return sessionStorage.getItem('ow-explicit-logout') === '1';
    } catch {
        return false;
    }
};

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    // treat a sticky explicit logout as "already tried": no auto-login retry
    const [devTried, setDevTried] = useState(explicitLogout);

    // any real session (e.g. manual login afterwards) clears the flag
    useEffect(() => {
        if (!user) return;
        try {
            sessionStorage.removeItem('ow-explicit-logout');
        } catch {
            /* ignore */
        }
    }, [user]);

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
