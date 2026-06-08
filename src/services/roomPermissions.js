import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * 🔐 جلب بيانات العضو مرة واحدة فقط (Single Source of Truth)
 */
export const getRoomMember = async (roomId, userId) => {
  if (!roomId || !userId) return null;

  const q = query(
    collection(db, "roomMembers"),
    where("roomId", "==", roomId),
    where("userId", "==", userId) // 🚨 تم توحيد الاسم إلى userId بناءً على التعديل السابق
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  };
};

/**
 * 🧠 دالة واحدة تحلل وتُرجع كل الصلاحيات في خطوة واحدة
 */
export const getRoomAccess = async (roomId, userId) => {
  const member = await getRoomMember(roomId, userId);

  const role = member?.role || null;

  return {
    exists: !!member,
    role: role,
    isMember: !!member,
    isAdmin: role === "admin" || role === "owner", // الأدمن أو المالك يمتلكان صلاحيات الإدارة
    isOwner: role === "owner",
    raw: member, // لو احتجت البيانات الأصلية في أي وقت
  };
};