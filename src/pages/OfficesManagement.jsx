import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function OfficesManagement() {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadOffices();
  }, []);

  // ================= تحميل المكاتب =================
  const loadOffices = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(collection(db, "offices"));

      const data = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setOffices(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  // ================= تغيير حالة المكتب =================
  const toggleStatus = async (officeId, currentStatus) => {
    const newStatus =
      currentStatus === "active" ? "suspended" : "active";

    await updateDoc(doc(db, "offices", officeId), {
      status: newStatus,
    });

    setOffices((prev) =>
      prev.map((o) =>
        o.id === officeId ? { ...o, status: newStatus } : o
      )
    );
  };

  // ================= بحث + فلترة =================
  const filteredOffices = offices.filter((o) => {
    const matchSearch =
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.inviteCode?.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "all" ||
      (filter === "active" && o.status !== "suspended") ||
      (filter === "suspended" && o.status === "suspended");

    return matchSearch && matchFilter;
  });

  // ================= Loading =================
  if (loading) {
    return (
      <div style={styles.center}>
        <p>⏳ جاري تحميل المكاتب...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🏢 إدارة المكاتب (السوبر أدمن)</h1>

      {/* 🔍 البحث + الفلترة */}
      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="ابحث باسم المكتب أو كود الدخول..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          style={styles.select}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">كل المكاتب</option>
          <option value="active">نشطة</option>
          <option value="suspended">موقوفة</option>
        </select>
      </div>

      {/* 📊 المكاتب */}
      <div style={styles.grid}>
        {filteredOffices.map((office) => (
          <div key={office.id} style={styles.card}>
            <h3>🏛 {office.name}</h3>

            <p>
              🔑 كود الدخول: <b>{office.inviteCode}</b>
            </p>

            <p>
              📊 الحالة:{" "}
              <span
                style={{
                  color:
                    office.status === "suspended"
                      ? "red"
                      : "green",
                  fontWeight: "bold",
                }}
              >
                {office.status === "suspended"
                  ? "موقوف"
                  : "نشط"}
              </span>
            </p>

            <hr />

            <p>👤 عدد المستخدمين: {office.usersCount || 0}</p>
            <p>⚖ عدد القضايا: {office.casesCount || 0}</p>

            {/* ⚡ زر التحكم */}
            <button
              style={{
                ...styles.btn,
                background:
                  office.status === "suspended"
                    ? "#27ae60"
                    : "#c0392b",
              }}
              onClick={() =>
                toggleStatus(
                  office.id,
                  office.status || "active"
                )
              }
            >
              {office.status === "suspended"
                ? "تفعيل المكتب"
                : "إيقاف المكتب"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= التصميم ================= */

const styles = {
  page: {
    padding: 20,
    direction: "rtl",
    background: "#f4f6f8",
    minHeight: "100vh",
    fontFamily: "Arial",
  },

  title: {
    textAlign: "center",
    marginBottom: 20,
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
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 15,
  },

  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  btn: {
    marginTop: 10,
    width: "100%",
    padding: 10,
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};