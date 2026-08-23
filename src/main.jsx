import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init("ZWRWlbpfVQegdwz9I");

// ═══════════════════════════════════════════════════════════════
// ═══ Service Worker: تسجيل فقط في الإنتاج ═══
// ═══════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  // في بيئة التطوير (npm run dev): ألغِ أي SW قديم فوراً
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => {
        reg.unregister();
        console.log('🧹 SW unregistered in dev mode:', reg.scope);
      });
    });
    // مسح كل الـ Caches في التطوير
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
        console.log('🗑️ Cache deleted in dev:', name);
      });
    });
  }
  
  // في الإنتاج فقط (npm run build): سجّل الـ SW
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('❌ Service Worker registration failed:', error);
        });
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);