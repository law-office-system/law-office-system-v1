import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaUserCircle, FaBars, FaSignOutAlt, FaBuilding } from "react-icons/fa";

// الصفحات العامة اللي مفيش Topbar فيها
const PUBLIC_PAGES = ["/", "/home", "/login", "/register", "/super-login"];

export default function Topbar({ open, setOpen }) {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🚨 لا تظهر Topbar على الصفحات العامة
  if (PUBLIC_PAGES.includes(location.pathname)) {
    return null;
  }

  // 🚨 لا تظهر Topbar لو مفيش user
  if (!user) return null;

  // ✅ دالة لاستخراج اسم المستخدم
  const getUserDisplayName = () => {
    return userData?.name || 
           userData?.displayName || 
           user?.displayName || 
           user?.email || 
           "المستخدم";
  };

  return (
    <div style={styles.topbar}>
      {/* جهة اليمين */}
      <div style={styles.left}>
        <button onClick={() => setOpen(!open)} style={styles.menuBtn}>
          <FaBars size={20} />
        </button>
        {!isMobile && <h3 style={styles.brandTitle}>نظام إدارة المكتب</h3>}
      </div>

      {/* جهة اليسار */}
      <div style={styles.right}>
        {/* ✅ زرار المكتب — رمز فقط */}
        <button 
          onClick={() => navigate("/office")} 
          style={styles.iconBtn}
          title="بيانات المكتب"
        >
          <FaBuilding size={18} />
        </button>

        {/* اسم المستخدم */}
        <div style={styles.userName}>
          <FaUserCircle size={16} style={{ marginLeft: "6px" }} />
          {!isMobile && getUserDisplayName()}
        </div>

        {/* Role badge */}
        {!isMobile && (
          <span style={styles.role(userData?.role)}>
            {userData?.role === "admin" ? "👑" : userData?.role === "lawyer" ? "⚖️" : "👤"}
          </span>
        )}

        <div style={styles.divider} />

        <button onClick={logout} style={styles.logoutBtn}>
          <FaSignOutAlt /> {!isMobile && "خروج"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    height: 65,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 15px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    direction: "rtl",
  },
  left: { display: "flex", alignItems: "center", gap: "10px" },
  right: { display: "flex", alignItems: "center", gap: "10px" },

  menuBtn: { 
    background: "none", 
    border: "none", 
    cursor: "pointer", 
    color: "#64748b", 
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  brandTitle: { 
    fontSize: "15px", 
    fontWeight: "600", 
    color: "#1e293b", 
    margin: 0 
  },

  // ✅ زرار أيقونة فقط
  iconBtn: { 
    background: "#f1f5f9", 
    border: "none", 
    width: "36px",
    height: "36px",
    borderRadius: "50%", 
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    color: "#64748b",
    fontSize: "16px",
    transition: "all 0.2s",
  },

  userName: { 
    display: "flex",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "6px 12px", 
    borderRadius: "20px", 
    fontSize: "13px",
    fontWeight: "500",
    color: "#1e293b",
    gap: "4px",
  },

  divider: { width: "1px", height: "20px", background: "#e2e8f0" },

  logoutBtn: { 
    background: "#fee2e2", 
    color: "#dc2626", 
    border: "none", 
    padding: "6px 10px", 
    borderRadius: "8px", 
    cursor: "pointer",
    display: "flex", 
    alignItems: "center", 
    gap: "5px", 
    fontWeight: "500", 
    fontSize: "13px"
  },

  role: (role) => ({
    padding: "4px 8px", 
    borderRadius: "12px", 
    fontSize: "12px", 
    color: "#fff",
    background: role === "admin" ? "#dc2626" : role === "lawyer" ? "#2563eb" : "#16a34a",
  }),
};