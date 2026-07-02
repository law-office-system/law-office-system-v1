import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

export default function DecisionForm({ session, onClose, onSave }) {
  const [formData, setFormData] = useState({
    decision: session?.decision || '',
    notes: session?.notes || '',
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

  const validate = () => {
    const newErrors = {};
    if (!formData.decision.trim()) {
      newErrors.decision = 'القرار مطلوب';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave(formData);
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

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Decision */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#d1d5db", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#ef4444", fontSize: 16 }}>*</span>
          القرار / الإجراء
        </label>
        <textarea
          name="decision"
          value={formData.decision}
          onChange={handleChange}
          rows={4}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "rgba(15, 23, 42, 0.6)",
            border: `1px solid ${errors.decision ? '#ef4444' : 'rgba(55, 65, 81, 0.5)'}`,
            borderRadius: 12,
            color: "#f3f4f6",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            minHeight: 100,
            boxSizing: "border-box",
          }}
          placeholder="اكتب قرار الجلسة أو الإجراء المتخذ..."
        />
        {errors.decision && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 13 }}>
            <AlertCircle size={14} />
            {errors.decision}
          </div>
        )}
      </div>

      {/* Notes */}
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
            background: "#10b981",
            border: "none",
            borderRadius: 14,
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "all 0.2s ease",
            fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
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