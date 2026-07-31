import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  collection, getDocs, query, where, limit, startAfter, orderBy,
  deleteDoc, doc, documentId
} from "firebase/firestore";
import { Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { parseDate } from "../utils/date";
import { syncNotifications } from "../utils/syncNotifications";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

function CaseCardSkeleton() {
  return (
    <div style={{ 
      background: "#fff", 
      padding: "16px", 
      borderRadius: "12px", 
      marginBottom: "12px",
      borderRight: "5px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
      <div style={{ 
        height: "20px", 
        width: "60%", 
        background: "#e2e8f0", 
        borderRadius: "4px",
        marginBottom: "12px",
        animation: "pulse 1.5s ease-in-out infinite"
      }} />
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ 
          height: "16px", 
          width: `${70 + Math.random() * 30}%`, 
          background: "#f1f5f9", 
          borderRadius: "4px",
          marginBottom: "8px",
          animation: "pulse 1.5s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`
        }} />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ background: "#fff", padding: "16px", borderRadius: "12px" }}>
      <div style={{ display: "flex", marginBottom: "12px" }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ 
            flex: 1, 
            height: "24px", 
            background: "#e2e8f0", 
            borderRadius: "4px",
            marginRight: "8px",
            animation: "pulse 1.5s ease-in-out infinite"
          }} />
        ))}
      </div>
      {[...Array(5)].map((_, row) => (
        <div key={row} style={{ display: "flex", marginBottom: "8px" }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ 
              flex: 1, 
              height: "40px", 
              background: "#f1f5f9", 
              borderRadius: "4px",
              marginRight: "8px",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${row * 0.1 + i * 0.05}s`
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LoadMoreButton({ loading, hasMore, onClick }) {
  if (!hasMore) return null;
  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button 
        onClick={onClick}
        disabled={loading}
        style={{
          padding: "10px 24px",
          background: loading ? "#cbd5e1" : "#1e3a8a",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600"
        }}
      >
        {loading ? "جاري التحميل..." : "تحميل المزيد"}
      </button>
    </div>
  );
}

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courtFilter, setCourtFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const { userData } = useAuth();
  const navigate = useNavigate();
  const hasSynced = useRef(false);
  const lastDocRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isAdmin = userData?.role === "admin" || userData?.role === "superadmin";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search.toLowerCase().trim());
    }, DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  const loadCases = useCallback(async (isInitial = true) => {
    if (!userData?.officeId) return;

    if (isInitial) {
      setLoading(true);
      lastDocRef.current = null;
      setCases([]);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      let constraints = [
        where("officeId", "==", userData.officeId),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      ];

      if (!isInitial && lastDocRef.current) {
        constraints.push(startAfter(lastDocRef.current));
      }

      const q = query(collection(db, "cases"), ...constraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      if (isInitial) {
        setCases(data);
      } else {
        setCases(prev => [...prev, ...data]);
      }

      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);

      if (isInitial && !hasSynced.current) {
        hasSynced.current = true;
        await syncNotifications(data, userData.officeId);
      }
    } catch (error) {
      console.error("Error loading cases:", error);
      setError("حدث خطأ في تحميل القضايا");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userData?.officeId]);

  useEffect(() => {
    loadCases(true);
  }, [loadCases]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadCases(false);
    }
  }, [loadingMore, hasMore, loadCases]);

  useEffect(() => {
    if (!userData?.officeId || cases.length === 0) return;

    const loadClients = async () => {
      try {
        const allClientIds = new Set();
        cases.forEach((c) => {
          if (Array.isArray(c.clients)) {
            c.clients.forEach((item) => {
              const id = typeof item === "object" ? item.id : item;
              if (id) allClientIds.add(id);
            });
          }
        });

        const idsArray = Array.from(allClientIds).filter(Boolean);
        if (idsArray.length === 0) return;

        const newCache = { ...clientsMap };

        for (let i = 0; i < idsArray.length; i += 30) {
          const chunk = idsArray.slice(i, i + 30);
          const q = query(
            collection(db, "clientProfiles"), 
            where(documentId(), "in", chunk)
          );
          const snap = await getDocs(q);
          snap.forEach((doc) => { 
            newCache[doc.id] = doc.data().fullName || "موكل"; 
          });
        }

        setClientsMap(newCache);
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };

    loadClients();
  }, [cases, userData?.officeId]);

  const getClientName = useCallback((clientItem) => {
    if (!clientItem) return "موكل غير معروف";
    const id = typeof clientItem === "object" ? clientItem.id : clientItem;
    return clientsMap[id]?.fullName || clientsMap[id]?.name || "موكل غير معروف";
  }, [clientsMap]);

  const getUpcomingSessionString = useCallback((sessions) => {
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
  }, []);

  /* ================= DELETE HANDLER ================= */
  const handleDeleteCase = async (e, caseId, caseSerial) => {
    e.stopPropagation(); // منع فتح صفحة التفاصيل
    e.preventDefault();
    
    if (!window.confirm(`هل أنت متأكد من حذف القضية رقم ${caseSerial || caseId}؟\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!`)) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "cases", caseId));
      setCases(prev => prev.filter(c => c.id !== caseId));
      alert("✅ تم حذف القضية بنجاح");
    } catch (err) {
      console.error("Error deleting case:", err);
      alert("❌ حدث خطأ أثناء حذف القضية");
    }
  };

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const text = debouncedSearch;

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

      const searchMatch = !text ||
        caseNumber.includes(text) ||
        clientNamesStr.includes(text) ||
        opponentNamesStr.includes(text) ||
        courtName.includes(text) ||
        caseTypeStr.includes(text) ||
        upcomingSessionDateStr.includes(text);

      const statusMatch = statusFilter === "ALL" || c.status === statusFilter;
      const courtMatch = courtFilter === "ALL" || c.court === courtFilter;
      const typeMatch = typeFilter === "ALL" || c.caseType === typeFilter;

      return searchMatch && statusMatch && courtMatch && typeMatch;
    });
  }, [cases, debouncedSearch, statusFilter, courtFilter, typeFilter, getClientName, getUpcomingSessionString]);

  const courts = useMemo(() => 
    [...new Set(cases.map((c) => c.court).filter(Boolean))],
  [cases]);

  const types = useMemo(() => 
    [...new Set(cases.map((c) => c.caseType).filter(Boolean))],
  [cases]);

  if (loading && cases.length === 0) {
    return (
      <div style={{ ...styles.page, direction: "rtl" }}>
        <div style={styles.card}>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "22px", color: "#1e3a8a" }}>
            📊 أرشيف وجدول كافة القضايا
          </h1>
          <div style={styles.search} />
        </div>
        {isMobile ? (
          <div style={styles.grid}>
            {[...Array(5)].map((_, i) => <CaseCardSkeleton key={i} />)}
          </div>
        ) : (
          <TableSkeleton />
        )}
      </div>
    );
  }

  if (error && cases.length === 0) {
    return (
      <div style={{ ...styles.page, direction: "rtl", textAlign: "center", padding: "40px" }}>
        <h2 style={{ color: "#dc2626" }}>⚠️ {error}</h2>
        <button 
          onClick={() => loadCases(true)}
          style={{
            padding: "10px 20px",
            background: "#1e3a8a",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "20px"
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, direction: "rtl" }}>
      <div style={styles.card}>
        <h1 style={{ margin: "0 0 10px 0", fontSize: "22px", color: "#1e3a8a" }}>
          📊 أرشيف وجدول كافة القضايا
        </h1>

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
            <>
              {filtered.map((c) => {
                const sessionStr = getUpcomingSessionString(c.sessions);
                return (
                  <Card key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <Link to={`/case/${c.id}`} style={styles.link}>
                        ⚖️ ق رقم: {c.caseSerial || c.caseNumber || "بدون رقم"} / {c.caseYear || "-"}
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteCase(e, c.id, c.caseSerial || c.caseNumber)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: 4, borderRadius: 6, color: "#dc2626",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                          title="حذف القضية"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
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
              })}
              <LoadMoreButton 
                loading={loadingMore} 
                hasMore={hasMore} 
                onClick={loadMore} 
              />
            </>
          )}
        </div>
      ) : (
        /* ================= DESKTOP VIEW ================= */
        <div style={styles.cardTable}>
          {filtered.length === 0 ? (
            <p style={styles.noData}>لا توجد دعاوى مطابقة لخيارات البحث الفعلي.</p>
          ) : (
            <>
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
                    {isAdmin && <th style={{ ...styles.th, width: 50 }}>حذف</th>}
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

                        {isAdmin && (
                          <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleDeleteCase(e, c.id, c.caseSerial || c.caseNumber)}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: 6, borderRadius: 6, color: "#dc2626",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                              title="حذف القضية"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <LoadMoreButton 
                loading={loadingMore} 
                hasMore={hasMore} 
                onClick={loadMore} 
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

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