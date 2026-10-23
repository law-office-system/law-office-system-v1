import { parseDate } from "../utils/date";
// ✅ المصدر الوحيد لحالة القضية — يبتلع كل الصيغ القديمة
import { getCaseStatus, CASE_STATUS } from "../constants/caseStatusUnified";

// ✅ نافذة الالتقاط: جلسة فائتة أقدم من هذا الحد = أرشيف تاريخي، لا إشعار
const LATE_WINDOW_DAYS = 30;

export const generateNotifications = (cases = [], adminTasks = [], judgments = [], settings = {}) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const notifications = [];
  const seen = new Set();
  const casesById = new Map(cases.map((caseItem) => [caseItem.id, caseItem]));

  const {
    sessionReminder = true,
    taskAssigned = true,
    caseStatusChange = true,
    reminderHours = 24,
  } = settings;

  // ───────────────────────────────────────────────
  // 1️⃣ الجلسات (late) 🔴
  // ───────────────────────────────────────────────
  if (sessionReminder) {
    // ✅ نشطة فقط عبر المصدر الموحد — القضية المنتهية/المؤرشفة/الملغاة لا تولّد إطلاقًا
    const activeCases = cases.filter((c) => {
      const st = getCaseStatus(c);
      return st === CASE_STATUS.ACTIVE || st === CASE_STATUS.PENDING || st === CASE_STATUS.EXECUTION;
    });

    activeCases.forEach((c) => {
      const sessions = c.sessions || [];
      if (!sessions.length) return;

      const caseId = c.id;
      const caseNumber = c.caseNumber || (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-");
      const court = c.court || "";
      const caseType = c.caseType || "";
      const clientNames = c.clientNames || [];
      const opponentNames = c.opponentNames || [];

      // ✅ انتهاء القضية فعليًا: أحدث جلسة عليها حكم نهائي → لا جلسات متأخرة إطلاقًا
      const sortedDesc = [...sessions]
        .map((s) => ({ s, d: parseDate(s.date || s.nextSessionDate) }))
        .filter((x) => x.d)
        .sort((a, b) => b.d - a.d);
      if (sortedDesc.length > 0 && sortedDesc[0].s.decisionType === "judgment") return;

      // فلترة الجلسات القابلة للتنبيه
      const validSessions = sessions.filter((s) => {
        if (s.decisionType && s.decisionType !== "pending") return false;
        if (s.decision && s.decision.trim() !== "") return false;
        if (s.status === "completed" || s.status === "مكتملة") return false;
        if (s.status === "cancelled" || s.status === "ملغاة") return false;
        return true;
      });
      if (!validSessions.length) return;

      let closestLate = null;
      let closestLateDiff = -Infinity;

      validSessions.forEach((s) => {
        const sessionDate = parseDate(s.nextSessionDate || s.date);
        if (!sessionDate) return;
        sessionDate.setHours(0, 0, 0, 0);

        const diffMs = sessionDate - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // ✅ لا إشعار إطلاقًا لجلسة فائتة منذ أكثر من 30 يومًا (أرشيف تاريخي)
        if (diffDays < -LATE_WINDOW_DAYS) return;

        // ✅ جلسة مستقبلية بعيدة: لا إشعار الآن (ستُنبه قبلها بـ reminderHours)
        if (diffDays > 0) return;

        // متأخرة فعلاً (اليوم أو أمس أو قبل)
        const isPastDue = diffDays <= 0;
        if (isPastDue && diffDays > closestLateDiff) {
          closestLateDiff = diffDays;
          closestLate = s;
        }
      });

      if (!closestLate) return;

      const sessionDateStr = closestLate.nextSessionDate || closestLate.date;
      const key = `${caseId}-late-${sessionDateStr}`;
      if (seen.has(key)) return;
      seen.add(key);

      const daysLate = Math.max(0, Math.floor((now - parseDate(sessionDateStr)) / (1000 * 60 * 60 * 24)));

      notifications.push({
        id: key,
        type: "late",
        caseId,
        caseNumber,
        caseCourt: court,   // ✅ الاسم الذي تقرأه الصفحة
        court,
        caseType,
        sessionDate: sessionDateStr,
        daysLate,
        sessionRoll: closestLate.roll || "",
        sessionDecision: closestLate.decisionDetails || closestLate.decision || "",
        sessionDecisionType: closestLate.decisionType || "",
        sessionAction: closestLate.action || "",
        clientNames,
        opponentNames,
        message: diffDaysLate(sessionDateStr, now)
          ? `⚠️ جلسة متأخرة: القضية رقم ${caseNumber} - ${court} - كانت بتاريخ ${sessionDateStr}`
          : `⏰ جلسة قادمة قريبًا: القضية رقم ${caseNumber} - ${court} - بتاريخ ${sessionDateStr}`,
      });
    });
  }

  // ───────────────────────────────────────────────
  // 2️⃣ الأعمال الإدارية المتأخرة (admin_task) 🟠
  // ───────────────────────────────────────────────
  if (taskAssigned) {
    adminTasks.forEach((task) => {
      if (task.status === "completed") return;

      const dueDate = parseDate(task.dueDate);
      if (!dueDate) return;
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate >= now) return;

      const caseId = task.caseId || "general";
      const key = `task-${task.id}`;
      if (seen.has(key)) return;
      seen.add(key);

      const caseData = caseId !== "general" ? casesById.get(caseId) : null;
      // ✅ عمل مرتبط بقضية منتهية = لا يستحق إشعار تأخير
      if (caseData) {
        const st = getCaseStatus(caseData);
        if (st === CASE_STATUS.CLOSED || st === CASE_STATUS.ARCHIVED || st === CASE_STATUS.CANCELLED) return;
      }

      const caseNumber = caseData
        ? caseData.caseNumber || (caseData.caseSerial ? `${caseData.caseSerial}/${caseData.caseYear}` : "-")
        : task.caseNumber || "-";
      const court = caseData?.court || task.court || "";
      const clientNames = caseData?.clientNames || task.clientNames || [];
      const daysLate = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      notifications.push({
        id: key,
        type: "admin_task",
        caseId,
        caseNumber,
        caseCourt: court,
        court,
        caseType: caseData?.caseType || "",
        taskId: task.id,
        taskTitle: task.title || "عمل إداري",
        dueDate: task.dueDate,
        daysLate,
        clientNames,
        opponentNames: caseData?.opponentNames || [],
        message: `📋 عمل إداري متأخر: ${task.title || "عمل إداري"} - متأخر بـ ${daysLate} يوم`,
      });
    });
  }

  // ───────────────────────────────────────────────
  // 3️⃣ الأحكام التي تحتاج متابعة (judgment) 🟣
  // ───────────────────────────────────────────────
  if (caseStatusChange) {
    judgments.forEach((judgment) => {
      if (!judgment.needsFollowUp) return;

      // ✅ انتهاء المتابعة: إذا حدد تاريخ انتهاء وفاته، لا إشعار
      if (judgment.followUpDeadline) {
        const deadline = parseDate(judgment.followUpDeadline);
        if (deadline && deadline < now) return;
      } else if (judgment.appealDeadline) {
        // احتياطي: استخدام appealDeadline كموعد انتهاء إذا لم يُحدد followUpDeadline
        const deadline = parseDate(judgment.appealDeadline);
        if (deadline && deadline < now) return;
      }

      const caseId = judgment.caseId || "general";
      const key = `judgment-${judgment.id}`;
      if (seen.has(key)) return;
      seen.add(key);

      const caseData = caseId !== "general" ? casesById.get(caseId) : null;
      const caseNumber = caseData
        ? caseData.caseNumber || (caseData.caseSerial ? `${caseData.caseSerial}/${caseData.caseYear}` : "-")
        : judgment.caseNumber || "-";
      const court = caseData?.court || judgment.court || "";
      const clientNames = caseData?.clientNames || judgment.clientNames || [];

      const categoryLabel =
        judgment.category === "preliminary" ? "حكم تمهيدي"
        : judgment.category === "order" ? "أمر"
        : "حكم";

      notifications.push({
        id: key,
        type: "judgment",
        caseId,
        caseNumber,
        caseCourt: court,
        court,
        caseType: caseData?.caseType || "",
        judgmentId: judgment.id,
        judgmentTitle: judgment.title || categoryLabel,
        judgmentCategory: judgment.category || "",
        judgmentDate: judgment.date || "",
        clientNames,
        opponentNames: caseData?.opponentNames || [],
        message: `⚖️ ${categoryLabel} يحتاج متابعة: ${judgment.title || categoryLabel} - القضية رقم ${caseNumber}`,
      });
    });
  }

  // ── ترتيب: الأقدم أولاً ──
  notifications.sort((a, b) => {
    const getDate = (n) => {
      if (n.type === "late") return parseDate(n.sessionDate);
      if (n.type === "admin_task") return parseDate(n.dueDate);
      if (n.type === "judgment") return parseDate(n.judgmentDate);
      return new Date(0);
    };
    return getDate(a) - getDate(b);
  });

  return notifications;
};

// هل التاريخ فائت؟ (لصياغة الرسالة)
function diffDaysLate(dateStr, now) {
  const d = parseDate(dateStr);
  if (!d) return true;
  return d < now;
}