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
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData?.officeId) {
      setNotifications([]);
      setLoading(false);
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
      setLoading(false);
    });

    return () => unsub();
  }, [userData?.officeId]);

  // ✅ بدون فلترة زمنية
  const allNotifications = notifications;

  // ✅ حساب العدادات
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const lateCount = allNotifications.filter((n) => n.type === "late").length;
  const todayCount = allNotifications.filter((n) => n.type === "today").length;
  const soonCount = allNotifications.filter((n) => n.type === "soon").length;
  const newCount = allNotifications.filter((n) => n.type === "new").length;

  return {
    notifications: allNotifications,
    loading,
    count: unreadCount,
    hasNotifications: unreadCount > 0,
    unreadCount,
    lateCount,
    todayCount,
    soonCount,
    newCount,
    totalCount: allNotifications.length,
  };
}