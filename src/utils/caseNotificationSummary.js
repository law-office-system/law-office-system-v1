import { parseDate } from "../utils/date";
import { getCaseStatus, CASE_STATUS } from "../constants/caseStatusUnified";

const LATE_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const ELIGIBLE_CASE_STATUSES = new Set([
  CASE_STATUS.ACTIVE,
  CASE_STATUS.PENDING,
  CASE_STATUS.EXECUTION,
]);

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSessionPending(session) {
  if (session.decisionType && session.decisionType !== "pending") return false;
  if (session.decision && session.decision.trim() !== "") return false;
  if (["completed", "مكتملة", "cancelled", "ملغاة"].includes(session.status)) {
    return false;
  }
  return true;
}

/**
 * يبني ملخص إشعار الجلسة من كل جلسات القضية وكل درجات التقاضي.
 * القواعد هنا مطابقة لفرع الجلسات في generateNotifications الحالي.
 * الدالة نقية: لا تقرأ أو تكتب في Firestore، ويمكن اختبارها واستخدامها أثناء الحفظ.
 */
export function buildCaseNotificationSummary(caseData, now = new Date()) {
  const today = startOfDay(now);
  const caseStatus = getCaseStatus(caseData || {});
  const isCaseEligible = ELIGIBLE_CASE_STATUSES.has(caseStatus);
  const sessions = Array.isArray(caseData?.sessions) ? caseData.sessions : [];

  const sortedDesc = sessions
    .map((session) => ({
      session,
      date: parseDate(session.date || session.nextSessionDate),
    }))
    .filter((item) => item.date)
    .sort((a, b) => b.date - a.date);

  const hasFinalJudgment =
    sortedDesc.length > 0 && sortedDesc[0].session.decisionType === "judgment";

  const emptySummary = {
    schemaVersion: 1,
    calculatedFor: formatLocalDate(today),
    caseStatus,
    isCaseEligible,
    hasFinalJudgment,
    session: null,
  };

  if (!isCaseEligible || hasFinalJudgment) return emptySummary;

  let closestLate = null;
  let closestLateDiff = -Infinity;

  sessions.filter(isSessionPending).forEach((session) => {
    const parsedDate = parseDate(session.nextSessionDate || session.date);
    if (!parsedDate) return;

    const sessionDate = startOfDay(parsedDate);
    const diffDays = Math.floor((sessionDate - today) / DAY_MS);

    if (diffDays < -LATE_WINDOW_DAYS || diffDays > 0) return;

    if (diffDays > closestLateDiff) {
      closestLate = session;
      closestLateDiff = diffDays;
    }
  });

  if (!closestLate) return emptySummary;

  return {
    ...emptySummary,
    session: {
      id: closestLate.id || null,
      date: closestLate.nextSessionDate || closestLate.date || null,
      title:
        closestLate.nextSessionTitle ||
        closestLate.sessionTitle ||
        closestLate.title ||
        "",
      levelId:
        closestLate.levelId || closestLate.litigationLevelId || null,
      roll: closestLate.roll || "",
      decision: closestLate.decisionDetails || closestLate.decision || "",
      decisionType: closestLate.decisionType || "",
      action: closestLate.action || "",
    },
  };
}

export default buildCaseNotificationSummary;