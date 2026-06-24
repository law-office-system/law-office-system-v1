importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAZJvLlt05-fQK9ix4A_4qjY_y79mDfaNU",
  authDomain: "law-office-78a96.firebaseapp.com",
  projectId: "law-office-78a96",
  storageBucket: "law-office-78a96.firebasestorage.app",
  messagingSenderId: "789453843979",
  appId: "1:789453843979:web:d2558096ca8e84e041e10e",
});

const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Background Message:", payload);

  const notificationTitle =
    payload?.notification?.title || "إشعار جديد";

  const notificationOptions = {
    body: payload?.notification?.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: payload?.data || {},
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// فتح التطبيق عند الضغط على الإشعار
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});