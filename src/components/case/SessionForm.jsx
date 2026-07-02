import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, MapPin, FileText, Landmark, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SessionForm({ session = null, caseId, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    roll: '',
    description: '',
    decision: '',
    notes: '',
    attachments: [],
  });

  useEffect(() => {
    if (session) {
      setFormData({
        title: session.title || '',
        date: session.nextSessionDate || session.date || '',
        time: session.time || '',
        location: session.location || '',
        roll: session.roll || '',
        description: session.description || '',
        decision: session.decision || session.action || '',
        notes: session.notes || '',
        attachments: session.attachments || [],
      });
    }
  }, [session]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'عنوان الجلسة مطلوب';
    }
    if (!formData.date) {
      newErrors.date = 'تاريخ الجلسة مطلوب';
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
      const data = {
        ...formData,
        nextSessionDate: formData.date,
        action: formData.decision,
      };
      await onSave(data);
      onClose();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, validate, onSave, onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div 
      style={styles.overlay} 
      onClick={handleOverlayClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <Calendar color="#fbbf24" size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={styles.headerTitle}>
                {session ? 'تعديل الجلسة' : 'إضافة جلسة جديدة'}
              </h2>
              <p style={styles.headerSubtitle}>
                {session ? 'تحديث بيانات الجلسة' : 'جدولة جلسة جديدة للقضية'}
              </p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            style={styles.closeBtn}
            type="button"
          >
            <X size={20} color="#9ca3af" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form} onClick={(e) => e.stopPropagation()}>

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
                value={formData.title}
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
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    paddingRight: '40px',
                    borderColor: errors.date ? '#ef4444' : 'rgba(55, 65, 81, 0.5)',
                  }}
                />
              </div>
              {errors.date && (
                <div style={styles.error}>
                  <AlertCircle size={14} color="#ef4444" />
                  {errors.date}
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
                  value={formData.time}
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
                  value={formData.location}
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
                  value={formData.roll}
                  onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px' }}
                  placeholder="مثال: 12"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>تفاصيل الجلسة</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="ملخص مختصر لموضوع الجلسة..."
            />
          </div>

          {/* Decision */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>القرار / الإجراء</label>
            <textarea
              name="decision"
              value={formData.decision}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="القرار المتوقع أو الإجراء المطلوب..."
            />
          </div>

          {/* Notes */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>ملاحظات</label>
            <textarea
              name="notes"
              value={formData.notes}
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
              onClick={(e) => { e.stopPropagation(); onClose(); }}
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
              ) : session ? (
                'حفظ التعديلات'
              ) : (
                'إضافة الجلسة'
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
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    background: '#1e293b',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 24px 16px',
    borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
    position: 'sticky',
    top: 0,
    background: '#1e293b',
    zIndex: 10,
    borderRadius: '24px 24px 0 0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(30, 64, 175, 0.25)',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f3f4f6',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '10px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#d1d5db',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  required: {
    color: '#ef4444',
    fontSize: '16px',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '12px',
    color: '#f3f4f6',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '12px',
    color: '#f3f4f6',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s',
    resize: 'vertical',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  twoCols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '8px',
  },
  statusBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid',
    background: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '4px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(55, 65, 81, 0.3)',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'transparent',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '14px',
    color: '#9ca3af',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  submitBtn: {
    flex: 1,
    padding: '12px 24px',
    background: '#1e40af',
    border: 'none',
    borderRadius: '14px',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(30, 64, 175, 0.3)',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
};