import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function Profile() {
  const { user, userData } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      setForm({
        name: userData.name || "",
        phone: userData.phone || "",
      });
    }
  }, [userData]);

  const handleSave = async () => {
    setLoading(true);

    await setDoc(
      doc(db, "users", user.uid),
      {
        ...userData,
        name: form.name,
        phone: form.phone,
      },
      { merge: true }
    );

    setLoading(false);
    alert("تم تحديث البيانات");
  };

  return (
    <div className="profile-page">

      <h2>👤 تعديل الحساب</h2>

      <div className="profile-card">

        <input
          placeholder="الاسم"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <input
          placeholder="رقم الهاتف"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          حفظ التعديلات
        </button>

      </div>
    </div>
  );
}