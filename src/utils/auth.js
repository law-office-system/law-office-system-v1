import { PERMISSIONS } from "./permissions";

export function canAccess(pageKey, userRole) {
  if (!userRole) return false;

  const role = userRole.trim();

  // 👑 SUPER ADMIN: دخول كامل لكل الصفحات
  if (role === "super_admin") return true;

  // 👑 المدير يملك جميع صلاحيات المكتب فقط
  if (role === "admin") return true;

  const allowed = PERMISSIONS[pageKey];

  // 🚫 أي صفحة غير معرفة = ممنوعة
  if (!allowed) return false;

  return allowed.includes(role);
}