import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

/* =========================
   👥 GET ROOM MEMBERS (تمت الإضافة)
   تُستخدم لجلب البيانات مرة واحدة عند فتح المودال
========================= */
export const getRoomMembers = async (roomId) => {
  if (!roomId) return [];
  const q = query(collection(db, "roomMembers"), where("roomId", "==", roomId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* =========================
   👥 LISTEN ROOM MEMBERS
========================= */
export const listenToRoomMembers = (roomId, cb) => {
  if (!roomId) return () => {};

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId)
  );

  return onSnapshot(q, (snap) => {
    const members = snap.docs.map((d) => ({
      id: d.id, // معرف الوثيقة (Document ID) - ضروري للحذف والتعديل
      ...d.data(),
    }));

    cb(members);
  });
};

/* =========================
   ➕ ADD MEMBER TO ROOM
========================= */
export const addMemberToRoom = async (roomId, user, role = "member") => {
  if (!roomId || !user?.uid) return;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", user.uid)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return; // العضو موجود بالفعل

  await addDoc(collection(db, "roomMembers"), {
    roomId,
    uid: user.uid,
    name: user.name || user.displayName || "مستخدم",
    role,
    status: "member",
    createdAt: serverTimestamp(),
  });
};

/* =========================
   ❌ REMOVE MEMBER
   يجب تمرير الـ id الذي جلبناه من listenToRoomMembers
========================= */
export const removeMemberFromRoom = async (memberDocId) => {
  if (!memberDocId) return;
  await deleteDoc(doc(db, "roomMembers", memberDocId));
};

/* =========================
   🔁 UPDATE ROLE
   يجب تمرير الـ id الذي جلبناه من listenToRoomMembers
========================= */
export const updateMemberRole = async (memberDocId, role) => {
  if (!memberDocId) return;
  await updateDoc(doc(db, "roomMembers", memberDocId), {
    role,
  });
};