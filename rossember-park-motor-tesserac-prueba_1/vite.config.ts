import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Base URL para GitHub Pages. Debe coincidir con el nombre de tu repositorio.
    // Ejemplo: si tu repo es https://github.com/usuario/rossember-park
    // entonces base debe ser '/rossember-park/'
    base: '/Rossember-Park/',
    define: {
      // Expose the API_KEY safely. Using JSON.stringify ensures it's treated as a string literal.
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
  };
});