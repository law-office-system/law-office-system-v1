import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* 💡 نقل كائن التنسيقات هنا في الأعلى يضمن 100% لـ Vite أن يتعرف عليه قبل رندرة الـ JSX */
const styles = {
  sidebar: {
    background: "#ffffff",
    borderLeft: "1px solid #e0e0e0", 
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    transition: "width 0.3s ease",
    overflow: "hidden",
    direction: "rtl" 
  },
  header: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    margin: 0,
    fontSize: "16px",
    color: "#2d3436",
    fontWeight: "bold"
  },
  toggleBtn: {
    cursor: "pointer",
    background: "none",
    border: "none",
    fontSize: "14px",
    color: "#7f8c8d"
  },
  roomsList: {
    flex: 1,
    overflowY: "auto"
  },
  sectionTitle: {
    padding: "15px 15px 5px 15px",
    fontSize: "11px",
    color: "#95a5a6",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  roomItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 15px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    borderRight: "4px solid transparent", 
    borderLeft: "none"
  },
  activeInternalItem: {
    background: "#f0f7ff",
    borderRight: "4px solid #007bff" 
  },
  activeSharedItem: {
    background: "#f4fbf7",
    borderRight: "4px solid #27ae60" 
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#007bff",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    flexShrink: 0
  },
  roomContent: {
    marginRight: "12px", 
    marginLeft: "0px",
    overflow: "hidden",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  sharedRoomNameContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "5px"
  },
  roomName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#2d3436",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  sharedBadge: {
    fontSize: "9px",
    background: "rgba(39, 174, 96, 0.15)",
    color: "#27ae60",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: "bold",
    flexShrink: 0
  },
  lastMsg: {
    fontSize: "11px",
    color: "#95a5a6",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "right"
  },
  empty: {
    padding: "20px",
    color: "#aaa",
    textAlign: "center",
    fontSize: "13px"
  },
  adminFooter: {
    padding: "15px",
    borderTop: "1px solid #eee",
    background: "#ffffff",
    marginTop: "auto"
  },
  adminActions: {
    display: "flex",
    gap: "8px"
  },
  adminBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    background: "#2c3e50",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    gap: "4px"
  }
};

function Sidebar({
  rooms = [],
  sharedRooms = [],
  activeRoomId
}) {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ ...styles.sidebar, width: isOpen ? "280px" : "70px" }}>
      
      {/* ===== HEADER ===== */}
      <div style={styles.header}>
        {isOpen && <h3 style={styles.title}>المحادثات</h3>}

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={styles.toggleBtn}
        >
          {isOpen ? "◀" : "▶"}
        </button>
      </div>

      {/* ===== LIST ===== */}
      <div style={styles.roomsList}>

        {/* ===== Internal Rooms ===== */}
        {rooms.length > 0 && (
          <>
            {isOpen && (
              <div style={styles.sectionTitle}>
                🏢 غرف المكتب الداخلية
              </div>
            )}

            {rooms.map((room) => {
              const isActive = room.id === activeRoomId;
              return (
                <div
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  style={{
                    ...styles.roomItem,
                    ...(isActive ? styles.activeInternalItem : {}),
                    justifyContent: isOpen ? "flex-start" : "center"
                  }}
                >
                  <div style={styles.avatar}>
                    {room.name?.charAt(0)?.toUpperCase() || "R"}
                  </div>

                  {isOpen && (
                    <div style={styles.roomContent}>
                      <div style={styles.roomName}>
                        {room.name || "غرفة داخلية"}
                      </div>
                      <div style={styles.lastMsg}>
                        {room.lastMessage || "لا توجد رسائل بعد..."}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ===== Shared Rooms ===== */}
        {sharedRooms.length > 0 && (
          <>
            {isOpen && (
              <div style={styles.sectionTitle}>
                🤝 قنوات الربط المشتركة
              </div>
            )}

            {sharedRooms.map((room) => {
              const isActive = room.id === activeRoomId;

              const isOfficeA = room.officeA === userData?.officeId;
              const otherOfficeName = isOfficeA ? room.officeBName : room.officeAName;
              const displayName = otherOfficeName || (room.name !== "غرفة تعاون بين المكاتب" ? room.name : "مكتب خارجي متصل");

              return (
                <div
                  key={room.id}
                  onClick={() => navigate(`/shared-rooms/${room.id}`)}
                  style={{
                    ...styles.roomItem,
                    ...(isActive ? styles.activeSharedItem : {}),
                    justifyContent: isOpen ? "flex-start" : "center"
                  }}
                >
                  <div style={{ ...styles.avatar, background: "#27ae60" }}>
                    {displayName?.charAt(0)?.toUpperCase() || "🤝"}
                  </div>

                  {isOpen && (
                    <div style={styles.roomContent}>
                      <div style={styles.sharedRoomNameContainer}>
                        <span style={styles.roomName}>
                          {displayName}
                        </span>
                        <span style={styles.sharedBadge}>خارجي</span>
                      </div>
                      <div style={styles.lastMsg}>
                        {room.lastMessage || `اتصال آمن مع الطرف الآخر`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ===== EMPTY STATE ===== */}
        {rooms.length === 0 && sharedRooms.length === 0 && (
          isOpen && (
            <p style={styles.empty}>
              لا توجد محادثات نشطة حالياً
            </p>
          )
        )}
      </div>

      {/* ===== FOOTER ===== */}
      <div style={styles.adminFooter}>
        <div style={styles.adminActions}>
          <button
            onClick={() => navigate("/office/rooms")}
            style={styles.adminBtn}
          >
            🏢 {isOpen && "الغرف"}
          </button>

          <button
            onClick={() => navigate("/office/connections")}
            style={{
              ...styles.adminBtn,
              background: "#27ae60"
            }}
          >
            🤝 {isOpen && "اتصالات"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(Sidebar);