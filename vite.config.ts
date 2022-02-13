import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
  var config = {plugins: [vue({
      reactivityTransform: true
  })]}
  if (command === 'build') {
      config['base'] = '/slovr'
  }
  return config
})
