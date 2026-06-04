import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import { CASE_STATUS } from "../constants/caseStatus";

export default function EditCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    caseNumber: "",
    caseType: "",
    court: "",
    department: "",
    secretary: "",
    status: CASE_STATUS.ACTIVE,
    notes: "",
    clients: [],
    opponents: [],
  });

  // ================= LOAD CASE =================
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const snap = await getDoc(doc(db, "cases", id));

        if (snap.exists()) {
          const data = snap.data();

          setForm({
            caseNumber: data.caseNumber || "",
            caseType: data.caseType || "",
            court: data.court || "",
            department: data.department || "",
            secretary: data.secretary || "",
            status: data.status || CASE_STATUS.ACTIVE,
            notes: data.notes || "",
            clients: data.clients || [],
            opponents: data.opponents || [],
          });
        }
      } catch (err) {
        console.error(err);
        alert("خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id]);

  // ================= CHANGE =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= CLIENTS =================
  const removeClient = (clientId) => {
    setForm((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c !== clientId),
    }));
  };

  // ================= OPPONENTS =================
  const addOpponent = () => {
    setForm((prev) => ({
      ...prev,
      opponents: [
        ...prev.opponents,
        { id: Date.now().toString(), name: "", caseRole: "" },
      ],
    }));
  };

  const updateOpponent = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      opponents: prev.opponents.map((o) =>
        o.id === id ? { ...o, [field]: value } : o
      ),
    }));
  };

  const removeOpponent = (id) => {
    setForm((prev) => ({
      ...prev,
      opponents: prev.opponents.filter((o) => o.id !== id),
    }));
  };

  // ================= SAVE =================
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      await updateDoc(doc(db, "cases", id), {
        ...form,
      });

      alert("تم التعديل بنجاح ✔");
      navigate(`/case/${id}`);
    } catch (err) {
      console.error(err);
      alert("خطأ أثناء الحفظ");
    }
  };

  if (loading) return <h2>جار التحميل...</h2>;

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>

      <h1>✏️ تعديل القضية</h1>

      {/* BASIC INFO */}
      <input
        name="caseNumber"
        value={form.caseNumber}
        onChange={handleChange}
        placeholder="رقم القضية"
      />

      <input
        name="caseType"
        value={form.caseType}
        onChange={handleChange}
        placeholder="نوع القضية"
      />

      <input
        name="court"
        value={form.court}
        onChange={handleChange}
        placeholder="المحكمة"
      />

      <input
        name="department"
        value={form.department}
        onChange={handleChange}
        placeholder="الدائرة"
      />

      <input
        name="secretary"
        value={form.secretary}
        onChange={handleChange}
        placeholder="السكرتير"
      />

      <select
        name="status"
        value={form.status}
        onChange={handleChange}
      >
        <option value={CASE_STATUS.ACTIVE}>جارية</option>
        <option value={CASE_STATUS.EXECUTION}>تنفيذ</option>
        <option value={CASE_STATUS.CLOSED}>منتهية</option>
      </select>

      <textarea
        name="notes"
        value={form.notes}
        onChange={handleChange}
        placeholder="ملاحظات"
      />

      <hr />

      {/* CLIENTS */}
      <h3>👤 الموكلون</h3>
      {form.clients.map((c, i) => (
        <div key={i}>
          <span>{c}</span>
          <button onClick={() => removeClient(c)}>حذف</button>
        </div>
      ))}

      <hr />

      {/* OPPONENTS */}
      <h3>⚔️ الخصوم</h3>

      <button type="button" onClick={addOpponent}>
        ➕ إضافة خصم
      </button>

      {form.opponents.map((o) => (
        <div key={o.id}>
          <input
            placeholder="اسم الخصم"
            value={o.name}
            onChange={(e) =>
              updateOpponent(o.id, "name", e.target.value)
            }
          />

          <input
            placeholder="الصفة"
            value={o.caseRole}
            onChange={(e) =>
              updateOpponent(o.id, "caseRole", e.target.value)
            }
          />

          <button onClick={() => removeOpponent(o.id)}>
            حذف
          </button>
        </div>
      ))}

      <hr />

      <button onClick={handleUpdate}>
        💾 حفظ التعديلات
      </button>
    </div>
  );
}