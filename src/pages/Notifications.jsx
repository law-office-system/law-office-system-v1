import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const { userData } = useAuth();

  useEffect(() => {
    if (!userData?.officeId) return;

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

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), {
      isRead: true,
    });
  };

  // 🟢 NEW: فلترة الإشعارات حسب صلاحيتها
  const isValidNotification = (n) => {
    const now = new Date();
    const created = n.createdAt?.toDate?.() || new Date(n.createdAt);

    if (!created) return true;

    // 🔴 late: ينتهي إذا تم إضافة جلسة جديدة أو مر وقت طويل بدون متابعة
    if (n.type === "late") {
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      return diffDays < 2; // بعد يومين يختفي
    }

    // 🟡 today: ينتهي بعد نهاية اليوم
    if (n.type === "today") {
      return created.toDateString() === now.toDateString();
    }

    // 🟠 soon: ينتهي بعد 24 ساعة
    if (n.type === "soon") {
      const diffHours = (now - created) / (1000 * 60 * 60);
      return diffHours < 24;
    }

    return true;
  };

  const filteredNotifications = notifications.filter(isValidNotification);

  return (
    <div style={{ padding: 20, direction: "rtl" }}>
      <h2>🔔 الإشعارات</h2>

      {filteredNotifications.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
          لا توجد إشعارات حالياً
        </div>
      ) : (
        filteredNotifications.map((n) => (
          <Link
            key={n.id}
            to={`/case/${n.caseId}`}
            onClick={() => markAsRead(n.id)}
            style={{
              display: "block",
              padding: 15,
              marginBottom: 10,
              background: n.isRead ? "#fff" : "#fef3c7",
              borderRight: "5px solid #dc2626",
              textDecoration: "none",
              color: "#111",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: "bold" }}>{n.message}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              ⚖ {n.caseNumber}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}