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

  // 👑 Super Admin فقط
  if (superOnly && role !== "super_admin") {
    return <div style={{ padding: 20 }}>🚫 Super Admin Only</div>;
  }

  // 🔐 صلاحيات
  if (!superOnly && page) {
    const allowed = canAccess(page, role);

    if (!allowed) {
      return (
        <div style={{ padding: 20 }}>
          🚫 ليس لديك صلاحية
          <div>Role: {role}</div>
        </div>
      );
    }
  }

  return children;
}