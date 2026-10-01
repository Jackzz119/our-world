import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import '@/themes/cinnaglass/cinnaglass.css';
// side-effect import: registers the <image-slot> custom element used by settings/screens
import '@/themes/cinnaglass/image-slot';
import App from '@/App';
import { applyStoredMotion } from '@/themes/cinnaglass/ui/motion-preference';
import { applyLook } from '@/themes/cinnaglass/ui/look';

// html[data-motion] must exist before the first frame so entry pages honour the low-motion mode too.
applyStoredMotion();
// html[data-look]: ?look= tries another glass for a review (ui/look.ts)
applyLook();

// The display face for panel titles (--ui-display) loads off the critical path: its 92
// unicode-range slices are ~100 KB of CSS. Titles show the serif fallback until it lands.
void import('@fontsource/zcool-xiaowei/400.css');

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
