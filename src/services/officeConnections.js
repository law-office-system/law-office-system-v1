import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  or,
  and,
  getDoc
} from "firebase/firestore";
import { db } from "../firebaseDb";

/* ================= SEND REQUEST ================= */
export const sendConnectionRequest = async (fromOfficeId, targetInviteCode) => {
  const q = query(
    collection(db, "offices"),
    where("inviteCode", "==", targetInviteCode)
  );

  const snap = await getDocs(q);

  if (snap.empty) throw new Error("كود المكتب غير صحيح.");

  const targetOffice = { id: snap.docs[0].id, ...snap.docs[0].data() };

  if (targetOffice.id === fromOfficeId) {
    throw new Error("لا يمكنك ربط مكتبك بنفسه.");
  }

  const checkQ = query(
    collection(db, "officeConnections"),
    and(
      or(
        where("fromOfficeId", "==", fromOfficeId),
        where("toOfficeId", "==", fromOfficeId)
      ),
      where("toOfficeId", "==", targetOffice.id)
    )
  );

  const existing = await getDocs(checkQ);

  if (!existing.empty) {
    throw new Error("يوجد بالفعل طلب اتصال قائم.");
  }

  return await addDoc(collection(db, "officeConnections"), {
    fromOfficeId,
    toOfficeId: targetOffice.id,
    status: "pending",
    createdAt: serverTimestamp(),
  });
};

/* ================= ACCEPT REQUEST + CREATE ROOM ================= */
export const acceptConnectionRequest = async (connectionId) => {
  const connRef = doc(db, "officeConnections", connectionId);

  const snap = await getDoc(connRef);

  if (!snap.exists()) throw new Error("طلب الاتصال غير موجود");

  const data = snap.data();

  // 1. تحديث الحالة
  await updateDoc(connRef, {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });

  // 2. منع التكرار (قوي جدًا)
  const roomCheckQuery = query(
    collection(db, "sharedRooms"),
    where("connectionId", "==", connectionId)
  );

  const roomSnap = await getDocs(roomCheckQuery);

  if (!roomSnap.empty) {
    // الغرفة موجودة بالفعل
    return;
  }

  // 3. إنشاء غرفة مشتركة
  await addDoc(collection(db, "sharedRooms"), {
    officeA: data.fromOfficeId,
    officeB: data.toOfficeId,
    connectionId: connectionId,
    name: `غرفة بين مكتبين`,
    createdAt: serverTimestamp(),
  });
};

/* ================= GET CONNECTIONS ================= */
export const getOfficeConnections = async (officeId) => {
  const q = query(
    collection(db, "officeConnections"),
    and(
      or(
        where("fromOfficeId", "==", officeId),
        where("toOfficeId", "==", officeId)
      )
    )
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/* ================= ACCEPTED CONNECTIONS ================= */
export const getAcceptedConnections = async (officeId) => {
  const q = query(
    collection(db, "officeConnections"),
    and(
      where("status", "==", "accepted"),
      or(
        where("fromOfficeId", "==", officeId),
        where("toOfficeId", "==", officeId)
      )
    )
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => {
    const data = doc.data();
    return data.fromOfficeId === officeId
      ? data.toOfficeId
      : data.fromOfficeId;
  });
};

/* ================= MY ROOMS ================= */
export const getMyOfficeRooms = async (officeId) => {
  const q = query(
    collection(db, "rooms"),
    where("officeId", "==", officeId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/* ================= ROOMS BY OFFICES ================= */
export const getRoomsByOfficeIds = async (officeIds) => {
  if (!officeIds || officeIds.length === 0) return [];

  const q = query(
    collection(db, "rooms"),
    where("officeId", "in", officeIds)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};