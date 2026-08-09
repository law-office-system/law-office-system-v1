import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Calendar, Flag, User, AlertCircle, MapPin,
  Link2, ChevronDown, CheckCircle2
} from "lucide-react";
import { Modal } from "../ui";
import { formSection, colors, spacing, radius, shadows, transitions } from "../../styles/design-system";
import { useAdminTasks } from "../../hooks/useAdminTasks";
import { useAuth } from "../../context/AuthContext";

const priorities = [
  { value: "high", label: "عالية", color: colors.accent.red.main, bg: colors.accent.red.bg, border: `${colors.accent.red.main}30` },
  { value: "medium", label: "متوسطة", color: colors.accent.amber.main, bg: colors.accent.amber.bg, border: `${colors.accent.amber.main}30` },
  { value: "low", label: "منخفضة", color: colors.accent.green.main, bg: colors.accent.green.bg, border: `${colors.accent.green.main}30` },
];

const statuses = [
  { value: "pending", label: "معلقة", color: colors.accent.amber.main },
  { value: "in-progress", label: "قيد التنفيذ", color: colors.accent.blue.main },
  { value: "completed", label: "منجزة", color: colors.accent.green.main },
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

  const selectedSession = sessions.find(s => s.id === formData.sessionId);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={task ? "تعديل العمل الإداري" : "إضافة عمل إداري"}
      subtitle="تسجيل مهمة إدارية مرتبطة بالقضية"
      icon={ClipboardList}
      iconColor={colors.accent.green.light}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>

        {/* ═══ Session Selector ═══ */}
        {sessions.length > 0 && (
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <Link2 size={14} color={colors.accent.blue.light} />
              الجلسة المرتبطة (اختياري)
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                style={{
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  background: colors.bg.input,
                  border: `1px solid ${formData.sessionId ? colors.accent.blue.main + '50' : colors.border.default}`,
                  borderRadius: radius.md,
                  color: formData.sessionId ? colors.text.primary : colors.text.disabled,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'right',
                  direction: 'rtl',
                  transition: transitions.default,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <Calendar size={16} color={formData.sessionId ? colors.accent.blue.light : colors.text.disabled} />
                  {formData.sessionId
                    ? `${selectedSession?.title || formData.sessionTitle} (${new Date(selectedSession?.date || selectedSession?.nextSessionDate).toLocaleDateString('ar-EG')})`
                    : 'اختر الجلسة المرتبطة (اختياري)...'}
                </span>
                <ChevronDown size={16} color={colors.text.disabled}
                  style={{ transform: showSessionDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: transitions.default }} />
              </button>

              {showSessionDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: colors.bg.card,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.lg,
                  boxShadow: shadows.lg,
                  zIndex: 100,
                  maxHeight: '280px',
                  overflow: 'auto',
                  padding: spacing.sm,
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, sessionId: '', sessionTitle: '' }));
                      setShowSessionDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: !formData.sessionId ? colors.accent.blue.bg : 'transparent',
                      border: 'none',
                      borderRadius: radius.md,
                      color: !formData.sessionId ? colors.accent.blue.light : colors.text.disabled,
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
                  <div style={{ height: 1, background: colors.border.default, margin: '4px 8px' }} />
                  {sessions.map((session, idx) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => selectSession(session)}
                      style={{
                        width: '100%',
                        padding: `${spacing.sm} ${spacing.md}`,
                        background: formData.sessionId === session.id ? colors.accent.blue.bg : 'transparent',
                        border: 'none',
                        borderRadius: radius.md,
                        color: formData.sessionId === session.id ? colors.accent.blue.light : colors.text.secondary,
                        fontSize: '13px',
                        fontWeight: formData.sessionId === session.id ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'right',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        marginBottom: '4px',
                        transition: transitions.fast,
                      }}
                      onMouseEnter={(e) => {
                        if (formData.sessionId !== session.id) {
                          e.currentTarget.style.background = colors.bg.hover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.sessionId !== session.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        width: 24, height: 24,
                        borderRadius: '50%',
                        background: formData.sessionId === session.id ? `${colors.accent.blue.main}20` : 'rgba(55, 65, 81, 0.5)',
                        color: formData.sessionId === session.id ? colors.accent.blue.light : colors.text.muted,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 'bold', flexShrink: 0,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{session.title || `الجلسة ${idx + 1}`}</div>
                        <div style={{ fontSize: '11px', color: colors.text.disabled, marginTop: '2px' }}>
                          {new Date(session.date || session.nextSessionDate).toLocaleDateString('ar-EG')}
                          {session.decisionType && session.decisionType !== 'pending' && (
                            <span style={{ marginRight: '8px', color: colors.accent.amber.light }}>
                              — {session.decisionLabel || session.decisionType}
                            </span>
                          )}
                        </div>
                      </div>
                      {formData.sessionId === session.id && <CheckCircle2 size={16} color={colors.accent.blue.light} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Title - مكان العمل */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>
            <span style={formSection.required}>*</span> مكان العمل
          </label>
          <div style={formSection.inputWrapper}>
            <MapPin size={16} color={colors.text.muted} style={formSection.inputIcon} />
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={{ ...formSection.input, paddingRight: '40px', borderColor: errors.title ? colors.accent.red.main : colors.border.default }}
              placeholder="مثال: محكمة شمال القاهرة"
            />
          </div>
          {errors.title && (
            <div style={formSection.error}>
              <AlertCircle size={14} color={colors.accent.red.main} />
              {errors.title}
            </div>
          )}
        </div>

        {/* Description - الوصف */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>الوصف</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            style={formSection.textarea}
            placeholder="وصف تفصيلي للعمل المطلوب..."
          />
        </div>

        {/* Two Columns */}
        <div style={formSection.twoCols}>
          {/* Priority - الأولوية */}
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>الأولوية</label>
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
                    background: formData.priority === p.value ? p.bg : 'rgba(15, 23, 42, 0.4)',
                    borderColor: formData.priority === p.value ? p.border : colors.border.default,
                    color: formData.priority === p.value ? p.color : colors.text.muted,
                  }}
                >
                  <Flag size={14} color={formData.priority === p.value ? p.color : colors.text.disabled} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date - تاريخ الاستحقاق */}
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <span style={formSection.required}>*</span> تاريخ الاستحقاق
            </label>
            <div style={formSection.inputWrapper}>
              <Calendar size={16} color={colors.text.muted} style={formSection.inputIcon} />
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                style={{ ...formSection.input, paddingRight: '40px', borderColor: errors.dueDate ? colors.accent.red.main : colors.border.default }}
              />
            </div>
            {errors.dueDate && (
              <div style={formSection.error}>
                <AlertCircle size={14} color={colors.accent.red.main} />
                {errors.dueDate}
              </div>
            )}
          </div>
        </div>

        {/* Assigned To - مسند إلى */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>مسند إلى</label>
          <div style={formSection.inputWrapper}>
            <User size={16} color={colors.text.muted} style={formSection.inputIcon} />
            <input
              type="text"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              style={{ ...formSection.input, paddingRight: '40px' }}
              placeholder="اسم الموظف المسؤول"
            />
          </div>
        </div>

        {/* Status - الحالة (only when editing) */}
        {task && (
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>الحالة</label>
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
                    background: formData.status === s.value ? s.color + '20' : 'rgba(15, 23, 42, 0.4)',
                    borderColor: formData.status === s.value ? s.color + '60' : colors.border.default,
                    color: formData.status === s.value ? s.color : colors.text.muted,
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: formData.status === s.value ? s.color : colors.text.disabled,
                  }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={formSection.buttons}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={formSection.cancelBtn}>إلغاء</button>
          <button type="submit" disabled={loading}
            style={{ ...formSection.submitBtn(colors.accent.green.main), opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={formSection.spinner} />جاري الحفظ...
              </span>
            ) : task ? "حفظ التعديلات" : "إضافة العمل"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL STYLES (unique to this form)
// ═══════════════════════════════════════════════════════════════════
const styles = {
  priorityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: spacing.sm,
  },
  priorityBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    border: '1px solid',
    background: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: transitions.default,
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: spacing.sm,
  },
  statusBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    border: '1px solid',
    background: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: transitions.default,
  },
};