import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaUserCircle, FaBars } from "react-icons/fa";

export default function Topbar({ open, setOpen }) {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div style={styles.noUser}>NO USER FOUND</div>;
  }

  return (
    <div style={styles.topbar}>

      {/* LEFT */}
      <div style={styles.left}>
        <button
          onClick={() => setOpen(!open)}
          style={styles.menuBtn}
        >
          <FaBars />
        </button>

        <button onClick={logout} style={styles.logoutBtn}>
          🚪 خروج
        </button>
      </div>

      {/* RIGHT */}
      <div style={styles.right}>

        <FaUserCircle size={22} style={{ color: "#555" }} />

        {/* 🏢 زر المكتب */}
        <button
          onClick={() => navigate("/office")}
          style={styles.username}
        >
          🏢 {userData?.officeName || "المكتب"}
        </button>

        <span style={styles.role(userData?.role)}>
          {userData?.role === "admin"
            ? "👑 Admin"
            : userData?.role === "lawyer"
            ? "⚖️ Lawyer"
            : "👤 Client"}
        </span>

      </div>
    </div>
  );
}

const styles = {
  topbar: {
    height: 60,
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
    background: "#fff",
    borderBottom: "1px solid #eee",
    direction: "rtl",
  },

  left: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  right: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  menuBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  logoutBtn: {
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  username: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
  },

  role: (role) => ({
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    color: "#fff",
    background:
      role === "admin"
        ? "#dc3545"
        : role === "lawyer"
        ? "#007bff"
        : "#28a745",
  }),

  noUser: {
    padding: 10,
    textAlign: "center",
    background: "orange",
  },
};