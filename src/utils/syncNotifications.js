import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  serverTimestamp,
  documentId,
} from "firebase/firestore";
import { generateNotifications } from "./generateNotifications";

// ✅ Cache للـ client names — يدوم 10 دقايق
const clientNamesCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

const getCachedClientNames = async (clientIds) => {
  const now = Date.now();
  const uncachedIds = [];
  const result = {};

  clientIds.forEach((id) => {
    const cached = clientNamesCache.get(id);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      result[id] = cached.name;
    } else {
      uncachedIds.push(id);
    }
  });

  if (uncachedIds.length > 0) {
    for (let i = 0; i < uncachedIds.length; i += 10) {
      const chunk = uncachedIds.slice(i, i + 10);
      try {
        const q = query(
          collection(db, "clientProfiles"),
          where(documentId(), "in", chunk)
        );
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          const data = doc.data();
          const name = data.fullName || data.name || "موكل";
          result[doc.id] = name;
          clientNamesCache.set(doc.id, { name, timestamp: now });
        });
      } catch (err) {
        console.error("❌ Error fetching chunk:", err);
      }
    }
  }

  return result;
};

// ============================================================
// ✅ دالة مساعدة: حذف الإشعارات المرتبطة بجلسة معينة
// ============================================================
export const deleteNotificationsForSession = async (caseId, sessionDate) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("caseId", "==", caseId),
      where("sessionDate", "==", sessionDate)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnap) => {
      batch.delete(doc(db, "notifications", docSnap.id));
    });

    await batch.commit();
    console.log(`✅ تم حذف ${snapshot.docs.length} إشعار للجلسة ${sessionDate}`);
  } catch (error) {
    console.error("❌ خطأ في حذف الإشعارات:", error);
  }
};

// ============================================================
// دالة المزامنة الرئيسية — محسّنة
// ============================================================
export const syncNotifications = async (cases, adminTasks = [], judgments = [], officeId) => {
  if (!officeId) return;

  try {
    // 1. جمع معرفات الموكلين
    const clientIds = new Set();
    cases.forEach((c) => {
      (c.clients || []).forEach((client) => {
        const id = typeof client === "object" ? client.id : client;
        if (id && typeof id === "string") clientIds.add(id);
      });
    });

    // 2. جلب أسماء الموكلين (مع cache)
    const idsArray = Array.from(clientIds).filter((id) => id && typeof id === "string");
    const clientNamesMap = await getCachedClientNames(idsArray);

    // 3. إضافة أسماء الموكلين للقضايا
    const casesWithNames = cases.map((c) => {
      const clientNames = (c.clients || [])
        .map((client) => {
          const id = typeof client === "object" ? client.id : client;
          return clientNamesMap[id] || "";
        })
        .filter(Boolean);

      const opponentNames = (c.opponents || [])
        .map((opp) => (typeof opp === "object" ? opp.name || "" : opp || ""))
        .filter(Boolean);

      return {
        ...c,
        clientNames,
        opponentNames,
      };
    });

    // 4. توليد الإشعارات الجديدة
    const generatedNotifications = generateNotifications(casesWithNames, adminTasks, judgments);
    const generatedIds = new Set(generatedNotifications.map((n) => n.id));

    // 5. جلب الإشعارات الحالية
    const notifRef = collection(db, "notifications");
    const q = query(notifRef, where("officeId", "==", officeId));
    const existingSnap = await getDocs(q);

    const existingMap = new Map();
    existingSnap.docs.forEach((d) => {
      const data = d.data();
      existingMap.set(data.id, {
        firestoreId: d.id,
        ...data,
      });
    });

    const batch = writeBatch(db);
    let opsCount = 0;
    const MAX_BATCH = 450; // Firestore limit = 500, leave margin

    // 6. حذف الإشعارات الزائدة
    for (const [id, existing] of existingMap) {
      if (!generatedIds.has(id)) {
        batch.delete(doc(db, "notifications", existing.firestoreId));
        opsCount++;
      }
    }

    // 7. إضافة/تحديث الإشعارات (فقط لو فيه تغيير فعلي)
    for (const newNotif of generatedNotifications) {
      if (opsCount >= MAX_BATCH) {
        console.warn("⚠️ Batch limit reached, remaining notifications skipped");
        break;
      }

      if (existingMap.has(newNotif.id)) {
        const existing = existingMap.get(newNotif.id);

        // ✅ فقط update لو البيانات اتغيرت
        const needsUpdate =
          existing.message !== newNotif.message ||
          existing.type !== newNotif.type ||
          existing.sessionDate !== (newNotif.sessionDate || null) ||
          existing.dueDate !== (newNotif.dueDate || null) ||
          existing.judgmentDate !== (newNotif.judgmentDate || null) ||
          existing.caseNumber !== newNotif.caseNumber ||
          existing.caseCourt !== newNotif.court ||
          JSON.stringify(existing.clientNames || []) !== JSON.stringify(newNotif.clientNames || []) ||
          JSON.stringify(existing.opponentNames || []) !== JSON.stringify(newNotif.opponentNames || []);

        if (needsUpdate) {
          batch.update(doc(db, "notifications", existing.firestoreId), {
            message: newNotif.message,
            type: newNotif.type,
            sessionDate: newNotif.sessionDate || null,
            dueDate: newNotif.dueDate || null,
            judgmentDate: newNotif.judgmentDate || null,
            caseNumber: newNotif.caseNumber,
            caseCourt: newNotif.court,
            clientNames: newNotif.clientNames,
            opponentNames: newNotif.opponentNames,
            daysLate: newNotif.daysLate || null,
            taskTitle: newNotif.taskTitle || null,
            judgmentTitle: newNotif.judgmentTitle || null,
            judgmentCategory: newNotif.judgmentCategory || null,
            updatedAt: serverTimestamp(),
          });
          opsCount++;
        }
      } else {
        const newDocRef = doc(collection(db, "notifications"));
        batch.set(newDocRef, {
          ...newNotif,
          officeId,
          isReadBy: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        opsCount++;
      }
    }

    if (opsCount > 0) {
      await batch.commit();
      console.log(`✅ Notifications synced! ${opsCount} operations`);
    } else {
      console.log("✅ Notifications already up to date — no changes needed");
    }
  } catch (error) {
    console.error("❌ Error syncing notifications:", error);
  }
};