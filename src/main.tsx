import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import '@/themes/cinnaglass/cinnaglass.css';
// side-effect import: registers the <image-slot> custom element used by settings/screens
import '@/themes/cinnaglass/image-slot';
import App from '@/App';
import { applyStoredMotion } from '@/themes/cinnaglass/ui/motion-preference';

// html[data-motion] must exist before the first frame so entry pages honour the low-motion mode too.
applyStoredMotion();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
