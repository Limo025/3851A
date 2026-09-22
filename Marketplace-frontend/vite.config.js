import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import path from "path" 

// https://vite.dev/config/
export default defineConfig({
  
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./src/main.jsx', import.meta.url))
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: { 
    alias: { "@": path.resolve(__dirname, "./src"), },
  },
})
 