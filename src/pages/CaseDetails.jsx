import { useEffect, useState, useMemo } from "react";
import {
  doc, onSnapshot, getDoc, updateDoc, collection,
  query, where, getDocs, addDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { CASE_STATUS_LIST } from "../constants/caseStatus";
import {
  Landmark, Edit3, Calendar, Users, Shield, FileText,
  Clock, MapPin, CheckCircle2, Trash2, Gavel, Briefcase,
  DollarSign, ArrowLeft, Plus, Link2, Sparkles, RotateCcw,
  Scale, AlertTriangle
} from "lucide-react";
import SessionsTimeline from "../components/case/SessionsTimeline";
import SessionForm from "../components/case/SessionForm";
import JudgmentsSection from "../components/case/JudgmentsSection";
import JudgmentForm from "../components/case/JudgmentForm";
import DecisionForm from "../components/case/DecisionForm";
import AdminTasksSection from "../components/case/AdminTasksSection";
import AdminTaskForm from "../components/case/AdminTaskForm";  // ✅ NEW: Import the modal

// ─── Decision-to-Stage mapping (sync across all files) ───────────
const DECISION_STAGE_MAP = {
  adjourned:       { stageLabel: 'مؤجلة',        color: '#f59e0b' },
  adjourned_notice:{ stageLabel: 'مؤجلة لإعلان', color: '#f97316' },
  judgment:        { stageLabel: 'حُكمت',        color: '#10b981' },
  referred:        { stageLabel: 'محالة',        color: '#3b82f6' },
  absence:         { stageLabel: 'غياب',         color: '#ef4444' },
  expert:          { stageLabel: 'معينة خبير', color: '#8b5cf6' },
  settlement:      { stageLabel: 'مسوّاة',       color: '#14b8a6' },
};

const SUGGESTED_TASKS = {
  adjourned:       'متابعة موعد الجلسة القادمة',
  adjourned_notice:'إتمام إجراءات الإعلان',
  judgment:        'دراسة الحكم وإعداد الاستئناف إن لزم',
  referred:        'متابعة الإحالة والجلسة الجديدة',
  absence:         'طلب إعادة الإعلان أو التعقيب',
  expert:          'متابعة تقرير الخبير',
  settlement:      'إعداد صيغة التسوية التنفيذية',
};

const getStatusLabel = (status) => {
  const found = CASE_STATUS_LIST.find(s => s.value === status);
  return found ? found.label : (status || "غير محدد");
};

const statusColors = {
  active:   { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  pending:  { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  closed:   { bg: "rgba(107, 114, 128, 0.15)", color: "#6b7280", border: "rgba(107, 114, 128, 0.3)" },
  archived: { bg: "rgba(239, 68, 68, 0.15)",  color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

// ================= InfoBox =================
function InfoBox({ icon: Icon, title, value, color = "#60a5fa", badge = null }) {
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid rgba(55, 65, 81, 0.5)",
      borderRadius: 16,
      padding: "clamp(10px, 3vw, 16px)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      transition: "all 0.2s ease",
    }}>
      <div style={{
        width: "clamp(32px, 8vw, 40px)",
        height: "clamp(32px, 8vw, 40px)",
        borderRadius: 12,
        background: color + "15",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: "#6b7280", fontSize: "clamp(10px, 3vw, 12px)", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "clamp(12px, 3.5vw, 15px)", wordBreak: "break-word" }}>
          {value || "-"}
        </div>
        {badge && (
          <div style={{
            marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", background: badge.bg, color: badge.color,
            borderRadius: 20, fontSize: "clamp(10px, 3vw, 11px)", fontWeight: 700,
            border: `1px solid ${badge.border}`,
          }}>
            <Sparkles size={10} />
            {badge.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Section Card =================
function SectionCard({ title, icon: Icon, iconColor = "#60a5fa", children, style = {} }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
      borderRadius: 16, padding: "clamp(12px, 4vw, 24px)", marginBottom: 20, ...style,
    }}>
      <h2 style={{
        display: "flex", alignItems: "center", gap: 10,
        margin: "0 0 16px 0", color: "#f3f4f6",
        fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700,
        paddingBottom: 12, borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
      }}>
        <Icon size={20} color={iconColor} strokeWidth={2.5} />
        {title}
      </h2>
      {children}
    </div>
  );
}

// ================= Workflow Status Banner =================
function WorkflowBanner({ lastSession }) {
  if (!lastSession?.suggestedStage) return null;
  const meta = DECISION_STAGE_MAP[lastSession.suggestedStage];
  if (!meta) return null;

  return (
    <div style={{
      background: `${meta.color}10`, border: `1px solid ${meta.color}25`,
      borderRadius: 14, padding: "clamp(12px, 3.5vw, 16px) clamp(14px, 4vw, 20px)",
      marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: `${meta.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Scale size={20} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 700, color: meta.color, marginBottom: 4 }}>
          المرحلة الحالية: {meta.stageLabel}
        </div>
        <div style={{ fontSize: "clamp(11px, 3vw, 13px)", color: "#9ca3af" }}>
          بناءً على قرار الجلسة الأخيرة ({lastSession.decisionLabel || lastSession.decisionType})
          {lastSession.suggestedTask ? ` — المهمة المقترحة: ${lastSession.suggestedTask}` : ''}
        </div>
      </div>
      {lastSession.suggestedTask && (
        <div style={{
          padding: "6px 14px", background: `${meta.color}12`, color: meta.color,
          borderRadius: 20, fontSize: "clamp(11px, 3vw, 12px)", fontWeight: 600,
          border: `1px solid ${meta.color}20`, whiteSpace: "nowrap",
        }}>
          <Briefcase size={12} style={{ display: "inline", marginLeft: 6 }} />
          {lastSession.suggestedTask}
        </div>
      )}
    </div>
  );
}

export default function CaseDetails() {
  const { id } = useParams();
  const { userData } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [clients, setClients] = useState([]);
  const [judgments, setJudgments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showJudgmentForm, setShowJudgmentForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);

  // ✅ NEW: Admin Task Form Modal states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormSession, setTaskFormSession] = useState(null);
  const [taskFormPrefill, setTaskFormPrefill] = useState("");

  const [editingSession, setEditingSession] = useState(null);
  const [linkedSessionForJudgment, setLinkedSessionForJudgment] = useState(null);
  const [linkedSessionForDecision, setLinkedSessionForDecision] = useState(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("sessions");

  const isAdmin = userData?.role === "admin" || userData?.role === "superadmin";
  const canViewFinance = userData?.role === "admin" || userData?.role === "staff";

  // ================= Load Case =================
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "cases", id), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let sessionsWithId = (data.sessions || []).map(s => ({
          ...s,
          id: s.id || crypto.randomUUID(),
          decisionDetails: s.decisionDetails || s.decision || '',
          decisionType: s.decisionType || 'pending',
        }));

        // Auto-update case stage from last session
        const lastSession = sessionsWithId[sessionsWithId.length - 1];
        if (lastSession?.suggestedStage) {
          const autoStage = DECISION_STAGE_MAP[lastSession.suggestedStage];
          if (autoStage && data.stage !== autoStage.stageLabel) {
            await updateDoc(doc(db, "cases", id), {
              stage: autoStage.stageLabel,
              autoStageUpdatedAt: new Date().toISOString(),
            });
            data.stage = autoStage.stageLabel;
          }
        }

        setCaseData({
          id: snap.id, ...data,
          sessions: sessionsWithId,
          clients: data.clients || [],
          opponents: data.opponents || [],
        });
      } else { setCaseData(null); }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // ================= Load Clients =================
  useEffect(() => {
    const fetchClients = async () => {
      if (!caseData?.clients?.length) { setClients([]); return; }
      const result = await Promise.all(
        caseData.clients.map(async (clientItem) => {
          const clientId = typeof clientItem === "object" ? clientItem.id : clientItem;
          const clientRole = typeof clientItem === "object" ? clientItem.clientRole : "موكل (غير محدد)";
          const snap = await getDoc(doc(db, "clientProfiles", clientId));
          if (!snap.exists()) return null;
          return { id: snap.id, ...snap.data(), currentCaseRole: clientRole };
        })
      );
      setClients(result.filter(Boolean));
    };
    fetchClients();
  }, [caseData?.clients]);

  // ================= Load Judgments (linked to case) =================
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "judgments"), where("caseId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      setJudgments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [id]);

  // ================= Load Admin Tasks (linked to case) =================
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "adminTasks"), where("caseId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [id]);

  // ================= Auto-open session form from notification =================
  useEffect(() => {
    const action = searchParams.get("action");
    const sessionDate = searchParams.get("sessionDate");
    if (action === "recordDecision" && caseData?.sessions?.length > 0) {
      const target = caseData.sessions.find(s => (s.nextSessionDate || s.date) === sessionDate);
      if (target) { setEditingSession(target); setShowSessionForm(true); }
    }
  }, [searchParams, caseData]);

  // ================= Computed =================
  const lastSession = useMemo(() => {
    if (!caseData?.sessions?.length) return null;
    return caseData.sessions[caseData.sessions.length - 1];
  }, [caseData?.sessions]);

  const tasksBySession = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const sid = t.sessionId;
      if (sid) { if (!map[sid]) map[sid] = []; map[sid].push(t); }
    });
    return map;
  }, [tasks]);

  const judgmentsBySession = useMemo(() => {
    const map = {};
    judgments.forEach(j => {
      const sid = j.sessionId;
      if (sid) { if (!map[sid]) map[sid] = []; map[sid].push(j); }
    });
    return map;
  }, [judgments]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid rgba(30, 64, 175, 0.2)", borderTopColor: "#1e40af",
          borderRadius: "50%", animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }} />
        جاري تحميل ملف الدعوى...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
        <Shield size={48} style={{ margin: "0 auto 12px" }} />
        هذه القضية غير موجودة بالنظام
      </div>
    );
  }

  const safeSessions = caseData.sessions || [];
  const safeClients = caseData.clients || [];
  const safeOpponents = caseData.opponents || [];
  const sc = statusColors[caseData.status] || statusColors.active;

  // ================= Session Handlers =================
  const handleSaveSession = async (formData) => {
    const sessionData = {
      id: editingSession?.id || crypto.randomUUID(),
      title: formData.title,
      date: formData.date,
      nextSessionDate: formData.nextSessionDate || formData.date,
      time: formData.time,
      location: formData.location,
      roll: formData.roll,
      description: formData.description,
      notes: formData.notes,
      attachments: formData.attachments || [],

      // Decision (unified in session)
      decisionType: formData.decisionType || 'pending',
      decisionDetails: formData.decisionDetails || '',
      decisionDate: formData.decisionDate || formData.date,
      decisionLabel: formData.decisionLabel || '',

      // Judgment (if stored in session too)
      ...(formData.decisionType === 'judgment' ? {
        judgmentType: formData.judgmentType,
        judgmentSummary: formData.judgmentSummary,
        judgmentAppealable: formData.judgmentAppealable,
        appealDeadline: formData.appealDeadline,
      } : {}),

      // Workflow
      suggestedStage: formData.suggestedStage || '',
      suggestedTask: formData.suggestedTask || '',
      stageLabel: formData.stageLabel || '',

      createdAt: editingSession?.createdAt || new Date().toISOString(),
      createdBy: editingSession?.createdBy || userData?.uid || null,
      updatedAt: new Date().toISOString(),
    };

    let updatedSessions;
    if (editingSession) {
      updatedSessions = safeSessions.map(s => s.id === editingSession.id ? sessionData : s);
    } else {
      updatedSessions = [...safeSessions, sessionData];
    }

    // Auto-update case stage
    const newLast = updatedSessions[updatedSessions.length - 1];
    const autoStage = newLast?.suggestedStage ? DECISION_STAGE_MAP[newLast.suggestedStage] : null;
    const updatePayload = { sessions: updatedSessions };
    if (autoStage) {
      updatePayload.stage = autoStage.stageLabel;
      updatePayload.autoStageUpdatedAt = new Date().toISOString();
    }

    await updateDoc(doc(db, "cases", id), updatePayload);

    // Auto-create suggested task
    if (!editingSession && newLast?.suggestedTask) {
      await addDoc(collection(db, "adminTasks"), {
        caseId: id,
        sessionId: sessionData.id,
        title: newLast.suggestedTask,
        description: `مهمة تلقائية من جلسة: ${newLast.title}`,
        status: 'pending',
        priority: 'high',
        createdAt: new Date().toISOString(),
        createdBy: userData?.uid || null,
        tenantId: caseData.tenantId || userData?.tenantId || '',
      });
    }

    setShowSessionForm(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("هل تريد حذف هذه الجلسة وكل ما يتعلق بها نهائياً؟")) return;
    const updated = safeSessions.filter(s => s.id !== sessionId);
    await updateDoc(doc(db, "cases", id), { sessions: updated });
  };

  const handleEditSession = (session) => { setEditingSession(session); setShowSessionForm(true); };
  const handleAddSession = () => { setEditingSession(null); setShowSessionForm(true); };

  // ================= Decision Handler (linked to session) =================
  const handleAddDecision = (session) => {
    setLinkedSessionForDecision(session);
    setShowDecisionForm(true);
  };

  const handleSaveDecision = async (decisionData) => {
    if (!linkedSessionForDecision) return;
    // Save decision as a separate document with sessionId
    await addDoc(collection(db, "decisions"), {
      ...decisionData,
      caseId: id,
      sessionId: linkedSessionForDecision.id,
      sessionTitle: linkedSessionForDecision.title,
      sessionDate: linkedSessionForDecision.date,
      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || null,
      tenantId: caseData.tenantId || userData?.tenantId || '',
    });
    setShowDecisionForm(false);
    setLinkedSessionForDecision(null);
  };

  // ================= Judgment Handlers (linked to session) =================
  const handleAddJudgmentFromSession = (session) => {
    setLinkedSessionForJudgment(session);
    setShowJudgmentForm(true);
  };

  const handleSaveJudgment = async (judgmentData) => {
    await addDoc(collection(db, "judgments"), {
      ...judgmentData,
      caseId: id,
      sessionId: linkedSessionForJudgment?.id || null,
      sessionTitle: linkedSessionForJudgment?.title || '',
      sessionDate: linkedSessionForJudgment?.date || '',
      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || null,
      tenantId: caseData.tenantId || userData?.tenantId || '',
    });
    setShowJudgmentForm(false);
    setLinkedSessionForJudgment(null);
  };

  // ✅ FIXED: Open AdminTaskForm Modal instead of navigating
  const handleAddTaskFromSession = (session) => {
    setTaskFormSession(session);
    setTaskFormPrefill(session?.suggestedTask || '');
    setShowTaskForm(true);
  };

  // ✅ NEW: Add task without session link
  const handleAddTask = () => {
    setTaskFormSession(null);
    setTaskFormPrefill('');
    setShowTaskForm(true);
  };

  // ✅ NEW: Close task form handler
  const handleCloseTaskForm = () => {
    setShowTaskForm(false);
    setTaskFormSession(null);
    setTaskFormPrefill('');
  };

  // ================= Tabs =================
  const tabs = [
    { key: "sessions", label: "سير الدعوى", count: safeSessions.length, icon: Calendar },
    { key: "judgments", label: "الأحكام", count: judgments.length, icon: Gavel },
    { key: "admin", label: "الأعمال الإدارية", count: tasks.length, icon: Briefcase },
  ];

  return (
    <div style={{
      padding: "clamp(8px, 3vw, 24px)", background: "#0f172a",
      minHeight: "100vh", direction: "rtl",
      fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
    }}>

      {/* ========== HEADER ========== */}
      <div style={{
        background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16, padding: "clamp(12px, 4vw, 24px)", marginBottom: 20,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px, 3vw, 16px)" }}>
            <div style={{
              width: "clamp(40px, 10vw, 52px)", height: "clamp(40px, 10vw, 52px)",
              background: "linear-gradient(135deg, #1e3a8a, #1e40af)",
              borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(30, 64, 175, 0.25)", flexShrink: 0,
            }}>
              <Landmark color="#fbbf24" size={26} strokeWidth={2.5} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                margin: 0, fontSize: "clamp(16px, 5vw, 24px)",
                color: "#f3f4f6", fontWeight: 700, wordBreak: "break-word",
              }}>
                القضية رقم {caseData.caseSerial}
              </h1>
              <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: "clamp(12px, 3.5vw, 15px)" }}>
                سنة {caseData.caseYear} - {caseData.court}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              background: sc.bg, color: sc.color,
              border: `1px solid ${sc.border}`,
              padding: "clamp(4px, 1.5vw, 6px) clamp(10px, 3vw, 14px)",
              borderRadius: 20, fontWeight: 700, fontSize: "clamp(11px, 3vw, 13px)", whiteSpace: "nowrap",
            }}>
              {getStatusLabel(caseData.status)}
            </span>

            {lastSession?.suggestedStage && (
              <span style={{
                background: `${DECISION_STAGE_MAP[lastSession.suggestedStage]?.color}15`,
                color: DECISION_STAGE_MAP[lastSession.suggestedStage]?.color,
                border: `1px solid ${DECISION_STAGE_MAP[lastSession.suggestedStage]?.color}30`,
                padding: "clamp(4px, 1.5vw, 6px) clamp(10px, 3vw, 14px)",
                borderRadius: 20, fontWeight: 700, fontSize: "clamp(11px, 3vw, 13px)",
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
              }}>
                <RotateCcw size={12} />
                {DECISION_STAGE_MAP[lastSession.suggestedStage]?.stageLabel}
              </span>
            )}

            {isAdmin && (
              <Link to={`/edit/${id}`} style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "clamp(8px, 2.5vw, 10px) clamp(12px, 3vw, 18px)",
                  background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 12,
                  cursor: "pointer", fontSize: "clamp(11px, 3vw, 13px)", fontWeight: 600,
                  fontFamily: "inherit", transition: "all 0.2s ease", whiteSpace: "nowrap",
                }}>
                  <Edit3 size={15} /> تعديل
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ========== WORKFLOW BANNER ========== */}
      <WorkflowBanner lastSession={lastSession} />

      {/* ========== STATS ========== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(clamp(120px, 30vw, 160px), 1fr))",
        gap: "clamp(8px, 2vw, 12px)", marginBottom: 20,
      }}>
        <InfoBox icon={Landmark} title="المحكمة" value={caseData.court} color="#60a5fa" />
        <InfoBox
          icon={FileText} title="المرحلة" value={caseData.stage} color="#8b5cf6"
          badge={lastSession?.suggestedStage ? {
            text: "تلقائي",
            bg: `${DECISION_STAGE_MAP[lastSession.suggestedStage]?.color}12`,
            color: DECISION_STAGE_MAP[lastSession.suggestedStage]?.color,
            border: `${DECISION_STAGE_MAP[lastSession.suggestedStage]?.color}25`,
          } : null}
        />
        <InfoBox icon={Calendar} title="الجلسات" value={safeSessions.length} color="#d97706" />
        <InfoBox icon={Gavel} title="الأحكام" value={judgments.length} color="#1e40af" />
        <InfoBox icon={Briefcase} title="الأعمال" value={tasks.length} color="#f59e0b" />
        <InfoBox icon={Users} title="الموكلين" value={safeClients.length} color="#10b981" />
      </div>

      {/* ========== CASE INFO ========== */}
      <SectionCard title="بيانات القضية" icon={FileText} iconColor="#60a5fa">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, clamp(150px, 40vw, 220px)), 1fr))",
          gap: "clamp(6px, 2vw, 12px)",
        }}>
          {[
            { label: "رقم القضية", value: caseData.caseSerial },
            { label: "سنة القضية", value: caseData.caseYear },
            { label: "نوع القضية", value: caseData.caseType || "غير محدد" },
            { label: "المحكمة", value: caseData.court },
            { label: "الدائرة", value: caseData.department || "غير محدد" },
            { label: "المرحلة", value: caseData.stage || "غير محدد" },
            { label: "درجة التقاضي", value: caseData.litigationDegree || "ابتدائي" },
            { label: "السكرتير", value: caseData.secretary || "غير مسجل" },
          ].map(item => (
            <div key={item.label} style={{
              padding: "clamp(8px, 2.5vw, 10px) clamp(10px, 3vw, 14px)",
              background: "rgba(15, 23, 42, 0.5)", borderRadius: 10,
            }}>
              <div style={{ color: "#6b7280", fontSize: "clamp(10px, 3vw, 12px)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ color: "#f3f4f6", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ========== CASE SUBJECT ========== */}
      <SectionCard title="موضوع الدعوى" icon={FileText} iconColor="#8b5cf6">
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#9ca3af", fontSize: "clamp(13px, 3.5vw, 14px)", margin: 0 }}>
          {caseData.caseSubject || caseData.notes || "لم يتم تدوين موضوع أو ملخص لهذه الدعوى بعد."}
        </p>
      </SectionCard>

      {/* ========== CLIENTS ========== */}
      <SectionCard title="الموكلون" icon={Users} iconColor="#10b981">
        {safeClients.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px 0" }}>لا يوجد موكلون مرتبطون بهذه القضية.</p>
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
                <div style={{ color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>الرقم القومي: {c.nationalId || "غير مسجل"}</div>
                <span style={{
                  background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee",
                  padding: "4px 12px", borderRadius: 8,
                  fontSize: "clamp(10px, 3vw, 12px)", fontWeight: 600, alignSelf: "flex-start",
                }}>الصفة: {c.currentCaseRole || "غير محددة"}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ========== OPPONENTS ========== */}
      <SectionCard title="أطراف الخصوم" icon={Shield} iconColor="#ef4444">
        {safeOpponents.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px 0" }}>لا يوجد خصوم مسجلين.</p>
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
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 3vw, 13px)", color: "#9ca3af" }}>
                      <MapPin size={13} style={{ display: "inline", marginLeft: 4 }} />{o.address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ========== TABS: ALL 3 SECTIONS ========== */}
      <div style={{
        background: "#1e293b", border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16, padding: "clamp(12px, 4vw, 24px)", marginBottom: 20,
      }}>
        {/* Tab Buttons */}
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
                  background: "transparent", color: isActive ? "#60a5fa" : "#6b7280",
                  fontWeight: isActive ? 700 : 500, fontSize: "clamp(12px, 3.5vw, 14px)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "inherit", transition: "all 0.2s ease",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <TabIcon size={16} />
                {tab.label}
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

        {/* Tab Content */}
        {activeTab === "sessions" && (
          <SessionsTimeline
            caseId={id}
            sessions={safeSessions}
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
        )}

        {activeTab === "judgments" && (
          <JudgmentsSection
            caseId={id}
            judgments={judgments}
            sessions={safeSessions}
            onAddJudgment={isAdmin ? () => {
              // Open judgment form with session selector
              setLinkedSessionForJudgment(null);
              setShowJudgmentForm(true);
            } : null}
          />
        )}

        {activeTab === "admin" && (
          <AdminTasksSection
            caseId={id}
            sessions={safeSessions}
            tasks={tasks}
            onAddTask={isAdmin ? handleAddTask : null}  // ✅ NEW: Pass add handler
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
          الإجراءات السريعة
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(140px, 40vw, 180px)), 1fr))",
          gap: "clamp(8px, 2vw, 12px)",
        }}>
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

          {/* ✅ NEW: Quick Add Admin Task button */}
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

      {/* ========== SESSION FORM MODAL ========== */}
      {showSessionForm && (
        <SessionForm
          session={editingSession}
          caseId={id}
          caseData={caseData}
          onClose={() => { setShowSessionForm(false); setEditingSession(null); }}
          onSave={handleSaveSession}
        />
      )}

      {/* ========== DECISION FORM MODAL ========== */}
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
              <button
                onClick={() => { setShowDecisionForm(false); setLinkedSessionForDecision(null); }}
                style={{
                  background: "none", border: "none", color: "#9ca3af",
                  cursor: "pointer", padding: 8, borderRadius: 10, minWidth: 44, minHeight: 44,
                }}
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

      {/* ========== JUDGMENT FORM MODAL ========== */}
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
              <button
                onClick={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
                style={{
                  background: "none", border: "none", color: "#9ca3af",
                  cursor: "pointer", padding: 8, borderRadius: 10, minWidth: 44, minHeight: 44,
                }}
              ><ArrowLeft size={20} /></button>
            </div>
            <JudgmentForm
              caseId={id}
              sessions={safeSessions}
              preSelectedSession={linkedSessionForJudgment}
              onClose={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
              onSave={handleSaveJudgment}
            />
          </div>
        </div>
      )}

      {/* ✅ NEW: ADMIN TASK FORM MODAL ========== */}
      {showTaskForm && (
        <AdminTaskForm
          caseId={id}
          sessions={safeSessions}
          task={null}
          onClose={handleCloseTaskForm}
        />
      )}
    </div>
  );
}