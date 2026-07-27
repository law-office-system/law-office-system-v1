import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [client, setClient] = useState(null);
  const [clientCases, setClientCases] = useState([]); 
  const [loadingCases, setLoadingCases] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    phone1: "",
    phone2: "",
    powerType: "رسمي عام قضايا",
    customPowerType: "",
    powerNumber: "",
    powerLetter: "",
    powerYear: "",
    powerOffice: "",
  });

  // ================= 📥 جلب البيانات بالكامل =================
  useEffect(() => {
    const fetchClientAndCases = async () => {
      if (!userData?.officeId) return;
      
      try {
        // 1. جلب بيانات الموكل الأساسية
        const ref = doc(db, "clientProfiles", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          
          if (data.officeId !== userData.officeId) {
            alert("عفواً، لا تملك صلاحية الوصول لملف هذا الموكل.");
            return navigate("/clients");
          }

          setClient(data);

          const standardTypes = ["رسمي عام قضايا", "رسمي عام في القضايا والإدارة", "توكيل خاص بالمرور", "توكيل خاص بقضية محددة", "رسمي خاص بالبيع والنفس"];
          const isCustom = data.powerOfAttorney?.type && !standardTypes.includes(data.powerOfAttorney.type);

          setForm({
            fullName: data.fullName || "",
            nationalId: data.nationalId || "",
            address: data.address || "",
            phone1: data.phone1 || "",
            phone2: data.phone2 || "",
            powerType: isCustom ? "other" : (data.powerOfAttorney?.type || "رسمي عام قضايا"),
            customPowerType: isCustom ? data.powerOfAttorney.type : "",
            powerNumber: data.powerOfAttorney?.number || "",
            powerLetter: data.powerOfAttorney?.letter || "",
            powerYear: data.powerOfAttorney?.year || "",
            powerOffice: data.powerOfAttorney?.office || "",
          });

          // 2. جلب القضايا (دعم الطريقتين: مصفوفة clientIds أو نص مفرد clientId)
          const casesRef = collection(db, "cases");
          let loadedCases = [];

          // الاستعلام الأول: لو الموكل مخزن جوه مصفوفة الموكلين المتعددة
          const qMultiple = query(casesRef, where("officeId", "==", userData.officeId), where("clientIds", "array-contains", id));
          const snapMultiple = await getDocs(qMultiple);
          snapMultiple.forEach(doc => loadedCases.push({ id: doc.id, ...doc.data() }));

          // الاستعلام الثاني: لو الموكل مخزن كـ ID مفرد (للقضايا القديمة بالسيستم)
          const qSingle = query(casesRef, where("officeId", "==", userData.officeId), where("clientId", "==", id));
          const snapSingle = await await getDocs(qSingle);
          snapSingle.forEach(doc => {
            if (!loadedCases.some(c => c.id === doc.id)) {
              loadedCases.push({ id: doc.id, ...doc.data() });
            }
          });

          setClientCases(loadedCases);
        } else {
          alert("ملف الموكل غير موجود بالمنظومة.");
          navigate("/clients");
        }
      } catch (error) {
        console.error("Error fetching client dashboard:", error);
      } finally {
        setLoadingCases(false);
      }
    };

    fetchClientAndCases();
  }, [id, userData, navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= 💾 حفظ التعديلات =================
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.fullName.trim()) return alert("الاسم الرباعي حقل إلزامي.");

    const finalPowerType = form.powerType === "other" ? form.customPowerType.trim() : form.powerType;

    try {
      const ref = doc(db, "clientProfiles", id);
      const updatedData = {
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        address: form.address.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        powerOfAttorney: {
          type: finalPowerType || "غير محدد",
          number: form.powerNumber.trim(),
          letter: form.powerLetter.trim(),
          year: form.powerYear.trim(),
          office: form.powerOffice.trim(),
        },
      };

      await updateDoc(ref, updatedData);
      setClient((prev) => ({ ...prev, ...updatedData }));
      alert("تم تحديث السجل المركزي للموكل بنجاح ✅");
      setEditMode(false);
    } catch (error) {
      console.error("Update client error:", error);
      alert("حدث خطأ أثناء حفظ التحديثات.");
    }
  };

  if (!client) {
    return <div style={styles.centerText}><p>جاري استدعاء ملف الموكل وتدقيق الصلاحيات...</p></div>;
  }

  return (
    <div style={styles.page}>
      {/* TOP CONTROL BAR */}
      <div style={styles.topBar}>
        <Button variant="secondary" onClick={() => navigate("/clients")} style={styles.backBtn}>
          🔀 عودة لسجل الموكلين
        </Button>
        
        {!editMode ? (
          <Button variant="primary" onClick={() => setEditMode(true)} style={styles.editBtn}>
            ✏️ تعديل بيانات الملف
          </Button>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="primary" onClick={handleSave} style={styles.saveBtn}>
              💾 حفظ التغييرات
            </Button>
            <Button variant="secondary" onClick={() => setEditMode(false)} style={styles.cancelBtn}>
              ❌ إلغاء
            </Button>
          </div>
        )}
      </div>
      {/* VIEW & EDIT DASHBOARD */}
      {!editMode ? (
        <div style={styles.gridContainer}>
          
          {/* ================= 👤 يمين الشاشة: جدول بيانات الموكل المضمونة ================= */}
          <div style={styles.infoCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.clientTitle}>👤 ملف الموكل: {client.fullName}</h2>
            </div>
            
            <h3 style={styles.subSectionTitle}>📋 البيانات الشخصية وبيانات الاتصال</h3>
            <div style={styles.profileTable}>
              <div style={styles.tableRow}><div style={styles.tableLabel}>الاسم الكامل:</div><div style={styles.tableValue}><strong>{client.fullName || "—"}</strong></div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>الرقم القومي:</div><div style={{...styles.tableValue, fontFamily: 'monospace'}}>{client.nationalId || "—"}</div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>العنوان:</div><div style={styles.tableValue}>{client.address || "—"}</div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>رقم الهاتف 1:</div><div style={styles.tableValue}>{client.phone1 || "—"}</div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>رقم الهاتف 2:</div><div style={styles.tableValue}>{client.phone2 || "—"}</div></div>
            </div>

            <div style={{ margin: "25px 0 15px 0" }}></div>

            <h3 style={styles.subSectionTitle}>📄 بيانات التوكيل القضائي</h3>
            <div style={styles.profileTable}>
              <div style={styles.tableRow}><div style={styles.tableLabel}>طبيعة التوكيل:</div><div style={styles.tableValue}><span style={styles.badge}>{client.powerOfAttorney?.type || "غير محدد"}</span></div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>رقم التوكيل:</div><div style={styles.tableValue}>{client.powerOfAttorney?.number || "—"}</div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>حرف التوكيل:</div><div style={styles.tableValue}>{client.powerOfAttorney?.letter || "—"}</div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>سنة التوثيق:</div><div style={styles.tableValue}>{client.powerOfAttorney?.year || "—"}</div></div>
              <div style={styles.tableRow}><div style={styles.tableLabel}>مكتب التوثيق:</div><div style={styles.tableValue}>{client.powerOfAttorney?.office || "—"}</div></div>
            </div>
          </div>

          {/* ================= 📁 يسار الشاشة: قائمة القضايا المربوطة ================= */}
          <div style={styles.casesCard}>
            <h3 style={styles.sectionTitle}>📁 ملف القضايا والنزاعات المرتبطة ({clientCases.length})</h3>
            {loadingCases ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>جاري جلب القضايا...</p>
            ) : clientCases.length === 0 ? (
              <div style={styles.noDataBox}>لا توجد قضايا مقيدة باسم هذا الموكل حالياً بالسيستم.</div>
            ) : (
              <div style={styles.casesList}>
                {clientCases.map((c) => (
                  <div key={c.id} style={styles.caseItem} onClick={() => navigate(`/cases/${c.id}`)}>
                    <div style={{ flex: 1 }}>
                      <strong style={styles.caseTitle}>⚖️ قضية رقم: {c.caseNumber || "بدون رقم تعريفي"} / {c.caseYear || "—"}</strong>
                      <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "4px" }}>🏢 {c.courtName || "المحكمة غير محددة"}</div>
                      <p style={styles.caseSubtitle}>نوع الدعوى: {c.caseType || "غير محدد"} | صفته: {c.clientRole || "غير محدد"}</p>
                    </div>
                    <span style={styles.arrowIcon}>👁️ عرض</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* MODE EDIT FORM */
        (<form style={styles.formBox} onSubmit={handleSave}>
          <h3 style={styles.sectionTitle}>📋 تعديل بيانات ملف الموكل</h3>
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 2 }}>
              <label style={styles.label}>الاسم الرباعي الكامل *</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} style={styles.textInput} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>الرقم القومي (14 رقم)</label>
              <input name="nationalId" maxLength={14} value={form.nationalId} onChange={handleChange} style={styles.textInput} />
            </div>
          </div>
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 2 }}>
              <label style={styles.label}>العنوان ومحل الإقامة</label>
              <input name="address" value={form.address} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>رقم الهاتف 1</label>
              <input name="phone1" value={form.phone1} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>رقم الهاتف 2</label>
              <input name="phone2" value={form.phone2} onChange={handleChange} style={styles.textInput} />
            </div>
          </div>
          <hr style={styles.divider} />
          <h3 style={styles.sectionTitle}>📄 تحديث بيانات التوكيل القضائي</h3>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>نوع التوكيل</label>
              <select name="powerType" value={form.powerType} onChange={handleChange} style={styles.selectInput}>
                <option value="رسمي عام قضايا">⚖️ رسمي عام قضايا</option>
                <option value="رسمي عام في القضايا والإدارة">🏢 رسمي عام قضايا وإدارة</option>
                <option value="توكيل خاص بالمرور">🚗 توكيل خاص (مرور)</option>
                <option value="توكيل خاص بقضية محددة">📌 توكيل خاص بقضية</option>
                <option value="رسمي خاص بالبيع والنفس">💰 رسمي خاص (بيع ونفس)</option>
                <option value="other">✍️ نوع آخر (كتابة يدوية)...</option>
              </select>
            </div>

            {form.powerType === "other" && (
              <div style={styles.field}>
                <label style={styles.label}>اكتب نوع التوكيل يدوياً *</label>
                <input name="customPowerType" value={form.customPowerType} onChange={handleChange} style={styles.textInput} required />
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>رقم التوكيل</label>
              <input name="powerNumber" value={form.powerNumber} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>حرف التوكيل</label>
              <input name="powerLetter" value={form.powerLetter} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>السنة</label>
              <input name="powerYear" maxLength={4} value={form.powerYear} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={{ ...styles.field, flex: 1.5 }}>
              <label style={styles.label}>مكتب التوثيق</label>
              <input name="powerOffice" value={form.powerOffice} onChange={handleChange} style={styles.textInput} />
            </div>
          </div>
        </form>)
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  centerText: { textAlign: "center", padding: "50px", color: "#64748b" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" },
  backBtn: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1" },
  editBtn: { background: "#2c3e50" },
  saveBtn: { background: "#16a34a" },
  cancelBtn: { background: "#64748b", color: "#fff" },
  
  gridContainer: { display: "flex", gap: "20px", flexWrap: "wrap", width: "100%" },
  infoCard: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: "1.2", minWidth: "300px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", height: "fit-content" },
  casesCard: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: "1.2", minWidth: "300px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", height: "fit-content" },
  
  cardHeader: { borderBottom: "2px solid #f1f5f9", paddingBottom: "10px", marginBottom: "15px" },
  clientTitle: { margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" },
  
  profileTable: { display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" },
  tableRow: { display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff" },
  tableLabel: { width: "110px", background: "#f8fafc", padding: "10px 12px", fontSize: "12.5px", fontWeight: "600", color: "#475569", borderLeft: "1px solid #e2e8f0", flexShrink: 0 },
  tableValue: { padding: "10px 12px", fontSize: "13px", color: "#1e293b", flex: 1, wordBreak: "break-word" },

  badge: { fontSize: "11px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" },
  divider: { border: "none", borderTop: "1px dashed #e2e8f0", margin: "20px 0" },
  
  sectionTitle: { margin: "0 0 15px 0", fontSize: "15px", color: "#1e293b", fontWeight: "600" },
  subSectionTitle: { margin: "0 0 8px 0", fontSize: "13px", color: "#475569", fontWeight: "600", borderRight: "3px solid #2c3e50", paddingRight: "6px" },
  
  noDataBox: { padding: "30px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", fontSize: "13px" },
  casesList: { display: "flex", flexDirection: "column", gap: "10px" },
  caseItem: { padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#fff", transition: "transform 0.2s, box-shadow 0.2s" },
  caseTitle: { fontSize: "14px", color: "#1e293b", fontWeight: "600" },
  caseSubtitle: { margin: "6px 0 0 0", fontSize: "11.5px", color: "#64748b" },
  arrowIcon: { fontSize: "12px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" },

  formBox: { background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", width: "100%" },
  row: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "15px", alignItems: "flex-end" },
  field: { flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  textInput: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", width: "100%", boxSizing: "border-box" },
  selectInput: { padding: "9.5px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff", width: "100%", boxSizing: "border-box" }
};