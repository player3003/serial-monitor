import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Docker 需要监听所有网络接口
    proxy: {
      // 代理后端API请求
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true
      },
      // 代理WebSocket请求 - STOMP + SockJS
      '/ws': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('WebSocket proxy error:', err)
          })
        }
      }
    }
  }
})
