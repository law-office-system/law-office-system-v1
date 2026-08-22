import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init("ZWRWlbpfVQegdwz9I");

// ⚠️ React.StrictMode removed to fix double mount issue
// that causes auth state to hang in development

// ─── تسجيل Service Worker للـ Caching ──────────────────────────
if ('serviceWorker' in navigator) {
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);