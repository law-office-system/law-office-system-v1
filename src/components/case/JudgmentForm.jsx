import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Gavel, Calendar, FileText, Scale, AlertCircle, Clock,
  CheckCircle2, Landmark, ChevronDown, Link2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Categories
const JUDGMENT_CATEGORIES = {
  order: 'أمر',
  preliminary: 'حكم تمهيدي',
  final: 'حكم قطعي',
};

const resultOptions = [
  { value: 'win', label: 'لصالحنا', color: '#10b981', icon: CheckCircle2 },
  { value: 'lose', label: 'ضدنا', color: '#ef4444', icon: AlertCircle },
  { value: 'draw', label: 'متعادل', color: '#f59e0b', icon: Scale },
];

const typeSuggestions = {
  order: [
    'أمر على عريضة', 'أمر بنـدب خبير', 'أمر باستجواب',
    'أمر بإحالة للتحقيق', 'أمر بتقديم مستندات',
    'أمر بسماع شهود', 'أمر بوقف الدعوى', 'أمر برد الدعوى',
  ],
  preliminary: [
    'حكم بنـدب خبير', 'حكم باستجواب', 'حكم بإحالة للتحقيق',
    'حكم بوقف الدعوى', 'حكم برد الدعوى',
    'حكم بتقديم مستندات', 'حكم بسماع شهود', 'حكم بمعاينة',
  ],
  final: [
    'حكم جزئي', 'حكم ابتدائي', 'حكم استئناف',
    'حكم نقض', 'حكم نهائي', 'حكم بإلزام',
    'حكم برفض الدعوى', 'حكم بعدم قبول الدعوى',
  ],
};

export default function JudgmentForm({
  caseId,
  judgment = null,
  sessions = [],           // ← NEW: list of sessions for dropdown
  preSelectedSession = null, // ← NEW: pre-selected session
  onClose,
  onSave,                  // ← NEW: external save handler
}) {
  const { userData } = useAuth();
  const tenantId = userData?.tenantId || userData?.officeId || '';

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: '',
    category: 'final',
    date: '',
    sessionDate: '',
    judge: '',
    result: '',
    summary: '',
    details: '',
    obligations: '',
    appealDeadline: '',
    needsFollowUp: false,
    attachments: [],

    // ── NEW: Session Link ──
    sessionId: '',
    sessionTitle: '',
  });

  const category = formData.category;
  const isOrder = category === 'order';
  const isPreliminary = category === 'preliminary';
  const isFinal = category === 'final';

  // ─── Init from existing judgment or pre-selected session ─────────
  useEffect(() => {
    if (judgment) {
      setFormData({
        title: judgment.title || '',
        type: judgment.type || '',
        category: judgment.category || 'final',
        date: judgment.date ? new Date(judgment.date).toISOString().split('T')[0] : '',
        sessionDate: judgment.sessionDate ? new Date(judgment.sessionDate).toISOString().split('T')[0] : '',
        judge: judgment.judge || '',
        result: judgment.result || '',
        summary: judgment.summary || '',
        details: judgment.details || '',
        obligations: judgment.obligations || '',
        appealDeadline: judgment.appealDeadline ? new Date(judgment.appealDeadline).toISOString().split('T')[0] : '',
        needsFollowUp: judgment.needsFollowUp || false,
        attachments: judgment.attachments || [],
        sessionId: judgment.sessionId || '',
        sessionTitle: judgment.sessionTitle || '',
      });
    } else if (preSelectedSession) {
      // Auto-fill from pre-selected session
      setFormData(prev => ({
        ...prev,
        sessionId: preSelectedSession.id || '',
        sessionTitle: preSelectedSession.title || '',
        sessionDate: preSelectedSession.date ? new Date(preSelectedSession.date).toISOString().split('T')[0] : '',
      }));
    }
  }, [judgment, preSelectedSession]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const name = e.target ? e.target.name : e.name;
    const value = e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e.value;

    setFormData(prev => {
      const updates = { [name]: value };
      if (name === 'category' && (value === 'order' || value === 'preliminary')) {
        updates.result = '';
      }
      if (name === 'category' && value === 'order') {
        setShowSuggestions(false);
      }
      return { ...prev, ...updates };
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  }, [errors]);

  const handleResultSelect = useCallback((value) => {
    setFormData(prev => ({ ...prev, result: value }));
  }, []);

  const selectSuggestion = (suggestion) => {
    setFormData(prev => ({ ...prev, type: suggestion }));
    setShowSuggestions(false);
  };

  const selectSession = (session) => {
    setFormData(prev => ({
      ...prev,
      sessionId: session.id,
      sessionTitle: session.title || `جلسة ${session.date}`,
      sessionDate: session.date ? new Date(session.date).toISOString().split('T')[0] : prev.sessionDate,
    }));
    setShowSessionDropdown(false);
    if (errors.sessionId) setErrors(prev => ({ ...prev, sessionId: null }));
  };

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'عنوان الحكم مطلوب';
    if (!formData.type.trim()) newErrors.type = 'نوع الحكم مطلوب';
    if (!formData.date) newErrors.date = 'تاريخ الحكم مطلوب';
    if (isFinal && !formData.result) newErrors.result = 'النتيجة مطلوبة للأحكام القطعية';
    if (!formData.sessionId && sessions.length > 0) newErrors.sessionId = 'يرجى اختيار الجلسة المرتبطة';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isFinal, sessions.length]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        tenantId,
        caseId,
      };

      // Use external onSave if provided (new flow), otherwise fallback
      if (onSave) {
        await onSave(dataToSave);
      } else {
        // Fallback for old flow using useJudgments hook
        // This would need the hook imported, but we're moving to external save
        console.warn('No onSave provided — judgment not saved');
      }
      onClose();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, validate, onSave, onClose, tenantId, caseId]);

  // ─── Modal effects ─────────────────────────────────────────────
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

  const categoryConfig = {
    order:       { label: 'أمر المحكمة', subtitle: 'إجراء إداري/تنظيمي', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)', icon: Clock },
    preliminary: { label: 'حكم تمهيدي', subtitle: 'إعداد للفصل في الدعوى', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', border: 'rgba(217, 119, 6, 0.3)', icon: Clock },
    final:       { label: 'حكم قطعي', subtitle: 'يفصل في أصل النزاع', color: '#1e40af', bg: 'rgba(30, 64, 175, 0.15)', border: 'rgba(30, 64, 175, 0.3)', icon: CheckCircle2 },
  };

  const currentCategory = categoryConfig[category];
  const CategoryIcon = currentCategory.icon;

  // Find selected session for display
  const selectedSession = sessions.find(s => s.id === formData.sessionId);

  // ═════════════════════════════════════════════════════════════════
  return (
    <div style={styles.overlay} onClick={handleOverlayClick} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <Landmark color="#fbbf24" size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={styles.headerTitle}>
                {judgment ? 'تعديل الحكم' : 'إضافة حكم جديد'}
              </h2>
              <p style={styles.headerSubtitle}>
                {currentCategory.label} - {currentCategory.subtitle}
              </p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={styles.closeBtn} type="button">
            <X size={20} color="#9ca3af" />
          </button>
        </div>

        {/* Category Bar */}
        <div style={{ ...styles.categoryBar, background: currentCategory.bg, borderColor: currentCategory.border }}>
          <div style={styles.categoryContent}>
            <CategoryIcon size={16} color={currentCategory.color} />
            <span style={{ color: currentCategory.color, fontWeight: 600 }}>{currentCategory.label}</span>
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>{currentCategory.subtitle}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form} onClick={(e) => e.stopPropagation()}>

          {/* ═══ NEW: Session Selector ═══ */}
          {sessions.length > 0 && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Link2 size={14} color="#60a5fa" />
                الجلسة المرتبطة
                {preSelectedSession && <span style={{ color: '#60a5fa', fontSize: '12px', marginRight: '6px' }}>(مُختارة مسبقاً)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${errors.sessionId ? '#ef4444' : 'rgba(55, 65, 81, 0.5)'}`,
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
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color={formData.sessionId ? '#60a5fa' : '#6b7280'} />
                    {formData.sessionId
                      ? `${selectedSession?.title || formData.sessionTitle} (${new Date(selectedSession?.date || formData.sessionDate).toLocaleDateString('ar-EG')})`
                      : 'اختر الجلسة المرتبطة بهذا الحكم...'}
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
              {errors.sessionId && (
                <div style={styles.error}>
                  <AlertCircle size={14} color="#ef4444" />
                  {errors.sessionId}
                </div>
              )}
            </div>
          )}

          {/* Category Selection */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>التصنيف</label>
            <div style={styles.categoryGrid}>
              {Object.entries(JUDGMENT_CATEGORIES).map(([key, label]) => {
                const isSelected = formData.category === key;
                const config = categoryConfig[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChange({ name: 'category', value: key })}
                    style={{
                      ...styles.categoryBtn,
                      background: isSelected ? config.bg : 'rgba(31, 41, 55, 0.5)',
                      borderColor: isSelected ? config.border : 'rgba(55, 65, 81, 0.3)',
                      color: isSelected ? config.color : '#9ca3af',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.required}>*</span> عنوان {isOrder ? 'الأمر' : 'الحكم'}
            </label>
            <div style={styles.inputWrapper}>
              <Gavel size={16} color="#6b7280" style={styles.inputIcon} />
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={{ ...styles.input, paddingRight: '40px', borderColor: errors.title ? '#ef4444' : 'rgba(55, 65, 81, 0.5)' }}
                placeholder={isOrder ? '' : 'مثال: الحكم في الدعوى رقم 123'}
              />
            </div>
            {errors.title && <div style={styles.error}><AlertCircle size={14} color="#ef4444" />{errors.title}</div>}
          </div>

          {/* Type */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.required}>*</span> نوع {isOrder ? 'الأمر' : 'الحكم'}
            </label>
            <div style={styles.typeInputWrapper}>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                onFocus={() => !isOrder && setShowSuggestions(true)}
                style={{ ...styles.input, paddingLeft: isOrder ? '16px' : '40px', borderColor: errors.type ? '#ef4444' : 'rgba(55, 65, 81, 0.5)' }}
                placeholder={isOrder ? 'اكتب نوع الأمر...' : 'اكتب نوع الحكم أو اختر من القائمة...'}
              />
              {!isOrder && (
                <button type="button" onClick={() => setShowSuggestions(!showSuggestions)} style={styles.suggestionsToggle}>
                  <ChevronDown size={16} color="#6b7280" />
                </button>
              )}
            </div>
            {showSuggestions && !isOrder && (
              <div style={styles.suggestionsBox}>
                <p style={styles.suggestionsTitle}>مقترحات:</p>
                <div style={styles.suggestionsList}>
                  {typeSuggestions[category]?.map((suggestion, idx) => (
                    <button key={idx} type="button" onClick={() => selectSuggestion(suggestion)} style={styles.suggestionItem}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {errors.type && <div style={styles.error}><AlertCircle size={14} color="#ef4444" />{errors.type}</div>}
          </div>

          {/* Date & Session Date */}
          <div style={styles.twoCols}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> تاريخ {isOrder ? 'الأمر' : 'الحكم'}</label>
              <div style={styles.inputWrapper}>
                <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                <input type="date" name="date" value={formData.date} onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px', borderColor: errors.date ? '#ef4444' : 'rgba(55, 65, 81, 0.5)' }} />
              </div>
              {errors.date && <div style={styles.error}><AlertCircle size={14} color="#ef4444" />{errors.date}</div>}
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>تاريخ الجلسة</label>
              <div style={styles.inputWrapper}>
                <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                <input type="date" name="sessionDate" value={formData.sessionDate} onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px' }} />
              </div>
            </div>
          </div>

          {/* Judge */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>القاضي / الهيئة القضائية</label>
            <div style={styles.inputWrapper}>
              <Scale size={16} color="#6b7280" style={styles.inputIcon} />
              <input type="text" name="judge" value={formData.judge} onChange={handleChange}
                style={{ ...styles.input, paddingRight: '40px' }} placeholder="اسم القاضي أو رئيس الهيئة" />
            </div>
          </div>

          {/* Follow Up (order/preliminary) */}
          {(isOrder || isPreliminary) && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>حالة المتابعة</label>
              <div style={styles.followUpToggle}>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, needsFollowUp: !prev.needsFollowUp }))}
                  style={{
                    ...styles.toggleBtn,
                    background: formData.needsFollowUp ? 'rgba(217, 119, 6, 0.15)' : 'rgba(31, 41, 55, 0.5)',
                    borderColor: formData.needsFollowUp ? 'rgba(217, 119, 6, 0.5)' : 'rgba(55, 65, 81, 0.3)',
                  }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px', border: '2px solid',
                    borderColor: formData.needsFollowUp ? '#d97706' : '#6b7280',
                    background: formData.needsFollowUp ? '#d97706' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {formData.needsFollowUp && <CheckCircle2 size={12} color="#fff" />}
                  </div>
                  <span style={{ color: formData.needsFollowUp ? '#d97706' : '#9ca3af' }}>يحتاج متابعة</span>
                </button>
                {formData.needsFollowUp && (
                  <div style={styles.inputWrapper}>
                    <Calendar size={16} color="#d97706" style={styles.inputIcon} />
                    <input type="date" name="appealDeadline" value={formData.appealDeadline} onChange={handleChange}
                      style={{ ...styles.input, paddingRight: '40px' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result (final only) */}
          {isFinal && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}><span style={styles.required}>*</span> النتيجة</label>
              <div style={styles.resultGrid}>
                {resultOptions.map((opt) => {
                  const isSelected = formData.result === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button key={opt.value} type="button" onClick={() => handleResultSelect(opt.value)}
                      style={{
                        ...styles.resultBtn,
                        background: isSelected ? opt.color + '15' : 'rgba(31, 41, 55, 0.5)',
                        borderColor: isSelected ? opt.color + '50' : 'rgba(55, 65, 81, 0.3)',
                        color: isSelected ? opt.color : '#9ca3af',
                      }}>
                      <Icon size={16} color={isSelected ? opt.color : '#6b7280'} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {errors.result && <div style={styles.error}><AlertCircle size="14" color="#ef4444" />{errors.result}</div>}
            </div>
          )}

          {/* Appeal Deadline (final only) */}
          {isFinal && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>موعد الاستئناف (إن وجد)</label>
              <div style={styles.inputWrapper}>
                <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                <input type="date" name="appealDeadline" value={formData.appealDeadline} onChange={handleChange}
                  style={{ ...styles.input, paddingRight: '40px' }} />
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>ملخص {isOrder ? 'الأمر' : 'الحكم'}</label>
            <textarea name="summary" value={formData.summary} onChange={handleChange} rows={3}
              style={styles.textarea} placeholder="ملخص مختصر..." />
          </div>

          {/* Details & Obligations (final only) */}
          {isFinal && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>التفاصيل الكاملة</label>
                <textarea name="details" value={formData.details} onChange={handleChange} rows={4}
                  style={styles.textarea} placeholder="تفاصيل الحكم الكاملة..." />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>الالتزامات الناتجة</label>
                <textarea name="obligations" value={formData.obligations} onChange={handleChange} rows={2}
                  style={styles.textarea} placeholder="الالتزامات الناتجة..." />
              </div>
            </>
          )}

          {/* Buttons */}
          <div style={styles.buttons}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} style={styles.cancelBtn}>إلغاء</button>
            <button type="submit" disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={styles.spinner} />جاري الحفظ...
                </span>
              ) : judgment ? 'حفظ التعديلات' : 'إضافة ' + (isOrder ? 'الأمر' : 'الحكم')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)', zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  },
  modal: {
    background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '24px', width: '100%', maxWidth: '640px',
    maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)', position: 'relative',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 24px 16px', borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
    position: 'sticky', top: 0, background: '#1e293b', zIndex: 10,
    borderRadius: '24px 24px 0 0',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerIcon: {
    width: '44px', height: '44px',
    background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
    borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(30, 64, 175, 0.25)',
  },
  headerTitle: { fontSize: '18px', fontWeight: '700', color: '#f3f4f6', margin: 0 },
  headerSubtitle: { fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
    borderRadius: '10px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  categoryBar: {
    padding: '12px 24px', borderBottom: '1px solid', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  categoryContent: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
  form: {
    padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '4px' },
  required: { color: '#ef4444', fontSize: '16px' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '12px',
    color: '#f3f4f6', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    transition: 'all 0.2s', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '12px',
    color: '#f3f4f6', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    transition: 'all 0.2s', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box',
  },
  twoCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  categoryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
  categoryBtn: {
    padding: '10px', borderRadius: '12px', border: '1px solid',
    background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    fontFamily: 'inherit', transition: 'all 0.2s ease',
  },
  typeInputWrapper: { position: 'relative' },
  suggestionsToggle: {
    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
  },
  suggestionsBox: {
    marginTop: '8px', background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '12px',
    padding: '12px', maxHeight: '200px', overflow: 'auto',
  },
  suggestionsTitle: { fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', fontWeight: 600 },
  suggestionsList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  suggestionItem: {
    padding: '8px 12px', background: 'rgba(31, 41, 55, 0.5)', border: 'none',
    borderRadius: '8px', color: '#d1d5db', fontSize: '13px', cursor: 'pointer',
    textAlign: 'right', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  resultGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
  resultBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px', borderRadius: '12px', border: '1px solid',
    background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    fontFamily: 'inherit', transition: 'all 0.2s ease',
  },
  followUpToggle: { display: 'flex', flexDirection: 'column', gap: '10px' },
  toggleBtn: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
    borderRadius: '12px', border: '1px solid', background: 'none', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600', fontFamily: 'inherit',
    transition: 'all 0.2s ease', width: 'fit-content',
  },
  error: { display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '13px', marginTop: '4px' },
  buttons: {
    display: 'flex', gap: '12px', marginTop: '8px',
    paddingTop: '16px', borderTop: '1px solid rgba(55, 65, 81, 0.3)',
  },
  cancelBtn: {
    flex: 1, padding: '12px 24px', background: 'transparent',
    border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '14px',
    color: '#9ca3af', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s ease', fontFamily: 'inherit',
  },
  submitBtn: {
    flex: 1, padding: '12px 24px', background: '#1e40af', border: 'none',
    borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(30, 64, 175, 0.3)',
  },
  spinner: {
    width: '18px', height: '18px', border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
};