// ═══════════════════════════════════════════════════════════
// 📦 خدمة النسخ الاحتياطي — بتواصل مع Cloud Functions
// ═══════════════════════════════════════════════════════════
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// ⚠️ لازم نفس الـ region اللي اتنشرت بيها الـ Functions
const fns = getFunctions(getApp(), "europe-west1");

/** 📥 جلب قائمة النسخ الاحتياطية للمكتب */
export async function listBackups(officeId) {
  const fn = httpsCallable(fns, "listMyBackups");
  const { data } = await fn({ officeId });
  return data.backups || [];
}

/** ⚡ تصدير نسخة فورية */
export async function exportNow(officeId) {
  const fn = httpsCallable(fns, "exportOfficeNow");
  const { data } = await fn({ officeId });
  return data; // { url, totalDocs }
}