import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// The admin panel is its own website:
//   npm run dev:admin    -> http://localhost:5176
//   npm run build:admin  -> dist-admin/   (deploy this to e.g. admin.yourshop.com)
// The shop stays on port 5175 (npm run dev) and has no admin code in it at all.
export default defineConfig({
  root: path.resolve(__dirname, 'admin-site'),
  publicDir: path.resolve(__dirname, 'admin-site/public'),
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5176,
    strictPort: true,
    fs: { allow: [path.resolve(__dirname)] },
  },
  preview: { port: 4176 },
  build: {
    outDir: path.resolve(__dirname, 'dist-admin'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } },
  },
})
