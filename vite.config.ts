import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@runtime': path.resolve(import.meta.dirname, 'src/runtime'),
      '@editor': path.resolve(import.meta.dirname, 'src/editor'),
    },
  },
});