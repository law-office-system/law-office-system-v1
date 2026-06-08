import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";

export default function Users() {
  const { userData } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // =====================
  // حماية الصفحة (FIXED)
  // =====================
  if (!userData) {
    return <p style={{ padding: 20 }}>جاري التحقق...</p>;
  }

  // 🔥 FIX: بدل role === admin فقط
  if (!userData.isOfficeAdmin) {
    return (
      <p style={{ padding: 20, color: "red", fontWeight: "bold" }}>
        🚫 غير مسموح بالدخول
      </p>
    );
  }

  // =====================
  // تحميل المستخدمين (MULTI-TENANT)
  // =====================
  useEffect(() => {
    fetchUsers();
  }, [userData]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "users"),
        where("officeId", "==", userData.officeId)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setUsers(data);
    } catch (error) {
      console.error("Fetch Users Error:", error);
      alert("حدث خطأ أثناء تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // تغيير الصلاحية
  // =====================
  const changeRole = async (id, role) => {
    try {
      const ref = doc(db, "users", id);

      await updateDoc(ref, { role });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, role } : u
        )
      );
    } catch (error) {
      console.error(error);
      alert("خطأ في تغيير الصلاحية");
    }
  };

  // =====================
  // حذف مستخدم
  // =====================
  const deleteUser = async (id) => {
    if (!window.confirm("هل تريد حذف هذا المستخدم؟")) return;

    try {
      await deleteDoc(doc(db, "users", id));

      setUsers((prev) =>
        prev.filter((u) => u.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert("خطأ أثناء حذف المستخدم");
    }
  };

  // =====================
  // عرض الأدوار
  // =====================
  const roleLabel = (role) => {
    switch (role) {
      case "admin":
        return "مدير النظام";
      case "lawyer":
        return "مسئول";
      case "client":
        return "موكل";
      default:
        return role;
    }
  };

  const roleColor = (role) => {
    switch (role) {
      case "admin":
        return "red";
      case "lawyer":
        return "blue";
      case "client":
        return "green";
      default:
        return "#777";
    }
  };

  // =====================
  // البحث
  // =====================
  const filteredUsers = users.filter(
    (u) =>
      (u.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (u.email || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // =====================
  // Loading
  // =====================
  if (loading) {
    return <p style={{ padding: 20 }}>جاري التحميل...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 إدارة المستخدمين</h2>

      {/* البحث */}
      <input
        placeholder="بحث باسم المستخدم أو البريد..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: 20,
          padding: 10,
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: 6,
        }}
      />

      <p>
        إجمالي المستخدمين: <b>{users.length}</b>
      </p>

      {/* الجدول */}
      <table
        border="1"
        cellPadding="10"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 10,
        }}
      >
        <thead>
          <tr>
            <th>الاسم</th>
            <th>البريد</th>
            <th>الصلاحية الحالية</th>
            <th>تغيير الصلاحية</th>
            <th>حذف</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((u) => (
            <tr key={u.id}>
              <td>{u.name || "-"}</td>
              <td>{u.email || "-"}</td>

              <td
                style={{
                  color: roleColor(u.role),
                  fontWeight: "bold",
                }}
              >
                {roleLabel(u.role)}
              </td>

              <td>
                <select
                  value={u.role || "client"}
                  onChange={(e) =>
                    changeRole(u.id, e.target.value)
                  }
                >
                  <option value="client">موكل</option>
                  <option value="lawyer">مسئول</option>
                  <option value="admin">مدير النظام</option>
                </select>
              </td>

              <td>
                <button
                  onClick={() => deleteUser(u.id)}
                  style={{
                    color: "red",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}