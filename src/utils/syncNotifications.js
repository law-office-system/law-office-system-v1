import {
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebaseDb";
import { generateNotifications } from "./generateNotifications";

// ============================================================
// Cache لأسماء الموكلين — 10 دقائق، مع فصل البيانات حسب المكتب
// ============================================================
const clientNamesCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// ============================================================
// جلب أسماء الموكلين مفلتراً بالمكتب على مستوى الاستعلام
// ============================================================
const getCachedClientNames = async (clientIds, officeId) => {
  const now = Date.now();
  const uncachedIds = [];
  const result = {};

  if (!officeId || !Array.isArray(clientIds)) {
    return result;
  }

  const uniqueIds = [
    ...new Set(
      clientIds.filter(
        (id) => typeof id === "string" && id.trim() !== ""
      )
    ),
  ];

  uniqueIds.forEach((id) => {
    const cacheKey = `${officeId}_${id}`;
    const cached = clientNamesCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL) {
      result[id] = cached.name;
    } else {
      uncachedIds.push(id);
    }
  });

  // جلب المستندات المستقلة بالتوازي، مع تقييم كل مستند على حدة.
  await Promise.all(
    uncachedIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "clientProfiles", id));
        if (!snap.exists()) return;

        const data = snap.data();
        if (data.officeId !== officeId) return;

        const name = data.fullName || data.name || "موكل";
        const cacheKey = `${officeId}_${id}`;

        result[id] = name;
        clientNamesCache.set(cacheKey, {
          name,
          timestamp: now,
        });
      } catch (error) {
        // مستند مرفوض أو موكل من مكتب شريك لا يوقف باقي المزامنة.
        if (error?.code !== "permission-denied") {
          console.error("❌ Error fetching client names:", error);
        }
      }
    })
  );

  return result;
};

// ============================================================
// جلب إعدادات الإشعارات من مستند المكتب
// ============================================================
async function loadNotificationSettings(officeId) {
  if (!officeId) return {};

  try {
    const officeRef = doc(db, "offices", officeId);
    const snapshot = await getDoc(officeRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return data.notifications || {};
    }
  } catch (error) {
    console.warn(
      "⚠️ Failed to load notification settings:",
      error.message
    );
  }

  return {};
}

// ============================================================
// حذف إشعارات جلسة محددة داخل المكتب فقط
// ============================================================
export const deleteNotificationsForSession = async (
  caseId,
  sessionDate,
  officeId
) => {
  if (!caseId || !sessionDate || !officeId) {
    console.warn(
      "⚠️ Cannot delete session notifications: missing caseId, sessionDate, or officeId"
    );
    return;
  }

  try {
    const notificationsRef = collection(db, "notifications");

    const notificationsQuery = query(
      notificationsRef,
      where("officeId", "==", officeId),
      where("caseId", "==", caseId),
      where("sessionDate", "==", sessionDate)
    );

    const snapshot = await getDocs(notificationsQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach((notificationDoc) => {
      batch.delete(
        doc(db, "notifications", notificationDoc.id)
      );
    });

    if (!snapshot.empty) {
      await batch.commit();
    }

    console.log(
      `✅ تم حذف ${snapshot.size} إشعار للجلسة ${sessionDate}`
    );
  } catch (error) {
    console.error(
      "❌ خطأ في حذف إشعارات الجلسة:",
      error
    );
  }
};

// ============================================================
// المزامنة الرئيسية للإشعارات
// ============================================================
export const syncNotifications = async (
  cases = null,
  adminTasks = null,
  judgments = null,
  officeId
) => {
  if (!officeId) {
    console.warn(
      "⚠️ Notification sync skipped: officeId is missing"
    );
    return;
  }

  // وجود المصفوفة يعني أن المصدر حُمّل فعلًا ويمكن مزامنة نوعه وحذف القديم منه.
  // أما null فتعني أن المصدر لم يُحمّل، ولذلك يجب ترك إشعاراته دون تغيير.
  const syncCases = Array.isArray(cases);
  const syncTasks = Array.isArray(adminTasks);
  const syncJudgments = Array.isArray(judgments);

  const shouldManageType = (type) =>
    (type === "late" && syncCases) ||
    (type === "admin_task" && syncTasks) ||
    (type === "judgment" && syncJudgments);

  if (!syncCases && !syncTasks && !syncJudgments) {
    console.warn("⚠️ Notification sync skipped: no source data provided");
    return;
  }

  try {
    // 1. جلب إعدادات الإشعارات
    const settings = await loadNotificationSettings(officeId);

    console.log("📋 Notification settings loaded");

    // 2. جمع معرفات الموكلين من القضايا
    const clientIds = new Set();

    (cases || []).forEach((caseItem) => {
      (caseItem.clients || []).forEach((client) => {
        const id =
          typeof client === "object" && client !== null
            ? client.id
            : client;

        if (typeof id === "string" && id.trim() !== "") {
          clientIds.add(id);
        }
      });
    });

    // 3. جلب أسماء الموكلين داخل المكتب المحدد
    const idsArray = Array.from(clientIds);

    const clientNamesMap = await getCachedClientNames(
      idsArray,
      officeId
    );

    // 4. تجهيز القضايا بأسماء الموكلين والخصوم
    const casesWithNames = (cases || []).map((caseItem) => {
      const clientNames = (caseItem.clients || [])
        .map((client) => {
          const id =
            typeof client === "object" && client !== null
              ? client.id
              : client;

          return clientNamesMap[id] || "";
        })
        .filter(Boolean);

      const opponentNames = (caseItem.opponents || [])
        .map((opponent) =>
          typeof opponent === "object" && opponent !== null
            ? opponent.name || ""
            : opponent || ""
        )
        .filter(Boolean);

      return {
        ...caseItem,
        clientNames,
        opponentNames,
      };
    });

    // 5. توليد الإشعارات (generateNotifications الجديد بفلاتر القضايا المنتهية والجلسات البائتة)
    const generatedNotifications = generateNotifications(
      casesWithNames,
      syncTasks ? adminTasks : [],
      syncJudgments ? judgments : [],
      settings
    );

    // حماية إضافية: لا نزامن إشعارًا مرتبطًا بمكتب آخر
    const generatedForOffice = generatedNotifications.map(
      (notification) => ({
        ...notification,
        officeId,
      })
    );

    const generatedIds = new Set(
      generatedForOffice.map((notification) => notification.id)
    );

    // 6. جلب إشعارات المكتب الحالي فقط
    const notificationsRef = collection(db, "notifications");

    const existingQuery = query(
      notificationsRef,
      where("officeId", "==", officeId)
    );

    const existingSnapshot = await getDocs(existingQuery);

    const existingMap = new Map();

    existingSnapshot.docs.forEach((notificationDoc) => {
      const data = notificationDoc.data();

      // لا ندير إلا إشعارات الأنواع التي حُمّل مصدرها في هذه المزامنة.
      // الرسائل والإشعارات اليدوية والمستندات بلا معرف منطقي تبقى كما هي.
      if (!data.id || !shouldManageType(data.type)) return;

      existingMap.set(data.id, {
        ...data,
        firestoreId: notificationDoc.id,
      });
    });

    const operations = [];
    const MAX_BATCH = 450;

    // 7. حذف القديم فقط داخل الأنواع التي حُمّل مصدرها.
    for (const [id, existing] of existingMap) {
      if (!generatedIds.has(id)) {
        operations.push({
          method: "delete",
          ref: doc(db, "notifications", existing.firestoreId),
        });
      }
    }

    // 8. إضافة الإشعارات الجديدة وتحديث المتغير منها.
    for (const newNotification of generatedForOffice) {
      if (!newNotification.id || !shouldManageType(newNotification.type)) {
        continue;
      }

      if (existingMap.has(newNotification.id)) {
        const existing = existingMap.get(newNotification.id);

        const needsUpdate =
          existing.message !== newNotification.message ||
          existing.type !== newNotification.type ||
          existing.sessionDate !== (newNotification.sessionDate || null) ||
          existing.dueDate !== (newNotification.dueDate || null) ||
          existing.judgmentDate !== (newNotification.judgmentDate || null) ||
          existing.caseNumber !== newNotification.caseNumber ||
          existing.caseCourt !==
            (newNotification.caseCourt || newNotification.court || null) ||
          JSON.stringify(existing.clientNames || []) !==
            JSON.stringify(newNotification.clientNames || []) ||
          JSON.stringify(existing.opponentNames || []) !==
            JSON.stringify(newNotification.opponentNames || []) ||
          existing.daysLate !== (newNotification.daysLate || null) ||
          existing.taskTitle !== (newNotification.taskTitle || null) ||
          existing.judgmentTitle !== (newNotification.judgmentTitle || null) ||
          existing.judgmentCategory !==
            (newNotification.judgmentCategory || null);

        if (needsUpdate) {
          operations.push({
            method: "update",
            ref: doc(db, "notifications", existing.firestoreId),
            data: {
              message: newNotification.message,
              type: newNotification.type,
              sessionDate: newNotification.sessionDate || null,
              dueDate: newNotification.dueDate || null,
              judgmentDate: newNotification.judgmentDate || null,
              caseNumber: newNotification.caseNumber,
              caseCourt:
                newNotification.caseCourt || newNotification.court || null,
              clientNames: newNotification.clientNames || [],
              opponentNames: newNotification.opponentNames || [],
              daysLate: newNotification.daysLate || null,
              taskTitle: newNotification.taskTitle || null,
              judgmentTitle: newNotification.judgmentTitle || null,
              judgmentCategory: newNotification.judgmentCategory || null,
              updatedAt: serverTimestamp(),
            },
          });
        }
      } else {
        operations.push({
          method: "set",
          ref: doc(collection(db, "notifications")),
          data: {
            ...newNotification,
            officeId,
            isReadBy: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }
    }

    // 9. تنفيذ كل العمليات على دفعات؛ لا يتم تجاهل ما يتجاوز 450.
    for (let index = 0; index < operations.length; index += MAX_BATCH) {
      const batch = writeBatch(db);
      const chunk = operations.slice(index, index + MAX_BATCH);

      chunk.forEach((operation) => {
        if (operation.method === "delete") {
          batch.delete(operation.ref);
        } else if (operation.method === "update") {
          batch.update(operation.ref, operation.data);
        } else {
          batch.set(operation.ref, operation.data);
        }
      });

      await batch.commit();
    }

    if (operations.length > 0) {
      console.log(
        `✅ Notifications synced successfully: ${operations.length} operations`
      );
    } else {
      console.log(
        "✅ Notifications already up to date — no changes needed"
      );
    }
  } catch (error) {
    console.error(
      "❌ Error syncing notifications:",
      error
    );
    throw error;
  }
};