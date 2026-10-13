/**
 * resolveOrphans.cjs — الحسم النهائي لليتامى
 *
 * المنطق:
 * 1. يكتشف المكتب الرئيسي بالأغلبية (أكتر officeId في القضايا السليمة)
 * 2. يربط بيه: القضايا اليتيمة ← فالمعاملات والأحكام والمستويات (عبر caseId) ← فالموكلين
 * 3. اللي ميتصلحش (أبو ممسوح) → تقرير للحذف اليدوي
 *
 * التشغيل: node resolveOrphans.cjs
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const log = (m) => console.log(`[${new Date().toLocaleTimeString("ar-EG")}] ${m}`);

const userOfficeCache = new Map();
async function officeIdFromUser(uid) {
  if (!uid || uid === "unknown") return null;
  if (userOfficeCache.has(uid)) return userOfficeCache.get(uid);
  const snap = await db.collection("users").doc(uid).get();
  const oid = snap.exists ? snap.data().officeId || null : null;
  userOfficeCache.set(uid, oid);
  return oid;
}

async function officeIdFromCase(caseId) {
  if (!caseId) return null;
  const snap = await db.collection("cases").doc(caseId).get();
  return snap.exists ? snap.data().officeId || null : null;
}

(async () => {
  // ── 1) اكتشاف المكتب الرئيسي بالأغلبية ──
  const casesSnap = await db.collection("cases").get();
  const counts = {};
  casesSnap.docs.forEach((d) => {
    const o = d.data().officeId;
    if (o) counts[o] = (counts[o] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    console.error("❌ مفيش ولا قضية سليمة — محتاج تدخل يدوي كامل");
    process.exit(1);
  }

  const MAIN = sorted[0][0];
  console.log("\n📊 توزيع المكاتب في القضايا السليمة:");
  sorted.forEach(([id, n]) => {
    console.log(`   ${id === MAIN ? "⭐" : "  "} ${id} — ${n} قضية`);
  });

  if (sorted.length > 1) {
    console.log("\n⚠️ تحذير: فيه أكتر من مكتب! راجع القائمة فوق قبل ما تكمل.");
  }
  console.log(`\n🎯 المكتب المستهدف: ${MAIN} (بالأغلبية)`);
  console.log("⏳ هيبدأ بعد 10 ثواني... Ctrl+C لو المكتب ده غلط!");
  await new Promise((r) => setTimeout(r, 10000));

  // ── 2) القضايا اليتيمة ← المكتب الرئيسي ──
  let caseFixed = 0;
  const stillOrphanCases = [];
  for (const doc of casesSnap.docs) {
    if (doc.data().officeId) continue;
    const label = doc.data().caseNumber || `${doc.data().caseSerial || "?"}/${doc.data().caseYear || "?"}`;
    await doc.ref.update({ officeId: MAIN, migratedAt: new Date().toISOString() });
    caseFixed++;
    log(`⚖️ قضية ${label} → اتربطت بالمكتب`);
  }
  log(`✅ cases: اتصلح ${caseFixed}`);

  // ── 3) كل حاجة ليها caseId ← تستنتج تاني (الأبو بقى مكتمل) ──
  const dangling = [];
  for (const coll of ["transactions", "judgments", "litigation_levels", "adminTasks", "sessions", "decisions"]) {
    const snap = await db.collection(coll).get();
    let fixed = 0, stuck = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.officeId) continue;

      const oid = await officeIdFromCase(data.caseId);
      if (oid) {
        await doc.ref.update({ officeId: oid, migratedAt: new Date().toISOString() });
        fixed++;
      } else {
        stuck++;
        dangling.push({ coll, id: doc.id, label: data.caseNumber || data.title || data.description || "" });
      }
    }
    if (fixed || stuck) log(`🟠 ${coll}: اتصلح ${fixed} | معلق ${stuck}`);
  }

  // ── 4) الموكلين ← من createdBy أو من قضية مكتملة أو المكتب الرئيسي ──
  const profilesSnap = await db.collection("clientProfiles").get();
  for (const profile of profilesSnap.docs) {
    const data = profile.data();
    if (data.officeId) continue;

    // 4أ: من المستخدم المنشئ
    let oid = await officeIdFromUser(data.createdBy || data.uid);

    // 4ب: من قضية مكتملة بترجعله
    if (!oid) {
      const cs = await db.collection("cases")
        .where("clients", "array-contains", profile.id).limit(1).get();
      if (!cs.empty) oid = cs.docs[0].data().officeId || null;
    }

    // 4ج: المكتب الرئيسي (آخر حل)
    if (!oid) {
      oid = MAIN;
      log(`🤚 ${data.fullName || data.name} → اتركز للمكتب الرئيسي (مفيش دليل تاني)`);
    }

    await profile.ref.update({ officeId: oid, migratedAt: new Date().toISOString() });
    log(`👤 موكل ${data.fullName || data.name} → ${oid === MAIN ? "المكتب الرئيسي" : "من المُنشئ"}`);
  }

  // ── 5) الفحص النهائي ──
  log("\n━━━━━━━━━━━━━━━━━━━━━━");
  log("🏁 الفحص النهائي:");

  const collections = ["cases", "clientProfiles", "litigation_levels", "transactions",
    "judgments", "decisions", "sessions", "adminTasks", "notifications", "documents"];

  let totalMissing = 0;
  for (const coll of collections) {
    const snap = await db.collection(coll).get();
    const missing = snap.docs.filter((d) => !d.data().officeId).length;
    totalMissing += missing;
    if (missing) log(`   🔴 ${coll}: ${missing}`);
  }

  if (totalMissing === 0) {
    log("\n🎉🎉 خلاص! صفر وثائق ناقصة — جاهز لنشر الـ Rules الجديدة!");
  } else {
    log(`\n🟠 متبقي ${totalMissing} وثيقة معلقة (أبو ممسوح):`);
    dangling.forEach((d) => console.log(`   [${d.coll}] ${d.label} (${d.id})`));
    console.log("\n👉 القرار: افتحها في Console — لو تست/قديم امسحها، لو مهمة ربطها يدوي.");
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ فشل:", err);
  process.exit(1);
});
