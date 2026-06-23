import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [glsl()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
  },
})
