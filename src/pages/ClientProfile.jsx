import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [editMode, setEditMode] = useState(false);

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

  // 📥 جلب بيانات الموكل
  useEffect(() => {
    const fetchClient = async () => {
      const ref = doc(db, "clientProfiles", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setClient(data);

        setForm({
          fullName: data.fullName || "",
          nationalId: data.nationalId || "",
          address: data.address || "",
          phone1: data.phone1 || "",
          phone2: data.phone2 || "",
          powerNumber: data.powerOfAttorney?.number || "",
          powerLetter: data.powerOfAttorney?.letter || "",
          powerYear: data.powerOfAttorney?.year || "",
          powerOffice: data.powerOfAttorney?.office || "",
        });
      }
    };

    fetchClient();
  }, [id]);

  // ✏️ تغيير القيم
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // 💾 حفظ التعديلات
  const handleSave = async () => {
    const ref = doc(db, "clientProfiles", id);

    await updateDoc(ref, {
      fullName: form.fullName,
      nationalId: form.nationalId,
      address: form.address,
      phone1: form.phone1,
      phone2: form.phone2,

      powerOfAttorney: {
        number: form.powerNumber,
        letter: form.powerLetter,
        year: form.powerYear,
        office: form.powerOffice,
      },
    });

    alert("تم تحديث بيانات الموكل ✅");
    setEditMode(false);
  };

  if (!client) return <p>جاري التحميل...</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "700px" }}>

      <h2>📄 ملف الموكل</h2>

      <button onClick={() => navigate("/clients")}>
        ⬅ الرجوع
      </button>

      <hr />

      {/* 👤 بيانات الموكل */}
      <h3>بيانات الموكل</h3>

      <input
        disabled={!editMode}
        name="fullName"
        value={form.fullName}
        onChange={handleChange}
        placeholder="الاسم"
      />

      <input
        disabled={!editMode}
        name="nationalId"
        value={form.nationalId}
        onChange={handleChange}
        placeholder="الرقم القومي"
      />

      <input
        disabled={!editMode}
        name="address"
        value={form.address}
        onChange={handleChange}
        placeholder="العنوان"
      />

      <input
        disabled={!editMode}
        name="phone1"
        value={form.phone1}
        onChange={handleChange}
        placeholder="الهاتف 1"
      />

      <input
        disabled={!editMode}
        name="phone2"
        value={form.phone2}
        onChange={handleChange}
        placeholder="الهاتف 2"
      />

      <hr />

      {/* 📄 التوكيل */}
      <h3>بيانات التوكيل</h3>

      <input
        disabled={!editMode}
        name="powerNumber"
        value={form.powerNumber}
        onChange={handleChange}
        placeholder="رقم التوكيل"
      />

      <input
        disabled={!editMode}
        name="powerLetter"
        value={form.powerLetter}
        onChange={handleChange}
        placeholder="حرف التوكيل"
      />

      <input
        disabled={!editMode}
        name="powerYear"
        value={form.powerYear}
        onChange={handleChange}
        placeholder="السنة"
      />

      <input
        disabled={!editMode}
        name="powerOffice"
        value={form.powerOffice}
        onChange={handleChange}
        placeholder="مكتب التوثيق"
      />

      <hr />

      {/* 🔘 أزرار التحكم */}
      {!editMode ? (
        <button onClick={() => setEditMode(true)}>
          ✏️ تعديل
        </button>
      ) : (
        <>
          <button onClick={handleSave}>
            💾 حفظ
          </button>

          <button onClick={() => setEditMode(false)}>
            ❌ إلغاء
          </button>
        </>
      )}

    </div>
  );
}