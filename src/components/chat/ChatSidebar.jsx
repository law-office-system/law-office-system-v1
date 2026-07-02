import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  Globe,
  Plus,
  Menu,
  X,
  MessageCircle,
  Handshake
} from "lucide-react";

// ===== Color Palette - Matching Sidebar =====
const COLORS = {
  bg: "#0a0e1a",
  bgLight: "#111827",
  bgCard: "#1a1f2e",
  border: "rgba(212, 175, 55, 0.15)",
  gold: "#d4af37",
  goldLight: "#f0d878",
  goldDark: "#b8941f",
  goldBg: "rgba(212, 175, 55, 0.08)",
  goldBgActive: "rgba(212, 175, 55, 0.15)",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  red: "#ef4444",
  redLight: "#f87171",
};

export default function ChatSidebar({ 
  rooms, 
  sharedRooms, 
  activeRoomId, 
  isOpen, 
  onToggle, 
  onRoomSelect,
  officesMap = {},      // ← NEW
  userOfficeId = ""     // ← NEW
}) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // الكشف عن حجم الشاشة
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowMobileMenu(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleRoomClick = (roomId, type) => {
    if (type === "shared") navigate(`/shared-rooms/${roomId}`);
    else navigate(`/rooms/${roomId}`);
    if (isMobile) { setShowMobileMenu(false); if (onRoomSelect) onRoomSelect(); }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "الآن";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}د`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}س`;
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  // ✅ Helper: get the OTHER office name for shared rooms
  const getSharedRoomDisplayName = (room) => {
    if (!room || !userOfficeId) return room?.name || "غرفة مشتركة";

    const otherOfficeId = room.officeA === userOfficeId ? room.officeB : room.officeA;
    const otherOfficeName = officesMap[otherOfficeId];

    if (otherOfficeName) {
      return `${otherOfficeName}`;  // "مكتب الأمل"
    }
    return room.name || "غرفة مشتركة";
  };

  // ===== MOBILE: Floating Toggle + Drawer =====
  if (isMobile) {
    return (
      <>
        {/* Floating Toggle Button */}
        <button
          onClick={() => setShowMobileMenu(true)}
          style={{
            position: "fixed",
            bottom: "80px",
            left: "20px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: COLORS.sendBtn,
            border: "none",
            color: "#0a0e1a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(212, 175, 55, 0.4)",
            zIndex: 80,
            fontSize: "20px",
          }}
        >
          <Menu size={24} />
        </button>

        {/* Mobile Overlay */}
        {showMobileMenu && (
          <>
            <div onClick={() => setShowMobileMenu(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 90 }} />
            <div style={{ position: "fixed", top: 0, right: 0, width: "85%", maxWidth: "320px", height: "100vh", background: COLORS.bg, zIndex: 95, display: "flex", flexDirection: "column", animation: "slideIn 0.3s ease" }}>
              <MobileContent 
                rooms={rooms} 
                sharedRooms={sharedRooms} 
                activeRoomId={activeRoomId} 
                onRoomClick={handleRoomClick} 
                formatTime={formatTime} 
                onClose={() => setShowMobileMenu(false)}
                officesMap={officesMap}
                userOfficeId={userOfficeId}
                getSharedRoomDisplayName={getSharedRoomDisplayName}
              />
            </div>
          </>
        )}
      </>
    );
  }

  // ===== DESKTOP: Collapsible Sidebar =====
  return (
    <div style={{
      width: isOpen ? 280 : 80,
      height: "100%",
      background: COLORS.bg,
      borderLeft: `1px solid ${COLORS.border}`,
      display: "flex",
      flexDirection: "column",
      transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Toggle Button */}
      <button onClick={onToggle} style={{
        position: "absolute",
        top: "20px",
        left: isOpen ? "260px" : "68px",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: COLORS.bgLight,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textMuted,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        transition: "left 0.3s ease",
        fontSize: "12px",
      }}>
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header */}
      <div style={{
        padding: isOpen ? "20px" : "16px 8px",
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: isOpen ? "flex-start" : "center",
        gap: isOpen ? "10px" : "0",
        minHeight: "64px",
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #d4af37, #b8941f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <MessageSquare size={20} color="#0a0e1a" />
        </div>
        {isOpen && (
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: COLORS.gold }}>المحادثات</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: COLORS.textMuted }}>{rooms.length + sharedRooms.length} غرفة</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: isOpen ? "12px" : "8px 4px" }}>
        {/* Internal Rooms */}
        <Section icon={Building2} title="غرف المكتب" count={rooms.length} isOpen={isOpen}>
          {rooms.length === 0 ? (
            <EmptyState isOpen={isOpen} text="لا توجد غرف" />
          ) : (
            rooms.map((room) => (
              <RoomItem key={room.id} room={room} isActive={activeRoomId === room.id} isOpen={isOpen} onClick={() => handleRoomClick(room.id, "internal")} formatTime={formatTime} icon="#" />
            ))
          )}
        </Section>

        {isOpen && <div style={{ height: "1px", background: COLORS.border, margin: "12px 0" }} />}

        {/* Shared Rooms */}
        <Section icon={Globe} title="غرف مشتركة" count={sharedRooms.length} isOpen={isOpen}>
          {sharedRooms.length === 0 ? (
            <EmptyState isOpen={isOpen} text="لا توجد غرف" />
          ) : (
            sharedRooms.map((room) => (
              <RoomItem 
                key={room.id} 
                room={room} 
                isActive={activeRoomId === room.id} 
                isOpen={isOpen} 
                onClick={() => handleRoomClick(room.id, "shared")} 
                formatTime={formatTime} 
                icon="🤝" 
                isShared
                displayName={getSharedRoomDisplayName(room)}  // ← NEW
              />
            ))
          )}
        </Section>
      </div>

      {/* Action Buttons Footer */}
      <div style={{
        padding: isOpen ? "16px" : "12px 8px",
        borderTop: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}>
        <button
          onClick={() => navigate("/office/rooms")}
          style={{
            width: "100%",
            padding: isOpen ? "10px 14px" : "10px",
            background: COLORS.goldBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "10px",
            color: COLORS.gold,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: isOpen ? "flex-start" : "center",
            gap: isOpen ? "8px" : "0",
            fontSize: "13px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.goldBgActive;
            e.currentTarget.style.borderColor = COLORS.gold;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.goldBg;
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          <MessageCircle size={18} />
          {isOpen && <span>غرفة جديدة</span>}
        </button>

        <button
          onClick={() => navigate("/office/connections")}
          style={{
            width: "100%",
            padding: isOpen ? "10px 14px" : "10px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            borderRadius: "10px",
            color: "#10b981",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: isOpen ? "flex-start" : "center",
            gap: isOpen ? "8px" : "0",
            fontSize: "13px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
            e.currentTarget.style.borderColor = "#10b981";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
            e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.15)";
          }}
        >
          <Handshake size={18} />
          {isOpen && <span>تواصل مع مكتب</span>}
        </button>
      </div>
    </div>
  );
}

// ===== Sub Components =====
function Section({ icon: Icon, title, count, isOpen, children }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ marginBottom: "8px" }}>
      {isOpen ? (
        <button onClick={() => setExpanded(!expanded)} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: "transparent", border: "none", color: COLORS.textMuted,
          cursor: "pointer", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon size={14} /> {title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ background: COLORS.bgLight, padding: "2px 6px", borderRadius: "6px", fontSize: "10px" }}>{count}</span>
            <ChevronRight size={14} style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </div>
        </button>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          <Icon size={18} color={COLORS.textMuted} />
        </div>
      )}
      {expanded && children}
    </div>
  );
}

function RoomItem({ room, isActive, isOpen, onClick, formatTime, icon, isShared, displayName }) {
  // ✅ Use displayName for shared rooms, room.name for internal
  const name = displayName || room.name || "غرفة";

  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: isOpen ? "10px" : "0",
      padding: isOpen ? "10px 12px" : "10px 6px", margin: "2px 0", borderRadius: "10px",
      cursor: "pointer", transition: "all 0.2s",
      background: isActive ? COLORS.goldBgActive : "transparent",
      borderRight: isActive ? `3px solid ${COLORS.gold}` : "3px solid transparent",
      justifyContent: isOpen ? "flex-start" : "center",
    }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
      <div style={{
        width: isOpen ? "40px" : "36px", height: isOpen ? "40px" : "36px", borderRadius: "10px",
        background: isActive ? "linear-gradient(135deg, #d4af37, #b8941f)" : isShared ? "linear-gradient(135deg, #3b82f6, #2563eb)" : COLORS.bgLight,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: isOpen ? "14px" : "12px", fontWeight: "bold", color: "#fff",
      }}>{icon}</div>
      {isOpen && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
            <span style={{ fontSize: "13px", fontWeight: isActive ? "700" : "600", color: isActive ? COLORS.gold : COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </span>
            {room.lastMessageAt && <span style={{ fontSize: "10px", color: COLORS.textMuted, flexShrink: 0 }}>{formatTime(room.lastMessageAt)}</span>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>
              {room.lastMessage || "لا توجد رسائل"}
            </span>
            {(room.unreadCount > 0 || room.status === "pending") && (
              <span style={{ minWidth: "18px", height: "18px", padding: "0 5px", background: room.status === "pending" ? "#f59e0b" : COLORS.gold, color: "#0a0e1a", fontSize: "10px", fontWeight: "bold", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {room.status === "pending" ? "!" : room.unreadCount}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isOpen, text }) {
  if (!isOpen) return null;
  return <div style={{ padding: "16px", textAlign: "center", color: COLORS.textMuted, fontSize: "12px" }}>{text}</div>;
}

function MobileContent({ rooms, sharedRooms, activeRoomId, onRoomClick, formatTime, onClose, officesMap, userOfficeId, getSharedRoomDisplayName }) {
  const navigate = useNavigate();

  return (
    <>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #d4af37, #b8941f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={20} color="#0a0e1a" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: COLORS.gold }}>المحادثات</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: COLORS.textMuted }}>{rooms.length + sharedRooms.length} غرفة</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "8px" }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* Mobile Action Buttons */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button onClick={() => { onClose(); navigate("/office/rooms"); }} style={{ flex: 1, padding: "10px", background: COLORS.goldBg, border: `1px solid ${COLORS.border}`, borderRadius: "10px", color: COLORS.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
            <MessageCircle size={16} /> غرفة جديدة
          </button>
          <button onClick={() => { onClose(); navigate("/office/connections"); }} style={{ flex: 1, padding: "10px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "10px", color: "#10b981", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
            <Handshake size={16} /> تواصل مع مكتب
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", color: COLORS.textMuted, fontSize: "12px", fontWeight: "600" }}>
            <Building2 size={16} /> غرف المكتب ({rooms.length})
          </div>
          {rooms.map((room) => (
            <MobileRoomItem key={room.id} room={room} isActive={activeRoomId === room.id} onClick={() => onRoomClick(room.id, "internal")} formatTime={formatTime} icon="#" />
          ))}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", color: COLORS.textMuted, fontSize: "12px", fontWeight: "600" }}>
            <Globe size={16} /> غرف مشتركة ({sharedRooms.length})
          </div>
          {sharedRooms.map((room) => (
            <MobileRoomItem 
              key={room.id} 
              room={room} 
              isActive={activeRoomId === room.id} 
              onClick={() => onRoomClick(room.id, "shared")} 
              formatTime={formatTime} 
              icon="🤝"
              displayName={getSharedRoomDisplayName(room)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function MobileRoomItem({ room, isActive, onClick, formatTime, icon, displayName }) {
  const name = displayName || room.name || "غرفة";

  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "12px", padding: "12px", margin: "4px 0", borderRadius: "12px",
      background: isActive ? COLORS.goldBgActive : COLORS.bgLight, borderRight: isActive ? `3px solid ${COLORS.gold}` : "3px solid transparent", cursor: "pointer",
    }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: isActive ? "linear-gradient(135deg, #d4af37, #b8941f)" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", color: "#fff", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: COLORS.text }}>{name}</span>
          {room.lastMessageAt && <span style={{ fontSize: "11px", color: COLORS.textMuted }}>{formatTime(room.lastMessageAt)}</span>}
        </div>
        <span style={{ fontSize: "13px", color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{room.lastMessage || "لا توجد رسائل"}</span>
      </div>
      {(room.unreadCount > 0 || room.status === "pending") && (
        <span style={{ minWidth: "22px", height: "22px", background: room.status === "pending" ? "#f59e0b" : COLORS.gold, color: "#0a0e1a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>
          {room.status === "pending" ? "!" : room.unreadCount}
        </span>
      )}
    </div>
  );
}