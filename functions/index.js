const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// ===============================
// 🔔 إرسال إشعار متعدد المستخدمين
// ===============================
const sendNotificationToUsers = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: {
      title,
      body,
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens,
  };

  return admin.messaging().sendEachForMulticast(message);
};

// ===============================
// ⚖️ إشعارات تحديث القضايا
// ===============================
exports.onCaseUpdate = functions.firestore
  .document("cases/{caseId}")
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    if (!after) return null;

    const caseId = context.params.caseId;

    const clients = after.clients || [];
    const opponents = after.opponents || [];

    const userIds = [...clients, ...opponents]
      .map((u) => u.id)
      .filter(Boolean);

    if (userIds.length === 0) return null;

    // جلب كل المستخدمين
    const usersSnap = await db.collection("users").get();

    const tokens = [];

    usersSnap.forEach((doc) => {
      const user = doc.data();

      if (userIds.includes(doc.id) && user.fcmToken) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) return null;

    return sendNotificationToUsers(
      tokens,
      "⚖️ تحديث في القضية",
      `تم تحديث بيانات القضية رقم ${after.caseSerial || ""}`,
      {
        type: "case_update",
        caseId,
      }
    );
  });