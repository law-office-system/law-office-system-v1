/**
 * 🔐 نظام الصلاحيات الموحد — Single Source of Truth
 * كل فحوصات الصلاحيات في التطبيق تمر من هنا
 */

export const ROLES = {
  ADMIN: "admin",           // مدير المكتب (وصاحبه — حماية إضافية بـ ownerId)
  LAWYER: "lawyer",         // محامٍ
  SECRETARY: "secretary",   // سكرتير
  CLIENT: "client",         // موكل
  SUPER_ADMIN: "super_admin",
};

/**
 * الصلاحيات على مستوى: المورد (resource) + الإجراء (action)
 * ملاحظة: "admin" يعدّي كل حاجة تلقائياً (زي auth.js القديم) — السوبر أدمن كمان
 */
export const PERMISSIONS = {
  dashboard: {
    view: ["admin", "lawyer", "secretary", "client"],
  },

  cases: {
    view:   ["admin", "lawyer", "secretary"],
    create: ["admin", "lawyer"],
    edit:   ["admin", "lawyer"],
    delete: ["admin"],
  },

  sessions: {
    view:   ["admin", "lawyer", "secretary"],
    create: ["admin", "lawyer"],
    edit:   ["admin", "lawyer"],
    delete: ["admin"],
  },

  judgments: {
    view:   ["admin", "lawyer", "secretary"],
    manage: ["admin", "lawyer"],
    delete: ["admin"],
  },

  clients: {
    view:   ["admin", "lawyer", "secretary"],
    create: ["admin", "lawyer"],
    edit:   ["admin", "lawyer"],
    delete: ["admin"],
  },

  documents: {
    view:   ["admin", "lawyer", "secretary"],
    upload: ["admin", "lawyer", "secretary"],
    delete: ["admin", "lawyer"],
  },

  finance: {
    view: ["admin", "lawyer"],
    add:  ["admin"],
    edit: ["admin"],
    delete: ["admin"],
  },

  archive: {
    view:   ["admin", "lawyer", "secretary"],
    delete: ["admin"],
  },

  users: {
    view:       ["admin"],
    changeRole: ["admin"],
    delete:     ["admin"],
  },

  officeSettings: {
    view: ["admin"],
    edit: ["admin"],
  },

  chat: {
    view: ["admin", "lawyer", "secretary", "client"],
  },

  officeRooms: {
    view:   ["admin", "lawyer", "secretary"],
    manage: ["admin"],
  },

  profile: {
    view: ["admin", "lawyer", "secretary", "client"],
  },
};

/* ═══════════════════════════════════════════════════════
   الفحص الأساسي: هل الدور مسموح له بإجراء على مورد؟
   ═══════════════════════════════════════════════════════ */
export function can(resource, action, userRole) {
  if (!userRole) return false;

  const role = String(userRole).trim();

  // 👑 السوبر أدمن: دخول كامل لكل شيء
  if (role === ROLES.SUPER_ADMIN) return true;

  // 👑 مدير المكتب: كل صلاحيات مكتبه (متوافق مع سلوك auth.js القديم)
  if (role === ROLES.ADMIN) return true;

  const allowed = PERMISSIONS[resource]?.[action];

  // 🚫 أي مورد/إجراء غير معرف = ممنوع (fail-closed)
  if (!Array.isArray(allowed)) {
    console.warn(`⚠️ صلاحية غير معرفة: ${resource}.${action}`);
    return false;
  }

  return allowed.includes(role);
}

/* ═══════════════════════════════════════════════════════
   توافقية مع النظام القديم: مفاتيح الصفحات → (مورد + إجراء)
   ProtectedRoute الحالي بيشتغل بيها من غير أي تعديل
   ═══════════════════════════════════════════════════════ */
export const PAGE_PERMISSIONS = {
  dashboard:    ["dashboard", "view"],
  users:        ["users", "view"],
  cases:        ["cases", "view"],
  addCase:      ["cases", "create"],
  editCase:     ["cases", "edit"],
  activeCases:  ["cases", "view"],
  archive:      ["archive", "view"],
  caseDetails:  ["cases", "view"],
  addSession:   ["sessions", "create"],
  addStage:     ["sessions", "create"],
  caseFinance:  ["finance", "view"],
  finance:      ["finance", "view"],
  profile:      ["profile", "view"],
  chat:         ["chat", "view"],
  officeRooms:  ["officeRooms", "view"],
  documents:    ["documents", "view"],
};

/**
 * 🔐 فحص الصفحات (متوافق 100% مع الاستدعاءات القديمة)
 * الاستخدام: canAccess("cases", role)
 */
export function canAccess(pageKey, userRole) {
  const mapping = PAGE_PERMISSIONS[pageKey];

  if (!mapping) {
    console.warn(`⚠️ صفحة غير معرفة في PAGE_PERMISSIONS: ${pageKey}`);
    return false;
  }

  return can(mapping[0], mapping[1], userRole);
}

/**
 * 👑 هل المستخدم هو صاحب المكتب فعلياً؟
 * الحماية الحقيقية لصاحب المكتب — مش بالدور، بـ ownerId
 */
export function isOfficeOwner(userData, officeData) {
  if (!userData?.uid || !officeData?.ownerId) return false;
  return userData.uid === officeData.ownerId;
}