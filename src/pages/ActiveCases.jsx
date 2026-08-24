import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { parseDate } from "../utils/date";

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { userData } = useAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ================= LOAD CASES (MULTI-TENANT) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const fetchCases = async () => {
      try {
        const q = query(
          collection(db, "cases"),
          where("officeId", "==", userData.officeId)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCases(data);
      } catch (error) {
        console.error("Error loading cases:", error);
      }
    };

    fetchCases();
  }, [userData]);

  /* ================= LOAD CLIENTS (🔒 FIXED MULTI-TENANT SECURITY) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const loadClients = async () => {
      try {
        // تم إضافة الفلترة بـ officeId لمنع تسريب بيانات العملاء بين المكاتب المختلفة
        const q = query(
          collection(db, "clientProfiles"),
          where("officeId", "==", userData.officeId)
        );

        const snap = await getDocs(q);
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });

        setClientsMap(map);
      } catch (error) {
        console.error("Error loading client profiles safely:", error);
      }
    };

    loadClients();
  }, [userData]);

  /* =================🛡️ دالة مستقرة تقرأ المعرف النصي أو كائن الموكل المطور ================= */
  const getClientName = (clientItem) => {
    if (!clientItem) return "موكل غير معروف";
    const id = typeof clientItem === "object" ? clientItem.id : clientItem;
    return clientsMap[id]?.fullName || clientsMap[id]?.name || "موكل غير معروف";
  };

  const getOpponentName = (o) => (typeof o === "object" ? o.name : o);

  /* ================= دالة استخراج وتنسيق أقرب جلسة مستقبلية فقط ================= */
  const getUpcomingSessionString = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return "";

    const upcomingSessions = sessions
      .map((s) => parseDate(s.nextSessionDate || s.date))
      .filter((dateObj) => dateObj && dateObj >= today);

    if (upcomingSessions.length === 0) return "";

    upcomingSessions.sort((a, b) => a - b);
    const nextDate = upcomingSessions[0];

    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
    const dd = String(nextDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  /* ================= FILTER ================= */
  const activeCases = cases.filter((c) => {
    // 🟢 القضايا النشطة فقط — مستبعدة التنفيذ والمغلقة
    const isActive = c.status === "ACTIVE" || c.status === "نشطة" || c.status === "جارية";
    const isExecution = c.status === "EXECUTION" || c.status === "تنفيذ" || c.status === "execution" || c.currentLevel === "execution";
    if (!isActive || isExecution) return false;

    const text = search.toLowerCase().trim();

    const caseNumber = `${c.caseYear || ""}/${c.caseSerial || c.caseNumber || ""}`.toLowerCase();
    const courtName = (c.court || "").toLowerCase();
    const caseTypeStr = (c.caseType || "").toLowerCase();

    const clientNames = (c.clients || [])
      .map(getClientName)
      .join(" ")
      .toLowerCase();

    const opponentNames = (c.opponents || [])
      .map((x) => (typeof x === "object" ? `${x.name || ""} ${x.address || ""}` : x))
      .join(" ")
      .toLowerCase();

    // استخراج الجلسة القادمة لمطابقتها في عملية البحث
    const upcomingSessionDateStr = getUpcomingSessionString(c.sessions);

    return (
      // دعم البحث بالتاريخ هنا أيضاً
      (caseNumber.includes(text) ||
      clientNames.includes(text) ||
      opponentNames.includes(text) ||
      caseTypeStr.includes(text) ||
      courtName.includes(text) || upcomingSessionDateStr.includes(text))
    );
  });

  return (
    <div style={{ ...styles.page, direction: "rtl" }}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: "22px", color: "#16a34a" }}>🟢 جدول القضايا المتداولة والنشطة</h1>

        <Button variant="primary" onClick={() => navigate("/add-case")} style={styles.addBtn}>
          ➕ إضافة قضية جديدة
        </Button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="ابحث برقم السجل، المحكمة، اسم الموكل، الخصم، أو تاريخ الجلسة القادمة (YYYY-MM-DD)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* COUNT */}
      <p style={styles.countText}>📊 عدد القضايا النشطة حالياً: <strong>{activeCases.length}</strong> دعوى</p>

      {/* LIST */}
      <div style={styles.grid}>
        {activeCases.length === 0 ? (
          <p style={styles.noData}>لا توجد قضايا نشطة مطابقة للبحث حالياً.</p>
        ) : (
          activeCases.map((c) => {
            const sessionStr = getUpcomingSessionString(c.sessions);
            return (
              <div key={c.id} style={styles.card} onClick={() => navigate(`/case/${c.id}`)}>
                <h3 style={styles.cardTitle}>⚖️ {c.caseSerial || c.caseNumber || "بدون رقم"} / {c.caseYear || "-"}</h3>

                <p style={styles.textLine}>📌 <strong>النوع:</strong> {c.caseType || "-"}</p>
                <p style={styles.textLine}>🏛️ <strong>المحكمة:</strong> {c.court || "-"}</p>

                <p style={styles.textLine}>
                  👤 <strong>الموكلين:</strong>{" "}
                  {(c.clients || []).length > 0
                    ? c.clients.map(getClientName).join(" , ")
                    : "-"}
                </p>

                <p style={styles.textLine}>
                  ⚔️ <strong>الخصوم:</strong>{" "}
                  {(c.opponents || []).length > 0
                    ? c.opponents.map(getOpponentName).join(" , ")
                    : "-"}
                </p>

                {/* عرض التاريخ الاسترشادي المنضبط */}
                {sessionStr && (
                  <p style={{ ...styles.textLine, color: "#b45309", fontWeight: "600", marginTop: "10px" }}>
                    📅 <strong>الجلسة المقبلة:</strong>{" "}
                    <span style={styles.dateBadge}>
                      {sessionStr}
                    </span>
                  </p>
                )}

                {/* ACTIONS */}
                <div style={styles.actions}>
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/case/${c.id}`);
                    }}
                    style={{ flex: 1 }}
                  >
                    🔎 فتح الملف
                  </Button>

                  <Button
                    variant="success"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/edit/${c.id}`);
                    }}
                    style={{ flex: 1, background: "#16a34a", color: "#fff" }}
                  >
                    ✏️ تعديل
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ================= COMPREHENSIVE STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  addBtn: { fontWeight: "600", padding: "8px 14px" },
  search: { width: "100%", padding: 11, marginBottom: 15, borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", outline: "none", fontSize: "14px" },
  countText: { fontSize: "14px", color: "#475569", marginBottom: "15px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 15 },
  card: { background: "#fff", padding: 16, borderRadius: 12, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderRight: "5px solid #16a34a", transition: "transform 0.2s" },
  cardTitle: { margin: "0 0 10px 0", fontSize: "16px", color: "#1e293b" },
  textLine: { margin: "5px 0", fontSize: "13px", color: "#334155" },
  dateBadge: { background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace", fontSize: "13px", display: "inline-block" },
  actions: { display: "flex", gap: "8px", marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: "10px" },
  noData: { textAlign: "center", color: "#64748b", padding: "20px", gridColumn: "1/-1" }
};