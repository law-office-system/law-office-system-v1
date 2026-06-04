import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../utils/auth";

export default function CaseFinance() {
  const { id } = useParams();
  const { userData } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);

  const canViewFinance = canAccess("finance", userData?.role);
  const canAddFinance = canAccess("finance", userData?.role);

  // =========================
  // Load Case
  // =========================
  useEffect(() => {
    const loadCase = async () => {
      const snap = await getDoc(doc(db, "cases", id));
      if (snap.exists()) {
        setCaseData({ id: snap.id, ...snap.data() });
      }
    };

    loadCase();
  }, [id]);

  // =========================
  // Load Transactions
  // =========================
  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      where("caseId", "==", id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setTransactions(data);
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  // =========================
  // FORM
  // =========================
  const [form, setForm] = useState({
    amount: "",
    reason: "",
    notes: "",
    type: "expense",
    category: "other",
  });

  // =========================
  // ADD TRANSACTION (DEBUG FIXED)
  // =========================
  const addTransaction = async () => {
    if (!canAddFinance) return alert("غير مسموح");
    if (!caseData) return;

    try {
      const payload = {
        caseId: id,
        caseNumber: caseData.caseNumber || "",

        type: form.type, // income | expense فقط

        amount: Number(form.amount),
        description: form.reason || "",
        notes: form.notes || "",

        category: form.type === "expense" ? form.category : null,

        createdAt: new Date(), // ثابت بدون مشاكل
        createdBy: userData?.uid || "unknown",
      };

      console.log("🚀 Sending transaction:", payload);

      await addDoc(collection(db, "transactions"), payload);

      setForm({
        amount: "",
        reason: "",
        notes: "",
        type: "expense",
        category: "other",
      });

      alert("✔ تمت إضافة العملية بنجاح");
    } catch (err) {
      console.error("❌ FIRESTORE ERROR:", err);
      alert(err.code + " | " + err.message);
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteTransaction = async (tid) => {
    if (!confirm("هل تريد حذف العملية؟")) return;
    await deleteDoc(doc(db, "transactions", tid));
  };

  // =========================
  // UPDATE
  // =========================
  const updateTransaction = async () => {
    if (!editItem) return;

    await updateDoc(doc(db, "transactions", editItem.id), {
      amount: Number(editItem.amount),
      description: editItem.description,
      notes: editItem.notes,
      category: editItem.category,
    });

    setEditItem(null);
  };

  // =========================
  // CALCULATIONS
  // =========================
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [transactions]);

  const profit = totalIncome - totalExpenses;

  // =========================
  // SORT SAFE
  // =========================
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    });
  }, [transactions]);

  // =========================
  // LOADING
  // =========================
  if (!userData) return <h2>جار التحقق...</h2>;
  if (loading) return <h2>جار التحميل...</h2>;
  if (!caseData) return <h2>القضية غير موجودة</h2>;

  if (!canViewFinance) {
    return (
      <div style={{ padding: 20, color: "red", textAlign: "center" }}>
        🚫 ليس لديك صلاحية
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div style={{ padding: 20, direction: "rtl" }}>
      <h1>💰 حسابات القضية</h1>
      <h3>رقم القضية: {caseData.caseNumber}</h3>

      {/* SUMMARY */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <div style={{ flex: 1, background: "#e8f5e9", padding: 10 }}>
          💰 الدخل <br /> {totalIncome}
        </div>

        <div style={{ flex: 1, background: "#ffebee", padding: 10 }}>
          🧾 المصروفات <br /> {totalExpenses}
        </div>

        <div
          style={{
            flex: 1,
            padding: 10,
            background: profit >= 0 ? "#c8e6c9" : "#ffcdd2",
          }}
        >
          📊 الصافي <br /> {profit}
        </div>
      </div>

      {/* FORM */}
      {canAddFinance && (
        <>
          <hr />
          <h3>➕ إضافة حركة مالية</h3>

          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
          >
            <option value="income">دخل</option>
            <option value="expense">مصروف</option>
          </select>

          {form.type === "expense" && (
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option value="court_fee">رسوم محكمة</option>
              <option value="lawyer_fee">أتعاب</option>
              <option value="transport">انتقالات</option>
              <option value="printing">طباعة</option>
              <option value="other">أخرى</option>
            </select>
          )}

          <input
            placeholder="المبلغ"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <input
            placeholder="الوصف"
            value={form.reason}
            onChange={(e) =>
              setForm({ ...form, reason: e.target.value })
            }
          />

          <input
            placeholder="ملاحظات"
            value={form.notes}
            onChange={(e) =>
              setForm({ ...form, notes: e.target.value })
            }
          />

          <button onClick={addTransaction}>إضافة</button>
        </>
      )}

      {/* EDIT */}
      {editItem && (
        <div style={{ background: "#eee", padding: 10, marginTop: 10 }}>
          <h3>✏️ تعديل العملية</h3>

          <input
            value={editItem.amount}
            onChange={(e) =>
              setEditItem({ ...editItem, amount: e.target.value })
            }
          />

          <input
            value={editItem.description}
            onChange={(e) =>
              setEditItem({ ...editItem, description: e.target.value })
            }
          />

          <input
            value={editItem.notes}
            onChange={(e) =>
              setEditItem({ ...editItem, notes: e.target.value })
            }
          />

          <button onClick={updateTransaction}>حفظ</button>
          <button onClick={() => setEditItem(null)}>إلغاء</button>
        </div>
      )}

      {/* LEDGER */}
      <hr />
      <h3>📒 السجل المالي</h3>

      {sortedTransactions.map((item) => (
        <div
          key={item.id}
          style={{
            padding: 10,
            marginBottom: 8,
            background: item.type === "income" ? "#e8f5e9" : "#ffebee",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            {item.type === "income" ? "💰" : "💸"} {item.amount} -{" "}
            {item.description}
          </div>

          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => setEditItem({ ...item })}>
              ✏️
            </button>
            <button onClick={() => deleteTransaction(item.id)}>
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}