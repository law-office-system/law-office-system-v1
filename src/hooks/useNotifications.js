import { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { generateNotifications } from "../utils/generateNotifications";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, userData } = useAuth();

  const currentUserId = user?.uid;
  const officeId = userData?.officeId;

  // ✅ جلب الإشعارات من Firestore
  useEffect(() => {
    if (!officeId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("officeId", "==", officeId),
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
  }, [officeId]);

  // ✅ توليد الإشعارات في الوقت الفعلي من القضايا/الأعمال/الأحكام
  const refreshNotifications = useCallback(async () => {
    if (!officeId) return;

    setRefreshing(true);
    try {
      // 1. جلب القضايا
      const casesQuery = query(
        collection(db, "cases"),
        where("officeId", "==", officeId)
      );
      const casesSnap = await getDocs(casesQuery);
      const cases = casesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 2. جلب الأعمال الإدارية
      const tasksQuery = query(
        collection(db, "adminTasks"),
        where("officeId", "==", officeId)
      );
      const tasksSnap = await getDocs(tasksQuery);
      const adminTasks = tasksSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 3. جلب الأحكام
      const judgmentsQuery = query(
        collection(db, "judgments"),
        where("officeId", "==", officeId)
      );
      const judgmentsSnap = await getDocs(judgmentsQuery);
      const judgments = judgmentsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 4. توليد الإشعارات
      const generatedNotifications = generateNotifications(cases, adminTasks, judgments);

      // 5. مزامنة مع Firestore
      const { syncNotifications } = await import("../utils/syncNotifications");
      await syncNotifications(cases, adminTasks, judgments, officeId);

      console.log("✅ Notifications refreshed successfully!");
    } catch (err) {
      console.error("❌ Error refreshing notifications:", err);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, [officeId]);

  // ✅ isReadBy: كل مستخدم لحاله
  const unreadCount = notifications.filter((n) => {
    const readBy = n.isReadBy || {};
    return !readBy[currentUserId];
  }).length;

  const hasNotifications = unreadCount > 0;

  // ✅ عدد كل نوع
  const countsByType = useMemo(() => {
    const counts = { late: 0, admin_task: 0, judgment: 0, total: 0 };
    notifications.forEach((n) => {
      counts.total++;
      if (counts[n.type] !== undefined) counts[n.type]++;
    });
    return counts;
  }, [notifications]);

  const markAsRead = async (id) => {
    if (!currentUserId) return;
    try {
      await updateDoc(doc(db, "notifications", id), {
        [`isReadBy.${currentUserId}`]: true,
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    const unread = notifications.filter((n) => {
      const readBy = n.isReadBy || {};
      return !readBy[currentUserId];
    });
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), {
        [`isReadBy.${currentUserId}`]: true,
      });
    });
    await batch.commit();
  };

  return {
    notifications,
    loading,
    refreshing,
    count: unreadCount,
    hasNotifications,
    unreadCount,
    totalCount: notifications.length,
    countsByType,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
}