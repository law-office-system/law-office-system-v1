import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, documentId, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { parseDate } from "../utils/date";
import { CASE_STATUS } from "../constants/caseStatus";
import { useAuth } from "../context/AuthContext";

import Card from "../components/ui/Card";

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [clientNamesCache, setClientNamesCache] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const navigate = useNavigate();
  const { userData } = useAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ================= SEARCH DEBOUNCE ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.toLowerCase().trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  /* ================= FIRESTORE (LOAD CASES) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "cases"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCases(data);
    });

    return () => unsub();
  }, [userData]);

  /* ================= FETCH CLIENT NAMES DYNAMICALLY ================= */
  useEffect(() => {
    const fetchClientNames = async () => {
      const allClientIds = new Set();
      cases.forEach((c) => {
        if (Array.isArray(c.clients)) {
          c.clients.forEach((clientItem) => {
            const idStr = typeof clientItem === "object" ? clientItem.id : clientItem;
            if (idStr) allClientIds.add(idStr);
          });
        }
      });

      const idsArray = Array.from(allClientIds).filter(Boolean);
      if (idsArray.length === 0) return;

      const newCache = { ...clientNamesCache };
      const chunks = [];
      for (let i = 0; i < idsArray.length; i += 30) {
        chunks.push(idsArray.slice(i, i + 30));
      }

      try {
        for (const chunk of chunks) {
          const q = query(collection(db, "clientProfiles"), where(documentId(), "in", chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            newCache[doc.id] = doc.data().fullName || "موكل بدون اسم";
          });
        }
        setClientNamesCache(newCache);
      } catch (error) {
        console.error("Error fetching client profiles:", error);
      }
    };

    if (cases.length > 0) {
      fetchClientNames();
    }
  }, [cases]);

  /* ================= NORMALIZE STATUS ================= */
  const normalizeStatus = (status) => {
    const s = (status || "").toString().trim().toLowerCase();
    if (["جارية", "نشطة", "active"].includes(s)) return CASE_STATUS.ACTIVE;
    if (["تنفيذ", "execution"].includes(s)) return CASE_STATUS.EXECUTION;
    if (["منتهية", "closed"].includes(s)) return CASE_STATUS.CLOSED;
    return CASE_STATUS.ACTIVE;
  };

  /* ================= STATUS BADGE ================= */
  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);
    const map = {
      ACTIVE: { label: "نشطة", bg: "#e0f7e9", color: "#16a34a" },
      EXECUTION: { label: "تنفيذ", bg: "#fff7e0", color: "#f59e0b" },
      CLOSED: { label: "منتهية", bg: "#ffe0e0", color: "#dc2626" },
    };
    const style = map[s] || map.ACTIVE;

    return (
      <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: style.bg, color: style.color, display: "inline-block" }}>
        {style.label}
      </span>
    );
  };

  /* ================= استخراج أقرب جلسة مستقبلية ================= */
  const getUpcomingSessionDate = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;

    const upcomingSessions = sessions
      .map(s => parseDate(s.nextSessionDate || s.date))
      .filter(dateObj => dateObj && dateObj >= today);

    if (upcomingSessions.length === 0) return null;

    upcomingSessions.sort((a, b) => a - b);
    return upcomingSessions[0];
  };

  /* ================= FILTER & ADVANCED SEARCH (TEXT & DATE) ================= */
  const statusFilteredCases = cases.filter((c) => {
    const status = normalizeStatus(c.status);
    return statusFilter === "ALL" || status === statusFilter;
  });

  const filteredCases = statusFilteredCases.filter((c) => {
    const text = debouncedSearch;
    if (!text) return true;

    // فحص مطابقة التاريخ المبحوث عنه مع أي من مواعيد الجلسات في القضية
    let dateMatch = false;
    if (Array.isArray(c.sessions)) {
      dateMatch = c.sessions.some((s) => {
        const sDateStr = s.nextSessionDate || s.date || "";
        return sDateStr.toLowerCase().includes(text);
      });
    }

    const caseNum = (c.caseNumber || c.caseSerial || "").toLowerCase();
    const caseYear = (c.caseYear || "").toString();
    const caseType = (c.caseType || "").toLowerCase();
    const court = (c.court || "").toLowerCase();

    let clientMatch = false;
    if (typeof c.client === "string") {
      clientMatch = c.client.toLowerCase().includes(text);
    }
    if (Array.isArray(c.clients)) {
      clientMatch = c.clients.some(clientItem => {
        const idStr = typeof clientItem === "object" ? clientItem.id : clientItem;
        const cachedName = clientNamesCache[idStr] || "";
        return cachedName.toLowerCase().includes(text);
      });
    }

    let opponentMatch = false;
    if (typeof c.opponent === "string") {
      opponentMatch = c.opponent.toLowerCase().includes(text);
    }
    if (Array.isArray(c.opponents)) {
      opponentMatch = c.opponents.some(o => 
        (o?.name || "").toLowerCase().includes(text) || (o?.address || "").toLowerCase().includes(text)
      );
    }

    return (
      caseNum.includes(text) ||
      caseYear.includes(text) ||
      caseType.includes(text) ||
      court.includes(text) ||
      clientMatch ||
      opponentMatch ||
      dateMatch
    );
  });

  /* ================= SORT BY UPCOMING SESSION DATE ================= */
  const sortedCases = [...filteredCases].sort((a, b) => {
    const aUpcoming = getUpcomingSessionDate(a.sessions);
    const bUpcoming = getUpcomingSessionDate(b.sessions);

    if (!aUpcoming) return 1;
    if (!bUpcoming) return -1;

    return aUpcoming - bUpcoming;
  });

  return (
    <div style={{ ...styles.page, direction: "rtl" }}>

      {/* HEADER */}
      <Card>
        <div style={styles.header}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#1e3a8a" }}>📊 لوحة التحكم والمتابعة</h1>
          <button style={styles.addBtn} onClick={() => navigate("/add-case")}>
            ➕ قضية جديدة
          </button>
        </div>
      </Card>

      {/* SEARCH INPUT */}
      <div style={{ position: "relative" }}>
        <input
          placeholder="ابحث برقم السجل، المحكمة، الموكل، أو بتاريخ الجلسة (مثال: 2026-06-10)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
        {search && (
          <button 
            onClick={() => setSearch("")} 
            style={{ position: "absolute", left: "12px", top: "35%", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
          >
            ❌
          </button>
        )}
      </div>

      {/* FILTER BUTTONS */}
      <div style={styles.filters}>
        <button onClick={() => setStatusFilter("ALL")} style={statusFilter === "ALL" ? styles.activeFilter : styles.filterBtn}>
          الكل ({cases.length})
        </button>
        <button onClick={() => setStatusFilter(CASE_STATUS.ACTIVE)} style={statusFilter === CASE_STATUS.ACTIVE ? styles.activeFilter : styles.filterBtn}>
          نشطة ({cases.filter(c => normalizeStatus(c.status) === CASE_STATUS.ACTIVE).length})
        </button>
        <button onClick={() => setStatusFilter(CASE_STATUS.EXECUTION)} style={statusFilter === CASE_STATUS.EXECUTION ? styles.activeFilter : styles.filterBtn}>
          قيد التنفيذ ({cases.filter(c => normalizeStatus(c.status) === CASE_STATUS.EXECUTION).length})
        </button>
        <button onClick={() => setStatusFilter(CASE_STATUS.CLOSED)} style={statusFilter === CASE_STATUS.CLOSED ? styles.activeFilter : styles.filterBtn}>
          منتهية/أرشيف ({cases.filter(c => normalizeStatus(c.status) === CASE_STATUS.CLOSED).length})
        </button>
      </div>

      {/* CASES GRID */}
      <div style={styles.grid}>
        {sortedCases.length === 0 ? (
          <p style={{ textAlign: "center", gridColumn: "1/-1", color: "#666", padding: 20 }}>لا توجد قضايا مطابقة لخيارات البحث أو التاريخ المكتوب.</p>
        ) : (
          sortedCases.map((c) => {
            const displayCaseNum = c.caseSerial || c.caseNumber || "بدون رقم";
            const upcomingSessionDate = getUpcomingSessionDate(c.sessions);

            let clientDisplayName = "-";
            if (typeof c.client === "string") {
              clientDisplayName = c.client;
            } else if (Array.isArray(c.clients) && c.clients.length > 0) {
              const firstClientId = typeof c.clients[0] === "object" ? c.clients[0].id : c.clients[0];
              clientDisplayName = clientNamesCache[firstClientId] || "جاري جلب الاسم...";
              if (c.clients.length > 1) {
                clientDisplayName += ` (+${c.clients.length - 1} آخرين)`;
              }
            }

            // 🌟 استخراج التاريخ بالتنسيق القياسي الموحد ليكون دليلاً للبحث (YYYY-MM-DD)
            let formattedSearchDate = "";
            if (upcomingSessionDate) {
              const yyyy = upcomingSessionDate.getFullYear();
              const mm = String(upcomingSessionDate.getMonth() + 1).padStart(2, "0");
              const dd = String(upcomingSessionDate.getDate()).padStart(2, "0");
              formattedSearchDate = `${yyyy}-${mm}-${dd}`;
            }

            return (
              <Card key={c.id}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "17px", color: "#1e293b" }}>
                  ⚖️ قضية رقم: {displayCaseNum} / {c.caseYear}
                </h3>

                <div style={{ marginBottom: "10px" }}>
                  {getStatusBadge(c.status)}
                </div>

                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  👤 <strong>الموكل:</strong> <span style={{ color: "#1e3a8a", fontWeight: "600" }}>{clientDisplayName}</span>
                </p>

                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  ⚔️ <strong>الخصم:</strong>{" "}
                  {typeof c.opponent === "string" ? c.opponent : Array.isArray(c.opponents) && c.opponents.length > 0 ? c.opponents[0]?.name : "-"}
                </p>

                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  🏛️ <strong>المحكمة:</strong> {c.court || "-"}
                </p>

                {/* 🌟 تعديل العرض ليظهر التاريخ بصيغة القياس للبحث مباشرة */}
                <p style={{ margin: "4px 0", fontSize: "14px", color: upcomingSessionDate ? "#b45309" : "#64748b", fontWeight: "600" }}>
                  📅 <strong>الجلسة المقبلة:</strong>{" "}
                  {upcomingSessionDate ? (
                    <span style={{ background: "#fef3c7", padding: "3px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "13px", letterSpacing: "0.5px" }}>
                      {formattedSearchDate}
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8", fontWeight: "normal" }}>لا توجد جلسات مستقبلية مسجلة</span>
                  )}
                </p>

                <div style={styles.actions}>
                  <button style={styles.viewBtn} onClick={() => navigate(`/case/${c.id}`)}>
                    🔎 فتح الملف
                  </button>
                  <button style={styles.editBtn} onClick={() => navigate(`/edit/${c.id}`)}>
                    ✏️ تعديل
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: "14px", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  addBtn: { padding: "8px 14px", border: "none", borderRadius: "8px", background: "#2563eb", color: "white", cursor: "pointer", fontWeight: "600" },
  search: { width: "100%", padding: "11px", paddingLeft: "40px", margin: "12px 0", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" },
  filters: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" },
  filterBtn: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: "500", color: "#475569" },
  activeFilter: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "600" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
  actions: { display: "flex", gap: "8px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" },
  viewBtn: { flex: 1, padding: "8px", border: "none", borderRadius: "8px", background: "#2563eb", color: "white", cursor: "pointer", fontWeight: "600" },
  editBtn: { flex: 1, padding: "8px", border: "none", borderRadius: "8px", background: "#16a34a", color: "white", cursor: "pointer", fontWeight: "600" },
};