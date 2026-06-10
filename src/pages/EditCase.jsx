import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import { CASE_STATUS } from "../constants/caseStatus";

export default function EditCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [clientNames, setClientNames] = useState({}); // لتخزين الأسماء الصريحة للموكلين المربوطين بالقضية

  const [form, setForm] = useState({
    caseNumber: "",
    caseSerial: "", // الحقل الجديد المطور للرقم الآلي/الداخلي
    caseYear: "",   // سنة القضية منفصلة
    caseType: "",
    court: "",
    department: "",
    secretary: "",
    status: CASE_STATUS.ACTIVE,
    caseSubject: "", // 🆕 تم استبدال notes بـ caseSubject
    clients: [],     // 🆕 كائنات تحتوي على { id, caseRole }
    opponents: [],   // كائنات تحتوي على { id, name, caseRole, address }
  });

  // ================= LOAD CASE & FETCH CLIENTS DATA =================
  useEffect(() => {
    const fetchCaseAndClients = async () => {
      try {
        const snap = await getDoc(doc(db, "cases", id));

        if (snap.exists()) {
          const data = snap.data();

          // 🛡️ معالجة مرنة للموكلين (تحويل النصوص القديمة إلى كائنات متوافقة مع النظام الجديد)
          let normalizedClients = [];
          if (Array.isArray(data.clients)) {
            normalizedClients = data.clients.map((c) => {
              if (typeof c === "string") {
                return { id: c, caseRole: "مدعي (نظام قديم)" }; // وضع صفة افتراضية للبيانات القديمة
              }
              return { id: c.id || "", caseRole: c.caseRole || "" };
            });
          }

          // 🛡️ تجميع معرفات الموكلين لجلب أسمائهم الصريحة من الـ Profiles لراحة العين أثناء التعديل
          const clientIds = normalizedClients.map(c => c.id).filter(Boolean);
          const namesMap = {};
          
          if (clientIds.length > 0) {
            // جلب الأسماء من مجموعة clientProfiles لقراءة الاسم البشري للموكل
            const q = query(collection(db, "clientProfiles"), where(documentId(), "in", clientIds));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
              namesMap[docSnap.id] = docSnap.data().fullName || "موكل بدون اسم";
            });
            setClientNames(namesMap);
          }

          setForm({
            caseNumber: data.caseNumber || "",
            caseSerial: data.caseSerial || data.caseNumber || "", // حماية تدمج الرقم القديم بالسجل الجديد
            caseYear: data.caseYear || "",
            caseType: data.caseType || "",
            court: data.court || "",
            department: data.department || "",
            secretary: data.secretary || "",
            status: data.status || CASE_STATUS.ACTIVE,
            caseSubject: data.caseSubject || data.notes || "", // 🛡️ دمج حقل الملاحظات القديم في موضوع الدعوى الجديد تلقائياً
            clients: normalizedClients,
            opponents: Array.isArray(data.opponents) ? data.opponents : [],
          });
        } else {
          alert("الملف غير موجود بالقاعدة");
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Error fetching case details:", err);
        alert("خطأ في تحميل بيانات القضية");
      } finally {
        setLoading(false);
      }
    };

    fetchCaseAndClients();
  }, [id, navigate]);

  // ================= HANDLE GENERAL INPUT CHANGE =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= CLIENTS OPERATIONS =================
  const updateClientRole = (clientId, newRole) => {
    setForm((prev) => ({
      ...prev,
      clients: prev.clients.map((c) =>
        c.id === clientId ? { ...c, caseRole: newRole } : c
      ),
    }));
  };

  const removeClient = (clientId) => {
    setForm((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== clientId),
    }));
  };

  // ================= OPPONENTS OPERATIONS =================
  const addOpponent = () => {
    setForm((prev) => ({
      ...prev,
      opponents: [
        ...prev.opponents,
        { id: Date.now().toString(), name: "", caseRole: "", address: "" }, // إضافة العنوان اختيارياً للخصم
      ],
    }));
  };

  const updateOpponent = (opponentId, field, value) => {
    setForm((prev) => ({
      ...prev,
      opponents: prev.opponents.map((o) =>
        o.id === opponentId ? { ...o, [field]: value } : o
      ),
    }));
  };

  const removeOpponent = (opponentId) => {
    setForm((prev) => ({
      ...prev,
      opponents: prev.opponents.filter((o) => o.id !== opponentId),
    }));
  };

  // ================= SAVE DATA BACK TO FIRESTORE =================
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!form.caseSerial && !form.caseNumber) {
      alert("يرجى إدخال رقم القضية أو السجل القانوني");
      return;
    }

    try {
      // حفظ التحديثات بالهيكل الجديد المعتمد عالمياً للمكتب
      await updateDoc(doc(db, "cases", id), {
        ...form,
        updatedAt: new Date(), // توثيق وقت التعديل الأخير للملف
      });

      alert("تم تحديث ملف القضية بنجاح ✔");
      navigate(`/case/${id}`);
    } catch (err) {
      console.error("Error updating document:", err);
      alert("حدث خطأ أثناء حفظ التعديلات");
    }
  };

  if (loading) return <h2 style={{ textAlign: "center", marginTop: "50px", color: "#2563eb" }}>📊 جاري جلب ملف القضية وتأمين الصفات القانونية...</h2>;

  return (
    <div style={{ ...styles.container, direction: "rtl" }}>
      <div style={styles.headerCard}>
        <h1 style={styles.title}>✏️ تعديل وتحديث بيانات القضية</h1>
        <p style={styles.subtitle}>تعديل البيانات الأساسية، وتحديد الصفات القانونية للموكلين والخصوم المقيدين بالدعوى.</p>
      </div>

      <form onSubmit={handleUpdate}>
        {/* SECTION 1: BASIC METADATA */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🏛️ البيانات القضائية المقيدة</h3>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>رقم القضية / الجدول</label>
              <input name="caseNumber" value={form.caseNumber} onChange={handleChange} style={styles.input} placeholder="مثال: 1234 لسنة 2026" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>الرقم الآلي للمكتب (السجل)</label>
              <input name="caseSerial" value={form.caseSerial} onChange={handleChange} style={styles.input} placeholder="رقم مرجعي داخلي" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>سنة القضية</label>
              <input name="caseYear" type="number" value={form.caseYear} onChange={handleChange} style={styles.input} placeholder="مثال: 2026" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>نوع الدعوى</label>
              <input name="caseType" value={form.caseType} onChange={handleChange} style={styles.input} placeholder="مثال: مدني، جنائي، أسرة" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>المحكمة المختصة</label>
              <input name="court" value={form.court} onChange={handleChange} style={styles.input} placeholder="اسم المحكمة ومقرها" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>الدائرة القضائية</label>
              <input name="department" value={form.department} onChange={handleChange} style={styles.input} placeholder="رقم أو مسمى الدائرة" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>أمين السر (السكرتير)</label>
              <input name="secretary" value={form.secretary} onChange={handleChange} style={styles.input} placeholder="اسم السكرتير المسؤول" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>حالة الملف الحالية</label>
              <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
                <option value={CASE_STATUS.ACTIVE}>نشطة / متداولة بالجلسات</option>
                <option value={CASE_STATUS.EXECUTION}>قيد التنفيذ الجبري</option>
                <option value={CASE_STATUS.CLOSED}>منتهية / مؤرشفة بالكامل</option>
              </select>
            </div>
          </div>

          <div style={{ ...styles.inputGroup, marginTop: "15px" }}>
            <label style={styles.label}>موضوع الدعوى بالتفصيل</label>
            <textarea name="caseSubject" value={form.caseSubject} onChange={handleChange} style={styles.textarea} placeholder="اكتب هنا موضوع الدعوى بالتفصيل أو طلبات الخصوم المقابلة..." />
          </div>
        </div>

        {/* SECTION 2: CLIENTS ROLES MANAGEMENT */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>👤 إدارة صفات الموكلين</h3>
          {form.clients.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "14px" }}>لا يوجد موكلين مرتبطين حالياً بهذه القضية.</p>
          ) : (
            form.clients.map((c) => (
              <div key={c.id} style={styles.repeaterRow}>
                <div style={{ flex: 2, fontWeight: "600", color: "#1e3a8a" }}>
                  {clientNames[c.id] || `معرف الموكل: ${c.id}`}
                </div>
                <div style={{ flex: 2 }}>
                  <input
                    placeholder="الصفة القانونية (مثال: مدعي، مستأنف ضده)"
                    value={c.caseRole}
                    onChange={(e) => updateClientRole(c.id, e.target.value)}
                    style={styles.inputRow}
                  />
                </div>
                <button type="button" onClick={() => removeClient(c.id)} style={styles.deleteBtn}>
                  🗑️ إلغاء الربط
                </button>
              </div>
            ))
          )}
        </div>

        {/* SECTION 3: OPPONENTS DETAIL MANAGEMENT */}
        <div style={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>⚔️ بيانات الخصوم وعناوينهم</h3>
            <button type="button" onClick={addOpponent} style={styles.addBtn}>
              ➕ إضافة خصم جديد
            </button>
          </div>

          {form.opponents.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "14px" }}>لم يتم إضافة خصوم للملف بعد.</p>
          ) : (
            form.opponents.map((o) => (
              <div key={o.id} style={{ ...styles.repeaterRow, flexWrap: "wrap", gap: "10px" }}>
                <input
                  placeholder="اسم الخصم الكامل"
                  value={o.name}
                  onChange={(e) => updateOpponent(o.id, "name", e.target.value)}
                  style={{ ...styles.inputRow, flex: 2, minWidth: "180px" }}
                />
                <input
                  placeholder="الصفة القانونية (مثال: مدعى عليه)"
                  value={o.caseRole}
                  onChange={(e) => updateOpponent(o.id, "caseRole", e.target.value)}
                  style={{ ...styles.inputRow, flex: 1, minWidth: "120px" }}
                />
                <input
                  placeholder="محل إقامته المختار وعنوانه للدعوى"
                  value={o.address || ""}
                  onChange={(e) => updateOpponent(o.id, "address", e.target.value)}
                  style={{ ...styles.inputRow, flex: 2, minWidth: "200px" }}
                />
                <button type="button" onClick={() => removeOpponent(o.id)} style={styles.deleteBtn}>
                  🗑️ حذف الخصم
                </button>
              </div>
            ))
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div style={styles.actionArea}>
          <button type="submit" style={styles.saveBtn}>
            💾 حفظ التعديلات وإغلاق الملف
          </button>
          <button type="button" onClick={() => navigate(`/case/${id}`)} style={styles.cancelBtn}>
            إلغاء الأمر
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= COMPREHENSIVE STYLES ================= */
const styles = {
  container: { maxWidth: "900px", margin: "20px auto", padding: "0 15px", fontFamily: "Segoe UI, Tahoma" },
  headerCard: { background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  title: { margin: "0 0 6px 0", fontSize: "22px", color: "#1e3a8a" },
  subtitle: { margin: 0, fontSize: "14px", color: "#64748b" },
  section: { background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  sectionTitle: { fontSize: "16px", color: "#334155", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px", marginBottom: "15px", fontWeight: "600" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  select: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", cursor: "pointer" },
  textarea: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", minHeight: "100px", resize: "vertical", outline: "none" },
  repeaterRow: { display: "flex", alignItems: "center", gap: "15px", background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "10px", border: "1px solid #f1f5f9" },
  inputRow: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" },
  addBtn: { padding: "6px 12px", border: "none", borderRadius: "6px", background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  deleteBtn: { padding: "8px 12px", border: "none", borderRadius: "6px", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontWeight: "500", fontSize: "13px" },
  actionArea: { display: "flex", gap: "12px", marginTop: "10px" },
  saveBtn: { flex: 2, padding: "12px", border: "none", borderRadius: "8px", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "15px" },
  cancelBtn: { flex: 1, padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: "600", fontSize: "15px", textAlign: "center" }
};