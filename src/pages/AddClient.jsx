import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function AddClient() {
  const { userData } = useAuth(); 
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    phone1: "",
    phone2: "",
    powerType: "رسمي عام قضايا", // النوع الافتراضي الأكثر شيوعاً
    customPowerType: "",         // في حال اختيار نوع آخر وكتابته يدوياً
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

  // ================= SUBMIT (MULTI-TENANT & POWER TYPE FIXED) =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userData?.officeId) {
      return alert("عفواً، لا يوجد مكتب مرتبط بحسابك الحالي.");
    }

    if (!form.fullName.trim()) {
      return alert("يرجى إدخال الاسم الرباعي للموكل.");
    }

    // تحديد نوع التوكيل النهائي بناءً على القائمة المنسدلة
    const finalPowerType = form.powerType === "other" 
      ? form.customPowerType.trim() 
      : form.powerType;

    try {
      setLoading(true);
      const clientId = crypto.randomUUID();

      await setDoc(doc(db, "clientProfiles", clientId), {
        uid: clientId,

        // ================= BASIC DATA =================
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        address: form.address.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),

        // ================= POWER OF ATTORNEY =================
        powerOfAttorney: {
          type: finalPowerType || "غير محدد", // تخزين نوع التوكيل بدقة
          number: form.powerNumber.trim(),
          letter: form.powerLetter.trim(),
          year: form.powerYear.trim(),
          office: form.powerOffice.trim(),
        },

        // ================= MULTI-TENANT =================
        officeId: userData.officeId,

        createdAt: serverTimestamp(),
        createdBy: userData?.uid || null,
      });

      alert("✔ تم حفظ الموكل بنجاح وبناء ملفه المركزي.");
      navigate("/clients");
    } catch (err) {
      console.error("Add client error:", err);
      alert("حدث خطأ أثناء حفظ ملف الموكل: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      
      {/* HEADER TITLE */}
      <div style={styles.headerCard}>
        <h2 style={styles.pageTitle}>👤 إضافة موكل جديد بالمنظومة</h2>
        <p style={styles.pageSubtitle}>تأسيس الملف التعريفي المركزي للموكل، وإدراج بيانات الاتصال والتوكيلات الرسمية.</p>
      </div>

      {/* COMPREHENSIVE REGISTRATION FORM */}
      <form style={styles.formBox} onSubmit={handleSubmit}>
        
        <h3 style={styles.sectionTitle}>📋 البيانات الأساسية والشخصية</h3>
        
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 2 }}>
            <label style={styles.label}>الاسم الرباعي للموكل *</label>
            <input
              name="fullName"
              type="text"
              required
              placeholder="أدخل الاسم رباعي كاملاً كما في بطاقة الرقم القومي"
              value={form.fullName}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>الرقم القومي (14 رقم)</label>
            <input
              name="nationalId"
              type="text"
              maxLength={14}
              placeholder="29800000000000"
              value={form.nationalId}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 2 }}>
            <label style={styles.label}>محل الإقامة / العنوان الحالي</label>
            <input
              name="address"
              type="text"
              placeholder="المحافظة، المركز، الشارع، ورقم العقار"
              value={form.address}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>رقم الهاتف الأساسي</label>
            <input
              name="phone1"
              type="tel"
              placeholder="01000000000"
              value={form.phone1}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>رقم الهاتف البديل (إن وجد)</label>
            <input
              name="phone2"
              type="tel"
              placeholder="01200000000"
              value={form.phone2}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>
        </div>

        <hr style={styles.divider} />

        <h3 style={styles.sectionTitle}>📄 بيانات التوكيل القضائي الرسمي</h3>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>نوع التوكيل</label>
            <select
              name="powerType"
              value={form.powerType}
              onChange={handleChange}
              style={styles.selectInput}
            >
              <option value="رسمي عام قضايا">⚖️ رسمي عام قضايا</option>
              <option value="رسمي عام في القضايا والإدارة">🏢 رسمي عام قضايا وإدارة</option>
              <option value="توكيل خاص بالمرور">🚗 توكيل خاص (مرور)</option>
              <option value="توكيل خاص بقضية محددة">📌 توكيل خاص بقضية</option>
              <option value="رسمي خاص بالبيع والنفس">💰 رسمي خاص (بيع ونفس)</option>
              <option value="other">✍️ نوع آخر (كتابة يدوية)...</option>
            </select>
          </div>

          {/* يظهر هذا الحقل فقط عند اختيار "نوع آخر" من القائمة */}
          {form.powerType === "other" && (
            <div style={styles.field}>
              <label style={styles.label}>اكتب نوع التوكيل يدوياً *</label>
              <input
                name="customPowerType"
                type="text"
                required
                placeholder="مثال: توكيل خاص بالبنوك"
                value={form.customPowerType}
                onChange={handleChange}
                style={styles.textInput}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>رقم التوكيل</label>
            <input
              name="powerNumber"
              type="text"
              placeholder="مثال: 1234"
              value={form.powerNumber}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>حرف التوكيل</label>
            <input
              name="powerLetter"
              type="text"
              placeholder="مثال: أ / ب / ج"
              value={form.powerLetter}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>سنة التوكيل</label>
            <input
              name="powerYear"
              type="text"
              maxLength={4}
              placeholder="2026"
              value={form.powerYear}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>

          <div style={{ ...styles.field, flex: 1.5 }}>
            <label style={styles.label}>مكتب توثيق الشهر العقاري</label>
            <input
              name="powerOffice"
              type="text"
              placeholder="مثال: توثيق بندر الفيوم"
              value={form.powerOffice}
              onChange={handleChange}
              style={styles.textInput}
            />
          </div>
        </div>

        {/* ACTIONS BAR */}
        <div style={styles.actionRow}>
          <Button variant="primary" type="submit" disabled={loading} style={styles.saveBtn}>
            {loading ? "💾 جاري تأسيس وحفظ الملف..." : "👤 اعتماد وتأسيس ملف الموكل"}
          </Button>
        </div>

      </form>
    </div>
  );
}

/* ================= COMPREHENSIVE LUXURY STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  headerCard: { background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  pageTitle: { margin: "0 0 4px 0", fontSize: "20px", color: "#1e293b" },
  pageSubtitle: { margin: 0, fontSize: "13px", color: "#64748b" },
  formBox: { background: "#fff", padding: 20, borderRadius: 12, marginBottom: 15, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { margin: "0 0 15px 0", fontSize: "15px", color: "#475569", fontWeight: "600", borderRight: "4px solid #2c3e50", paddingRight: "8px" },
  row: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "15px", alignItems: "flex-end" },
  field: { flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  textInput: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", width: "100%", boxSizing: "border-box" },
  selectInput: { padding: "9.5px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff", width: "100%", boxSizing: "border-box" },
  divider: { border: "none", borderTop: "1px dashed #e2e8f0", margin: "20px 0" },
  actionRow: { display: "flex", justifyContent: "flex-end", marginTop: "25px" },
  saveBtn: { padding: "12px 30px", fontWeight: "600", fontSize: "14px", minWidth: "220px" }
};