// ProtectedRoute.tsx — auth gate for the world space. Restored from the
// pre-pivot stack (1f9b4a8). Dev bypass: set VITE_DEV=true in .env.local to
// skip auth during development (optional flag, missing = false).
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth.ts';
import { getEnvFlag } from '@/utils';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const devMode = getEnvFlag('VITE_DEV');

    if (devMode) return <>{children}</>;

    if (loading) {
        return (
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
    }

    return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;