import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { messaging, db } from "../firebase";

const VAPID_KEY =
  "BMTsigthGJYq8EQd1CWCduPWJIJaSz1AFZ68T5OJJUQBQ37tnqTi5AbU1f1RuwISoJbrv5IKBHVLjNLog8uMFLY";

export async function enablePushNotifications(userId) {
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

    console.log("✅ FCM Token:", token);

    await updateDoc(doc(db, "users", userId), {
      fcmToken: token,
      notificationsEnabled: true,
      updatedAt: new Date().toISOString(),
    });

    return token;
  } catch (error) {
    console.error("FCM Error:", error);
    return null;
  }
}