import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Calendar, Clock, MapPin, FileText, Landmark, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

const statusOptions = [
  { value: 'scheduled', label: 'مجدولة', color: '#60a5fa' },
  { value: 'in-progress', label: 'جارية', color: '#a78bfa' },
  { value: 'completed', label: 'منعقدة', color: '#10b981' },
  { value: 'postponed', label: 'مؤجلة', color: '#f59e0b' },
  { value: 'cancelled', label: 'ملغاة', color: '#ef4444' },
];

export default function AddSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    status: 'scheduled',
    nextSessionDate: '',
    time: '',
    location: '',
    roll: '',
    decision: '',
    notes: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleStatusSelect = (status) => {
    setForm(prev => ({ ...prev, status }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'عنوان الجلسة مطلوب';
    if (!form.nextSessionDate) newErrors.nextSessionDate = 'تاريخ الجلسة مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!id) return alert("🚫 خطأ: لا توجد قضية محددة");

    setLoading(true);
    try {
      const caseRef = doc(db, "cases", id);
      const snap = await getDoc(caseRef);

      if (!snap.exists()) {
        alert("❌ هذه القضية غير موجودة بالنظام");
        setLoading(false);
        return;
      }

      const caseData = snap.data();
      if (caseData.officeId !== userData.officeId) {
        alert("🔒 غير مسموح لك بالتعديل على قضايا المكاتب الأخرى");
        setLoading(false);
        return;
      }

      await updateDoc(caseRef, {
        sessions: arrayUnion({
          id: crypto.randomUUID(),
          title: form.title,
          status: form.status,
          nextSessionDate: form.nextSessionDate,
          date: form.nextSessionDate,
          time: form.time,
          location: form.location,
          roll: form.roll,
          decision: form.decision,
          action: form.decision,
          notes: form.notes,
          createdAt: new Date().toISOString(),
          createdBy: userData?.uid || null,
        }),
      });

      navigate(`/case/${id}`);
    } catch (error) {
      console.error("Add session error:", error);
      alert("❌ حدث خطأ أثناء حفظ الجلسة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Calendar color="#fbbf24" size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 style={styles.headerTitle}>جدولة جلسة جديدة</h2>
            <p style={styles.headerSubtitle}>إضافة جلسة جديدة لأجندة القضية</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.required}>*</span> عنوان الجلسة
            </label>
            <div style={styles.inputWrapper}>
              <FileText size={16} color="#6b7280" style={styles.inputIcon} />
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  paddingRight: '40px',
                  borderColor: errors.title ? '#ef4444' : 'rgba(55, 65, 81, 0.5)',
                }}
                placeholder="مثال: جلسة نظر الدعوى"
              />
            </div>
            {errors.title && (
              <div style={styles.error}>
                <AlertCircle size={14} color="#ef4444" />
                {errors.title}
              </div>
            )}
          </div>

          {/* Status */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>حالة الجلسة</label>
            <div style={styles.statusGrid}>
              {statusOptions.map((opt) => {
                const isSelected = form.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusSelect(opt.value)}
                    style={{
                      ...styles.statusBtn,
                      background: isSelected ? opt.color + '15' : 'rgba(31, 41, 55, 0.5)',
                      borderColor: isSelected ? opt.color + '50' : 'rgba(55, 65, 81, 0.3)',
                      color: isSelected ? opt.color : '#9ca3af',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Two Columns: Date & Time */}
          <div style={styles.twoCols}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <span style={styles.required}>*</span> تاريخ الجلسة
              </label>
              <div style={styles.inputWrapper}>
                <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                <input
                  type="date"
                  name="nextSessionDate"
                  value={form.nextSessionDate}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    paddingRight: '40px',
                    borderColor: errors.nextSessionDate ? '#ef4444' : 'rgba(55, 65, 81, 0.5)',
                  }}
                />
              </div>
              {errors.nextSessionDate && (
                <div style={styles.error}>
                  <AlertCircle size={14} color="#ef4444" />
                  {errors.nextSessionDate}
                </div>
              )}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>وقت الجلسة</label>
              <div style={styles.inputWrapper}>
                <Clock size={16} color="#6b7280" style={styles.inputIcon} />
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px' }}
                />
              </div>
            </div>
          </div>

          {/* Two Columns: Location & Roll */}
          <div style={styles.twoCols}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>مكان الانعقاد</label>
              <div style={styles.inputWrapper}>
                <MapPin size={16} color="#6b7280" style={styles.inputIcon} />
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px' }}
                  placeholder="مثال: محكمة شمال القاهرة"
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>رقم الرول</label>
              <div style={styles.inputWrapper}>
                <Landmark size={16} color="#6b7280" style={styles.inputIcon} />
                <input
                  type="text"
                  name="roll"
                  value={form.roll}
                  onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px' }}
                  placeholder="مثال: 12"
                />
              </div>
            </div>
          </div>

          {/* Decision */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>القرار / الإجراء المتوقع</label>
            <textarea
              name="decision"
              value={form.decision}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="مثال: تقديم مذكرات الدفاع، حضور الموكل بشخصه..."
            />
          </div>

          {/* Notes */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>ملاحظات</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              style={styles.textarea}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Buttons */}
          <div style={styles.buttons}>
            <button
              type="button"
              onClick={() => navigate(`/case/${id}`)}
              style={styles.cancelBtn}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={styles.spinner} />
                  جاري الحفظ...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} />
                  حفظ الجلسة
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "clamp(12px, 3vw, 24px)",
    background: "#0f172a",
    minHeight: "100vh",
    direction: "rtl",
    fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
  },
  card: {
    background: "#1e293b",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: 24,
    maxWidth: 700,
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "24px 24px 16px",
    borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
  },
  headerIcon: {
    width: 52,
    height: 52,
    background: "linear-gradient(135deg, #1e3a8a, #1e40af)",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(30, 64, 175, 0.25)",
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#f3f4f6",
  },
  headerSubtitle: {
    margin: "4px 0 0 0",
    fontSize: 14,
    color: "#9ca3af",
  },
  form: {
    padding: "20px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#d1d5db",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  required: {
    color: "#ef4444",
    fontSize: 16,
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: 12,
    color: "#f3f4f6",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: 12,
    color: "#f3f4f6",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s",
    resize: "vertical",
    minHeight: 80,
    boxSizing: "border-box",
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: 8,
  },
  statusBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px",
    borderRadius: 12,
    border: "1px solid",
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    transition: "all 0.2s ease",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#ef4444",
    fontSize: 13,
    marginTop: 4,
  },
  buttons: {
    display: "flex",
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTop: "1px solid rgba(55, 65, 81, 0.3)",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px 24px",
    background: "transparent",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: 14,
    color: "#9ca3af",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  submitBtn: {
    flex: 1,
    padding: "12px 24px",
    background: "#1e40af",
    border: "none",
    borderRadius: 14,
    color: "white",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxShadow: "0 4px 16px rgba(30, 64, 175, 0.3)",
  },
  spinner: {
    width: 18,
    height: 18,
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
};