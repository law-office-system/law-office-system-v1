import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // رفع الحد المسموح به للتحذير من حجم الملفات إلى 1 ميجابايت
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        // تقسيم المكتبات الكبيرة (مثل firebase) في ملف منفصل
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
        }
      }
    }
  }
})