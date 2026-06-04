import { useAuth } from "../context/AuthContext";
import { canAccess } from "../utils/auth";

/**
 * 🔐 بوابة الصلاحيات الموحدة
 * تستخدم لأي عنصر UI (Sidebar, Buttons, Sections)
 */
export default function PermissionGate({ permission, children }) {
  const { userData } = useAuth();

  const role = userData?.role;

  if (!canAccess(permission, role)) return null;

  return children;
}