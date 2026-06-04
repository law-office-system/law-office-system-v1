import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { userData } = useAuth();

  // ================= LOAD CLIENTS (MULTI-TENANT FIXED) =================
  const fetchClients = async () => {
    if (!userData?.officeId) return;

    try {
      const q = query(
        collection(db, "clientProfiles"),
        where("officeId", "==", userData.officeId)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [userData]);

  // ================= DELETE CLIENT =================
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("هل تريد حذف الموكل؟");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "clientProfiles", id));

      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // ================= UPDATE PHONE =================
  const handlePhoneUpdate = async (id, value) => {
    try {
      await updateDoc(doc(db, "clientProfiles", id), {
        phone1: value,
      });

      setClients((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, phone1: value } : c
        )
      );
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  // ================= SEARCH =================
  const filteredClients = clients.filter((c) => {
    const text = search.toLowerCase().trim();

    return (
      c.fullName?.toLowerCase().includes(text) ||
      c.nationalId?.includes(text) ||
      c.phone1?.includes(text)
    );
  });

  // ================= LOADING GUARD =================
  if (!userData) {
    return <p style={{ padding: 20 }}>جاري التحميل...</p>;
  }

  return (
    <div style={styles.page}>

      <h2>📋 إدارة الموكلين</h2>

      {/* SEARCH */}
      <input
        placeholder="بحث بالاسم أو الرقم القومي أو الهاتف"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* ADD CLIENT */}
      <button
        onClick={() => navigate("/clients/add")}
        style={styles.addBtn}
      >
        ➕ إضافة موكل
      </button>

      {/* TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الرقم القومي</th>
              <th>الهاتف</th>
              <th>التوكيل</th>
              <th>إجراءات</th>
            </tr>
          </thead>

          <tbody>
            {filteredClients.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName || "-"}</td>
                <td>{c.nationalId || "-"}</td>

                <td>
                  <input
                    defaultValue={c.phone1}
                    onBlur={(e) =>
                      handlePhoneUpdate(c.id, e.target.value)
                    }
                    style={styles.input}
                  />
                </td>

                <td>
                  {c.powerOfAttorney?.number || "-"} /{" "}
                  {c.powerOfAttorney?.letter || "-"} /{" "}
                  {c.powerOfAttorney?.year || "-"}
                </td>

                <td>
                  <button
                    onClick={() => navigate(`/clients/${c.id}`)}
                    style={styles.viewBtn}
                  >
                    👁
                  </button>

                  <button
                    onClick={() =>
                      navigate(`/clients/edit/${c.id}`)
                    }
                    style={styles.editBtn}
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
                    style={styles.deleteBtn}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

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

  addBtn: {
    padding: "10px 15px",
    marginBottom: 15,
    background: "#2c3e50",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600",
  },

  tableWrapper: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: 10,
    padding: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  input: {
    padding: 6,
    borderRadius: 6,
    border: "1px solid #ddd",
    width: "100%",
  },

  viewBtn: {
    marginRight: 5,
    padding: 6,
    border: "none",
    borderRadius: 6,
    background: "#3498db",
    color: "#fff",
    cursor: "pointer",
  },

  editBtn: {
    marginRight: 5,
    padding: 6,
    border: "none",
    borderRadius: 6,
    background: "#27ae60",
    color: "#fff",
    cursor: "pointer",
  },

  deleteBtn: {
    padding: 6,
    border: "none",
    borderRadius: 6,
    background: "#e74c3c",
    color: "#fff",
    cursor: "pointer",
  },
};