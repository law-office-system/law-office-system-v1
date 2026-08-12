import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebaseDb";

/**
 * Check if notification type is enabled in office settings
 */
async function isNotificationEnabled(officeId, type) {
  if (!officeId) return true; // default: enabled

  try {
    const snap = await getDoc(doc(db, "offices", officeId));
    if (!snap.exists()) return true;

    const data = snap.data();
    const settings = data.notifications || {};

    switch (type) {
      case "late":
      case "session_reminder":
        return settings.sessionReminder !== false;
      case "admin_task":
        return settings.taskAssigned !== false;
      case "judgment":
      case "case_status_change":
        return settings.caseStatusChange !== false;
      case "new_message":
        return settings.newMessage !== false;
      default:
        return true;
    }
  } catch (e) {
    console.warn("Failed to check notification settings:", e.message);
    return true; // default: allow on error
  }
}

export async function createNotification({
  officeId,
  caseId,
  caseNumber,
  type,
  message,
}) {
  // 🆕 NEW: Check if this notification type is enabled
  const enabled = await isNotificationEnabled(officeId, type);
  if (!enabled) {
    console.log(`🚫 Notification type "${type}" is disabled for office ${officeId}`);
    return null;
  }

  return addDoc(collection(db, "notifications"), {
    officeId,
    caseId,
    caseNumber,
    type,
    message,
    isReadBy: {},
    createdAt: serverTimestamp(),
  });
}