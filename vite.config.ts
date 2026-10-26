import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // A API .NET mora em api/; observar o bin/obj dela derruba o servidor (EBUSY) no Windows.
    watch: { ignored: ['**/api/**'] },
  },
})
