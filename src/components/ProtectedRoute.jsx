import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../utils/permissions";

export default function ProtectedRoute({
  children,
  page,
  superOnly = false,
}) {
  const { user, userData, loading } = useAuth();

  // 🔵 تحميل auth
  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        ⏳ جاري تحميل النظام...
      </div>
    );
  }

  // 🔴 غير مسجل دخول
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🟡 لو user موجود لكن البيانات لم تصل بعد
  if (!userData) {
    return (
      <div style={{ padding: 20 }}>
        ⏳ جاري تحميل بيانات المستخدم...
        <br />
        <small>إذا استمرت هذه الرسالة، هناك مشكلة في Firestore users</small>
      </div>
    );
  }

  // 🟡 حماية إضافية
  if (!userData.role) {
    return (
      <div style={{ padding: 20 }}>
        ⏳ جاري تجهيز الصلاحيات...
      </div>
    );
  }

  const role = userData.role;

  // ✅ DEBUG: Log page prop
  console.log("🔐 ProtectedRoute page prop:", page);
  console.log("🔐 ProtectedRoute user role:", role);

  // 👑 Super Admin فقط
  if (superOnly && role !== "super_admin") {
    return <div style={{ padding: 20 }}>🚫 Super Admin Only</div>;
  }

  // 🔐 صلاحيات
  if (!superOnly && page) {
    console.log("🔐 Checking canAccess for page:", page, "role:", role);
    const allowed = canAccess(page, role);

    console.log("🔐 canAccess result:", allowed);

    if (!allowed) {
      console.log("❌ Access denied, redirecting to /dashboard");
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}