import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // This is built into Node.js

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This line tells Vite: "No matter who asks for React, 
      // always give them the one in the main node_modules folder."
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
})