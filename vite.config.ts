import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    optimizeDeps: {
        // AV software on this machine blocks writing very large pre-bundle files
        // (observed: full drei bundle → .js missing, endless 504). Code must
        // deep-import drei submodules (e.g. @react-three/drei/web/Html) so each
        // pre-bundle stays small. Production build is unaffected.
        include: ['@react-three/rapier']
    }
});
