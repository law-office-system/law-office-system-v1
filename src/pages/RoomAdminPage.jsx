import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseDb";
import {
  addMemberToRoom,
  removeMemberFromRoom,
  updateMemberRole,
} from "../services/roomMembers";

export default function RoomAdminPage() {
  const { roomId } = useParams();

  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);

  /* ================= MEMBERS ================= */
  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(db, "roomMembers"),
      where("roomId", "==", roomId)
    );

    return onSnapshot(q, (snap) => {
      setMembers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });
  }, [roomId]);

  /* ================= ALL USERS ================= */
  useEffect(() => {
    const q = query(collection(db, "users"));

    return onSnapshot(q, (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });
  }, []);

  // إصلاح منطق الفلترة: تأكد من تطابق الحقول المستخدمة (uid مقابل userId)
  // سنستخدم uid كمرجع موحد للمستخدم
  const memberUids = members.map((m) => m.uid || m.userId); 
  const availableUsers = users.filter((u) => !memberUids.includes(u.uid));

  return (
    <div style={styles.container}>
      <h2>👑 إدارة أعضاء الغرفة</h2>

      <h3>الأعضاء الحاليين</h3>
      {members.map((m) => (
        <div key={m.id} style={styles.row}>
          <div>
            {m.name} — <b>{m.role}</b>
          </div>

          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => updateMemberRole(m.id, "admin")}>Admin</button>
            <button onClick={() => updateMemberRole(m.id, "member")}>Member</button>
            <button 
              onClick={() => removeMemberFromRoom(m.id)}
              style={{ color: "red" }}
            >
              حذف
            </button>
          </div>
        </div>
      ))}

      <hr style={{ margin: "20px 0" }} />

      <h3>إضافة أعضاء</h3>
      {availableUsers.map((u) => (
        <div key={u.uid} style={styles.row}>
          <div>{u.name}</div>
          <button
            onClick={() =>
              addMemberToRoom(
                roomId,
                { uid: u.uid, name: u.name }, // إرسال uid لضمان التطابق
                "member"
              )
            }
          >
            إضافة
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: { padding: 20, direction: "rtl" },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderBottom: "1px solid #eee",
    alignItems: "center"
  },
};