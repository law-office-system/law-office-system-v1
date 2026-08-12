import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, FileText, Landmark, AlertCircle, CheckCircle2,
  Gavel, Scale, ArrowRight, Sparkles, ChevronDown, RotateCcw, Send,
  UserCheck, FileCheck, Briefcase, Plus, Trash2, Upload, Building2,
  Hash, StickyNote, ChevronRight, Layers
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Modal } from '../ui';
import { formSection, colors, spacing, radius, shadows, transitions } from '../../styles/design-system';
import { db } from '../../firebaseDb';

// ✅ خريطة ترجمة درجات التقاضي
const LEVEL_TYPE_MAP = {
  first_instance: "أول درجة",
  partial: "جزئية",
  appeal: "استئناف",
  cassation: "نقض",
  execution: "تنفيذ",
  new: "جديدة",
  first: "أولى",
  second: "ثانية",
  third: "ثالثة",
  supreme: "عليا",
  administrative_court: "مجلس الدولة",
  disciplinary: "تأديبي",
  constitutional_court: "الدستورية العليا",
  military_appeal: "استئناف عسكري",
  military_cassation: "نقض عسكري",
  urgent: "عاجلة",
  summary: "موجزة",
  plenary: "الأحكام الكلية",
};

const translateLevelType = (type) => {
  if (!type) return "غير محدد";
  return LEVEL_TYPE_MAP[String(type).toLowerCase().trim()] || type;
};

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
    decisionType: 'pending',
    decisionDetails: '',
    nextSessionDate: '',
    nextSessionTime: '',
    nextSessionLocation: caseData.court || '',
    autoCreateNextSession: true,
    judgmentType: '',
    judgmentSummary: '',
    judgmentAppealable: true,
    appealDeadline: '',
    hasAdminTasks: false,
    adminTasks: [],
    litigationLevelId: '',  // ✅ درجة التقاضي
  });

  // ✅ جلب درجات التقاضي للقضية
  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      if (!caseId) return;
      try {
        const q = query(
          collection(db, "litigation_levels"),
          where("caseId", "==", caseId)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLevels(data);
      } catch (err) {
        console.error("Error fetching levels:", err);
      } finally {
        setLevelsLoading(false);
      }
    };
    fetchLevels();
  }, [caseId]);

  // ─── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (session) {
      setFormData(prev => ({
        ...prev,
        title: session.title || '',
        date: session.date || session.nextSessionDate || '',
        time: session.time || '',
        location: session.location || '',
        court: session.court || '',
        department: session.department || '',
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
        litigationLevelId: session.litigationLevelId || '',  // ✅
      }));
      if (session.decisionType === 'judgment') {
        setExpandedSections(prev => ({ ...prev, judgment: true }));
      }
    } else {
      const sessionCount = (caseData.sessions || []).length + 1;
      setFormData(prev => ({
        ...prev,
        title: `الجلسة ${sessionCount}`,
        location: '',
        court: '',
        department: '',
        nextSessionLocation: '',
      }));
    }
  }, [session, caseData]);

  // ─── Auto-fill court/department/location from selected level ───
  useEffect(() => {
    if (!formData.litigationLevelId || levels.length === 0) return;
    const selectedLevel = levels.find(l => l.id === formData.litigationLevelId);
    if (selectedLevel) {
      setFormData(prev => ({
        ...prev,
        court: selectedLevel.court || prev.court || '',
        department: selectedLevel.department || selectedLevel.circuit || prev.department || '',
        location: selectedLevel.court || prev.location || '',
      }));
    }
  }, [formData.litigationLevelId, levels]);

  // ─── Auto-compute when decision changes ──────────────────────────
  useEffect(() => {
    const type = formData.decisionType;
    const decisionMeta = DECISION_TYPES.find(d => d.value === type);

    if (decisionMeta) {
      const updates = {
        suggestedStage: decisionMeta.stage || '',
        suggestedTask: decisionMeta.stage ? SUGGESTED_TASKS[decisionMeta.stage] || '' : '',
      };

      if (type === 'judgment') {
        setExpandedSections(prev => ({ ...prev, judgment: true }));
      } else {
        setExpandedSections(prev => ({ ...prev, judgment: false }));
        updates.judgmentType = '';
        updates.judgmentSummary = '';
      }

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
    if (!formData.litigationLevelId) newErrors.litigationLevelId = 'درجة التقاضي مطلوبة';
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
        decisionType: formData.decisionType,
        decisionDetails: formData.decisionDetails,
        decisionLabel: decisionMeta?.label || '',
        ...(decisionMeta?.hasNextSession && formData.autoCreateNextSession && formData.nextSessionDate ? {
          nextSessionAuto: true,
          nextSessionDate: formData.nextSessionDate,
          nextSessionTime: formData.nextSessionTime,
          nextSessionLocation: formData.nextSessionLocation,
        } : {}),
        ...(formData.decisionType === 'judgment' ? {
          judgmentType: formData.judgmentType,
          judgmentSummary: formData.judgmentSummary,
          judgmentAppealable: formData.judgmentAppealable,
          appealDeadline: formData.appealDeadline,
        } : {}),
        ...(formData.hasAdminTasks && formData.adminTasks.length > 0 ? {
          adminTasks: formData.adminTasks,
        } : {}),
        suggestedStage: formData.suggestedStage || '',
        suggestedTask: formData.suggestedTask || '',
        stageLabel: STAGE_LABELS[formData.suggestedStage] || '',
        litigationLevelId: formData.litigationLevelId,
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

  const selectedDecision = DECISION_TYPES.find(d => d.value === formData.decisionType);
  const showJudgment = formData.decisionType === 'judgment';
  const showNextSession = selectedDecision?.hasNextSession;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={session ? 'تعديل الجلسة' : 'إضافة جلسة جديدة'}
      subtitle={session ? 'تحديث بيانات الجلسة والنتيجة' : 'سجّل الجلسة والنتيجة والأعمال في نموذج واحد'}
      icon={Calendar}
      iconColor={colors.accent.amber.light}
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>

        {/* ═══════════════════════════════════════
            CARD 1: بيانات الجلسة
        ═══════════════════════════════════════ */}
        <FormCard
          title="بيانات الجلسة"
          icon={Calendar}
          iconColor={colors.accent.blue.light}
          expanded={expandedSections.session}
          onToggle={() => toggleSection('session')}
        >
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <Hash size={14} color={colors.text.muted} />
              عنوان الجلسة (تلقائي)
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={{ ...formSection.input, background: 'rgba(15, 23, 42, 0.4)', color: colors.text.muted }}
              placeholder="يُولد تلقائياً"
            />
          </div>

          {/* ✅ درجة التقاضي */}
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <Layers size={14} color={colors.text.muted} />
              <span style={{ color: colors.accent.red.main }}>*</span> درجة التقاضي
            </label>
            <select
              name="litigationLevelId"
              value={formData.litigationLevelId}
              onChange={handleChange}
              style={{
                ...formSection.input,
                borderColor: errors.litigationLevelId ? colors.accent.red.main : colors.border.default,
                cursor: levelsLoading ? 'not-allowed' : 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
              disabled={levelsLoading}
            >
              <option value="">
                {levelsLoading ? 'جاري تحميل الدرجات...' : 'اختر درجة التقاضي'}
              </option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {translateLevelType(level.levelType)}
                  {level.court ? ` — ${level.court}` : ''}
                  {level.caseNumber ? ` (رقم ${level.caseNumber})` : ''}
                </option>
              ))}
            </select>
            {errors.litigationLevelId && (
              <div style={formSection.error}>
                <AlertCircle size={14} color={colors.accent.red.main} />
                {errors.litigationLevelId}
              </div>
            )}
            {levels.length === 0 && !levelsLoading && (
              <p style={{ color: colors.accent.amber.light, fontSize: '13px', marginTop: 4 }}>
                ⚠️ لا توجد درجات تقاضي مسجلة. يمكنك إضافة درجات من صفحة تفاصيل القضية.
              </p>
            )}
          </div>

          <div style={formSection.twoCols}>
            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>
                <span style={formSection.required}>*</span> التاريخ
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                style={{ ...formSection.input, borderColor: errors.date ? colors.accent.red.main : colors.border.default }}
              />
              {errors.date && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.date}</div>}
            </div>

            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>الوقت</label>
              <input type="time" name="time" value={formData.time} onChange={handleChange}
                style={formSection.input} />
            </div>
          </div>

          <div style={formSection.twoCols}>
            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>
                <Building2 size={14} color={colors.text.muted} />
                المحكمة
              </label>
              <input type="text" name="court" value={formData.court} onChange={handleChange}
                style={formSection.input} />
            </div>

            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>الدائرة</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange}
                style={formSection.input} />
            </div>
          </div>

          <div style={formSection.twoCols}>
            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>
                <MapPin size={14} color={colors.text.muted} />
                مكان الانعقاد
              </label>
              <input type="text" name="location" value={formData.location} onChange={handleChange}
                style={formSection.input} placeholder="يُملأ تلقائياً من بيانات القضية" />
            </div>

            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>
                <Hash size={14} color={colors.text.muted} />
                رقم الرول
              </label>
              <input type="text" name="roll" value={formData.roll} onChange={handleChange}
                style={formSection.input} placeholder="مثال: 12" />
            </div>
          </div>

          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>
              <StickyNote size={14} color={colors.text.muted} />
              ملاحظات
            </label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
              style={formSection.textarea} placeholder="ملاحظات عن الجلسة..." />
          </div>
        </FormCard>

        {/* ═══════════════════════════════════════
            CARD 2: نتيجة الجلسة
        ═══════════════════════════════════════ */}
        <FormCard
          title="نتيجة الجلسة"
          icon={Scale}
          iconColor={colors.accent.amber.light}
          expanded={expandedSections.result}
          onToggle={() => toggleSection('result')}
        >
          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>نوع القرار</label>
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
                      borderColor: isSelected ? dt.color : colors.border.default,
                      background: isSelected ? `${dt.color}15` : 'rgba(15, 23, 42, 0.4)',
                      color: isSelected ? dt.color : colors.text.muted,
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

          <div style={formSection.fieldGroup}>
            <label style={formSection.label}>تفاصيل القرار</label>
            <textarea name="decisionDetails" value={formData.decisionDetails} onChange={handleChange}
              rows={2} style={formSection.textarea} placeholder="مثال: تأجيل لجلسة 15/10 لإعلان الخصم..." />
          </div>

          {showNextSession && (
            <div style={{
              background: `${colors.accent.amber.main}08`,
              border: `1px solid ${colors.accent.amber.main}18`,
              borderRadius: radius.md,
              padding: spacing.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <input
                  type="checkbox"
                  name="autoCreateNextSession"
                  checked={formData.autoCreateNextSession}
                  onChange={handleChange}
                  style={{ width: 18, height: 18, accentColor: colors.accent.amber.main }}
                />
                <label style={{ fontSize: '14px', fontWeight: 600, color: colors.accent.amber.light, cursor: 'pointer' }}>
                  إنشاء الجلسة القادمة تلقائياً
                </label>
              </div>

              {formData.autoCreateNextSession && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  <div style={formSection.twoCols}>
                    <div style={formSection.fieldGroup}>
                      <label style={{ ...formSection.label, fontSize: '13px' }}>تاريخ الجلسة القادمة</label>
                      <input type="date" name="nextSessionDate" value={formData.nextSessionDate}
                        onChange={handleChange} style={{ ...formSection.input, fontSize: '13px' }} />
                    </div>
                    <div style={formSection.fieldGroup}>
                      <label style={{ ...formSection.label, fontSize: '13px' }}>الوقت</label>
                      <input type="time" name="nextSessionTime" value={formData.nextSessionTime}
                        onChange={handleChange} style={{ ...formSection.input, fontSize: '13px' }} />
                    </div>
                  </div>
                  <div style={formSection.fieldGroup}>
                    <label style={{ ...formSection.label, fontSize: '13px' }}>المكان</label>
                    <input type="text" name="nextSessionLocation" value={formData.nextSessionLocation}
                      onChange={handleChange} style={{ ...formSection.input, fontSize: '13px' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </FormCard>

        {/* ═══════════════════════════════════════
            CARD 3: الحكم (conditional)
        ═══════════════════════════════════════ */}
        {showJudgment && (
          <FormCard
            title="بيانات الحكم"
            icon={Gavel}
            iconColor={colors.accent.green.light}
            expanded={expandedSections.judgment}
            onToggle={() => toggleSection('judgment')}
            accentColor={colors.accent.green.main}
          >
            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>
                <span style={formSection.required}>*</span> نوع الحكم
              </label>
              <div style={formSection.twoCols}>
                {JUDGMENT_TYPES.map((jt) => {
                  const isSelected = formData.judgmentType === jt.value;
                  return (
                    <button
                      key={jt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, judgmentType: jt.value }))}
                      style={{
                        ...styles.judgmentTypeBtn,
                        borderColor: isSelected ? jt.color : colors.border.default,
                        background: isSelected ? `${jt.color}18` : 'rgba(15, 23, 42, 0.4)',
                        color: isSelected ? jt.color : colors.text.muted,
                      }}
                    >
                      {jt.label}
                      {isSelected && <CheckCircle2 size={14} color={jt.color} />}
                    </button>
                  );
                })}
              </div>
              {errors.judgmentType && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.judgmentType}</div>}
            </div>

            <div style={formSection.fieldGroup}>
              <label style={formSection.label}>
                <span style={formSection.required}>*</span> منطوق الحكم
              </label>
              <textarea name="judgmentSummary" value={formData.judgmentSummary} onChange={handleChange}
                rows={4} style={{ ...formSection.textarea, borderColor: errors.judgmentSummary ? colors.accent.red.main : colors.border.default }}
                placeholder="اكتب منطوق الحكم كاملاً..." />
              {errors.judgmentSummary && <div style={formSection.error}><AlertCircle size={14} color={colors.accent.red.main} />{errors.judgmentSummary}</div>}
            </div>

            <div style={formSection.twoCols}>
              <div style={formSection.fieldGroup}>
                <label style={{ ...formSection.label, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <input type="checkbox" name="judgmentAppealable" checked={formData.judgmentAppealable}
                    onChange={handleChange} style={{ width: 18, height: 18, accentColor: colors.accent.green.main }} />
                  قابل للاستئناف
                </label>
              </div>

              {formData.judgmentAppealable && (
                <div style={formSection.fieldGroup}>
                  <label style={formSection.label}>آخر موعد للاستئناف</label>
                  <input type="date" name="appealDeadline" value={formData.appealDeadline}
                    onChange={handleChange} style={formSection.input} />
                </div>
              )}
            </div>
          </FormCard>
        )}

        {/* ═══════════════════════════════════════
            CARD 4: الأعمال الإدارية (optional)
        ═══════════════════════════════════════ */}
        <FormCard
          title="الأعمال الإدارية"
          icon={Briefcase}
          iconColor={colors.accent.amber.light}
          expanded={expandedSections.adminTasks}
          onToggle={() => toggleSection('adminTasks')}
          badge={formData.adminTasks.length > 0 ? `${formData.adminTasks.length} عمل` : null}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <input type="checkbox" name="hasAdminTasks" checked={formData.hasAdminTasks}
              onChange={handleChange} style={{ width: 18, height: 18, accentColor: colors.accent.amber.main }} />
            <label style={{ fontSize: '14px', fontWeight: 600, color: colors.text.secondary, cursor: 'pointer' }}>
              هل يوجد عمل إداري بعد هذه الجلسة؟
            </label>
          </div>

          {formData.hasAdminTasks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {formData.adminTasks.map((task, idx) => (
                <div key={task.id} style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.sm,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.accent.amber.light }}>
                      العمل {idx + 1}
                    </span>
                    <button type="button" onClick={() => removeAdminTask(task.id)}
                      style={{ background: 'none', border: 'none', color: colors.accent.red.main,
                        cursor: 'pointer', padding: '4px', borderRadius: radius.sm }}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={formSection.twoCols}>
                    <div style={formSection.fieldGroup}>
                      <label style={{ ...formSection.label, fontSize: '12px' }}>النوع</label>
                      <select value={task.type} onChange={(e) => updateAdminTask(task.id, 'type', e.target.value)}
                        style={{ ...formSection.input, fontSize: '13px' }}>
                        <option value="">اختر...</option>
                        {ADMIN_TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={formSection.fieldGroup}>
                      <label style={{ ...formSection.label, fontSize: '12px' }}>ميعاد التنفيذ</label>
                      <input type="date" value={task.dueDate}
                        onChange={(e) => updateAdminTask(task.id, 'dueDate', e.target.value)}
                        style={{ ...formSection.input, fontSize: '13px' }} />
                    </div>
                  </div>

                  <div style={formSection.fieldGroup}>
                    <label style={{ ...formSection.label, fontSize: '12px' }}>الوصف</label>
                    <input type="text" value={task.description}
                      onChange={(e) => updateAdminTask(task.id, 'description', e.target.value)}
                      style={{ ...formSection.input, fontSize: '13px' }} placeholder="وصف العمل..." />
                  </div>

                  <div style={formSection.fieldGroup}>
                    <label style={{ ...formSection.label, fontSize: '12px' }}>الموظف المسؤول</label>
                    <input type="text" value={task.assignee}
                      onChange={(e) => updateAdminTask(task.id, 'assignee', e.target.value)}
                      style={{ ...formSection.input, fontSize: '13px' }} placeholder="اسم الموظف..." />
                  </div>
                </div>
              ))}

              <button type="button" onClick={addAdminTask}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
                  padding: spacing.md, background: `${colors.accent.amber.main}10`,
                  border: `1px dashed ${colors.accent.amber.main}30`, borderRadius: radius.md,
                  color: colors.accent.amber.light, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', transition: transitions.default,
                }}>
                <Plus size={16} />
                إضافة عمل إداري
              </button>
            </div>
          )}
        </FormCard>

        {/* ═══════════════════════════════════════
            CARD 5: المرفقات
        ═══════════════════════════════════════ */}
        <FormCard
          title="المرفقات"
          icon={Upload}
          iconColor={colors.accent.purple.light}
          expanded={expandedSections.attachments}
          onToggle={() => toggleSection('attachments')}
        >
          <div style={{
            border: `2px dashed ${colors.accent.purple.main}30`,
            borderRadius: radius.md,
            padding: spacing['2xl'],
            textAlign: 'center',
            color: colors.text.muted,
            fontSize: '14px',
          }}>
            <Upload size={32} color={colors.accent.purple.light} style={{ marginBottom: spacing.sm }} />
            <div>اسحب الملفات هنا أو اضغط للاختيار</div>
            <div style={{ fontSize: '12px', marginTop: spacing.xs, color: colors.text.disabled }}>
              محضر الجلسة، الحكم، مستندات أخرى
            </div>
          </div>
        </FormCard>

        {/* ═══ WORKFLOW PREVIEW ═══ */}
        {formData.suggestedStage && (
          <div style={{
            background: `${colors.accent.blue.main}08`,
            border: `1px solid ${colors.accent.blue.main}18`,
            borderRadius: radius.lg,
            padding: `${spacing.md} ${spacing.lg}`,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Sparkles size={16} color={colors.accent.blue.light} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: colors.accent.blue.light }}>
                ما سيحدث عند الحفظ
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              <WorkflowItem icon={CheckCircle2} color={colors.accent.green.main} text="إنشاء/تحديث الجلسة" />
              <WorkflowItem icon={Scale} color={colors.accent.amber.main} text={`تحديث مرحلة القضية إلى: ${STAGE_LABELS[formData.suggestedStage]}`} />
              {formData.suggestedTask && (
                <WorkflowItem icon={Briefcase} color={colors.accent.amber.main} text={`إنشاء مهمة: ${formData.suggestedTask}`} />
              )}
              {showNextSession && formData.autoCreateNextSession && formData.nextSessionDate && (
                <WorkflowItem icon={Calendar} color={colors.accent.blue.light} text={`إنشاء جلسة قادمة: ${new Date(formData.nextSessionDate).toLocaleDateString('ar-EG')}`} />
              )}
              {formData.hasAdminTasks && formData.adminTasks.length > 0 && (
                <WorkflowItem icon={Briefcase} color={colors.accent.purple.main} text={`إنشاء ${formData.adminTasks.length} عمل إداري`} />
              )}
              {showJudgment && (
                <WorkflowItem icon={Gavel} color={colors.accent.green.main} text="إنشاء سجل الحكم" />
              )}
            </div>
          </div>
        )}

        {/* ═══ BUTTONS ═══ */}
        <div style={formSection.buttons}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={formSection.cancelBtn}>
            إلغاء
          </button>
          <button type="submit" disabled={loading}
            style={{ ...formSection.submitBtn(colors.accent.blue.main), opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={formSection.spinner} />جاري الحفظ...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <CheckCircle2 size={18} />
                حفظ الجلسة والنتيجة
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function FormCard({ title, icon: Icon, iconColor, children, expanded, onToggle, badge = null, accentColor = null }) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.4)',
      border: `1px solid ${accentColor ? `${accentColor}30` : colors.border.default}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      transition: transitions.default,
    }}>
      <button type="button" onClick={onToggle}
        style={{
          width: '100%', padding: `${spacing.md} ${spacing.lg}`,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'inherit', textAlign: 'right', direction: 'rtl',
          color: colors.text.primary,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={{
            width: 32, height: 32,
            background: `${iconColor}15`, borderRadius: radius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color={iconColor} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: colors.text.primary }}>{title}</span>
          {badge && (
            <span style={{
              background: `${iconColor}15`, color: iconColor,
              padding: `${spacing.xs} ${spacing.md}`, borderRadius: radius.full,
              fontSize: '12px', fontWeight: 700,
            }}>{badge}</span>
          )}
        </div>
        <ChevronRight size={18} color={colors.text.muted}
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: transitions.default }} />
      </button>

      {expanded && (
        <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}`, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {children}
        </div>
      )}
    </div>
  );
}

function WorkflowItem({ icon: Icon, color, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: '13px', color: colors.text.muted }}>
      <Icon size={14} color={color} />
      <span>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL STYLES (only for decision grid & judgment buttons)
// ═══════════════════════════════════════════════════════════════════
const styles = {
  decisionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: spacing.sm,
  },
  decisionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, padding: '10px 6px', borderRadius: radius.md, border: '1px solid',
    background: 'none', cursor: 'pointer', fontFamily: 'inherit',
    transition: transitions.default, minHeight: '64px',
  },
  judgmentTypeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.md, border: '1px solid',
    background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    fontFamily: 'inherit', transition: transitions.default,
  },
};