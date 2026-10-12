import { useAuth } from "../context/AuthContext";
import { can, canAccess, ROLES } from "../utils/permissions";

/**
 * 🔐 Hook موحد للصلاحيات — استخدمه في أي component
 *
 * @example
 * const { can, role, isAdmin } = usePermissions();
 * can("cases", "delete");        // هل أقدر أحذف قضية؟
 * canAccess("users", role);      // هل أقدر أفتح صفحة المستخدمين؟
 */
export function usePermissions() {
  const { userData } = useAuth();
  const role = userData?.role || null;

  return {
    role,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isAdmin: role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,

    /** فحص إجراء على مورد: can("finance", "add") */
    can: (resource, action) => can(resource, action, role),

    /** فحص صفحة بالمفتاح القديم: canAccessPage("users") */
    canAccessPage: (pageKey) => canAccess(pageKey, role),
  };
}

export default usePermissions;