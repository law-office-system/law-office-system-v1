import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom"; // لإعادة التوجيه
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Button from "../components/ui/Button";

export default function AddClientProfile() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    phone1: "",
    phone2: "",
    // حقول التوكيل الجديدة
    powerType: "رسمي عام قضايا",
    powerNumber: "",
    powerLetter: "",
    powerYear: "",
    powerOffice: "",
  });

  const handleSave = async () => {
    if (!userData?.officeId) return alert("لا يوجد مكتب مرتبط");
    if (!form.fullName) return alert("الاسم مطلوب");

    const clientId = crypto.randomUUID();

    await setDoc(doc(db, "clientProfiles", clientId), {
      uid: clientId,
      ...form,
      powerOfAttorney: {
        type: form.powerType,
        number: form.powerNumber,
        letter: form.powerLetter,
        year: form.powerYear,
        office: form.powerOffice,
      },
      officeId: userData.officeId,
      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || null,
    });

    alert("✔ تم حفظ بيانات الموكل والتوكيل بنجاح");
    
    // التوجيه التلقائي لصفحة الملف الشخصي بعد الحفظ
    navigate(`/clients/${clientId}`);
  };

  return (
    <div style={styles.page}>
      <h2>➕ إضافة موكل جديد</h2>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>البيانات الشخصية</h3>
        <input placeholder="الاسم الرباعي" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} style={styles.input} />
        <input placeholder="الرقم القومي" value={form.nationalId} onChange={(e) => setForm({...form, nationalId: e.target.value})} style={styles.input} />
        <input placeholder="العنوان" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} style={styles.input} />
        <input placeholder="الهاتف 1" value={form.phone1} onChange={(e) => setForm({...form, phone1: e.target.value})} style={styles.input} />
        
        <h3 style={styles.sectionTitle}>بيانات التوكيل</h3>
        <input placeholder="نوع التوكيل" value={form.powerType} onChange={(e) => setForm({...form, powerType: e.target.value})} style={styles.input} />
        <div style={{ display: 'flex', gap: '5px' }}>
            <input placeholder="رقم" value={form.powerNumber} onChange={(e) => setForm({...form, powerNumber: e.target.value})} style={styles.input} />
            <input placeholder="سنة" value={form.powerYear} onChange={(e) => setForm({...form, powerYear: e.target.value})} style={styles.input} />
        </div>
        
        <Button onClick={handleSave} style={styles.btn}>حفظ بيانات الموكل</Button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh" },
  card: { background: "#fff", padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 10, maxWidth: 500 },
  input: { padding: 10, borderRadius: 8, border: "1px solid #ddd", width: "100%", boxSizing: "border-box" },
  sectionTitle: { fontSize: "14px", color: "#2c3e50", margin: "10px 0 5px 0" },
  btn: { padding: 12, background: "#2c3e50", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "600", marginTop: "10px" }
};