import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, documentId, getDocs, doc, getDoc } from "firebase/firestore";
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
  const [officeName, setOfficeName] = useState("");
  const [showToast, setShowToast] = useState(false); // حالة التنبيه المنبثق

  const navigate = useNavigate();
  const { userData } = useAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // جلب اسم المكتب
  useEffect(() => {
    const fetchOfficeName = async () => {
      if (userData?.officeId) {
        const snap = await getDoc(doc(db, "offices", userData.officeId));
        if (snap.exists()) setOfficeName(snap.data().name);
      }
    };
    fetchOfficeName();
  }, [userData]);

  // دالة تحديد الجلسات العاجلة
  const isUrgent = (upcomingDate) => {
    if (!upcomingDate) return false;
    return upcomingDate >= today && upcomingDate <= tomorrow;
  };

  // تفعيل التنبيه المنبثق عند تحميل القضايا
  useEffect(() => {
    const hasUrgentCases = cases.some(c => isUrgent(getUpcomingSessionDate(c.sessions)));
    if (hasUrgentCases) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [cases]);

  /* ... باقي الـ useEffects ... */
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.toLowerCase().trim()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!userData?.officeId) return;
    const q = query(collection(db, "cases"), where("officeId", "==", userData.officeId));
    const unsub = onSnapshot(q, (snapshot) => { setCases(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))); });
    return () => unsub();
  }, [userData]);

  useEffect(() => {
    if (cases.length === 0) return;
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
      for (let i = 0; i < idsArray.length; i += 30) {
        const chunk = idsArray.slice(i, i + 30);
        const q = query(collection(db, "clientProfiles"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((doc) => { newCache[doc.id] = doc.data().fullName || "موكل"; });
      }
      setClientNamesCache(newCache);
    };
    fetchClientNames();
  }, [cases]);

  /* ... (باقي الدوال كما هي) ... */
  const normalizeStatus = (status) => {
    const s = (status || "").toString().trim().toLowerCase();
    if (["جارية", "نشطة", "active"].includes(s)) return CASE_STATUS.ACTIVE;
    if (["تنفيذ", "execution"].includes(s)) return CASE_STATUS.EXECUTION;
    if (["منتهية", "closed"].includes(s)) return CASE_STATUS.CLOSED;
    return CASE_STATUS.ACTIVE;
  };

  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);
    const map = { ACTIVE: { label: "نشطة", bg: "#e0f7e9", color: "#16a34a" }, EXECUTION: { label: "تنفيذ", bg: "#fff7e0", color: "#f59e0b" }, CLOSED: { label: "منتهية", bg: "#ffe0e0", color: "#dc2626" } };
    const style = map[s] || map.ACTIVE;
    return <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: style.bg, color: style.color }}>{style.label}</span>;
  };

  const getUpcomingSessionDate = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;
    const dates = sessions.map(s => parseDate(s.nextSessionDate || s.date)).filter(d => d && d >= today);
    return dates.length > 0 ? dates.sort((a, b) => a - b)[0] : null;
  };

  const getPreviousSessionDate = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;
    const dates = sessions.map(s => parseDate(s.nextSessionDate || s.date)).filter(d => d && d < today);
    return dates.length > 0 ? dates.sort((a, b) => b - a)[0] : null;
  };

  const formatDateForDisplay = (dateObj) => dateObj ? dateObj.toISOString().split('T')[0] : "";

  const statusFilteredCases = cases.filter(c => statusFilter === "ALL" || normalizeStatus(c.status) === statusFilter);
  const sortedCases = statusFilteredCases.filter(c => {
    const text = debouncedSearch;
    if (!text) return true;
    const clientMatch = Array.isArray(c.clients) && c.clients.some(ci => (clientNamesCache[typeof ci === "object" ? ci.id : ci] || "").toLowerCase().includes(text));
    const sessionMatch = (c.sessions || []).some(s => (s.nextSessionDate || s.date || "").includes(text));
    return (c.caseNumber || "").toLowerCase().includes(text) || clientMatch || (c.court || "").toLowerCase().includes(text) || sessionMatch;
  }).sort((a, b) => (getUpcomingSessionDate(a.sessions) || new Date(9999,0,1)) - (getUpcomingSessionDate(b.sessions) || new Date(9999,0,1)));

  return (
    <div style={{ ...styles.page, direction: "rtl" }}>
      {/* التنبيه المنبثق */}
      {showToast && (
        <div style={styles.toast}>
          ⚖️ <strong>تنبيه:</strong> لديك جلسات عاجلة اليوم أو غداً! تحقق من البطاقات المحددة باللون الأحمر.
          <button onClick={() => setShowToast(false)} style={styles.closeToast}>✕</button>
        </div>
      )}

      <div style={styles.brandingHeader}>
        <div style={styles.logoContainer}>
           {userData?.logoUrl ? <img src={userData.logoUrl} alt="Logo" style={styles.logo} /> : <div style={styles.logoPlaceholder}>⚖️</div>}
        </div>
        <div>
          <h1 style={styles.title}>{officeName || "مكتب المحاماة"}</h1>
          <p style={styles.subtitle}>أهلاً بك يا {userData?.name || "زميلي"} | {today.toLocaleDateString("ar-EG")}</p>
        </div>
      </div>
      
      {/* ... باقي الواجهة ... */}
      <Card>
        <div style={styles.header}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#1e3a8a" }}>📊 لوحة التحكم والمتابعة</h1>
          <button style={styles.addBtn} onClick={() => navigate("/add-case")}>➕ قضية جديدة</button>
        </div>
      </Card>

      <input placeholder="ابحث برقم السجل، المحكمة، الموكل، أو التاريخ..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.search} />
      
      <div style={styles.filters}>
        <button onClick={() => setStatusFilter("ALL")} style={statusFilter === "ALL" ? styles.activeFilter : styles.filterBtn}>الكل</button>
        <button onClick={() => setStatusFilter(CASE_STATUS.ACTIVE)} style={statusFilter === CASE_STATUS.ACTIVE ? styles.activeFilter : styles.filterBtn}>نشطة</button>
        <button onClick={() => setStatusFilter(CASE_STATUS.EXECUTION)} style={statusFilter === CASE_STATUS.EXECUTION ? styles.activeFilter : styles.filterBtn}>تنفيذ</button>
        <button onClick={() => setStatusFilter(CASE_STATUS.CLOSED)} style={statusFilter === CASE_STATUS.CLOSED ? styles.activeFilter : styles.filterBtn}>منتهية</button>
      </div>

      <div style={styles.grid}>
        {sortedCases.map((c) => {
          const upcoming = getUpcomingSessionDate(c.sessions);
          const previous = getPreviousSessionDate(c.sessions);
          const urgent = isUrgent(upcoming);
          return (
            <Card key={c.id} style={{ borderRight: urgent ? "6px solid #ef4444" : "6px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "17px" }}>⚖️ ق رقم: {c.caseSerial || c.caseNumber || "-"} / {c.caseYear}</h3>
              {urgent && <div style={{ color: "#ef4444", fontWeight: "bold", fontSize: "12px", marginBottom: "8px" }}>⚠️ تنبيه: جلسة قريبة جداً!</div>}
              <div style={{ marginBottom: "10px" }}>{getStatusBadge(c.status)}</div>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>👤 <strong>الموكل:</strong> {Array.isArray(c.clients) ? (clientNamesCache[typeof c.clients[0] === "object" ? c.clients[0].id : c.clients[0]] || "...") : "-"}</p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>🏛️ <strong>المحكمة:</strong> {c.court || "-"}</p>
              <div style={{ marginTop: "10px", padding: "8px", background: "#f8fafc", borderRadius: "8px" }}>
                 <p style={{ margin: "2px 0", fontSize: "13px", color: urgent ? "#ef4444" : "#b45309" }}>📅 <strong>القادمة:</strong> {upcoming ? <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{formatDateForDisplay(upcoming)}</span> : "لا يوجد"}</p>
                 {previous && <p style={{ margin: "2px 0", fontSize: "13px", color: "#64748b" }}>⏮ <strong>السابقة:</strong> {formatDateForDisplay(previous)}</p>}
              </div>
              <div style={styles.actions}>
                <button style={styles.viewBtn} onClick={() => navigate(`/case/${c.id}`)}>🔎 فتح الملف</button>
                <button style={styles.editBtn} onClick={() => navigate(`/edit/${c.id}`)}>✏️ تعديل</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "14px", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  brandingHeader: { display: "flex", alignItems: "center", gap: "20px", background: "#fff", padding: "20px", borderRadius: "16px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderRight: "6px solid #1e3a8a" },
  logoContainer: { width: "70px", height: "70px", borderRadius: "12px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" },
  logo: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" },
  logoPlaceholder: { fontSize: "30px" },
  title: { margin: 0, fontSize: "22px", color: "#1e3a8a" },
  subtitle: { margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  addBtn: { padding: "8px 14px", border: "none", borderRadius: "8px", background: "#2563eb", color: "white", cursor: "pointer", fontWeight: "600" },
  search: { width: "100%", padding: "11px", margin: "12px 0", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" },
  filters: { display: "flex", gap: "8px", marginBottom: "12px" },
  filterBtn: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" },
  activeFilter: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
  actions: { display: "flex", gap: "8px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" },
  viewBtn: { flex: 1, padding: "8px", border: "none", borderRadius: "8px", background: "#2563eb", color: "white", cursor: "pointer" },
  editBtn: { flex: 1, padding: "8px", border: "none", borderRadius: "8px", background: "#16a34a", color: "white", cursor: "pointer" },
  toast: { position: "fixed", bottom: "20px", right: "20px", background: "#ef4444", color: "#fff", padding: "15px 20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, display: "flex", alignItems: "center", gap: "10px" },
  closeToast: { background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }
};