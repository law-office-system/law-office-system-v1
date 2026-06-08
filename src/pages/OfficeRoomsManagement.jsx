import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { addMemberToRoom } from "../services/roomMembers";

export default function OfficeRoomsManagement() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  // ================= تحميل الغرف =================
  useEffect(() => {
    // التأكد من وجود officeId قبل محاولة التحميل
    if (!userData?.officeId) {
      setLoading(false);
      return;
    }
    loadRooms();
  }, [userData?.officeId]); // الاعتماد على officeId فقط وليس userData كاملاً

  const loadRooms = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "rooms"),
        where("officeId", "==", userData.officeId)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRooms(data);
    } catch (err) {
      console.error("Error loading rooms:", err);
    } finally {
      // ضمان إيقاف الـ loading في كل الحالات
      setLoading(false);
    }
  };

  // ================= إنشاء غرفة =================
  const createRoom = async () => {
    if (!name.trim() || !userData?.uid || !userData?.officeId) return;

    try {
      const docRef = await addDoc(collection(db, "rooms"), {
        name,
        officeId: userData.officeId,
        createdBy: userData.uid,
        status: "active",
        createdAt: new Date().toISOString(),
        lastMessage: "",
        lastMessageAt: null,
      });

      await addMemberToRoom(docRef.id, userData, "admin");

      setName("");
      loadRooms(); // إعادة تحميل القائمة
    } catch (err) {
      console.error("Create Room Error:", err);
    }
  };

  // ================= أرشفة =================
  const toggleArchive = async (room) => {
    const newStatus = room.status === "archived" ? "active" : "archived";
    await updateDoc(doc(db, "rooms", room.id), { status: newStatus });
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, status: newStatus } : r))
    );
  };

  // ================= حذف =================
  const deleteRoom = async (roomId) => {
    if (!window.confirm("هل تريد حذف الغرفة نهائياً؟")) return;
    await deleteDoc(doc(db, "rooms", roomId));
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  // ================= عرض حالة التحميل =================
  if (loading) {
    return (
      <div style={styles.center}>
        <p>⏳ جاري تحميل الغرف...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h2>🏢 إدارة غرف المكتب</h2>

      {/* ================= إنشاء غرفة ================= */}
      {userData?.role === "admin" && (
        <div style={styles.createBox}>
          <input
            placeholder="اسم الغرفة..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
          <button onClick={createRoom} style={styles.addBtn}>
            ➕ إنشاء غرفة
          </button>
        </div>
      )}

      {/* ================= عرض الغرف ================= */}
      <div style={styles.grid}>
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <div key={room.id} style={styles.card}>
              <h3>💬 {room.name}</h3>
              <p>
                الحالة:{" "}
                <b style={{ color: room.status === "archived" ? "red" : "green" }}>
                  {room.status === "archived" ? "مؤرشفة" : "نشطة"}
                </b>
              </p>

              <div style={styles.actions}>
                <button onClick={() => navigate(`/rooms/${room.id}`)} style={styles.openBtn}>
                  دخول
                </button>
                <button onClick={() => navigate(`/rooms/${room.id}/admin`)} style={styles.adminBtn}>
                  أعضاء
                </button>
                {userData?.role === "admin" && (
                  <>
                    <button onClick={() => toggleArchive(room)} style={styles.archiveBtn}>
                      {room.status === "archived" ? "إلغاء أرشفة" : "أرشفة"}
                    </button>
                    <button onClick={() => deleteRoom(room.id)} style={styles.deleteBtn}>
                      حذف
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>لا توجد غرف متاحة حالياً.</p>
        )}
      </div>
    </div>
  );
}

/* ================= styles ================= */
const styles = {
  page: { padding: 20, direction: "rtl" },
  center: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
  createBox: { display: "flex", gap: 10, marginBottom: 20 },
  input: { flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 8 },
  addBtn: { padding: "10px 15px", background: "#2c3e50", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 15 },
  card: { background: "#fff", padding: 15, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  actions: { display: "flex", flexDirection: "column", gap: 8, marginTop: 10 },
  openBtn: { background: "#3498db", color: "#fff", padding: 8, border: "none", borderRadius: 4, cursor: "pointer" },
  adminBtn: { background: "#9b59b6", color: "#fff", padding: 8, border: "none", borderRadius: 4, cursor: "pointer" },
  archiveBtn: { background: "#f39c12", color: "#fff", padding: 8, border: "none", borderRadius: 4, cursor: "pointer" },
  deleteBtn: { background: "#e74c3c", color: "#fff", padding: 8, border: "none", borderRadius: 4, cursor: "pointer" },
};