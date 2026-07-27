import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Users, Settings } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseDb";

export default function RoomHeader({ room, userData, onMenuToggle, isSidebarOpen, isMobile }) {
  const [membersCount, setMembersCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!room?.id) return;
    const q = query(collection(db, "roomMembers"), where("roomId", "==", room.id));
    const unsub = onSnapshot(q, (snap) => setMembersCount(snap.size));
    return () => unsub();
  }, [room?.id]);

  if (!room) return null;

  const handleNavigateToAdmin = () => {
    navigate(`/rooms/${room.id}/admin`);
  };

  const handleMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onMenuToggle === 'function') {
      onMenuToggle();
    }
  };

  const isShared = room.officeA !== undefined;
  const isOfficeA = room.officeA === userData?.officeId;
  const otherOfficeName = isOfficeA ? room.officeBName : room.officeAName;
  const displayName = isShared 
    ? (otherOfficeName || room.name || "غرفة مشتركة")
    : (room.name || "غرفة محادثة");

  return (
    <div style={{
      padding: "16px 24px",
      background: "#1e293b",
      borderBottom: "1px solid #334155",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "relative",
      zIndex: 10,
      height: "80px",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* ✅ زر القائمة - يظهر على الموبايل */}
        <button
          type="button"
          onClick={handleMenuClick}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "#f8fafc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94a3b8";
          }}
          title={isSidebarOpen ? "إخفاء القائمة" : "إظهار القائمة"}
        >
          <Menu size={20} />
        </button>

        {/* Avatar */}
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: isShared
            ? "linear-gradient(135deg, #3b82f6, #2563eb)"
            : "linear-gradient(135deg, #e94560, #c73e54)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: "bold",
          flexShrink: 0,
        }}>
          {isShared ? "🤝" : displayName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div>
          <h2 style={{
            margin: 0,
            fontSize: "16px",
            color: "#f8fafc",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            {displayName}
            {isShared && (
              <span style={{
                fontSize: "11px",
                padding: "2px 8px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                borderRadius: "6px",
                fontWeight: "500",
              }}>
                مشتركة
              </span>
            )}
          </h2>
          <div style={{
            fontSize: "13px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "4px",
          }}>
            <Users size={14} />
            <span>{membersCount} أعضاء</span>
            <span style={{ color: "#475569" }}>•</span>
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#10b981",
            }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
              }} />
              نشط
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={handleNavigateToAdmin}
          style={{
            padding: "8px 16px",
            background: "rgba(233, 69, 96, 0.1)",
            border: "1px solid rgba(233, 69, 96, 0.2)",
            borderRadius: "8px",
            color: "#e94560",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(233, 69, 96, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(233, 69, 96, 0.1)";
          }}
        >
          <Settings size={14} />
          إدارة
        </button>
      </div>
    </div>
  );
}