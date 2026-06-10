import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import PermissionGate from "./PermissionGate";
import useNotifications from "../hooks/useNotifications";

export default function Sidebar({ open }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasNotifications, count } = useNotifications();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const Item = ({ to, icon, label }) => (
    <Link to={to} style={styles.link(isActive(to), open)}>
      <span style={styles.icon}>{icon}</span>
      {open && <span>{label}</span>}
    </Link>
  );

  return (
    <div style={styles.sidebar}>
      {/* 📊 DASHBOARD */}
      <PermissionGate permission="dashboard">
        <Item to="/" icon="📊" label="لوحة التحكم" />
      </PermissionGate>

      {/* 🔔 NOTIFICATIONS */}
      <Link to="/notifications" style={styles.link(isActive("/notifications"), open)}>
        <span style={styles.icon}>🔔</span>
        {open && (
          <div style={styles.notificationRow}>
            <span>التنبيهات</span>
            {hasNotifications && <span style={styles.badge}>{count}</span>}
          </div>
        )}
      </Link>

      {/* 💬 CHAT */}
      <Item to="/chat" icon="💬" label="الرسائل" />

      {/* ⚖️ CASES */}
      <PermissionGate permission="cases">
        <Item to="/cases" icon="⚖️" label="القضايا" />
        <Item to="/add-case" icon="➕" label="إضافة قضية" />
        <Item to="/active-cases" icon="🟢" label="النشطة" />
        <Item to="/archive" icon="📁" label="الأرشيف" />
      </PermissionGate>

      {/* 👥 CLIENTS */}
      <PermissionGate permission="cases">
        <Item to="/clients" icon="📋" label="الموكلين" />
        <Item to="/clients/add" icon="👤➕" label="إضافة موكل" />
      </PermissionGate>

      {/* 💰 FINANCE */}
      <PermissionGate permission="finance">
        <Item to="/finance" icon="💰" label="المالية" />
      </PermissionGate>

      {/* 👤 PROFILE & LOGOUT */}
      <div style={styles.bottomSection}>
        <Item to="/profile" icon="👤" label="حسابي" />
        <button onClick={handleLogout} style={styles.logout(open)}>
          <span>🚪</span>
          {open && <span>خروج</span>}
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "10px",
    boxSizing: "border-box",
    overflowY: "auto",
    overflowX: "hidden",
  },
  link: (active, open) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: open ? "flex-start" : "center",
    gap: open ? "10px" : "0",
    padding: "12px",
    marginBottom: "4px",
    borderRadius: "8px",
    textDecoration: "none",
    color: active ? "#fff" : "#94a3b8",
    background: active ? "#334155" : "transparent",
    fontSize: "14px",
    transition: "0.2s",
  }),
  icon: { fontSize: "18px" },
  notificationRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 },
  badge: { background: "#ef4444", color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "10px" },
  bottomSection: { marginTop: "auto", borderTop: "1px solid #334155", paddingTop: "10px" },
  logout: (open) => ({
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "#f87171",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: open ? "flex-start" : "center",
    gap: "10px",
    fontSize: "14px",
  }),
};