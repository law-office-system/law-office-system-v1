import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Gavel, Calendar, FileText, Scale, AlertCircle, Clock,
  CheckCircle2, Landmark, ChevronDown, Link2
} from 'lucide-react';
import { Modal } from '../ui';
import { formSection, colors, spacing, radius, shadows, transitions } from '../../styles/design-system';
import { useAuth } from '../../context/AuthContext';

// Categories
const JUDGMENT_CATEGORIES = {
  order: 'أمر',
  preliminary: 'حكم تمهيدي',
  final: 'حكم قطعي',
};

const resultOptions = [
  { value: 'win', label: 'لصالحنا', color: colors.accent.green.main, icon: CheckCircle2 },
  { value: 'lose', label: 'ضدنا', color: colors.accent.red.main, icon: AlertCircle },
  { value: 'draw', label: 'متعادل', color: colors.accent.amber.main, icon: Scale },
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
  sessions = [],
  preSelectedSession = null,
  onClose,
  onSave,
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

      if (onSave) {
        await onSave(dataToSave);
      } else {
        console.warn('No onSave provided — judgment not saved');
      }
      onClose();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, validate, onSave, onClose, tenantId, caseId]);

  const categoryConfig = {
    order:       { label: 'أمر المحكمة', subtitle: 'إجراء إداري/تنظيمي', color: colors.text.disabled, bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)', icon: Clock },
    preliminary: { label: 'حكم تمهيدي', subtitle: 'إعداد للفصل في الدعوى', color: colors.accent.amber.main, bg: 'rgba(217, 119, 6, 0.15)', border: 'rgba(217, 119, 6, 0.3)', icon: Clock },
    final:       { label: 'حكم قطعي', subtitle: 'يفصل في أصل النزاع', color: colors.accent.blue.dark, bg: 'rgba(30, 64, 175, 0.15)', border: 'rgba(30, 64, 175, 0.3)', icon: CheckCircle2 },
  };

  const currentCategory = categoryConfig[category];
  const CategoryIcon = currentCategory.icon;
  const selectedSession = sessions.find(s => s.id === formData.sessionId);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={judgment ? 'تعديل الحكم' : 'إضافة حكم جديد'}
      subtitle={`${currentCategory.label} - ${currentCategory.subtitle}`}
      icon={Landmark}
      iconColor={colors.accent.amber.light}
      maxWidth="640px"
    >
      {/* Category Bar */}
      <div style={{
        background: currentCategory.bg,
        borderBottom: `1px solid ${currentCategory.border}`,
        padding: `${spacing.md} ${spacing['2xl']}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: `-${spacing.xl} -${spacing['2xl']} ${spacing.xl}`,
        borderTop: `1px solid ${currentCategory.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: '14px' }}>
          <CategoryIcon size={16} color={currentCategory.color} />
          <span style={{ color: currentCategory.color, fontWeight: 600 }}>{currentCategory.label}</span>
          <span style={{ color: colors.text.muted, fontSize: '13px' }}>{currentCategory.subtitle}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>

        {/* ═══ Session Selector ═══ */}
        {sessions.length > 0 && (
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <Link2 size={14} color={colors.accent.blue.light} />
              الجلسة المرتبطة
              {preSelectedSession && <span style={{ color: colors.accent.blue.light, fontSize: '12px', marginRight: '6px' }}>(مُختارة مسبقاً)</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                style={{
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  background: colors.bg.input,
                  border: `1px solid ${errors.sessionId ? colors.accent.red.main : colors.border.default}`,
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
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <Calendar size={16} color={formData.sessionId ? colors.accent.blue.light : colors.text.disabled} />
                  {formData.sessionId
                    ? `${selectedSession?.title || formData.sessionTitle} (${new Date(selectedSession?.date || formData.sessionDate).toLocaleDateString('ar-EG')})`
                    : 'اختر الجلسة المرتبطة بهذا الحكم...'}
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
            {errors.sessionId && (
              <div style={formSection.error}>
                <AlertCircle size={14} color={colors.accent.red.main} />
                {errors.sessionId}
              </div>
            )}
          </div>
        )}

        {/* Category Selection */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>التصنيف</label>
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
                    background: isSelected ? config.bg : 'rgba(15, 23, 42, 0.4)',
                    borderColor: isSelected ? config.border : colors.border.default,
                    color: isSelected ? config.color : colors.text.muted,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>
            <span style={formSection.required}>*</span> عنوان {isOrder ? 'الأمر' : 'الحكم'}
          </label>
          <div style={formSection.inputWrapper}>
            <Gavel size={16} color={colors.text.muted} style={formSection.inputIcon} />
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={{ ...formSection.input, paddingRight: '40px', borderColor: errors.title ? colors.accent.red.main : colors.border.default }}
              placeholder={isOrder ? '' : 'مثال: الحكم في الدعوى رقم 123'}
            />
          </div>
          {errors.title && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.title}</div>}
        </div>

        {/* Type */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>
            <span style={formSection.required}>*</span> نوع {isOrder ? 'الأمر' : 'الحكم'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onFocus={() => !isOrder && setShowSuggestions(true)}
              style={{ ...formSection.input, paddingLeft: isOrder ? spacing.lg : '40px', borderColor: errors.type ? colors.accent.red.main : colors.border.default }}
              placeholder={isOrder ? 'اكتب نوع الأمر...' : 'اكتب نوع الحكم أو اختر من القائمة...'}
            />
            {!isOrder && (
              <button type="button" onClick={() => setShowSuggestions(!showSuggestions)} style={styles.suggestionsToggle}>
                <ChevronDown size={16} color={colors.text.muted} />
              </button>
            )}
          </div>
          {showSuggestions && !isOrder && (
            <div style={{
              marginTop: spacing.sm,
              background: colors.bg.card,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              padding: spacing.md,
              maxHeight: '200px',
              overflow: 'auto',
            }}>
              <p style={{ fontSize: '12px', color: colors.text.disabled, margin: `0 0 ${spacing.sm} 0`, fontWeight: 600 }}>مقترحات:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {typeSuggestions[category]?.map((suggestion, idx) => (
                  <button key={idx} type="button" onClick={() => selectSuggestion(suggestion)}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: 'none',
                      borderRadius: radius.sm,
                      color: colors.text.secondary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'right',
                      fontFamily: 'inherit',
                      transition: transitions.fast,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.bg.hover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)'}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {errors.type && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.type}</div>}
        </div>

        {/* Date & Session Date */}
        <div style={formSection.twoCols}>
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <span style={formSection.required}>*</span> تاريخ {isOrder ? 'الأمر' : 'الحكم'}
            </label>
            <div style={formSection.inputWrapper}>
              <Calendar size={16} color={colors.text.muted} style={formSection.inputIcon} />
              <input type="date" name="date" value={formData.date} onChange={handleChange}
                style={{ ...formSection.input, paddingRight: '40px', borderColor: errors.date ? colors.accent.red.main : colors.border.default }} />
            </div>
            {errors.date && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.date}</div>}
          </div>
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>تاريخ الجلسة</label>
            <div style={formSection.inputWrapper}>
              <Calendar size={16} color={colors.text.muted} style={formSection.inputIcon} />
              <input type="date" name="sessionDate" value={formData.sessionDate} onChange={handleChange}
                style={{ ...formSection.input, paddingRight: '40px' }} />
            </div>
          </div>
        </div>

        {/* Judge */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>القاضي / الهيئة القضائية</label>
          <div style={formSection.inputWrapper}>
            <Scale size={16} color={colors.text.muted} style={formSection.inputIcon} />
            <input type="text" name="judge" value={formData.judge} onChange={handleChange}
              style={{ ...formSection.input, paddingRight: '40px' }} placeholder="اسم القاضي أو رئيس الهيئة" />
          </div>
        </div>

        {/* Follow Up (order/preliminary) */}
        {(isOrder || isPreliminary) && (
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>حالة المتابعة</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, needsFollowUp: !prev.needsFollowUp }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: spacing.md,
                  padding: `${spacing.md} ${spacing.lg}`,
                  borderRadius: radius.md,
                  border: `1px solid ${formData.needsFollowUp ? colors.accent.amber.main + '50' : colors.border.default}`,
                  background: formData.needsFollowUp ? colors.accent.amber.bg : colors.bg.input,
                  cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: transitions.default,
                  width: 'fit-content',
                  color: formData.needsFollowUp ? colors.accent.amber.light : colors.text.muted,
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '4px', border: '2px solid',
                  borderColor: formData.needsFollowUp ? colors.accent.amber.main : colors.text.disabled,
                  background: formData.needsFollowUp ? colors.accent.amber.main : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {formData.needsFollowUp && <CheckCircle2 size={12} color="#fff" />}
                </div>
                يحتاج متابعة
              </button>
              {formData.needsFollowUp && (
                <div style={formSection.inputWrapper}>
                  <Calendar size={16} color={colors.accent.amber.main} style={formSection.inputIcon} />
                  <input type="date" name="appealDeadline" value={formData.appealDeadline} onChange={handleChange}
                    style={{ ...formSection.input, paddingRight: '40px' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Result (final only) */}
        {isFinal && (
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <span style={formSection.required}>*</span> النتيجة
            </label>
            <div style={styles.resultGrid}>
              {resultOptions.map((opt) => {
                const isSelected = formData.result === opt.value;
                const Icon = opt.icon;
                return (
                  <button key={opt.value} type="button" onClick={() => handleResultSelect(opt.value)}
                    style={{
                      ...styles.resultBtn,
                      background: isSelected ? opt.color + '15' : 'rgba(15, 23, 42, 0.4)',
                      borderColor: isSelected ? opt.color + '50' : colors.border.default,
                      color: isSelected ? opt.color : colors.text.muted,
                    }}>
                    <Icon size={16} color={isSelected ? opt.color : colors.text.disabled} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {errors.result && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.result}</div>}
          </div>
        )}

        {/* Appeal Deadline (final only) */}
        {isFinal && (
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>موعد الاستئناف (إن وجد)</label>
            <div style={formSection.inputWrapper}>
              <Calendar size={16} color={colors.text.muted} style={formSection.inputIcon} />
              <input type="date" name="appealDeadline" value={formData.appealDeadline} onChange={handleChange}
                style={{ ...formSection.input, paddingRight: '40px' }} />
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={formSection.fieldGroup}>
          <label style={formSection.label}>ملخص {isOrder ? 'الأمر' : 'الحكم'}</label>
          <textarea name="summary" value={formData.summary} onChange={handleChange} rows={3}
            style={formSection.textarea} placeholder="ملخص مختصر..." />
        </div>

        {/* Details & Obligations (final only) */}
        {isFinal && (
          <>
            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>التفاصيل الكاملة</label>
              <textarea name="details" value={formData.details} onChange={handleChange} rows={4}
                style={formSection.textarea} placeholder="تفاصيل الحكم الكاملة..." />
            </div>
            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>الالتزامات الناتجة</label>
              <textarea name="obligations" value={formData.obligations} onChange={handleChange} rows={2}
                style={formSection.textarea} placeholder="الالتزامات الناتجة..." />
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={formSection.buttons}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={formSection.cancelBtn}>إلغاء</button>
          <button type="submit" disabled={loading}
            style={{ ...formSection.submitBtn(colors.accent.blue.main), opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={formSection.spinner} />جاري الحفظ...
              </span>
            ) : judgment ? 'حفظ التعديلات' : 'إضافة ' + (isOrder ? 'الأمر' : 'الحكم')}
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
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: spacing.sm,
  },
  categoryBtn: {
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
  suggestionsToggle: {
    position: 'absolute',
    left: spacing.md,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: spacing.sm,
  },
  resultBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    border: '1px solid',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: transitions.default,
  },
};