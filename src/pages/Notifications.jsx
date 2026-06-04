import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const { userData } = useAuth();

  // ================= LOAD NOTIFICATIONS (MULTI-TENANT) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "notifications"),
      where("officeId", "==", userData.officeId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, [userData]);

  // ================= TYPE COLOR =================
  const getColor = (type) => {
    if (type === "late") return "#dc2626";
    if (type === "today") return "#2563eb";
    return "#f59e0b";
  };

  const getBg = (type) => {
    if (type === "late") return "#fee2e2";
    if (type === "today") return "#dbeafe";
    return "#fef3c7";
  };

  return (
    <div style={styles.page}>

      <div style={styles.header}>
        <h2>🔔 التنبيهات</h2>
      </div>

      {notifications.length === 0 ? (
        <div style={styles.empty}>
          لا توجد تنبيهات حالياً
        </div>
      ) : (
        <div style={styles.list}>
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={`/case/${n.caseId}`}
              style={{
                ...styles.card,
                background: getBg(n.type),
                borderRight: `5px solid ${getColor(n.type)}`,
              }}
            >
              <div style={styles.message}>
                {n.message}
              </div>

              <div style={styles.meta}>
                ⚖ رقم القضية: {n.caseNumber || "-"}
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: 20,
    direction: "rtl",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  header: {
    marginBottom: 15,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  card: {
    display: "block",
    padding: 15,
    borderRadius: 10,
    textDecoration: "none",
    color: "#1f2937",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
  },

  message: {
    fontWeight: "600",
    marginBottom: 5,
  },

  meta: {
    fontSize: 12,
    opacity: 0.7,
  },

  empty: {
    padding: 20,
    textAlign: "center",
    background: "#fff",
    borderRadius: 10,
  },
};