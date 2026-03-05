import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/docs': 'http://127.0.0.1:5000',
      '/general_enum': 'http://127.0.0.1:5000',
      '/brute_domain': 'http://127.0.0.1:5000',
      '/capabilities': 'http://127.0.0.1:5000',
    },
  },
})
