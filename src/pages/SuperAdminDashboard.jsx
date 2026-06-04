import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function SuperAdminDashboard() {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ================= REALTIME =================
  useEffect(() => {
    setOffices([]);
    setLoading(true);

    const unsub = onSnapshot(
      collection(db, "offices"),
      (snap) => {
        const data = snap.docs.map((doc) => {
          const d = doc.data();

          return {
            id: doc.id,
            name: d.name || "بدون اسم",
            inviteCode: d.inviteCode || "—",
            status: d.status || "active",
          };
        });

        setOffices(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [location.key]);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // ================= TOGGLE STATUS =================
  const toggleStatus = async (id, status) => {
    const newStatus = status === "active" ? "suspended" : "active";

    await updateDoc(doc(db, "offices", id), {
      status: newStatus,
    });
  };

  // ================= DELETE OFFICE =================
  const deleteOffice = async (id) => {
    const confirmDelete = window.confirm(
      "هل أنت متأكد من حذف هذا المكتب؟"
    );

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "offices", id));
  };

  // ================= FILTER =================
  const filteredOffices = useMemo(() => {
    return offices.filter((o) => {
      const matchSearch =
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.inviteCode.toLowerCase().includes(search.toLowerCase());

      const matchFilter =
        filter === "all" ||
        (filter === "active" && o.status !== "suspended") ||
        (filter === "suspended" && o.status === "suspended");

      return matchSearch && matchFilter;
    });
  }, [offices, search, filter]);

  // ================= STATS =================
  const total = offices.length;

  const active = offices.filter(
    (o) => o.status !== "suspended"
  ).length;

  const suspended = offices.filter(
    (o) => o.status === "suspended"
  ).length;

  const activePercentage =
    total > 0 ? Math.round((active / total) * 100) : 0;

  const suspendedPercentage =
    total > 0 ? Math.round((suspended / total) * 100) : 0;

  if (loading) {
    return (
      <div style={styles.center}>
        <p>⏳ جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1>👑 لوحة تحكم السوبر أدمن</h1>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          🚪 تسجيل الخروج
        </button>
      </div>

      {/* KPI */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <h2>{total}</h2>
          <p>🏢 إجمالي المكاتب</p>
        </div>

        <div style={styles.kpiCard}>
          <h2>{active}</h2>
          <p>🟢 المكاتب النشطة</p>
        </div>

        <div style={styles.kpiCard}>
          <h2>{suspended}</h2>
          <p>🔴 المكاتب الموقوفة</p>
        </div>

        <div style={styles.kpiCard}>
          <h2>{activePercentage}%</h2>
          <p>📈 نسبة المكاتب النشطة</p>
        </div>

        <div style={styles.kpiCard}>
          <h2>{suspendedPercentage}%</h2>
          <p>📉 نسبة المكاتب الموقوفة</p>
        </div>
      </div>

      {/* FILTERS */}
      <div style={styles.controls}>
        <input
          placeholder="بحث باسم المكتب أو كود الدعوة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">الكل</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </select>
      </div>

      {/* OFFICES */}
      <div style={styles.grid}>
        {filteredOffices.map((o) => (
          <div key={o.id} style={styles.cardBox}>
            <h3>🏛 {o.name}</h3>

            <p>
              <strong>🔑 كود الدعوة:</strong> {o.inviteCode}
            </p>

            <p>
              <strong>📊 الحالة:</strong>{" "}
              {o.status === "suspended"
                ? "موقوف"
                : "نشط"}
            </p>

            <div style={styles.actions}>
              <button
                onClick={() =>
                  toggleStatus(o.id, o.status)
                }
              >
                تبديل الحالة
              </button>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    o.inviteCode
                  )
                }
              >
                نسخ الكود
              </button>

              <button
                onClick={() =>
                  navigate(`/super-admin/offices/${o.id}`)
                }
              >
                تفاصيل
              </button>

              <button
                onClick={() => deleteOffice(o.id)}
                style={styles.deleteBtn}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    direction: "rtl",
    background: "#f5f6fa",
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  logoutBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: 8,
    cursor: "pointer",
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
    marginBottom: 25,
  },

  kpiCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  controls: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  select: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
    gap: 15,
  },

  cardBox: {
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 15,
  },

  deleteBtn: {
    background: "#111827",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
};