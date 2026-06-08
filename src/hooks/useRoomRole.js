import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

/* ================= LISTEN MEMBERS ================= */
export const listenToRoomMembers = (roomId, callback) => {
  if (!roomId) return;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId)
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    callback(data);
  });
};

/* ================= ADD MEMBER ================= */
export const addMemberToRoom = async (roomId, user, role = "member") => {
  if (!roomId || !user?.uid) return;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", user.uid)
  );

  const snap = await getDocs(q);

  // منع التكرار
  if (!snap.empty) return;

  await addDoc(collection(db, "roomMembers"), {
    roomId,
    uid: user.uid,          // ✅ FIX
    name: user.name || "User",
    role,
    createdAt: new Date(),
  });
};

/* ================= REMOVE MEMBER ================= */
export const removeMemberFromRoom = async (roomId, uid) => {
  if (!roomId || !uid) return;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);

  snap.forEach(async (d) => {
    await deleteDoc(doc(db, "roomMembers", d.id));
  });
};

/* ================= UPDATE ROLE ================= */
export const updateMemberRole = async (roomId, uid, role) => {
  if (!roomId || !uid) return;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);

  snap.forEach(async (d) => {
    await updateDoc(doc(db, "roomMembers", d.id), {
      role,
    });
  });
};

/* ================= GET ROLE ================= */
export const getRole = async (roomId, uid) => {
  if (!roomId || !uid) return { exists: false };

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return { exists: false, role: null };
  }

  const data = snap.docs[0].data();

  return {
    exists: true,
    role: data.role,
  };
};