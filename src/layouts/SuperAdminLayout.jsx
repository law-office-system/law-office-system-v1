import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>👑 Super Admin</h2>

        <button
          onClick={() => navigate("/super-admin")}
          style={{
            ...styles.link,
            ...(isActive("/super-admin") ? styles.active : {}),
          }}
        >
          📊 Dashboard
        </button>

        <button
          onClick={() => navigate("/super-admin/offices")}
          style={{
            ...styles.link,
            ...(isActive("/super-admin/offices") ? styles.active : {}),
          }}
        >
          🏢 المكاتب
        </button>

        <button
          onClick={() => navigate("/notifications")}
          style={{
            ...styles.link,
            ...(isActive("/notifications") ? styles.active : {}),
          }}
        >
          🔔 التنبيهات
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={handleLogout} style={styles.logout}>
          🚪 تسجيل الخروج
        </button>
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "Arial",
  },

  sidebar: {
    width: 260,
    background: "#0f172a",
    color: "#fff",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  logo: {
    marginBottom: 25,
    fontSize: 20,
    fontWeight: "bold",
  },

  link: {
    background: "transparent",
    border: "none",
    color: "#cbd5e1",
    textAlign: "right",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },

  active: {
    background: "#1e293b",
    color: "#fff",
  },

  logout: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: 10,
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 20,
  },

  content: {
    flex: 1,
    padding: 20,
    background: "#f1f5f9",
  },
};