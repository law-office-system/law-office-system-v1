import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // استيراد useNavigate
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function RoomHeader({ room, currentUser }) {
  const [membersCount, setMembersCount] = useState(0);
  const navigate = useNavigate(); // تهيئة أداة التنقل

  useEffect(() => {
    if (!room?.id) return;
    const q = query(collection(db, "roomMembers"), where("roomId", "==", room.id));
    const unsub = onSnapshot(q, (snap) => setMembersCount(snap.size));
    return () => unsub();
  }, [room?.id]);

  if (!room) return null;

  // دالة التنقل لصفحة الإدارة
  const handleNavigateToAdmin = () => {
    navigate(`/rooms/${room.id}/admin`);
  };

  return (
    <div style={styles.header}>
      <div style={styles.info}>
        <div style={styles.avatar}>
          {room.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={styles.roomName}># {room.name}</h2>
          <div style={styles.meta}>
            <span style={styles.statusDot}>●</span> {membersCount} أعضاء
          </div>
        </div>
      </div>
      
      <div style={styles.actions}>
        <button 
          style={styles.actionBtn} 
          onClick={handleNavigateToAdmin}
          title="إدارة أعضاء الغرفة"
          type="button"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}

const styles = {
  header: { 
    padding: "15px 25px", 
    background: "#fff", 
    borderBottom: "1px solid #eee", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    position: "relative",
    zIndex: 10
  },
  info: { display: "flex", alignItems: "center", gap: "15px" },
  avatar: { 
    width: "45px", height: "45px", borderRadius: "12px", 
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
    color: "#fff", display: "flex", alignItems: "center", 
    justifyContent: "center", fontSize: "18px", fontWeight: "bold" 
  },
  roomName: { margin: 0, fontSize: "18px", color: "#2d3436" },
  meta: { fontSize: "12px", color: "#636e72", display: "flex", alignItems: "center", marginTop: "4px" },
  statusDot: { color: "#00b894", fontSize: "10px", marginRight: "5px" },
  actions: { display: "flex", alignItems: "center" },
  actionBtn: { 
    border: "none", 
    background: "#f8f9fa", 
    padding: "10px 15px", 
    borderRadius: "8px", 
    cursor: "pointer",
    fontSize: "18px",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
};