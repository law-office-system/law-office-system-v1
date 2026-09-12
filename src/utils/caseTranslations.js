// ============================================================
// خرائط الترجمة — من إنجليزي لعربي (مشتركة بين صفحات القضايا)
// تم نقلها من CaseDetails.jsx لتكون متاحة لأي صفحة أخرى
// ============================================================
import { CASE_STATUS_LIST } from "../constants/caseStatus";

// أنواع القضايا
export const CASE_TYPE_MAP = {
  criminal: "جنائي",
  civil: "مدني",
  commercial: "تجاري",
  administrative: "إداري",
  labor: "عمالي",
  personal: "أحوال شخصية",
  military: "عسكري",
  constitutional: "دستوري",
  tax: "ضريبي",
  insurance: "تأمينات",
  family: "أسري",
  real_estate: "عقاري",
  intellectual: "ملكية فكرية",
  maritime: "بحري",
  banking: "مصرفي",
  investment: "استثماري",
  competition: "منافسة",
  environment: "بيئي",
  consumer: "حماية المستهلك",
  cyber: "إلكتروني",
  medical: "طبيب",
  engineering: "هندسي",
  other: "أخرى",
};

// درجات التقاضي
export const LEVEL_TYPE_MAP = {
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

// حالات سير العمل (workflow)
export const WORKFLOW_STATUS_MAP = {
  new: "جديدة",
  active: "نشطة",
  pending: "معلقة",
  adjourned: "مؤجلة",
  judgment: "حُكمت",
  appealed: "مستأنفة",
  cassation: "منقوضة",
  execution: "تنفيذ",
  closed: "مغلقة",
  archived: "مؤرشفة",
  settled: "مسواة",
  withdrawn: "مسحوبة",
  rejected: "مرفوضة",
  reopened: "معاد فتحها",
};

export const translateCaseType = (type) => {
  if (!type) return "غير محدد";
  const normalized = String(type).toLowerCase().trim();
  return CASE_TYPE_MAP[normalized] || type;
};

export const translateLevelType = (type) => {
  if (!type) return "غير محدد";
  const normalized = String(type).toLowerCase().trim();
  return LEVEL_TYPE_MAP[normalized] || type;
};

export const translateWorkflowStatus = (status) => {
  if (!status) return "غير محدد";
  const normalized = String(status).toLowerCase().trim();
  return WORKFLOW_STATUS_MAP[normalized] || status;
};

export const getStatusLabel = (status) => {
  const found = CASE_STATUS_LIST.find(s => s.value === status);
  return found ? found.label : (status || "غير محدد");
};
