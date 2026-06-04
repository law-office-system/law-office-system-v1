import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courtFilter, setCourtFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [isMobile, setIsMobile] = useState(false);

  const { userData } = useAuth();
  const navigate = useNavigate();

  /* ================= RESPONSIVE DETECTION ================= */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ================= LOAD CASES (MULTI-TENANT) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const fetchCases = async () => {
      try {
        const q = query(
          collection(db, "cases"),
          where("officeId", "==", userData.officeId)
        );

        const snap = await getDocs(q);

        setCases(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      } catch (error) {
        console.error("Error loading cases:", error);
      }
    };

    fetchCases();
  }, [userData]);

  /* ================= LOAD CLIENTS (MULTI-TENANT FIX) ================= */
  useEffect(() => {
    if (!userData?.officeId) return;

    const loadClients = async () => {
      try {
        const q = query(
          collection(db, "clientProfiles"),
          where("officeId", "==", userData.officeId)
        );

        const snap = await getDocs(q);

        const map = {};

        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });

        setClientsMap(map);
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };

    loadClients();
  }, [userData]);

  const getClientName = (id) =>
    clientsMap[id]?.fullName ||
    clientsMap[id]?.name ||
    "موكل غير معروف";

  /* ================= FILTER ================= */
  const filtered = cases.filter((c) => {
    const text = search.toLowerCase();

    const caseNumber =
      `${c.caseYear || ""}/${c.caseSerial || ""}`.toLowerCase();

    const clientNames = (c.clients || [])
      .map((id) => getClientName(id))
      .join(" ")
      .toLowerCase();

    const opponentNames = (c.opponents || [])
      .map((x) => (typeof x === "object" ? x.name : x))
      .join(" ")
      .toLowerCase();

    const searchMatch =
      caseNumber.includes(text) ||
      clientNames.includes(text) ||
      opponentNames.includes(text);

    const statusMatch =
      statusFilter === "ALL" || c.status === statusFilter;

    const courtMatch =
      courtFilter === "ALL" || c.court === courtFilter;

    const typeMatch =
      typeFilter === "ALL" || c.caseType === typeFilter;

    return searchMatch && statusMatch && courtMatch && typeMatch;
  });

  const courts = [...new Set(cases.map((c) => c.court).filter(Boolean))];
  const types = [...new Set(cases.map((c) => c.caseType).filter(Boolean))];

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.card}>
        <h1>📊 القضايا</h1>

        <input
          placeholder="ابحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        <div style={styles.filters}>
          <select onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">كل الحالات</option>
            <option value="ACTIVE">نشطة</option>
            <option value="EXECUTION">تنفيذ</option>
            <option value="CLOSED">منتهية</option>
          </select>

          <select onChange={(e) => setCourtFilter(e.target.value)}>
            <option value="ALL">كل المحاكم</option>
            {courts.map((c, i) => (
              <option key={i}>{c}</option>
            ))}
          </select>

          <select onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">كل الأنواع</option>
            {types.map((t, i) => (
              <option key={i}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= MOBILE ================= */}
      {isMobile ? (
        <div style={styles.grid}>
          {filtered.map((c) => (
            <Card key={c.id}>
              <Link to={`/case/${c.id}`} style={styles.link}>
                ⚖ {c.caseYear}/{c.caseSerial}
              </Link>

              <p>📌 النوع: {c.caseType || "-"}</p>
              <p>🏛 المحكمة: {c.court || "-"}</p>
              <p>⚖ الحالة: {c.status || "-"}</p>

              <p>
                👤 الموكلين:{" "}
                {(c.clients || [])
                  .map((id) => getClientName(id))
                  .join(", ") || "-"}
              </p>

              <p>
                ⚔ الخصوم:{" "}
                {(c.opponents || [])
                  .map((x) =>
                    typeof x === "object" ? x.name : x
                  )
                  .join(", ") || "-"}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        /* ================= DESKTOP ================= */
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>رقم</th>
                <th>النوع</th>
                <th>المحكمة</th>
                <th>الحالة</th>
                <th>الموكلين</th>
                <th>الخصوم</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/case/${c.id}`)}
                >
                  <td>
                    <Link to={`/case/${c.id}`} style={styles.link}>
                      {c.caseYear}/{c.caseSerial}
                    </Link>
                  </td>

                  <td>{c.caseType || "-"}</td>
                  <td>{c.court || "-"}</td>
                  <td>{c.status || "-"}</td>

                  <td>
                    {(c.clients || []).map((id, i) => (
                      <span key={i} style={styles.tag}>
                        {getClientName(id)}
                      </span>
                    ))}
                  </td>

                  <td>
                    {(c.opponents || []).map((x, i) => (
                      <span key={i} style={styles.tagDanger}>
                        {typeof x === "object" ? x.name : x}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: 16,
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  card: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderRight: "5px solid #6b4f3b",
  },

  search: {
    width: "100%",
    padding: 10,
    marginTop: 10,
  },

  filters: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },

  link: {
    fontWeight: "bold",
    textDecoration: "none",
    color: "#2c3e50",
  },

  tag: {
    background: "#eaf2ff",
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 12,
    marginRight: 4,
  },

  tagDanger: {
    background: "#ffe6e6",
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 12,
    marginRight: 4,
  },
};