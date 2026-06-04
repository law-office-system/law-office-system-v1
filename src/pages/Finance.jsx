import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";

export default function Finance() {
  const { userData } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [casesMap, setCasesMap] = useState({});

  const [filterType, setFilterType] = useState("all");
  const [filterScope, setFilterScope] = useState("all");
  const [search, setSearch] = useState("");

  const canAddTransaction =
    userData?.role === "admin" || userData?.role === "staff";

  const [form, setForm] = useState({
    type: "income",
    amount: "",
    description: "",
    scope: "office",
    caseId: "",
  });

  // ================= LOADING CHECK =================
  if (!userData) return <p style={{ padding: 20 }}>جاري التحقق...</p>;

  if (userData.role === "client") {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "red" }}>
        🚫 غير مسموح لك بالدخول إلى المالية
      </div>
    );
  }

  // ================= LOAD CASES (MULTI-TENANT) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "cases"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const map = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        map[doc.id] = {
          caseNumber: data.caseNumber || "-",
          clientName: data.clientName || data.client || "-",
        };
      });

      setCasesMap(map);
    });

    return () => unsub();
  }, [userData]);

  // ================= LOAD TRANSACTIONS (MULTI-TENANT FIXED) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "transactions"),
      where("officeId", "==", userData.officeId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTransactions(data);
    });

    return () => unsub();
  }, [userData]);

  // ================= ADD TRANSACTION =================
  const addTransaction = async () => {
    if (!canAddTransaction) return alert("غير مسموح");

    const amount = Number(form.amount);

    if (!form.amount || isNaN(amount) || amount <= 0) {
      return alert("أدخل مبلغ صحيح");
    }

    if (!form.description) return alert("أدخل الوصف");

    if (form.scope === "case" && !form.caseId) {
      return alert("اختر القضية");
    }

    const payload = {
      type: form.type,
      amount,
      description: form.description,
      scope: form.scope,
      caseId: form.scope === "case" ? form.caseId : null,

      officeId: userData.officeId, // 🔥 مهم Multi-tenant

      createdAt: serverTimestamp(),
      createdBy: userData?.uid || "unknown",
    };

    await addDoc(collection(db, "transactions"), payload);

    setForm({
      type: "income",
      amount: "",
      description: "",
      scope: "office",
      caseId: "",
    });

    alert("✔ تمت الإضافة بنجاح");
  };

  // ================= NORMALIZATION =================
  const normalizeScope = (value) => {
    const s = (value || "").toString().toLowerCase().trim();

    if (!s) return "office";
    if (s === "مكتب") return "office";
    if (s === "قضية") return "case";

    return s;
  };

  // ================= FILTER =================
  const filteredTransactions = transactions.filter((t) => {
    const matchType = filterType === "all" || t.type === filterType;

    const matchScope =
      filterScope === "all" ||
      normalizeScope(t.scope) === filterScope;

    const matchSearch =
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      String(t.amount).includes(search);

    return matchType && matchScope && matchSearch;
  });

  const income = filteredTransactions.filter((t) => t.type === "income");
  const expenses = filteredTransactions.filter((t) => t.type === "expense");

  const totalIncome = income.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
  const profit = totalIncome - totalExpenses;

  // ================= UI =================
  return (
    <div style={styles.page}>
      <h2>💰 ميزانية المكتب</h2>

      {/* SUMMARY */}
      <div style={styles.summary}>
        <div style={styles.card("#e8f5e9")}>
          💰 الإيرادات <br />
          <b>{totalIncome}</b>
        </div>

        <div style={styles.card("#ffebee")}>
          💸 المصروفات <br />
          <b>{totalExpenses}</b>
        </div>

        <div style={styles.card(profit >= 0 ? "#c8e6c9" : "#ffcdd2")}>
          📊 الصافي <br />
          <b>{profit}</b>
        </div>
      </div>

      {/* FILTERS */}
      <div style={styles.filterBar}>
        <input
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.input}
        >
          <option value="all">كل الأنواع</option>
          <option value="income">دخل</option>
          <option value="expense">مصروف</option>
        </select>

        <select
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value)}
          style={styles.input}
        >
          <option value="all">كل النطاق</option>
          <option value="office">مكتب</option>
          <option value="case">قضية</option>
        </select>
      </div>

      {/* FORM */}
      {canAddTransaction && (
        <div style={styles.formBox}>
          <h3>➕ إضافة حركة مالية</h3>

          <div style={styles.row}>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={styles.input}
            >
              <option value="income">دخل</option>
              <option value="expense">مصروف</option>
            </select>

            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              style={styles.input}
            >
              <option value="office">مكتب</option>
              <option value="case">قضية</option>
            </select>

            {form.scope === "case" && (
              <select
                value={form.caseId}
                onChange={(e) => setForm({ ...form, caseId: e.target.value })}
                style={styles.input}
              >
                <option value="">اختر القضية</option>
                {Object.entries(casesMap).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.caseNumber} - {c.clientName}
                  </option>
                ))}
              </select>
            )}

            <input
              placeholder="المبلغ"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={styles.input}
            />

            <input
              placeholder="الوصف"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={styles.input}
            />

            <button style={styles.btn} onClick={addTransaction}>
              إضافة
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      <h3>📒 المعاملات</h3>

      {filteredTransactions.map((t) => (
        <div key={t.id} style={styles.item(t.type)}>
          {t.type === "income" ? "💰" : "💸"} {t.amount} - {t.description}
          <br />
          <small>
            {t.scope === "case"
              ? `⚖️ ${casesMap[t.caseId]?.caseNumber || "قضية"}`
              : "🏢 مكتب"}
          </small>
        </div>
      ))}
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

  summary: {
    display: "flex",
    gap: 10,
    marginBottom: 15,
  },

  card: (bg) => ({
    flex: 1,
    padding: 15,
    background: bg,
    borderRadius: 12,
    textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  }),

  filterBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 15,
  },

  formBox: {
    background: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },

  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  input: {
    padding: 8,
    borderRadius: 8,
    border: "1px solid #ddd",
    minWidth: 120,
  },

  btn: {
    padding: "8px 15px",
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },

  item: (type) => ({
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    background: type === "income" ? "#e8f5e9" : "#ffebee",
  }),
};