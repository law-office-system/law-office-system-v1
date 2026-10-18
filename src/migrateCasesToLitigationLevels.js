// ============================================================
// 📁 FILE: src/migrateCasesToLitigationLevels.js
// Description: One-time migration for old cases
// Run: node src/migrateCasesToLitigationLevels.js
//
// ⚠️ مهم قبل التشغيل:
// 1) املأ firebaseConfig أدناه ببيانات مشروعك الحقيقية (من Firebase Console)
// 2) شغّل الملف مرة واحدة فقط — القضايا المهجّرة تُتخطى تلقائيًا
// 3) يجب أن يكون لدى كل قضية قيمة officeId حتى تظهر الدرجات في النظام
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  query,
  where,
} from "firebase/firestore";

// ⚠️ Your Firebase config — املأه من Firebase Console → Project Settings
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CASES_COL = "cases";
const LEVELS_COL = "litigation_levels";

async function migrateCases() {
  console.log("🚀 Starting migration...");

  const casesSnapshot = await getDocs(collection(db, CASES_COL));
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const caseDoc of casesSnapshot.docs) {
    const caseData = caseDoc.data();
    const caseId = caseDoc.id;

    // ✅ FIX: فلترة بالـ caseId مباشرة بدل جلب كل الدرجات في كل دورة
    const levelsQuery = await getDocs(
      query(collection(db, LEVELS_COL), where("caseId", "==", caseId))
    );

    if (levelsQuery.docs.length > 0) {
      console.log(`⏭️ Case ${caseId} already has levels, skipping...`);
      skipped++;
      continue;
    }

    if (!caseData.officeId) {
      console.warn(`⚠️ Case ${caseId} has no officeId — لا يمكن ترحيلها بأمان، تُتخطى.`);
      failed++;
      continue;
    }

    try {
      // Create initial litigation level from existing case data
      const batch = writeBatch(db);

      const levelRef = doc(collection(db, LEVELS_COL));
      const now = new Date();

      const levelData = {
        caseId,
        officeId: caseData.officeId, // ✅ FIX: بدونه الدرجة لا تظهر أبدًا (الفلترة بالمكتب)
        levelType: mapLitigationDegree(caseData.litigationDegree),
        court: caseData.court || "",
        circuit: caseData.department || "",
        caseNumber: caseData.caseSerial || "",
        caseYear: parseInt(caseData.caseYear) || now.getFullYear(),
        status: mapStageToStatus(caseData.stage),
        isActive: true,
        isCompleted: false,
        order: 1,
        sessionCount: (caseData.sessions || []).length,
        filingDate: caseData.createdAt || null,
        judgmentDate: null,
        judgmentAnnouncementDate: null,
        completionDate: null,
        judgmentResult: null,
        judgmentSummary: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(levelRef, levelData);

      // Update case with activeLevelId
      batch.update(doc(db, CASES_COL, caseId), {
        activeLevelId: levelRef.id,
        currentLevel: levelData.levelType,
        currentStatus: levelData.status,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      migrated++;
      console.log(`✅ Migrated case ${caseId} -> Level ${levelRef.id}`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed to migrate case ${caseId}:`, err.message);
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${migrated + skipped + failed}`);
}

// Map old litigationDegree to new levelType
function mapLitigationDegree(degree) {
  const map = {
    "ابتدائي": "first_instance",
    "first_instance": "first_instance",
    "استئناف": "appeal",
    "appeal": "appeal",
    "نقض": "cassation",
    "cassation": "cassation",
    "التماس إعادة النظر": "retrial",
    "retrial": "retrial",
    "تنفيذ": "execution",
    "execution": "execution",
  };
  return map[degree] || "first_instance";
}

// Map old stage to new workflow status
function mapStageToStatus(stage) {
  const map = {
    "جديدة": "new",
    "new": "new",
    "تم قيدها": "registered",
    "registered": "registered",
    "أول جلسة": "first_session",
    "first_session": "first_session",
    "متداولة": "ongoing",
    "ongoing": "ongoing",
    "مؤجلة": "postponed",
    "postponed": "postponed",
    "مرافعة": "pleading",
    "pleading": "pleading",
    "حجز للحكم": "reserved_for_judgment",
    "reserved_for_judgment": "reserved_for_judgment",
    "صدر الحكم": "judgment_issued",
    "judgment_issued": "judgment_issued",
    "تم إعلان الحكم": "judgment_announced",
    "judgment_announced": "judgment_announced",
    "مغلقة": "closed",
    "closed": "closed",
  };
  return map[stage] || "new";
}

migrateCases().catch(console.error);