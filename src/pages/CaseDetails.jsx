import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  addDoc,
} from "firebase/firestore";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { CASE_STATUS_LIST } from "../constants/caseStatus";
import {
  Landmark, Plus, Edit3, Calendar, Users, Shield, FileText,
  ChevronDown, ChevronUp, Clock, MapPin, CheckCircle2, Trash2,
  Gavel, Briefcase, DollarSign, MessageSquare, ArrowLeft
} from "lucide-react";
import SessionsTimeline from "../components/case/SessionsTimeline";
import SessionForm from "../components/case/SessionForm";
import JudgmentsSection from "../components/case/JudgmentsSection";
import JudgmentForm from "../components/case/JudgmentForm";
import DecisionForm from "../components/case/DecisionForm";
import AdminTasksSection from "../components/case/AdminTasksSection";

const getStatusLabel = (status) => {
  const found = CASE_STATUS_LIST.find(s => s.value === status);
  return found ? found.label : (status || "غير محدد");
};

const statusColors = {
  active: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  pending: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  closed: { bg: "rgba(107, 114, 128, 0.15)", color: "#6b7280", border: "rgba(107, 114, 128, 0.3)" },
  archived: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

// ================= InfoBox =================
function InfoBox({ icon: Icon, title, value, color = "#60a5fa" }) {
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
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#6b7280", fontSize: "clamp(10px, 3vw, 12px)", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{
          fontWeight: 700,
          color: "#f3f4f6",
          fontSize: "clamp(12px, 3.5vw, 15px)",
          wordBreak: "break-word",
        }}>
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

// ================= Section Card =================
function SectionCard({ title, icon: Icon, iconColor = "#60a5fa", children, style = {} }) {
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid rgba(55, 65, 81, 0.5)",
      borderRadius: 16,
      padding: "clamp(12px, 4vw, 24px)",
      marginBottom: 20,
      ...style,
    }}>
      <h2 style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "0 0 16px 0",
        color: "#f3f4f6",
        fontSize: "clamp(14px, 4vw, 18px)",
        fontWeight: 700,
        paddingBottom: 12,
        borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
      }}>
        <Icon size={20} color={iconColor} strokeWidth={2.5} />
        {title}
      </h2>
      {children}
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
  const [editingSession, setEditingSession] = useState(null);
  const [linkedSessionForJudgment, setLinkedSessionForJudgment] = useState(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("sessions");
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    subject: false,
    clients: false,
    opponents: false,
  });

  const isAdmin = userData?.role === "admin" || userData?.role === "superadmin";
  const canViewFinance = userData?.role === "admin" || userData?.role === "staff";

  // Decision form states - MOVED HERE before any if/return
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [editingDecisionSession, setEditingDecisionSession] = useState(null);

  // ================= Load Case =================
  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, "cases", id), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        // Ensure all sessions have IDs
        const needsUpdate = (data.sessions || []).some((s) => !s.id);
        let sessionsWithId = data.sessions || [];

        if (needsUpdate) {
          sessionsWithId = sessionsWithId.map((s) => ({
            ...s,
            id: s.id || crypto.randomUUID(),
          }));
          await updateDoc(doc(db, "cases", id), { sessions: sessionsWithId });
        }

        setCaseData({
          id: snap.id,
          ...data,
          sessions: sessionsWithId,
          clients: data.clients || [],
          opponents: data.opponents || [],
        });
      } else {
        setCaseData(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  // ================= Load Clients =================
  useEffect(() => {
    const fetchClients = async () => {
      if (!caseData?.clients?.length) {
        setClients([]);
        return;
      }

      const result = await Promise.all(
        caseData.clients.map(async (clientItem) => {
          const clientId = typeof clientItem === "object" ? clientItem.id : clientItem;
          const clientRole = typeof clientItem === "object" ? clientItem.clientRole : "موكل (غير محدد)";

          const snap = await getDoc(doc(db, "clientProfiles", clientId));
          if (!snap.exists()) return null;

          return {
            id: snap.id,
            ...snap.data(),
            currentCaseRole: clientRole,
          };
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
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJudgments(data);
    });
    return () => unsub();
  }, [id]);

  // ================= Load Admin Tasks (linked to case) =================
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "adminTasks"), where("caseId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(data);
    });
    return () => unsub();
  }, [id]);

  // ================= Auto-open decision modal from notification =================
  useEffect(() => {
    const action = searchParams.get("action");
    const sessionDate = searchParams.get("sessionDate");

    if (action === "recordDecision" && caseData?.sessions?.length > 0) {
      const targetSession = caseData.sessions.find((s) => {
        const sDate = s.nextSessionDate || s.date;
        return sDate === sessionDate;
      });

      if (targetSession) {
        setEditingSession(targetSession);
        setShowSessionForm(true);
      }
    }
  }, [searchParams, caseData]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <div style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(30, 64, 175, 0.2)",
          borderTopColor: "#1e40af",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
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

  // ================= Helpers for linked data =================
  const getLinkedJudgment = (sessionId) => {
    return judgments.find(j => j.sessionId === sessionId) || null;
  };

  const getLinkedTasks = (sessionId) => {
    return tasks.filter(t => t.sessionId === sessionId);
  };

  // ================= Session Handlers =================
  const handleSaveSession = async (formData) => {
    const sessionData = {
      id: editingSession?.id || crypto.randomUUID(),
      title: formData.title,
      date: formData.date,
      nextSessionDate: formData.date,
      time: formData.time,
      location: formData.location,
      roll: formData.roll,
      description: formData.description,
      decision: formData.decision,
      action: formData.decision,
      notes: formData.notes,
      attachments: formData.attachments || [],
      createdAt: editingSession?.createdAt || new Date().toISOString(),
      createdBy: editingSession?.createdBy || userData?.uid || null,
      updatedAt: new Date().toISOString(),
    };

    let updatedSessions;
    if (editingSession) {
      updatedSessions = safeSessions.map((s) =>
        s.id === editingSession.id ? sessionData : s
      );
    } else {
      updatedSessions = [...safeSessions, sessionData];
    }

    await updateDoc(doc(db, "cases", id), { sessions: updatedSessions });
    setShowSessionForm(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("هل تريد حذف هذه الجلسة نهائياً؟")) return;
    const updated = safeSessions.filter((s) => s.id !== sessionId);
    await updateDoc(doc(db, "cases", id), { sessions: updated });
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setShowSessionForm(true);
  };

  const handleAddSession = () => {
    setEditingSession(null);
    setShowSessionForm(true);
  };

  // ================= Decision Handler (linked to session) =================
  const handleAddDecision = (session) => {
    setEditingDecisionSession(session);
    setShowDecisionForm(true);
  };

  const handleSaveDecision = async (decisionData) => {
    if (!editingDecisionSession) return;

    const updatedSessions = safeSessions.map((s) =>
      s.id === editingDecisionSession.id
        ? { ...s, decision: decisionData.decision, notes: decisionData.notes }
        : s
    );

    await updateDoc(doc(db, "cases", id), { sessions: updatedSessions });
    setShowDecisionForm(false);
    setEditingDecisionSession(null);
  };

  // ================= Judgment Handlers (linked to session) =================
  const handleAddJudgmentFromSession = (session, existingJudgment = null) => {
    setLinkedSessionForJudgment(session);
    setShowJudgmentForm(true);
    if (existingJudgment) {
      // Pass existing judgment to edit mode
    }
  };

  const handleSaveJudgment = async (judgmentData) => {
    // Save judgment with sessionId
    const data = {
      ...judgmentData,
      caseId: id,
      sessionId: linkedSessionForJudgment?.id || null,
      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || null,
    };

    // Add to judgments collection
    await addDoc(collection(db, "judgments"), data);
    setShowJudgmentForm(false);
    setLinkedSessionForJudgment(null);
  };

  const handleAddTaskFromSession = (session) => {
    // Navigate to add task with sessionId
    // Or open task form modal
    alert("فتح فورم إضافة عمل إداري مرتبط بالجلسة: " + session.title);
  };

  // ================= Tabs =================
  const tabs = [
    { key: "sessions", label: "الجلسات", count: safeSessions.length, icon: Calendar },
    { key: "judgments", label: "الأحكام", count: judgments.length, icon: Gavel },
    { key: "admin", label: "الأعمال الإدارية", count: tasks.length, icon: Briefcase },
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div style={{
      padding: "clamp(8px, 3vw, 24px)",
      background: "#0f172a",
      minHeight: "100vh",
      direction: "rtl",
      fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
    }}>

      {/* ========== HEADER ========== */}
      <div style={{
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16,
        padding: "clamp(12px, 4vw, 24px)",
        marginBottom: 20,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px, 3vw, 16px)" }}>
            <div style={{
              width: "clamp(40px, 10vw, 52px)",
              height: "clamp(40px, 10vw, 52px)",
              background: "linear-gradient(135deg, #1e3a8a, #1e40af)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(30, 64, 175, 0.25)",
              flexShrink: 0,
            }}>
              <Landmark color="#fbbf24" size={26} strokeWidth={2.5} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontSize: "clamp(16px, 5vw, 24px)",
                color: "#f3f4f6",
                fontWeight: 700,
                wordBreak: "break-word",
              }}>
                القضية رقم {caseData.caseSerial}
              </h1>
              <p style={{ 
                margin: "6px 0 0 0", 
                color: "#9ca3af", 
                fontSize: "clamp(12px, 3.5vw, 15px)" 
              }}>
                سنة {caseData.caseYear} - {caseData.court}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{
              background: sc.bg,
              color: sc.color,
              border: `1px solid ${sc.border}`,
              padding: "clamp(4px, 1.5vw, 6px) clamp(10px, 3vw, 14px)",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: "clamp(11px, 3vw, 13px)",
              whiteSpace: "nowrap",
            }}>
              {getStatusLabel(caseData.status)}
            </span>

            {isAdmin && (
              <Link to={`/edit/${id}`} style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "clamp(8px, 2.5vw, 10px) clamp(12px, 3vw, 18px)",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "clamp(11px, 3vw, 13px)",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}>
                  <Edit3 size={15} />
                  تعديل
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ========== STATS ========== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(clamp(120px, 30vw, 160px), 1fr))",
        gap: "clamp(8px, 2vw, 12px)",
        marginBottom: 20,
      }}>
        <InfoBox icon={Landmark} title="المحكمة" value={caseData.court} color="#60a5fa" />
        <InfoBox icon={FileText} title="المرحلة" value={caseData.stage} color="#8b5cf6" />
        <InfoBox icon={Calendar} title="الجلسات" value={safeSessions.length} color="#d97706" />
        <InfoBox icon={Gavel} title="الأحكام" value={judgments.length} color="#1e40af" />
        <InfoBox icon={Briefcase} title="الأعمال" value={tasks.length} color="#f59e0b" />
        <InfoBox icon={Users} title="الموكلين" value={safeClients.length} color="#10b981" />
      </div>

      {/* ========== COLLAPSIBLE SECTIONS ========== */}
      {/* Case Info */}
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
          ].map((item) => (
            <div key={item.label} style={{
              padding: "clamp(8px, 2.5vw, 10px) clamp(10px, 3vw, 14px)",
              background: "rgba(15, 23, 42, 0.5)",
              borderRadius: 10,
            }}>
              <div style={{ color: "#6b7280", fontSize: "clamp(10px, 3vw, 12px)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ color: "#f3f4f6", fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Case Subject */}
      <SectionCard title="موضوع الدعوى" icon={FileText} iconColor="#8b5cf6">
        <p style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.7,
          color: "#9ca3af",
          fontSize: "clamp(13px, 3.5vw, 14px)",
          margin: 0,
        }}>
          {caseData.caseSubject || caseData.notes || "لم يتم تدوين موضوع أو ملخص لهذه الدعوى بعد."}
        </p>
      </SectionCard>

      {/* Clients */}
      <SectionCard title="الموكلون" icon={Users} iconColor="#10b981">
        {safeClients.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px 0" }}>
            لا يوجد موكلون مرتبطون بهذه القضية.
          </p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(250px, 70vw, 280px)), 1fr))",
            gap: 10,
          }}>
            {clients.map((c) => (
              <div key={c.id} style={{
                padding: "clamp(10px, 3vw, 16px)",
                background: "rgba(15, 23, 42, 0.5)",
                borderRadius: 12,
                border: "1px solid rgba(55, 65, 81, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <div style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "clamp(13px, 4vw, 15px)" }}>
                  {c.fullName}
                </div>
                <div style={{ color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>
                  الرقم القومي: {c.nationalId || "غير مسجل"}
                </div>
                <span style={{
                  background: "rgba(6, 182, 212, 0.15)",
                  color: "#22d3ee",
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: "clamp(10px, 3vw, 12px)",
                  fontWeight: 600,
                  alignSelf: "flex-start",
                }}>
                  الصفة: {c.currentCaseRole || "غير محددة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Opponents */}
      <SectionCard title="أطراف الخصوم" icon={Shield} iconColor="#ef4444">
        {safeOpponents.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px 0" }}>
            لا يوجد خصوم مسجلين.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {safeOpponents.map((o, i) => (
              <div key={o.id || i} style={{
                padding: "clamp(10px, 3vw, 16px)",
                background: "rgba(15, 23, 42, 0.5)",
                borderRadius: 12,
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "clamp(13px, 4vw, 15px)" }}>
                    {i + 1}. {o.name}
                  </div>
                  <span style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: "clamp(10px, 3vw, 12px)",
                    fontWeight: 600,
                    alignSelf: "flex-start",
                  }}>
                    الصفة: {o.caseRole || "مدعى عليه"}
                  </span>
                  {o.address && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 3vw, 13px)", color: "#9ca3af" }}>
                      <MapPin size={13} style={{ display: "inline", marginLeft: 4 }} />
                      {o.address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ========== TABS ========== */}
      <div style={{
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16,
        padding: "clamp(12px, 4vw, 24px)",
        marginBottom: 20,
      }}>
        {/* Tab Buttons */}
        <div style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
          marginBottom: 20,
          flexWrap: "wrap",
          overflowX: "auto",
          paddingBottom: 4,
        }}>
          {tabs.map((tab) => {
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
                  background: "transparent",
                  color: isActive ? "#60a5fa" : "#6b7280",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <TabIcon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: isActive ? "#1e40af" : "rgba(55, 65, 81, 0.5)",
                    color: isActive ? "#fff" : "#9ca3af",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {tab.count}
                  </span>
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
            getLinkedJudgment={getLinkedJudgment}
            getLinkedTasks={getLinkedTasks}
          />
        )}

        {activeTab === "judgments" && (
          <JudgmentsSection
            caseId={id}
            judgments={judgments}
            sessions={safeSessions}
          />
        )}

        {activeTab === "admin" && (
          <AdminTasksSection
            caseId={id}
            sessions={safeSessions}
            tasks={tasks}
          />
        )}
      </div>

      {/* ========== QUICK ACTIONS ========== */}
      <div style={{
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16,
        padding: "clamp(12px, 4vw, 24px)",
        marginBottom: 20,
      }}>
        <h2 style={{
          fontSize: "clamp(14px, 4vw, 18px)",
          fontWeight: 700,
          color: "#f3f4f6",
          margin: "0 0 16px 0",
          display: "flex",
          alignItems: "center",
          gap: 10,
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
              width: "100%",
              padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}>
              <Edit3 size={16} />
              تعديل القضية
            </button>
          </Link>

          <button
            onClick={handleAddSession}
            style={{
              width: "100%",
              padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <Calendar size={16} />
            جلسة جديدة
          </button>

          <Link to={`/add-stage/${id}`} style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%",
              padding: "clamp(8px, 2.5vw, 14px)",
              background: "rgba(217, 119, 6, 0.15)",
              color: "#d97706",
              border: "1px solid rgba(217, 119, 6, 0.3)",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}>
              <FileText size={16} />
              مرحلة جديدة
            </button>
          </Link>

          {canViewFinance && (
            <Link to={`/case-finance/${id}`} style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%",
                padding: "clamp(8px, 2.5vw, 14px)",
                background: "rgba(139, 92, 246, 0.15)",
                color: "#8b5cf6",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: "clamp(12px, 3.5vw, 14px)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}>
                <DollarSign size={16} />
                الحسابات
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ========== SESSION FORM MODAL ========== */}
      {showSessionForm && (
        <SessionForm
          session={editingSession}
          caseId={id}
          onClose={() => { setShowSessionForm(false); setEditingSession(null); }}
          onSave={handleSaveSession}
        />
      )}

      {/* ========== DECISION FORM MODAL ========== */}
      {showDecisionForm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 24,
            width: "100%",
            maxWidth: 600,
            maxHeight: "90vh",
            overflow: "auto",
            padding: 24,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
            }}>
              <div>
                <h2 style={{ margin: 0, color: "#f3f4f6", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700 }}>
                  إضافة قرار للجلسة
                </h2>
                {editingDecisionSession && (
                  <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>
                    الجلسة: {editingDecisionSession.title || editingDecisionSession.date}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowDecisionForm(false); setEditingDecisionSession(null); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 10,
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            <DecisionForm
              session={editingDecisionSession}
              onClose={() => { setShowDecisionForm(false); setEditingDecisionSession(null); }}
              onSave={handleSaveDecision}
            />
          </div>
        </div>
      )}

      {/* ========== JUDGMENT FORM MODAL (linked to session) ========== */}
      {showJudgmentForm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 24,
            width: "100%",
            maxWidth: 600,
            maxHeight: "90vh",
            overflow: "auto",
            padding: 24,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
            }}>
              <div>
                <h2 style={{ margin: 0, color: "#f3f4f6", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 700 }}>
                  إضافة حكم مرتبط بالجلسة
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
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 10,
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            <JudgmentForm
              caseId={id}
              onClose={() => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); }}
              onSave={handleSaveJudgment}
            />
          </div>
        </div>
      )}
    </div>
  );
}
