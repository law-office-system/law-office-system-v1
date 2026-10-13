/**
 * audit.cjs — فحص READ-ONLY (مبيعملش أي تعديل)
 * التشغيل: node audit.cjs
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const log = (msg) => console.log(msg);

(async () => {
  log("🔍 ═══════════════════════════════════");
  log("   فحص شامل — قراءة فقط");
  log("══════════════════════════════════\n");

  const collections = [
    "cases", "clientProfiles", "litigation_levels", "sessions",
    "decisions", "judgments", "transactions", "documents",
    "rooms", "chatRooms", "notifications", "adminTasks",
  ];

  let totalMissing = 0;
  let totalDocs = 0;

  for (const coll of collections) {
    const snap = await db.collection(coll).get();
    let missing = 0;
    const samples = [];

    snap.docs.forEach((d) => {
      if (!d.data().officeId) {
        missing++;
        if (samples.length < 3) samples.push(d.id);
      }
    });

    totalDocs += snap.size;
    totalMissing += missing;

    const status = missing === 0 ? "✅" : missing === snap.size ? "🔴" : "🟠";
    log(`${status} ${coll}: ${snap.size} وثيقة — ناقص officeId: ${missing}`);
    if (missing > 0 && missing < snap.size && samples.length) {
      log(`   أمثلة: ${samples.join(", ")}`);
    }
  }

  log("\n══════════════════════════════════");
  log(`📊 الإجمالي: ${totalDocs} وثيقة — ناقص: ${totalMissing}`);

  if (totalMissing === 0) {
    log("\n🎉 مفيش أي مشكلة! تقدر تروح لخطوة نشر الـ Rules على طول.");
  } else {
    log("\n⚠️ لازم الترحيل الأول — بعدين نشر الـ Rules.");
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ فشل الفحص:", err.message);
  process.exit(1);
});