import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../firebase";

import {
  addMemberToRoom,
  removeMemberFromRoom,
  updateMemberRole,
} from "../../services/roomMembers";

// ===== Color Palette - Matching Sidebar =====
const COLORS = {
  bg: "#0a0e1a",
  bgLight: "#111827",
  bgCard: "#1a1f2e",
  border: "rgba(212, 175, 55, 0.15)",
  gold: "#d4af37",
  goldLight: "#f0d878",
  goldBg: "rgba(212, 175, 55, 0.08)",
  goldBgActive: "rgba(212, 175, 55, 0.15)",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  red: "#ef4444",
  redLight: "#f87171",
  green: "#10b981",
};

export default function RoomAdminPanel({ room, userData }) {
  const [members, setMembers] = useState([]);
  const [officeUsers, setOfficeUsers] = useState([]);
  const [myRole, setMyRole] = useState(null);

  /* ================= MY ROLE ================= */
  useEffect(() => {
    if (!room?.id || !userData?.uid) return;

    const q = query(
      collection(db, "roomMembers"),
      where("roomId", "==", room.id),
      where("uid", "==", userData.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setMyRole(null);
        return;
      }
      setMyRole(snap.docs[0].data().role || null);
    });

    return () => unsub();
  }, [room?.id, userData?.uid]);

  const isAdmin = myRole === "admin" || myRole === "owner";

  /* ================= MEMBERS ================= */
  useEffect(() => {
    if (!room?.id) return;

    const q = query(
      collection(db, "roomMembers"),
      where("roomId", "==", room.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMembers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, [room?.id]);

  /* ================= USERS ================= */
  useEffect(() => {
    const q = query(collection(db, "users"));

    const unsub = onSnapshot(q, (snap) => {
      setOfficeUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  /* ================= MEMO ================= */
  const memberIds = useMemo(
    () => members.map((m) => m.uid),
    [members]
  );

  const availableUsers = useMemo(
    () => officeUsers.filter((u) => !memberIds.includes(u.uid)),
    [officeUsers, memberIds]
  );

  /* ================= GUARD ================= */
  if (!room) return null;

  if (!isAdmin) {
    return (
      <div style={{
        padding: "20px",
        color: COLORS.redLight,
        background: COLORS.bgCard,
        borderRadius: "12px",
        border: `1px solid ${COLORS.border}`,
        textAlign: "center",
      }}>
        🚫 لا يوجد صلاحية
      </div>
    );
  }

  return (
    <div style={{
      width: 320,
      background: COLORS.bgLight,
      borderLeft: `1px solid ${COLORS.border}`,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: COLORS.goldBg,
        borderRadius: "12px",
        border: `1px solid ${COLORS.border}`,
      }}>
        <h3 style={{
          margin: 0,
          color: COLORS.gold,
          fontSize: "16px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          👑 إدارة الغرفة
        </h3>
      </div>

      {/* Members Section */}
      <div style={{
        background: COLORS.bgCard,
        borderRadius: "12px",
        border: `1px solid ${COLORS.border}`,
        padding: "16px",
      }}>
        <h4 style={{
          margin: "0 0 12px 0",
          color: COLORS.text,
          fontSize: "14px",
          fontWeight: "600",
          paddingBottom: "8px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          الأعضاء ({members.length})
        </h4>

        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div>
              <div style={{ fontWeight: "600", color: COLORS.text, fontSize: "14px" }}>
                {m.name}
              </div>
              <div style={{
                fontSize: "12px",
                color: m.role === "owner" ? COLORS.gold : m.role === "admin" ? COLORS.green : COLORS.textMuted,
                fontWeight: m.role === "owner" ? "bold" : "normal",
              }}>
                {m.role === "owner" ? "👑 المالك" : m.role === "admin" ? "⚡ Admin" : "👤 عضو"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {/* ROLE UPDATE */}
              {myRole === "owner" && m.role !== "owner" && (
                <select
                  value={m.role}
                  onChange={(e) => updateMemberRole(room.id, m.uid, e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.bg,
                    color: COLORS.text,
                    fontSize: "12px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="member">عضو</option>
                  <option value="admin">Admin</option>
                </select>
              )}

              {/* REMOVE */}
              {m.role !== "owner" && (
                <button
                  onClick={() => removeMemberFromRoom(room.id, m.uid)}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    color: COLORS.redLight,
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  }}
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Users Section */}
      <div style={{
        background: COLORS.bgCard,
        borderRadius: "12px",
        border: `1px solid ${COLORS.border}`,
        padding: "16px",
      }}>
        <h4 style={{
          margin: "0 0 12px 0",
          color: COLORS.text,
          fontSize: "14px",
          fontWeight: "600",
          paddingBottom: "8px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          إضافة أعضاء ({availableUsers.length})
        </h4>

        {availableUsers.length === 0 && (
          <div style={{ fontSize: "13px", color: COLORS.textMuted, textAlign: "center", padding: "20px" }}>
            لا يوجد مستخدمين متاحين
          </div>
        )}

        {availableUsers.map((u) => (
          <div
            key={u.uid}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <span style={{ color: COLORS.text, fontSize: "14px" }}>{u.name}</span>

            <button
              onClick={() => addMemberToRoom(room.id, { uid: u.uid, name: u.name }, "member")}
              style={{
                padding: "6px 14px",
                background: COLORS.goldBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "8px",
                color: COLORS.gold,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.goldBgActive;
                e.currentTarget.style.borderColor = COLORS.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.goldBg;
                e.currentTarget.style.borderColor = COLORS.border;
              }}
            >
              + إضافة
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}