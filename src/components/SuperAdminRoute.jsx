import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function SuperAdminRoute({ children }) {
  const { user, userData, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" />;

  if (userData?.role !== "superadmin") {
    return (
      <div style={{ padding: 20 }}>
        <h2>🚫 غير مصرح لك بالدخول</h2>
      </div>
    );
  }

  return children;
}