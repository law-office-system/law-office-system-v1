import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { CASE_STATUS } from "../constants/caseStatus";
import { useAuth } from "../context/AuthContext";

export default function AddCase() {
  const { userData } = useAuth();

  const [tab, setTab] = useState("case");

  const [form, setForm] = useState({
    caseSerial: "",
    caseYear: "",
    caseType: "",
    court: "",
    department: "",
    litigationDegree: "",
    stage: "",
    secretary: "",
    status: CASE_STATUS.ACTIVE,
    notes: "",
    clients: [],
    opponents: [],
  });

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  // ================= LOADING GUARD =================
  if (!userData) {
    return <p style={{ padding: 20 }}>جاري التحميل...</p>;
  }

  // ================= 🔥 BLOCKED OFFICE UI =================
  const isBlocked = userData?.officeStatus === "suspended";

  // ================= LOAD CLIENTS (MULTI-TENANT FIX) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const fetchClients = async () => {
      try {
        const q = query(
          collection(db, "clientProfiles"),
          where("officeId", "==", userData.officeId)
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((d) => ({
          id: d.id,
          fullName: d.data().fullName || d.data().name || "",
          nationalId: d.data().nationalId || "",
        }));

        setClients(data);
      } catch (err) {
        console.error("Error loading clients:", err);
      }
    };

    fetchClients();
  }, [userData]);

  // ================= FORM HANDLER =================
  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= CLIENTS =================
  const addClient = (clientId) => {
    setForm((prev) => {
      if (prev.clients.includes(clientId)) return prev;

      return {
        ...prev,
        clients: [...prev.clients, clientId],
      };
    });
  };

  const removeClient = (clientId) => {
    setForm((prev) => ({
      ...prev,
      clients: prev.clients.filter((id) => id !== clientId),
    }));
  };

  // ================= OPONENTS =================
  const addOpponent = () => {
    setForm((prev) => ({
      ...prev,
      opponents: [
        ...prev.opponents,
        { id: Date.now(), name: "", caseRole: "" },
      ],
    }));
  };

  const updateOpponent = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      opponents: prev.opponents.map((op) =>
        op.id === id ? { ...op, [field]: value } : op
      ),
    }));
  };

  const removeOpponent = (id) => {
    setForm((prev) => ({
      ...prev,
      opponents: prev.opponents.filter((op) => op.id !== id),
    }));
  };

  // ================= 🔥 SUBMIT WITH BLOCK =================
  const handleSubmit = async () => {
    try {
      if (isBlocked) {
        alert("🚫 المكتب موقوف ولا يمكن إضافة قضايا جديدة");
        return;
      }

      await addDoc(collection(db, "cases"), {
        ...form,
        officeId: userData.officeId,
        createdAt: new Date(),
      });

      alert("✔ تم حفظ القضية بنجاح");

      setForm({
        caseSerial: "",
        caseYear: "",
        caseType: "",
        court: "",
        department: "",
        litigationDegree: "",
        stage: "",
        secretary: "",
        status: CASE_STATUS.ACTIVE,
        notes: "",
        clients: [],
        opponents: [],
      });

      setTab("case");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ القضية");
    }
  };

  // ================= SEARCH =================
  const filteredClients =
    search.trim().length < 1
      ? []
      : clients.filter((c) =>
          `${c.fullName} ${c.nationalId}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );

  return (
    <div style={styles.page}>
      <h2>➕ إضافة قضية جديدة</h2>

      {/* ================= BLOCK MESSAGE ================= */}
      {isBlocked && (
        <div style={styles.blocked}>
          🚫 هذا المكتب موقوف — يمكن فقط عرض البيانات
        </div>
      )}

      {/* TABS */}
      <div style={styles.tabs}>
        <button onClick={() => setTab("case")}>⚖️ بيانات القضية</button>
        <button onClick={() => setTab("parties")}>👥 الأطراف</button>
        <button onClick={() => setTab("sessions")}>📅 الجلسات</button>
        <button onClick={() => setTab("notes")}>📝 الملاحظات</button>
      </div>

      {/* CASE TAB */}
      {tab === "case" && (
        <div style={styles.section}>
          <input name="caseSerial" placeholder="رقم القضية" onChange={handleChange} value={form.caseSerial} />
          <input name="caseYear" placeholder="سنة القضية" onChange={handleChange} value={form.caseYear} />
          <input name="caseType" placeholder="نوع القضية" onChange={handleChange} value={form.caseType} />
          <input name="court" placeholder="المحكمة" onChange={handleChange} value={form.court} />
          <input name="department" placeholder="الدائرة" onChange={handleChange} value={form.department} />
          <input name="litigationDegree" placeholder="درجة التقاضي" onChange={handleChange} value={form.litigationDegree} />
        </div>
      )}

      {/* PARTIES TAB */}
      {tab === "parties" && (
        <div style={styles.section}>
          <h3>👥 الموكلون</h3>

          <input
            placeholder="بحث باسم الموكل أو الرقم القومي"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />

          {filteredClients.map((c) => (
            <div key={c.id} style={styles.row}>
              <span>{c.fullName}</span>
              <button onClick={() => addClient(c.id)}>إضافة</button>
            </div>
          ))}
        </div>
      )}

      {/* NOTES */}
      {tab === "notes" && (
        <div style={styles.section}>
          <textarea
            name="notes"
            placeholder="ملاحظات"
            onChange={handleChange}
            value={form.notes}
            style={styles.textarea}
          />

          <button
            onClick={handleSubmit}
            style={{
              ...styles.saveBtn,
              opacity: isBlocked ? 0.5 : 1,
              cursor: isBlocked ? "not-allowed" : "pointer",
            }}
            disabled={isBlocked}
          >
            💾 حفظ القضية
          </button>
        </div>
      )}

      {/* ================= STYLES ================= */}
      <style>{`
        .blocked {
          padding: 15px;
          background: #ffe5e5;
          color: red;
          border-radius: 8px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: 20,
    maxWidth: 1000,
    margin: "auto",
    direction: "rtl",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  tabs: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 6,
  },

  input: {
    padding: 8,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  textarea: {
    padding: 10,
    minHeight: 120,
    borderRadius: 8,
    border: "1px solid #ddd",
  },

  saveBtn: {
    padding: 10,
    background: "green",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },

  blocked: {
    padding: 12,
    marginBottom: 10,
    background: "#ffe5e5",
    color: "red",
    borderRadius: 8,
    textAlign: "center",
  },
};