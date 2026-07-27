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

    // تحذير إذا زاد أي Chunk عن 300KB
    chunkSizeWarningLimit: 300,

    sourcemap: false,

    // يمكنك ترك terser لأنك تستخدم drop_console
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
          // ================= React =================
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router")
          ) {
            return "react-vendor";
          }

          // ================= Firebase =================
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

          // ================= Material UI =================
          if (id.includes("@mui")) {
            return "mui-vendor";
          }

          // ================= Icons =================
          if (id.includes("lucide-react")) {
            return "icons";
          }

          // ================= Utilities =================
          if (
            id.includes("date-fns") ||
            id.includes("lodash")
          ) {
            return "utils-vendor";
          }

          // ================= Firebase Helpers =================
          if (
            id.includes("@firebase") ||
            id.includes("idb") ||
            id.includes("tslib")
          ) {
            return "firebase-core";
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