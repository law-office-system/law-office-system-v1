import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  Landmark, Edit3, Calendar, Users, Shield, FileText,
  Clock, MapPin, ChevronDown, Gavel, Briefcase,
  DollarSign, ArrowLeft, Sparkles, Scale, AlertTriangle,
  RotateCcw
} from "lucide-react";
import {
  doc, onSnapshot, getDoc, updateDoc, collection,
  query, where, getDocs, addDoc
} from "firebase/firestore";
import AdminTaskForm from "../components/case/AdminTaskForm";
import AdminTasksSection from "../components/case/AdminTasksSection";
import DecisionForm from "../components/case/DecisionForm";
import JudgmentForm from "../components/case/JudgmentForm";
import JudgmentsSection from "../components/case/JudgmentsSection";
import SessionForm from "../components/case/SessionForm";
import SessionsTimeline from "../components/case/SessionsTimeline";
import CreateNextLevelButton from "../components/case/CreateNextLevelButton";
import { CASE_STATUS_LIST } from "../constants/caseStatus";
import {
  getLitigationLevelLabel,
  getLitigationLevelColor,
  getWorkflowStatusLabel,
  getWorkflowStatusColor,
} from "../constants/caseStatusLabels";
import { useLitigationLevels } from "../hooks/useLitigationLevels";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

const DECISION_STAGE_MAP = {
  adjourned:       { stageLabel: 'مؤجلة',        color: '#f59e0b' },
  adjourned_notice:{ stageLabel: 'مؤجلة لإعلان', color: '#f97316' },
  judgment:        { stageLabel: 'حُكمت',        color: '#10b981' },
  referred:        { stageLabel: 'محالة',        color: '#3b82f6' },
  absence:         { stageLabel: 'غياب',         color: '#ef4444' },
  expert:          { stageLabel: 'معينة خبير',   color: '#8b5cf6' },
  settlement:      { stageLabel: 'مسوّاة',       color: '#14b8a6' },
};

const getStatusLabel = (status) => {
  const found = CASE_STATUS_LIST.find(s => s.value === status);
  return found ? found.label : (status || "غير محدد");
};

const ADMIN_ROLES = ["admin", "superadmin"];
const isAdminRole = (role) => ADMIN_ROLES.includes(role);

const normalizeDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'object' && dateValue?.toDate) {
    return dateValue.toDate();
  }
  if (dateValue instanceof Date) return dateValue;
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (dateValue) => {
  const date = normalizeDate(dateValue);
  return date ? date.toLocaleDateString('ar-EG') : '-';
};

const sortSessionsByDate = (sessions) => {
  return [...sessions].sort((a, b) => {
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB - dateA;
  });
};

const validateTenant = (caseTenantId, userTenantId) => {
  if (!caseTenantId) return true;
  if (caseTenantId !== userTenantId) {
    throw new Error("Unauthorized: Tenant mismatch. Access denied.");
  }
  return true;
};

function CollapsibleSection({ title, icon: Icon, iconColor = "#60a5fa", defaultOpen = false, children, style = {} }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
      borderRadius: 16, marginBottom: 16, overflow: "hidden", ...style,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "clamp(12px, 4vw, 20px)",
        background: "transparent", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "#f3f4f6", fontFamily: "inherit",
      }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700 }}>
          <Icon size={20} color={iconColor} strokeWidth={2.5} /> {title}
        </h2>
        <ChevronDown size={20} color="#9ca3af" style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease",
        }} />
      </button>
      <div style={{
        maxHeight: open ? "20000px" : "0px", opacity: open ? 1 : 0,
        overflow: "hidden", transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ padding: "0 clamp(12px, 4vw, 24px) clamp(16px, 4vw, 24px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, title, value, color = "#60a5fa", badge = null }) {
  const displayValue = value != null && value !== '' ? value : "-";
  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(55, 65, 81, 0.3)",
      borderRadius: 12, padding: "clamp(10px, 3vw, 14px)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: color + "15",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 3 }}>{title}</div>
        <div style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "clamp(12px, 3.5vw, 14px)", wordBreak: "break-word" }}>
          {displayValue}
        </div>
        {badge && (
          <div style={{
            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", background: badge.bg, color: badge.color,
            borderRadius: 20, fontSize: 10, fontWeight: 700, border: `1px solid ${badge.border}`,
          }}>
            <Sparkles size={9} /> {badge.text}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowBanner({ lastSession }) {
  if (!lastSession?.suggestedStage) return null;
  const meta = DECISION_STAGE_MAP[lastSession.suggestedStage];
  if (!meta) return null;
  return (
    <div style={{
      background: `${meta.color}10`, border: `1px solid ${meta.color}25`,
      borderRadius: 12, padding: "12px 16px", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: `${meta.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Scale size={18} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, marginBottom: 2 }}>
          المرحلة الحالية: {meta.stageLabel}
        </div>
        <div style={{ fontSize: 12, color: "#d1d5db" }}>
          بناءً على قرار الجلسة الأخيرة ({lastSession.decisionLabel || lastSession.decisionType})
          {lastSession.suggestedTask ? ` — المهمة: ${lastSession.suggestedTask}` : ''}
        </div>
      </div>
      {lastSession.suggestedTask && (
        <div style={{
          padding: "4px 12px", background: `${meta.color}12`, color: meta.color,
          borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1px solid ${meta.color}20`,
          whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
        }}>
          <Briefcase size={11} /> {lastSession.suggestedTask}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      padding: 40, textAlign: "center", color: "#9ca3af",
      minHeight: "100vh", background: "#0f172a", direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 40, height: 40,
        border: "3px solid rgba(30, 64, 175, 0.2)",
        borderTopColor: "#1e40af",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        margin: "0 auto 16px",
      }} />
      <p style={{ fontSize: 16, margin: 0 }}>جاري تحميل ملف الدعوى...</p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      padding: 40, textAlign: "center", color: "#ef4444",
      minHeight: "100vh", background: "#0f172a", direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <Shield size={48} style={{ margin: "0 auto 12px", opacity: 0.8 }} />
      <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px 0" }}>حدث خطأ</p>
      <p style={{ fontSize: 14, color: "#d1d5db", margin: "0 0 20px 0" }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: "10px 20px", background: "#1e40af", color: "#fff",
          border: "none", borderRadius: 10, cursor: "pointer",
          fontFamily: "inherit", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <RotateCcw size={16} /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export default function CaseDetails() {
  const { id } = useParams();
  const { userData } = useAuth();
  const [searchParams] = useSearchParams();
  const abortControllerRef = useRef(null);
  const unsubscribersRef = useRef([]);

  const {
    levels,
    activeLevel,
    loading: levelsLoading,
    createNextLevel,
  } = useLitigationLevels(id);

  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [clients, setClients] = useState([]);
  const [judgments, setJudgments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showJudgmentForm, setShowJudgmentForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormSession, setTaskFormSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [linkedSessionForJudgment, setLinkedSessionForJudgment] = useState(null);
  const [linkedSessionForDecision, setLinkedSessionForDecision] = useState(null);
  const [activeTab, setActiveTab] = useState("sessions");

  const isAdmin = useMemo(() => isAdminRole(userData?.role), [userData?.role]);
  const canViewFinance = useMemo(() => 
    ["admin", "staff", "superadmin"].includes(userData?.role), 
    [userData?.role]
  );

  const selectedLevel = useMemo(() => {
    if (selectedLevelId) {
      return levels.find(l => l.id === selectedLevelId) || null;
    }
    return activeLevel || levels[0] || null;
  }, [levels, selectedLevelId, activeLevel]);

  useEffect(() => {
    if (activeLevel && !selectedLevelId) {
      setSelectedLevelId(activeLevel.id);
    }
  }, [activeLevel, selectedLevelId]);

  useEffect(() => {
    if (!id) {
      setError("معرف القضية غير موجود");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const caseRef = doc(db, "cases", id);
    const unsub = onSnapshot(
      caseRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          try {
            validateTenant(data.tenantId, userData?.tenantId);
          } catch (err) {
            setError(err.message);
            setLoading(false);
            return;
          }

          const sessionsWithId = (data.sessions || []).map(s => ({
            ...s,
            id: s.id || crypto.randomUUID(),
            decisionDetails: s.decisionDetails || s.decision || '',
            decisionType: s.decisionType || 'pending',
            levelId: s.levelId || activeLevel?.id || null,
          }));

          setCaseData({
            id: snap.id,
            ...data,
            sessions: sessionsWithId,
            clients: data.clients || [],
            opponents: data.opponents || [],
          });
        } else {
          setCaseData(null);
          setError("هذه القضية غير موجودة في النظام");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading case:", err);
        setError("حدث خطأ أثناء تحميل بيانات القضية");
        setLoading(false);
      }
    );

    unsubscribersRef.current.push(unsub);
    return () => {
      unsub();
      unsubscribersRef.current = unsubscribersRef.current.filter(u => u !== unsub);
    };
  }, [id, userData?.tenantId, activeLevel?.id]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchClients = async () => {
      if (!caseData?.clients?.length) {
        setClients([]);
        return;
      }

      try {
        const result = await Promise.all(
          caseData.clients.map(async (clientItem) => {
            if (controller.signal.aborted) return null;
            const clientId = typeof clientItem === "object" ? clientItem.id : clientItem;
            const clientRole = typeof clientItem === "object" ? clientItem.clientRole : "موكل (غير محدد)";
            
            try {
              const snap = await getDoc(doc(db, "clientProfiles", clientId));
              if (!snap.exists()) return null;
              return { id: snap.id, ...snap.data(), currentCaseRole: clientRole };
            } catch (err) {
              console.warn(`Failed to load client ${clientId}:`, err);
              return null;
            }
          })
        );

        if (!controller.signal.aborted) {
          setClients(result.filter(Boolean));
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Error fetching clients:", err);
        }
      }
    };

    fetchClients();
    return () => controller.abort();
  }, [caseData?.clients]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "judgments"), where("caseId", "==", id));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setJudgments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.error("Error loading judgments:", err);
      }
    );

    unsubscribersRef.current.push(unsub);
    return () => {
      unsub();
      unsubscribersRef.current = unsubscribersRef.current.filter(u => u !== unsub);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "adminTasks"), where("caseId", "==", id));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.error("Error loading tasks:", err);
      }
    );

    unsubscribersRef.current.push(unsub);
    return () => {
      unsub();
      unsubscribersRef.current = unsubscribersRef.current.filter(u => u !== unsub);
    };
  }, [id]);

  useEffect(() => {
    const action = searchParams.get("action");
    const sessionDate = searchParams.get("sessionDate");
    if (action === "recordDecision" && caseData?.sessions?.length > 0) {
      const sortedSessions = sortSessionsByDate(caseData.sessions);
      const target = sortedSessions.find(s => {
        const sDate = normalizeDate(s.nextSessionDate || s.date);
        const paramDate = sessionDate ? new Date(sessionDate) : null;
        return sDate && paramDate && sDate.toDateString() === paramDate.toDateString();
      });
      if (target) {
        setEditingSession(target);
        setShowSessionForm(true);
      }
    }
  }, [searchParams, caseData?.sessions]);

  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSessionForm(false);
        setShowDecisionForm(false);
        setShowJudgmentForm(false);
        setShowTaskForm(false);
        setEditingSession(null);
        setLinkedSessionForJudgment(null);
        setLinkedSessionForDecision(null);
        setTaskFormSession(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const safeSessions = useMemo(() => caseData?.sessions || [], [caseData?.sessions]);
  const safeClients = useMemo(() => caseData?.clients || [], [caseData?.clients]);
  const safeOpponents = useMemo(() => caseData?.opponents || [], [caseData?.opponents]);

  const levelSessions = useMemo(() => {
    if (!selectedLevel) return [];
    return safeSessions.filter(s => {
      if (s.levelId) {
        return s.levelId === selectedLevel.id;
      }
      if (!activeLevel) {
        return selectedLevel.id === (levels[0]?.id || selectedLevel.id);
      }
      return selectedLevel.id === activeLevel.id;
    });
  }, [safeSessions, selectedLevel, activeLevel, levels]);

  const levelJudgments = useMemo(() => {
    if (!selectedLevel) return [];
    return judgments.filter(j => {
      if (j.levelId) return j.levelId === selectedLevel.id;
      if (!activeLevel) return true;
      return selectedLevel.id === activeLevel.id;
    });
  }, [judgments, selectedLevel, activeLevel]);

  const levelTasks = useMemo(() => {
    if (!selectedLevel) return [];
    return tasks.filter(t => {
      if (t.levelId) return t.levelId === selectedLevel.id;
      if (!activeLevel) return true;
      return selectedLevel.id === activeLevel.id;
    });
  }, [tasks, selectedLevel, activeLevel]);

  const sortedLevelSessions = useMemo(() => sortSessionsByDate(levelSessions), [levelSessions]);

  const lastSession = useMemo(() => {
    return sortedLevelSessions.length > 0 ? sortedLevelSessions[0] : null;
  }, [sortedLevelSessions]);

  const tasksBySession = useMemo(() => {
    const map = {};
    levelTasks.forEach(t => {
      const sid = t.sessionId;
      if (sid) {
        if (!map[sid]) map[sid] = [];
        map[sid].push(t);
      }
    });
    return map;
  }, [levelTasks]);

  const judgmentsBySession = useMemo(() => {
    const map = {};
    levelJudgments.forEach(j => {
      const sid = j.sessionId;
      if (sid) {
        if (!map[sid]) map[sid] = [];
        map[sid].push(j);
      }
    });
    return map;
  }, [levelJudgments]);

  const handleCreateNextLevel = useCallback(async (levelData) => {
    if (!activeLevel) return;
    try {
      await createNextLevel(activeLevel.id, levelData);
    } catch (error) {
      console.error("Error creating next level:", error);
      setError("حدث خطأ أثناء إنشاء درجة التقاضي الجديدة");
    }
  }, [activeLevel, createNextLevel]);

  const handleSaveSession = useCallback(async (formData) => {
    try {
      const now = new Date().toISOString();
      const baseSession = editingSession || {};
      
      const sessionData = {
        ...baseSession,
        id: baseSession.id || crypto.randomUUID(),
        title: formData.title,
        date: formData.date,
        nextSessionDate: formData.nextSessionDate || formData.date,
        time: formData.time,
        location: formData.location,
        roll: formData.roll,
        description: formData.description,
        notes: formData.notes,
        attachments: formData.attachments || [],
        decisionType: formData.decisionType || 'pending',
        decisionDetails: formData.decisionDetails || '',
        decisionDate: formData.decisionDate || formData.date,
        decisionLabel: formData.decisionLabel || '',
        suggestedStage: formData.suggestedStage || '',
        suggestedTask: formData.suggestedTask || '',
        stageLabel: formData.stageLabel || '',
        levelId: selectedLevel?.id || activeLevel?.id || null,
        createdAt: baseSession.createdAt || now,
        createdBy: baseSession.createdBy || userData?.uid || null,
        updatedAt: now,
      };

      if (formData.decisionType === 'judgment') {
        sessionData.judgmentType = formData.judgmentType;
        sessionData.judgmentSummary = formData.judgmentSummary;
        sessionData.judgmentAppealable = formData.judgmentAppealable;
        sessionData.appealDeadline = formData.appealDeadline;
      }

      let updatedSessions;
      if (editingSession) {
        updatedSessions = safeSessions.map(s => s.id === editingSession.id ? sessionData : s);
      } else {
        updatedSessions = [...safeSessions, sessionData];
      }

      await updateDoc(doc(db, "cases", id), { sessions: updatedSessions });

      if (!editingSession && sessionData.suggestedTask) {
        try {
          await addDoc(collection(db, "adminTasks"), {
            caseId: id,
            sessionId: sessionData.id,
            title: sessionData.suggestedTask,
            description: `مهمة تلقائية من جلسة: ${sessionData.title}`,
            status: 'pending',
            priority: 'high',
            levelId: selectedLevel?.id || activeLevel?.id || null,
            createdAt: now,
            createdBy: userData?.uid || null,
            tenantId: caseData?.tenantId || userData?.tenantId || '',
          });
        } catch (taskErr) {
          console.error("Error creating auto-task:", taskErr);
        }
      }

      setShowSessionForm(false);
      setEditingSession(null);
    } catch (err) {
      console.error("Error saving session:", err);
      setError("حدث خطأ أثناء حفظ الجلسة. يرجى المحاولة مرة أخرى.");
    }
  }, [editingSession, safeSessions, id, selectedLevel, activeLevel, userData, caseData]);

  const handleDeleteSession = useCallback(async (sessionId) => {
    if (!window.confirm("هل تريد حذف هذه الجلسة وكل ما يتعلق بها نهائياً؟")) return;
    try {
      const updated = safeSessions.filter(s => s.id !== sessionId);
      await updateDoc(doc(db, "cases", id), { sessions: updated });
    } catch (err) {
      console.error("Error deleting session:", err);
      setError("حدث خطأ أثناء حذف الجلسة");
    }
  }, [safeSessions, id]);

  const handleEditSession = useCallback((session) => {
    setEditingSession(session);
    setShowSessionForm(true);
  }, []);

  const handleAddSession = useCallback(() => {
    setEditingSession(null);
    setShowSessionForm(true);
  }, []);

  const handleAddDecision = useCallback((session) => {
    setLinkedSessionForDecision(session);
    setShowDecisionForm(true);
  }, []);

  const handleSaveDecision = useCallback(async (decisionData) => {
    if (!linkedSessionForDecision) return;
    try {
      await addDoc(collection(db, "decisions"), {
        ...decisionData,
        caseId: id,
        sessionId: linkedSessionForDecision.id,
        sessionTitle: linkedSessionForDecision.title,
        sessionDate: linkedSessionForDecision.date,
        levelId: selectedLevel?.id || activeLevel?.id || null,
        createdAt: new Date().toISOString(),
        createdBy: userData?.uid || null,
        tenantId: caseData?.tenantId || userData?.tenantId || '',
      });
      setShowDecisionForm(false);
      setLinkedSessionForDecision(null);
    } catch (err) {
      console.error("Error saving decision:", err);
      setError("حدث خطأ أثناء حفظ القرار");
    }
  }, [linkedSessionForDecision, id, selectedLevel, activeLevel, userData, caseData]);

  const handleAddJudgmentFromSession = useCallback((session) => {
    setLinkedSessionForJudgment(session);
    setShowJudgmentForm(true);
  }, []);

  const handleSaveJudgment = useCallback(async (judgmentData) => {
    try {
      await addDoc(collection(db, "judgments"), {
        ...judgmentData,
        caseId: id,
        sessionId: linkedSessionForJudgment?.id || null,
        sessionTitle: linkedSessionForJudgment?.title || '',
        sessionDate: linkedSessionForJudgment?.date || '',
        levelId: selectedLevel?.id || activeLevel?.id || null,
        createdAt: new Date().toISOString(),
        createdBy: userData?.uid || null,
        tenantId: caseData?.tenantId || userData?.tenantId || '',
      });
      setShowJudgmentForm(false);
      setLinkedSessionForJudgment(null);
    } catch (err) {
      console.error("Error saving judgment:", err);
      setError("حدث خطأ أثناء حفظ الحكم");
    }
  }, [linkedSessionForJudgment, id, selectedLevel, activeLevel, userData, caseData]);

  const handleAddTaskFromSession = useCallback((session) => {
    setTaskFormSession(session);
    setShowTaskForm(true);
  }, []);

  const handleAddTask = useCallback(() => {
    setTaskFormSession(null);
    setShowTaskForm(true);
  }, []);

  const handleCloseTaskForm = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormSession(null);
  }, []);

  const handleSaveTask = useCallback(async (taskData) => {
    try {
      await addDoc(collection(db, "adminTasks"), {
        ...taskData,
        caseId: id,
        levelId: selectedLevel?.id || activeLevel?.id || null,
        createdAt: new Date().toISOString(),
        createdBy: userData?.uid || null,
        tenantId: caseData?.tenantId || userData?.tenantId || '',
      });
      setShowTaskForm(false);
      setTaskFormSession(null);
    } catch (err) {
      console.error("Error saving task:", err);
      setError("حدث خطأ أثناء حفظ المهمة");
    }
  }, [id, selectedLevel, activeLevel, userData, caseData]);

  if (loading || levelsLoading) {
    return <LoadingState />;
  }

  if (error && !caseData) {
    return <ErrorState message={error} />;
  }

  if (!caseData) {
    return (
      <div style={{
        padding: 40, textAlign: "center", color: "#ef4444",
        minHeight: "100vh", background: "#0f172a", direction: "rtl"
      }}>
        <Shield size={48} style={{ margin: "0 auto 12px" }} />
        هذه القضية غير موجودة بالنظام
      </div>
    );
  }

  const selectedLevelLabel = selectedLevel ? getLitigationLevelLabel(selectedLevel.levelType) : "غير محدد";
  const selectedLevelColor = selectedLevel ? getLitigationLevelColor(selectedLevel.levelType) : "#3b82f6";
  const selectedStatusLabel = selectedLevel ? getWorkflowStatusLabel(selectedLevel.status) : "غير محدد";
  const selectedStatusColor = selectedLevel ? getWorkflowStatusColor(selectedLevel.status) : "#6b7280";

  const tabs = [
    { key: "sessions", label: "سير الدعوى", count: levelSessions.length, icon: Calendar },
    { key: "judgments", label: "الأحكام", count: levelJudgments.length, icon: Gavel },
    { key: "admin", label: "الأعمال الإدارية", count: levelTasks.length, icon: Briefcase },
  ];

  const getStatusStyle = (status) => {
    const styles = {
      ACTIVE: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)", dot: "#10b981" },
      CLOSED: { bg: "rgba(107, 114, 128, 0.15)", color: "#6b7280", border: "rgba(107, 114, 128, 0.3)", dot: "#6b7280" },
    };
    return styles[status] || { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.3)", dot: "#f59e0b" };
  };

  const statusStyle = getStatusStyle(caseData.status);

  return (
    <div style={{
      padding: "clamp(8px, 3vw, 24px)",
      background: "#0f172a",
      minHeight: "100vh",
      direction: "rtl",
      fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
    }}>
      {/* Error Toast */}
      {error && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#ef4444", color: "#fff", padding: "12px 24px",
          borderRadius: 12, zIndex: 999999, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(239, 68, 68, 0.3)",
          animation: "slideDown 0.3s ease",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ========== HEADER ========== */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 20,
        padding: "clamp(16px, 4vw, 28px)",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 200, height: 200,
          background: "radial-gradient(circle, rgba(30, 64, 175, 0.15) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "clamp(12px, 3vw, 20px)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{
            width: "clamp(48px, 10vw, 64px)",
            height: "clamp(48px, 10vw, 64px)",
            background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
            borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(30, 64, 175, 0.3)",
            flexShrink: 0,
            border: "1px solid rgba(96, 165, 250, 0.2)",
          }}>
            <Landmark color="#fbbf24" size={28} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              flexWrap: "wrap", marginBottom: 8,
            }}>
              <h1 style={{
                margin: 0, fontSize: "clamp(18px, 5vw, 26px)",
                color: "#f8fafc", fontWeight: 800,
                letterSpacing: "-0.5px",
              }}>
                ملف القضية رقم {caseData.caseSerial}
              </h1>
              <span style={{
                background: "rgba(96, 165, 250, 0.12)",
                color: "#60a5fa",
                border: "1px solid rgba(96, 165, 250, 0.25)",
                padding: "4px 12px", borderRadius: 20,
                fontSize: "clamp(11px, 3vw, 13px)", fontWeight: 600,
              }}>
                {caseData.caseType || "دعوى"}
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 16px)",
              flexWrap: "wrap",
            }}>
              <span style={{
                background: statusStyle.bg, color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`,
                padding: "5px 14px", borderRadius: 20,
                fontSize: "clamp(11px, 3vw, 13px)", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: statusStyle.dot,
                  boxShadow: `0 0 8px ${statusStyle.dot}`,
                }} />
                {getStatusLabel(caseData.status)}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "clamp(12px, 3.5vw, 14px)" }}>
                سنة {caseData.caseYear || "-"}
              </span>
              <span style={{ color: "#475569" }}>|</span>
              <span style={{ color: "#94a3b8", fontSize: "clamp(12px, 3.5vw, 14px)", display: "flex", alignItems: "center", gap: 5 }}>
                <Users size={14} /> {safeClients.length} موكل
              </span>
              <span style={{ color: "#94a3b8", fontSize: "clamp(12px, 3.5vw, 14px)", display: "flex", alignItems: "center", gap: 5 }}>
                <Shield size={14} /> {safeOpponents.length} خصم
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== CLIENTS ========== */}
      <CollapsibleSection title="الموكلون" icon={Users} iconColor="#10b981" defaultOpen={false}>
        {safeClients.length === 0 ? (
          <p style={{ color: "#d1d5db", textAlign: "center", padding: "20px 0" }}>لا يوجد موكلون مرتبطون.</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(250px, 70vw, 280px)), 1fr))",
            gap: 10,
          }}>
            {clients.map(c => (
              <div key={c.id} style={{
                padding: "clamp(10px, 3vw, 16px)", background: "rgba(15, 23, 42, 0.5)",
                borderRadius: 12, border: "1px solid rgba(55, 65, 81, 0.3)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "clamp(13px, 4vw, 15px)" }}>{c.fullName}</div>
                <div style={{ color: "#d1d5db", fontSize: "clamp(11px, 3vw, 13px)" }}>الرقم القومي: {c.nationalId || "غير مسجل"}</div>
                <span style={{
                  background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee",
                  padding: "4px 12px", borderRadius: 8,
                  fontSize: "clamp(10px, 3vw, 12px)", fontWeight: 600, alignSelf: "flex-start",
                }}>الصفة: {c.currentCaseRole || "غير محددة"}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ========== OPPONENTS ========== */}
      <CollapsibleSection title="أطراف الخصوم" icon={Shield} iconColor="#ef4444" defaultOpen={false}>
        {safeOpponents.length === 0 ? (
          <p style={{ color: "#d1d5db", textAlign: "center", padding: "20px 0" }}>لا يوجد خصوم مسجلين.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {safeOpponents.map((o, i) => (
              <div key={o.id || i} style={{
                padding: "clamp(10px, 3vw, 16px)", background: "rgba(15, 23, 42, 0.5)",
                borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.2)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "clamp(13px, 4vw, 15px)" }}>
                    {i + 1}. {o.name}
                  </div>
                  <span style={{
                    background: "rgba(239, 68, 68, 0.15)", color: "#f87171",
                    padding: "3px 10px", borderRadius: 6,
                    fontSize: "clamp(10px, 3vw, 12px)", fontWeight: 600, alignSelf: "flex-start",
                  }}>الصفة: {o.caseRole || "مدعى عليه"}</span>
                  {o.address && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 3vw, 13px)", color: "#d1d5db" }}>
                      <MapPin size={13} style={{ display: "inline", marginLeft: 4 }} />{o.address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ========== CASE SUBJECT ========== */}
      <CollapsibleSection title="موضوع الدعوى" icon={FileText} iconColor="#8b5cf6" defaultOpen={false}>
        <p style={{
          whiteSpace: "pre-wrap", lineHeight: 1.7,
          color: "#d1d5db", fontSize: "clamp(13px, 3.5vw, 14px)", margin: 0
        }}>
          {caseData.caseSubject || caseData.notes || "لم يتم تدوين موضوع أو ملخص لهذه الدعوى بعد."}
        </p>
      </CollapsibleSection>

      {/* ========== DIVIDER ========== */}
      <div style={{ height: 2, background: "rgba(55, 65, 81, 0.5)", margin: "24px 0", borderRadius: 1 }} />

      {/* ========== LEVEL SELECTOR ========== */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12,
        }}>
          <h2 style={{
            color: "#f3f4f6", fontSize: "clamp(14px, 4vw, 18px)",
            fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Landmark size={20} color="#fbbf24" />
            اختر درجة التقاضي
          </h2>
          {isAdmin && activeLevel && (
            <CreateNextLevelButton
              currentLevel={activeLevel}
              onCreateLevel={handleCreateNextLevel}
              loading={levelsLoading}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {levels.map(level => {
            const isSelected = selectedLevel?.id === level.id;
            const lvlColor = getLitigationLevelColor(level.levelType);
            const lvlLabel = getLitigationLevelLabel(level.levelType);
            const wfLabel = getWorkflowStatusLabel(level.status);
            return (
              <button
                key={level.id}
                onClick={() => setSelectedLevelId(level.id)}
                style={{
                  padding: "10px 18px", borderRadius: 12, cursor: "pointer",
                  border: isSelected ? `2px solid ${lvlColor}` : "1px solid rgba(55, 65, 81, 0.5)",
                  background: isSelected ? `${lvlColor}15` : "#1e293b",
                  color: isSelected ? lvlColor : "#d1d5db",
                  fontFamily: "inherit", fontWeight: isSelected ? 700 : 500,
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s ease", whiteSpace: "nowrap",
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: level.isActive ? "#10b981" : "#6b7280",
                }} />
                {lvlLabel}
                <span style={{
                  background: isSelected ? `${lvlColor}25` : "rgba(55, 65, 81, 0.5)",
                  color: isSelected ? lvlColor : "#9ca3af",
                  padding: "2px 8px", borderRadius: 8, fontSize: 11,
                }}>
                  {wfLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== LEVEL INFO ========== */}
      {selectedLevel && (
        <>
          <WorkflowBanner lastSession={lastSession} />

          <div style={{
            background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 16, padding: "clamp(12px, 4vw, 24px)", marginBottom: 20,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16,
            }}>
              <div>
                <h3 style={{
                  margin: 0, color: "#f3f4f6",
                  fontSize: "clamp(15px, 4.5vw, 20px)", fontWeight: 700,
                }}>
                  {selectedLevelLabel} — القضية رقم {selectedLevel.caseNumber}
                </h3>
                <p style={{ margin: "6px 0 0 0", color: "#d1d5db", fontSize: "clamp(12px, 3.5vw, 14px)" }}>
                  سنة {selectedLevel.caseYear} — {selectedLevel.court}
                  {selectedLevel.circuit ? ` — ${selectedLevel.circuit}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  background: `${selectedStatusColor}12`, color: selectedStatusColor,
                  border: `1px solid ${selectedStatusColor}25`,
                  padding: "4px 14px", borderRadius: 20, fontWeight: 700,
                  fontSize: "clamp(11px, 3vw, 13px)", whiteSpace: "nowrap",
                }}>
                  {selectedStatusLabel}
                </span>
                {selectedLevel.isActive && (
                  <span style={{
                    background: "rgba(16, 185, 129, 0.15)", color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "4px 14px", borderRadius: 20, fontWeight: 700,
                    fontSize: "clamp(11px, 3vw, 13px)", whiteSpace: "nowrap",
                  }}>
                    الدرجة النشطة
                  </span>
                )}
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(clamp(120px, 30vw, 160px), 1fr))",
              gap: "clamp(8px, 2vw, 12px)",
            }}>
              <InfoBox icon={Landmark} title="المحكمة" value={selectedLevel.court} color="#60a5fa" />
              <InfoBox icon={Gavel} title="الدائرة" value={selectedLevel.circuit} color="#8b5cf6" />
              <InfoBox icon={Calendar} title="الجلسات" value={levelSessions.length} color="#d97706" />
              <InfoBox icon={Gavel} title="الأحكام" value={levelJudgments.length} color="#1e40af" />
              <InfoBox icon={Briefcase} title="الأعمال" value={levelTasks.length} color="#f59e0b" />
              <InfoBox icon={FileText} title="رقم القضية" value={`${selectedLevel.caseNumber} لسنة ${selectedLevel.caseYear}`} color="#10b981" />
              {selectedLevel.filingDate && (
                <InfoBox icon={Clock} title="تاريخ الإيداع" value={formatDate(selectedLevel.filingDate)} color="#14b8a6" />
              )}
              {selectedLevel.judgmentDate && (
                <InfoBox icon={AlertTriangle} title="تاريخ الحكم" value={formatDate(selectedLevel.judgmentDate)} color="#ef4444" />
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== TABS ========== */}
      <div style={{
        background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16, padding: "clamp(12px, 4vw, 24px)", marginBottom: 20,
      }}>
        <div style={{
          display: "flex", gap: 4, borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
          marginBottom: 20, flexWrap: "wrap", overflowX: "auto", paddingBottom: 4,
        }}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "clamp(8px, 2.5vw, 12px) clamp(12px, 3vw, 20px)",
                  border: "none",
                  borderBottom: isActive ? "3px solid #1e40af" : "3px solid transparent",
                  background: "transparent", color: isActive ? "#60a5fa" : "#9ca3af",
                  fontWeight: isActive ? 700 : 500, fontSize: "clamp(12px, 3.5vw, 14px)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "inherit", transition: "all 0.2s ease",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <TabIcon size={16} /> {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: isActive ? "#1e40af" : "rgba(55, 65, 81, 0.5)",
                    color: isActive ? "#fff" : "#9ca3af",
                    padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                  }}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "sessions" && (
          levelSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
              <Calendar size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontSize: 16, margin: 0 }}>لا توجد جلسات مسجلة في هذه الدرجة</p>
              {isAdmin && (
                <button onClick={handleAddSession} style={{
                  marginTop: 16, padding: "10px 20px", background: "#1e40af", color: "#fff",
                  border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 600, fontSize: 14,
                }}>
                  + إضافة أول جلسة
                </button>
              )}
            </div>
          ) : (
            <SessionsTimeline
              caseId={id}
              sessions={sortedLevelSessions}
              canEdit={isAdmin}
              canDelete={isAdmin}
              onEdit={handleEditSession}
              onDelete={handleDeleteSession}
              onAddClick={isAdmin ? handleAddSession : null}
              onAddDecision={isAdmin ? handleAddDecision : null}
              onAddJudgment={isAdmin ? handleAddJudgmentFromSession : null}
              onAddTask={isAdmin ? handleAddTaskFromSession : null}
              getLinkedJudgment={(sessionId) => judgmentsBySession[sessionId]?.[0] || null}
              getLinkedTasks={(sessionId) => tasksBySession[sessionId] || []}
            />
          )
        )}

        {activeTab === "judgments" && (
          <JudgmentsSection
            caseId={id}
            judgments={levelJudgments}
            sessions={sortedLevelSessions}
            onAddJudgment={isAdmin ? () => {
              setLinkedSessionForJudgment(null);
              setShowJudgmentForm(true);
            } : null}
          />
        )}

        {activeTab === "admin" && (
          <AdminTasksSection
            caseId={id}
            sessions={sortedLevelSessions}
            tasks={levelTasks}
            onAddTask={isAdmin ? handleAddTask : null}
          />
        )}
      </div>

      {/* ========== QUICK ACTIONS ========== */}
      <div style={{
        background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16, padding: "clamp(12px, 4vw, 24px)", marginBottom: 20,
      }}>
        <h2 style={{
          fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700, color: "#f3f4f6",
          margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 10,
        }}>
          <Briefcase size={20} color="#d97706" />
          إجراءات {selectedLevelLabel}
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(140px, 40vw, 180px)), 1fr))",
          gap: "clamp(8px, 2vw, 12px)",
        }}>
          <button onClick={handleAddSession} style={{
            width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
            background: "rgba(16, 185, 129, 0.15)", color: "#10b981",
            border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 12,
            cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s ease", fontFamily: "inherit", whiteSpace: "nowrap",
          }}><Calendar size={16} /> جلسة جديدة</button>

          {isAdmin && (
            <button onClick={() => { setLinkedSessionForJudgment(null); setShowJudgmentForm(true); }} style={{
              width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(30, 64, 175, 0.15)", color: "#60a5fa",
              border: "1px solid rgba(30, 64, 175, 0.3)", borderRadius: 12,
              cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s ease", fontFamily: "inherit", whiteSpace: "nowrap",
            }}><Gavel size={16} /> حكم جديد</button>
          )}

          {isAdmin && (
            <button onClick={handleAddTask} style={{
              width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b",
              border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 12,
              cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s ease", fontFamily: "inherit", whiteSpace: "nowrap",
            }}><Briefcase size={16} /> عمل إداري جديد</button>
          )}

          <Link to={`/edit/${id}`} style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 12,
              cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s ease", fontFamily: "inherit", whiteSpace: "nowrap",
            }}><Edit3 size={16} /> تعديل القضية</button>
          </Link>

          <Link to={`/add-stage/${id}`} style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6",
              border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 12,
              cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s ease", fontFamily: "inherit", whiteSpace: "nowrap",
            }}><Landmark size={16} /> إدارة المراحل</button>
          </Link>

          {canViewFinance && (
            <Link to={`/case-finance/${id}`} style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
                background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6",
                border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 12,
                cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s ease", fontFamily: "inherit", whiteSpace: "nowrap",
              }}><DollarSign size={16} /> الحسابات</button>
            </Link>
          )}
        </div>
      </div>

      {/* ========== MODALS ========== */}
      {showSessionForm && (
        <SessionForm
          session={editingSession}
          caseId={id}
          caseData={caseData}
          onClose={() => { setShowSessionForm(false); setEditingSession(null); }}
          onSave={handleSaveSession}
        />
      )}

      {showDecisionForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)", zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 24, width: "100%", maxWidth: 600,
            maxHeight: "90vh", overflow: "auto", padding: 24,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
            }}>
              <div>
                <h2 style={{ margin: 0, color: "#f3f4f6", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700 }}>
                  إضافة قرار للجلسة
                </h2>
                {linkedSessionForDecision && (
                  <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>
                    الجلسة: {linkedSessionForDecision.title || linkedSessionForDecision.date}
                  </p>
                )}
              </div>
              <button onClick={() => { setShowDecisionForm(false); setLinkedSessionForDecision(null); }}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 8, borderRadius: 10 }}
              ><ArrowLeft size={20} /></button>
            </div>
            <DecisionForm
              session={linkedSessionForDecision}
              onClose={() => { setShowDecisionForm(false); setLinkedSessionForDecision(null); }}
              onSave={handleSaveDecision}
            />
          </div>
        </div>
      )}

      {showJudgmentForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)", zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 24, width: "100%", maxWidth: 600,
            maxHeight: "90vh", overflow: "auto", padding: 24,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
            }}>
              <div>
                <h2 style={{ margin: 0, color: "#f3f4f6", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700 }}>
                  {linkedSessionForJudgment ? 'إضافة حكم مرتبط بالجلسة' : 'إضافة حكم جديد'}
                </h2>
                {linkedSessionForJudgment && (
                  <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>
                    الجلسة: {linkedSessionForJudgment.title || linkedSessionForJudgment.date}
                  </p>
                )}
              </div>
              <button onClick={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 8, borderRadius: 10 }}
              ><ArrowLeft size={20} /></button>
            </div>
            <JudgmentForm
              caseId={id}
              sessions={sortedLevelSessions}
              preSelectedSession={linkedSessionForJudgment}
              onClose={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
              onSave={handleSaveJudgment}
            />
          </div>
        </div>
      )}

      {showTaskForm && (
        <AdminTaskForm
          caseId={id}
          sessions={sortedLevelSessions}
          task={null}
          preSelectedSession={taskFormSession}
          onClose={handleCloseTaskForm}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}