import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Archive() {
  const [cases, setCases] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [search, setSearch] = useState("");

  const { userData } = useAuth();

  // ================= LOAD CASES (MULTI-TENANT) =================
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

  // ================= LOAD CLIENTS (MULTI-TENANT) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const loadClients = async () => {
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
    };

    loadClients();
  }, [userData]);

  const getClientName = (id) =>
    clientsMap[id]?.fullName ||
    clientsMap[id]?.name ||
    "موكل غير معروف";

  const getOpponentName = (o) =>
    typeof o === "object" ? o.name : o;

  // ================= FILTER =================
  const archivedCases = cases.filter((c) => {
    const isFinished =
      c.status === "CLOSED" || c.status === "منتهية";

    if (!isFinished) return false;

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
      <h1>📁 أرشيف القضايا</h1>

      {/* SEARCH */}
      <input
        placeholder="ابحث في الأرشيف..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* COUNT */}
      <p>📊 عدد القضايا المنتهية: {archivedCases.length}</p>

      <hr />

      {/* LIST */}
      {archivedCases.length > 0 ? (
        archivedCases.map((c) => (
          <div key={c.id} style={styles.card}>

            <p>
              <Link to={`/case/${c.id}`} style={styles.link}>
                ⚖ قضية رقم: {c.caseYear} / {c.caseSerial}
              </Link>
            </p>

            <p>📌 النوع: {c.caseType || "-"}</p>
            <p>🏛 المحكمة: {c.court || "-"}</p>
            <p>🏁 الحالة: {c.status}</p>
            <p>📅 عدد الجلسات: {(c.sessions || []).length}</p>

            {/* CLIENTS */}
            <p>
              👤 الموكلين:{" "}
              {(c.clients || []).length > 0
                ? c.clients.map(getClientName).join(" , ")
                : "-"}
            </p>

            {/* OPPONENTS */}
            <p>
              ⚔ الخصوم:{" "}
              {(c.opponents || []).length > 0
                ? c.opponents.map(getOpponentName).join(" , ")
                : "-"}
            </p>

          </div>
        ))
      ) : (
        <p>لا توجد قضايا منتهية</p>
      )}
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

  search: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  card: {
    background: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },

  link: {
    textDecoration: "none",
    fontWeight: "bold",
    color: "#2c3e50",
  },
};