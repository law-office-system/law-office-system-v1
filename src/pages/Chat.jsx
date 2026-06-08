import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router-dom";
import Sidebar from "../components/chat/Sidebar";
import Messages from "../components/chat/Messages";
import RoomHeader from "../components/chat/RoomHeader";
import { listenToRoomMembers } from "../services/roomMembers";

export default function Chat() {
  const { userData } = useAuth();
  const { roomId } = useParams();
  
  const [rooms, setRooms] = useState([]);
  const [sharedRooms, setSharedRooms] = useState([]); // 1. إضافة حالة لتخزين الغرف المشتركة 💡
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null);

  // ===== أولاً: جلب الغرف الداخلية (الكود الخاص بك كما هو) =====
  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "roomMembers"), where("uid", "==", userData.uid));
    
    const unsubscribeMembers = onSnapshot(q, (snap) => {
      const roomIds = snap.docs.map((d) => d.data().roomId);
      
      if (roomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const roomsQuery = query(collection(db, "rooms"), where("__name__", "in", roomIds.slice(0, 30)));
      
      const unsubscribeRooms = onSnapshot(roomsQuery, (roomSnap) => {
        const myRooms = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRooms(myRooms);
        setLoading(false);
      });

      return () => unsubscribeRooms();
    });

    return () => unsubscribeMembers();
  }, [userData?.uid]);

  // ===== ثانياً: جلب الغرف المشتركة (الخارجية) للمكتب الحالي 💡 =====
  useEffect(() => {
    if (!userData?.officeId) return;

    // استعلام يجلب الغرف المشتركة التي يكون مكتبك طرفاً فيها (A أو B)
    const qA = query(collection(db, "sharedRooms"), where("officeA", "==", userData.officeId));
    const qB = query(collection(db, "sharedRooms"), where("officeB", "==", userData.officeId));

    const unsubA = onSnapshot(qA, (snapA) => {
      const roomsA = snapA.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSharedRooms(prev => {
        const combined = [...roomsA, ...prev.filter(r => r.officeB === userData.officeId)];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
    });

    const unsubB = onSnapshot(qB, (snapB) => {
      const roomsB = snapB.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSharedRooms(prev => {
        const combined = [...prev.filter(r => r.officeA === userData.officeId), ...roomsB];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
    });

    return () => {
      unsubA();
      unsubB();
    };
  }, [userData?.officeId]);

  // تحديد الغرفة النشطة
  const activeRoom = useMemo(() => rooms.find((r) => r.id === roomId) || null, [roomId, rooms]);

  // مراقبة دور المستخدم في الغرفة الحالية
  useEffect(() => {
    if (!activeRoom?.id || !userData?.uid) { 
      setMyRole(null); 
      return; 
    }
    const unsub = listenToRoomMembers(activeRoom.id, (members) => {
      const me = members.find((m) => m.uid === userData.uid || m.userId === userData.uid);
      setMyRole(me?.role || null);
    });
    return () => unsub?.();
  }, [activeRoom?.id, userData?.uid]);

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}>⏳ جاري تحميل البيانات...</div>;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 2. تمرير مصفوفة الغرف المشتركة المستمع لها للـ Sidebar الداخلي 💡 */}
      <Sidebar rooms={rooms} sharedRooms={sharedRooms} activeRoomId={roomId} />
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeRoom ? (
          <>
            <RoomHeader room={activeRoom} userData={userData} />
            <Messages room={activeRoom} currentUser={userData} />
          </>
        ) : (
          <div style={{ padding: 20, textAlign: "center", margin: "auto", fontSize: "16px", color: "#7f8c8d" }}>
            🤝 اختر غرفة محادثة داخلية أو قناة مشتركة للبدء
          </div>
        )}
      </div>
    </div>
  );
}