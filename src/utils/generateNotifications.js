import { parseDate } from "./date";
import { CASE_STATUS } from "../constants/caseStatus";

export const generateNotifications = (cases) => {
  const now = new Date();
  const notifications = [];
  const seen = new Set(); // منع التكرار

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
    const caseId = c.id;

    // 🔴 متأخرة
    if (lastDate) {
      const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

      if (diffDays > 3) {
        const key = `${caseId}-late`;

        if (!seen.has(key)) {
          seen.add(key);

          notifications.push({
            id: key,
            type: "late",
            caseId,
            caseNumber:
              c.caseNumber ||
              (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-"),
            message: "⚠ لا يوجد متابعة بعد آخر جلسة",
            caseData: c,
          });
        }
      }
    }

    sessions.forEach((s) => {
      const d = parseDate(s.date);
      if (!d) return;

      const diff = (d - now) / (1000 * 60 * 60 * 24);
      const isToday = d.toDateString() === now.toDateString();

      // 🟡 اليوم
      if (isToday) {
        const key = `${caseId}-${s.date}-today`;

        if (!seen.has(key)) {
          seen.add(key);

          notifications.push({
            id: key,
            type: "today",
            caseId,
            caseNumber:
              c.caseNumber ||
              (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-"),
            message: "🟡 جلسة اليوم",
            caseData: c,
          });
        }
      }

      // 🟠 خلال 24 ساعة
      if (diff > 0 && diff <= 1) {
        const key = `${caseId}-${s.date}-soon`;

        if (!seen.has(key)) {
          seen.add(key);

          notifications.push({
            id: key,
            type: "soon",
            caseId,
            caseNumber:
              c.caseNumber ||
              (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-"),
            message: "🟠 جلسة خلال 24 ساعة",
            caseData: c,
          });
        }
      }
    });
  });

  return notifications;
};