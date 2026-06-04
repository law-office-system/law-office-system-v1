import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { generateNotifications } from "./generateNotifications";

export const syncNotifications = async (cases) => {
  const notifications = generateNotifications(cases);

  const existing = await getDocs(collection(db, "notifications"));

  const existingKeys = new Set(
    existing.docs.map(
      (d) => d.data().caseId + d.data().type
    )
  );

  for (const n of notifications) {
    const key = n.caseId + n.type;

    if (!existingKeys.has(key)) {
      await addDoc(collection(db, "notifications"), {
        ...n,
        read: false,
        createdAt: new Date(),
      });
    }
  }
};