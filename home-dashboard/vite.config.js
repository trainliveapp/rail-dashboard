import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base path, works whether hosted at a domain root (Netlify)
  // or a subfolder like /rail-dashboard/ (GitHub Pages), no editing needed.
  base: './',
  plugins: [react(), tailwindcss()],
})
