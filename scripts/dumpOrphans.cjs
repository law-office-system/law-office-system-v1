/**
 * dumpOrphans.cjs — قراءة فقط: يطبع كل الحقول اللي في الوثائق الناقصة officeId
 * التشغيل: node dumpOrphans.cjs
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COLLECTIONS = ["cases", "transactions", "litigation_levels", "judgments", "clientProfiles"];

function truncate(val) {
  const s = typeof val === "object" ? JSON.stringify(val) : String(val);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

(async () => {
  for (const coll of COLLECTIONS) {
    const snap = await db.collection(coll).get();
    const orphans = snap.docs.filter((d) => !d.data().officeId);

    if (!orphans.length) {
      console.log(`\n═══ ${coll}: ✅ مفيش يتامى ═══`);
      continue;
    }

    console.log(`\n═══ ${coll}: ${orphans.length} وثيقة يتيمة ═══`);

    // اطبع أول 3 بس من كل collection عشان ميتعملش زحمة
    for (const doc of orphans.slice(0, 3)) {
      const data = doc.data();
      console.log(`\n─── ${coll}/${doc.id} ───`);
      // اطبع أسماء الحقول الأساسية أول
      const keys = Object.keys(data);
      console.log(`الحقول المتاحة: ${keys.join(", ")}`);
      keys.forEach((k) => {
        console.log(`   ${k}: ${truncate(data[k])}`);
      });
    }

    if (orphans.length > 3) {
      console.log(`\n   … وكمان ${orphans.length - 3} وثائق تانية (ID بس):`);
      orphans.slice(3).forEach((d) => console.log(`   - ${d.id}`));
    }
  }

  console.log("\n✅ الفحص خلص — ده قراءة فقط، مفيش حاجة اتعدلت");
  process.exit(0);
})().catch((err) => {
  console.error("❌ فشل:", err.message);
  process.exit(1);
});
