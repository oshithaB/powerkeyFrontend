import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base:process.env.VITE_BASE_PATH || './powerkeyFrontend',
  server: {
    proxy: {
      '/api': {
        target: 'http://147.79.115.89:3000',
        changeOrigin: true
      }
    }
  }
})