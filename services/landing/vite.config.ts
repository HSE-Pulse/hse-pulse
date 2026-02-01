import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 6000,
    proxy: {
      '/medisync': 'http://localhost:8090',
      '/careplanplus': 'http://localhost:8090',
      '/pulsenotes': 'http://localhost:8090',
    },
  },
})
