import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.jsx')
      },
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
