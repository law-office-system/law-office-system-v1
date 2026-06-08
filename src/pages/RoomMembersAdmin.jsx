import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { updateMemberRole, removeMemberFromRoom } from "../services/roomMembers";
import { useAuth } from "../context/AuthContext";

export default function RoomMembersAdmin() {
  const { roomId } = useParams();
  const { userData, loading: authLoading } = useAuth();
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");

  if (authLoading) return <p>جاري التحقق من الصلاحيات...</p>;
  if (!userData?.isOfficeAdmin) return <p style={{ color: "red", padding: 20 }}>🚫 غير مسموح بالدخول</p>;

  useEffect(() => {
    if (!roomId || !userData?.officeId) return;
    fetchData();
  }, [roomId, userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. جلب أعضاء الغرفة الحالية فقط
      const membersQuery = query(collection(db, "roomMembers"), where("roomId", "==", roomId));
      
      // 2. جلب المستخدمين التابعين لنفس المكتب فقط (بناءً على officeId)
      const usersQuery = query(
        collection(db, "users"), 
        where("officeId", "==", userData.officeId)
      );

      const [membersSnap, usersSnap] = await Promise.all([
        getDocs(membersQuery),
        getDocs(usersQuery)
      ]);

      setMembers(membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (user) => {
    if (members.find((m) => m.uid === user.uid)) return alert("المستخدم موجود بالفعل");
    await addDoc(collection(db, "roomMembers"), {
      roomId,
      uid: user.uid,
      name: user.name || "User",
      role: "member",
      canSend: true,
    });
    fetchData(); 
  };

  const changeRole = async (member, role) => {
    await updateMemberRole(member.id, role);
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
  };

  const toggleSendPermission = async (member) => {
    const newStatus = !member.canSend;
    await updateDoc(doc(db, "roomMembers", member.id), { canSend: newStatus });
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, canSend: newStatus } : m)));
  };

  const removeMember = async (member) => {
    if (!window.confirm("حذف العضو؟")) return;
    await removeMemberFromRoom(member.id);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  };

  const filteredUsers = useMemo(() => 
    users.filter((u) => 
      !members.some((m) => m.uid === u.uid) && 
      (u.name || "").toLowerCase().includes(searchUsers.toLowerCase()) && 
      u.role !== "client" && 
      u.role !== "super_admin"
    ), [users, members, searchUsers]);

  if (loading) return <p>جاري تحميل البيانات...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>⚙️ إدارة أعضاء الغرفة</h2>
      
      <h3>➕ إضافة أعضاء</h3>
      <input 
        placeholder="بحث في الموظفين..." 
        value={searchUsers} 
        onChange={(e) => setSearchUsers(e.target.value)} 
        style={{ width: "100%", padding: 10, marginBottom: 10 }} 
      />
      
      <div style={{ border: "1px solid #ddd", margin: "10px 0", maxHeight: 200, overflowY: "auto" }}>
        {filteredUsers.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
            <span>{u.name} ({u.role})</span>
            <button onClick={() => addMember(u)} style={{ background: "green", color: "white" }}>إضافة</button>
          </div>
        ))}
      </div>

      <h3>👥 الأعضاء الحاليين</h3>
      {members.map((m) => (
        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, border: "1px solid #ddd", marginBottom: 10 }}>
          <div>
            <b>{m.name}</b> <br />
            <span style={{ color: m.canSend ? "green" : "red" }}>{m.canSend ? "✅ مسموح بالإرسال" : "❌ ممنوع الإرسال"}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => toggleSendPermission(m)} style={{ background: m.canSend ? "#ffc107" : "#28a745", color: "white", border: "none" }}>
              {m.canSend ? "منع الإرسال" : "سماح بالإرسال"}
            </button>
            <select value={m.role} onChange={(e) => changeRole(m, e.target.value)}>
              <option value="member">عضو</option>
              <option value="admin">مدير</option>
            </select>
            <button onClick={() => removeMember(m)} style={{ color: "red" }}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}