import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// ─── Cache Busting: Unique build ID ──────────────────────────────
const BUILD_ID = Date.now().toString(36).toUpperCase();

export default defineConfig({
  plugins: [
    react(),
    // ✅ تحليل حجم الـ Bundle (اختياري - يظهر بعد build)
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  define: {
    // ✅ إتاحة BUILD_ID في الكود
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    },
    rollupOptions: {
      output: {
        // ✅ CACHE BUSTING: إضافة timestamp لكل build
        entryFileNames: `assets/[name]-[hash]-${BUILD_ID}.js`,
        chunkFileNames: `assets/[name]-[hash]-${BUILD_ID}.js`,
        assetFileNames: `assets/[name]-[hash]-${BUILD_ID}[extname]`,
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@mui')) {
            return 'mui-vendor';
          }
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/lodash')) {
            return 'utils-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false
    }
  },
  preview: {
    port: 4173,
    open: true
  }
})