import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaUserCircle, FaBars, FaSignOutAlt, FaBuilding } from "react-icons/fa";

export default function Topbar({ open, setOpen }) {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) return null;

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
        <button onClick={() => navigate("/office")} style={styles.officeBtn}>
          <FaBuilding size={14} /> 
          {!isMobile && (userData?.officeName || "المكتب")}
        </button>

        {!isMobile && (
          <span style={styles.role(userData?.role)}>
            {userData?.role === "admin" ? "👑 Admin" : userData?.role === "lawyer" ? "⚖️ Lawyer" : "👤 Client"}
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
    padding: "0 15px", // تقليل البادنج قليلاً للموبايل
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    direction: "rtl",
  },
  left: { display: "flex", alignItems: "center", gap: "10px" },
  right: { display: "flex", alignItems: "center", gap: "8px" },
  
  menuBtn: { background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "5px" },
  brandTitle: { fontSize: "15px", fontWeight: "600", color: "#1e293b", margin: 0 },
  
  officeBtn: { 
    background: "#f1f5f9", border: "none", padding: "6px 10px", 
    borderRadius: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "13px"
  },
  
  divider: { width: "1px", height: "20px", background: "#e2e8f0" },

  logoutBtn: { 
    background: "#fee2e2", color: "#dc2626", border: "none", 
    padding: "6px 10px", borderRadius: "8px", cursor: "pointer",
    display: "flex", alignItems: "center", gap: "5px", fontWeight: "500", fontSize: "13px"
  },

  role: (role) => ({
    padding: "4px 8px", borderRadius: "12px", fontSize: "10px", color: "#fff",
    background: role === "admin" ? "#dc2626" : role === "lawyer" ? "#2563eb" : "#16a34a",
  }),
};