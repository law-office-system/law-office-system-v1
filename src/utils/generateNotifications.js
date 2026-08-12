import { parseDate } from "./date";
import { CASE_STATUS } from "../constants/caseStatus";

// ============================================================
// ✅ توليد الإشعارات — مع مراعاة إعدادات المكتب
// ============================================================

export const generateNotifications = (cases, adminTasks = [], judgments = [], settings = {}) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const notifications = [];
  const seen = new Set();

  // ── Default settings (all enabled if not provided) ──
  const {
    sessionReminder = true,
    taskAssigned = true,
    caseStatusChange = true,
    reminderHours = 24,
  } = settings;

  // ───────────────────────────────────────────────
  // 1️⃣ الجلسات المتأخرة (late) 🔴
  // ───────────────────────────────────────────────
  if (sessionReminder) {
    const activeCases = cases.filter(
      (c) =>
        c.status === CASE_STATUS.ACTIVE ||
        c.status === "نشطة" ||
        c.status === "ACTIVE" ||
        c.status === "active"
    );

    activeCases.forEach((c) => {
      const sessions = c.sessions || [];
      if (!sessions.length) return;

      const caseId = c.id;
      const caseNumber = c.caseNumber || (c.caseSerial ? `${c.caseSerial}/${c.caseYear}` : "-");
      const court = c.court || "";
      const caseType = c.caseType || "";
      const clientNames = c.clientNames || [];
      const opponentNames = c.opponentNames || [];

      // فلترة الجلسات: استبعد المكتملة والملغاة واللي فيها قرار
      const validSessions = sessions.filter((s) => {
        if (s.decisionType && s.decisionType !== 'pending') return false;
        if (s.decision && s.decision.trim() !== "") return false;
        if (s.status === "completed" || s.status === "مكتملة") return false;
        if (s.status === "cancelled" || s.status === "ملغاة") return false;
        return true;
      });

      if (!validSessions.length) return;

      // 🆕 NEW: Check reminderHours — only notify if within reminder window
      const reminderMs = reminderHours * 60 * 60 * 1000;

      let closestLate = null;
      let closestLateDiff = -Infinity;

      validSessions.forEach((s) => {
        const sessionDate = parseDate(s.nextSessionDate || s.date);
        if (!sessionDate) return;

        sessionDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((sessionDate - now) / (1000 * 60 * 60 * 24));

        // 🆕 NEW: Only include if past due OR within reminder window
        const diffMs = sessionDate - now;
        const isPastDue = diffDays < 0;
        const isWithinReminder = diffMs > 0 && diffMs <= reminderMs;

        if ((isPastDue || isWithinReminder) && diffDays > closestLateDiff) {
          closestLateDiff = diffDays;
          closestLate = s;
        }
      });

      if (!closestLate) return;

      const sessionDateStr = closestLate.nextSessionDate || closestLate.date;
      const key = `${caseId}-late-${sessionDateStr}`;

      if (seen.has(key)) return;
      seen.add(key);

      notifications.push({
        id: key,
        type: "late",
        caseId,
        caseNumber,
        court,
        caseType,
        sessionDate: sessionDateStr,
        sessionRoll: closestLate.roll || "",
        sessionDecision: closestLate.decisionDetails || closestLate.decision || "",
        sessionDecisionType: closestLate.decisionType || "",
        sessionAction: closestLate.action || "",
        clientNames,
        opponentNames,
        message: `⚠️ جلسة متأخرة: القضية رقم ${caseNumber} - ${court} - كانت بتاريخ ${sessionDateStr}`,
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
      if (dueDate >= now) return; // مش متأخرة

      const caseId = task.caseId || "general";
      const key = `task-${task.id}`;

      if (seen.has(key)) return;
      seen.add(key);

      const caseData = caseId !== "general"
        ? cases.find((c) => c.id === caseId)
        : null;

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
  // 3️⃣ الأحكام/الأوامر اللي تحتاج متابعة (judgment) 🟣
  // ───────────────────────────────────────────────
  if (caseStatusChange) {
    judgments.forEach((judgment) => {
      if (!judgment.needsFollowUp) return;

      const caseId = judgment.caseId || "general";
      const key = `judgment-${judgment.id}`;

      if (seen.has(key)) return;
      seen.add(key);

      const caseData = caseId !== "general"
        ? cases.find((c) => c.id === caseId)
        : null;

      const caseNumber = caseData
        ? caseData.caseNumber || (caseData.caseSerial ? `${caseData.caseSerial}/${caseData.caseYear}` : "-")
        : judgment.caseNumber || "-";
      const court = caseData?.court || judgment.court || "";
      const clientNames = caseData?.clientNames || judgment.clientNames || [];

      const categoryLabel =
        judgment.category === "preliminary"
          ? "حكم تمهيدي"
          : judgment.category === "order"
          ? "أمر"
          : "حكم";

      notifications.push({
        id: key,
        type: "judgment",
        caseId,
        caseNumber,
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

  // ───────────────────────────────────────────────
  // ✅ ترتيب: الأقدم أولاً (حسب التاريخ)
  // ───────────────────────────────────────────────
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
