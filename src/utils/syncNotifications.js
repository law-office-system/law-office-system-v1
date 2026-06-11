import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from "firebase/firestore";
import { generateNotifications } from "./generateNotifications";

export const syncNotifications = async (cases, officeId) => {
  const notifications = generateNotifications(cases);
  const notifRef = collection(db, "notifications");

  // 1. جلب التنبيهات الخاصة بهذا المكتب فقط للتحقق
  const q = query(notifRef, where("officeId", "==", officeId));
  const existing = await getDocs(q);

  const existingKeys = new Set(
    existing.docs.map((d) => d.data().caseId + d.data().type)
  );

  // 2. إضافة التنبيهات الجديدة فقط
  for (const n of notifications) {
    const key = n.caseId + n.type;
    if (!existingKeys.has(key)) {
      await addDoc(notifRef, {
        ...n,
        officeId: officeId, // <--- هذا هو الجزء الأهم
        read: false,
        createdAt: new Date(),
      });
    }
  }
};