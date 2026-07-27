import React, { useState, useEffect, useCallback } from "react";
import {
  X, ClipboardList, Calendar, Flag, User, AlertCircle, MapPin,
  Link2, ChevronDown, CheckCircle2
} from "lucide-react";
import { useAdminTasks } from "../../hooks/useAdminTasks";
import { useAuth } from "../../context/AuthContext";

const priorities = [
  { value: "high", label: "عالية", color: "#f87171", bg: "rgba(248, 113, 113, 0.15)", border: "rgba(248, 113, 113, 0.3)" },
  { value: "medium", label: "متوسطة", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.3)" },
  { value: "low", label: "منخفضة", color: "#4ade80", bg: "rgba(74, 222, 128, 0.15)", border: "rgba(74, 222, 128, 0.3)" },
];

const statuses = [
  { value: "pending", label: "معلقة", color: "#fbbf24" },
  { value: "in-progress", label: "قيد التنفيذ", color: "#60a5fa" },
  { value: "completed", label: "منجزة", color: "#4ade80" },
];

export default function AdminTaskForm({ caseId, sessions = [], task = null, onClose }) {
  const { userData } = useAuth();
  const officeId = userData?.officeId;
  const tenantId = userData?.tenantId || officeId;

  const { addTask, updateTask } = useAdminTasks(caseId);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
    status: "pending",
    // ── NEW: Session Link ──
    sessionId: "",
    sessionTitle: "",
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        assignedTo: task.assignedTo || "",
        status: task.status || "pending",
        sessionId: task.sessionId || "",
        sessionTitle: task.sessionTitle || "",
      });
    }
  }, [task]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const selectSession = (session) => {
    setFormData(prev => ({
      ...prev,
      sessionId: session.id,
      sessionTitle: session.title || `الجلسة ${sessions.indexOf(session) + 1}`,
    }));
    setShowSessionDropdown(false);
    if (errors.sessionId) setErrors(prev => ({ ...prev, sessionId: null }));
  };

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "مكان العمل مطلوب";
    }
    if (!formData.dueDate) {
      newErrors.dueDate = "تاريخ الاستحقاق مطلوب";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        officeId,
        tenantId,
        caseId,
      };

      if (task) {
        await updateTask(task.id, dataToSave);
      } else {
        await addTask(dataToSave);
      }
      onClose();
    } catch (err) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, task, validate, onClose, addTask, updateTask, officeId, tenantId, caseId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const selectedSession = sessions.find(s => s.id === formData.sessionId);

  return (
    <div 
      style={styles.overlay} 
      onClick={handleOverlayClick}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div 
        style={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <ClipboardList color="#4ade80" size={22} strokeWidth={2.5} />
            </div>
            <h2 style={styles.headerTitle}>
              {task ? "تعديل العمل الإداري" : "إضافة عمل إداري"}
            </h2>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            style={styles.closeBtn}
            type="button"
          >
            <X size={20} color="#9ca3af" />
          </button>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit} 
          style={styles.form}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ═══ NEW: Session Selector ═══ */}
          {sessions.length > 0 && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Link2 size={14} color="#60a5fa" />
                الجلسة المرتبطة (اختياري)
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${formData.sessionId ? 'rgba(96, 165, 250, 0.5)' : 'rgba(55, 65, 81, 0.5)'}`,
                    borderRadius: '12px',
                    color: formData.sessionId ? '#f3f4f6' : '#6b7280',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'right',
                    direction: 'rtl',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color={formData.sessionId ? '#60a5fa' : '#6b7280'} />
                    {formData.sessionId
                      ? `${selectedSession?.title || formData.sessionTitle} (${new Date(selectedSession?.date || selectedSession?.nextSessionDate).toLocaleDateString('ar-EG')})`
                      : 'اختر الجلسة المرتبطة (اختياري)...'}
                  </span>
                  <ChevronDown size={16} color="#6b7280" style={{ transform: showSessionDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>

                {showSessionDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: '#1f2937',
                    border: '1px solid rgba(55, 65, 81, 0.6)',
                    borderRadius: '14px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    maxHeight: '280px',
                    overflow: 'auto',
                    padding: '8px',
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, sessionId: '', sessionTitle: '' }));
                        setShowSessionDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: !formData.sessionId ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: !formData.sessionId ? '#60a5fa' : '#6b7280',
                        fontSize: '13px',
                        fontWeight: !formData.sessionId ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'right',
                        fontFamily: 'inherit',
                        marginBottom: '4px',
                      }}
                    >
                      بدون جلسة مرتبطة
                    </button>
                    <div style={{ height: 1, background: 'rgba(55, 65, 81, 0.3)', margin: '4px 8px' }} />
                    {sessions.map((session, idx) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => selectSession(session)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: formData.sessionId === session.id ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: '10px',
                          color: formData.sessionId === session.id ? '#60a5fa' : '#d1d5db',
                          fontSize: '13px',
                          fontWeight: formData.sessionId === session.id ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'right',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '4px',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (formData.sessionId !== session.id) {
                            e.currentTarget.style.background = 'rgba(55, 65, 81, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.sessionId !== session.id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: formData.sessionId === session.id ? '#60a5fa20' : 'rgba(55, 65, 81, 0.5)',
                          color: formData.sessionId === session.id ? '#60a5fa' : '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{session.title || `الجلسة ${idx + 1}`}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            {new Date(session.date || session.nextSessionDate).toLocaleDateString('ar-EG')}
                            {session.decisionType && session.decisionType !== 'pending' && (
                              <span style={{ marginRight: '8px', color: '#f59e0b' }}>
                                — {session.decisionLabel || session.decisionType}
                              </span>
                            )}
                          </div>
                        </div>
                        {formData.sessionId === session.id && <CheckCircle2 size={16} color="#60a5fa" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title - مكان العمل */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.required}>*</span> مكان العمل
            </label>
            <div style={styles.inputWrapper}>
              <MapPin size={16} color="#6b7280" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  paddingRight: "40px",
                  borderColor: errors.title ? "#f87171" : "rgba(55, 65, 81, 0.5)",
                }}
                placeholder="مثال: محكمة شمال القاهرة"
              />
            </div>
            {errors.title && (
              <div style={styles.error}>
                <AlertCircle size={14} color="#f87171" />
                {errors.title}
              </div>
            )}
          </div>

          {/* Description - الوصف */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>الوصف</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="وصف تفصيلي للعمل المطلوب..."
            />
          </div>

          {/* Two Columns */}
          <div style={styles.twoCols}>
            {/* Priority - الأولوية */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>الأولوية</label>
              <div style={styles.priorityGrid}>
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData((prev) => ({ ...prev, priority: p.value }));
                    }}
                    style={{
                      ...styles.priorityBtn,
                      background: formData.priority === p.value ? p.bg : "rgba(31, 41, 55, 0.5)",
                      borderColor: formData.priority === p.value ? p.border : "rgba(55, 65, 81, 0.3)",
                      color: formData.priority === p.value ? p.color : "#9ca3af",
                    }}
                  >
                    <Flag size={14} color={formData.priority === p.value ? p.color : "#6b7280"} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date - تاريخ الاستحقاق */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <span style={styles.required}>*</span> تاريخ الاستحقاق
              </label>
              <div style={styles.inputWrapper}>
                <Calendar size={16} color="#6b7280" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    paddingRight: "40px",
                    borderColor: errors.dueDate ? "#f87171" : "rgba(55, 65, 81, 0.5)",
                  }}
                />
              </div>
              {errors.dueDate && (
                <div style={styles.error}>
                  <AlertCircle size={14} color="#f87171" />
                  {errors.dueDate}
                </div>
              )}
            </div>
          </div>

          {/* Assigned To - مسند إلى */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>مسند إلى</label>
            <div style={styles.inputWrapper}>
              <User size={16} color="#6b7280" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type="text"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                style={{ ...styles.input, paddingRight: "40px" }}
                placeholder="اسم الموظف المسؤول"
              />
            </div>
          </div>

          {/* Status - الحالة (only when editing) */}
          {task && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>الحالة</label>
              <div style={styles.statusGrid}>
                {statuses.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData((prev) => ({ ...prev, status: s.value }));
                    }}
                    style={{
                      ...styles.statusBtn,
                      background: formData.status === s.value ? s.color + "20" : "rgba(31, 41, 55, 0.5)",
                      borderColor: formData.status === s.value ? s.color + "60" : "rgba(55, 65, 81, 0.3)",
                      color: formData.status === s.value ? s.color : "#9ca3af",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: formData.status === s.value ? s.color : "#6b7280",
                      }}
                    />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={styles.buttons}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
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
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={styles.spinner} />
                  جاري الحفظ...
                </span>
              ) : task ? (
                "حفظ التعديلات"
              ) : (
                "إضافة العمل"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(8px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    background: "#1e293b",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 24px 16px",
    borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
    position: "sticky",
    top: 0,
    background: "#1e293b",
    zIndex: 10,
    borderRadius: "24px 24px 0 0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerIcon: {
    width: "44px",
    height: "44px",
    background: "linear-gradient(135deg, #059669, #16a34a)",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(34, 197, 94, 0.25)",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#f3f4f6",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "10px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    padding: "20px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#d1d5db",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  required: {
    color: "#f87171",
    fontSize: "16px",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: "12px",
    color: "#f3f4f6",
    fontSize: "14px",
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
    borderRadius: "12px",
    color: "#f3f4f6",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s",
    resize: "vertical",
    minHeight: "80px",
    boxSizing: "border-box",
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  priorityGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
  },
  priorityBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid",
    background: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
  },
  statusBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid",
    background: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#f87171",
    fontSize: "13px",
    marginTop: "4px",
  },
  buttons: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(55, 65, 81, 0.3)",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px 24px",
    background: "transparent",
    border: "1px solid rgba(55, 65, 81, 0.5)",
    borderRadius: "14px",
    color: "#9ca3af",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  submitBtn: {
    flex: 1,
    padding: "12px 24px",
    background: "#22c55e",
    border: "none",
    borderRadius: "14px",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxShadow: "0 4px 16px rgba(34, 197, 94, 0.3)",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
};