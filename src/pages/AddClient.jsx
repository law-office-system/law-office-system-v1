import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AddClient() {
  const { userData } = useAuth(); // 🔥 توحيد Auth
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    phone1: "",
    phone2: "",
    powerNumber: "",
    powerLetter: "",
    powerYear: "",
    powerOffice: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= SUBMIT (MULTI-TENANT FIX) =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userData?.officeId) {
      return alert("لا يوجد مكتب مرتبط بالمستخدم");
    }

    try {
      setLoading(true);

      const clientId = crypto.randomUUID();

      await setDoc(doc(db, "clientProfiles", clientId), {
        uid: clientId,

        // ================= BASIC DATA =================
        fullName: form.fullName,
        nationalId: form.nationalId,
        address: form.address,
        phone1: form.phone1,
        phone2: form.phone2,

        // ================= POWER OF ATTORNEY =================
        powerOfAttorney: {
          number: form.powerNumber,
          letter: form.powerLetter,
          year: form.powerYear,
          office: form.powerOffice,
        },

        // ================= MULTI-TENANT (IMPORTANT) =================
        officeId: userData.officeId,

        createdAt: new Date().toISOString(),
        createdBy: userData?.uid || null,
      });

      alert("✔ تم حفظ الموكل بنجاح");

      navigate("/clients");
    } catch (err) {
      console.error("Add client error:", err);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2>👤 إضافة موكل جديد</h2>

      <form style={styles.card} onSubmit={handleSubmit}>
        <input
          name="fullName"
          placeholder="الاسم الرباعي"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="nationalId"
          placeholder="الرقم القومي"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="address"
          placeholder="العنوان"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="phone1"
          placeholder="رقم الهاتف 1"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="phone2"
          placeholder="رقم الهاتف 2"
          onChange={handleChange}
          style={styles.input}
        />

        <hr />

        <h3>📄 بيانات التوكيل</h3>

        <input
          name="powerNumber"
          placeholder="رقم التوكيل"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="powerLetter"
          placeholder="حرف التوكيل"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="powerYear"
          placeholder="سنة التوكيل"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="powerOffice"
          placeholder="مكتب التوثيق"
          onChange={handleChange}
          style={styles.input}
        />

        <button
          type="submit"
          disabled={loading}
          style={styles.btn}
        >
          {loading ? "جاري الحفظ..." : "حفظ الموكل"}
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
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 600,
  },

  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  btn: {
    padding: 10,
    background: "#2c3e50",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600",
  },
};