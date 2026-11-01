import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'./',publicDir:false,resolve:{alias:{'@':fileURLToPath(new URL('../../../src',import.meta.url))}},define:{__PUBLIC_URL__:JSON.stringify('http://127.0.0.1:5174/'),__OAUTH_DEV_REDIRECT__:JSON.stringify('http://127.0.0.1:5174/')},plugins:[react()],build:{outDir:fileURLToPath(new URL('../../../../../outputs',import.meta.url)),emptyOutDir:false,rollupOptions:{input:{maquettes:fileURLToPath(new URL('./maquettes.html',import.meta.url)),fullscreen:fileURLToPath(new URL('./fullscreen.html',import.meta.url))}}}});
