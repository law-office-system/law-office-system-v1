export const caseStatusLabels = {
  active: "نشطة",
  pending: "معلقة",
  closed: "مغلقة",
  appealed: "مستأنفة",
  archived: "مؤرشفة",
  cancelled: "ملغاة",
  execution: "تنفيذ",
};

export function getStatusLabel(status) {
  return caseStatusLabels[status] || status || "غير محدد";
}

export default caseStatusLabels;