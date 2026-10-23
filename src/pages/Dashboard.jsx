import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where, orderBy, doc, getDoc, getDocs, limit, documentId } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { CASE_STATUS } from "../constants/caseStatus";
import { getLitigationLevelLabel } from "../constants/caseStatusLabels";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { parseDate } from "../utils/date";
import { isArchivedCase, isExecutionCase } from "../utils/archiveStatus";

// ── تذكر إغلاق تنبيه العاجل ──
const getDismissKey = () => {
  const d = new Date();
  return `dashboard_urgent_dismissed_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
};
const isDismissedToday = () => localStorage.getItem(getDismissKey()) === "true";
const dismissToday = () => localStorage.setItem(getDismissKey(), "true");

const Icons = { scale: "⚖️", gavel: "🔨", book: "📜", building: "🏛️", person: "👤", calendar: "📅", clock: "🕐", warning: "⚠️", search: "🔍", add: "➕", view: "👁️", edit: "✏️" };

const CASES_LIMIT = 50;
const DEBOUNCE_MS = 300;
const CLIENT_BATCH_SIZE = 30;

const formatDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

// ── ستايلات مشتقة من النظام الموحد (theme) ──
function useDashboardStyles(theme) {
  return useMemo(() => {
    const { colors: c, currentAccent: A, shadows, radius, transitions } = theme;
    const st = c.status;
    const cs = {
      active:    st.active    || st.completed,
      execution: st.execution || st.postponed,
      closed:    st.closed    || st.pending,
      urgent:    st.urgent    || { bg: "#fef2f2", text: "#8b2500", border: "rgba(139,37,0,0.25)" },
    };
    const statusBadge = (x) => ({ ...theme.badge, background: x.bg, color: x.text, border: `1px solid ${x.border}` });

    return {
      cs, statusBadge,
      chipBg: c.bg.hover,
      page: theme.page,
      header: { ...theme.card, boxShadow: shadows.md, marginBottom: 20 },
      headerContent: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 16 },
      headerLeft: { display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 },
      logoWrapper: { width: 60, height: 60, borderRadius: radius.md, background: theme.gradient(A.dark, A.main), border: `2px solid ${A.main}`, boxShadow: shadows.glow(A.main), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
      logo: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 },
      officeName: { margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: A.light, letterSpacing: "0.5px", lineHeight: 1.3 },
      welcomeText: { margin: 0, color: c.text.muted, fontSize: 14, fontWeight: 500 },
      headerActions: { display: "flex", gap: 10, flexWrap: "wrap" },
      addCaseBtn: { ...theme.button.primary, borderRadius: radius.md },
      addClientBtn: { ...theme.button.secondary, borderRadius: radius.md, background: c.bg.card, color: c.text.primary },
      mobileActions: { display: "flex", gap: 10, marginBottom: 16 },
      mobileAddCaseBtn: { ...theme.button.primary, flex: 1, borderRadius: radius.md },
      mobileAddClientBtn: { ...theme.button.secondary, flex: 1, borderRadius: radius.md, background: c.bg.card, color: c.text.primary },
      statsBar: { display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 16, borderTop: `1px solid ${c.border.default}` },
      controlsSection: { marginBottom: 20 },
      searchWrapper: { position: "relative", marginBottom: 12 },
      searchIcon: { position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: c.text.muted },
      search: { ...theme.input, padding: "14px 48px 14px 16px", borderRadius: radius.md, boxShadow: shadows.sm, fontSize: 15 },
      filters: { display: "flex", gap: 8, flexWrap: "wrap" },
      filterBtn: { ...theme.button.secondary, borderRadius: radius.sm },
      activeFilter: { ...theme.button.base, background: A.bg, color: A.dark, border: `1px solid ${A.main}`, borderRadius: radius.sm, boxShadow: shadows.glow(A.main) },
      grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" },
      card: { ...theme.card, overflow: "hidden", cursor: "pointer", boxShadow: shadows.sm, transition: transitions.slow, position: "relative", display: "flex", flexDirection: "column", height: "100%", minWidth: 0 },
      cardUrgent: { border: `2px solid ${cs.urgent.border}`, boxShadow: `0 4px 20px ${cs.urgent.text}14` },
      cardTopBar: { height: 4, transition: "background 0.3s ease" },
      cardContent: { padding: 20, display: "flex", flexDirection: "column", flex: 1, minWidth: 0, textAlign: "right", direction: "rtl" },
      cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "nowrap", gap: 10, width: "100%", minHeight: 32 },
      caseNumber: { margin: 0, fontSize: 16, fontWeight: 700, color: c.text.primary, flex: 1, minWidth: 0, lineHeight: 1.7, overflowWrap: "anywhere", textAlign: "right" },
      levelChip: { ...statusBadge({ bg: A.bg, text: A.main, border: `${A.main}30` }), display: "inline-flex", fontSize: 12, fontWeight: 500, marginRight: 8, whiteSpace: "nowrap" },
      urgentBanner: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: cs.urgent.bg, borderRadius: radius.sm, marginBottom: 12, color: cs.urgent.text, fontSize: 13, fontWeight: 700, border: `1px solid ${cs.urgent.border}` },
      caseInfo: { marginBottom: 14, display: "flex", flexDirection: "column", gap: 2, width: "100%" },
      infoRow: { display: "grid", gridTemplateColumns: "20px 64px minmax(0, 1fr)", alignItems: "start", columnGap: 8, padding: "5px 0", fontSize: 14, width: "100%" },
      infoIcon: { fontSize: 16, opacity: 0.7, lineHeight: 1.7, textAlign: "center" },
      infoLabel: { color: c.text.muted, fontWeight: 500, minWidth: 0, whiteSpace: "nowrap", lineHeight: 1.7 },
      infoValue: { color: c.text.primary, fontWeight: 600, minWidth: 0, lineHeight: 1.7, overflowWrap: "anywhere", textAlign: "right" },
      datesBox: { background: c.bg.hover, borderRadius: radius.sm, padding: 12, marginBottom: 16, border: `1px solid ${c.border.default}`, width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 4 },
      dateRow: { display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0", fontSize: 13, width: "100%" },
      dateRowUrgent: { background: cs.urgent.bg, margin: "-4px -8px", padding: 8, borderRadius: 6, border: `1px solid ${cs.urgent.border}` },
      dateRowPast: { opacity: 0.8 },
      dateIcon: { fontSize: 14, opacity: 0.6, flex: "0 0 18px", lineHeight: 1.8, textAlign: "center" },
      dateLabel: { color: c.text.muted, fontWeight: 500, flexShrink: 0, lineHeight: 1.8, whiteSpace: "nowrap" },
      dateValue: { color: c.text.primary, fontWeight: 600, minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.8, fontVariantNumeric: "tabular-nums" },
      dateContent: { flex: 1, minWidth: 0 },
      datePrimary: { display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap", width: "100%" },
      dateTitle: { color: c.text.primary, fontWeight: 500, lineHeight: 1.65, marginTop: 2, overflowWrap: "anywhere", textAlign: "right" },
      cardActions: { display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${c.border.default}`, marginTop: "auto", width: "100%" },
      viewBtn: { ...theme.button.base, flex: 1, background: c.bg.card, color: c.text.primary, border: `1px solid ${c.border.default}`, whiteSpace: "nowrap", minHeight: 40 },
      editBtn: { ...theme.button.secondary, flex: 1, whiteSpace: "nowrap", minHeight: 40 },
      emptyState: { textAlign: "center", padding: "80px 20px", color: c.text.muted },
      toast: { position: "fixed", bottom: 24, right: 24, background: c.bg.card, color: c.text.primary, padding: "16px 20px", borderRadius: radius.lg, boxShadow: shadows.md, zIndex: 1000, display: "flex", alignItems: "center", gap: 12, maxWidth: 400, border: `1px solid ${A.main}30`, animation: "slideIn 0.4s ease" },
      closeToast: { background: "transparent", border: "none", color: c.text.muted, cursor: "pointer", fontWeight: "bold", fontSize: 16, marginRight: "auto" },
    };
  }, [theme]);
}

// ── Skeleton محمّل ──
function DashboardSkeleton({ theme }) {
  const b = (extra = {}) => ({ background: theme.colors.bg.hover, animation: "pulse 1.5s ease-in-out infinite", ...extra });
  return (
    <div style={{ ...theme.page, direction: "rtl" }}>
      <div style={{ padding: 20, borderRadius: 16, marginBottom: 20, border: `1px solid ${theme.colors.border.default}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={b({ width: 60, height: 60, borderRadius: 12 })} />
          <div>
            <div style={b({ width: 200, height: 24, marginBottom: 8 })} />
            <div style={b({ width: 150, height: 16 })} />
          </div>
        </div>
      </div>
      <div style={b({ height: 50, borderRadius: 12, marginBottom: 12 })} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginTop: 20 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={b({ borderRadius: 14, padding: 20, height: 200 })}>
            <div style={b({ width: "60%", height: 20, marginBottom: 12 })} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100% {opacity:1} 50% {opacity:0.5} }`}</style>
    </div>
  );
}

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
  const { userData, loading: authLoading, userDataLoading } = useAuth();
  const { theme } = useTheme();
  const s = useDashboardStyles(theme);

  const searchTimeoutRef = useRef(null);
  const unsubRef = useRef(null);
  const isMountedRef = useRef(true);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  // ── دوال مساعدة ──
  const isUrgent = useCallback((d) => !!d && d >= today && d <= tomorrow, [today, tomorrow]);

  const getUpcomingSession = useCallback((sessions) => {
    if (!Array.isArray(sessions) || !sessions.length) return null;

    return sessions
      .map(session => ({
        ...session,
        parsedDate: parseDate(session.nextSessionDate || session.date),
      }))
      .filter(session => session.parsedDate && session.parsedDate >= today)
      .sort((a, b) => a.parsedDate - b.parsedDate)[0] || null;
  }, [today]);

  const getUpcomingSessionDate = useCallback(
    (sessions) => getUpcomingSession(sessions)?.parsedDate || null,
    [getUpcomingSession]
  );

  const getSessionTitle = useCallback((session) => {
    if (!session) return "";
    return String(
      session.nextSessionTitle ||
      session.sessionTitle ||
      session.title ||
      ""
    ).trim();
  }, []);

  const getPreviousSessionDate = useCallback((sessions) => {
    if (!Array.isArray(sessions) || !sessions.length) return null;
    const dates = sessions.map(x => parseDate(x.nextSessionDate || x.date)).filter(d => d && d < today);
    return dates.length ? dates.sort((a, b) => b - a)[0] : null;
  }, [today]);

  const normalizeStatus = useCallback((status) => {
    const x = (status || "").toString().trim().toLowerCase();
    if (["جارية", "نشطة", "active"].includes(x)) return CASE_STATUS.ACTIVE;
    if (["تنفيذ", "execution"].includes(x)) return CASE_STATUS.EXECUTION;
    if (["منتهية", "منتهي", "مغلقة", "مغلق", "مؤرشفة", "مؤرشف", "closed", "archived", "ended", "done", "terminated"].includes(x)) return CASE_STATUS.CLOSED;
    return CASE_STATUS.ACTIVE;
  }, []);

  const getCaseStatus = useCallback((c) => {
    if (isArchivedCase(c)) return CASE_STATUS.CLOSED;
    if (isExecutionCase(c)) return CASE_STATUS.EXECUTION;
    return normalizeStatus(c?.status);
  }, [normalizeStatus]);

  const statusBadge = useCallback((status) => {
    const map = {
      [CASE_STATUS.ACTIVE]:    { label: "نشطة",   ...s.cs.active },
      [CASE_STATUS.EXECUTION]: { label: "تنفيذ",  ...s.cs.execution },
      [CASE_STATUS.CLOSED]:    { label: "منتهية", ...s.cs.closed },
    };
    const x = map[normalizeStatus(status)] || map[CASE_STATUS.ACTIVE];
    return <span style={{ ...s.statusBadge(x), flexShrink: 0 }}>{x.label}</span>;
  }, [normalizeStatus, s]);

  // ── useEffects ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!userData?.officeId) return;
    getDoc(doc(db, "offices", userData.officeId))
      .then(snap => { if (snap.exists() && isMountedRef.current) setOfficeName(snap.data().name); })
      .catch(e => console.error("Office name:", e));
  }, [userData?.officeId]);

  useEffect(() => {
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setDebouncedSearch(search.toLowerCase().trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [search]);

  // تشخيص الصلاحيات
  useEffect(() => {
    if (authLoading || userDataLoading) return;
    console.log("[Dashboard Permission Debug]", {
      officeId: userData?.officeId ?? null,
      role: userData?.role ?? null,
      hasOfficeId: Boolean(userData?.officeId),
    });
  }, [authLoading, userDataLoading, userData?.officeId, userData?.role]);

  // تحميل القضايا الخاصة بالمكتب
  useEffect(() => {
    if (authLoading || userDataLoading) return;
    if (!userData?.officeId) { setLoading(false); setCases([]); return; }

    setLoading(true);
    setError(null);
    const q = query(collection(db, "cases"), where("officeId", "==", userData.officeId), orderBy("createdAt", "desc"), limit(CASES_LIMIT));

    const unsub = onSnapshot(q, (snap) => {
      if (!isMountedRef.current) return;
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Cases Load Error:", err);
      if (isMountedRef.current) { setError("حدث خطأ في تحميل القضايا"); setLoading(false); }
    });

    unsubRef.current = unsub;
    return () => unsub();
  }, [userData?.officeId, authLoading, userDataLoading]);

  // 3. تحميل مستويات التقاضي
  useEffect(() => {
    const officeId = userData?.officeId;

    if (!cases.length || !officeId) {
      setLevelDataCache({});
      return;
    }

    let cancelled = false;

    const loadLevels = async () => {
      const newCache = {};

      for (const c of cases) {
        if (cancelled) return;

        if (c.caseNumber && c.court) continue;

        try {
          let levelData = null;

          if (c.activeLevelId) {
            const activeLevelQuery = query(
              collection(db, "litigation_levels"),
              where("officeId", "==", officeId),
              where(documentId(), "==", c.activeLevelId),
              limit(1)
            );

            const activeLevelSnap = await getDocs(activeLevelQuery);

            if (!activeLevelSnap.empty) {
              const docData = activeLevelSnap.docs[0].data();
              if (docData.officeId === officeId) {
                levelData = docData;
              }
            }
          }

          if (!levelData) {
            const levelsQuery = query(
              collection(db, "litigation_levels"),
              where("officeId", "==", officeId),
              where("caseId", "==", c.id),
              limit(1)
            );

            const levelsSnap = await getDocs(levelsQuery);

            if (!levelsSnap.empty) {
              const docData = levelsSnap.docs[0].data();
              if (docData.officeId === officeId) {
                levelData = docData;
              }
            }
          }

          if (levelData && !cancelled) {
            newCache[c.id] = levelData;
          }
        } catch (e) {
          console.error("[Dashboard] Failed to load litigation level:", {
            caseId: c.id,
            officeId,
            errorCode: e?.code,
            errorMessage: e?.message,
          });
        }
      }

      if (!cancelled) {
        setLevelDataCache(newCache);
      }
    };

    loadLevels();

    return () => {
      cancelled = true;
    };
  }, [cases, userData?.officeId]);

  // 4. تحميل أسماء الموكلين — جلب فردي: أي مستند مرفوض أو تابع لمكتب آخر يتخطى بدون إيقاف الباقي
  useEffect(() => {
    const officeId = userData?.officeId;

    if (!cases.length || !officeId) {
      setClientNamesCache({});
      return;
    }

    let cancelled = false;

    const loadClientNames = async () => {
      const clientIds = new Set();

      cases.forEach((c) => {
        if (!Array.isArray(c.clients)) return;

        c.clients.forEach((client) => {
          const id =
            typeof client === "object" && client !== null
              ? client.id
              : client;

          if (typeof id === "string" && id.trim()) {
            clientIds.add(id);
          }
        });
      });

      const missingIds = [...clientIds].filter(
        (id) => !clientNamesCache[id]
      );

      if (!missingIds.length) return;

      const newNames = {};

      await Promise.all(
        missingIds.map(async (id) => {
          if (cancelled) return;
          try {
            const snap = await getDoc(doc(db, "clientProfiles", id));
            if (!snap.exists()) return;

            const data = snap.data();
            if (data.officeId !== officeId) return;

            newNames[id] = data.fullName || data.name || "موكل";
          } catch {
            // مستند مرفوض أو غير موجود — نتخطاه بهدوء
          }
        })
      );

      if (cancelled || !Object.keys(newNames).length) return;

      setClientNamesCache((previous) => ({
        ...previous,
        ...newNames,
      }));
    };

    loadClientNames();

    return () => {
      cancelled = true;
    };
  }, [cases, userData?.officeId]);

  useEffect(() => {
    if (isDismissedToday()) return;
    if (cases.some(c => isUrgent(getUpcomingSessionDate(c.sessions)))) setShowToast(true);
  }, [cases, isUrgent, getUpcomingSessionDate]);

  useEffect(() => () => {
    isMountedRef.current = false;
    unsubRef.current?.();
    clearTimeout(searchTimeoutRef.current);
  }, []);

  // ── قيم محسوبة ──
  const statusFilteredCases = useMemo(() =>
    cases.filter(c => statusFilter === "ALL" || getCaseStatus(c) === statusFilter),
  [cases, statusFilter, getCaseStatus]);

  const sortedCases = useMemo(() =>
    statusFilteredCases.filter(c => {
      if (!debouncedSearch) return true;
      const clientMatch = Array.isArray(c.clients) && c.clients.some(ci =>
        (clientNamesCache[typeof ci === "object" ? ci.id : ci] || "").toLowerCase().includes(debouncedSearch));
      const sessionMatch = (c.sessions || []).some(x => (x.nextSessionDate || x.date || "").includes(debouncedSearch));
      return (c.caseNumber || "").toLowerCase().includes(debouncedSearch) || clientMatch ||
             (c.court || "").toLowerCase().includes(debouncedSearch) || sessionMatch;
    }).sort((a, b) =>
      (getUpcomingSessionDate(a.sessions) || new Date(9999, 0, 1)) - (getUpcomingSessionDate(b.sessions) || new Date(9999, 0, 1))
    ),
  [statusFilteredCases, debouncedSearch, clientNamesCache, getUpcomingSessionDate]);

  const stats = useMemo(() => ({
    total: cases.length,
    active: cases.filter(c => getCaseStatus(c) === CASE_STATUS.ACTIVE).length,
    execution: cases.filter(c => getCaseStatus(c) === CASE_STATUS.EXECUTION).length,
    closed: cases.filter(c => getCaseStatus(c) === CASE_STATUS.CLOSED).length,
    urgent: cases.filter(c => !isArchivedCase(c) && isUrgent(getUpcomingSessionDate(c.sessions))).length,
  }), [cases, getCaseStatus, isUrgent, getUpcomingSessionDate]);

  if (authLoading || userDataLoading || loading) return <DashboardSkeleton theme={theme} />;

  if (error && !cases.length) {
    return (
      <div style={{ ...s.page, direction: "rtl", textAlign: "center", padding: 40 }}>
        <h2 style={{ color: s.cs.urgent.text }}>⚠️ {error}</h2>
        <button onClick={() => window.location.reload()} style={{ ...theme.button.primary, marginTop: 20 }}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const btnHover = (e, bg) => { e.currentTarget.style.background = bg; e.currentTarget.style.transform = "translateY(-2px)"; };
  const btnLeave = (e, bg) => { e.currentTarget.style.background = bg; e.currentTarget.style.transform = "translateY(0)"; };

  return (
    <div style={{ ...s.page, direction: "rtl" }}>
      {showToast && (
        <div style={s.toast}>
          <span style={{ fontSize: 20 }}>{Icons.warning}</span>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 15 }}>تنبيه عاجل</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
              لديك {stats.urgent} جلس{stats.urgent > 1 ? "ات" : "ة"} عاجلة اليوم أو غداً
            </p>
          </div>
          <button onClick={() => { setShowToast(false); dismissToday(); }}
            style={{ ...theme.button.secondary, padding: "4px 10px", fontSize: 12 }}>
            لا تذكرني اليوم
          </button>
          <button onClick={() => setShowToast(false)} style={s.closeToast}>✕</button>
        </div>
      )}

      {/* الهيدر */}
      <header style={s.header}>
        <div style={s.headerContent}>
          <div style={s.headerLeft}>
            <div style={s.logoWrapper}>
              {userData?.logoUrl ? <img src={userData.logoUrl} alt="Logo" style={s.logo} /> : <span style={{ fontSize: 28 }}>{Icons.scale}</span>}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={s.officeName}>{officeName || "مكتب المحاماة"}</h1>
              <p style={s.welcomeText}>أهلاً بك يا {userData?.name || "زميلي"} · {formatDate(today)}</p>
            </div>
          </div>
          {!isMobile && (
            <div style={s.headerActions}>
              <button style={s.addCaseBtn} onClick={() => navigate("/add-case")}
                onMouseEnter={e => btnHover(e, theme.currentAccent.light)} onMouseLeave={e => btnLeave(e, theme.currentAccent.main)}>
                <span>{Icons.add}</span> إضافة قضية
              </button>
              <button style={s.addClientBtn} onClick={() => navigate("/clients/add")}
                onMouseEnter={e => btnHover(e, theme.colors.bg.hover)} onMouseLeave={e => btnLeave(e, theme.colors.bg.card)}>
                <span>{Icons.person}</span> إضافة موكل
              </button>
            </div>
          )}
        </div>
        <div style={s.statsBar}>
          <StatItem s={s} icon={Icons.book} label="القضايا" value={stats.total} />
          <StatItem s={s} icon="●" label="نشطة" value={stats.active} color={s.cs.active.text} />
          <StatItem s={s} icon="●" label="تنفيذ" value={stats.execution} color={s.cs.execution.text} />
          <StatItem s={s} icon="●" label="منتهية" value={stats.closed} color={s.cs.closed.text} />
          {stats.urgent > 0 && <StatItem s={s} icon={Icons.warning} label="عاجلة" value={stats.urgent} color={s.cs.urgent.text} isUrgent />}
        </div>
      </header>

      {isMobile && (
        <div style={s.mobileActions}>
          <button style={s.mobileAddCaseBtn} onClick={() => navigate("/add-case")}><span>{Icons.add}</span> إضافة قضية</button>
          <button style={s.mobileAddClientBtn} onClick={() => navigate("/clients/add")}><span>{Icons.person}</span> إضافة موكل</button>
        </div>
      )}

      {/* البحث والفلاتر */}
      <div style={s.controlsSection}>
        <div style={s.searchWrapper}>
          <span style={s.searchIcon}>{Icons.search}</span>
          <input placeholder="ابحث برقم السجل، المحكمة، الموكل، أو التاريخ (YYYY-MM-DD)..."
            value={search} onChange={e => setSearch(e.target.value)} style={s.search} />
        </div>
        <div style={s.filters}>
          {[{ key: "ALL", label: "الكل" }, { key: CASE_STATUS.ACTIVE, label: "نشطة" },
            { key: CASE_STATUS.EXECUTION, label: "تنفيذ" }, { key: CASE_STATUS.CLOSED, label: "منتهية" }]
            .map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                style={statusFilter === f.key ? s.activeFilter : s.filterBtn}>{f.label}</button>
            ))}
        </div>
      </div>

      {/* شبكة القضايا */}
      <div className="dashboard-grid" style={s.grid}>
        {sortedCases.map(c => {
          const upcomingSession = getUpcomingSession(c.sessions);
          const upcoming = upcomingSession?.parsedDate || null;
          const upcomingTitle = getSessionTitle(upcomingSession);
          const previous = getPreviousSessionDate(c.sessions);
          const urgent = isUrgent(upcoming);
          const clientNames = Array.isArray(c.clients)
            ? c.clients.map(ci => clientNamesCache[typeof ci === "object" ? ci.id : ci]).filter(Boolean).join("، ")
            : "";
          const lv = levelDataCache[c.id] || {};
          return (
            <div key={c.id} style={{ ...s.card, ...(urgent ? s.cardUrgent : {}) }}
              onClick={() => navigate(`/case/${c.id}`)}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = theme.shadows.md; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = theme.shadows.sm; }}>
              <div style={{ ...s.cardTopBar, background: urgent ? s.cs.urgent.text : theme.currentAccent.main }} />
              <div className="dashboard-case-content" style={s.cardContent}>
                <div style={s.cardHeader}>
                  <h3 style={s.caseNumber}>
                    {Icons.gavel} ق رقم: {c.caseSerial || c.caseNumber || lv.caseNumber || "-"} / {c.caseYear || lv.caseYear || "-"}
                    {c.currentLevel && <span style={s.levelChip}>{getLitigationLevelLabel(c.currentLevel)}</span>}
                  </h3>
                  {statusBadge(getCaseStatus(c))}
                </div>
                {urgent && (
                  <div style={s.urgentBanner}>
                    <span>{Icons.warning}</span> جلسة عاجلة — {formatDate(upcoming)}
                  </div>
                )}
                <div style={s.caseInfo}>
                  <Row s={s} icon={Icons.person} label="الموكل" value={clientNames || "..."} />
                  <Row s={s} icon={Icons.building} label="المحكمة" value={c.court || lv.court || "-"} />
                  <Row s={s} icon="⚡" label="الدائرة" value={c.circuit || lv.circuit || "-"} />
                </div>
                <div style={s.datesBox}>
                  <DateRow s={s} icon={Icons.calendar} label="الجلسة القادمة" date={upcoming} title={upcomingTitle} urgent={urgent} />
                  {previous && <DateRow s={s} icon={Icons.clock} label="الجلسة السابقة" date={previous} past />}
                </div>
                <div style={s.cardActions}>
                  <button style={s.viewBtn} onClick={e => { e.stopPropagation(); navigate(`/case/${c.id}`); }}>{Icons.view} فتح الملف</button>
                  <button style={s.editBtn} onClick={e => { e.stopPropagation(); navigate(`/edit/${c.id}`); }}>{Icons.edit} تعديل</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!sortedCases.length && (
        <div style={s.emptyState}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{Icons.book}</div>
          <h3 style={{ color: theme.colors.text.primary, margin: "0 0 8px" }}>{debouncedSearch ? "لا توجد نتائج مطابقة" : "لا توجد قضايا"}</h3>
          <p style={{ margin: 0 }}>{debouncedSearch ? "جرب البحث بكلمات مختلفة" : "اضغط على 'إضافة قضية' لإضافة أول قضية"}</p>
        </div>
      )}
    </div>
  );
}

// ── مكونات مساعدة ──
function StatItem({ s, icon, label, value, color, isUrgent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10,
      background: isUrgent ? s.cs.urgent.bg : s.chipBg,
      border: isUrgent ? `1px solid ${s.cs.urgent.border}` : "1px solid transparent",
    }}>
      <span style={{ fontSize: 14, color: color || s.levelChip.color, fontWeight: isUrgent ? "bold" : "normal" }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: isUrgent ? s.cs.urgent.text : s.caseNumber.color }}>{value}</span>
        <span style={{ fontSize: 11, color: s.dateLabel.color, fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

function Row({ s, icon, label, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoIcon}>{icon}</span>
      <span style={s.infoLabel}>{label}:</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  );
}

function DateRow({ s, icon, label, date, title, urgent, past }) {
  const valueStyle = {
    ...s.dateValue,
    ...(urgent ? { color: s.cs.urgent.text, fontWeight: 700 } : {}),
    ...(past ? { color: s.dateLabel.color } : {}),
  };

  return (
    <div style={{ ...s.dateRow, ...(urgent ? s.dateRowUrgent : {}), ...(past ? s.dateRowPast : {}) }}>
      <span style={s.dateIcon}>{icon}</span>
      <div style={s.dateContent}>
        <div style={s.datePrimary}>
          <span style={s.dateLabel}>{label}:</span>
          <span style={valueStyle}>{date ? formatDate(date) : "لا يوجد"}</span>
        </div>
        {title && (
          <div style={s.dateTitle} title={title}>{title}</div>
        )}
      </div>
    </div>
  );
}

// ✅ التنسيق التجاوُبي
const responsiveStyles = `
  @media (max-width: 768px) {
    .dashboard-stats-bar { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
    .dashboard-stats-bar > div { justify-content: center !important; }
    .dashboard-grid { grid-template-columns: minmax(0, 1fr) !important; }
    .dashboard-case-content { padding: 16px !important; }
  }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`;
if (typeof document !== "undefined") {
  const el = document.createElement("style");
  el.innerText = responsiveStyles;
  document.head.appendChild(el);
}