import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function Archive() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");

  const { userData } = useAuth();

  /* ================= LOAD CASES (MULTI-TENANT REALTIME) ================= */
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

  /* ================= LOAD CLIENTS (MULTI-TENANT CONTROL) ================= */
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
        console.error("Error loading archived client profiles:", error);
      }
    };

    loadClients();
  }, [userData]);

  /* =================🛡️ دالة مستقرة تقرأ المعرف النصي القديم أو الكائن المطور ================= */
  const getClientName = (clientItem) => {
    if (!clientItem) return "موكل غير معروف";
    // التحقق مما إذا كان العنصر كائناً مطوراً أو معرفاً نصياً قديماً
    const id = typeof clientItem === "object" ? clientItem.id : clientItem;
    return clientsMap[id]?.fullName || clientsMap[id]?.name || "موكل غير معروف";
  };

  const getOpponentName = (o) => (typeof o === "object" ? o.name : o);

  /* ================= FILTER ARCHIVED CASES ================= */
  const archivedCases = cases.filter((c) => {
    // فرز الملفات المؤرشفة والمنتهية (بناءً على الصيغتين العربية والإنجليزية المستعملة سابقاً)
    const isFinished = c.status === "CLOSED" || c.status === "منتهية";
    if (!isFinished) return false;

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

    return (
      caseNumber.includes(text) ||
      clientNames.includes(text) ||
      opponentNames.includes(text) ||
      caseTypeStr.includes(text) ||
      courtName.includes(text)
    );
  });

  return (
    <div style={{ ...styles.page, direction: "rtl" }}>
      {/* HEADER */}
      <div style={styles.headerCard}>
        <h1 style={styles.pageTitle}>📁 أرشيف القضايا والملفات المغلقة</h1>
        <p style={styles.pageSubtitle}>هنا تظهر الدعاوى الصادر فيها أحكام نهائية أو المقيدة كملفات منتهية ومؤرشفة.</p>
      </div>

      {/* SEARCH */}
      <input
        placeholder="ابحث في الأرشيف برقم القضية، اسم الموكل، الخصم، أو المحكمة..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* COUNT */}
      <p style={styles.countText}>📊 إجمالي عدد الملفات المؤرشفة: <strong>{archivedCases.length}</strong> ملف قانوني</p>

      {/* LIST */}
      <div style={styles.grid}>
        {archivedCases.length > 0 ? (
          archivedCases.map((c) => (
            <div key={c.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <Link to={`/case/${c.id}`} style={styles.link}>
                  ⚖️ قضية رقم: {c.caseSerial || c.caseNumber || "بدون رقم"} / {c.caseYear || "-"}
                </Link>
                <span style={styles.archiveBadge}>مؤرشفة</span>
              </div>

              <div style={styles.infoGrid}>
                <p style={styles.textLine}>📌 <strong>نوع الدعوى:</strong> {c.caseType || "-"}</p>
                <p style={styles.textLine}>🏛️ <strong>المحكمة المختصة:</strong> {c.court || "-"}</p>
                <p style={styles.textLine}>🔢 <strong>إجمالي الجلسات:</strong> <span style={styles.sessionsCount}>{(c.sessions || []).length} جلسة</span></p>
              </div>

              <p style={styles.textLine}>
                <span style={styles.labelSpan}>👤 الموكلين:</span>{" "}
                {(c.clients || []).length > 0
                  ? (c.clients || []).map((item, i) => (
                      <span key={i} style={styles.tag}>{getClientName(item)}</span>
                    ))
                  : "-"}
              </p>

              <p style={styles.textLine}>
                <span style={styles.labelSpan}>⚔️ الخصوم:</span>{" "}
                {(c.opponents || []).length > 0
                  ? (c.opponents || []).map((x, i) => (
                      <span key={i} style={styles.tagDanger}>{getOpponentName(x)}</span>
                    ))
                  : "-"}
              </p>
            </div>
          ))
        ) : (
          <div style={styles.noDataCard}>
            <p style={{ margin: 0, color: "#64748b" }}>لا توجد ملفات مؤرشفة أو منتهية تطابق مدخلات البحث.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= MODERNIZED STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  headerCard: { background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  pageTitle: { margin: "0 0 4px 0", fontSize: "20px", color: "#475569" },
  pageSubtitle: { margin: 0, fontSize: "13px", color: "#94a3b8" },
  search: { width: "100%", padding: 11, marginBottom: 15, borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", outline: "none", fontSize: "14px" },
  countText: { fontSize: "14px", color: "#475569", marginBottom: "15px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" },
  card: { background: "#fff", padding: 16, borderRadius: 12, borderRight: "5px solid #64748b", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "10px" },
  link: { textDecoration: "none", fontWeight: "bold", color: "#1e293b", fontSize: "15px" },
  archiveBadge: { background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "8px" },
  textLine: { margin: "6px 0", fontSize: "13px", color: "#334155" },
  labelSpan: { fontWeight: "600", color: "#475569", display: "inline-block", minWidth: "70px" },
  sessionsCount: { color: "#2563eb", fontWeight: "600" },
  tag: { background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", marginRight: "4px", color: "#334155" },
  tagDanger: { background: "#fee2e2", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", marginRight: "4px", color: "#991b1b" },
  noDataCard: { gridColumn: "1/-1", background: "#fff", padding: "30px", borderRadius: "12px", textAlign: "center", border: "1px dashed #cbd5e1" }
};