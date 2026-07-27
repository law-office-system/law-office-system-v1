import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Calendar, Clock, MapPin, FileText, Landmark, AlertCircle, CheckCircle2,
  Gavel, Scale, ArrowRight, Sparkles, ChevronDown, RotateCcw, Send,
  UserCheck, FileCheck, Briefcase, Plus, Trash2, Upload, Building2,
  Hash, StickyNote, ChevronRight
} from 'lucide-react';

// ─── Decision Types & Auto-Stage Mapping ─────────────────────────
const DECISION_TYPES = [
  { value: 'pending',       label: 'لم يُصدر بعد', icon: Clock,       color: '#6b7280', stage: null, hasNextSession: false },
  { value: 'adjourned',     label: 'تأجيل',        icon: RotateCcw,   color: '#f59e0b', stage: 'adjourned',      hasNextSession: true },
  { value: 'adjourned_notice',label: 'تأجيل لإعلان',icon: Send,       color: '#f97316', stage: 'adjourned_notice', hasNextSession: true },
  { value: 'judgment',      label: 'حكم',          icon: Gavel,       color: '#10b981', stage: 'judged',         hasNextSession: false },
  { value: 'referred',      label: 'إحالة',        icon: ArrowRight,  color: '#3b82f6', stage: 'referred',       hasNextSession: true },
  { value: 'absence',       label: 'غياب',         icon: UserCheck,   color: '#ef4444', stage: 'absence',        hasNextSession: true },
  { value: 'expert',        label: 'خبير',         icon: Scale,       color: '#8b5cf6', stage: 'expert',         hasNextSession: true },
  { value: 'settlement',    label: 'تسوية',        icon: FileCheck,   color: '#14b8a6', stage: 'settled',        hasNextSession: false },
  { value: 'reserved',      label: 'حجز للحكم',    icon: Gavel,       color: '#6366f1', stage: 'reserved',       hasNextSession: true },
  { value: 'struck_off',    label: 'شطب',          icon: Trash2,      color: '#dc2626', stage: 'struck_off',     hasNextSession: false },
  { value: 'suspended',     label: 'وقف',          icon: Clock,       color: '#78716c', stage: 'suspended',      hasNextSession: false },
];

const STAGE_LABELS = {
  adjourned: 'مؤجلة', adjourned_notice: 'مؤجلة لإعلان', judged: 'حُكمت',
  referred: 'محالة', absence: 'غياب', expert: 'معينة خبير',
  settled: 'مسوّاة', reserved: 'محجوزة للحكم', struck_off: 'مشطوبة', suspended: 'موقوفة',
};

const SUGGESTED_TASKS = {
  adjourned: 'متابعة موعد الجلسة القادمة',
  adjourned_notice: 'إتمام إجراءات الإعلان',
  judgment: 'دراسة الحكم وإعداد الاستئناف إن لزم',
  referred: 'متابعة الإحالة والجلسة الجديدة',
  absence: 'طلب إعادة الإعلان أو التعقيب',
  expert: 'متابعة تقرير الخبير',
  settlement: 'إعداد صيغة التسوية التنفيذية',
  reserved: 'متابعة موعد صدور الحكم',
  struck_off: 'طلب رد الشطب',
  suspended: 'متابعة رفع الوقف',
};

// ─── Admin Task Types ────────────────────────────────────────────
const ADMIN_TASK_TYPES = [
  'إعلان', 'استخراج صورة رسمية', 'إعلان خبير', 'سداد رسوم',
  'تنفيذ إعلان', 'استلام تقرير خبير', 'مأمورية', 'تقديم مذكرة',
  'حضور', 'استشارة', 'أخرى',
];

// ─── Judgment Types ──────────────────────────────────────────────
const JUDGMENT_TYPES = [
  { value: 'accept', label: 'قبول', color: '#10b981' },
  { value: 'reject', label: 'رفض', color: '#ef4444' },
  { value: 'partial', label: 'جزئي', color: '#f59e0b' },
];

export default function SessionForm({ session = null, caseId, caseData = {}, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    session: true,
    result: true,
    judgment: false,
    adminTasks: false,
    attachments: false,
  });

  // ── Form State ──
  const [formData, setFormData] = useState({
    // Session Core (auto-filled from caseData)
    title: '',
    date: '',
    time: '',
    location: caseData.court || '',
    court: caseData.court || '',
    department: caseData.department || '',
    roll: '',
    description: '',
    notes: '',
    attachments: [],

    // Decision
    decisionType: 'pending',
    decisionDetails: '',

    // Next Session (auto for adjourned types)
    nextSessionDate: '',
    nextSessionTime: '',
    nextSessionLocation: caseData.court || '',
    autoCreateNextSession: true,

    // Judgment (conditional)
    judgmentType: '',
    judgmentSummary: '',
    judgmentAppealable: true,
    appealDeadline: '',

    // Admin Tasks (optional)
    hasAdminTasks: false,
    adminTasks: [],
  });

  // ─── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (session) {
      setFormData(prev => ({
        ...prev,
        title: session.title || '',
        date: session.date || session.nextSessionDate || '',
        time: session.time || '',
        location: session.location || caseData.court || '',
        court: session.court || caseData.court || '',
        department: session.department || caseData.department || '',
        roll: session.roll || '',
        description: session.description || '',
        notes: session.notes || '',
        attachments: session.attachments || [],
        decisionType: session.decisionType || 'pending',
        decisionDetails: session.decisionDetails || session.decision || '',
        judgmentType: session.judgmentType || '',
        judgmentSummary: session.judgmentSummary || '',
        judgmentAppealable: session.judgmentAppealable !== false,
        appealDeadline: session.appealDeadline || '',
      }));
      if (session.decisionType === 'judgment') {
        setExpandedSections(prev => ({ ...prev, judgment: true }));
      }
    } else {
      // Auto-generate title for new sessions
      const sessionCount = (caseData.sessions || []).length + 1;
      setFormData(prev => ({
        ...prev,
        title: `الجلسة ${sessionCount}`,
        location: caseData.court || '',
        court: caseData.court || '',
        department: caseData.department || '',
        nextSessionLocation: caseData.court || '',
      }));
    }
  }, [session, caseData]);

  // ─── Auto-compute when decision changes ──────────────────────────
  useEffect(() => {
    const type = formData.decisionType;
    const decisionMeta = DECISION_TYPES.find(d => d.value === type);

    if (decisionMeta) {
      const updates = {
        suggestedStage: decisionMeta.stage || '',
        suggestedTask: decisionMeta.stage ? SUGGESTED_TASKS[decisionMeta.stage] || '' : '',
      };

      // Auto-show/hide judgment section
      if (type === 'judgment') {
        setExpandedSections(prev => ({ ...prev, judgment: true }));
      } else {
        setExpandedSections(prev => ({ ...prev, judgment: false }));
        updates.judgmentType = '';
        updates.judgmentSummary = '';
      }

      // Auto-suggest next session date for adjourned types
      if (decisionMeta.hasNextSession && !formData.nextSessionDate) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        updates.nextSessionDate = nextDate.toISOString().split('T')[0];
      }

      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [formData.decisionType]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value, type: inputType, checked } = e.target;
    const val = inputType === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  }, [errors]);

  const handleDecisionTypeSelect = useCallback((value) => {
    setFormData(prev => ({ ...prev, decisionType: value }));
    if (errors.decisionType) setErrors(prev => ({ ...prev, decisionType: null }));
  }, [errors]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Admin Tasks
  const addAdminTask = () => {
    setFormData(prev => ({
      ...prev,
      adminTasks: [...prev.adminTasks, { id: crypto.randomUUID(), type: '', description: '', assignee: '', dueDate: '' }],
    }));
  };

  const updateAdminTask = (taskId, field, value) => {
    setFormData(prev => ({
      ...prev,
      adminTasks: prev.adminTasks.map(t => t.id === taskId ? { ...t, [field]: value } : t),
    }));
  };

  const removeAdminTask = (taskId) => {
    setFormData(prev => ({
      ...prev,
      adminTasks: prev.adminTasks.filter(t => t.id !== taskId),
    }));
  };

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'تاريخ الجلسة مطلوب';
    if (formData.decisionType === 'judgment') {
      if (!formData.judgmentType) newErrors.judgmentType = 'نوع الحكم مطلوب';
      if (!formData.judgmentSummary.trim()) newErrors.judgmentSummary = 'منطوق الحكم مطلوب';
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
      const decisionMeta = DECISION_TYPES.find(d => d.value === formData.decisionType);

      const data = {
        // Core session
        title: formData.title || `الجلسة ${(caseData.sessions || []).length + 1}`,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        court: formData.court,
        department: formData.department,
        roll: formData.roll,
        description: formData.description,
        notes: formData.notes,
        attachments: formData.attachments,
        nextSessionDate: formData.date,

        // Decision
        decisionType: formData.decisionType,
        decisionDetails: formData.decisionDetails,
        decisionLabel: decisionMeta?.label || '',

        // Next Session (if applicable)
        ...(decisionMeta?.hasNextSession && formData.autoCreateNextSession ? {
          nextSessionAuto: true,
          nextSessionDate: formData.nextSessionDate,
          nextSessionTime: formData.nextSessionTime,
          nextSessionLocation: formData.nextSessionLocation,
        } : {}),

        // Judgment (if applicable)
        ...(formData.decisionType === 'judgment' ? {
          judgmentType: formData.judgmentType,
          judgmentSummary: formData.judgmentSummary,
          judgmentAppealable: formData.judgmentAppealable,
          appealDeadline: formData.appealDeadline,
        } : {}),

        // Admin Tasks (if any)
        ...(formData.hasAdminTasks && formData.adminTasks.length > 0 ? {
          adminTasks: formData.adminTasks,
        } : {}),

        // Workflow
        suggestedStage: formData.suggestedStage || '',
        suggestedTask: formData.suggestedTask || '',
        stageLabel: STAGE_LABELS[formData.suggestedStage] || '',

        // Metadata
        caseId,
        tenantId: caseData.tenantId || '',
        updatedAt: new Date().toISOString(),
      };

      await onSave(data);
      onClose();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, validate, onSave, onClose, caseId, caseData]);

  // ─── Modal effects ───────────────────────────────────────────────
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

  const selectedDecision = DECISION_TYPES.find(d => d.value === formData.decisionType);
  const showJudgment = formData.decisionType === 'judgment';
  const showNextSession = selectedDecision?.hasNextSession;

  // ═════════════════════════════════════════════════════════════════
  return (
    <div style={styles.overlay} onClick={handleOverlayClick} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.modal}>
        {/* ═══ HEADER ═══ */}
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
                {session ? 'تحديث بيانات الجلسة والنتيجة' : 'سجّل الجلسة والنتيجة والأعمال في نموذج واحد'}
              </p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={styles.closeBtn} type="button">
            <X size={20} color="#9ca3af" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form} onClick={(e) => e.stopPropagation()}>

          {/* ═══════════════════════════════════════
              CARD 1: بيانات الجلسة
          ═══════════════════════════════════════ */}
          <Card
            title="بيانات الجلسة"
            icon={Calendar}
            iconColor="#60a5fa"
            expanded={expandedSections.session}
            onToggle={() => toggleSection('session')}
          >
            {/* Auto Title (read-only) */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Hash size={14} color="#6b7280" />
                عنوان الجلسة (تلقائي)
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={{ ...styles.input, background: 'rgba(15, 23, 42, 0.4)', color: '#9ca3af' }}
                placeholder="يُولد تلقائياً"
              />
            </div>

            {/* Date & Time */}
            <div style={styles.twoCols}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.required}>*</span> التاريخ
                </label>
                <div style={styles.inputWrapper}>
                  <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    style={{ ...styles.input, paddingRight: '40px', borderColor: errors.date ? '#ef4444' : 'rgba(55, 65, 81, 0.5)' }}
                  />
                </div>
                {errors.date && <div style={styles.error}><AlertCircle size={14} color="#ef4444" />{errors.date}</div>}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>الوقت</label>
                <div style={styles.inputWrapper}>
                  <Clock size={16} color="#6b7280" style={styles.inputIcon} />
                  <input type="time" name="time" value={formData.time} onChange={handleChange}
                    style={{ ...styles.input, paddingRight: '40px' }} />
                </div>
              </div>
            </div>

            {/* Court & Department (auto-filled) */}
            <div style={styles.twoCols}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <Building2 size={14} color="#6b7280" />
                  المحكمة
                </label>
                <input
                  type="text"
                  name="court"
                  value={formData.court}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>الدائرة</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Location & Roll */}
            <div style={styles.twoCols}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <MapPin size={14} color="#6b7280" />
                  مكان الانعقاد
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="يُملأ تلقائياً من بيانات القضية"
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <Hash size={14} color="#6b7280" />
                  رقم الرول
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    name="roll"
                    value={formData.roll}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="مثال: 12"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <StickyNote size={14} color="#6b7280" />
                ملاحظات
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                style={styles.textarea}
                placeholder="ملاحظات عن الجلسة..."
              />
            </div>
          </Card>

          {/* ═══════════════════════════════════════
              CARD 2: نتيجة الجلسة
          ═══════════════════════════════════════ */}
          <Card
            title="نتيجة الجلسة"
            icon={Scale}
            iconColor="#f59e0b"
            expanded={expandedSections.result}
            onToggle={() => toggleSection('result')}
          >
            {/* Decision Type Grid */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>نوع القرار</label>
              <div style={styles.decisionGrid}>
                {DECISION_TYPES.map((dt) => {
                  const Icon = dt.icon;
                  const isSelected = formData.decisionType === dt.value;
                  return (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => handleDecisionTypeSelect(dt.value)}
                      style={{
                        ...styles.decisionBtn,
                        borderColor: isSelected ? dt.color : 'rgba(55, 65, 81, 0.4)',
                        background: isSelected ? `${dt.color}15` : 'rgba(15, 23, 42, 0.4)',
                        color: isSelected ? dt.color : '#9ca3af',
                      }}
                    >
                      <Icon size={14} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{dt.label}</span>
                      {isSelected && <CheckCircle2 size={12} color={dt.color} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decision Details */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>تفاصيل القرار</label>
              <textarea
                name="decisionDetails"
                value={formData.decisionDetails}
                onChange={handleChange}
                rows={2}
                style={styles.textarea}
                placeholder="مثال: تأجيل لجلسة 15/10 لإعلان الخصم..."
              />
            </div>

            {/* Next Session (conditional) */}
            {showNextSession && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    name="autoCreateNextSession"
                    checked={formData.autoCreateNextSession}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                  />
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', cursor: 'pointer' }}>
                    إنشاء الجلسة القادمة تلقائياً
                  </label>
                </div>

                {formData.autoCreateNextSession && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={styles.twoCols}>
                      <div style={styles.fieldGroup}>
                        <label style={{ ...styles.label, fontSize: '13px' }}>تاريخ الجلسة القادمة</label>
                        <input
                          type="date"
                          name="nextSessionDate"
                          value={formData.nextSessionDate}
                          onChange={handleChange}
                          style={{ ...styles.input, fontSize: '13px' }}
                        />
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={{ ...styles.label, fontSize: '13px' }}>الوقت</label>
                        <input
                          type="time"
                          name="nextSessionTime"
                          value={formData.nextSessionTime}
                          onChange={handleChange}
                          style={{ ...styles.input, fontSize: '13px' }}
                        />
                      </div>
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={{ ...styles.label, fontSize: '13px' }}>المكان</label>
                      <input
                        type="text"
                        name="nextSessionLocation"
                        value={formData.nextSessionLocation}
                        onChange={handleChange}
                        style={{ ...styles.input, fontSize: '13px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ═══════════════════════════════════════
              CARD 3: الحكم (conditional)
          ═══════════════════════════════════════ */}
          {showJudgment && (
            <Card
              title="بيانات الحكم"
              icon={Gavel}
              iconColor="#10b981"
              expanded={expandedSections.judgment}
              onToggle={() => toggleSection('judgment')}
              accentColor="#10b981"
            >
              {/* Judgment Type */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.required}>*</span> نوع الحكم
                </label>
                <div style={styles.twoCols}>
                  {JUDGMENT_TYPES.map((jt) => {
                    const isSelected = formData.judgmentType === jt.value;
                    return (
                      <button
                        key={jt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, judgmentType: jt.value }))}
                        style={{
                          ...styles.judgmentTypeBtn,
                          borderColor: isSelected ? jt.color : 'rgba(55, 65, 81, 0.4)',
                          background: isSelected ? `${jt.color}18` : 'rgba(15, 23, 42, 0.4)',
                          color: isSelected ? jt.color : '#9ca3af',
                        }}
                      >
                        {jt.label}
                        {isSelected && <CheckCircle2 size={14} color={jt.color} />}
                      </button>
                    );
                  })}
                </div>
                {errors.judgmentType && <div style={styles.error}><AlertCircle size={14} color="#ef4444" />{errors.judgmentType}</div>}
              </div>

              {/* Judgment Summary */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  <span style={styles.required}>*</span> منطوق الحكم
                </label>
                <textarea
                  name="judgmentSummary"
                  value={formData.judgmentSummary}
                  onChange={handleChange}
                  rows={4}
                  style={{
                    ...styles.textarea,
                    borderColor: errors.judgmentSummary ? '#ef4444' : 'rgba(55, 65, 81, 0.5)',
                  }}
                  placeholder="اكتب منطوق الحكم كاملاً..."
                />
                {errors.judgmentSummary && <div style={styles.error}><AlertCircle size={14} color="#ef4444" />{errors.judgmentSummary}</div>}
              </div>

              {/* Appealable & Deadline */}
              <div style={styles.twoCols}>
                <div style={styles.fieldGroup}>
                  <label style={{ ...styles.label, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      name="judgmentAppealable"
                      checked={formData.judgmentAppealable}
                      onChange={handleChange}
                      style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    قابل للاستئناف
                  </label>
                </div>

                {formData.judgmentAppealable && (
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>آخر موعد للاستئناف</label>
                    <div style={styles.inputWrapper}>
                      <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                      <input
                        type="date"
                        name="appealDeadline"
                        value={formData.appealDeadline}
                        onChange={handleChange}
                        style={{ ...styles.input, paddingRight: '40px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════
              CARD 4: الأعمال الإدارية (optional)
          ═══════════════════════════════════════ */}
          <Card
            title="الأعمال الإدارية"
            icon={Briefcase}
            iconColor="#d97706"
            expanded={expandedSections.adminTasks}
            onToggle={() => toggleSection('adminTasks')}
            badge={formData.adminTasks.length > 0 ? `${formData.adminTasks.length} عمل` : null}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <input
                type="checkbox"
                name="hasAdminTasks"
                checked={formData.hasAdminTasks}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: '#d97706' }}
              />
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#d1d5db', cursor: 'pointer' }}>
                هل يوجد عمل إداري بعد هذه الجلسة؟
              </label>
            </div>

            {formData.hasAdminTasks && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.adminTasks.map((task, idx) => (
                  <div key={task.id} style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(55, 65, 81, 0.4)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#d97706' }}>
                        العمل {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAdminTask(task.id)}
                        style={{
                          background: 'none', border: 'none', color: '#ef4444',
                          cursor: 'pointer', padding: '4px', borderRadius: '6px',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={styles.twoCols}>
                      <div style={styles.fieldGroup}>
                        <label style={{ ...styles.label, fontSize: '12px' }}>النوع</label>
                        <select
                          value={task.type}
                          onChange={(e) => updateAdminTask(task.id, 'type', e.target.value)}
                          style={{ ...styles.input, fontSize: '13px' }}
                        >
                          <option value="">اختر...</option>
                          {ADMIN_TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={{ ...styles.label, fontSize: '12px' }}>ميعاد التنفيذ</label>
                        <input
                          type="date"
                          value={task.dueDate}
                          onChange={(e) => updateAdminTask(task.id, 'dueDate', e.target.value)}
                          style={{ ...styles.input, fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={{ ...styles.label, fontSize: '12px' }}>الوصف</label>
                      <input
                        type="text"
                        value={task.description}
                        onChange={(e) => updateAdminTask(task.id, 'description', e.target.value)}
                        style={{ ...styles.input, fontSize: '13px' }}
                        placeholder="وصف العمل..."
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={{ ...styles.label, fontSize: '12px' }}>الموظف المسؤول</label>
                      <input
                        type="text"
                        value={task.assignee}
                        onChange={(e) => updateAdminTask(task.id, 'assignee', e.target.value)}
                        style={{ ...styles.input, fontSize: '13px' }}
                        placeholder="اسم الموظف..."
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAdminTask}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px', background: 'rgba(217, 119, 6, 0.1)',
                    border: '1px dashed rgba(217, 119, 6, 0.3)', borderRadius: '12px',
                    color: '#d97706', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                >
                  <Plus size={16} />
                  إضافة عمل إداري
                </button>
              </div>
            )}
          </Card>

          {/* ═══════════════════════════════════════
              CARD 5: المرفقات
          ═══════════════════════════════════════ */}
          <Card
            title="المرفقات"
            icon={Upload}
            iconColor="#8b5cf6"
            expanded={expandedSections.attachments}
            onToggle={() => toggleSection('attachments')}
          >
            <div style={{
              border: '2px dashed rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}>
              <Upload size={32} color="#8b5cf6" style={{ marginBottom: '8px' }} />
              <div>اسحب الملفات هنا أو اضغط للاختيار</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#6b7280' }}>
                محضر الجلسة، الحكم، مستندات أخرى
              </div>
            </div>
          </Card>

          {/* ═══ WORKFLOW PREVIEW ═══ */}
          {formData.suggestedStage && (
            <div style={{
              background: 'rgba(30, 64, 175, 0.08)',
              border: '1px solid rgba(30, 64, 175, 0.2)',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#60a5fa" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                  ما سيحدث عند الحفظ
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <WorkflowItem icon={CheckCircle2} color="#10b981" text="إنشاء/تحديث الجلسة" />
                <WorkflowItem icon={Scale} color="#f59e0b" text={`تحديث مرحلة القضية إلى: ${STAGE_LABELS[formData.suggestedStage]}`} />
                {formData.suggestedTask && (
                  <WorkflowItem icon={Briefcase} color="#d97706" text={`إنشاء مهمة: ${formData.suggestedTask}`} />
                )}
                {showNextSession && formData.autoCreateNextSession && formData.nextSessionDate && (
                  <WorkflowItem icon={Calendar} color="#60a5fa" text={`إنشاء جلسة قادمة: ${new Date(formData.nextSessionDate).toLocaleDateString('ar-EG')}`} />
                )}
                {formData.hasAdminTasks && formData.adminTasks.length > 0 && (
                  <WorkflowItem icon={Briefcase} color="#8b5cf6" text={`إنشاء ${formData.adminTasks.length} عمل إداري`} />
                )}
                {showJudgment && (
                  <WorkflowItem icon={Gavel} color="#10b981" text="إنشاء سجل الحكم" />
                )}
              </div>
            </div>
          )}

          {/* ═══ BUTTONS ═══ */}
          <div style={styles.buttons}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} style={styles.cancelBtn}>
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={styles.spinner} />جاري الحفظ...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} />
                  حفظ الجلسة والنتيجة
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Card({ title, icon: Icon, iconColor, children, expanded, onToggle, badge = null, accentColor = null }) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.4)',
      border: `1px solid ${accentColor ? `${accentColor}30` : 'rgba(55, 65, 81, 0.3)'}`,
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'inherit',
          textAlign: 'right',
          direction: 'rtl',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: `${iconColor}15`,
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color={iconColor} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#e5e7eb' }}>{title}</span>
          {badge && (
            <span style={{
              background: `${iconColor}15`, color: iconColor,
              padding: '2px 10px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 700,
            }}>{badge}</span>
          )}
        </div>
        <ChevronRight
          size={18}
          color="#6b7280"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function WorkflowItem({ icon: Icon, color, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af' }}>
      <Icon size={14} color={color} />
      <span>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)', zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  },
  modal: {
    background: '#1e293b', border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '24px', width: '100%', maxWidth: '640px',
    maxHeight: '92vh', overflow: 'auto',
    boxShadow: '0 32px 64px rgba(0, 0, 0, 0.5)', position: 'relative',
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
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#f3f4f6', margin: 0 },
  headerSubtitle: { fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
    borderRadius: '10px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  form: {
    padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: 600, color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '4px' },
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
  decisionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
  },
  decisionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '5px', padding: '10px 6px', borderRadius: '12px', border: '1px solid',
    background: 'none', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s ease', minHeight: '64px',
  },
  judgmentTypeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px', borderRadius: '12px', border: '1px solid',
    background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    fontFamily: 'inherit', transition: 'all 0.2s ease',
  },
  error: { display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '13px', marginTop: '4px' },
  buttons: {
    display: 'flex', gap: '12px', marginTop: '8px',
    paddingTop: '16px', borderTop: '1px solid rgba(55, 65, 81, 0.3)',
  },
  cancelBtn: {
    flex: 1, padding: '12px 24px', background: 'transparent',
    border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '14px',
    color: '#9ca3af', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s ease', fontFamily: 'inherit',
  },
  submitBtn: {
    flex: 1, padding: '12px 24px', background: '#1e40af', border: 'none',
    borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(30, 64, 175, 0.3)',
  },
  spinner: {
    width: '18px', height: '18px', border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
};
