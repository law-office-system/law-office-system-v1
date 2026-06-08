import { useEffect, useState, useMemo } from "react";
import {
  getRoomMembers,
  removeMemberFromRoom,
  updateMemberRole,
} from "../../services/roomMembers";

export default function RoomMembersModal({ roomId, currentUser, onClose }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    // تحميل الأعضاء عند فتح المودال
    loadMembers();
  }, [roomId]);

  const loadMembers = async () => {
    if (!roomId) return;
    const data = await getRoomMembers(roomId);
    setMembers(data);
  };

  const handleRemove = async (memberDocId) => {
    await removeMemberFromRoom(memberDocId);
    loadMembers();
  };

  const handleMakeAdmin = async (memberDocId) => {
    await updateMemberRole(memberDocId, "admin");
    loadMembers();
  };

  // ✅ إضافة حماية: التأكد من وجود currentUser قبل استخدامه
  const canManage = useMemo(() => {
    if (!currentUser || !currentUser.uid) return false;
    const me = members.find((m) => m.uid === currentUser.uid);
    return me?.role === "owner" || me?.role === "admin";
  }, [members, currentUser]);

  // حماية إضافية: إذا لم يتم تحميل بيانات المستخدم بعد، لا نعرض المكون
  if (!currentUser) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* إضافة onClick هنا لإغلاق المودال عند الضغط في الخارج */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3>👥 إدارة أعضاء الغرفة</h3>
          <button onClick={onClose} style={styles.closeBtn}>إغلاق</button>
        </div>

        <div style={styles.list}>
          {members.map((m) => (
            <div key={m.id} style={styles.row}>
              <span>
                {m.name || "مستخدم"} ({m.role})
              </span>

              {canManage && (
                <div style={styles.actions}>
                  {m.role !== "admin" && m.role !== "owner" && (
                    <button onClick={() => handleMakeAdmin(m.id)} style={styles.btn}>
                      ⭐ ترقية
                    </button>
                  )}
                  
                  {m.role !== "owner" && (
                    <button onClick={() => handleRemove(m.id)} style={styles.dangerBtn}>
                      ❌ حذف
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "20px",
    width: "400px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "center",
  },
  actions: { display: "flex", gap: "5px" },
  btn: { cursor: "pointer", fontSize: "12px" },
  dangerBtn: { cursor: "pointer", fontSize: "12px", color: "red" },
  closeBtn: { cursor: "pointer" }
};