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

  // ✅ جلب فردي: كل مستند بيتقيّم لوحده — المرفوض أو المكتب الآخر يتخطى بدون إيقاف الباقي
  for (const id of uncachedIds) {
    try {
      const snap = await getDoc(doc(db, "clientProfiles", id));
      if (!snap.exists()) continue;

      const data = snap.data();
      if (data.officeId !== officeId) continue;

      const name = data.fullName || data.name || "موكل";
      const cacheKey = `${officeId}_${id}`;

      result[id] = name;

      clientNamesCache.set(cacheKey, {
        name,
        timestamp: now,
      });
    } catch (error) {
      // ✅ FIX: تجاهل permission-denied بصمت —
      // مستند غير موجود أو موكل من مكتب شريك في قضية مشتركة = نتخطاه طبيعيًا
      if (error?.code !== "permission-denied") {
        console.error("❌ Error fetching client names:", error);
      }
    }
  }

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
  cases,
  adminTasks = [],
  judgments = [],
  officeId
) => {
  if (!officeId) {
    console.warn(
      "⚠️ Notification sync skipped: officeId is missing"
    );
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
      adminTasks,
      judgments,
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

      existingMap.set(data.id, {
        firestoreId: notificationDoc.id,
        ...data,
      });
    });

    const batch = writeBatch(db);

    let opsCount = 0;
    const MAX_BATCH = 450;

    // 7. حذف الإشعارات القديمة غير الموجودة في الناتج الجديد
    //    (هنا يُمسح تلقائيًا أي إشعار "جلسة من سنة لقضية منتهية" لأن
    //     generateNotifications الجديد لم يعد يُنتجه أصلًا)
    for (const [id, existing] of existingMap) {
      if (!generatedIds.has(id)) {
        if (opsCount >= MAX_BATCH) {
          console.warn(
            "⚠️ Batch limit reached while deleting notifications"
          );
          break;
        }

        batch.delete(
          doc(db, "notifications", existing.firestoreId)
        );

        opsCount++;
      }
    }

    // 8. إضافة الإشعارات الجديدة وتحديث المتغير منها
    for (const newNotification of generatedForOffice) {
      if (opsCount >= MAX_BATCH) {
        console.warn(
          "⚠️ Batch limit reached; remaining notifications skipped"
        );
        break;
      }

      if (!newNotification.id) {
        console.warn(
          "⚠️ Skipping notification without an ID"
        );
        continue;
      }

      if (existingMap.has(newNotification.id)) {
        const existing = existingMap.get(newNotification.id);

        const needsUpdate =
          existing.message !== newNotification.message ||
          existing.type !== newNotification.type ||
          existing.sessionDate !==
            (newNotification.sessionDate || null) ||
          existing.dueDate !==
            (newNotification.dueDate || null) ||
          existing.judgmentDate !==
            (newNotification.judgmentDate || null) ||
          existing.caseNumber !== newNotification.caseNumber ||
          existing.caseCourt !==
            (newNotification.caseCourt || newNotification.court || null) ||
          JSON.stringify(existing.clientNames || []) !==
            JSON.stringify(newNotification.clientNames || []) ||
          JSON.stringify(existing.opponentNames || []) !==
            JSON.stringify(newNotification.opponentNames || []) ||
          existing.daysLate !==
            (newNotification.daysLate || null) ||
          existing.taskTitle !==
            (newNotification.taskTitle || null) ||
          existing.judgmentTitle !==
            (newNotification.judgmentTitle || null) ||
          existing.judgmentCategory !==
            (newNotification.judgmentCategory || null);

        if (needsUpdate) {
          batch.update(
            doc(db, "notifications", existing.firestoreId),
            {
              message: newNotification.message,
              type: newNotification.type,
              sessionDate: newNotification.sessionDate || null,
              dueDate: newNotification.dueDate || null,
              judgmentDate: newNotification.judgmentDate || null,
              caseNumber: newNotification.caseNumber,
              caseCourt: newNotification.caseCourt || newNotification.court || null,
              clientNames: newNotification.clientNames || [],
              opponentNames: newNotification.opponentNames || [],
              daysLate: newNotification.daysLate || null,
              taskTitle: newNotification.taskTitle || null,
              judgmentTitle: newNotification.judgmentTitle || null,
              judgmentCategory:
                newNotification.judgmentCategory || null,
              updatedAt: serverTimestamp(),
            }
          );

          opsCount++;
        }
      } else {
        const newDocRef = doc(
          collection(db, "notifications")
        );

        batch.set(newDocRef, {
          ...newNotification,
          officeId,
          isReadBy: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        opsCount++;
      }
    }

    // 9. تنفيذ التغييرات عند وجود عمليات
    if (opsCount > 0) {
      await batch.commit();

      console.log(
        `✅ Notifications synced successfully: ${opsCount} operations`
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
  }
};