import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// ─── Cache Busting: Unique build ID ──────────────────────────────
const BUILD_ID = Date.now().toString(36).toUpperCase();

export default defineConfig({
  plugins: [
    react(),

    // تحليل حجم الـ Bundle بعد البناء
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "dist/stats.html",
    }),
  ],

  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,

    // ─── رفع الحد الأدنى للتحذير ──────────────────────────────
    chunkSizeWarningLimit: 500,

    sourcemap: false,

    minify: "terser",

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // إزالة دوال console بالكامل (أقوى من drop_console)
        pure_funcs: ["console.log", "console.info", "console.warn", "console.debug"],
      },
      mangle: {
        // أسماء أقصر للمتغيرات
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    rollupOptions: {
      output: {
        // Cache Busting
        entryFileNames: `assets/[name]-[hash]-${BUILD_ID}.js`,
        chunkFileNames: `assets/[name]-[hash]-${BUILD_ID}.js`,
        assetFileNames: `assets/[name]-[hash]-${BUILD_ID}[extname]`,

        manualChunks(id) {
          // ─── IMPORTANT: الأكثر تحديدًا يجب أن يكون أولاً ───

          // ================= React Ecosystem =================
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router")
          ) {
            return "react-vendor";
          }

          // ================= TipTap Editor (المحرر) =================
          if (
            id.includes("@tiptap") ||
            id.includes("prosemirror")
          ) {
            return "tiptap-vendor";
          }

          // ================= Export Libraries (تصدير PDF/Word) =================
          if (
            id.includes("docx") ||
            id.includes("html2pdf") ||
            id.includes("file-saver") ||
            id.includes("html2canvas") ||
            id.includes("jspdf")
          ) {
            return "export-vendor";
          }

          // ================= Firebase SDKs (منفصلة) =================
          if (id.includes("firebase/app")) {
            return "firebase-app";
          }
          if (id.includes("firebase/auth")) {
            return "firebase-auth";
          }
          if (id.includes("firebase/firestore")) {
            return "firebase-firestore";
          }
          if (id.includes("firebase/storage")) {
            return "firebase-storage";
          }
          if (id.includes("firebase/messaging")) {
            return "firebase-messaging";
          }
          if (id.includes("firebase/database")) {
            return "firebase-rtdb";
          }
          if (id.includes("firebase/functions")) {
            return "firebase-functions";
          }
          if (id.includes("firebase/analytics")) {
            return "firebase-analytics";
          }

          // ================= Firebase Internals =================
          if (
            id.includes("@firebase") ||
            id.includes("idb") ||
            id.includes("tslib")
          ) {
            return "firebase-core";
          }

          // ================= Material UI =================
          if (id.includes("@mui")) {
            return "mui-vendor";
          }

          // ================= Icons =================
          if (id.includes("lucide-react")) {
            return "icons";
          }

          // ================= State Management =================
          if (
            id.includes("zustand") ||
            id.includes("jotai") ||
            id.includes("recoil")
          ) {
            return "state-vendor";
          }

          // ================= HTTP / API =================
          if (
            id.includes("axios") ||
            id.includes("fetch")
          ) {
            return "http-vendor";
          }

          // ================= Utilities =================
          if (
            id.includes("date-fns") ||
            id.includes("lodash") ||
            id.includes("moment")
          ) {
            return "utils-vendor";
          }

          // ================= Animation =================
          if (
            id.includes("framer-motion") ||
            id.includes("gsap")
          ) {
            return "animation-vendor";
          }

          // ─── دمج الملفات الصغيرة من الكود بتاعك ───
          // ملفات Firebase wrappers + utilities + constants + UI صغيرة
          if (
            id.includes("/src/firebase") ||
            id.includes("/src/utils/") ||
            id.includes("/src/constants/") ||
            id.includes("/src/components/ui/") ||
            id.includes("/src/hooks/useThemeStyles") ||
            id.includes("/src/styles/design-system")
          ) {
            return "app-core";
          }

          // ================= Other Vendors =================
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false,
    },
  },

  preview: {
    port: 4173,
    open: true,
  },
});