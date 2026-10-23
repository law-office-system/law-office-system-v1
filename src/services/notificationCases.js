import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseDb";
import { buildCaseNotificationSummary } from "../utils/caseNotificationSummary";

const STALE_PAGE_SIZE = 50;
const ID_CHUNK_SIZE = 30;
const LATE_WINDOW_DAYS = 30;

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapCase(documentSnapshot) {
  return {
    ...documentSnapshot.data(),
    id: documentSnapshot.id,
  };
}

async function runStage(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    console.error(`[Notification sync stage: ${stage}]`, error);
    error.notificationSyncStage = stage;
    throw error;
  }
}

/**
 * يحدّث الملخصات القديمة أولًا. يعيد الاستعلام عن أول دفعة بدل مؤشر
 * ترقيم لأن المستندات المحدثة تخرج من نتائج الاستعلام نفسه.
 */
export async function refreshStaleCaseNotificationSummaries(officeId) {
  if (!officeId) throw new Error("officeId مطلوب");

  const today = formatLocalDate(new Date());
  let refreshed = 0;

  while (true) {
    const staleQuery = query(
      collection(db, "cases"),
      where("officeId", "==", officeId),
      where("notificationSummary.calculatedFor", "<", today),
      orderBy("notificationSummary.calculatedFor"),
      limit(STALE_PAGE_SIZE)
    );

    const snapshot = await runStage("stale-summary-query", () => getDocs(staleQuery));
    if (snapshot.empty) break;

    const batch = writeBatch(db);

    snapshot.docs.forEach((caseDocument) => {
      const notificationSummary = buildCaseNotificationSummary({
        id: caseDocument.id,
        ...caseDocument.data(),
      });

      batch.update(caseDocument.ref, {
        notificationSummary: {
          ...notificationSummary,
          updatedAt: serverTimestamp(),
        },
      });
    });

    await runStage("stale-summary-write", () => batch.commit());
    refreshed += snapshot.size;
  }

  return refreshed;
}

async function getDueSessionCases(officeId, today) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - LATE_WINDOW_DAYS);

  // الامتداد حتى نهاية اليوم يشمل أيضًا صيغ ISO التي تحتوي على وقتًا.
  const endOfToday = `${today}\uf8ff`;

  const dueQuery = query(
    collection(db, "cases"),
    where("officeId", "==", officeId),
    where("notificationSummary.calculatedFor", "==", today),
    where("notificationSummary.session.date", ">=", formatLocalDate(cutoff)),
    where("notificationSummary.session.date", "<=", endOfToday),
    orderBy("notificationSummary.session.date")
  );

  const snapshot = await runStage("due-session-cases-query", () => getDocs(dueQuery));
  return snapshot.docs.map(mapCase);
}

async function getCasesByIds(officeId, caseIds) {
  const uniqueIds = [...new Set(caseIds.filter(Boolean))];
  const cases = [];

  // قراءة مباشرة بدل documentId() in؛ بعض قواعد Firestore تسمح بـ get
  // للمستند لكنها ترفض شكل استعلام list المستخدم هنا.
  for (let index = 0; index < uniqueIds.length; index += ID_CHUNK_SIZE) {
    const ids = uniqueIds.slice(index, index + ID_CHUNK_SIZE);
    const snapshots = await Promise.all(
      ids.map(async (caseId) => {
        try {
          return await getDoc(doc(db, "cases", caseId));
        } catch (error) {
          // يطابق سلوك المسار القديم: القضية المرجعية غير المتاحة لا توقف
          // مزامنة المهمة أو الحكم، ويُستخدم ما هو محفوظ فيهما من بيانات.
          if (error?.code === "permission-denied") {
            console.warn(
              `[Notification sync] skipped unavailable referenced case: ${caseId}`
            );
            return null;
          }

          console.error("[Notification sync stage: referenced-case-read]", error);
          error.notificationSyncStage = "referenced-case-read";
          throw error;
        }
      })
    );

    snapshots.forEach((snapshot) => {
      if (!snapshot?.exists()) return;
      if (snapshot.data().officeId !== officeId) return;
      cases.push(mapCase(snapshot));
    });
  }

  return cases;
}

/**
 * القضايا المطلوبة للمزامنة:
 * - القضايا المستحقة فقط تولّد إشعارات الجلسات.
 * - قضايا المهام والأحكام تكمّل الاسم والمحكمة والحالة فقط؛ تُفرغ جلساتها
 *   حتى لا تعيد توليد إشعارات جلسات خارج نتيجة الملخص.
 */
export async function loadCasesForNotificationSync(
  officeId,
  adminTasks = [],
  judgments = []
) {
  const refreshedSummaries = await refreshStaleCaseNotificationSummaries(officeId);
  const today = formatLocalDate(new Date());
  const sessionCases = await getDueSessionCases(officeId, today);
  const sessionCaseIds = new Set(sessionCases.map((caseItem) => caseItem.id));

  const referencedIds = [...adminTasks, ...judgments]
    .map((item) => item.caseId)
    .filter((caseId) => caseId && caseId !== "general" && !sessionCaseIds.has(caseId));

  const referencedCases = await getCasesByIds(officeId, referencedIds);
  const metadataCases = referencedCases.map((caseItem) => ({
    ...caseItem,
    sessions: [],
  }));

  return {
    cases: [...sessionCases, ...metadataCases],
    sessionCaseCount: sessionCases.length,
    metadataCaseCount: metadataCases.length,
    refreshedSummaries,
  };
}

export default loadCasesForNotificationSync;