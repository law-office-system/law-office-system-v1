import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { generateNotifications } from "../utils/generateNotifications";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData?.officeId) return;

    // مراقبة القضايا الخاصة بالمكتب فقط
    const q = query(
      collection(db, "cases"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const cases = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // حساب التنبيهات لحظياً
      const generated = generateNotifications(cases);
      setNotifications(generated);
    });

    return () => unsub();
  }, [userData]);

  // إرجاع عدد التنبيهات وحالة وجودها
  return {
    notifications,
    hasNotifications: notifications.length > 0,
    count: notifications.length
  };
}