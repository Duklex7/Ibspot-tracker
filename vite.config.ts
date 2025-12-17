import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial: Makes paths relative so it works on GitHub Pages subdirectories
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});