// ============================================================
// 📁 FILE: src/constants/caseStatusUnified.js
// المصدر الوحيد لحالة القضية — التخزين بالعربية دائمًا
// ============================================================

export const CASE_STATUS = {
  ACTIVE:    "نشطة",
  PENDING:   "معلقة",
  EXECUTION: "قيد التنفيذ",
  CLOSED:    "منتهية",
  APPEALED:  "مستأنفة",
  ARCHIVED:  "مؤرشفة",
  CANCELLED: "ملغاة",
};

// ✅ تطبيع صارم: يبتلع كل الصيغ (إنجليزي/عربي/همزات/تاء مربوطة/حالة الحروف)
const STATUS_ALIASES = {
  "active": CASE_STATUS.ACTIVE, "نشطة": CASE_STATUS.ACTIVE, "جارية": CASE_STATUS.ACTIVE,
  "متداولة": CASE_STATUS.ACTIVE, "ongoing": CASE_STATUS.ACTIVE, "open": CASE_STATUS.ACTIVE,
  "pending": CASE_STATUS.PENDING, "معلقة": CASE_STATUS.PENDING, "معلقه": CASE_STATUS.PENDING,
  "execution": CASE_STATUS.EXECUTION, "تنفيذ": CASE_STATUS.EXECUTION, "قيد التنفيذ": CASE_STATUS.EXECUTION,
  "قيد التنفيذ": CASE_STATUS.EXECUTION, "قيد التنفيذ": CASE_STATUS.EXECUTION,
  "closed": CASE_STATUS.CLOSED, "منتهية": CASE_STATUS.CLOSED, "منتهي": CASE_STATUS.CLOSED,
  "منتهيه": CASE_STATUS.CLOSED, "مغلقة": CASE_STATUS.CLOSED, "مغلق": CASE_STATUS.CLOSED, "مغلقه": CASE_STATUS.CLOSED,
  "ended": CASE_STATUS.CLOSED, "terminated": CASE_STATUS.CLOSED, "مكتملة": CASE_STATUS.CLOSED,
  "appealed": CASE_STATUS.APPEALED, "مستأنفة": CASE_STATUS.APPEALED, "مستأنفه": CASE_STATUS.APPEALED,
  "archived": CASE_STATUS.ARCHIVED, "مؤرشفة": CASE_STATUS.ARCHIVED, "مؤرشفه": CASE_STATUS.ARCHIVED,
  "archive": CASE_STATUS.ARCHIVED, "مؤرشفة": CASE_STATUS.ARCHIVED,
  "cancelled": CASE_STATUS.CANCELLED, "ملغاة": CASE_STATUS.CANCELLED, "ملغاه": CASE_STATUS.CANCELLED, "canceled": CASE_STATUS.CANCELLED,
};

// 🔑 التطبيع الجوهري: يزيل الهمزات والتاء المربوطة والمسافات ويحوّل لصغير
function normalizeText(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // تشكيل/تطويل
    .replace(/[أإآ]/g, "ا")                       // همزات → ا
    .replace(/ى/g, "ي")                           // ألف مقصورة → ي
    .replace(/ة/g, "ه")                           // تاء مربوطة → هاء
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCaseStatus(status) {
  if (!status) return CASE_STATUS.ACTIVE;
  const raw = String(status).trim();

  // 1) محاولة مباشرة بالمفتاح الخام
  const direct = STATUS_ALIASES[raw.toLowerCase()];
  if (direct) return direct;

  // 2) المحاولة المُطبَّعة (تبتلع "مُنتهية"، "مغلقه"، "مؤرشفة"، إلخ)
  const key = normalizeText(raw);
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];

  // 3) بحث جزئي: "منتهي" أو "منتهية" داخل النص
  if (key.includes("منتهي") || key.includes("اغلاق") || key.includes("مغلق")) return CASE_STATUS.CLOSED;
  if (key.includes("مؤرشف") || key.includes("ارشيف")) return CASE_STATUS.ARCHIVED;
  if (key.includes("ملغي")) return CASE_STATUS.CANCELLED;
  if (key.includes("تنفيذ")) return CASE_STATUS.EXECUTION;
  if (key.includes("مستأنف")) return CASE_STATUS.APPEALED;
  if (key.includes("معلق")) return CASE_STATUS.PENDING;
  if (key.includes("نشط") || key.includes("جاري") || key.includes("متداول")) return CASE_STATUS.ACTIVE;

  return raw; // غير معروف — أعده كما هو
}

export function getCaseStatus(caseData) {
  if (!caseData) return CASE_STATUS.ACTIVE;

  // أرشفة صريحة
  if (caseData.archived === true || caseData.isArchived === true) return CASE_STATUS.ARCHIVED;
  if (normalizeCaseStatus(caseData.status) === CASE_STATUS.ARCHIVED) return CASE_STATUS.ARCHIVED;

  // ✅ تنفيذ صريح: إذا نوع القضية "تنفيذ" تعتبر قيد التنفيذ دائمًا
  if (caseData.caseType === "execution" || caseData.caseType === "تنفيذ") return CASE_STATUS.EXECUTION;

  return normalizeCaseStatus(caseData.status);
}

export const isActiveStatus     = (s) => normalizeCaseStatus(s) === CASE_STATUS.ACTIVE;
export const isPendingStatus    = (s) => normalizeCaseStatus(s) === CASE_STATUS.PENDING;
export const isExecutionStatus  = (s) => normalizeCaseStatus(s) === CASE_STATUS.EXECUTION;
export const isClosedStatus     = (s) => normalizeCaseStatus(s) === CASE_STATUS.CLOSED;
export const isAppealedStatus   = (s) => normalizeCaseStatus(s) === CASE_STATUS.APPEALED;
export const isArchivedStatus   = (s) => normalizeCaseStatus(s) === CASE_STATUS.ARCHIVED;
export const isCancelledStatus  = (s) => normalizeCaseStatus(s) === CASE_STATUS.CANCELLED;

// منتهية فعليًا = منتهية أو مؤرشفة أو ملغاة
export const isDoneStatus = (s) => {
  const n = normalizeCaseStatus(s);
  return n === CASE_STATUS.CLOSED || n === CASE_STATUS.ARCHIVED || n === CASE_STATUS.CANCELLED;
};