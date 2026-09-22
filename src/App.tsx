import { BrowserRouter, Route, Routes } from 'react-router-dom';
import WorldPage from '@/pages/WorldPage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ProtectedRoute from '@/pages/ProtectedRoute';
import { useUiViewport } from '@/themes/cinnaglass/ui/use-ui-viewport';

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
            </Routes>
        </BrowserRouter>
    );
};

export default App;
