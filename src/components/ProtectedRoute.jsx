import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../utils/auth";

export default function ProtectedRoute({
  children,
  page,
  superOnly = false,
}) {
  const { user, userData, loading } = useAuth();

  // ================= LOADING =================
  if (loading) {
    return <p>⏳ جاري التحميل...</p>;
  }

  // ================= NOT LOGGED IN =================
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ================= WAIT UNTIL USERDATA READY =================
  if (!userData || !userData.role) {
    return <p>⏳ جاري تحميل بيانات المستخدم...</p>;
  }

  const role = userData.role;

  // ================= SUPER ADMIN =================
  if (superOnly && role !== "super_admin") {
    return (
      <div style={{ padding: 20 }}>
        <h2>🚫 هذه الصفحة خاصة بالسوبر أدمن</h2>
        <p>صلاحيتك: {role}</p>
      </div>
    );
  }

  // ================= NORMAL ACCESS =================
  if (!superOnly && page && !canAccess(page, role)) {
    return (
      <div style={{ padding: 20 }}>
        <h2>🚫 ليس لديك صلاحية</h2>
        <p>صلاحيتك: {role}</p>
      </div>
    );
  }

  return children;
}