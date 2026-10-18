import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Shield, RotateCcw, LayoutGrid, Calendar, Gavel, Briefcase, FileArchive } from "lucide-react";
import {
  doc, onSnapshot, getDoc, updateDoc, collection,
  query, where, addDoc
} from "firebase/firestore";
import CaseHeader from "../components/case/details/CaseHeader";
import CaseOverviewTab from "../components/case/details/CaseOverviewTab";
import LevelSection from "../components/case/details/LevelSection";
import CaseTabs from "../components/case/details/CaseTabs";
import CaseModals from "../components/case/details/CaseModals";
import { getDocuments } from "../services/documents";
import { useLitigationLevels } from "../hooks/useLitigationLevels";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { useTheme } from "../context/ThemeContext.jsx";
import { isAdminRole, normalizeDate, sortSessionsByDate, validateTenant } from "../utils/caseHelpers";

// ============================================================
// صفحة تفاصيل القضية — نسخة مُعاد هيكلتها
// البنية الجديدة:
//   CaseHeader (ترويسة مركّزة + أزرار أساسية)
//   LevelSection (شريط زمني للدرجات + شريط معلومات مضغوط)
//   CaseTabs (نظرة عامة | سير الدعوى | الأحكام | الأعمال | المستندات)
//   CaseModals (كل النوافذ المنبثقة)
// هذه الصفحة الآن مسؤولة عن البيانات والمنطق فقط (Data/Orchestration).
// ============================================================

function LoadingState() {
  const { theme } = useTheme();
  const { colors } = theme;
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
  const { theme } = useTheme();
  const { colors, radius } = theme;
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
  const { theme } = useTheme();
  const { colors, spacing, radius, shadows, page } = theme;
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
  const [activeTab, setActiveTab] = useState("overview");

  // 📁 DOCUMENTS STATE
  const [caseDocs, setCaseDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showDocUploader, setShowDocUploader] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

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

          const sessionsWithId = (data.sessions || []).map(s => {
            const normalizedDate = s.date || s.nextSessionDate || '';
            return {
              ...s,
              id: s.id || crypto.randomUUID(),
              date: normalizedDate,
              decisionDetails: s.decisionDetails || s.decision || '',
              decisionType: s.decisionType || 'pending',
              // ✅ FIX: اقرأ الحقلين (levelId الجديد + litigationLevelId القديم)
              // حتى تُصلح تلقائياً الجلسات المحفوظة سابقاً بالاسم القديم
              levelId: s.levelId || s.litigationLevelId || activeLevel?.id || null,
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
    if (!id || !userData?.officeId) return;
    // ✅ officeId في الفلتر — مطلوب لتوافق قواعد Firestore (وليس ترفيهًا)
    const q = query(
      collection(db, "judgments"),
      where("officeId", "==", userData.officeId),
      where("caseId", "==", id)
    );
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
  }, [id, userData?.officeId]);

  useEffect(() => {
    if (!id || !userData?.officeId) return;
    // ✅ officeId في الفلتر — مطلوب لتوافق قواعد Firestore
    const q = query(
      collection(db, "adminTasks"),
      where("officeId", "==", userData.officeId),
      where("caseId", "==", id)
    );
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
  }, [id, userData?.officeId]);

  // 📁 LOAD DOCUMENTS FOR THIS CASE
  const loadCaseDocuments = useCallback(async () => {
    if (!userData?.officeId || !id) return;
    setDocsLoading(true);
    try {
      const docs = await getDocuments(userData.officeId, { caseId: id });
      setCaseDocs(docs);
    } catch (err) {
      console.error("Error loading case documents:", err);
    } finally {
      setDocsLoading(false);
    }
  }, [userData?.officeId, id]);

  useEffect(() => {
    loadCaseDocuments();
  }, [loadCaseDocuments]);

  const handleDocUploadComplete = () => {
    setShowDocUploader(false);
    loadCaseDocuments();
  };

  const handleDocDelete = (docId) => {
    setCaseDocs(prev => prev.filter(d => d.id !== docId));
  };

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
        setShowDocUploader(false);
        setSelectedDoc(null);
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
      const originalDate = editingSession ? (baseSession.date || '') : null;

      // ✅ احترم اختيار المستخدم من القائمة المنسدلة ثم الدرجة المختارة ثم النشطة
      const targetLevelId = formData.litigationLevelId || selectedLevel?.id || activeLevel?.id || null;

      // ✅ الفورم هو المرجع (معبّأ بالأصلية عند التعديل) — يسمح بنقل موعد الجلسة
      const sessionData = {
        ...baseSession,
        id: baseSession.id || crypto.randomUUID(),
        title: formData.title,
        date: formData.date || originalDate,
        // ✅ احتفظ برابط الجلسة المقبلة المحفوظ عند التعديل
        nextSessionDate: formData.nextSessionDate || baseSession.nextSessionDate || null,
        nextSessionTime: formData.nextSessionTime || baseSession.nextSessionTime || '',
        nextSessionLocation: formData.nextSessionLocation || baseSession.nextSessionLocation || '',
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
        // ✅ نفس القيمة بالاسمين حتى لا يضيع الربط أينما قُرئت
        levelId: targetLevelId,
        litigationLevelId: targetLevelId,
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

      // ✅ إنشاء/تحديث الجلسة المقبلة — بشروط صارمة ضد التكرار:
      // 1) يجب أن يكون الخيار مفعّلًا (وليس مجرد وجود تاريخ)
      // 2) يجب أن يختلف تاريخها عن تاريخ الجلسة الحالية
      // 3) يجب ألا توجد أي جلسة أخرى بنفس التاريخ (فحص شامل بلا استثناءات)
      const decisionCreatesNext = ['adjourned', 'adjourned_notice', 'referred', 'expert', 'absence'].includes(formData.decisionType);
      const wantsNext = formData.autoCreateNextSession !== false && !!formData.nextSessionDate;
      const nextDate = formData.nextSessionDate;
      const currentDate = formData.date || originalDate;
      const shouldCreateNext = decisionCreatesNext && wantsNext && !!nextDate && nextDate !== currentDate;

      if (shouldCreateNext) {
        // أولاً: ابحث عن جلسة مرتبطة سابقًا (عند التعديل) لتحديثها بدل إنشاء مكرر
        const linkedSession = editingSession
          ? safeSessions.find(s =>
              s.id !== sessionData.id &&
              (s.date === baseSession.nextSessionDate || s.date === nextDate))
          : null;

        if (linkedSession) {
          updatedSessions = updatedSessions.map(s =>
            s.id === linkedSession.id
              ? {
                  ...linkedSession,
                  title: formData.nextSessionTitle || linkedSession.title || sessionData.decisionLabel || sessionData.decisionType || "جلسة مؤجلة",
                  date: nextDate,
                  time: formData.nextSessionTime || linkedSession.time || '',
                  location: formData.nextSessionLocation || linkedSession.location || '',
                  levelId: targetLevelId,
                  litigationLevelId: targetLevelId,
                  updatedAt: now,
                }
              : s
          );
        } else {
          // ثانياً: فحص شامل — لا تُنشئ إطلاقًا إن وُجدت أي جلسة بنفس التاريخ
          const alreadyExists = updatedSessions.some(s => s.date === nextDate);

          if (!alreadyExists) {
            const nextSession = {
              id: crypto.randomUUID(),
              title: formData.nextSessionTitle || sessionData.decisionDetails || sessionData.decisionLabel || sessionData.decisionType || "جلسة مؤجلة",
              date: nextDate,
              nextSessionDate: null,
              time: formData.nextSessionTime || formData.time || '',
              location: formData.nextSessionLocation || formData.location || '',
              court: formData.court || sessionData.location || '',
              roll: formData.roll || '',
              description: '',
              notes: `جلسة قادمة نتيجة قرار: ${sessionData.decisionLabel || sessionData.decisionType}`,
              attachments: [],
              decisionType: 'pending',
              decisionDetails: '',
              decisionDate: '',
              decisionLabel: '',
              suggestedStage: '',
              suggestedTask: '',
              stageLabel: '',
              // ✅ الجلسة المقبلة ترث نفس درجة التقاضي
              levelId: targetLevelId,
              litigationLevelId: targetLevelId,
              createdAt: now,
              createdBy: userData?.uid || null,
              updatedAt: now,
            };
            updatedSessions = [...updatedSessions, nextSession];
          }
        }
      }

      await updateDoc(doc(db, "cases", id), { sessions: updatedSessions });

      // ✅ تحديث عدّاد جلسات الدرجة (لا ينطبق على الدرجة الافتراضية الوهمية legacy_*)
      if (!editingSession && targetLevelId && !String(targetLevelId).startsWith('legacy_')) {
        try {
          const { incrementLevelSessionCount } = await import("../services/litigationLevels");
          await incrementLevelSessionCount(targetLevelId, userData?.officeId);
        } catch (cntErr) {
          console.warn("تعذر تحديث عدّاد جلسات الدرجة:", cntErr);
        }
      }

      if (!editingSession && sessionData.suggestedTask) {
        try {
          await addDoc(collection(db, "adminTasks"), {
            caseId: id,
            sessionId: sessionData.id,
            title: sessionData.suggestedTask,
            description: `مهمة تلقائية من جلسة: ${sessionData.title}`,
            status: 'pending',
            priority: 'high',
            levelId: targetLevelId,
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
      const now = new Date().toISOString();

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

  const handleSaveJudgment = useCallback(async (judgmentData) => {
    try {
      await addDoc(collection(db, "judgments"), {
        ...judgmentData,
        caseId: id,
        sessionId: linkedSessionForJudgment?.id || null,
        sessionTitle: linkedSessionForJudgment?.title || '',
        sessionDate: linkedSessionForJudgment?.date || '',
        officeId: userData?.officeId || '',
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

  const tabs = [
    { key: "overview", label: "نظرة عامة", count: 0, icon: LayoutGrid },
    { key: "sessions", label: "سير الدعوى", count: levelSessions.length, icon: Calendar },
    { key: "judgments", label: "الأحكام", count: levelJudgments.length, icon: Gavel },
    { key: "admin", label: "الأعمال الإدارية", count: levelTasks.length, icon: Briefcase },
    { key: "documents", label: "المستندات", count: caseDocs.length, icon: FileArchive },
  ];

  const closeSessionForm = () => { setShowSessionForm(false); setEditingSession(null); };
  const closeDecisionForm = () => { setShowDecisionForm(false); setLinkedSessionForDecision(null); };
  const closeJudgmentForm = () => { setShowJudgmentForm(false); setLinkedSessionForJudgment(null); };

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

      <CaseHeader
        caseData={caseData}
        clientsCount={safeClients.length}
        opponentsCount={safeOpponents.length}
        canViewFinance={canViewFinance}
      />

      <LevelSection
        levels={levels}
        selectedLevel={selectedLevel}
        setSelectedLevelId={setSelectedLevelId}
        isAdmin={isAdmin}
        activeLevel={activeLevel}
        levelsLoading={levelsLoading}
        onCreateLevel={handleCreateNextLevel}
        lastSession={lastSession}
      />

      <CaseTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        isAdmin={isAdmin}
        id={id}
        levelSessions={levelSessions}
        sortedLevelSessions={sortedLevelSessions}
        levelJudgments={levelJudgments}
        levelTasks={levelTasks}
        caseDocs={caseDocs}
        docsLoading={docsLoading}
        showDocUploader={showDocUploader}
        setShowDocUploader={setShowDocUploader}
        onUploadComplete={handleDocUploadComplete}
        onDocDelete={handleDocDelete}
        setSelectedDoc={setSelectedDoc}
        onAddSession={handleAddSession}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
        onAddDecision={handleAddDecision}
        onAddJudgmentFromSession={handleAddJudgmentFromSession}
        onAddTaskFromSession={handleAddTaskFromSession}
        onAddTask={handleAddTask}
        onSaveJudgment={handleSaveJudgment}
        overviewContent={
          <CaseOverviewTab
            clients={clients}
            safeClients={safeClients}
            safeOpponents={safeOpponents}
            caseData={caseData}
          />
        }
        getLinkedJudgment={(sessionId) => judgmentsBySession[sessionId]?.[0] || null}
        getLinkedTasks={(sessionId) => tasksBySession[sessionId] || []}
      />

      <CaseModals
        id={id}
        caseData={caseData}
        sortedLevelSessions={sortedLevelSessions}
        colors={colors}
        levels={levels}                    // ✅ FIX: تمرير الدرجات (بما فيها الوهمية للقضايا القديمة)
        selectedLevelId={selectedLevel?.id} // ✅ FIX: الدرجة المختارة حاليًا في شريط الدرجات
        showSessionForm={showSessionForm}
        editingSession={editingSession}
        onCloseSessionForm={closeSessionForm}
        onSaveSession={handleSaveSession}
        showDecisionForm={showDecisionForm}
        linkedSessionForDecision={linkedSessionForDecision}
        onCloseDecisionForm={closeDecisionForm}
        onSaveDecision={handleSaveDecision}
        showJudgmentForm={showJudgmentForm}
        linkedSessionForJudgment={linkedSessionForJudgment}
        onCloseJudgmentForm={closeJudgmentForm}
        onSaveJudgment={handleSaveJudgment}
        showTaskForm={showTaskForm}
        taskFormSession={taskFormSession}
        onCloseTaskForm={handleCloseTaskForm}
        onSaveTask={handleSaveTask}
        selectedDoc={selectedDoc}
        onCloseDocPreview={() => setSelectedDoc(null)}
      />
    </div>
  );
}
