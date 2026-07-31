// ============================================================
// 📁 FILE: src/constants/caseStatusLabels.js
// Description: Labels for all statuses, levels, and types
// ============================================================

export const caseStatusLabels = {
  active: "نشطة",
  pending: "معلقة",
  closed: "مغلقة",
  appealed: "مستأنفة",
  archived: "مؤرشفة",
  cancelled: "ملغاة",
  execution: "تنفيذ",
};

export const litigationLevelLabels = {
  first_instance: "أول درجة",
  appeal: "استئناف",
  cassation: "نقض",
  retrial: "التماس إعادة النظر",
  execution: "تنفيذ",
};

export const workflowStatusLabels = {
  new: "جديدة",
  registered: "تم قيدها",
  first_session: "أول جلسة",
  ongoing: "متداولة",
  postponed: "مؤجلة",
  pleading: "مرافعة",
  reserved_for_judgment: "حجز للحكم",
  judgment_issued: "صدر الحكم",
  judgment_announced: "تم إعلان الحكم",
  closed: "مغلقة",
};

export const caseTypeLabels = {
  civil: "مدني",
  commercial: "تجاري",
  labor: "عمالي",
  criminal: "جنائي",
  family: "أسرة",
  administrative: "إداري (مجلس الدولة)",
  economic: "اقتصادي",
  execution: "تنفيذ",
};

// ==================== COMBINED HELPERS ====================

export function getStatusLabel(status) {
  return caseStatusLabels[status] || status || "غير محدد";
}

export function getLitigationLevelLabel(level) {
  return litigationLevelLabels[level] || level || "غير محدد";
}

export function getWorkflowStatusLabel(status) {
  return workflowStatusLabels[status] || status || "غير محدد";
}

export function getCaseTypeLabel(type) {
  return caseTypeLabels[type] || type || "غير محدد";
}

// ==================== COLORS ====================

export function getLitigationLevelColor(level) {
  switch (level) {
    case "first_instance":
      return "#2563eb"; // أزرق
    case "appeal":
      return "#7c3aed"; // بنفسجي
    case "cassation":
      return "#dc2626"; // أحمر
    case "retrial":
      return "#ea580c"; // برتقالي
    case "execution":
      return "#059669"; // أخضر
    default:
      return "#6b7280"; // رمادي
  }
}

export function getWorkflowStatusColor(status) {
  switch (status) {
    case "new":
      return "#3b82f6";

    case "registered":
      return "#2563eb";

    case "first_session":
      return "#06b6d4";

    case "ongoing":
      return "#f59e0b";

    case "postponed":
      return "#f97316";

    case "pleading":
      return "#8b5cf6";

    case "reserved_for_judgment":
      return "#6366f1";

    case "judgment_issued":
      return "#10b981";

    case "judgment_announced":
      return "#059669";

    case "closed":
      return "#6b7280";

    default:
      return "#6b7280";
  }
}

export default caseStatusLabels;