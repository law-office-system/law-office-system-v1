/**
 * migrateOfficeIds.cjs — سكربت الترحيل النهائي (Admin SDK)
 *
 * ⚠️ قبل التشغيل:
 * 1. اعمل Export/Backup من Firebase Console (Firestore → ⋮ → Export) — إلزامي
 * 2. serviceAccountKey.json جنب السكربت
 * 3. node migrateOfficeIds.cjs
 *
 * الترتيب: cases ← users | levels/sessions/decisions/judgments ← cases |
 *          transactions/adminTasks ← caseId أو المُنشئ | clientProfiles ← cases |
 *          notifications القديمة ← مسح (التطبيق بيعيد توليدها)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const log = (m) => console.log(`[${new Date().toLocaleTimeString("ar-EG")}] ${m}`);

// ── كاش مستخدمين: uid → officeId ──
const userOfficeCache = new Map();
async function officeIdFromUser(uid) {
  if (!uid) return null;
  if (userOfficeCache.has(uid)) return userOfficeCache.get(uid);
  const snap = await db.collection("users").doc(uid).get();
  const officeId = snap.exists ? snap.data().officeId || null : null;
  userOfficeCache.set(uid, officeId);
  return officeId;
}

async function officeIdFromCase(caseId) {
  if (!caseId) return null;
  const snap = await db.collection("cases").doc(caseId).get();
  return snap.exists ? snap.data().officeId || null : null;
}

// ── جرب تستنتج المكتب من حُقول شائعة في الوثيقة ──
async function inferOfficeId(data) {
  if (data.officeId) return data.officeId;

  // 1) من القضية المرتبطة
  if (data.caseId) {
    const oid = await officeIdFromCase(data.caseId);
    if (oid) return oid;
  }

  // 2) من المستخدم المُنشئ (أي حقل فيه uid)
  const uid = data.createdBy || data.ownerId || data.lawyerId || data.uploadedBy || data.userId || data.uid;
  if (uid) {
    const oid = await officeIdFromUser(uid);
    if (oid) return oid;
  }

  return null;
}

async function fixCollection(coll, { useInference = true } = {}) {
  const snap = await db.collection(coll).get();
  let fixed = 0, skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.officeId) continue;

    const officeId = useInference ? await inferOfficeId(data) : null;
    if (officeId) {
      await doc.ref.update({ officeId, migratedAt: new Date().toISOString() });
      fixed++;
    } else {
      skipped++;
      log(`   ⚠️ ${coll}/${doc.id} — تعذّر الاستنتاج (يحتاج تدخل يدوي)`);
    }
  }

  const icon = skipped === 0 ? "✅" : "🟠";
  log(`${icon} ${coll}: اتصلح ${fixed} | متبقي ${skipped}`);
  return { fixed, skipped, orphans: [] };
}

// ── الحالة 1: القضايا — الاستنتاج من المُنشئ ──
async function fixCases() {
  const snap = await db.collection("cases").get();
  let fixed = 0;
  const orphans = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.officeId) continue;

    const uid = data.createdBy || data.ownerId || data.lawyerId || data.uid || data.addedBy;
    const officeId = uid ? await officeIdFromUser(uid) : null;

    if (officeId) {
      await doc.ref.update({ officeId, migratedAt: new Date().toISOString() });
      fixed++;
    } else {
      orphans.push({ id: doc.id, label: `ق رقم ${data.caseSerial || data.caseNumber || "?"} / ${data.caseYear || "?"}` });
    }
  }

  log(`🟠 cases: اتصلح ${fixed} | يتيم: ${orphans.length}`);
  return orphans;
}

// ── الحالة 2: الموكلين — الاستنتاج من القضايا اللي بترجع لهم ──
async function fixClientProfiles() {
  const snap = await db.collection("clientProfiles").get();
  let fixed = 0;
  const orphans = [];

  for (const profile of snap.docs) {
    const data = profile.data();
    if (data.officeId) continue;

    let officeId = null;
    const tryContains = await db.collection("cases")
      .where("clients", "array-contains", profile.id).limit(1).get();
    if (!tryContains.empty) {
      officeId = tryContains.docs[0].data().officeId || null;
    }

    if (officeId) {
      await profile.ref.update({ officeId, migratedAt: new Date().toISOString() });
      fixed++;
    } else {
      orphans.push({ id: profile.id, label: data.fullName || data.name || "?" });
    }
  }

  log(`🟠 clientProfiles: اتصلح ${fixed} | يتيم: ${orphans.length}`);
  return orphans;
}

// ── الحالة 3: الإشعارات القديمة — مسح (التطبيق بيعيد توليدها) ──
async function purgeOldNotifications() {
  const snap = await db.collection("notifications").get();
  let deleted = 0;

  for (const doc of snap.docs) {
    if (!doc.data().officeId) {
      await doc.ref.delete();
      deleted++;
    }
  }

  log(`🧹 notifications: اتمسح ${deleted} إشعار قديم (هيتولدوا تاني تلقائياً)`);
}

async function audit() {
  log("🔍 فحص:");
  const collections = [
    "cases", "clientProfiles", "litigation_levels", "sessions",
    "decisions", "judgments", "transactions", "documents",
    "notifications", "adminTasks",
  ];
  for (const coll of collections) {
    const snap = await db.collection(coll).get();
    let missing = 0;
    snap.docs.forEach((d) => { if (!d.data().officeId) missing++; });
    log(`   ${coll}: ${snap.size} وثيقة | ناقص: ${missing}`);
  }
}

(async () => {
  log("━━━━━━━━━━━━━━━━━━━━━━");
  log("⏳ هيبدأ الترحيل بعد 5 ثواني... Ctrl+C لو مش جاهز (لازم Backup يكون اتعمل!)");
  await new Promise((r) => setTimeout(r, 5000));

  // 1) القضايا أولاً — كل حاجة تانية معتمدة عليها
  const caseOrphans = await fixCases();

  // 2) المستويات والجلسات والأحكام
  await fixCollection("litigation_levels");
  await fixCollection("sessions");
  await fixCollection("decisions");
  await fixCollection("judgments");

  // 3) المالية والمهام
  await fixCollection("transactions");
  await fixCollection("adminTasks");

  // 4) الموكلين
  const clientOrphans = await fixClientProfiles();

  // 5) الإشعارات القديمة
  await purgeOldNotifications();

  // ── تقرير اليتامى ──
  const allOrphans = [
    ...caseOrphans.map((o) => ({ type: "قضية", ...o })),
    ...clientOrphans.map((o) => ({ type: "موكل", ...o })),
  ];

  log("━━━━━━━━━━━━━━━━━━━━━━");
  if (allOrphans.length) {
    console.log("\n📋 يتامى محتاجين قرار يدوي (امسحهم أو اربطهم بمكتب من Console):");
    allOrphans.forEach((o) => console.log(`   [${o.type}] ${o.label} (${o.id})`));
  } else {
    log("🎉 مفيش يتامى!");
  }

  log("\n🏁 فحص نهائي:");
  await audit();
  process.exit(0);
})().catch((err) => {
  console.error("❌ فشل الترحيل:", err);
  process.exit(1);
});