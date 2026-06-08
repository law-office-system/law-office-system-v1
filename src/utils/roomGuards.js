import { getRole } from "../services/roomPermissions";

/**
 * 🚫 منع غير الأعضاء
 */
export const requireMember = async (roomId, userId) => {
  const res = await getRole(roomId, userId);

  if (!res.exists) {
    throw new Error("NOT_MEMBER");
  }

  return res;
};

/**
 * 👑 منع غير الأدمن
 */
export const requireAdmin = async (roomId, userId) => {
  const res = await getRole(roomId, userId);

  if (res.role !== "admin" && res.role !== "owner") {
    throw new Error("NOT_ADMIN");
  }

  return res;
};