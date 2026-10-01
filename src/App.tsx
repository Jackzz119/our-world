import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import WorldPage from '@/pages/WorldPage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ProtectedRoute from '@/pages/ProtectedRoute';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';

// Music M0 device check (ai/features/music/m0.md): dev builds only, so production never ships it.
const MusicCheckPage = import.meta.env.DEV ? lazy(() => import('@/pages/MusicCheckPage')) : null;

const App = () => {
    useUiViewport();
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <WorldPage />
                        </ProtectedRoute>
                    }
                />
                {MusicCheckPage && (
                    <Route
                        path="/dev/music-check"
                        element={
                            <ProtectedRoute>
                                <Suspense fallback={null}>
                                    <MusicCheckPage />
                                </Suspense>
                            </ProtectedRoute>
                        }
                    />
                )}
            </Routes>
        </BrowserRouter>
    );
};

export default App;
