import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebaseDb";

/**
 * 🔐 جلب بيانات عضوية المستخدم في غرفة واحدة
 */
export const getRoomMember = async (roomId, uid) => {
  if (!roomId || !uid) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", uid)
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
export const getRoomAccess = async (roomId, uid) => {
  const member = await getRoomMember(roomId, uid);
  const role = member?.role || null;

  return {
    exists: !!member,
    role: role,
    isMember: !!member,
    isAdmin: role === "admin" || role === "owner",
    isOwner: role === "owner",
    canSend: member?.canSend !== false,
    raw: member,
  };
};

/**
 * 📡 الاستماع الفوري لغرف المستخدم (لـ Sidebar)
 */
export const listenUserRooms = (uid, cb) => {
  if (!uid) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("uid", "==", uid)
  );

  return onSnapshot(q, (snap) => {
    const roomIds = snap.docs.map(doc => doc.data().roomId);

    if (roomIds.length === 0) {
      cb([]);
      return;
    }

    // تقسيم الاستعلام إذا كان عدد الغرف كبير
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < roomIds.length; i += batchSize) {
      batches.push(roomIds.slice(i, i + batchSize));
    }

    const rooms = [];
    let completed = 0;

    batches.forEach(batch => {
      const roomsQuery = query(
        collection(db, "rooms"), 
        where("__name__", "in", batch)
      );

      onSnapshot(roomsQuery, (roomSnap) => {
        const batchRooms = roomSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'internal'
        }));
        rooms.push(...batchRooms);
        completed++;

        if (completed === batches.length) {
          cb(rooms);
        }
      });
    });
  });
};

/**
 * 👑 التحقق من صلاحية العضوية (لـ Chat.jsx)
 */
export const listenRoomRole = (roomId, uid, cb) => {
  if (!roomId || !uid) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", uid)
  );

  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      cb(null);
    } else {
      const data = snap.docs[0].data();
      cb({
        role: data.role,
        canSend: data.canSend !== false,
      });
    }
  });
};