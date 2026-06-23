import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData?.officeId) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("officeId", "==", userData.officeId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setNotifications(data);
    });

    return () => unsub();
  }, [userData?.officeId]);

  // 🟢 NEW: فلترة ذكية حسب صلاحية الإشعار
  const validNotifications = useMemo(() => {
    const now = new Date();

    return notifications.filter((n) => {
      const created = n.createdAt?.toDate?.() || new Date(n.createdAt);
      if (!created) return true;

      // 🔴 late: ينتهي بعد 48 ساعة
      if (n.type === "late") {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays < 2;
      }

      // 🟡 today: ينتهي بنهاية اليوم
      if (n.type === "today") {
        return created.toDateString() === now.toDateString();
      }

      // 🟠 soon: ينتهي بعد 24 ساعة
      if (n.type === "soon") {
        const diffHours = (now - created) / (1000 * 60 * 60);
        return diffHours < 24;
      }

      return true;
    });
  }, [notifications]);

  const unreadCount = validNotifications.filter((n) => !n.isRead).length;

  return {
    notifications: validNotifications,
    count: unreadCount,
    hasNotifications: unreadCount > 0,
  };
}