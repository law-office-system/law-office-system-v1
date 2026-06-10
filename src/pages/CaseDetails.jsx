import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getStatusLabel } from "../constants/caseStatusLabels";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function CaseDetails() {
  const { id } = useParams();
  const { userData } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState(null);

  // ================= تحميل القضية =================
  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, "cases", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        setCaseData({
          id: snap.id,
          ...data,
          sessions: data.sessions || [],
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
  const saveEdit = async () => {
    if (!editSession) return;

    // نقوم بتحديث مصفوفة الجلسات والتأكد من إرسال الحقول بالهيكليتين لضمان استقرار العرض
    const updated = caseData.sessions.map((s) => {
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

  return (
    <div style={{ padding: 20, background: "#f5f7fb", minHeight: "100vh", direction: "rtl", fontFamily: "Segoe UI, Tahoma" }}>

      {/* HEADER */}
      <Card>
        <h1 style={{ margin: 0, fontSize: 24, color: "#1e3a8a" }}>
          ⚖️ القضية رقم {caseData.caseSerial} لسنة {caseData.caseYear}
        </h1>
      </Card>

      {/* بيانات القضية الأساسية */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151" }}>📁 بيانات القضية</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
          <p><strong>رقم القضية:</strong> {caseData.caseSerial}</p>
          <p><strong>سنة القضية:</strong> {caseData.caseYear}</p>
          <p><strong>نوع القضية:</strong> {caseData.caseType || "غير محدد"}</p>
          <p><strong>المحكمة:</strong> {caseData.court}</p>
          <p><strong>الدائرة:</strong> {caseData.department || "غير محدد"}</p>
          <p><strong>المرحلة الحالية:</strong> {caseData.stage || "غير محدد"}</p>
          <p><strong>درجة التقاضي:</strong> {caseData.litigationDegree || "ابتدائي"}</p>
          <p><strong>اسم السكرتير:</strong> {caseData.secretary || "غير مسجل"}</p>
          <p><strong>حالة الملف:</strong> <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>{getStatusLabel(caseData.status)}</span></p>
        </div>
      </Card>

      {/* موضوع الدعوى */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151" }}>📝 موضوع الدعوى</h2>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", color: "#4b5563" }}>
          {caseData.caseSubject || caseData.notes || "لم يتم تدوين موضوع أو ملخص لهذه الدعوى بعد."}
        </p>
      </Card>

      {/* الموكلون وصفاتهم */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151" }}>👤 الموكلون المرتبطون بالملف</h2>
        {clients.length === 0 ? (
          <p style={{ color: "#6b7280" }}>لا يوجد موكلون مرتبطون بهذه القضية.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {clients.map((c) => (
              <div key={c.id} style={{ padding: 12, background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <strong style={{ fontSize: 16, color: "#1e293b" }}>{c.fullName}</strong>
                  <span style={{ marginRight: 15, color: "#64748b", fontSize: 13 }}>الرقم القومي: {c.nationalId || "غير مسجل"}</span>
                </div>
                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 12px", borderRadius: 6, fontSize: 14, fontWeight: "600" }}>
                  ⚖️ الصفة الدعائية: {c.currentCaseRole}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* الخصوم وعناوينهم */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151" }}>⚔️ أطراف الخصوم</h2>
        {caseData.opponents.length === 0 ? (
          <p style={{ color: "#6b7280" }}>لا يوجد خصوم مسجلين.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {caseData.opponents.map((o, i) => (
              <div key={o.id || i} style={{ padding: 12, background: "#fff5f5", borderRadius: 6, border: "1px solid #fee2e2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: o.address ? 6 : 0 }}>
                  <strong>{i + 1}. الاسم: {o.name}</strong>
                  <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 4, fontSize: 13, fontWeight: "600" }}>
                    الصفة: {o.caseRole || "مدعى عليه"}
                  </span>
                </div>
                {o.address && (
                  <p style={{ margin: "5px 0 0 0", fontSize: 14, color: "#475569" }}>
                    📍 <strong>محل الإقامة المختار للإعلان:</strong> {o.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* الجلسات والأجندة مع تفعيل التعديل الكامل للرول والتاريخ والقرار */}
      <Card>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: 8, color: "#374151" }}>📅 رول وجدول الجلسات</h2>
        {caseData.sessions.length === 0 ? (
          <p style={{ color: "#6b7280" }}>لا توجد جلسات مجدولة لهذه القضية.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table width="100%" style={{ borderCollapse: "collapse", textAlign: "right" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: 10 }}>الرول</th>
                  <th style={{ padding: 10 }}>تاريخ الجلسة</th>
                  <th style={{ padding: 10 }}>القرار أو الإجراء مطلوب</th>
                  <th style={{ padding: 10 }}>ملاحظات التحضير</th>
                  <th style={{ padding: 10, textAlign: "center" }}>إجراءات تسيير الجلسة</th>
                </tr>
              </thead>
              <tbody>
                {caseData.sessions.map((s) => {
                  const isEditing = editSession?.id === s.id;
                  const sessionDate = s.nextSessionDate || s.date;
                  const sessionDecision = s.decision || s.action;

                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      
                      {/* حقل الرول */}
                      <td style={{ padding: 10 }}>
                        {isEditing ? (
                          <input
                            type="text"
                            style={{ width: "80px", padding: 6 }}
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

                      {/* حقل تاريخ الجلسة */}
                      <td style={{ padding: 10, fontWeight: "bold" }}>
                        {isEditing ? (
                          <input
                            type="date"
                            style={{ padding: 6 }}
                            value={editSession?.nextSessionDate || editSession?.date || ""}
                            onChange={(e) =>
                              setEditSession({
                                ...editSession,
                                nextSessionDate: e.target.value,
                                date: e.target.value, // للمزامنة المتبادلة
                              })
                            }
                          />
                        ) : (
                          sessionDate
                        )}
                      </td>

                      {/* حقل القرار */}
                      <td style={{ padding: 10 }}>
                        {isEditing ? (
                          <textarea
                            style={{ width: "100%", padding: 6 }}
                            value={editSession?.decision || editSession?.action || ""}
                            onChange={(e) =>
                              setEditSession({
                                ...editSession,
                                decision: e.target.value,
                                action: e.target.value, // للمزامنة المتبادلة
                              })
                            }
                          />
                        ) : (
                          sessionDecision || <span style={{ color: "#94a3b8" }}>لم يصدر قرار بعد</span>
                        )}
                      </td>

                      {/* حقل الملاحظات */}
                      <td style={{ padding: 10 }}>
                        {isEditing ? (
                          <textarea
                            style={{ width: "100%", padding: 6 }}
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
                      <td style={{ padding: 10, textAlign: "center" }}>
                        {!isEditing ? (
                          <Button size="small" onClick={() => setEditSession(s)}>
                            ✏️ تعديل
                          </Button>
                        ) : (
                          <Button variant="success" size="small" onClick={saveEdit}>
                            💾 حفظ
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => deleteSession(s.id)}
                          style={{ marginRight: 5 }}
                        >
                          🗑️ حذف
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

      {/* لوحة العمليات السريعة */}
      <Card>
        <h2>⚙️ الإجراءات السريعة على ملف القضية</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/edit/${id}`}>
            <Button>✏️ تعديل تفاصيل القضية</Button>
          </Link>

          <Link to={`/add-session/${id}`}>
            <Button variant="success">📅 إدراج جلسة جديدة</Button>
          </Link>

          <Link to={`/add-stage/${id}`}>
            <Button variant="success">📌 انتقال لمرحلة أخرى</Button>
          </Link>

          {canViewFinance && (
            <Link to={`/case-finance/${id}`}>
              <Button style={{ background: "#059669", color: "#fff" }}>💰 الحسابات والمصروفات المالية</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}