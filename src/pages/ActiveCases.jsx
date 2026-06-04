import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

export default function ActiveCases() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { userData } = useAuth();

  // ================= LOAD CASES (MULTI-TENANT) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const fetchCases = async () => {
      try {
        const q = query(
          collection(db, "cases"),
          where("officeId", "==", userData.officeId)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCases(data);
      } catch (error) {
        console.error("Error loading cases:", error);
      }
    };

    fetchCases();
  }, [userData]);

  // ================= LOAD CLIENTS =================
  useEffect(() => {
    const loadClients = async () => {
      const snap = await getDocs(collection(db, "clientProfiles"));

      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });

      setClientsMap(map);
    };

    loadClients();
  }, []);

  const getClientName = (id) =>
    clientsMap[id]?.fullName ||
    clientsMap[id]?.name ||
    "موكل غير معروف";

  const getOpponentName = (o) =>
    typeof o === "object" ? o.name : o;

  // ================= FILTER =================
  const activeCases = cases.filter((c) => {
    const isActive = c.status === "ACTIVE" || c.status === "نشطة";
    if (!isActive) return false;

    const text = search.toLowerCase().trim();

    const caseNumber =
      `${c.caseYear || ""}/${c.caseSerial || ""}`.toLowerCase();

    const clientNames = (c.clients || [])
      .map(getClientName)
      .join(" ")
      .toLowerCase();

    const opponentNames = (c.opponents || [])
      .map(getOpponentName)
      .join(" ")
      .toLowerCase();

    return (
      caseNumber.includes(text) ||
      clientNames.includes(text) ||
      opponentNames.includes(text) ||
      (c.caseType || "").toLowerCase().includes(text) ||
      (c.court || "").toLowerCase().includes(text)
    );
  });

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <h1>🟢 القضايا النشطة</h1>

        <Button
          variant="primary"
          onClick={() => navigate("/add-case")}
        >
          ➕ إضافة قضية
        </Button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="بحث شامل..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* COUNT */}
      <p>📊 عدد القضايا النشطة: {activeCases.length}</p>

      {/* LIST */}
      <div style={styles.grid}>
        {activeCases.map((c) => (
          <div
            key={c.id}
            style={styles.card}
            onClick={() => navigate(`/case/${c.id}`)}
          >
            <h3>⚖ {c.caseYear} / {c.caseSerial}</h3>

            <p>📌 النوع: {c.caseType || "-"}</p>
            <p>🏛 المحكمة: {c.court || "-"}</p>

            <p>
              👤 الموكلين:{" "}
              {(c.clients || []).length > 0
                ? c.clients.map(getClientName).join(" , ")
                : "-"}
            </p>

            <p>
              ⚔ الخصوم:{" "}
              {(c.opponents || []).length > 0
                ? c.opponents.map(getOpponentName).join(" , ")
                : "-"}
            </p>

            {/* ACTIONS */}
            <div style={styles.actions}>
              <Button
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/case/${c.id}`);
                }}
              >
                عرض
              </Button>

              <Button
                variant="success"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/edit/${c.id}`);
                }}
              >
                تعديل
              </Button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ================= STYLE ================= */

const styles = {
  page: {
    padding: 20,
    direction: "rtl",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  search: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
    gap: 15,
  },

  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 10,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: 10,
    flexWrap: "wrap",
  },
};