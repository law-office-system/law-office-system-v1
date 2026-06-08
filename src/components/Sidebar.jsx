import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import PermissionGate from "./PermissionGate";
import useNotifications from "../hooks/useNotifications";

export default function Sidebar({ open = true }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { hasNotifications, count } = useNotifications();

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

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
    <div style={styles.sidebar(open)}>

      {/* 📊 DASHBOARD */}
      <PermissionGate permission="dashboard">
        <Item to="/" icon="📊" label="لوحة التحكم" />
      </PermissionGate>

      {/* 🔔 NOTIFICATIONS */}
      <Link
        to="/notifications"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
          gap: open ? "10px" : "0",
          padding: "12px",
          marginBottom: "6px",
          borderRadius: "8px",
          textDecoration: "none",
          color: hasNotifications ? "#ff4d4f" : "white",
          background: hasNotifications ? "#3a1f1f" : "transparent",
          fontSize: "14px",
          transition: "0.2s",
        }}
      >
        <span style={{ fontSize: "18px" }}>🔔</span>

        {open && (
          <>
            <span>التنبيهات</span>

            {hasNotifications && (
              <span
                style={{
                  marginRight: "auto",
                  background: "red",
                  color: "white",
                  borderRadius: "12px",
                  padding: "2px 6px",
                  fontSize: "12px",
                }}
              >
                {count}
              </span>
            )}
          </>
        )}
      </Link>

      {/* 💬 CHAT SYSTEM (UPDATED) */}
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

      {/* 👥 USERS */}
      <PermissionGate permission="users">
        <Item to="/users" icon="👥" label="المستخدمين" />
      </PermissionGate>

      {/* 👤 PROFILE */}
      <Item to="/profile" icon="👤" label="حسابي" />

      {/* 🚪 LOGOUT */}
      <div style={styles.logoutWrapper}>
        <button onClick={handleLogout} style={styles.logout}>
          <span>🚪</span>
          {open && <span>تسجيل الخروج</span>}
        </button>
      </div>

    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  sidebar: (open) => ({
    width: open ? 240 : 70,
    height: "100vh",
    background: "#1f2a36",

    display: "flex",
    flexDirection: "column",

    padding: "10px",
    boxSizing: "border-box",

    transition: "width 0.3s ease",

    overflowX: "hidden",
    overflowY: "auto",

    flexShrink: 0,
  }),

  link: (active, open) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: open ? "flex-start" : "center",
    gap: open ? "10px" : "0",

    padding: "12px",
    marginBottom: "6px",

    borderRadius: "8px",
    textDecoration: "none",

    color: "white",
    background: active ? "#34495e" : "transparent",

    fontSize: "14px",

    whiteSpace: "nowrap",
    overflow: "hidden",
    minWidth: 0,

    transition: "0.2s",
  }),

  icon: {
    fontSize: "18px",
  },

  logoutWrapper: {
    marginTop: "auto",
  },

  logout: {
    width: "100%",
    padding: "12px",

    background: "#c0392b",
    color: "white",

    border: "none",
    borderRadius: "8px",

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
};