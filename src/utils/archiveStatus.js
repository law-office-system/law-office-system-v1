// ============================================================
// حالات الأرشيف والتنفيذ — مصدر واحد للحقيقة (Single Source of Truth)
// أي صفحة (نشطة / أرشيف / داشبورد) تستخدم الدوال دي عشان
// ميحصلش اختلاف: قضية تظهر "نشطة" في صفحة و"مؤرشفة" في أخرى.
//
// يكتشف الأرشيف بكل أشكاله:
//   1) فلاغ مباشر:  archived / isArchived
//   2) حقل توقيت:   archivedAt / deletedAt
//   3) الحالة بأي صيغة: إنجليزي (كبير/صغير) أو عربي أو مرادفات
// ============================================================

const ARCHIVED_STATUSES = [
  "archived", "مؤرشفة", "مؤرشف",
  "closed", "منتهية", "منتهي", "ended", "done", "terminated",
  "مغلقة", "مغلق",
];

const EXECUTION_STATUSES = ["execution", "executing", "تنفيذ"];

export const isArchivedCase = (c) => {
  if (!c) return false;
  // فلاغ/حقل أرشفة مباشر
  if (c.archived === true || c.isArchived === true) return true;
  if (c.archivedAt || c.deletedAt) return true;
  // الحالة
  const s = String(c.status || "").toLowerCase().trim();
  return ARCHIVED_STATUSES.includes(s);
};

export const isExecutionCase = (c) => {
  if (!c) return false;
  const s = String(c.status || "").toLowerCase().trim();
  return EXECUTION_STATUSES.includes(s) || c.currentLevel === "execution";
};

// القضية النشطة = أي قضية ليست مؤرشفة وليست في مرحلة التنفيذ
export const isActiveCase = (c) => !isArchivedCase(c) && !isExecutionCase(c);