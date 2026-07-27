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
    // Firestore طبيعيًا كبير (~400KB) فالـ 300KB تحذير زائف
    chunkSizeWarningLimit: 500,

    sourcemap: false,

    minify: "terser",

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
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

          // ================= Firebase SDKs (منفصلة) =================
          // كل خدمة Firebase في Chunk منفصل للـ Caching الأمثل

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
          // @firebase/* + idb + tslib = Core مشترك
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