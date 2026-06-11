import { parseDate } from "./date";
import { CASE_STATUS } from "../constants/caseStatus";

export const generateNotifications = (cases) => {
  const now = new Date();
  const notifications = [];

  const activeCases = cases.filter(
    (c) =>
      c.status === CASE_STATUS.ACTIVE ||
      c.status === "نشطة"
  );

  activeCases.forEach((c) => {
    const sessions = c.sessions || [];
    if (!sessions.length) return;

    const sorted = [...sessions].sort(
      (a, b) => parseDate(b.date) - parseDate(a.date)
    );

    const lastDate = parseDate(sorted[0].date);

    /* 🔴 متأخرة */
    if (lastDate) {
      const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

      const hasNewSession = sessions.some(
        (s) => parseDate(s.date) > lastDate
      );

      if (diffDays > 1 && !hasNewSession) {
        notifications.push({
          type: "late",
          caseId: c.id,
          caseNumber: c.caseNumber || (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-"),
          message: "⚠ لا يوجد متابعة بعد آخر جلسة",
          caseData: c // تم إضافة كائن القضية كاملاً هنا
        });
      }
    }

    sessions.forEach((s) => {
      const d = parseDate(s.date);
      if (!d) return;

      const diff = (d - now) / (1000 * 60 * 60 * 24);

      /* 🟡 اليوم */
      if (d.toDateString() === now.toDateString()) {
        notifications.push({
          type: "today",
          caseId: c.id,
          caseNumber: c.caseNumber || (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-"),
          message: "🟡 جلسة اليوم",
          caseData: c // تم إضافة كائن القضية كاملاً هنا
        });
      }

      /* 🟠 خلال 24 ساعة */
      if (diff > 0 && diff <= 1) {
        notifications.push({
          type: "soon",
          caseId: c.id,
          caseNumber: c.caseNumber || (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-"),
          message: "🟠 جلسة خلال 24 ساعة",
          caseData: c // تم إضافة كائن القضية كاملاً هنا
        });
      }
    });
  });

  return notifications;
};