import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { generateNotifications } from "../utils/generateNotifications";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const { userData } = useAuth();

  // 1. جلب الموكلين لإنشاء خريطة (Map) للأسماء
  useEffect(() => {
    if (!userData?.officeId) return;
    const fetchClients = async () => {
      const q = query(collection(db, "clientProfiles"), where("officeId", "==", userData.officeId));
      const snap = await getDocs(q);
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setClientsMap(map);
    };
    fetchClients();
  }, [userData]);

  // 2. جلب القضايا وتوليد التنبيهات
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "cases"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const cases = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const generated = generateNotifications(cases);
      setNotifications(generated);
    });

    return () => unsub();
  }, [userData]);

  // دالة البحث عن اسم الموكل من الخريطة
  const getClientDisplay = (clientItem) => {
    if (!clientItem) return "موكل";
    // إذا كان الموكل معرفاً (String) أو كائناً يحتوي على id
    const id = typeof clientItem === "object" ? clientItem.id : clientItem;
    return clientsMap[id]?.fullName || clientsMap[id]?.name || "موكل";
  };

  const getColor = (type) => (type === "late" ? "#dc2626" : type === "today" ? "#2563eb" : "#f59e0b");
  const getBg = (type) => (type === "late" ? "#fee2e2" : type === "today" ? "#dbeafe" : "#fef3c7");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>🔔 تنبيهات المكتب اللحظية</h2>
      </div>

      {notifications.length === 0 ? (
        <div style={styles.empty}>لا توجد تنبيهات حالياً في أجندة المكتب.</div>
      ) : (
        <div style={styles.list}>
          {notifications.map((n, index) => (
            <Link
              key={index}
              to={`/case/${n.caseId}`}
              style={{
                ...styles.card,
                background: getBg(n.type),
                borderRight: `6px solid ${getColor(n.type)}`,
              }}
            >
              <div style={styles.content}>
                <div style={styles.message}>
                  {n.type === "late" && "🚨 "}
                  {n.type === "today" && "📅 "}
                  {n.message}
                </div>
                
                <div style={styles.meta}>
                  <span>⚖ رقم القضية: {n.caseNumber}</span>
                  {n.caseData?.court && <span style={styles.divider}> | 🏛 {n.caseData.court}</span>}
                  {/* هنا نستخدم الدالة التي تطابق الـ ID بالاسم */}
                  {n.caseData?.clients && n.caseData.clients.length > 0 && (
                    <span style={styles.divider}> | 👤 {getClientDisplay(n.caseData.clients[0])}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
  content: { display: "flex", flexDirection: "column", gap: "4px" },
  message: { fontWeight: "bold", fontSize: 15 },
  meta: { fontSize: 12, color: "#64748b" },
  divider: { marginRight: "8px" },
  empty: { padding: 40, textAlign: "center", background: "#fff", borderRadius: 10, color: "#6b7280" },
};