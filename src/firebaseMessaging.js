import { app } from "./firebaseApp";

let messaging = null;

export async function initMessaging() {
  if (messaging) return messaging;

  try {
    const { getMessaging, isSupported } = await import(
      "firebase/messaging"
    );

    if (await isSupported()) {
      messaging = getMessaging(app);
      return messaging;
    }

    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}