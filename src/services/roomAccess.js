import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * 🔐 جلب بيانات عضوية المستخدم في غرفة واحدة
 */
export const getRoomMember = async (roomId, userId) => {
  if (!roomId || !userId) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  };
};

/**
 * 🧠 المصدر الموحد للصلاحيات (Single Source of Truth)
 */
export const getRoomAccess = async (roomId, userId) => {
  const member = await getRoomMember(roomId, userId);
  const role = member?.role || null;

  return {
    exists: !!member,
    role: role,
    isMember: !!member,
    isAdmin: role === "admin" || role === "owner", // الأونر والأدمن يملكون صلاحيات التحكم
    isOwner: role === "owner",
    raw: member,
  };
};

/**
 * 📡 الاستماع الفوري لغرف المستخدم (لـ Sidebar)
 */
export const listenUserRooms = (userId, cb) => {
  if (!userId) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("userId", "==", userId)
  );

  return onSnapshot(q, (snap) => {
    const roomIds = snap.docs.map(doc => doc.data().roomId);
    
    // جلب الغرف المتاحة بناءً على الـ roomIds
    if (roomIds.length === 0) {
      cb([]);
      return;
    }

    // ملاحظة: إذا كان لديك عدد غرف كبير جداً (>10)، يفضل تقسيم الاستعلام
    const roomsQuery = query(collection(db, "rooms"), where("__name__", "in", roomIds));
    
    return onSnapshot(roomsQuery, (roomSnap) => {
      const rooms = roomSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cb(rooms);
    });
  });
};

/**
 * 👑 التحقق من صلاحية العضوية (لـ Chat.jsx)
 */
export const listenRoomRole = (roomId, userId, cb) => {
  if (!roomId || !userId) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("userId", "==", userId)
  );

  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      cb(null);
    } else {
      cb(snap.docs[0].data().role);
    }
  });
};