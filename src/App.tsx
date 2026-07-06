import { BrowserRouter, Route, Routes } from 'react-router-dom';
import WorldPage from '@/pages/WorldPage.tsx';
import LoginPage from '@/pages/LoginPage.tsx';
import ResetPasswordPage from '@/pages/ResetPasswordPage.tsx';
import ProtectedRoute from '@/pages/ProtectedRoute.tsx';

const App = () => {
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