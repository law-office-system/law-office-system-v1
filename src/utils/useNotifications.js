import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

// ✅ فاصل زمني أدنى بين الجلبين المتتاليين (تنقّل سريع لا يُحمّل السيرفر)
const MIN_FETCH_INTERVAL = 30 * 1000;

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, userData } = useAuth();
  const location = useLocation();
  const lastFetchRef = useRef(0);

  const currentUserId = user?.uid;
  const officeId = userData?.officeId;

  const [notifSettings, setNotifSettings] = useState({
    sessionReminder: true,
    taskAssigned: true,
    caseStatusChange: true,
    newMessage: true,
    reminderHours: 24,
  });

  // تحميل إعدادات الإشعارات من مستند المكتب
  useEffect(() => {
    if (!officeId) return;
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "offices", officeId));
        if (!cancelled && snap.exists() && snap.data().notifications) {
          setNotifSettings((prev) => ({ ...prev, ...snap.data().notifications }));
        }
      } catch (e) {
        console.warn("Failed to load notification settings:", e.message);
      }
    };
    loadSettings();
    return () => { cancelled = true; };
  }, [officeId]);

  // ✅ الجلب الوحيد: getDocs — بلا مستمع دائم (لا يثقل النظام)
  const fetchNotifications = useCallback(async (force = false) => {
    if (!officeId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) return;
    lastFetchRef.current = now;

    try {
      const q = query(
        collection(db, "notifications"),
        where("officeId", "==", officeId)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // ✅ ترتيب محلي: الأحدث أولاً — يتحمل المستندات القديمة بلا createdAt
      data.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tb - ta;
      });
      setNotifications(data);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [officeId]);

  // ✅ التحديث عند الدخول للصفحة/التنقل فقط (مع فاصل 30 ثانية)
  useEffect(() => {
    fetchNotifications();
  }, [location.pathname, fetchNotifications]);

  // ✅ زر التحديث: إعادة التوليد من المصدر ثم إعادة الجلب — إجباري
  const refreshNotifications = useCallback(async () => {
    if (!officeId) return;
    setRefreshing(true);
    try {
      const { syncNotifications } = await import("../utils/syncNotifications");
      const casesSnap = await getDocs(query(collection(db, "cases"), where("officeId", "==", officeId)));
      const tasksSnap = await getDocs(query(collection(db, "adminTasks"), where("officeId", "==", officeId)));
      const judgmentsSnap = await getDocs(query(collection(db, "judgments"), where("officeId", "==", officeId)));

      await syncNotifications(
        casesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        judgmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        officeId
      );

      lastFetchRef.current = 0; // إجبار إعادة الجلب
      await fetchNotifications(true);
      console.log("✅ Notifications refreshed successfully!");
    } catch (err) {
      console.error("❌ Error refreshing notifications:", err);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, [officeId, fetchNotifications]);

  // ── اشتقاقات ──
  const unreadCount = notifications.filter((n) => {
    const readBy = n.isReadBy || {};
    return !readBy[currentUserId];
  }).length;

  const hasNotifications = unreadCount > 0;

  const countsByType = useMemo(() => {
    const counts = { late: 0, admin_task: 0, judgment: 0, total: 0 };
    notifications.forEach((n) => {
      counts.total++;
      if (counts[n.type] !== undefined) counts[n.type]++;
    });
    return counts;
  }, [notifications]);

  // ✅ قراءة فردية/جماعية بنظام isReadBy لكل مستخدم
  const markAsRead = async (id) => {
    if (!currentUserId) return;
    try {
      await updateDoc(doc(db, "notifications", id), {
        [`isReadBy.${currentUserId}`]: true,
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isReadBy: { ...(n.isReadBy || {}), [currentUserId]: true } } : n
        )
      );
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    const unread = notifications.filter((n) => !(n.isReadBy || {})[currentUserId]);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), {
        [`isReadBy.${currentUserId}`]: true,
      });
    });
    await batch.commit();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isReadBy: { ...(n.isReadBy || {}), [currentUserId]: true } }))
    );
  };

  // ✅ حذف إشعار من القائمة المحلية (بعد الحذف من Firestore)
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

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
    removeNotification,
    refreshNotifications,
    notifSettings,
  };
}