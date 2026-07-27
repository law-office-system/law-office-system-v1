import { doc, setDoc } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { db } from "../firebaseDb";
import { messaging } from "../firebaseMessaging";

// ضع هنا VAPID KEY
const VAPID_KEY = "ضع_VAPID_KEY_هنا";

export const initNotifications = async (userId, officeId) => {
  try {
    if (!messaging) {
      console.warn("Messaging not supported");
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      console.warn("No FCM token generated");
      return null;
    }

    // 🔥 حفظ التوكن داخل المستخدم + المكتب
    await setDoc(
      doc(db, "users", userId),
      {
        fcmToken: token,
        officeId: officeId,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    console.log("FCM Token saved:", token);
    return token;
  } catch (error) {
    console.error("Notification init error:", error);
    return null;
  }
};