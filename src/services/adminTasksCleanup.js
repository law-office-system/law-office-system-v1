// ============================================================
// 📁 FILE: src/services/adminTasksCleanup.js
// Description: حذف الأعمال الإدارية المنجزة (يدويًا وجماعيًا وتلقائيًا)
// ============================================================
import {
  collection, query, where, getDocs, deleteDoc, doc,
  writeBatch, getDoc,
} from "firebase/firestore";
import { db } from "../firebaseDb";

const BATCH_SIZE = 450; // حد Firestore لكل عملية Batch

// ── قراءة إعداد مدة الاحتفاظ من مستند المكتب ──
// الافتراضي: مفعّل، 30 يوم
export async function getOfficeTaskRetention(officeId) {
  try {
    const snap = await getDoc(doc(db, "offices", officeId));
    if (snap.exists()) {
      const t = snap.data().taskAutoDelete;
      if (t && typeof t === "object") {
        return {
          enabled: t.enabled !== false,
          days: Number(t.days) > 0 ? Number(t.days) : 0,
        };
      }
    }
  } catch (e) {
    console.warn("تعذر قراءة إعداد الحذف التلقائي:", e.message);
  }
  return { enabled: true, days: 30 };
}

// ── استخراج تاريخ إنجاز العمل (completedAt ← updatedAt احتياط) ──
function getCompletedDate(data) {
  const c = data.completedAt;
  if (c?.toDate) return c.toDate();
  if (c) return new Date(c);
  const u = data.updatedAt;
  if (u?.toDate) return u.toDate();
  if (u) return new Date(u);
  return null;
}

// ── الحذف التلقائي: كل عمل منجز أقدم من X يوم ──
// ترجع عدد ما حُذف
export async function cleanupCompletedTasks(officeId, days) {
  if (!officeId || !days || days <= 0) return 0;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const q = query(
    collection(db, "adminTasks"),
    where("officeId", "==", officeId),
    where("status", "==", "completed")
  );
  const snap = await getDocs(q);

  let batch = writeBatch(db);
  let pending = 0;
  let deleted = 0;

  for (const d of snap.docs) {
    const doneAt = getCompletedDate(d.data());
    if (doneAt && doneAt < cutoff) {
      batch.delete(d.ref);
      pending++;
      deleted++;
      if (pending >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        pending = 0;
      }
    }
  }
  if (pending > 0) await batch.commit();
  return deleted;
}

// ── حذف جميع الأعمال المنجزة (زر يدوي جماعي) ──
export async function deleteAllCompletedTasks(officeId) {
  const q = query(
    collection(db, "adminTasks"),
    where("officeId", "==", officeId),
    where("status", "==", "completed")
  );
  const snap = await getDocs(q);

  let batch = writeBatch(db);
  let pending = 0;
  let deleted = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    pending++;
    deleted++;
    if (pending >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();
  return deleted;
}

// ── حذف عمل واحد (للتأكد من ملكية المكتب) ──
export async function deleteTaskSafe(taskId, officeId) {
  const ref = doc(db, "adminTasks", taskId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  if (snap.data().officeId !== officeId) {
    throw new Error("غير مسموح بحذف عمل من مكتب آخر");
  }
  await deleteDoc(ref);
  return true;
}