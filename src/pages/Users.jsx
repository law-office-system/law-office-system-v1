import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { db } from "../firebaseDb";

export default function Users() {
  const { userData } = useAuth();
  const { can } = usePermissions();

  const [users, setUsers] = useState([]);
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const allowed = can("users", "view");

  // ✅ كل الـ hooks فوق — مفيش early returns قبلهم أبداً
  useEffect(() => {
    if (!userData?.officeId || !allowed) return;

    let cancelled = false;

    const load = async () => {
      try {
        // ✅ جلب المستخدمين + بيانات المكتب (ownerId) في نفس الوقت
        const [usersSnap, officeSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "users"),
              where("officeId", "==", userData.officeId)
            )
          ),
          getDoc(doc(db, "offices", userData.officeId)),
        ]);

        if (cancelled) return;

        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // كل من ينتمي إلى المكتب يظهر هنا، حتى إذا لم يكن لديه بريد
        // مسجل في ملفه أو joinMethod بالصيغة المتوقعة. الاستعلام أعلاه
        // مقيّد بـ officeId، لذلك لا يؤدي ذلك إلى إظهار مستخدمي مكتب آخر.
        setUsers(allUsers);
        setOffice(officeSnap.exists() ? officeSnap.data() : null);
      } catch (error) {
        console.error("Fetch Users Error:", error);
        alert("حدث خطأ أثناء تحميل المستخدمين");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userData?.officeId, allowed]);

  // ═══════ الحماية والـ Guards (بعد كل الـ hooks) ═══════

  if (!userData) {
    return <p style={{ padding: 20 }}>جاري التحقق...</p>;
  }

  if (!allowed) {
    return (
      <p style={{ padding: 20, color: "red", fontWeight: "bold" }}>
        🚫 غير مسموح بالدخول — هذه الصفحة لمدير المكتب فقط
      </p>
    );
  }

  if (loading) {
    return <p style={{ padding: 20 }}>جاري التحميل...</p>;
  }

  // ═══════ Helpers ═══════

  /** 👑 هل المستخدم ده هو صاحب المكتب الفعلي؟ */
  const isOfficeOwner = (u) => office?.ownerId && u.id === office.ownerId;
  /** هل ده أنا؟ */
  const isSelf = (u) => u.id === userData.uid;

  // ═══════ Actions ═══════

  const changeRole = async (id, newRole) => {
    const target = users.find((u) => u.id === id);

    // 🚫 ممنوع تغيير دور صاحب المكتب
    if (isOfficeOwner(target)) {
      alert("⚠️ لا يمكن تغيير صلاحية صاحب المكتب");
      return;
    }

    // 🚫 ممنوع تغيير دورك بنفسك (حماية من قفل الحساب بالغلط)
    if (isSelf(target)) {
      alert("⚠️ لا يمكنك تغيير صلاحيتك بنفسك — اطلب من مدير آخر");
      return;
    }

    try {
      await updateDoc(doc(db, "users", id), { role: newRole });

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } catch (error) {
      console.error(error);
      alert("خطأ في تغيير الصلاحية");
    }
  };

  const deleteUser = async (id) => {
    const target = users.find((u) => u.id === id);

    // 🚫 ممنوع حذف صاحب المكتب
    if (isOfficeOwner(target)) {
      alert("⚠️ لا يمكن حذف صاحب المكتب");
      return;
    }

    // 🚫 ممنوع حذف نفسك
    if (isSelf(target)) {
      alert("⚠️ لا يمكنك حذف حسابك من هنا — استخدم صفحة الملف الشخصي");
      return;
    }

    if (!window.confirm(`هل تريد حذف المستخدم "${target?.name}"؟`)) return;

    try {
      await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      // ⚠️ ملاحظة: حساب Firebase Auth بيفضل موجود — بننظفه في المرحلة 4
    } catch (error) {
      console.error(error);
      alert("خطأ أثناء حذف المستخدم");
    }
  };

  // ═══════ عرض الأدوار ═══════

  const roleLabel = (role) => {
    switch (role) {
      case "admin":
        return "مدير المكتب";
      case "lawyer":
        return "محامٍ";
      case "secretary":
        return "سكرتير";
      case "client":
        return "موكل";
      default:
        return role;
    }
  };

  const roleColor = (role) => {
    switch (role) {
      case "admin":
        return "#c0392b";
      case "lawyer":
        return "#2980b9";
      case "secretary":
        return "#8e44ad";
      case "client":
        return "#27ae60";
      default:
        return "#777";
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // ═══════ Render ═══════

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 إدارة المستخدمين</h2>

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

      <table
        border="1"
        cellPadding="10"
        style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}
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
          {filteredUsers.map((u) => {
            const owner = isOfficeOwner(u);
            return (
              <tr key={u.id}>
                <td>
                  {u.name || "-"}
                  {owner && (
                    <span style={{ color: "#c0392b", fontWeight: "bold" }}> 👑</span>
                  )}
                </td>
                <td>{u.email || "-"}</td>

                <td style={{ color: roleColor(u.role), fontWeight: "bold" }}>
                  {roleLabel(u.role)}
                  {owner && " (صاحب المكتب)"}
                </td>

                <td>
                  <select
                    value={u.role || "client"}
                    disabled={owner || isSelf(u)}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    style={owner || isSelf(u) ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    <option value="client">موكل</option>
                    <option value="secretary">سكرتير</option>
                    <option value="lawyer">محامٍ</option>
                    <option value="admin">مدير مكتب</option>
                  </select>
                </td>

                <td>
                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={owner || isSelf(u)}
                    style={{
                      color: owner || isSelf(u) ? "#ccc" : "red",
                      border: "none",
                      background: "transparent",
                      cursor: owner || isSelf(u) ? "not-allowed" : "pointer",
                    }}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}