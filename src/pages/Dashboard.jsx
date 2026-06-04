import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { parseDate } from "../utils/date";
import { CASE_STATUS } from "../constants/caseStatus";
import { useAuth } from "../context/AuthContext";

import Card from "../components/ui/Card";

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const navigate = useNavigate();
  const { userData } = useAuth();

  /* ================= SEARCH DEBOUNCE ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.toLowerCase().trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  /* ================= FIRESTORE (MULTI-TENANT FIXED) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "cases"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCases(data);
    });

    return () => unsub();
  }, [userData]);

  /* ================= NORMALIZE STATUS ================= */
  const normalizeStatus = (status) => {
    const s = (status || "").toString().trim().toLowerCase();

    if (["جارية", "نشطة", "active"].includes(s)) return CASE_STATUS.ACTIVE;
    if (["تنفيذ", "execution"].includes(s)) return CASE_STATUS.EXECUTION;
    if (["منتهية", "closed"].includes(s)) return CASE_STATUS.CLOSED;

    return CASE_STATUS.ACTIVE;
  };

  /* ================= STATUS BADGE ================= */
  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);

    const map = {
      ACTIVE: { label: "نشطة", bg: "#e0f7e9", color: "#16a34a" },
      EXECUTION: { label: "تنفيذ", bg: "#fff7e0", color: "#f59e0b" },
      CLOSED: { label: "منتهية", bg: "#ffe0e0", color: "#dc2626" },
    };

    const style = map[s];

    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: "600",
          background: style.bg,
          color: style.color,
          display: "inline-block",
        }}
      >
        {style.label}
      </span>
    );
  };

  /* ================= FILTER ================= */
  const statusFilteredCases = cases.filter((c) => {
    const status = normalizeStatus(c.status);
    return statusFilter === "ALL" || status === statusFilter;
  });

  const filteredCases = statusFilteredCases.filter((c) => {
    const text = debouncedSearch;
    if (!text) return true;

    return (
      (c.caseNumber || "").toLowerCase().includes(text) ||
      (c.client || "").toLowerCase().includes(text) ||
      (c.opponent || "").toLowerCase().includes(text) ||
      (c.caseType || "").toLowerCase().includes(text) ||
      (c.court || "").toLowerCase().includes(text)
    );
  });

  /* ================= SORT (SAFE COPY) ================= */
  const sortedCases = [...filteredCases].sort((a, b) => {
    const aDate = parseDate(a.sessions?.[0]?.date);
    const bDate = parseDate(b.sessions?.[0]?.date);

    if (!aDate) return 1;
    if (!bDate) return -1;

    return aDate - bDate;
  });

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <Card>
        <div style={styles.header}>
          <h1>📊 لوحة التحكم</h1>

          <button
            style={styles.addBtn}
            onClick={() => navigate("/add-case")}
          >
            ➕ إضافة قضية
          </button>
        </div>
      </Card>

      {/* SEARCH */}
      <input
        placeholder="ابحث برقم القضية أو الموكل أو الخصم..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* FILTER */}
      <div style={styles.filters}>

        <button
          onClick={() => setStatusFilter("ALL")}
          style={statusFilter === "ALL" ? styles.activeFilter : styles.filterBtn}
        >
          الكل
        </button>

        <button
          onClick={() => setStatusFilter(CASE_STATUS.ACTIVE)}
          style={statusFilter === CASE_STATUS.ACTIVE ? styles.activeFilter : styles.filterBtn}
        >
          نشطة
        </button>

        <button
          onClick={() => setStatusFilter(CASE_STATUS.EXECUTION)}
          style={statusFilter === CASE_STATUS.EXECUTION ? styles.activeFilter : styles.filterBtn}
        >
          تنفيذ
        </button>

        <button
          onClick={() => setStatusFilter(CASE_STATUS.CLOSED)}
          style={statusFilter === CASE_STATUS.CLOSED ? styles.activeFilter : styles.filterBtn}
        >
          منتهية
        </button>

      </div>

      {/* CASES */}
      <div style={styles.grid}>
        {sortedCases.map((c) => (
          <Card key={c.id}>

            <h3>⚖ {c.caseNumber}</h3>

            <div style={{ marginBottom: "8px" }}>
              {getStatusBadge(c.status)}
            </div>

            <p>👤 الموكل: {c.client || "-"}</p>
            <p>⚖ النوع: {c.caseType || "-"}</p>

            <p>
              📅 أقرب جلسة:{" "}
              {c.sessions?.length
                ? parseDate(c.sessions[0].date)?.toLocaleDateString()
                : "لا يوجد"}
            </p>

            <div style={styles.actions}>
              <button
                style={styles.viewBtn}
                onClick={() => navigate(`/case/${c.id}`)}
              >
                عرض
              </button>

              <button
                style={styles.editBtn}
                onClick={() => navigate(`/edit/${c.id}`)}
              >
                تعديل
              </button>
            </div>

          </Card>
        ))}
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: "14px",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  addBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },

  search: {
    width: "100%",
    padding: "10px",
    margin: "12px 0",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },

  filters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  filterBtn: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "500",
  },

  activeFilter: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
  },

  viewBtn: {
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },

  editBtn: {
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },
};