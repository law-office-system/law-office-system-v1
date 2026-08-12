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
  query, where, addDoc
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
import { Modal, Section } from "../components/ui";
import { colors, spacing, radius, shadows, transitions, card, page, infoBox, iconBox } from "../styles/design-system";

// ============================================================
// ✅ خرائط الترجمة — من إنجليزي لعربي
// ============================================================

// أنواع القضايا
const CASE_TYPE_MAP = {
  criminal: "جنائي",
  civil: "مدني",
  commercial: "تجاري",
  administrative: "إداري",
  labor: "عمالي",
  personal: "أحوال شخصية",
  military: "عسكري",
  constitutional: "دستوري",
  tax: "ضريبي",
  insurance: "تأمينات",
  family: "أسري",
  real_estate: "عقاري",
  intellectual: "ملكية فكرية",
  maritime: "بحري",
  banking: "مصرفي",
  investment: "استثماري",
  competition: "منافسة",
  environment: "بيئي",
  consumer: "حماية المستهلك",
  cyber: "إلكتروني",
  medical: "طبيب",
  engineering: "هندسي",
  other: "أخرى",
};

// درجات التقاضي
const LEVEL_TYPE_MAP = {
  first_instance: "أول درجة",
  partial: "جزئية",
  appeal: "استئناف",
  cassation: "نقض",
  execution: "تنفيذ",
  new: "جديدة",
  first: "أولى",
  second: "ثانية",
  third: "ثالثة",
  supreme: "عليا",
  administrative_court: "مجلس الدولة",
  disciplinary: "تأديبي",
  constitutional_court: "الدستورية العليا",
  military_appeal: "استئناف عسكري",
  military_cassation: "نقض عسكري",
  urgent: "عاجلة",
  summary: "موجزة",
  plenary: "الأحكام الكلية",
};

// حالات سير العمل (workflow)
const WORKFLOW_STATUS_MAP = {
  new: "جديدة",
  active: "نشطة",
  pending: "معلقة",
  adjourned: "مؤجلة",
  judgment: "حُكمت",
  appealed: "مستأنفة",
  cassation: "منقوضة",
  execution: "تنفيذ",
  closed: "مغلقة",
  archived: "مؤرشفة",
  settled: "مسواة",
  withdrawn: "مسحوبة",
  rejected: "مرفوضة",
  reopened: "معاد فتحها",
};

// دوال الترجمة المساعدة
const translateCaseType = (type) => {
  if (!type) return "غير محدد";
  const normalized = String(type).toLowerCase().trim();
  return CASE_TYPE_MAP[normalized] || type;
};
const translateLevelType = (type) => {
  if (!type) return "غير محدد";
  const normalized = String(type).toLowerCase().trim();
  return LEVEL_TYPE_MAP[normalized] || type;
};
const translateWorkflowStatus = (status) => {
  if (!status) return "غير محدد";
  const normalized = String(status).toLowerCase().trim();
  return WORKFLOW_STATUS_MAP[normalized] || status;
};

const DECISION_STAGE_MAP = {
  adjourned:       { stageLabel: 'مؤجلة',        color: colors.accent.amber.main },
  adjourned_notice:{ stageLabel: 'مؤجلة لإعلان', color: colors.accent.amber.dark },
  judgment:        { stageLabel: 'حُكمت',        color: colors.accent.green.main },
  referred:        { stageLabel: 'محالة',        color: colors.accent.blue.main },
  absence:         { stageLabel: 'غياب',         color: colors.accent.red.main },
  expert:          { stageLabel: 'معينة خبير',   color: colors.accent.purple.main },
  settlement:      { stageLabel: 'مسوّاة',       color: colors.accent.cyan.main },
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


function InfoBox({ icon: Icon, title, value, color = colors.accent.blue.light, badge = null }) {
  const displayValue = value != null && value !== '' ? value : "-";
  return (
    <div style={{
      ...infoBox,
      background: colors.bg.card,
      padding: "clamp(10px, 3vw, 14px)",
    }}>
      <div style={iconBox(color)}>
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: colors.text.muted, fontSize: 11, marginBottom: 3 }}>{title}</div>
        <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: "clamp(12px, 3.5vw, 14px)", wordBreak: "break-word" }}>
          {displayValue}
        </div>
        {badge && (
          <div style={{
            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", background: badge.bg, color: badge.color,
            borderRadius: radius.full, fontSize: 10, fontWeight: 700, border: `1px solid ${badge.border}`,
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
      borderRadius: radius.md, padding: `${spacing.md} ${spacing.lg}`, marginBottom: spacing.lg,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: radius.md, background: `${meta.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Scale size={18} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, marginBottom: 2 }}>
          المرحلة الحالية: {meta.stageLabel}
        </div>
        <div style={{ fontSize: 12, color: colors.text.secondary }}>
          بناءً على قرار الجلسة الأخيرة ({lastSession.decisionLabel || lastSession.decisionType})
          {lastSession.suggestedTask ? ` — المهمة: ${lastSession.suggestedTask}` : ''}
        </div>
      </div>
      {lastSession.suggestedTask && (
        <div style={{
          padding: "4px 12px", background: `${meta.color}12`, color: meta.color,
          borderRadius: radius.full, fontSize: 11, fontWeight: 600, border: `1px solid ${meta.color}20`,
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
      padding: 40, textAlign: "center", color: colors.text.muted,
      minHeight: "100vh", background: colors.bg.page, direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 40, height: 40,
        border: `3px solid ${colors.accent.blue.bg}`,
        borderTopColor: colors.accent.blue.dark,
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
      padding: 40, textAlign: "center", color: colors.accent.red.main,
      minHeight: "100vh", background: colors.bg.page, direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <Shield size={48} style={{ margin: "0 auto 12px", opacity: 0.8 }} />
      <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px 0" }}>حدث خطأ</p>
      <p style={{ fontSize: 14, color: colors.text.secondary, margin: "0 0 20px 0" }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: "10px 20px", background: colors.accent.blue.dark, color: "#fff",
          border: "none", borderRadius: radius.md, cursor: "pointer",
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
  // ✅ DEBUG: طباعة القيم للتأكد
  useEffect(() => {
    console.log("🔍 CaseDetails Debug:", {
      isAdmin,
      activeLevel: activeLevel ? { id: activeLevel.id, levelType: activeLevel.levelType } : null,
      levelsLoading,
      userRole: userData?.role,
      levelsCount: levels.length,
    });
  }, [isAdmin, activeLevel, levelsLoading, userData?.role, levels.length]);

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

          const sessionsWithId = (data.sessions || []).map(s => {
            const normalizedDate = s.date || s.nextSessionDate || '';
            return {
              ...s,
              id: s.id || crypto.randomUUID(),
              date: normalizedDate,
              decisionDetails: s.decisionDetails || s.decision || '',
              decisionType: s.decisionType || 'pending',
              levelId: s.levelId || activeLevel?.id || null,
            };
          });

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
        const sDate = normalizeDate(s.date);
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
      const firstLevel = levels[0];
      return selectedLevel.id === firstLevel?.id;
    });
  }, [safeSessions, selectedLevel, levels]);

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

      const originalDate = editingSession 
        ? (baseSession.date || '') 
        : null;

      const sessionData = {
        ...baseSession,
        id: baseSession.id || crypto.randomUUID(),
        title: formData.title,
        date: originalDate || formData.date,
        nextSessionDate: editingSession 
          ? baseSession.nextSessionDate 
          : (formData.nextSessionDate || null),
        time: formData.time,
        location: formData.location,
        roll: formData.roll,
        description: formData.description,
        notes: formData.notes,
        attachments: formData.attachments || [],
        decisionType: formData.decisionType || 'pending',
        decisionDetails: formData.decisionDetails || '',
        decisionDate: formData.decisionDate || now,
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

      const shouldCreateNext = formData.nextSessionDate && 
        formData.nextSessionDate !== (originalDate || formData.date) &&
        ['adjourned', 'adjourned_notice', 'referred', 'expert', 'absence'].includes(formData.decisionType);

      if (shouldCreateNext) {
        const alreadyExists = updatedSessions.some(s => 
          (s.date === formData.nextSessionDate || s.nextSessionDate === formData.nextSessionDate) 
          && s.id !== sessionData.id
        );
        if (!alreadyExists) {
          const nextSession = {
            id: crypto.randomUUID(),
            title: formData.nextSessionTitle || sessionData.decisionDetails || sessionData.decisionLabel || sessionData.decisionType || "جلسة مؤجلة",
            date: formData.nextSessionDate,
            nextSessionDate: null,
            time: formData.nextSessionTime || formData.time || '',
            location: formData.nextSessionLocation || formData.location || '',
            court: formData.court || sessionData.location || '',
            roll: formData.roll || '',
            description: '',
            notes: `جلسة قادمة تلقائية نتيجة قرار: ${sessionData.decisionLabel || sessionData.decisionType}`,
            attachments: [],
            decisionType: 'pending',
            decisionDetails: '',
            decisionDate: '',
            decisionLabel: '',
            suggestedStage: '',
            suggestedTask: '',
            stageLabel: '',
            levelId: selectedLevel?.id || activeLevel?.id || null,
            createdAt: now,
            createdBy: userData?.uid || null,
            updatedAt: now,
          };
          updatedSessions = [...updatedSessions, nextSession];
        }
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

  // ✅ FIXED: Auto-creates judgment record when decisionType === 'judgment'
  const handleSaveDecision = useCallback(async (decisionData) => {
    if (!linkedSessionForDecision) return;
    try {
      const now = new Date().toISOString();

      // ✅ NEW: Auto-create judgment record when decision is a judgment
      if (decisionData.decisionType === 'judgment') {
        await addDoc(collection(db, "judgments"), {
          title: decisionData.decisionDetails || 'حكم في الجلسة',
          type: decisionData.decisionLabel || 'حكم',
          category: 'final',
          date: decisionData.decisionDate || now,
          sessionDate: linkedSessionForDecision.date || linkedSessionForDecision.nextSessionDate || '',
          judge: '',
          result: '',
          summary: decisionData.decisionDetails || '',
          details: '',
          obligations: '',
          appealDeadline: '',
          needsFollowUp: false,
          attachments: [],
          sessionId: linkedSessionForDecision.id,
          sessionTitle: linkedSessionForDecision.title || '',
          caseId: id,
          caseNumber: selectedLevel?.caseNumber || caseData?.caseNumber || '',
          officeId: userData?.officeId || '',
          levelId: selectedLevel?.id || activeLevel?.id || null,
          createdAt: now,
          createdBy: userData?.uid || null,
          tenantId: caseData?.tenantId || userData?.tenantId || '',
        });
      }

      // ✅ NEW: Added officeId to decision record
      await addDoc(collection(db, "decisions"), {
        ...decisionData,
        caseId: id,
        sessionId: linkedSessionForDecision.id,
        sessionTitle: linkedSessionForDecision.title,
        sessionDate: linkedSessionForDecision.date || linkedSessionForDecision.nextSessionDate,
        officeId: userData?.officeId || '',
        levelId: selectedLevel?.id || activeLevel?.id || null,
        createdAt: now,
        createdBy: userData?.uid || null,
        tenantId: caseData?.tenantId || userData?.tenantId || '',
      });

      const originalDate = linkedSessionForDecision.date || linkedSessionForDecision.nextSessionDate;

      const updatedCurrentSession = {
        ...linkedSessionForDecision,
        date: originalDate,
        nextSessionDate: linkedSessionForDecision.nextSessionDate,
        decisionType: decisionData.decisionType || 'pending',
        decisionDetails: decisionData.decisionDetails || '',
        decisionDate: now,
        decisionLabel: decisionData.decisionLabel || '',
        notes: decisionData.notes || linkedSessionForDecision.notes || '',
        updatedAt: now,
      };

      let updatedSessions = safeSessions.map(s => 
        s.id === linkedSessionForDecision.id ? updatedCurrentSession : s
      );

      if (decisionData.nextSessionDate) {
        const isDifferentDate = decisionData.nextSessionDate !== originalDate;
        const alreadyExists = updatedSessions.some(s => 
          (s.date === decisionData.nextSessionDate || s.nextSessionDate === decisionData.nextSessionDate) 
          && s.id !== linkedSessionForDecision.id
        );

        if (isDifferentDate && !alreadyExists) {
          const nextSession = {
            id: crypto.randomUUID(),
            title: decisionData.decisionDetails || decisionData.decisionLabel || decisionData.decisionType || "جلسة مؤجلة",
            date: decisionData.nextSessionDate,
            nextSessionDate: null,
            time: decisionData.nextSessionTime || linkedSessionForDecision.time || '',
            location: decisionData.nextSessionLocation || linkedSessionForDecision.location || '',
            court: linkedSessionForDecision.court || linkedSessionForDecision.location || '',
            roll: linkedSessionForDecision.roll || '',
            description: '',
            notes: `جلسة قادمة تلقائية نتيجة قرار: ${decisionData.decisionLabel || decisionData.decisionType || ''}`,
            attachments: [],
            decisionType: 'pending',
            decisionDetails: '',
            decisionDate: '',
            decisionLabel: '',
            suggestedStage: '',
            suggestedTask: '',
            stageLabel: '',
            levelId: selectedLevel?.id || activeLevel?.id || null,
            createdAt: now,
            createdBy: userData?.uid || null,
            updatedAt: now,
          };
          updatedSessions = [...updatedSessions, nextSession];
        }
      }

      await updateDoc(doc(db, "cases", id), { sessions: updatedSessions });

      setShowDecisionForm(false);
      setLinkedSessionForDecision(null);
    } catch (err) {
      console.error("Error saving decision:", err);
      setError("حدث خطأ أثناء حفظ القرار وإنشاء الجلسة القادمة");
    }
  }, [linkedSessionForDecision, id, selectedLevel, activeLevel, userData, caseData, safeSessions]);

  const handleAddJudgmentFromSession = useCallback((session) => {
    setLinkedSessionForJudgment(session);
    setShowJudgmentForm(true);
  }, []);

  // ✅ FIXED: Added officeId to judgment record
  const handleSaveJudgment = useCallback(async (judgmentData) => {
    try {
      await addDoc(collection(db, "judgments"), {
        ...judgmentData,
        caseId: id,
        sessionId: linkedSessionForJudgment?.id || null,
        sessionTitle: linkedSessionForJudgment?.title || '',
        sessionDate: linkedSessionForJudgment?.date || '',
        officeId: userData?.officeId || '',        // ✅ NEW
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
        padding: 40, textAlign: "center", color: colors.accent.red.main,
        minHeight: "100vh", background: colors.bg.page, direction: "rtl"
      }}>
        <Shield size={48} style={{ margin: "0 auto 12px" }} />
        هذه القضية غير موجودة بالنظام
      </div>
    );
  }

  const selectedLevelLabel = selectedLevel ? translateLevelType(selectedLevel.levelType) : "غير محدد";
  const selectedLevelColor = selectedLevel ? getLitigationLevelColor(selectedLevel.levelType) : colors.accent.blue.main;
  const selectedStatusLabel = selectedLevel ? translateWorkflowStatus(selectedLevel.status) : "غير محدد";
  const selectedStatusColor = selectedLevel ? getWorkflowStatusColor(selectedLevel.status) : colors.text.disabled;

  const tabs = [
    { key: "sessions", label: "سير الدعوى", count: levelSessions.length, icon: Calendar },
    { key: "judgments", label: "الأحكام", count: levelJudgments.length, icon: Gavel },
    { key: "admin", label: "الأعمال الإدارية", count: levelTasks.length, icon: Briefcase },
  ];

  const getStatusStyle = (status) => {
    const statusStyles = {
      ACTIVE: { bg: colors.accent.green.bg, color: colors.accent.green.main, border: colors.accent.green.main + '30', dot: colors.accent.green.main },
      CLOSED: { bg: colors.text.disabled + '15', color: colors.text.disabled, border: colors.text.disabled + '30', dot: colors.text.disabled },
    };
    return statusStyles[status] || { bg: colors.accent.amber.bg, color: colors.accent.amber.main, border: colors.accent.amber.main + '30', dot: colors.accent.amber.main };
  };

  const statusStyle = getStatusStyle(caseData.status);

  return (
    <div style={{
      ...page,
      padding: "clamp(8px, 3vw, 24px)",
    }}>
      {/* Error Toast */}
      {error && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: colors.accent.red.main, color: "#fff", padding: `${spacing.md} ${spacing.xl}`,
          borderRadius: radius.lg, zIndex: 999999, fontWeight: 600,
          boxShadow: shadows.md,
          animation: "slideDown 0.3s ease",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ========== HEADER ========== */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.bg.card} 0%, ${colors.bg.page} 100%)`,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.xl,
        padding: "clamp(16px, 4vw, 28px)",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 200, height: 200,
          background: `radial-gradient(circle, ${colors.accent.blue.main}15 0%, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "clamp(12px, 3vw, 20px)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{
            width: "clamp(48px, 10vw, 64px)",
            height: "clamp(48px, 10vw, 64px)",
            background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
            borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: shadows.glow(colors.accent.blue.main),
            flexShrink: 0,
            border: `1px solid ${colors.accent.blue.main}20`,
          }}>
            <Landmark color={colors.accent.amber.light} size={28} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              flexWrap: "wrap", marginBottom: 8,
            }}>
              <h1 style={{
                margin: 0, fontSize: "clamp(18px, 5vw, 26px)",
                color: colors.text.primary, fontWeight: 800,
                letterSpacing: "-0.5px",
              }}>
                {caseData.caseName || `ملف القضية رقم ${caseData.caseSerial}`}
              </h1>
              <span style={{
                background: colors.accent.blue.bg,
                color: colors.accent.blue.light,
                border: `1px solid ${colors.accent.blue.main}25`,
                padding: "4px 12px", borderRadius: radius.full,
                fontSize: "clamp(11px, 3vw, 13px)", fontWeight: 600,
              }}>
                {translateCaseType(caseData.caseType)}
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 16px)",
              flexWrap: "wrap",
            }}>
              <span style={{
                background: statusStyle.bg, color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`,
                padding: "5px 14px", borderRadius: radius.full,
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
              <span style={{ color: colors.text.muted, fontSize: "clamp(12px, 3.5vw, 14px)" }}>
                سنة {caseData.caseYear || "-"}
              </span>
              <span style={{ color: colors.text.disabled }}>|</span>
              <span style={{ color: colors.text.muted, fontSize: "clamp(12px, 3.5vw, 14px)", display: "flex", alignItems: "center", gap: 5 }}>
                <Users size={14} /> {safeClients.length} موكل
              </span>
              <span style={{ color: colors.text.muted, fontSize: "clamp(12px, 3.5vw, 14px)", display: "flex", alignItems: "center", gap: 5 }}>
                <Shield size={14} /> {safeOpponents.length} خصم
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== PARTIES (موكلين + خصوم) ========== */}
      <Section title="أطراف الدعوى" icon={Users} iconColor={colors.accent.blue.light} defaultOpen={true}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(280px, 45vw, 400px)), 1fr))",
          gap: 16,
        }}>
          {/* الموكلون */}
          <div>
            <h4 style={{
              margin: "0 0 10px 0",
              color: colors.accent.green.main,
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <Users size={16} />
              الموكلون ({safeClients.length})
            </h4>
            {safeClients.length === 0 ? (
              <p style={{ color: colors.text.muted, fontSize: "clamp(11px, 3vw, 13px)", margin: 0 }}>لا يوجد موكلون مسجلون</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {clients.map(c => (
                  <div key={c.id} style={{
                    padding: "clamp(10px, 3vw, 12px)",
                    background: colors.bg.hover,
                    borderRadius: radius.md,
                    border: `1px solid ${colors.border.default}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: colors.accent.green.main + "20",
                      color: colors.accent.green.main,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {c.fullName?.charAt(0) || "👤"}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "clamp(12px, 3.5vw, 14px)", color: colors.text.primary, wordBreak: "break-word" }}>
                        {c.fullName || "موكل"}
                      </div>
                      {c.phone && (
                        <div style={{ fontSize: "clamp(10px, 3vw, 12px)", color: colors.text.muted, marginTop: 2 }}>
                          📞 {c.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* الخصوم */}
          <div>
            <h4 style={{
              margin: "0 0 10px 0",
              color: colors.accent.red.main,
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <Shield size={16} />
              أطراف الخصوم ({safeOpponents.length})
            </h4>
            {safeOpponents.length === 0 ? (
              <p style={{ color: colors.text.muted, fontSize: "clamp(11px, 3vw, 13px)", margin: 0 }}>لا يوجد خصوم مسجلون</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {safeOpponents.map((opp, idx) => (
                  <div key={idx} style={{
                    padding: "clamp(10px, 3vw, 12px)",
                    background: colors.bg.hover,
                    borderRadius: radius.md,
                    border: `1px solid ${colors.border.default}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: colors.accent.red.main + "20",
                      color: colors.accent.red.main,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {typeof opp === "object" ? (opp.name?.charAt(0) || "🛡️") : "🛡️"}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "clamp(12px, 3.5vw, 14px)", color: colors.text.primary, wordBreak: "break-word" }}>
                        {typeof opp === "object" ? opp.name || opp.fullName || "خصم" : opp}
                      </div>
                      {typeof opp === "object" && opp.phone && (
                        <div style={{ fontSize: "clamp(10px, 3vw, 12px)", color: colors.text.muted, marginTop: 2 }}>
                          📞 {opp.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ========== CASE SUBJECT ========== */}
      <Section title="موضوع الدعوى" icon={FileText} iconColor={colors.accent.purple.light} defaultOpen={true}>
        <div style={{
          padding: "clamp(12px, 3vw, 16px)",
          background: colors.bg.hover,
          borderRadius: radius.md,
          border: `1px solid ${colors.border.default}`,
          color: colors.text.primary,
          fontSize: "clamp(13px, 3.5vw, 14px)",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {caseData?.caseSubject || caseData?.notes || "لم يتم تحديد موضوع الدعوى"}
        </div>
      </Section>

      <div style={{ height: 2, background: colors.border.default, margin: "24px 0", borderRadius: 1 }} />

      {/* ========== LEVEL SELECTOR ========== */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12,
        }}>
          <h2 style={{
            color: colors.text.primary, fontSize: "clamp(14px, 4vw, 18px)",
            fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Landmark size={20} color={colors.accent.amber.light} />
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
            const lvlLabel = translateLevelType(level.levelType);
            const wfLabel = translateWorkflowStatus(level.status);
            return (
              <button
                key={level.id}
                onClick={() => setSelectedLevelId(level.id)}
                style={{
                  padding: "10px 18px", borderRadius: radius.md, cursor: "pointer",
                  border: isSelected ? `2px solid ${lvlColor}` : `1px solid ${colors.border.default}`,
                  background: isSelected ? `${lvlColor}15` : colors.bg.card,
                  color: isSelected ? lvlColor : colors.text.secondary,
                  fontFamily: "inherit", fontWeight: isSelected ? 700 : 500,
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: transitions.default, whiteSpace: "nowrap",
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: level.isActive ? colors.accent.green.main : colors.text.disabled,
                }} />
                {lvlLabel}
                <span style={{
                  background: isSelected ? `${lvlColor}25` : colors.bg.hover,
                  color: isSelected ? lvlColor : colors.text.muted,
                  padding: "2px 8px", borderRadius: radius.sm, fontSize: 11,
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
            ...card,
            marginBottom: 20,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16,
            }}>
              <div>
                <h3 style={{
                  margin: 0, color: colors.text.primary,
                  fontSize: "clamp(15px, 4.5vw, 20px)", fontWeight: 700,
                }}>
                  {translateLevelType(selectedLevel?.levelType) || "غير محدد"} — القضية رقم {selectedLevel.caseNumber}
                </h3>
                <p style={{ margin: "6px 0 0 0", color: colors.text.secondary, fontSize: "clamp(12px, 3.5vw, 14px)" }}>
                  سنة {selectedLevel.caseYear} — {selectedLevel.court}
                  {selectedLevel.circuit ? ` — ${selectedLevel.circuit}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  background: `${selectedStatusColor}12`, color: selectedStatusColor,
                  border: `1px solid ${selectedStatusColor}25`,
                  padding: "4px 14px", borderRadius: radius.full, fontWeight: 700,
                  fontSize: "clamp(11px, 3vw, 13px)", whiteSpace: "nowrap",
                }}>
                  {translateWorkflowStatus(selectedLevel?.status) || "غير محدد"}
                </span>
                {selectedLevel.isActive && (
                  <span style={{
                    background: colors.accent.green.bg, color: colors.accent.green.main,
                    border: `1px solid ${colors.accent.green.main}30`,
                    padding: "4px 14px", borderRadius: radius.full, fontWeight: 700,
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
              <InfoBox icon={Landmark} title="المحكمة" value={selectedLevel.court} color={colors.accent.blue.light} />
              <InfoBox icon={Gavel} title="الدائرة" value={selectedLevel.circuit} color={colors.accent.purple.light} />
              <InfoBox icon={Calendar} title="الجلسات" value={levelSessions.length} color={colors.accent.amber.main} />
              <InfoBox icon={Gavel} title="الأحكام" value={levelJudgments.length} color={colors.accent.blue.dark} />
              <InfoBox icon={Briefcase} title="الأعمال" value={levelTasks.length} color={colors.accent.amber.main} />
              <InfoBox icon={FileText} title="رقم القضية" value={`${selectedLevel.caseNumber} لسنة ${selectedLevel.caseYear}`} color={colors.accent.green.main} />
              {selectedLevel.filingDate && (
                <InfoBox icon={Clock} title="تاريخ الإيداع" value={formatDate(selectedLevel.filingDate)} color={colors.accent.cyan.main} />
              )}
              {selectedLevel.judgmentDate && (
                <InfoBox icon={AlertTriangle} title="تاريخ الحكم" value={formatDate(selectedLevel.judgmentDate)} color={colors.accent.red.main} />
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== TABS ========== */}
      <div style={{
        ...card,
        marginBottom: 20,
      }}>
        <div style={{
          display: "flex", gap: 4, borderBottom: `1px solid ${colors.border.default}`,
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
                  borderBottom: isActive ? `3px solid ${colors.accent.blue.dark}` : "3px solid transparent",
                  background: "transparent", color: isActive ? colors.accent.blue.light : colors.text.muted,
                  fontWeight: isActive ? 700 : 500, fontSize: "clamp(12px, 3.5vw, 14px)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "inherit", transition: transitions.default,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <TabIcon size={16} /> {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: isActive ? colors.accent.blue.dark : colors.bg.hover,
                    color: isActive ? "#fff" : colors.text.muted,
                    padding: "2px 8px", borderRadius: radius.full, fontSize: 11, fontWeight: 700,
                  }}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "sessions" && (
          levelSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: colors.text.muted }}>
              <Calendar size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontSize: 16, margin: 0 }}>لا توجد جلسات مسجلة في هذه الدرجة</p>
              {isAdmin && (
                <button onClick={handleAddSession} style={{
                  marginTop: 16, padding: "10px 20px", background: colors.accent.blue.dark, color: "#fff",
                  border: "none", borderRadius: radius.md, cursor: "pointer", fontFamily: "inherit",
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

        {/* ✅ FIXED: Pass levelJudgments directly + onSave handler */}
        {activeTab === "judgments" && (
          <JudgmentsSection
            caseId={id}
            judgments={levelJudgments}
            sessions={sortedLevelSessions}
            onAddJudgment={isAdmin ? handleSaveJudgment : null}
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
        ...card,
        marginBottom: 20,
      }}>
        <h2 style={{
          fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700, color: colors.text.primary,
          margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 10,
        }}>
          <Briefcase size={20} color={colors.accent.amber.main} />
          إجراءات {translateLevelType(selectedLevel?.levelType) || "غير محدد"}
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(140px, 40vw, 180px)), 1fr))",
          gap: "clamp(8px, 2vw, 12px)",
        }}>
          <ActionButton icon={Calendar} color={colors.accent.green.main} onClick={handleAddSession}>
            جلسة جديدة
          </ActionButton>

          {isAdmin && (
            <ActionButton icon={Gavel} color={colors.accent.blue.light} onClick={() => { setLinkedSessionForJudgment(null); setShowJudgmentForm(true); }}>
              حكم جديد
            </ActionButton>
          )}

          {isAdmin && (
            <ActionButton icon={Briefcase} color={colors.accent.amber.main} onClick={handleAddTask}>
              عمل إداري جديد
            </ActionButton>
          )}

          <Link to={`/edit/${id}`} style={{ textDecoration: "none" }}>
            <ActionButton icon={Edit3} color={colors.accent.blue.light}>
              تعديل القضية
            </ActionButton>
          </Link>

          <Link to={`/add-stage/${id}`} style={{ textDecoration: "none" }}>
            <ActionButton icon={Landmark} color={colors.accent.purple.light}>
              إدارة المراحل
            </ActionButton>
          </Link>

          {canViewFinance && (
            <Link to={`/case-finance/${id}`} style={{ textDecoration: "none" }}>
              <ActionButton icon={DollarSign} color={colors.accent.purple.light}>
                الحسابات
              </ActionButton>
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
        <Modal
          isOpen={true}
          onClose={() => { setShowDecisionForm(false); setLinkedSessionForDecision(null); }}
          title="إضافة قرار للجلسة"
          subtitle={linkedSessionForDecision ? `الجلسة: ${linkedSessionForDecision.title || linkedSessionForDecision.date}` : ''}
          icon={Scale}
          iconColor={colors.accent.amber.light}
          maxWidth="600px"
        >
          <DecisionForm
            session={linkedSessionForDecision}
            onClose={() => { setShowDecisionForm(false); setLinkedSessionForDecision(null); }}
            onSave={handleSaveDecision}
          />
        </Modal>
      )}

      {showJudgmentForm && (
        <Modal
          isOpen={true}
          onClose={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
          title={linkedSessionForJudgment ? 'إضافة حكم مرتبط بالجلسة' : 'إضافة حكم جديد'}
          subtitle={linkedSessionForJudgment ? `الجلسة: ${linkedSessionForJudgment.title || linkedSessionForJudgment.date}` : ''}
          icon={Gavel}
          iconColor={colors.accent.amber.light}
          maxWidth="600px"
        >
          <JudgmentForm
            caseId={id}
            sessions={sortedLevelSessions}
            preSelectedSession={linkedSessionForJudgment}
            onClose={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
            onSave={handleSaveJudgment}
          />
        </Modal>
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

// ═══════════════════════════════════════════════════════════════════
// ACTION BUTTON HELPER
// ═══════════════════════════════════════════════════════════════════
function ActionButton({ icon: Icon, color, children, onClick }) {
  const btnProps = onClick ? { onClick } : {};
  return (
    <button
      {...btnProps}
      style={{
        width: "100%", padding: "clamp(8px, 2.5vw, 14px)",
        background: `${color}15`, color: color,
        border: `1px solid ${color}30`, borderRadius: radius.md,
        cursor: "pointer", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: transitions.default, fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      <Icon size={16} /> {children}
    </button>
  );
}
