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
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const { userData } = useAuth();

  // ================= تحميل التنبيهات مع فلترة المكاتب =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "notifications"),
      where("officeId", "==", userData.officeId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsub();
  }, [userData]);

  // ================= وظيفة "تحديد كمقروء" =================
  const markAsRead = async (id, e) => {
    e.preventDefault(); // لمنع الانتقال للرابط عند الضغط على زر
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const getColor = (type) => (type === "late" ? "#dc2626" : type === "today" ? "#2563eb" : "#f59e0b");
  const getBg = (type) => (type === "late" ? "#fee2e2" : type === "today" ? "#dbeafe" : "#fef3c7");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>🔔 تنبيهات المكتب</h2>
      </div>

      {notifications.length === 0 ? (
        <div style={styles.empty}>لا توجد تنبيهات حالياً في أجندة المكتب.</div>
      ) : (
        <div style={styles.list}>
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={`/case/${n.caseId}`}
              style={{
                ...styles.card,
                background: n.read ? "#f9fafb" : getBg(n.type),
                borderRight: `6px solid ${getColor(n.type)}`,
              }}
            >
              <div style={styles.content}>
                <div style={styles.message}>
                  {n.type === "late" && "🚨 "}
                  {n.type === "today" && "📅 "}
                  {n.message}
                </div>
                <div style={styles.meta}>⚖ رقم القضية: {n.caseNumber || "-"}</div>
              </div>
              
              {!n.read && (
                <button onClick={(e) => markAsRead(n.id, e)} style={styles.readBtn}>
                  ✓
                </button>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh" },
  header: { marginBottom: 20 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    textDecoration: "none",
    color: "#1f2937",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  content: { display: "flex", flexDirection: "column" },
  message: { fontWeight: "bold", fontSize: 15 },
  meta: { fontSize: 12, opacity: 0.6, marginTop: 4 },
  empty: { padding: 40, textAlign: "center", background: "#fff", borderRadius: 10, color: "#6b7280" },
  readBtn: {
    background: "transparent",
    border: "1px solid #94a3b8",
    borderRadius: "50%",
    width: 25,
    height: 25,
    cursor: "pointer",
    fontSize: 12,
  }
};