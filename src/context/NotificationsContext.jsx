import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useAuth } from "./AuthContext";
import { db } from "../firebaseDb";

const MIN_FETCH_INTERVAL = 30 * 1000;
const MAX_BATCH_SIZE = 450;

const DEFAULT_SETTINGS = {
  sessionReminder: true,
  taskAssigned: true,
  caseStatusChange: true,
  newMessage: true,
  reminderHours: 24,
};

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notifSettings, setNotifSettings] = useState(DEFAULT_SETTINGS);

  const { user, userData } = useAuth();
  const location = useLocation();

  const currentUserId = user?.uid;
  const officeId = userData?.officeId;

  const lastFetchRef = useRef(0);
  const fetchPromiseRef = useRef(null);
  const syncPromiseRef = useRef(null);
  const officeIdRef = useRef(officeId);
  officeIdRef.current = officeId;

  useEffect(() => {
    lastFetchRef.current = 0;
    setNotifications([]);
    setError(null);
    setLoading(Boolean(officeId));
    setRefreshing(false);
    setNotifSettings(DEFAULT_SETTINGS);
  }, [officeId]);

  useEffect(() => {
    if (!officeId) return;

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "offices", officeId));
        if (!cancelled && snap.exists() && snap.data().notifications) {
          setNotifSettings((previous) => ({
            ...previous,
            ...snap.data().notifications,
          }));
        }
      } catch (settingsError) {
        console.warn("Failed to load notification settings:", settingsError.message);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [officeId]);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!officeId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return fetchPromiseRef.current?.promise;
    }

    const currentRequest = fetchPromiseRef.current;
    if (currentRequest?.officeId === officeId) {
      return currentRequest.promise;
    }

    lastFetchRef.current = now;

    const promise = (async () => {
      try {
        setError(null);
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("officeId", "==", officeId)
        );
        const snapshot = await getDocs(notificationsQuery);

        if (officeIdRef.current !== officeId) return;

        const rows = snapshot.docs.map((documentSnapshot) => {
          const data = documentSnapshot.data();
          return {
            ...data,
            id: documentSnapshot.id,
            notificationKey: data.id || null,
          };
        });

        const uniqueRows = [
          ...new Map(
            rows.map((notification) => [
              notification.notificationKey || notification.id,
              notification,
            ])
          ).values(),
        ];

        uniqueRows.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() ||
            (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis?.() ||
            (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });

        setNotifications(uniqueRows);
      } catch (fetchError) {
        if (officeIdRef.current === officeId) {
          console.error("Error fetching notifications:", fetchError);
          setError("حدث خطأ أثناء تحميل الإشعارات");
          lastFetchRef.current = 0;
        }
      } finally {
        if (officeIdRef.current === officeId) {
          setLoading(false);
        }
      }
    })();

    fetchPromiseRef.current = { officeId, promise };
    await promise;

    if (fetchPromiseRef.current?.promise === promise) {
      fetchPromiseRef.current = null;
    }
  }, [officeId]);

  // جلب واحد مشترك عند التنقل، دون تشغيل مزامنة القضايا والأحكام والأعمال.
  useEffect(() => {
    fetchNotifications();
  }, [location.pathname, fetchNotifications]);

  const refreshNotifications = useCallback(async () => {
    if (!officeId) return;

    if (syncPromiseRef.current?.officeId === officeId) {
      return syncPromiseRef.current.promise;
    }

    setRefreshing(true);
    setError(null);

    const promise = (async () => {
      try {
        const [
          { syncNotifications },
          { loadCasesForNotificationSync },
        ] = await Promise.all([
          import("../utils/syncNotifications"),
          import("../services/notificationCases"),
        ]);

        const [tasksSnap, judgmentsSnap] = await Promise.all([
          getDocs(query(collection(db, "adminTasks"), where("officeId", "==", officeId))),
          getDocs(query(
            collection(db, "judgments"),
            where("officeId", "==", officeId),
            where("needsFollowUp", "==", true)
          )),
        ]);

        if (officeIdRef.current !== officeId) return;

        const mapDocuments = (snapshot) => snapshot.docs.map((documentSnapshot) => ({
          ...documentSnapshot.data(),
          id: documentSnapshot.id,
        }));

        const adminTasks = mapDocuments(tasksSnap);
        const judgments = mapDocuments(judgmentsSnap);
        const { cases } = await loadCasesForNotificationSync(
          officeId,
          adminTasks,
          judgments
        );

        if (officeIdRef.current !== officeId) return;

        await syncNotifications(cases, adminTasks, judgments, officeId);

        lastFetchRef.current = 0;
        await fetchNotifications(true);
      } catch (refreshError) {
        console.error("Error refreshing notifications:", refreshError);
        setError("حدث خطأ أثناء تحديث الإشعارات");
        throw refreshError;
      }
    })();

    syncPromiseRef.current = { officeId, promise };

    try {
      await promise;
    } finally {
      if (syncPromiseRef.current?.promise === promise) {
        syncPromiseRef.current = null;
      }
      if (officeIdRef.current === officeId) {
        setRefreshing(false);
      }
    }
  }, [officeId, fetchNotifications]);

  const unreadCount = useMemo(() => {
    if (!currentUserId) return 0;
    return notifications.filter((notification) => {
      const readBy = notification.isReadBy || {};
      return !readBy[currentUserId];
    }).length;
  }, [notifications, currentUserId]);

  const countsByType = useMemo(() => {
    const counts = { late: 0, admin_task: 0, judgment: 0, total: 0 };
    notifications.forEach((notification) => {
      counts.total += 1;
      if (counts[notification.type] !== undefined) {
        counts[notification.type] += 1;
      }
    });
    return counts;
  }, [notifications]);

  const markAsRead = useCallback(async (id) => {
    if (!currentUserId || !id) return;

    try {
      await updateDoc(doc(db, "notifications", id), {
        [`isReadBy.${currentUserId}`]: true,
      });
      setNotifications((previous) => previous.map((notification) => (
        notification.id === id
          ? {
              ...notification,
              isReadBy: {
                ...(notification.isReadBy || {}),
                [currentUserId]: true,
              },
            }
          : notification
      )));
    } catch (readError) {
      console.error("Error marking notification as read:", readError);
    }
  }, [currentUserId]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;

    const unread = notifications.filter(
      (notification) => !(notification.isReadBy || {})[currentUserId]
    );
    if (!unread.length) return;

    try {
      for (let index = 0; index < unread.length; index += MAX_BATCH_SIZE) {
        const batch = writeBatch(db);
        unread.slice(index, index + MAX_BATCH_SIZE).forEach((notification) => {
          batch.update(doc(db, "notifications", notification.id), {
            [`isReadBy.${currentUserId}`]: true,
          });
        });
        await batch.commit();
      }

      setNotifications((previous) => previous.map((notification) => ({
        ...notification,
        isReadBy: {
          ...(notification.isReadBy || {}),
          [currentUserId]: true,
        },
      })));
    } catch (readError) {
      console.error("Error marking all notifications as read:", readError);
      throw readError;
    }
  }, [notifications, currentUserId]);

  const removeNotification = useCallback((id) => {
    setNotifications((previous) => previous.filter(
      (notification) => notification.id !== id
    ));
  }, []);

  const value = useMemo(() => ({
    notifications,
    loading,
    refreshing,
    error,
    count: unreadCount,
    hasNotifications: unreadCount > 0,
    unreadCount,
    totalCount: notifications.length,
    countsByType,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
    fetchNotifications,
    notifSettings,
  }), [
    notifications,
    loading,
    refreshing,
    error,
    unreadCount,
    countsByType,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
    fetchNotifications,
    notifSettings,
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return context;
}