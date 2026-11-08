import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Config PostCSS vacía: evita heredar un postcss.config de carpetas superiores.
  css: { postcss: { plugins: [] } },
  // Los modelos GLB se sirven tal cual desde /public/assets (no pasan por el bundler).
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  build: {
    // Three.js + R3F pesan ~1 MB sin comprimir (~270 kB gzip); es esperado en una app 3D.
    // Three.js + R3F + Rapier (incluye su WASM en base64) suman ~3.5 MB sin comprimir; es esperado.
    chunkSizeWarningLimit: 4000,
  },
})
