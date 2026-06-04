import { CASE_STATUS } from "./caseStatus";

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.ACTIVE]: "🟢 جارية",
  [CASE_STATUS.EXECUTION]: "🟡 تنفيذ",
  [CASE_STATUS.CLOSED]: "🔴 منتهية",

  // دعم أي بيانات قديمة
  active: "🟢 جارية",
  execution: "🟡 تنفيذ",
  closed: "🔴 منتهية",

  "جارية": "🟢 جارية",
  "تنفيذ": "🟡 تنفيذ",
  "منتهية": "🔴 منتهية",
};

export const getStatusLabel = (status) =>
  CASE_STATUS_LABELS[status] || status || "-";