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
    build: {
        // Font slices load on demand through unicode-range; inlining the small ones would put
        // every glyph set into the stylesheet. Other small assets keep Vite's default.
        assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined)
    }
});
