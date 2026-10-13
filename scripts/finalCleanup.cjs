/**
 * finalCleanup.cjs — الحسم التفاعلي لليتامى الأخيرين
 *
 * - litigation_levels اليتيمة → عرض + سؤال: امسح؟ (غالباً تست داتا)
 * - transactions / judgments اليتيمة → عرض + سؤال: اربط بالمكتب الرئيسي؟
 *
 * التشغيل: node finalCleanup.cjs
 */

const readline = require("readline");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const log = (m) => console.log(`[${new Date().toLocaleTimeString("ar-EG")}] ${m}`);

async function getMainOffice() {
  const snap = await db.collection("cases").get();
  const counts = {};
  snap.docs.forEach((d) => {
    const o = d.data().officeId;
    if (o) counts[o] = (counts[o] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

async function orphans(coll) {
  const snap = await db.collection(coll).get();
  return snap.docs.filter((d) => !d.data().officeId);
}

(async () => {
  const MAIN = await getMainOffice();
  if (!MAIN) { console.error("❌ مفيش مكتب رئيسي"); process.exit(1); }
  console.log(`\n🎯 المكتب الرئيسي: ${MAIN}\n`);

  // ═══ 1) litigation_levels ═══
  const levels = await orphans("litigation_levels");
  if (levels.length) {
    console.log(`══ مستويات تقاضي يتيمة (${levels.length}) ══`);
    levels.forEach((d) => {
      const x = d.data();
      console.log(`   • ق ${x.caseNumber || "?"}/${x.caseYear || "?"} — ${x.court || "?"} (${d.id})`);
    });
    const ans = await ask(`\n⚠️ القضايا الأم لكل دي اتحذفت. تمسح الـ ${levels.length} مستوى؟ (y/n): `);
    if (ans.trim().toLowerCase() === "y") {
      const batch = db.batch();
      levels.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      log(`🧹 اتمسح ${levels.length} مستوى`);
    } else {
      log("⏭️ اتسابوا زي ما هما — اربطهم يدوي من Console لو عايز");
    }
  }

  // ═══ 2) transactions + judgments ═══
  for (const coll of ["transactions", "judgments"]) {
    const docs = await orphans(coll);
    if (!docs.length) continue;

    console.log(`\n══ ${coll === "transactions" ? "معاملات مالية" : "أحكام"} يتيمة (${docs.length}) ══`);
    docs.forEach((d) => {
      const x = d.data();
      console.log(`   • ${x.description || x.title || "?"} — ${x.amount ? x.amount + " جنيه" : x.date || ""} (${d.id})`);
    });
    const ans = await ask(`\n💰 دي سجلات تخص مكتبك غالباً. اربطها بالمكتب الرئيسي؟ (y/n/delete): `);
    const a = ans.trim().toLowerCase();

    if (a === "y") {
      const batch = db.batch();
      docs.forEach((d) => batch.update(d.ref, { officeId: MAIN, migratedAt: new Date().toISOString() }));
      await batch.commit();
      log(`✅ اتربط ${docs.length} وثيقة بالمكتب`);
    } else if (a === "delete") {
      const batch = db.batch();
      docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      log(`🧹 اتمسح ${docs.length} وثيقة`);
    } else {
      log("⏭️ اتسابوا زي ما هما");
    }
  }

  // ═══ الفحص النهائي ═══
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━");
  log("🏁 الفحص النهائي الشامل:");
  const collections = ["cases", "clientProfiles", "litigation_levels", "transactions",
    "judgments", "decisions", "sessions", "adminTasks", "notifications", "documents"];

  let totalMissing = 0;
  for (const coll of collections) {
    const snap = await db.collection(coll).get();
    const missing = snap.docs.filter((d) => !d.data().officeId).length;
    totalMissing += missing;
    console.log(`   ${missing === 0 ? "✅" : "🔴"} ${coll}: ناقص ${missing}`);
  }

  console.log(totalMissing === 0
    ? "\n🎉🎉🎉 صفر وثائق ناقصة في كل المشروع! جاهزين لنشر الـ Rules الجديدة! 🔐"
    : `\n🟠 متبقي ${totalMissing} وثيقة — اتسابت بقرارك`);

  rl.close();
  process.exit(0);
})().catch((err) => { console.error("❌ فشل:", err); rl.close(); process.exit(1); });
