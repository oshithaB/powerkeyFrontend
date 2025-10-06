import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base:process.env.VITE_BASE_PATH || '/powerkeyFrontend',
  server: {
    proxy: {
      '/api': {
        target: 'https://powerkeybackend-production.up.railway.app',
        changeOrigin: true
      }
    }
  }
})