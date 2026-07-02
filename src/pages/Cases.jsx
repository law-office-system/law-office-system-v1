import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parseDate } from "../utils/date";
import { syncNotifications } from "../utils/syncNotifications";
import Card from "../components/ui/Card";

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courtFilter, setCourtFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [isMobile, setIsMobile] = useState(false);

  const { userData } = useAuth();
  const navigate = useNavigate();
  const hasSynced = useRef(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ================= RESPONSIVE DETECTION ================= */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= LOAD CASES (MULTI-TENANT) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const fetchCases = async () => {
      try {
        const q = query(
          collection(db, "cases"),
          where("officeId", "==", userData.officeId)
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setCases(data);

        // 🔥 منع تكرار sync
        if (!hasSynced.current) {
          hasSynced.current = true;
          await syncNotifications(data, userData.officeId);
        }
      } catch (error) {
        console.error("Error loading cases:", error);
      }
    };

    fetchCases();
  }, [userData]);

  /* ================= LOAD CLIENTS (MULTI-TENANT FIX) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const loadClients = async () => {
      try {
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
        console.error("Error loading clients:", error);
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

  /* ================= دالة استخراج وتنسيق أقرب جلسة مستقبلية فقط ================= */
  const getUpcomingSessionString = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return "";

    const upcomingSessions = sessions
      .map(s => parseDate(s.nextSessionDate || s.date))
      .filter(dateObj => dateObj && dateObj >= today);

    if (upcomingSessions.length === 0) return "";

    upcomingSessions.sort((a, b) => a - b);
    const nextDate = upcomingSessions[0];

    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
    const dd = String(nextDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  /* ================= FILTER & SEARCH PROCESSING ================= */
  const filtered = cases.filter((c) => {
    const text = search.toLowerCase().trim();

    const caseNumber = `${c.caseYear || ""}/${c.caseSerial || c.caseNumber || ""}`.toLowerCase();
    const courtName = (c.court || "").toLowerCase();
    const caseTypeStr = (c.caseType || "").toLowerCase();

    const clientNamesStr = (c.clients || [])
      .map((item) => getClientName(item))
      .join(" ")
      .toLowerCase();

    const opponentNamesStr = (c.opponents || [])
      .map((x) => (typeof x === "object" ? `${x.name || ""} ${x.address || ""}` : x))
      .join(" ")
      .toLowerCase();

    const upcomingSessionDateStr = getUpcomingSessionString(c.sessions);

    const searchMatch =
      caseNumber.includes(text) ||
      clientNamesStr.includes(text) ||
      opponentNamesStr.includes(text) ||
      courtName.includes(text) ||
      caseTypeStr.includes(text) ||
      upcomingSessionDateStr.includes(text);

    const statusMatch =
      statusFilter === "ALL" || c.status === statusFilter;

    const courtMatch =
      courtFilter === "ALL" || c.court === courtFilter;

    const typeMatch =
      typeFilter === "ALL" || c.caseType === typeFilter;

    return searchMatch && statusMatch && courtMatch && typeMatch;
  });

  const courts = [...new Set(cases.map((c) => c.court).filter(Boolean))];
  const types = [...new Set(cases.map((c) => c.caseType).filter(Boolean))];

  return (
    <div style={{ ...styles.page, direction: "rtl" }}>

      {/* HEADER & CONTROLS */}
      <div style={styles.card}>
        <h1 style={{ margin: "0 0 10px 0", fontSize: "22px", color: "#1e3a8a" }}>📊 أرشيف وجدول كافة القضايا</h1>

        <input
          placeholder="ابحث برقم القضية، الموكل، الخصم، المحكمة، أو تاريخ الجلسة القادمة (YYYY-MM-DD)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        <div style={styles.filters}>
          <select onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="ALL">كل الحالات القانونية</option>
            <option value="ACTIVE">قضايا نشطة / متداولة</option>
            <option value="EXECUTION">قضايا قيد التنفيذ</option>
            <option value="CLOSED">قضايا منتهية / مؤرشفة</option>
          </select>

          <select onChange={(e) => setCourtFilter(e.target.value)} style={styles.select}>
            <option value="ALL">كل المحاكم المختصة</option>
            {courts.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select onChange={(e) => setTypeFilter(e.target.value)} style={styles.select}>
            <option value="ALL">كل أنواع الدعاوى</option>
            {types.map((t, i) => (
              <option key={i} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= MOBILE VIEW ================= */}
      {isMobile ? (
        <div style={styles.grid}>
          {filtered.length === 0 ? (
            <p style={styles.noData}>لا توجد دعاوى مطابقة لخيارات البحث الفعلي.</p>
          ) : (
            filtered.map((c) => {
              const sessionStr = getUpcomingSessionString(c.sessions);
              return (
                <Card key={c.id}>
                  <div style={{ marginBottom: "8px" }}>
                    <Link to={`/case/${c.id}`} style={styles.link}>
                      ⚖️ ق رقم: {c.caseSerial || c.caseNumber || "بدون رقم"} / {c.caseYear || "-"}
                    </Link>
                  </div>

                  <p style={styles.mobileText}>📌 <strong>النوع:</strong> {c.caseType || "-"}</p>
                  <p style={styles.mobileText}>🏛️ <strong>المحكمة:</strong> {c.court || "-"}</p>
                  <p style={styles.mobileText}>💼 <strong>الحالة:</strong> {c.status === "ACTIVE" ? "نشطة" : c.status === "EXECUTION" ? "تنفيذ" : "منتهية"}</p>

                  <p style={styles.mobileText}>
                    👤 <strong>الموكلين:</strong>{" "}
                    {(c.clients || []).map((item) => getClientName(item)).join(", ") || "-"}
                  </p>

                  <p style={styles.mobileText}>
                    ⚔️ <strong>الخصوم:</strong>{" "}
                    {(c.opponents || []).map((x) => typeof x === "object" ? x.name : x).join(", ") || "-"}
                  </p>

                  {sessionStr && (
                    <p style={{ ...styles.mobileText, color: "#b45309", fontWeight: "600" }}>
                      📅 <strong>رول الجلسة:</strong> <span style={{ background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>{sessionStr}</span>
                    </p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* ================= DESKTOP VIEW ================= */
        <div style={styles.cardTable}>
          {filtered.length === 0 ? (
            <p style={styles.noData}>لا توجد دعاوى مطابقة لخيارات البحث الفعلي.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>رقم السجل القضائي</th>
                  <th style={styles.th}>نوع الدعوى</th>
                  <th style={styles.th}>المحكمة المقيدة بها</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>الموكلين والصفة</th>
                  <th style={styles.th}>الخصوم المقابلين</th>
                  <th style={styles.th}>ميعاد أقرب جلسة</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c) => {
                  const sessionStr = getUpcomingSessionString(c.sessions);
                  return (
                    <tr key={c.id} onClick={() => navigate(`/case/${c.id}`)} style={styles.tr}>
                      <td style={styles.td}>
                        <Link to={`/case/${c.id}`} style={styles.link}>
                          {c.caseSerial || c.caseNumber || "بدون رقم"} / {c.caseYear || "-"}
                        </Link>
                      </td>

                      <td style={styles.td}>{c.caseType || "-"}</td>
                      <td style={styles.td}>{c.court || "-"}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                          background: c.status === "CLOSED" ? "#ffe0e0" : c.status === "EXECUTION" ? "#fff7e0" : "#e0f7e9",
                          color: c.status === "CLOSED" ? "#dc2626" : c.status === "EXECUTION" ? "#f59e0b" : "#16a34a"
                        }}>
                          {c.status === "ACTIVE" ? "نشطة" : c.status === "EXECUTION" ? "تنفيذ" : "منتهية"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {(c.clients || []).map((item, i) => (
                          <span key={i} style={styles.tag}>
                            {getClientName(item)}
                          </span>
                        ))}
                      </td>

                      <td style={styles.td}>
                        {(c.opponents || []).map((x, i) => (
                          <span key={i} style={styles.tagDanger}>
                            {typeof x === "object" ? x.name : x}
                          </span>
                        ))}
                      </td>

                      <td style={{ ...styles.td, fontFamily: "monospace", fontWeight: "600", color: "#b45309" }}>
                        {sessionStr ? (
                          <span style={{ background: "#fef3c7", padding: "3px 6px", borderRadius: "4px" }}>{sessionStr}</span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontWeight: "normal" }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= MODERNIZED COMPREHENSIVE STYLES ================= */
const styles = {
  page: { padding: "16px", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  card: { background: "#fff", padding: "16px", borderRadius: "12px", marginBottom: "12px", borderRight: "5px solid #1e3a8a", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardTable: { background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflowX: "auto" },
  search: { width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", outline: "none", fontSize: "14px" },
  filters: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" },
  select: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", color: "#334155", fontSize: "13px", fontWeight: "500" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "right" },
  thRow: { borderBottom: "2px solid #e2e8f0" },
  th: { padding: "12px 10px", fontSize: "14px", color: "#475569", fontWeight: "600" },
  tr: { borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.2s" },
  td: { padding: "12px 10px", fontSize: "14px", color: "#334155" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
  link: { fontWeight: "bold", textDecoration: "none", color: "#2563eb" },
  mobileText: { margin: "6px 0", fontSize: "13px", color: "#334155" },
  noData: { textAlign: "center", color: "#64748b", padding: "20px", fontSize: "14px", margin: 0 },
  tag: { background: "#eaf2ff", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", marginRight: "4px", color: "#1e40af", fontWeight: "500", display: "inline-block", marginBottom: "3px" },
  tagDanger: { background: "#ffe6e6", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", marginRight: "4px", color: "#b91c1c", fontWeight: "500", display: "inline-block", marginBottom: "3px" },
};