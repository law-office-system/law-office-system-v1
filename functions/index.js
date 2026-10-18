const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// ═══════════════════════════════════════════════════════════
// ⚙️ الكولكشنز — مطابقة لقاعدة البيانات الفعلية
// ═══════════════════════════════════════════════════════════
const COLLECTIONS = [
  "cases",
  "clientProfiles",
  "judgments",
  "decisions",
  "litigation_levels",
  "documents",
  "transactions",
  "rooms",
  "messages",
  "sharedRooms",
  "sharedMessages",
  "roomMembers",
  "notifications",
  "adminTasks",
  "officeConnections",
  "users",
];

const BUCKET_NAME = `${process.env.GCLOUD_PROJECT}-firestore-backups`;

// ═══════════════════════════════════════════════════════════
// 🔐 فحوصات الأمان — مطابقة لنظامك: admin يملك كل شيء
// ═══════════════════════════════════════════════════════════
async function assertCanExport(officeId, uid) {
  const [userSnap, officeSnap] = await Promise.all([
    admin.firestore().collection("users").doc(uid).get(),
    admin.firestore().collection("offices").doc(officeId).get(),
  ]);

  if (!officeSnap.exists) {
    throw new functions.https.HttpsError("not-found", "المكتب غير موجود");
  }
  const user = userSnap.data();
  if (!user || user.officeId !== officeId || user.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "غير مصرح — مدير المكتب فقط");
  }
  return officeSnap.data();
}

// ═══════════════════════════════════════════════════════════
// 📊 بناء ملف Excel مقروء من الـ dump
// ═══════════════════════════════════════════════════════════
function addSheet(wb, name, rows, columns) {
  if (!rows || rows.length === 0) return;
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true }] });
  ws.columns = columns;
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EEF7" },
  };
}

async function buildWorkbook(dump) {
  const ExcelJS = require("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "نظام إدارة المكاتب";

  const cases = dump.data.cases || [];
  const d = dump.data;

  // ── القضايا ──
  addSheet(
    wb,
    "القضايا",
    cases.map((c) => ({
      رقم: c.caseNumber,
      سنة: c.caseYear,
      الاسم: c.caseName,
      الموضوع: c.caseSubject,
      المحكمة: c.court,
      الدائرة: c.circuit,
      الحالة: c.currentStatus,
      المستوى: c.currentLevel,
    })),
    [
      { header: "رقم القضية", key: "رقم", width: 12 },
      { header: "السنة", key: "سنة", width: 8 },
      { header: "اسم القضية", key: "الاسم", width: 30 },
      { header: "الموضوع", key: "الموضوع", width: 40 },
      { header: "المحكمة", key: "المحكمة", width: 20 },
      { header: "الدائرة", key: "الدائرة", width: 15 },
      { header: "الحالة", key: "الحالة", width: 12 },
      { header: "المستوى", key: "المستوى", width: 12 },
    ]
  );

  // ── الجلسات (مفكوكة من القضايا) ──
  const sessions = [];
  cases.forEach((c) =>
    (c.sessions || []).forEach((s) =>
      sessions.push({
        قضية: c.caseName,
        رقم: c.caseNumber,
        تاريخ: s.date,
        القرار: s.decisionLabel,
        تفاصيل: s.decisionDetails,
        القادمة: s.nextSessionDate || "",
      })
    )
  );
  addSheet(wb, "الجلسات", sessions, [
    { header: "القضية", key: "قضية", width: 30 },
    { header: "رقم القضية", key: "رقم", width: 12 },
    { header: "تاريخ الجلسة", key: "تاريخ", width: 15 },
    { header: "القرار", key: "القرار", width: 12 },
    { header: "التفاصيل", key: "تفاصيل", width: 35 },
    { header: "الجلسة القادمة", key: "القادمة", width: 15 },
  ]);

  // ── العملاء ──
  addSheet(
    wb,
    "العملاء",
    (d.clientProfiles || []).map((c) => ({
      الاسم: c.fullName,
      الرقم_القومي: c.nationalId,
      هاتف1: c.phone1,
      هاتف2: c.phone2,
      العنوان: c.address,
    })),
    [
      { header: "الاسم", key: "الاسم", width: 30 },
      { header: "الرقم القومي", key: "الرقم_القومي", width: 18 },
      { header: "هاتف 1", key: "هاتف1", width: 15 },
      { header: "هاتف 2", key: "هاتف2", width: 15 },
      { header: "العنوان", key: "العنوان", width: 30 },
    ]
  );

  // ── الأحكام ──
  addSheet(
    wb,
    "الأحكام",
    (d.judgments || []).map((j) => ({
      القضية: j.caseName || j.caseNumber || "",
      النوع: j.type || j.judgmentType || "",
      التاريخ: j.date || j.judgmentDate || "",
      التفاصيل: j.details || j.summary || "",
    })),
    [
      { header: "القضية", key: "القضية", width: 30 },
      { header: "نوع الحكم", key: "النوع", width: 15 },
      { header: "التاريخ", key: "التاريخ", width: 15 },
      { header: "التفاصيل", key: "التفاصيل", width: 45 },
    ]
  );

  // ── المالية ──
  addSheet(
    wb,
    "المالية",
    (d.transactions || []).map((t) => ({
      النوع: t.type,
      المبلغ: t.amount,
      التاريخ: t.date,
      ملاحظات: t.notes || t.description || "",
    })),
    [
      { header: "النوع", key: "النوع", width: 15 },
      { header: "المبلغ", key: "المبلغ", width: 15 },
      { header: "التاريخ", key: "التاريخ", width: 15 },
      { header: "ملاحظات", key: "ملاحظات", width: 40 },
    ]
  );

  return wb;
}

// ═══════════════════════════════════════════════════════════
// 📦 1) النسخ التلقائي اليومي — الساعة 2 الفجر بتوقيت القاهرة
// ═══════════════════════════════════════════════════════════
exports.dailyOfficeBackups = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 540, memory: "1GB", maxInstances: 1 })
  .pubsub.schedule("every day 02:00")
  .timeZone("Africa/Cairo")
  .onRun(async () => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const day = new Date().toISOString().slice(0, 10);

    console.log(`🔄 Starting daily backups for ${day}`);

    const offices = await db.collection("offices").get();
    console.log(`Found ${offices.size} offices`);

    let success = 0, failed = 0;

    for (const office of offices.docs) {
      const officeId = office.id;
      try {
        const dump = {
          officeId,
          exportedAt: new Date().toISOString(),
          version: 1,
          data: {},
        };

        let totalDocs = 0;
        for (const col of COLLECTIONS) {
          const snap = await db.collection(col)
            .where("officeId", "==", officeId)
            .get();
          dump.data[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          totalDocs += snap.size;
        }

        // ── JSON ──
        const filePath = `office-backups/${officeId}/${day}.json`;
        await bucket.file(filePath).save(JSON.stringify(dump), {
          contentType: "application/json",
          resumable: false,
          metadata: {
            contentDisposition: `attachment; filename="backup-${officeId}-${day}.json"`,
          },
        });

        // ── Excel ──
        const xlsxPath = filePath.replace(/\.json$/, ".xlsx");
        try {
          const wb = await buildWorkbook(dump);
          const xlsxBuffer = await wb.xlsx.writeBuffer();
          await bucket.file(xlsxPath).save(xlsxBuffer, {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            resumable: false,
            metadata: {
              contentDisposition: `attachment; filename="backup-${officeId}-${day}.xlsx"`,
            },
          });
        } catch (e) {
          console.error(`⚠️ Excel build failed for ${officeId}:`, e.message);
        }

        await db.collection("offices").doc(officeId)
          .collection("backups").add({
            file: filePath,
            fileXlsx: xlsxPath,
            totalDocs,
            status: "success",
            trigger: "auto",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        success++;
        console.log(`✅ ${officeId}: ${totalDocs} docs`);
      } catch (err) {
        failed++;
        console.error(`❌ ${officeId}:`, err.message);
        await db.collection("offices").doc(officeId)
          .collection("backups").add({
            status: "failed",
            error: err.message,
            trigger: "auto",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }).catch(() => {});
      }
    }

    console.log(`🏁 Done: ${success} succeeded, ${failed} failed`);
  });

// ═══════════════════════════════════════════════════════════
// 📥 2) قائمة نسخ المكتب + روابط تحميل — admin فقط
// ═══════════════════════════════════════════════════════════
exports.listMyBackups = functions
  .region("europe-west1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "سجّل الدخول أولاً");
    }
    const { officeId } = data;
    await assertCanExport(officeId, context.auth.uid);

    const snaps = await admin.firestore()
      .collection("offices").doc(officeId)
      .collection("backups")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const bucket = admin.storage().bucket(BUCKET_NAME);
    const backups = await Promise.all(
      snaps.docs
        .filter((d) => d.data().status === "success")
        .map(async (d) => {
          const [url] = await bucket.file(d.data().file).getSignedUrl({
            action: "read",
            expires: Date.now() + 24 * 60 * 60 * 1000,
          });

          let xlsxUrl = null;
          if (d.data().fileXlsx) {
            [xlsxUrl] = await bucket.file(d.data().fileXlsx).getSignedUrl({
              action: "read",
              expires: Date.now() + 24 * 60 * 60 * 1000,
            });
          }

          return {
            id: d.id,
            date: d.data().createdAt?.toDate?.()?.toISOString?.() || null,
            totalDocs: d.data().totalDocs,
            trigger: d.data().trigger || "auto",
            url,
            xlsxUrl,
          };
        })
    );

    return { backups };
  });

// ═══════════════════════════════════════════════════════════
// ⚡ 3) تصدير فوري بناءً على طلب صاحب المكتب — admin فقط
// ═══════════════════════════════════════════════════════════
exports.exportOfficeNow = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "سجّل الدخول أولاً");
    }
    const { officeId } = data;
    await assertCanExport(officeId, context.auth.uid);

    const db = admin.firestore();
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    const dump = {
      officeId,
      exportedAt: new Date().toISOString(),
      version: 1,
      trigger: "manual",
      data: {},
    };

    let totalDocs = 0;
    for (const col of COLLECTIONS) {
      const snap = await db.collection(col)
        .where("officeId", "==", officeId)
        .get();
      dump.data[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      totalDocs += snap.size;
    }

    // ── JSON ──
    const filePath = `office-backups/${officeId}/manual-${stamp}.json`;
    await bucket.file(filePath).save(JSON.stringify(dump), {
      contentType: "application/json",
      resumable: false,
      metadata: {
        contentDisposition: `attachment; filename="backup-${officeId}-manual.json"`,
      },
    });

    // ── Excel ──
    const xlsxPath = filePath.replace(/\.json$/, ".xlsx");
    const wb = await buildWorkbook(dump);
    const xlsxBuffer = await wb.xlsx.writeBuffer();
    await bucket.file(xlsxPath).save(xlsxBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      resumable: false,
      metadata: {
        contentDisposition: `attachment; filename="backup-${officeId}-manual.xlsx"`,
      },
    });

    const [url] = await bucket.file(filePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });
    const [xlsxUrl] = await bucket.file(xlsxPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await db.collection("offices").doc(officeId)
      .collection("backups").add({
        file: filePath,
        fileXlsx: xlsxPath,
        totalDocs,
        status: "success",
        trigger: "manual",
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { url, xlsxUrl, totalDocs };
  });