import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseDb";
import { buildCaseNotificationSummary } from "../utils/caseNotificationSummary";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * تعبئة ملخصات قضايا مكتب واحد على دفعات.
 * الافتراضي يعالج المستندات التي لا تملك الإصدار الحالي من الملخص فقط،
 * لذلك يمكن إعادة التشغيل بأمان بعد انقطاع الشبكة دون إعادة كتابة ما اكتمل.
 */
export async function backfillCaseNotificationSummariesPage({
  officeId,
  startAfterId = null,
  pageSize = DEFAULT_PAGE_SIZE,
  onlyMissing = true,
}) {
  if (!officeId) throw new Error("officeId مطلوب");

  const safePageSize = Math.max(
    1,
    Math.min(Number(pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  );

  const constraints = [
    where("officeId", "==", officeId),
    orderBy(documentId()),
  ];

  if (startAfterId) constraints.push(startAfter(startAfterId));
  constraints.push(limit(safePageSize));

  const snapshot = await getDocs(query(collection(db, "cases"), ...constraints));
  const batch = writeBatch(db);
  let updated = 0;
  let skipped = 0;

  snapshot.docs.forEach((caseDocument) => {
    const caseData = caseDocument.data();

    if (onlyMissing && caseData.notificationSummary?.schemaVersion === 1) {
      skipped += 1;
      return;
    }

    const notificationSummary = buildCaseNotificationSummary({
      id: caseDocument.id,
      ...caseData,
    });

    batch.update(caseDocument.ref, {
      notificationSummary: {
        ...notificationSummary,
        updatedAt: serverTimestamp(),
      },
    });
    updated += 1;
  });

  if (updated > 0) await batch.commit();

  return {
    processed: snapshot.size,
    updated,
    skipped,
    nextStartAfterId: snapshot.docs.at(-1)?.id || null,
    done: snapshot.size < safePageSize,
  };
}

/**
 * تشغيل التعبئة حتى نهاية قضايا المكتب، مع تقرير التقدم بعد كل دفعة.
 */
export async function backfillAllCaseNotificationSummaries(
  officeId,
  { pageSize = DEFAULT_PAGE_SIZE, onlyMissing = true, onProgress } = {}
) {
  let startAfterId = null;
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let batches = 0;

  while (true) {
    const result = await backfillCaseNotificationSummariesPage({
      officeId,
      startAfterId,
      pageSize,
      onlyMissing,
    });

    processed += result.processed;
    updated += result.updated;
    skipped += result.skipped;
    batches += 1;

    onProgress?.({ processed, updated, skipped, batches, done: result.done });

    if (result.done || result.processed === 0) break;
    startAfterId = result.nextStartAfterId;
  }

  return { processed, updated, skipped, batches, done: true };
}

export default backfillAllCaseNotificationSummaries;