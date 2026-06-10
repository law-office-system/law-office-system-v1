import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function AddSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);

  // تم توحيد المسميات (nextSessionDate و decision) لتتطابق مع هيكل بيانات القضية الأساسي
  const [form, setForm] = useState({
    roll: "",
    nextSessionDate: "", 
    decision: "",        
    notes: "",
  });

  // ================= CHANGE =================
  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= SUBMIT (SECURE + MULTI-TENANT) =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!id) return alert("🚫 خطأ: لا توجد قضية محددة");
    if (!form.nextSessionDate) return alert("⚠️ يرجى إدخال تاريخ الجلسة المقبلة");

    setLoading(true);
    try {
      const caseRef = doc(db, "cases", id);

      // 🔥 التحقق الأمني: القضية تابعة لنفس مكتب المحامي الحالي
      const snap = await getDoc(caseRef);

      if (!snap.exists()) {
        alert("❌ هذه القضية غير موجودة بالنظام");
        setLoading(false);
        return;
      }

      const caseData = snap.data();

      if (caseData.officeId !== userData.officeId) {
        alert("🔒 غير مسموح لك بالتعديل أو إضافة جلسات على قضايا المكاتب الأخرى");
        setLoading(false);
        return;
      }

      // ================= ADD SESSION TO ARRAY =================
      await updateDoc(caseRef, {
        sessions: arrayUnion({
          id: crypto.randomUUID(),
          roll: form.roll,
          nextSessionDate: form.nextSessionDate, // الاسم الموحد بقاعدة البيانات
          decision: form.decision,               // الاسم الموحد بقاعدة البيانات
          notes: form.notes,
          createdAt: new Date().toISOString(),
          createdBy: userData?.uid || null,
        }),
      });

      alert("✔ تم إدراج الجلسة بنجاح في أجندة القضية");
      navigate(`/case/${id}`);
    } catch (error) {
      console.error("Add session error:", error);
      alert("❌ حدث خطأ أثناء حفظ الجلسة، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2>📅 جدولة جلسة مرتقبة جديدة</h2>

      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.row}>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={styles.label}>رقم الرول (إن وجد)</label>
            <input
              type="number"
              name="roll"
              placeholder="مثال: 12"
              value={form.roll}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={{ flex: 2, minWidth: "200px" }}>
            <label style={styles.label}>تاريخ الجلسة المقبلة *</label>
            <input
              type="date"
              name="nextSessionDate"
              value={form.nextSessionDate}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        <div>
          <label style={styles.label}>القرار المتوقع أو الإجراء المطلوب</label>
          <textarea
            name="decision"
            value={form.decision}
            onChange={handleChange}
            placeholder="مثال: تقديم مذكرات الدفاع، حضور الموكل بشخصه، إعلان بالدعوى..."
            style={styles.textarea}
          />
        </div>

        <div>
          <label style={styles.label}>ملاحظات ومستندات الجلسة</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="اكتب المستندات المطلوب تحضيرها لهذه الجلسة أو أي ملاحظة للمحامي الحاضر..."
            style={styles.textarea}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? "جاري الحفظ والجدولة..." : "💾 حفظ الجلسة بالأجندة"}
        </button>
      </form>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    padding: 20,
    direction: "rtl",
    background: "#f5f7fb",
    minHeight: "100vh",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
  },
  card: {
    background: "#fff",
    padding: 25,
    borderRadius: 12,
    maxWidth: 700,
    display: "flex",
    flexDirection: "column",
    gap: 15,
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
  },
  row: {
    display: "flex",
    gap: 15,
    flexWrap: "wrap",
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: "600",
    color: "#4b5563",
    fontSize: 14
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    width: "100%",
    boxSizing: "border-box"
  },
  textarea: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    minHeight: 100,
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  btn: {
    padding: "12px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: 15,
    marginTop: 10,
    transition: "background 0.2s"
  },
};