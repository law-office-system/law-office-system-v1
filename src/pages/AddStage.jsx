import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function AddStage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [type, setType] = useState("police_report");

  const [form, setForm] = useState({
    title: "",
    notes: "",
    decision: "",
  });

  // ================= BUILD STAGE =================
  const buildStageData = () => {
    return {
      id: crypto.randomUUID(), // 🔥 أفضل من Date.now
      type,
      title: form.title,
      data: {
        notes: form.notes,
        decision: form.decision,
      },
      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || null,
    };
  };

  // ================= SAVE (SECURE + MULTI-TENANT) =================
  const handleSave = async () => {
    if (!id) return alert("لا توجد قضية");
    if (!form.title) return alert("عنوان المرحلة مطلوب");

    try {
      const ref = doc(db, "cases", id);

      // 🔥 تحقق من ملكية القضية
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return alert("القضية غير موجودة");
      }

      const caseData = snap.data();

      if (caseData.officeId !== userData.officeId) {
        return alert("غير مسموح لك بإضافة مرحلة لهذه القضية");
      }

      // ================= ADD STAGE =================
      await updateDoc(ref, {
        stages: arrayUnion(buildStageData()),
      });

      alert("✔ تم حفظ المرحلة بنجاح");

      navigate(`/case/${id}`);
    } catch (error) {
      console.error("Add stage error:", error);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div style={styles.page}>

      <h2>➕ إضافة مرحلة للقضية</h2>

      {/* TYPE */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={styles.input}
      >
        <option value="police_report">📌 محضر نيابة</option>
        <option value="first_instance">⚖ أول درجة</option>
        <option value="appeal">🟠 استئناف</option>
        <option value="cassation">🔴 نقض</option>
      </select>

      <input
        placeholder="عنوان المرحلة"
        value={form.title}
        onChange={(e) =>
          setForm({ ...form, title: e.target.value })
        }
        style={styles.input}
      />

      <textarea
        placeholder="ملاحظات"
        value={form.notes}
        onChange={(e) =>
          setForm({ ...form, notes: e.target.value })
        }
        style={styles.textarea}
      />

      <input
        placeholder="القرار / الحكم"
        value={form.decision}
        onChange={(e) =>
          setForm({ ...form, decision: e.target.value })
        }
        style={styles.input}
      />

      <button onClick={handleSave} style={styles.btn}>
        💾 حفظ المرحلة
      </button>

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

  input: {
    display: "block",
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  textarea: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
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