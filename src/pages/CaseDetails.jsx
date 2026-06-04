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

  // ================= تحميل الموكلين =================
  useEffect(() => {
    const fetchClients = async () => {
      if (!caseData?.clients?.length) {
        setClients([]);
        return;
      }

      const result = await Promise.all(
        caseData.clients.map(async (clientId) => {
          const snap = await getDoc(doc(db, "clientProfiles", clientId));

          if (!snap.exists()) return null;

          return {
            id: snap.id,
            ...snap.data(),
          };
        })
      );

      setClients(result.filter(Boolean));
    };

    fetchClients();
  }, [caseData?.clients]); // 🔥 تحسين مهم

  if (loading) return <p>جار التحميل...</p>;
  if (!caseData) return <p>القضية غير موجودة</p>;

  const canViewFinance =
    userData?.role === "admin" || userData?.role === "staff";

  // ================= حذف جلسة =================
  const deleteSession = async (sessionId) => {
    const confirmDelete = window.confirm("هل تريد حذف الجلسة؟");
    if (!confirmDelete) return;

    const updated = caseData.sessions.filter((s) => s.id !== sessionId);

    await updateDoc(doc(db, "cases", id), {
      sessions: updated,
    });
  };

  // ================= حفظ تعديل جلسة =================
  const saveEdit = async () => {
    if (!editSession) return;

    const updated = caseData.sessions.map((s) =>
      s.id === editSession.id ? editSession : s
    );

    await updateDoc(doc(db, "cases", id), {
      sessions: updated,
    });

    setEditSession(null);
  };

  return (
    <div style={{ padding: 20, background: "#f5f7fb", minHeight: "100vh" }}>

      {/* HEADER */}
      <Card>
        <h1>⚖️ القضية رقم {caseData.caseSerial} / {caseData.caseYear}</h1>
      </Card>

      {/* بيانات القضية */}
      <Card>
        <h2>📁 بيانات القضية</h2>

        <p>رقم القضية: {caseData.caseSerial}</p>
        <p>سنة القضية: {caseData.caseYear}</p>
        <p>نوع القضية: {caseData.caseType}</p>
        <p>المحكمة: {caseData.court}</p>
        <p>الدائرة: {caseData.department}</p>
        <p>المرحلة: {caseData.stage}</p>
        <p>الحالة: {getStatusLabel(caseData.status)}</p>
      </Card>

      {/* الموكلين */}
      <Card>
        <h2>👤 الموكلون</h2>

        {clients.length === 0 ? (
          <p>لا يوجد موكلون</p>
        ) : (
          clients.map((c) => (
            <div key={c.id}>
              <p>الاسم: {c.fullName}</p>
              <p>الرقم القومي: {c.nationalId}</p>
              <hr />
            </div>
          ))
        )}
      </Card>

      {/* الخصوم */}
      <Card>
        <h2>⚔️ الخصوم</h2>

        {(caseData.opponents || []).length === 0 ? (
          <p>لا يوجد خصوم</p>
        ) : (
          caseData.opponents.map((o, i) => (
            <div key={o.id || i}>
              <p>الاسم: {o.name}</p>
              <p>الصفة: {o.caseRole}</p>
              <hr />
            </div>
          ))
        )}
      </Card>

      {/* العمليات */}
      <Card>
        <h2>⚙️ العمليات</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/edit/${id}`}>
            <Button>✏️ تعديل القضية</Button>
          </Link>

          <Link to={`/add-session/${id}`}>
            <Button variant="success">📅 إضافة جلسة</Button>
          </Link>

          <Link to={`/add-stage/${id}`}>
            <Button variant="success">📌 إضافة مرحلة</Button>
          </Link>

          {canViewFinance && (
            <Link to={`/case-finance/${id}`}>
              <Button>💰 الحسابات المالية</Button>
            </Link>
          )}
        </div>
      </Card>

      {/* الجلسات */}
      <Card>
        <h2>📅 الجلسات</h2>

        {caseData.sessions.length === 0 ? (
          <p>لا توجد جلسات</p>
        ) : (
          <table width="100%" border="1" cellPadding="10">
            <thead>
              <tr>
                <th>الرول</th>
                <th>التاريخ</th>
                <th>الإجراء</th>
                <th>الملاحظات</th>
                <th>إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {caseData.sessions.map((s) => {
                const isEditing = editSession?.id === s.id;

                return (
                  <tr key={s.id}>
                    <td>{s.roll}</td>
                    <td>{s.date}</td>

                    <td>
                      {isEditing ? (
                        <textarea
                          value={editSession?.action || ""}
                          onChange={(e) =>
                            setEditSession({
                              ...editSession,
                              action: e.target.value,
                            })
                          }
                        />
                      ) : (
                        s.action
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <textarea
                          value={editSession?.notes || ""}
                          onChange={(e) =>
                            setEditSession({
                              ...editSession,
                              notes: e.target.value,
                            })
                          }
                        />
                      ) : (
                        s.notes
                      )}
                    </td>

                    <td>
                      {!isEditing ? (
                        <Button onClick={() => setEditSession(s)}>
                          تعديل
                        </Button>
                      ) : (
                        <Button variant="success" onClick={saveEdit}>
                          حفظ
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        onClick={() => deleteSession(s.id)}
                        style={{ marginRight: 5 }}
                      >
                        حذف
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}