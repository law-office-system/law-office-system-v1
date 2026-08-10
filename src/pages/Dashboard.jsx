import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where, documentId, getDocs, doc, getDoc, limit, orderBy } from "firebase/firestore";
import { useLitigationLevels } from "../hooks/useLitigationLevels";
import { CASE_STATUS } from "../constants/caseStatus";
import { getLitigationLevelLabel } from "../constants/caseStatusLabels";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { parseDate } from "../utils/date";

// ============================================================
// 🏛️ ألوان عريقة — منصة القضاء الخشبية
// ============================================================
const THEME = {
  pageBg: "#f5f0e8",
  headerBg: "#2c1810",
  cardBg: "#faf8f3",
  cardBgHover: "#f5f0e6",
  gold: "#b8860b",
  goldLight: "#d4a843",
  goldDark: "#8b6914",
  textPrimary: "#3d2817",
  textSecondary: "#6b5344",
  textMuted: "#9c8b7a",
  textLight: "#f5f0e8",
  border: "#d4c5b0",
  borderLight: "#e8dfd3",
  shadow: "0 4px 20px rgba(44,24,16,0.08)",
  shadowHover: "0 8px 30px rgba(44,24,16,0.15)",
  urgent: "#8b2500",
  urgentBg: "#fef2f2",
  active: "#2d5a27",
  execution: "#8b6914",
  closed: "#6b5344",
  btnPrimary: "#b8860b",
  btnPrimaryHover: "#d4a843",
  btnSecondary: "#2c1810",
  btnSecondaryHover: "#4a2c1a",
};

const Icons = {
  scale: "⚖️",
  gavel: "🔨",
  book: "📜",
  building: "🏛️",
  person: "👤",
  calendar: "📅",
  clock: "🕐",
  warning: "⚠️",
  search: "🔍",
  add: "➕",
  view: "👁️",
  edit: "✏️",
};

// ✅ Constants
const CASES_LIMIT = 50;
const DEBOUNCE_MS = 300;
const CLIENT_BATCH_SIZE = 30;

// ✅ Skeleton Loading Components
function DashboardSkeleton() {
  return (
    <div style={{ ...styles.page, direction: "rtl" }}>
      <div style={{ ...styles.header, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <div style={{ 
            width: "60px", height: "60px", borderRadius: "12px", 
            background: "#3d2817", animation: "pulse 1.5s ease-in-out infinite" 
          }} />
          <div>
            <div style={{ 
              width: "200px", height: "24px", borderRadius: "4px",
              background: "#5a3a22", marginBottom: "8px",
              animation: "pulse 1.5s ease-in-out infinite"
            }} />
            <div style={{ 
              width: "150px", height: "16px", borderRadius: "4px",
              background: "#4a3520", animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: "0.1s"
            }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ 
              width: "100px", height: "50px", borderRadius: "10px",
              background: "rgba(255,255,255,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`
            }} />
          ))}
        </div>
      </div>

      <div style={{ ...styles.controlsSection, marginBottom: "20px" }}>
        <div style={{ 
          width: "100%", height: "50px", borderRadius: "12px",
          background: "#e8dfd3", marginBottom: "12px",
          animation: "pulse 1.5s ease-in-out infinite"
        }} />
        <div style={{ display: "flex", gap: "8px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ 
              width: "80px", height: "40px", borderRadius: "10px",
              background: "#e8dfd3", animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`
            }} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ 
            background: THEME.cardBg, borderRadius: "14px", padding: "20px",
            height: "200px", animation: "pulse 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`
          }}>
            <div style={{ width: "60%", height: "20px", background: "#e8dfd3", borderRadius: "4px", marginBottom: "12px" }} />
            {[...Array(4)].map((_, j) => (
              <div key={j} style={{ width: `${70 + j * 10}%`, height: "16px", background: "#f0ebe3", borderRadius: "4px", marginBottom: "8px" }} />
            ))}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// 📅 تنسيق التاريخ — YYYY-MM-DD
const formatDate = (dateObj) => {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [clientNamesCache, setClientNamesCache] = useState({});
  const [levelDataCache, setLevelDataCache] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [officeName, setOfficeName] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { user, userData, loading: authLoading, userDataLoading } = useAuth();
  const searchTimeoutRef = useRef(null);
  const unsubRef = useRef(null);
  const isMountedRef = useRef(true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // جلب اسم المكتب (مرة واحدة)
  useEffect(() => {
    const fetchOfficeName = async () => {
      if (userData?.officeId) {
        try {
          const snap = await getDoc(doc(db, "offices", userData.officeId));
          if (snap.exists() && isMountedRef.current) setOfficeName(snap.data().name);
        } catch (err) {
          console.error("Error fetching office name:", err);
        }
      }
    };
    fetchOfficeName();
  }, [userData?.officeId]);

  const isUrgent = useCallback((upcomingDate) => {
    if (!upcomingDate) return false;
    return upcomingDate >= today && upcomingDate <= tomorrow;
  }, [today, tomorrow]);

  // ✅ Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setDebouncedSearch(search.toLowerCase().trim());
    }, DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // ✅ Optimized cases loading with limit
  useEffect(() => {
    // ✅ لو الـ auth لسه بيتحمل، استنى
    if (authLoading || userDataLoading) return;

    // ✅ لو مفيش userData أو officeId، حط loading = false وارجع
    if (!userData?.officeId) {
      setLoading(false);
      setCases([]);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "cases"), 
      where("officeId", "==", userData.officeId),
      orderBy("createdAt", "desc"),
      limit(CASES_LIMIT)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!isMountedRef.current) return;
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCases(data);
      setLoading(false);
    }, (err) => {
      console.error("Error loading cases:", err);
      if (isMountedRef.current) {
        setError("حدث خطأ في تحميل القضايا");
        setLoading(false);
      }
    });

    unsubRef.current = unsub;
    return () => unsub();
  }, [userData?.officeId, authLoading, userDataLoading]);

  // ✅ Fetch missing level data for cases without denormalized fields
  useEffect(() => {
    if (cases.length === 0) return;

    const fetchMissingLevelData = async () => {
      const newCache = { ...levelDataCache };
      let hasChanges = false;

      for (const c of cases) {
        // Skip if case already has all denormalized fields
        if (c.caseNumber && c.court) continue;
        // Skip if already in cache
        if (newCache[c.id]) continue;

        try {
          // Try activeLevelId first
          if (c.activeLevelId) {
            const levelDoc = await getDoc(doc(db, "litigation_levels", c.activeLevelId));
            if (levelDoc.exists()) {
              newCache[c.id] = levelDoc.data();
              hasChanges = true;
              continue;
            }
          }

          // Try to find any level for this case
          const levelsQuery = query(
            collection(db, "litigation_levels"),
            where("caseId", "==", c.id),
            limit(1)
          );
          const levelsSnap = await getDocs(levelsQuery);
          if (!levelsSnap.empty) {
            newCache[c.id] = levelsSnap.docs[0].data();
            hasChanges = true;
          }
        } catch (err) {
          console.warn(`Error fetching level for case ${c.id}:`, err);
        }
      }

      if (hasChanges) {
        setLevelDataCache(newCache);
      }
    };

    fetchMissingLevelData();
  }, [cases]);

  // ✅ Optimized client loading with batching
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

      for (let i = 0; i < idsArray.length; i += CLIENT_BATCH_SIZE) {
        const chunk = idsArray.slice(i, i + CLIENT_BATCH_SIZE);
        try {
          const q = query(collection(db, "clientProfiles"), where(documentId(), "in", chunk));
          const snap = await getDocs(q);
          snap.forEach((doc) => { 
            newCache[doc.id] = doc.data().fullName || "موكل"; 
          });
        } catch (err) {
          console.error("Error fetching clients:", err);
        }
      }

      if (isMountedRef.current) setClientNamesCache(newCache);
    };

    fetchClientNames();
  }, [cases]);

  // ✅ Toast for urgent cases
  useEffect(() => {
    const hasUrgentCases = cases.some(c => isUrgent(getUpcomingSessionDate(c.sessions)));
    if (hasUrgentCases) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [cases, isUrgent]);

  // ✅ Component cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubRef.current) unsubRef.current();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const normalizeStatus = useCallback((status) => {
    const s = (status || "").toString().trim().toLowerCase();
    if (["جارية", "نشطة", "active"].includes(s)) return CASE_STATUS.ACTIVE;
    if (["تنفيذ", "execution"].includes(s)) return CASE_STATUS.EXECUTION;
    if (["منتهية", "closed"].includes(s)) return CASE_STATUS.CLOSED;
    return CASE_STATUS.ACTIVE;
  }, []);

  const getStatusBadge = useCallback((status) => {
    const s = normalizeStatus(status);
    const map = {
      ACTIVE: { label: "نشطة", bg: "#e8f5e6", color: THEME.active, border: "#2d5a2730" },
      EXECUTION: { label: "تنفيذ", bg: "#fdf6e3", color: THEME.execution, border: "#8b691430" },
      CLOSED: { label: "منتهية", bg: "#f0e6e6", color: THEME.closed, border: "#6b534430" },
    };
    const style = map[s] || map.ACTIVE;
    return (
      <span style={{
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "700",
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
      }}>
        {style.label}
      </span>
    );
  }, [normalizeStatus]);

  const getUpcomingSessionDate = useCallback((sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;
    const dates = sessions.map(s => parseDate(s.nextSessionDate || s.date)).filter(d => d && d >= today);
    return dates.length > 0 ? dates.sort((a, b) => a - b)[0] : null;
  }, [today]);

  const getPreviousSessionDate = useCallback((sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return null;
    const dates = sessions.map(s => parseDate(s.nextSessionDate || s.date)).filter(d => d && d < today);
    return dates.length > 0 ? dates.sort((a, b) => b - a)[0] : null;
  }, [today]);

  // ✅ Memoized filtered cases
  const statusFilteredCases = useMemo(() => 
    cases.filter(c => statusFilter === "ALL" || normalizeStatus(c.status) === statusFilter),
  [cases, statusFilter, normalizeStatus]);

  const sortedCases = useMemo(() => {
    return statusFilteredCases.filter(c => {
      const text = debouncedSearch;
      if (!text) return true;
      const clientMatch = Array.isArray(c.clients) && c.clients.some(ci => 
        (clientNamesCache[typeof ci === "object" ? ci.id : ci] || "").toLowerCase().includes(text)
      );
      const sessionMatch = (c.sessions || []).some(s => (s.nextSessionDate || s.date || "").includes(text));
      return (c.caseNumber || "").toLowerCase().includes(text) || 
             clientMatch || 
             (c.court || "").toLowerCase().includes(text) || 
             sessionMatch;
    }).sort((a, b) => 
      (getUpcomingSessionDate(a.sessions) || new Date(9999,0,1)) - 
      (getUpcomingSessionDate(b.sessions) || new Date(9999,0,1))
    );
  }, [statusFilteredCases, debouncedSearch, clientNamesCache, getUpcomingSessionDate]);

  const stats = useMemo(() => ({
    total: cases.length,
    active: cases.filter(c => normalizeStatus(c.status) === CASE_STATUS.ACTIVE).length,
    execution: cases.filter(c => normalizeStatus(c.status) === CASE_STATUS.EXECUTION).length,
    closed: cases.filter(c => normalizeStatus(c.status) === CASE_STATUS.CLOSED).length,
    urgent: cases.filter(c => isUrgent(getUpcomingSessionDate(c.sessions))).length,
  }), [cases, normalizeStatus, isUrgent, getUpcomingSessionDate]);

  // ✅ Loading state - يعتمد على authLoading و userDataLoading
  if (authLoading || userDataLoading || loading) {
    return <DashboardSkeleton />;
  }

  // ✅ Error state
  if (error && cases.length === 0) {
    return (
      <div style={{ ...styles.page, direction: "rtl", textAlign: "center", padding: "40px" }}>
        <h2 style={{ color: "#dc2626" }}>⚠️ {error}</h2>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            background: THEME.btnPrimary,
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
      {/* التنبيه المنبثق */}
      {showToast && (
        <div style={styles.toast}>
          <span style={{ fontSize: "20px" }}>{Icons.warning}</span>
          <div>
            <strong style={{ fontSize: "15px" }}>تنبيه عاجل</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9 }}>
              لديك {stats.urgent} جلس{stats.urgent > 1 ? "ات" : "ة"} عاجلة اليوم أو غداً
            </p>
          </div>
          <button onClick={() => setShowToast(false)} style={styles.closeToast}>✕</button>
        </div>
      )}

      {/* ============================================================
          🏛️ الهيدر العريق — مضغوط على الهاتف
      ============================================================ */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.logoWrapper}>
              {userData?.logoUrl ? (
                <img src={userData.logoUrl} alt="Logo" style={styles.logo} />
              ) : (
                <div style={styles.logoPlaceholder}>{Icons.scale}</div>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={styles.officeName} className="dashboard-office-name">
                {officeName || "مكتب المحاماة"}
              </h1>
              <p style={styles.welcomeText} className="dashboard-welcome-text">
                أهلاً بك يا {userData?.name || "زميلي"} · {formatDate(today)}
              </p>
            </div>
          </div>

          {/* ✅ أزرار الإضافة — تظهر في الهيدر على الديسكتوب فقط */}
          {!isMobile && (
            <div style={styles.headerActions}>
              <button 
                style={styles.addCaseBtn} 
                onClick={() => navigate("/add-case")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.goldLight;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.gold;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: "16px" }}>{Icons.add}</span>
                <span>إضافة قضية</span>
              </button>
              <button 
                style={styles.addClientBtn} 
                onClick={() => navigate("/clients/add")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.btnSecondaryHover;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.btnSecondary;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: "16px" }}>{Icons.person}</span>
                <span>إضافة موكل</span>
              </button>
            </div>
          )}
        </div>

        {/* شريط الإحصائيات */}
        <div style={styles.statsBar} className="dashboard-stats-bar">
          <StatItem icon={Icons.book} label="القضايا" value={stats.total} />
          <StatItem icon="●" label="نشطة" value={stats.active} color={THEME.active} />
          <StatItem icon="●" label="تنفيذ" value={stats.execution} color={THEME.execution} />
          <StatItem icon="●" label="منتهية" value={stats.closed} color={THEME.closed} />
          {stats.urgent > 0 && (
            <StatItem icon={Icons.warning} label="عاجلة" value={stats.urgent} color={THEME.urgent} isUrgent />
          )}
        </div>
      </header>

      {/* ============================================================
          ✅ أزرار الإضافة — تظهر برة الهيدر على الهاتف فقط
      ============================================================ */}
      {isMobile && (
        <div style={styles.mobileActions}>
          <button 
            style={styles.mobileAddCaseBtn} 
            onClick={() => navigate("/add-case")}
          >
            <span style={{ fontSize: "18px" }}>{Icons.add}</span>
            <span>إضافة قضية</span>
          </button>
          <button 
            style={styles.mobileAddClientBtn} 
            onClick={() => navigate("/clients/add")}
          >
            <span style={{ fontSize: "18px" }}>{Icons.person}</span>
            <span>إضافة موكل</span>
          </button>
        </div>
      )}

      {/* ============================================================
          🔍 البحث والفلاتر
      ============================================================ */}
      <div style={styles.controlsSection}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>{Icons.search}</span>
          <input 
            placeholder="ابحث برقم السجل، المحكمة، الموكل، أو التاريخ (YYYY-MM-DD)..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={styles.search}
          />
        </div>

        <div style={styles.filters}>
          {[
            { key: "ALL", label: "الكل" },
            { key: CASE_STATUS.ACTIVE, label: "نشطة" },
            { key: CASE_STATUS.EXECUTION, label: "تنفيذ" },
            { key: CASE_STATUS.CLOSED, label: "منتهية" },
          ].map((filter) => (
            <button 
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)} 
              style={statusFilter === filter.key ? styles.activeFilter : styles.filterBtn}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          📋 شبكة القضايا
      ============================================================ */}
      <div style={styles.grid}>
        {sortedCases.map((c) => {
          const upcoming = getUpcomingSessionDate(c.sessions);
          const previous = getPreviousSessionDate(c.sessions);
          const urgent = isUrgent(upcoming);
          const clientName = Array.isArray(c.clients) 
            ? (clientNamesCache[typeof c.clients[0] === "object" ? c.clients[0].id : c.clients[0]] || "...")
            : "-";

          // ✅ Fallback: use level data cache if denormalized fields are missing
          const levelData = levelDataCache[c.id];
          const displayCaseNumber = c.caseSerial || c.caseNumber || levelData?.caseNumber || "-";
          const displayCaseYear = c.caseYear || levelData?.caseYear || "-";
          const displayCourt = c.court || levelData?.court || "-";
          const displayCircuit = c.circuit || levelData?.circuit || "";

          return (
            <div 
              key={c.id} 
              style={{
                ...styles.card,
                ...(urgent ? styles.cardUrgent : {}),
              }}
              onClick={() => navigate(`/case/${c.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = THEME.shadowHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = THEME.shadow;
              }}
            >
              <div style={{
                ...styles.cardTopBar,
                background: urgent ? THEME.urgent : THEME.gold,
              }} />

              <div style={styles.cardContent}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.caseNumber}>
                    {Icons.gavel} ق رقم: {displayCaseNumber} / {displayCaseYear}
                    {c.currentLevel && (
                      <span style={{
                        fontSize: "12px", fontWeight: "500", color: THEME.gold,
                        marginRight: "8px", padding: "2px 8px", background: "#fdf6e3",
                        borderRadius: "6px", border: `1px solid ${THEME.gold}30`,
                      }}>
                        {getLitigationLevelLabel(c.currentLevel)}
                      </span>
                    )}
                  </h3>
                  {getStatusBadge(c.status)}
                </div>

                {urgent && (
                  <div style={styles.urgentBanner}>
                    <span style={{ fontSize: "16px" }}>{Icons.warning}</span>
                    <span>جلسة عاجلة — {formatDate(upcoming)}</span>
                  </div>
                )}

                <div style={styles.caseInfo}>
                  <InfoRow icon={Icons.person} label="الموكل" value={clientName} />
                  <InfoRow icon={Icons.building} label="المحكمة" value={displayCourt} />
                  {displayCircuit && <InfoRow icon="⚡" label="الدائرة" value={displayCircuit} />}
                </div>

                <div style={styles.datesBox}>
                  <DateRow 
                    icon={Icons.calendar} 
                    label="القادمة" 
                    date={upcoming} 
                    isUrgent={urgent}
                  />
                  {previous && (
                    <DateRow 
                      icon={Icons.clock} 
                      label="السابقة" 
                      date={previous} 
                      isPast
                    />
                  )}
                </div>

                <div style={styles.cardActions}>
                  <button 
                    style={styles.viewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/case/${c.id}`);
                    }}
                  >
                    {Icons.view} فتح الملف
                  </button>
                  <button 
                    style={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/edit/${c.id}`);
                    }}
                  >
                    {Icons.edit} تعديل
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedCases.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>{Icons.book}</div>
          <h3 style={{ color: THEME.textPrimary, margin: "0 0 8px 0" }}>
            {debouncedSearch ? "لا توجد نتائج مطابقة" : "لا توجد قضايا"}
          </h3>
          <p style={{ color: THEME.textMuted, margin: 0 }}>
            {debouncedSearch 
              ? "جرب البحث بكلمات مختلفة" 
              : "اضغط على 'إضافة قضية' لإضافة أول قضية"
            }
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🏛️ مكونات مساعدة
// ============================================================

function StatItem({ icon, label, value, color, isUrgent }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      background: isUrgent ? "#8b250015" : "rgba(255,255,255,0.05)",
      borderRadius: "10px",
      border: isUrgent ? "1px solid #8b250030" : "1px solid transparent",
    }}>
      <span style={{ 
        fontSize: "14px", 
        color: color || THEME.goldLight,
        fontWeight: isUrgent ? "bold" : "normal",
      }}>
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ 
          fontSize: "18px", 
          fontWeight: "700", 
          color: isUrgent ? THEME.urgent : "#fff",
          fontFamily: "'Segoe UI', Tahoma, sans-serif",
        }}>
          {value}
        </span>
        <span style={{ fontSize: "11px", color: "#9c8b7a", fontWeight: "500" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoIcon}>{icon}</span>
      <span style={styles.infoLabel}>{label}:</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function DateRow({ icon, label, date, isUrgent, isPast }) {
  return (
    <div style={{
      ...styles.dateRow,
      ...(isUrgent ? styles.dateRowUrgent : {}),
      ...(isPast ? styles.dateRowPast : {}),
    }}>
      <span style={styles.dateIcon}>{icon}</span>
      <span style={styles.dateLabel}>{label}:</span>
      <span style={{
        ...styles.dateValue,
        ...(isUrgent ? { color: THEME.urgent, fontWeight: "700" } : {}),
        ...(isPast ? { color: THEME.textMuted } : {}),
      }}>
        {date ? formatDate(date) : "لا يوجد"}
      </span>
    </div>
  );
}

// ============================================================
// 🏛️ الستايلات
// ============================================================
const styles = {
  page: {
    padding: "24px",
    background: THEME.pageBg,
    minHeight: "100vh",
    fontFamily: "'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', sans-serif",
  },

  // ─── الهيدر ───
  header: {
    background: THEME.headerBg,
    borderRadius: "16px",
    padding: "20px 24px",
    marginBottom: "20px",
    boxShadow: "0 8px 32px rgba(44,24,16,0.15)",
    border: "1px solid #3d2817",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flex: 1,
    minWidth: 0,
  },
  logoWrapper: {
    width: "60px",
    height: "60px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #3d2817, #5a3a22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px solid ${THEME.gold}`,
    boxShadow: "0 4px 12px rgba(184,134,11,0.2)",
    flexShrink: 0,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "10px",
  },
  logoPlaceholder: {
    fontSize: "28px",
  },
  officeName: {
    margin: "0 0 4px 0",
    fontSize: "22px",
    fontWeight: "700",
    color: THEME.goldLight,
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    letterSpacing: "0.5px",
    whiteSpace: "normal",
    overflow: "visible",
    lineHeight: "1.3",
  },
  welcomeText: {
    margin: 0,
    color: "#9c8b7a",
    fontSize: "14px",
    fontWeight: "500",
    whiteSpace: "normal",
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  // ─── أزرار الإضافة في الهيدر (ديسكتوب) ───
  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  addCaseBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: THEME.gold,
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 16px rgba(184,134,11,0.3)",
    fontFamily: "inherit",
  },
  addClientBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: THEME.btnSecondary,
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 16px rgba(44,24,16,0.2)",
    fontFamily: "inherit",
  },

  // ─── أزرار الإضافة على الهاتف ───
  mobileActions: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  mobileAddCaseBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "14px 16px",
    background: THEME.gold,
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 16px rgba(184,134,11,0.3)",
    fontFamily: "inherit",
  },
  mobileAddClientBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "14px 16px",
    background: THEME.btnSecondary,
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: "0 4px 16px rgba(44,24,16,0.2)",
    fontFamily: "inherit",
  },

  // ─── شريط الإحصائيات ───
  statsBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    paddingTop: "16px",
    borderTop: "1px solid rgba(212,197,176,0.15)",
  },

  // ─── البحث والفلاتر ───
  controlsSection: {
    marginBottom: "20px",
  },
  searchWrapper: {
    position: "relative",
    marginBottom: "12px",
  },
  searchIcon: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "18px",
    color: THEME.textMuted,
    zIndex: 1,
  },
  search: {
    width: "100%",
    padding: "14px 48px 14px 16px",
    borderRadius: "12px",
    border: `1px solid ${THEME.border}`,
    background: THEME.cardBg,
    color: THEME.textPrimary,
    fontSize: "15px",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    boxShadow: "0 2px 8px rgba(44,24,16,0.04)",
  },
  filters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: `1px solid ${THEME.border}`,
    background: THEME.cardBg,
    color: THEME.textSecondary,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  activeFilter: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: `1px solid ${THEME.gold}`,
    background: "#fdf6e3",
    color: THEME.goldDark,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxShadow: "0 2px 8px rgba(184,134,11,0.1)",
  },

  // ─── شبكة القضايا ───
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "16px",
  },

  // ─── البطاقة ───
  card: {
    background: THEME.cardBg,
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: THEME.shadow,
    transition: "all 0.3s ease",
    cursor: "pointer",
    border: `1px solid ${THEME.borderLight}`,
    position: "relative",
  },
  cardUrgent: {
    border: `2px solid ${THEME.urgent}30`,
    boxShadow: "0 4px 20px rgba(139,37,0,0.08)",
  },
  cardTopBar: {
    height: "4px",
    transition: "background 0.3s ease",
  },
  cardContent: {
    padding: "20px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  caseNumber: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: THEME.textPrimary,
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },

  // ─── تنبيه عاجل ───
  urgentBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    background: THEME.urgentBg,
    borderRadius: "10px",
    marginBottom: "12px",
    color: THEME.urgent,
    fontSize: "13px",
    fontWeight: "700",
    border: `1px solid ${THEME.urgent}20`,
  },

  // ─── بيانات القضية ───
  caseInfo: {
    marginBottom: "12px",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 0",
    fontSize: "14px",
  },
  infoIcon: {
    fontSize: "16px",
    opacity: 0.7,
  },
  infoLabel: {
    color: THEME.textMuted,
    fontWeight: "500",
    minWidth: "60px",
  },
  infoValue: {
    color: THEME.textPrimary,
    fontWeight: "600",
  },

  // ─── تواريخ الجلسات ───
  datesBox: {
    background: "#f5f0e6",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "16px",
    border: `1px solid ${THEME.borderLight}`,
  },
  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 0",
    fontSize: "13px",
  },
  dateRowUrgent: {
    background: THEME.urgentBg,
    margin: "-4px -8px",
    padding: "8px",
    borderRadius: "6px",
    border: `1px solid ${THEME.urgent}20`,
  },
  dateRowPast: {
    opacity: 0.8,
  },
  dateIcon: {
    fontSize: "14px",
    opacity: 0.6,
  },
  dateLabel: {
    color: THEME.textMuted,
    fontWeight: "500",
    minWidth: "55px",
  },
  dateValue: {
    color: THEME.textPrimary,
    fontWeight: "600",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },

  // ─── أزرار البطاقة ───
  cardActions: {
    display: "flex",
    gap: "8px",
    paddingTop: "12px",
    borderTop: `1px solid ${THEME.borderLight}`,
  },
  viewBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    border: "none",
    borderRadius: "10px",
    background: THEME.btnSecondary,
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  editBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    border: `1px solid ${THEME.border}`,
    borderRadius: "10px",
    background: "transparent",
    color: THEME.textSecondary,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },

  // ─── حالة فارغة ───
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    color: THEME.textMuted,
  },

  // ─── التنبيه المنبثق ───
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: THEME.headerBg,
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "14px",
    boxShadow: "0 8px 32px rgba(44,24,16,0.2)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    maxWidth: "400px",
    border: `1px solid ${THEME.gold}30`,
    animation: "slideIn 0.4s ease",
  },
  closeToast: {
    background: "transparent",
    border: "none",
    color: "#9c8b7a",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    padding: "4px",
    marginRight: "auto",
    transition: "color 0.2s",
  },
};

// ✅ Responsive adjustments
const responsiveStyles = `
  @media (max-width: 768px) {
    .dashboard-grid {
      grid-template-columns: 1fr !important;
    }
    .dashboard-header {
      padding: 16px !important;
    }
    .dashboard-header-content {
      flex-direction: column;
      align-items: flex-start !important;
    }
    .dashboard-office-name {
      font-size: 15px !important;
      line-height: 1.4 !important;
      word-break: break-word !important;
    }
    .dashboard-welcome-text {
      font-size: 12px !important;
      white-space: normal !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }
    .dashboard-stats-bar {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 8px !important;
    }
    .dashboard-stats-bar > div {
      justify-content: center !important;
    }
    .dashboard-logo-wrapper {
      width: 48px !important;
      height: 48px !important;
    }
    .dashboard-stats-bar {
      justify-content: center;
    }
    .dashboard-mobile-actions {
      display: flex !important;
    }
    .dashboard-header-actions {
      display: none !important;
    }
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = responsiveStyles;
  document.head.appendChild(styleSheet);
}
