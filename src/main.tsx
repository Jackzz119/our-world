import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './themes/cinnaglass/cinnaglass.css';
// side-effect import: registers the <image-slot> custom element used by settings/screens
import './themes/cinnaglass/image-slot.js';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
