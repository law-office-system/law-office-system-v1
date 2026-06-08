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
      <div style={{ padding: 10, color: "red" }}>
        🚫 لا يوجد صلاحية
      </div>
    );
  }

  return (
    <div style={{ width: 300, borderLeft: "1px solid #ddd", padding: 10 }}>
      <h3>👑 إدارة الغرفة</h3>

      {/* MEMBERS */}
      <div style={{ marginBottom: 15 }}>
        <h4>الأعضاء</h4>

        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <div>
              <b>{m.name}</b>
              <div style={{ fontSize: 12 }}>{m.role}</div>
            </div>

            <div style={{ display: "flex", gap: 5 }}>
              {/* ROLE UPDATE */}
              {myRole === "owner" && m.role !== "owner" && (
                <select
                  value={m.role}
                  onChange={(e) =>
                    updateMemberRole(room.id, m.uid, e.target.value)
                  }
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              )}

              {/* REMOVE */}
              {m.role !== "owner" && (
                <button
                  onClick={() =>
                    removeMemberFromRoom(room.id, m.uid)
                  }
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <hr />

      {/* ADD USERS */}
      <div>
        <h4>إضافة أعضاء</h4>

        {availableUsers.length === 0 && (
          <div style={{ fontSize: 12, color: "#777" }}>
            لا يوجد مستخدمين متاحين
          </div>
        )}

        {availableUsers.map((u) => (
          <div
            key={u.uid}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span>{u.name}</span>

            <button
              onClick={() =>
                addMemberToRoom(
                  room.id,
                  { uid: u.uid, name: u.name },
                  "member"
                )
              }
            >
              إضافة
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}