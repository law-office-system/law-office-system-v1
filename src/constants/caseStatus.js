// ============================================================
// 📁 FILE: src/constants/caseStatus.js
// Description: Case status + Litigation Levels + Workflow Statuses
// ============================================================

// ==================== CASE STATUS (General) ====================
export const CASE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  CLOSED: 'closed',
  APPEALED: 'appealed',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
  EXECUTION: 'execution',
};

export const CASE_STATUS_LIST = [
  { value: 'active', label: 'نشطة', color: '#059669' },
  { value: 'pending', label: 'معلقة', color: '#d97706' },
  { value: 'closed', label: 'مغلقة', color: '#6b7280' },
  { value: 'appealed', label: 'مستأنفة', color: '#7c3aed' },
  { value: 'archived', label: 'مؤرشفة', color: '#374151' },
  { value: 'cancelled', label: 'ملغاة', color: '#dc2626' },
  { value: 'execution', label: 'تنفيذ', color: '#f59e0b' },
];

// ==================== LITIGATION LEVELS (درجات التقاضي) ====================
export const LITIGATION_LEVEL = {
  FIRST_INSTANCE: 'first_instance',   // أول درجة
  APPEAL: 'appeal',                   // استئناف
  CASSATION: 'cassation',             // نقض
  RETRIAL: 'retrial',                 // التماس إعادة النظر
  EXECUTION: 'execution',             // تنفيذ
};

export const LITIGATION_LEVEL_LIST = [
  { value: 'first_instance', label: 'أول درجة', color: '#3b82f6', icon: '⚖️' },
  { value: 'appeal', label: 'استئناف', color: '#f59e0b', icon: '🟠' },
  { value: 'cassation', label: 'نقض', color: '#ef4444', icon: '🔴' },
  { value: 'retrial', label: 'التماس إعادة النظر', color: '#8b5cf6', icon: '🔄' },
  { value: 'execution', label: 'تنفيذ', color: '#10b981', icon: '🔨' },
];

// ==================== WORKFLOW STATUS (حالات المرحلة) ====================
export const WORKFLOW_STATUS = {
  NEW: 'new',                         // جديدة
  REGISTERED: 'registered',           // تم قيدها
  FIRST_SESSION: 'first_session',     // أول جلسة
  ONGOING: 'ongoing',                 // متداولة
  POSTPONED: 'postponed',             // تأجيل
  PLEADING: 'pleading',               // مرافعة
  RESERVED_FOR_JUDGMENT: 'reserved_for_judgment', // حجز للحكم
  JUDGMENT_ISSUED: 'judgment_issued', // صدر الحكم
  JUDGMENT_ANNOUNCED: 'judgment_announced', // تم إعلان الحكم
  CLOSED: 'closed',                   // مغلقة
};

export const WORKFLOW_STATUS_LIST = [
  { value: 'new', label: 'جديدة', color: '#6b7280' },
  { value: 'registered', label: 'تم قيدها', color: '#3b82f6' },
  { value: 'first_session', label: 'أول جلسة', color: '#8b5cf6' },
  { value: 'ongoing', label: 'متداولة', color: '#10b981' },
  { value: 'postponed', label: 'مؤجلة', color: '#f59e0b' },
  { value: 'pleading', label: 'مرافعة', color: '#06b6d4' },
  { value: 'reserved_for_judgment', label: 'حجز للحكم', color: '#ec4899' },
  { value: 'judgment_issued', label: 'صدر الحكم', color: '#1e40af' },
  { value: 'judgment_announced', label: 'تم إعلان الحكم', color: '#1e3a8a' },
  { value: 'closed', label: 'مغلقة', color: '#6b7280' },
];

// ==================== CASE TYPES (أنواع القضايا) ====================
export const CASE_TYPE = {
  CIVIL: 'civil',                   // مدني
  COMMERCIAL: 'commercial',         // تجاري
  LABOR: 'labor',                   // عمالي
  CRIMINAL: 'criminal',             // جنائي
  FAMILY: 'family',                 // أسرة
  ADMINISTRATIVE: 'administrative', // إداري (مجلس الدولة)
  ECONOMIC: 'economic',             // اقتصادي
  EXECUTION: 'execution',           // تنفيذ
};

export const CASE_TYPE_LIST = [
  { value: 'civil', label: 'مدني', icon: '📋', description: 'القضايا المدنية العامة' },
  { value: 'commercial', label: 'تجاري', icon: '💼', description: 'المنازعات التجارية' },
  { value: 'labor', label: 'عمالي', icon: '👷', description: 'المنازعات العمالية' },
  { value: 'criminal', label: 'جنائي', icon: '⚔️', description: 'القضايا الجنائية' },
  { value: 'family', label: 'أسرة', icon: '👨‍👩‍👧‍👦', description: 'قضايا الأحوال الشخصية' },
  { value: 'administrative', label: 'إداري (مجلس الدولة)', icon: '🏛️', description: 'القضايا الإدارية' },
  { value: 'economic', label: 'اقتصادي', icon: '💰', description: 'القضايا الاقتصادية' },
  { value: 'execution', label: 'تنفيذ', icon: '🔨', description: 'قضايا التنفيذ' },
];

// ==================== HELPERS ====================

export const getLitigationLevelLabel = (level) => {
  const found = LITIGATION_LEVEL_LIST.find(l => l.value === level);
  return found ? found.label : (level || "غير محدد");
};

export const getLitigationLevelColor = (level) => {
  const found = LITIGATION_LEVEL_LIST.find(l => l.value === level);
  return found ? found.color : '#6b7280';
};

export const getWorkflowStatusLabel = (status) => {
  const found = WORKFLOW_STATUS_LIST.find(s => s.value === status);
  return found ? found.label : (status || "غير محدد");
};

export const getWorkflowStatusColor = (status) => {
  const found = WORKFLOW_STATUS_LIST.find(s => s.value === status);
  return found ? found.color : '#6b7280';
};

export const getCaseTypeLabel = (type) => {
  const found = CASE_TYPE_LIST.find(t => t.value === type);
  return found ? found.label : (type || "غير محدد");
};

// ==================== DEFAULT LITIGATION LEVELS BY CASE TYPE ====================
// These are the default litigation levels created automatically when a case is added
export const DEFAULT_LITIGATION_LEVELS = {
  civil: ['first_instance', 'appeal', 'cassation', 'execution'],
  commercial: ['first_instance', 'appeal', 'cassation', 'execution'],
  labor: ['first_instance', 'appeal', 'cassation', 'execution'],
  criminal: ['first_instance', 'appeal', 'cassation', 'execution'],
  family: ['first_instance', 'appeal', 'cassation', 'execution'],
  administrative: ['first_instance', 'appeal', 'cassation'],
  economic: ['first_instance', 'appeal', 'cassation', 'execution'],
  execution: ['execution'],
};

// ==================== WORKFLOW TEMPLATES (قوالب سير العمل) ====================
// Each case type has a default workflow template
export const WORKFLOW_TEMPLATES = {
  civil: [
    { order: 1, name: 'رفع الدعوى', status: 'new', level: 'first_instance' },
    { order: 2, name: 'تحضير الدعوى', status: 'registered', level: 'first_instance' },
    { order: 3, name: 'تداول الجلسات', status: 'ongoing', level: 'first_instance' },
    { order: 4, name: 'حجز للحكم', status: 'reserved_for_judgment', level: 'first_instance' },
    { order: 5, name: 'صدور الحكم', status: 'judgment_issued', level: 'first_instance' },
    { order: 6, name: 'إعلان الحكم', status: 'judgment_announced', level: 'first_instance' },
  ],
  labor: [
    { order: 1, name: 'شكوى مكتب العمل', status: 'new', level: 'first_instance' },
    { order: 2, name: 'التسوية الودية', status: 'registered', level: 'first_instance' },
    { order: 3, name: 'رفع الدعوى', status: 'first_session', level: 'first_instance' },
    { order: 4, name: 'الجلسات', status: 'ongoing', level: 'first_instance' },
    { order: 5, name: 'الحكم', status: 'judgment_issued', level: 'first_instance' },
  ],
  criminal: [
    { order: 1, name: 'الشرطة', status: 'new', level: 'first_instance' },
    { order: 2, name: 'النيابة', status: 'registered', level: 'first_instance' },
    { order: 3, name: 'الإحالة', status: 'first_session', level: 'first_instance' },
    { order: 4, name: 'محكمة الجنح', status: 'ongoing', level: 'first_instance' },
    { order: 5, name: 'المعارضة', status: 'postponed', level: 'first_instance' },
    { order: 6, name: 'الحكم', status: 'judgment_issued', level: 'first_instance' },
  ],
  administrative: [
    { order: 1, name: 'التظلم الإداري', status: 'new', level: 'first_instance' },
    { order: 2, name: 'رفع الدعوى', status: 'registered', level: 'first_instance' },
    { order: 3, name: 'هيئة المفوضين', status: 'ongoing', level: 'first_instance' },
    { order: 4, name: 'الجلسات', status: 'pleading', level: 'first_instance' },
    { order: 5, name: 'الحكم', status: 'judgment_issued', level: 'first_instance' },
  ],
  execution: [
    { order: 1, name: 'الصيغة التنفيذية', status: 'new', level: 'execution' },
    { order: 2, name: 'إعلان السند التنفيذي', status: 'registered', level: 'execution' },
    { order: 3, name: 'إنذار', status: 'first_session', level: 'execution' },
    { order: 4, name: 'حجز', status: 'ongoing', level: 'execution' },
    { order: 5, name: 'بيع', status: 'pleading', level: 'execution' },
    { order: 6, name: 'توزيع', status: 'reserved_for_judgment', level: 'execution' },
    { order: 7, name: 'انتهاء التنفيذ', status: 'closed', level: 'execution' },
  ],
};

export default CASE_STATUS;