import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, FileText, AlertCircle, Calendar, Link2,
  Scale, ChevronDown, Gavel
} from 'lucide-react';

// ─── Decision Types (sync with SessionForm) ──────────────────────
const DECISION_TYPES = [
  { value: 'adjourned',       label: 'تأجيل',         color: '#f59e0b', icon: Calendar },
  { value: 'adjourned_notice',label: 'تأجيل لإعلان',  color: '#f97316', icon: Calendar },
  { value: 'judgment',        label: 'حكم',           color: '#10b981', icon: Gavel },
  { value: 'referred',        label: 'إحالة',         color: '#3b82f6', icon: Scale },
  { value: 'absence',         label: 'غياب',          color: '#ef4444', icon: AlertCircle },
  { value: 'expert',          label: 'خبير',          color: '#8b5cf6', icon: Scale },
  { value: 'settlement',      label: 'تسوية',         color: '#14b8a6', icon: CheckCircle2 },
  { value: 'reserved',        label: 'حجز للحكم',     color: '#6366f1', icon: Gavel },
  { value: 'struck_off',      label: 'شطب',           color: '#dc2626', icon: X },
  { value: 'suspended',       label: 'وقف',           color: '#78716c', icon: AlertCircle },
];

export default function DecisionForm({ session, onClose, onSave }) {
  const [formData, setFormData] = useState({
    decisionType: session?.decisionType || '',
    decisionDetails: session?.decisionDetails || session?.decision || '',
    notes: session?.notes || '',
    // ── NEW: Session Link ──
    sessionId: session?.id || '',
    sessionTitle: session?.title || '',
    sessionDate: session?.date || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleDecisionTypeSelect = (value) => {
    setFormData(prev => ({ ...prev, decisionType: value }));
    if (errors.decisionType) setErrors(prev => ({ ...prev, decisionType: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.decisionType) {
      newErrors.decisionType = 'نوع القرار مطلوب';
    }
    if (!formData.decisionDetails.trim()) {
      newErrors.decisionDetails = 'تفاصيل القرار مطلوبة';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const decisionMeta = DECISION_TYPES.find(d => d.value === formData.decisionType);
      await onSave({
        ...formData,
        decisionLabel: decisionMeta?.label || '',
        decisionColor: decisionMeta?.color || '',
      });
      onClose();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const selectedType = DECISION_TYPES.find(d => d.value === formData.decisionType);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Session Info Banner (NEW) ── */}
      {session && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(96, 165, 250, 0.08)',
          border: '1px solid rgba(96, 165, 250, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Link2 size={16} color="#60a5fa" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
              مرتبط بالجلسة: {session.title || `الجلسة (${session.date})`}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
              {new Date(session.date || session.nextSessionDate).toLocaleDateString('ar-EG')}
            </div>
          </div>
        </div>
      )}

      {/* ── Decision Type (NEW: structured) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#d1d5db", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#ef4444", fontSize: 16 }}>*</span>
          نوع القرار
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '8px',
        }}>
          {DECISION_TYPES.map((dt) => {
            const Icon = dt.icon;
            const isSelected = formData.decisionType === dt.value;
            return (
              <button
                key={dt.value}
                type="button"
                onClick={() => handleDecisionTypeSelect(dt.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '10px 6px',
                  borderRadius: '12px',
                  border: `1px solid ${isSelected ? dt.color : 'rgba(55, 65, 81, 0.4)'}`,
                  background: isSelected ? `${dt.color}15` : 'rgba(15, 23, 42, 0.4)',
                  color: isSelected ? dt.color : '#9ca3af',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  minHeight: '64px',
                }}
              >
                <Icon size={14} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{dt.label}</span>
                {isSelected && <CheckCircle2 size={12} color={dt.color} />}
              </button>
            );
          })}
        </div>
        {errors.decisionType && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 13 }}>
            <AlertCircle size={14} />
            {errors.decisionType}
          </div>
        )}
      </div>

      {/* ── Decision Details ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#d1d5db", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#ef4444", fontSize: 16 }}>*</span>
          تفاصيل القرار
        </label>
        <textarea
          name="decisionDetails"
          value={formData.decisionDetails}
          onChange={handleChange}
          rows={4}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "rgba(15, 23, 42, 0.6)",
            border: `1px solid ${errors.decisionDetails ? '#ef4444' : 'rgba(55, 65, 81, 0.5)'}`,
            borderRadius: 12,
            color: "#f3f4f6",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            minHeight: 100,
            boxSizing: "border-box",
          }}
          placeholder="اكتب تفاصيل القرار الصادر..."
        />
        {errors.decisionDetails && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 13 }}>
            <AlertCircle size={14} />
            {errors.decisionDetails}
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#d1d5db" }}>
          ملاحظات إضافية
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 12,
            color: "#f3f4f6",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          placeholder="أي ملاحظات إضافية..."
        />
      </div>

      {/* ── Hidden Session Data ── */}
      <input type="hidden" name="sessionId" value={formData.sessionId} />
      <input type="hidden" name="sessionTitle" value={formData.sessionTitle} />
      <input type="hidden" name="sessionDate" value={formData.sessionDate} />

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 16, borderTop: "1px solid rgba(55, 65, 81, 0.3)" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
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
          }}
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 24px",
            background: selectedType?.color || "#10b981",
            border: "none",
            borderRadius: 14,
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "all 0.2s ease",
            fontFamily: "inherit",
            boxShadow: `0 4px 16px ${selectedType?.color || '#10b981'}40`,
          }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 18,
                height: 18,
                border: "2px solid rgba(255, 255, 255, 0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }} />
              جاري الحفظ...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} />
              حفظ القرار
            </span>
          )}
        </button>
      </div>
    </form>
  );
}