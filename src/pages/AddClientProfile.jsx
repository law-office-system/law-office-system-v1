import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function AddClientProfile() {
  const { userData } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    phone1: "",
    phone2: "",
  });

  // ================= SAVE =================
  const handleSave = async () => {
    if (!userData?.officeId) {
      return alert("لا يوجد مكتب مرتبط بالمستخدم");
    }

    if (!form.fullName) {
      return alert("الاسم مطلوب");
    }

    const clientId = crypto.randomUUID();

    await setDoc(doc(db, "clientProfiles", clientId), {
      uid: clientId,

      // ================= DATA =================
      ...form,

      // ================= MULTI-TENANT =================
      officeId: userData.officeId,

      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || null,
    });

    alert("✔ تم حفظ وثيقة التعارف");

    setForm({
      fullName: "",
      nationalId: "",
      address: "",
      phone1: "",
      phone2: "",
    });
  };

  return (
    <div style={styles.page}>

      <h2>📄 وثيقة التعارف</h2>

      <div style={styles.card}>

        <input
          placeholder="الاسم الرباعي"
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="الرقم القومي"
          value={form.nationalId}
          onChange={(e) =>
            setForm({ ...form, nationalId: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="العنوان"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="رقم الهاتف 1"
          value={form.phone1}
          onChange={(e) =>
            setForm({ ...form, phone1: e.target.value })
          }
          style={styles.input}
        />

        <input
          placeholder="رقم الهاتف 2"
          value={form.phone2}
          onChange={(e) =>
            setForm({ ...form, phone2: e.target.value })
          }
          style={styles.input}
        />

        <button
          onClick={handleSave}
          style={styles.btn}
        >
          حفظ الوثيقة
        </button>

      </div>

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
    maxWidth: 500,
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