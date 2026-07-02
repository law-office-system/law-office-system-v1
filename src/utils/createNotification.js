import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function createNotification({
  officeId,
  caseId,
  caseNumber,
  type,
  message,
}) {
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