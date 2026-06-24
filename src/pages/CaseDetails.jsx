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
} from "firebase/firestore";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getStatusLabel } from "../constants/caseStatusLabels";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

// ================= مكون InfoBox للوحة الإحصائية =================
function InfoBox({ title, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "clamp(10px, 3vw, 15px)",
        boxShadow: "0 1px 3px rgba(0,0,0,.05)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "clamp(11px, 3vw, 13px)",
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontWeight: "bold",
          color: "#111827",
          fontSize: "clamp(13px, 3.5vw, 16px)",
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

// ================= نافذة تسجيل القرار المنبثقة =================
function DecisionModal({ session, caseId, onClose, onSave }) {
  const [decision, setDecision] = useState(session?.decision || session?.action || "");
  const [nextDate, setNextDate] = useState("");
  const [notes, setNotes] = useState(session?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!decision.trim()) {
      alert("الرجاء إدخال القرار");
      return;
    }

    setLoading(true);
    await onSave({
      ...session,
      decision,
      action: decision,
      notes,
      nextSessionDate: nextDate,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "clamp(10px, 3vw, 20px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "clamp(16px, 4vw, 24px)",
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflow: "auto",
          direction: "rtl",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px 0", color: "#1e3a8a", fontSize: "clamp(16px, 4vw, 20px)" }}>
          ✎ تسجيل قرار الجلسة
        </h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6, color: "#374151", fontWeight: "600" }}>
            📅 تاريخ الجلسة:
          </label>
          <div style={{ padding: 10, background: "#f3f4f6", borderRadius: 8, fontSize: "clamp(13px, 3.5vw, 15px)" }}>
            {session?.nextSessionDate || session?.date || "غير محدد"}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6, color: "#374151", fontWeight: "600" }}>
            📝 القرار أو الإجراء: <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              minHeight: 80,
              fontFamily: "inherit",
            }}
            placeholder="اكتب القرار الصادر في الجلسة..."
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6, color: "#374151", fontWeight: "600" }}>
            📅 تاريخ الجلسة القادمة (اختياري):
          </label>
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, color: "#374151", fontWeight: "600" }}>
            📝 ملاحظات:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              minHeight: 60,
              fontFamily: "inherit",
            }}
            placeholder="ملاحظات إضافية..."
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              flex: 1,
              padding: "clamp(10px, 3vw, 12px)",
              background: loading ? "#9ca3af" : "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              fontWeight: "600",
            }}
          >
            {loading ? "جاري الحفظ..." : "💾 حفظ القرار"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "clamp(10px, 3vw, 12px)",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "clamp(13px, 3.5vw, 15px)",
              fontWeight: "600",
            }}
          >
            ❌ إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaseDetails() {
  const { id } = useParams();
  const { userData } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [modalSession, setModalSession] = useState(null);
  const [searchParams] = useSearchParams();

  // ================= تحميل القضية =================
  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, "cases", id), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        // ✅ التحقق مما إذا كانت هناك جلسات بدون id
        const needsUpdate = (data.sessions || []).some((s) => !s.id);
        let sessionsWithId = data.sessions || [];

        if (needsUpdate) {
          // إضافة id للجلسات القديمة وحفظها في Firebase
          sessionsWithId = sessionsWithId.map((s) => ({
            ...s,
            id: s.id || crypto.randomUUID(),
          }));

          // حفظ الجلسات المُحدّثة في Firebase
          await updateDoc(doc(db, "cases", id), {
            sessions: sessionsWithId,
          });
        }

        console.log("🔥 Firebase sessions:", sessionsWithId.length, sessionsWithId);

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

  // ================= فتح Modal تسجيل القرار تلقائياً من الإشعار =================
  useEffect(() => {
    const action = searchParams.get("action");
    const sessionDate = searchParams.get("sessionDate");

    if (action === "recordDecision" && caseData?.sessions?.length > 0) {
      // نبحث عن الجلسة التي تطابق التاريخ
      const targetSession = caseData.sessions.find((s) => {
        const sDate = s.nextSessionDate || s.date;
        return sDate === sessionDate;
      });

      if (targetSession) {
        setModalSession(targetSession);
        setShowDecisionModal(true);
      } else {
        // إذا لم نجد تطابق، نفتح أول جلسة متأخرة
        const pastSessions = caseData.sessions.filter((s) => {
          const sDate = s.nextSessionDate || s.date;
          return sDate && new Date(sDate) < new Date();
        });
        if (pastSessions.length > 0) {
          setModalSession(pastSessions[0]);
          setShowDecisionModal(true);
        }
      }
    }
  }, [searchParams, caseData]);

  // ================= تحميل الموكلين (دعم البيانات القديمة والجديدة) =================
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

  if (loading) return <p style={{ padding: 20, textAlign: "center" }}>جاري تحميل ملف الدعوى...</p>;
  if (!caseData) return <p style={{ padding: 20, textAlign: "center" }}>⚠️ هذه القضية غير موجودة بالنظام</p>;

  const canViewFinance =
    userData?.role === "admin" || userData?.role === "staff";

  // ================= حذف جلسة =================
  const deleteSession = async (sessionId) => {
    const confirmDelete = window.confirm("هل تريد حذف هذه الجلسة نهائياً من أجندة المكتب؟");
    if (!confirmDelete) return;

    const updated = caseData.sessions.filter((s) => s.id !== sessionId);

    await updateDoc(doc(db, "cases", id), {
      sessions: updated,
    });
  };

  // ================= حفظ تعديل جلسة (تمت معالجته وإصلاحه بالكامل) =================
  const saveSessionChanges = async (updatedSession) => {
    const targetDate = updatedSession.nextSessionDate || updatedSession.date;
    console.log("🔍 saveSessionChanges called for date:", targetDate);
    console.log("🔍 caseData.sessions:", caseData.sessions.map(s => ({ id: s.id, date: s.nextSessionDate || s.date })));

    // ✅ نحافظ على كل الجلسات ونُحدّث الجلسة المطلوبة بالتاريخ
    const updated = caseData.sessions.map((s) => {
      const sDate = s.nextSessionDate || s.date;
      const isMatch = s.id === updatedSession.id || sDate === targetDate;
      console.log("🔍 Checking:", sDate, "===", targetDate, "?", isMatch);
      if (isMatch) {
        console.log("✅ Updating session:", sDate);
        return {
          ...s,
          ...updatedSession,
          id: s.id || updatedSession.id || crypto.randomUUID(), // ✅ نحتفظ بالـ id الأصلي
          roll: updatedSession.roll || s.roll || "",
          nextSessionDate: updatedSession.nextSessionDate || updatedSession.date || s.nextSessionDate || s.date || "",
          date: updatedSession.nextSessionDate || updatedSession.date || s.nextSessionDate || s.date || "",
          decision: updatedSession.decision || updatedSession.action || "",
          action: updatedSession.decision || updatedSession.action || "",
          notes: updatedSession.notes || ""
        };
      }
      return s;
    });

    console.log("🔍 updated sessions count:", updated.length);
    await updateDoc(doc(db, "cases", id), {
      sessions: updated,
    });
  };

  const saveEdit = async () => {
    if (!editSession) return;

    // نقوم بتحديث مصفوفة الجلسات والتأكد من إرسال الحقول بالهيكليتين لضمان استقرار العرض
    const updated = [...caseData.sessions].sort((a, b) => {
                    const dateA = new Date(a.nextSessionDate || a.date || 0);
                    const dateB = new Date(b.nextSessionDate || b.date || 0);
                    return dateB - dateA; // من الأحدث للأقدم
                  }).map((s) => {
      if (s.id === editSession.id) {
        return {
          ...s,
          ...editSession,
          // توحيد الحقول لكي تقرأ الشاشات القديمة والجديدة نفس القيمة المعدلة
          roll: editSession.roll || s.roll || "",
          nextSessionDate: editSession.nextSessionDate || editSession.date || s.nextSessionDate || s.date || "",
          date: editSession.nextSessionDate || editSession.date || s.nextSessionDate || s.date || "",
          decision: editSession.decision || editSession.action || "",
          action: editSession.decision || editSession.action || "",
          notes: editSession.notes || ""
        };
      }
      return s;
    });

    await updateDoc(doc(db, "cases", id), {
      sessions: updated,
    });

    setEditSession(null);
  };

  const handleSaveDecision = async (sessionData) => {
    try {
      const oldSessionDate =
        modalSession?.nextSessionDate || modalSession?.date;

      // تحديث الجلسة القديمة فقط
      const updatedSessions = caseData.sessions.map((s) => {
        if (s.id === modalSession.id) {
          return {
            ...s,
            decision: sessionData.decision,
            action: sessionData.decision,
            notes: sessionData.notes || "",
          };
        }
        return s;
      });

      // إذا تم إدخال جلسة جديدة ننشئ Session جديدة مستقلة
      const newSessionDate =
        sessionData.nextSessionDate || sessionData.date;

      if (
        newSessionDate &&
        newSessionDate !== oldSessionDate
      ) {
        updatedSessions.push({
          id: crypto.randomUUID(),
          roll: "",
          nextSessionDate: newSessionDate,
          date: newSessionDate,
          decision: "",
          action: "",
          notes: "",
          createdAt: new Date().toISOString(),
          createdBy: userData?.uid || null,
        });
      }

      await updateDoc(doc(db, "cases", id), {
        sessions: updatedSessions,
      });

      // حذف الإشعار القديم
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("officeId", "==", userData.officeId),
        where("caseId", "==", id),
        where("type", "==", "late")
      );

      const snap = await getDocs(notificationsQuery);
      const batch = writeBatch(db);

      snap.docs.forEach((d) => {
        const n = d.data();

        if (
          n.sessionDate === oldSessionDate ||
          n.message?.includes(oldSessionDate)
        ) {
          batch.delete(d.ref);
        }
      });

      await batch.commit();

      setShowDecisionModal(false);
      setModalSession(null);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ القرار");
    }
  };

  return (
    <div style={{ padding: "clamp(10px, 3vw, 20px)", background: "#f8fafc", minHeight: "100vh", direction: "rtl", fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif" }}>

      {/* HEADER - محسن ومتجاوب */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(18px, 5vw, 28px)",
                color: "#1e3a8a",
              }}
            >
              ⚖️ القضية رقم {caseData.caseSerial}
            </h1>
            <p
              style={{
                marginTop: 6,
                color: "#64748b",
                fontSize: "clamp(13px, 3.5vw, 16px)",
              }}
            >
              سنة {caseData.caseYear}
            </p>
          </div>
          <span
            style={{
              background: "#dbeafe",
              color: "#1e40af",
              padding: "6px 12px",
              borderRadius: 10,
              fontWeight: "bold",
              fontSize: "clamp(12px, 3vw, 14px)",
            }}
          >
            {getStatusLabel(caseData.status)}
          </span>
        </div>
      </Card>

      {/* لوحة إحصائية - متجاوبة */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <InfoBox title="🏛 المحكمة" value={caseData.court} />
        <InfoBox title="📌 المرحلة الحالية" value={caseData.stage} />
        <InfoBox title="📅 عدد الجلسات" value={caseData.sessions.length} />
        <InfoBox title="👥 عدد الموكلين" value={clients.length} />
      </div>

      {/* بيانات القضية الأساسية - متجاوبة */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151", fontSize: "clamp(16px, 4vw, 20px)" }}>📁 بيانات القضية</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", gap: 10 }}>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>رقم القضية:</strong> {caseData.caseSerial}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>سنة القضية:</strong> {caseData.caseYear}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>نوع القضية:</strong> {caseData.caseType || "غير محدد"}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>المحكمة:</strong> {caseData.court}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>الدائرة:</strong> {caseData.department || "غير محدد"}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>المرحلة الحالية:</strong> {caseData.stage || "غير محدد"}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>درجة التقاضي:</strong> {caseData.litigationDegree || "ابتدائي"}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>اسم السكرتير:</strong> {caseData.secretary || "غير مسجل"}</p>
          <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)", margin: "6px 0" }}><strong>حالة الملف:</strong> <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>{getStatusLabel(caseData.status)}</span></p>
        </div>
      </Card>

      {/* موضوع الدعوى */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151" }}>📝 موضوع الدعوى</h2>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", color: "#4b5563" }}>
          {caseData.caseSubject || caseData.notes || "لم يتم تدوين موضوع أو ملخص لهذه الدعوى بعد."}
        </p>
      </Card>

      {/* الموكلون وصفاتهم - متجاوب */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151", fontSize: "clamp(16px, 4vw, 20px)" }}>👤 الموكلون المرتبطون بالملف</h2>
        {clients.length === 0 ? (
          <p style={{ color: "#6b7280" }}>لا يوجد موكلون مرتبطون بهذه القضية.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 10, marginTop: 10 }}>
            {clients.map((c) => (
              <div key={c.id} style={{ padding: "clamp(10px, 3vw, 12px)", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
                <div>
                  <strong style={{ fontSize: "clamp(14px, 4vw, 16px)", color: "#1e293b" }}>{c.fullName}</strong>
                </div>
                <span style={{ color: "#64748b", fontSize: "clamp(12px, 3vw, 13px)" }}>الرقم القومي: {c.nationalId || "غير مسجل"}</span>
                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: 6, fontSize: "clamp(12px, 3vw, 14px)", fontWeight: "600", alignSelf: "flex-start" }}>
                  ⚖️ الصفة الدعائية: {c.currentCaseRole || "غير محددة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* الخصوم وعناوينهم - متجاوب */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151", fontSize: "clamp(16px, 4vw, 20px)" }}>⚔️ أطراف الخصوم</h2>
        {caseData.opponents.length === 0 ? (
          <p style={{ color: "#6b7280" }}>لا يوجد خصوم مسجلين.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {caseData.opponents.map((o, i) => (
              <div key={o.id || i} style={{ padding: "clamp(10px, 3vw, 12px)", background: "#ffffff", borderRadius: 6, border: "1px solid #fee2e2", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: o.address ? 6 : 0 }}>
                  <strong style={{ fontSize: "clamp(13px, 3.5vw, 15px)" }}>{i + 1}. الاسم: {o.name}</strong>
                  <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 10px", borderRadius: 4, fontSize: "clamp(12px, 3vw, 13px)", fontWeight: "600", alignSelf: "flex-start" }}>
                    الصفة: {o.caseRole || "مدعى عليه"}
                  </span>
                </div>
                {o.address && (
                  <p style={{ margin: "5px 0 0 0", fontSize: "clamp(13px, 3.5vw, 14px)", color: "#475569", lineHeight: 1.5 }}>
                    📍 <strong>محل الإقامة المختار للإعلان:</strong> {o.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* الجلسات والأجندة - متجاوبة */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151", fontSize: "clamp(16px, 4vw, 20px)" }}>📅 رول وجدول الجلسات</h2>
        {caseData.sessions.length === 0 ? (
          <p style={{ color: "#6b7280" }}>لا توجد جلسات مجدولة لهذه القضية.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 10, WebkitOverflowScrolling: "touch" }}>
            <table width="100%" style={{ borderCollapse: "collapse", textAlign: "right", minWidth: 600 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)" }}>الرول</th>
                  <th style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)" }}>التاريخ</th>
                  <th style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)" }}>القرار</th>
                  <th style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)" }}>الملاحظات</th>
                  <th style={{ padding: "clamp(6px, 2vw, 10px)", textAlign: "center", fontSize: "clamp(12px, 3vw, 14px)", whiteSpace: "nowrap" }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {[...caseData.sessions].sort((a, b) => {
                    const dateA = new Date(a.nextSessionDate || a.date || 0);
                    const dateB = new Date(b.nextSessionDate || b.date || 0);
                    return dateB - dateA; // من الأحدث للأقدم
                  }).map((s) => {
                  const isEditing = editSession?.id === s.id;
                  const sessionDate = s.nextSessionDate || s.date;
                  const sessionDecision = s.decision || s.action;
                  const isPast = sessionDate && (() => {
                    const date = sessionDate?.toDate ? sessionDate.toDate() : new Date(sessionDate);
                    return !isNaN(date) && date < new Date();
                  })();

                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0" }}>

                      {/* حقل الرول */}
                      <td style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            style={{ width: "clamp(60px, 15vw, 80px)", padding: "4px 6px", fontSize: "clamp(12px, 3vw, 14px)" }}
                            value={editSession?.roll || ""}
                            onChange={(e) =>
                              setEditSession({
                                ...editSession,
                                roll: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.roll || "غير محدد"
                        )}
                      </td>

                      {/* حقل تاريخ الجلسة مع شارة الحالة */}
                      <td style={{ padding: "clamp(6px, 2vw, 10px)", fontWeight: "bold", fontSize: "clamp(12px, 3vw, 14px)", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <input
                            type="date"
                            style={{ padding: "4px 6px", fontSize: "clamp(12px, 3vw, 14px)" }}
                            value={editSession?.nextSessionDate || editSession?.date || ""}
                            onChange={(e) =>
                              setEditSession({
                                ...editSession,
                                nextSessionDate: e.target.value,
                                date: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <div>
                            <div>{sessionDate}</div>
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: 5,
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: "clamp(10px, 2.5vw, 12px)",
                                background: isPast ? "#fee2e2" : "#dcfce7",
                                color: isPast ? "#991b1b" : "#166534",
                              }}
                            >
                              {isPast ? "منتهية" : "قادمة"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* حقل القرار */}
                      <td style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)", maxWidth: 200 }}>
                        {isEditing ? (
                          <textarea
                            style={{ width: "100%", padding: "4px 6px", fontSize: "clamp(12px, 3vw, 14px)", minHeight: 60 }}
                            value={editSession?.decision || editSession?.action || ""}
                            onChange={(e) =>
                              setEditSession({
                                ...editSession,
                                decision: e.target.value,
                                action: e.target.value,
                              })
                            }
                          />
                        ) : (
                          sessionDecision || <span style={{ color: "#94a3b8" }}>لم يصدر قرار بعد</span>
                        )}
                      </td>

                      {/* حقل الملاحظات */}
                      <td style={{ padding: "clamp(6px, 2vw, 10px)", fontSize: "clamp(12px, 3vw, 14px)", maxWidth: 150 }}>
                        {isEditing ? (
                          <textarea
                            style={{ width: "100%", padding: "4px 6px", fontSize: "clamp(12px, 3vw, 14px)", minHeight: 60 }}
                            value={editSession?.notes || ""}
                            onChange={(e) =>
                              setEditSession({
                                ...editSession,
                                notes: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.notes || "---"
                        )}
                      </td>

                      {/* أزرار التحكم */}
                      <td style={{ padding: "clamp(6px, 2vw, 10px)", textAlign: "center", whiteSpace: "nowrap" }}>
                        {!isEditing ? (
                          <>
                            <Button size="small" onClick={() => setEditSession(s)}>
                              ✏️
                            </Button>
                            {isPast && !sessionDecision && (
                              <Button
                                size="small"
                                onClick={() => {
                                  setModalSession(s);
                                  setShowDecisionModal(true);
                                }}
                                style={{ marginRight: 5, background: "#dc2626", color: "#fff" }}
                              >
                                ✎ قرار
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button variant="success" size="small" onClick={saveEdit}>
                            💾
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => deleteSession(s.id)}
                          style={{ marginRight: 5 }}
                        >
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal تسجيل القرار */}
      {showDecisionModal && modalSession && (
        <DecisionModal
          session={modalSession}
          caseId={id}
          onClose={() => {
            setShowDecisionModal(false);
            setModalSession(null);
          }}
          onSave={handleSaveDecision}
        />
      )}

      {/* لوحة العمليات السريعة - متجاوبة */}
      <Card style={{ borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 style={{ 
          fontSize: "clamp(16px, 4vw, 20px)", 
          fontWeight: 700, 
          color: "#1e293b",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          ⚙️ الإجراءات السريعة
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "clamp(8px, 2vw, 12px)" }}>
          <Link to={`/edit/${id}`} style={{ textDecoration: "none" }}>
            <button style={{ 
              width: "100%", 
              padding: "clamp(10px, 3vw, 14px)", 
              background: "#3b82f6", 
              color: "#fff", 
              border: "none", 
              borderRadius: 12, 
              cursor: "pointer", 
              fontSize: "clamp(13px, 3.5vw, 15px)", 
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
            }}>
              ✏️ تعديل القضية
            </button>
          </Link>

          <Link to={`/add-session/${id}`} style={{ textDecoration: "none" }}>
            <button style={{ 
              width: "100%", 
              padding: "clamp(10px, 3vw, 14px)", 
              background: "#059669", 
              color: "#fff", 
              border: "none", 
              borderRadius: 12, 
              cursor: "pointer", 
              fontSize: "clamp(13px, 3.5vw, 15px)", 
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
            }}>
              📅 جلسة جديدة
            </button>
          </Link>

          <Link to={`/add-stage/${id}`} style={{ textDecoration: "none" }}>
            <button style={{ 
              width: "100%", 
              padding: "clamp(10px, 3vw, 14px)", 
              background: "#d97706", 
              color: "#fff", 
              border: "none", 
              borderRadius: 12, 
              cursor: "pointer", 
              fontSize: "clamp(13px, 3.5vw, 15px)", 
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
            }}>
              📌 مرحلة جديدة
            </button>
          </Link>

          {canViewFinance && (
            <Link to={`/case-finance/${id}`} style={{ textDecoration: "none" }}>
              <button style={{ 
                width: "100%", 
                padding: "clamp(10px, 3vw, 14px)", 
                background: "#7c3aed", 
                color: "#fff", 
                border: "none", 
                borderRadius: 12, 
                cursor: "pointer", 
                fontSize: "clamp(13px, 3.5vw, 15px)", 
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
              }}>
                💰 الحسابات والمصروفات
              </button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
