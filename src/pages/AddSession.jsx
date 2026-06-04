import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function AddSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [form, setForm] = useState({
    roll: "",
    date: "",
    action: "",
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

    if (!id) return alert("لا توجد قضية");
    if (!form.date) return alert("يرجى إدخال تاريخ الجلسة");

    try {
      const caseRef = doc(db, "cases", id);

      // 🔥 تحقق أن القضية من نفس المكتب
      const snap = await getDoc(caseRef);

      if (!snap.exists()) {
        return alert("القضية غير موجودة");
      }

      const caseData = snap.data();

      if (caseData.officeId !== userData.officeId) {
        return alert("غير مسموح لك بالتعديل على هذه القضية");
      }

      // ================= ADD SESSION =================
      await updateDoc(caseRef, {
        sessions: arrayUnion({
          id: crypto.randomUUID(),
          roll: form.roll,
          date: form.date,
          action: form.action,
          notes: form.notes,
          createdAt: new Date().toISOString(),
          createdBy: userData?.uid || null,
        }),
      });

      alert("✔ تم حفظ الجلسة بنجاح");

      navigate(`/case/${id}`);
    } catch (error) {
      console.error("Add session error:", error);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div style={styles.page}>

      <h2>📅 إضافة جلسة</h2>

      <form onSubmit={handleSubmit} style={styles.card}>

        <div style={styles.row}>
          <div>
            <label>الرول</label>
            <input
              type="number"
              name="roll"
              value={form.roll}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div>
            <label>تاريخ الجلسة *</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        <div>
          <label>القرار</label>
          <textarea
            name="action"
            value={form.action}
            onChange={handleChange}
            placeholder="مثال: تأجيل - حجز للحكم..."
            style={styles.textarea}
          />
        </div>

        <div>
          <label>ملاحظات</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            style={styles.textarea}
          />
        </div>

        <button type="submit" style={styles.btn}>
          💾 حفظ الجلسة
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
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    maxWidth: 700,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    width: "100%",
  },

  textarea: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    minHeight: 80,
  },

  btn: {
    padding: 10,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600",
  },
};