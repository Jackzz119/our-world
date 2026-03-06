import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    session: Session | null;
    loading: boolean;
    children: ReactNode;
    devMode?: boolean;
}

const ProtectedRoute = ({ session, loading, children, devMode = false }: ProtectedRouteProps) => {
    if (devMode) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 to-pink-50">
                <section className="bg-white rounded-2xl shadow-xl p-8">
                    <p className="text-gray-600">正在检查登录状态...</p>
                </section>
            </main>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
