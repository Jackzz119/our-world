import { BrowserRouter, Route, Routes } from 'react-router-dom';
import WorldPage from '@/pages/WorldPage.tsx';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<WorldPage />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;