import { usePermissions } from "../hooks/usePermissions";
import { canAccess } from "../utils/permissions";

/**
 * 🔐 بوابة الصلاحيات الموحدة — تخفي أي عنصر UI
 *
 * الاستخدام الجديد:
 *   <PermissionGate resource="cases" action="delete">
 *     <button>حذف القضية</button>
 *   </PermissionGate>
 *
 * الاستخدام القديم (مازال شغال):
 *   <PermissionGate permission="cases">...</PermissionGate>
 */
export default function PermissionGate({ resource, action, permission, children }) {
  const { can, role } = usePermissions();

  let allowed = false;

  if (resource && action) {
    // ✅ الطريقة الجديدة: فحص دقيق (مورد + إجراء)
    allowed = can(resource, action);
  } else if (permission) {
    // ⚠️ الطريقة القديمة: فحص الصفحة (للتوافقية)
    allowed = canAccess(permission, role);
  }

  if (!allowed) return null;

  return children;
}