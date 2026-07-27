import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { canAccess } from "../utils/auth";

export default function CaseFinance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);

  const canViewFinance = canAccess("finance", userData?.role);
  const canAddFinance = canAccess("finance", userData?.role);

  // =========================
  // 🔒 Load Case Safely & Verify Tenant
  // =========================
  useEffect(() => {
    if (!userData?.officeId || !id) return;

    const loadCase = async () => {
      try {
        const snap = await getDoc(doc(db, "cases", id));
        if (snap.exists()) {
          const data = snap.data();
          // حماية أمنية: التحقق من تبعية القضية للمكتب الحالي
          if (data.officeId !== userData.officeId) {
            console.error("🚫 أمن النظام: محاولة وصول غير مصرح بها لقضية مكتب آخر.");
            setCaseData(null);
            setLoading(false);
            return;
          }
          setCaseData({ id: snap.id, ...data });
        } else {
          setCaseData(null);
        }
      } catch (err) {
        console.error("Error loading case safely:", err);
      }
    };

    loadCase();
  }, [id, userData]);

  // =========================
  // 🔒 Load Transactions Safely (Multi-Tenant Fix)
  // =========================
  useEffect(() => {
    if (!userData?.officeId || !id) return;

    // تم تدعيم الشرط بـ officeId لضمان أمان عزل الحسابات المالية للمكاتب
    const q = query(
      collection(db, "transactions"),
      where("caseId", "==", id),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("🔒 Error in secure transactions real-time feed:", error);
    });

    return () => unsub();
  }, [id, userData]);

  // =========================
  // FORM STATE
  // =========================
  const [form, setForm] = useState({
    amount: "",
    reason: "",
    notes: "",
    type: "expense",
    category: "other",
  });

  // =========================
  // ADD TRANSACTION
  // =========================
  const addTransaction = async () => {
    if (!canAddFinance) return alert("عفواً، ليس لديك صلاحيات الإدارة المالية.");
    if (!caseData || !userData?.officeId) return;
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      return alert("يرجى إدخال مبلغ مالي صحيح.");
    }

    try {
      const payload = {
        caseId: id,
        caseNumber: caseData.caseSerial || caseData.caseNumber || "",
        officeId: userData.officeId, // تضمين المعرف لتأمين الحسابات مستقبلاً

        type: form.type, 
        amount: Number(form.amount),
        description: form.reason || "",
        notes: form.notes || "",

        category: form.type === "expense" ? form.category : "income_payment",

        createdAt: new Date(), 
        createdBy: userData?.uid || "unknown",
      };

      await addDoc(collection(db, "transactions"), payload);

      setForm({
        amount: "",
        reason: "",
        notes: "",
        type: "expense",
        category: "other",
      });

    } catch (err) {
      console.error("❌ FIRESTORE TRANSACTION ERROR:", err);
      alert("فشلت الإضافة: " + err.message);
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteTransaction = async (tid) => {
    if (!canAddFinance) return alert("غير مسموح لك بإجراء تعديلات مالية.");
    if (!confirm("هل أنت متأكد من حذف هذه المعاملة المالية نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "transactions", tid));
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  };

  // =========================
  // UPDATE
  // =========================
  const updateTransaction = async () => {
    if (!editItem || !canAddFinance) return;
    if (!editItem.amount || isNaN(editItem.amount)) return alert("يرجى إدخال مبلغ صحيح.");

    try {
      await updateDoc(doc(db, "transactions", editItem.id), {
        amount: Number(editItem.amount),
        description: editItem.description || "",
        notes: editItem.notes || "",
        category: editItem.type === "expense" ? editItem.category : "income_payment",
      });

      setEditItem(null);
    } catch (err) {
      console.error("Error updating transaction:", err);
    }
  };

  // =========================
  // CALCULATIONS (useMemo)
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
  // SORT SAFE (تجنب أخطاء الفايربيس ومخزن كائنات الـ Timestamps)
  // =========================
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime; 
    });
  }, [transactions]);

  // =========================
  // LOADING / SECURITY STATES
  // =========================
  if (!userData) return <div style={styles.centerText}><h3>جار التحقق من هوية المستخدم...</h3></div>;
  if (loading) return <div style={styles.centerText}><h3>جار تحميل الخزينة والسجلات المالية...</h3></div>;
  if (!caseData) return <div style={styles.centerText}><h3 style={{ color: "#dc2626" }}>🚫 ملف القضية غير موجود أو غير مصرح لك بالوصول إليه.</h3></div>;

  if (!canViewFinance) {
    return (
      <div style={{ padding: 40, color: "#dc2626", textAlign: "center", fontWeight: "bold" }}>
        🚫 عفواً، الحسابات المالية للمكتب تتطلب صلاحيات إدارة متقدمة.
      </div>
    );
  }

  return (
    <div style={styles.page}>
      
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>💰 المركز المالي ومصروفات الدعوى</h1>
          <p style={styles.subtitle}>قضية رقم: <strong>{caseData.caseSerial || caseData.caseNumber}</strong> / {caseData.caseYear || "-"}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/case/${id}`)}>↩️ العودة للملف</Button>
      </div>

      {/* SUMMARY BOXES */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.summaryCard, background: "#ecfdf5", borderRight: "5px solid #10b981" }}>
          <span style={{ ...styles.summaryLabel, color: "#065f46" }}>💰 المقبوضات (الدخل)</span>
          <span style={{ ...styles.summaryValue, color: "#047857" }}>{totalIncome.toLocaleString()} ج.م</span>
        </div>

        <div style={{ ...styles.summaryCard, background: "#fef2f2", borderRight: "5px solid #ef4444" }}>
          <span style={{ ...styles.summaryLabel, color: "#991b1b" }}>💸 المدفوعات (المصروفات)</span>
          <span style={{ ...styles.summaryValue, color: "#b91c1c" }}>{totalExpenses.toLocaleString()} ج.م</span>
        </div>

        <div style={{ 
          ...styles.summaryCard, 
          background: profit >= 0 ? "#f0fdf4" : "#fff5f5", 
          borderRight: profit >= 0 ? "5px solid #22c55e" : "5px solid #f43f5e" 
        }}>
          <span style={{ ...styles.summaryLabel, color: profit >= 0 ? "#166534" : "#991b1b" }}>📊 الرصيد الحالي الصافي</span>
          <span style={{ ...styles.summaryValue, color: profit >= 0 ? "#15803d" : "#be123c" }}>
            {profit.toLocaleString()} ج.م
          </span>
        </div>
      </div>

      {/* ENTRY FORM */}
      {canAddFinance && (
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>➕ قيد حركة مالية جديدة بالدفتر</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.fieldBox}>
              <label style={styles.label}>نوع الحركة</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, category: e.target.value === "expense" ? "other" : "income_payment" })}
                style={styles.select}
              >
                <option value="expense">💸 إخراج مصروفات / رسوم</option>
                <option value="income">💰 تحصيل أتعاب / دفعات موكل</option>
              </select>
            </div>

            {form.type === "expense" && (
              <div style={styles.fieldBox}>
                <label style={styles.label}>البند القانوني</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={styles.select}
                >
                  <option value="court_fee">🏛️ رسوم ومستندات محكمة</option>
                  <option value="lawyer_fee">💼 أتعاب محاماة ومستشارين</option>
                  <option value="transport">🚗 انتقالات ومأموريات</option>
                  <option value="printing">🖨️ طباعة وتصوير أوراق</option>
                  <option value="other">⚙️ مصروفات إدارية أخرى</option>
                </select>
              </div>
            )}

            <div style={styles.fieldBox}>
              <label style={styles.label}>المبلغ النقدي (ج.م)</label>
              <input
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ ...styles.formGrid, marginTop: "12px" }}>
            <div style={{ ...styles.fieldBox, flex: 2 }}>
              <label style={styles.label}>الوصف أو السبب الصريح</label>
              <input
                placeholder="مثال: سداد رسم الدعوى المرفوعة أمام المحكمة الكلية..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={{ ...styles.fieldBox, flex: 1 }}>
              <label style={styles.label}>ملاحظات إضافية</label>
              <input
                placeholder="اسم القائم بالصرف أو المستلم..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: "15px", textAlign: "left" }}>
            <Button variant="success" onClick={addTransaction} style={{ padding: "10px 24px", fontWeight: "600" }}>📋 قيد المعاملة الآن</Button>
          </div>
        </div>
      )}

      {/* EDIT MODAL DIALOG IN-LINE */}
      {editItem && (
        <div style={{ ...styles.card, background: "#f8fafc", border: "1px solid #cbd5e1" }}>
          <h3 style={{ ...styles.sectionTitle, color: "#0f172a" }}>✏️ تعديل قيود الإدخال المالي</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.fieldBox}>
              <label style={styles.label}>المبلغ المطلوب تعديله</label>
              <input
                value={editItem.amount}
                onChange={(e) => setEditItem({ ...editItem, amount: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={{ ...styles.fieldBox, flex: 2 }}>
              <label style={styles.label}>البيان والوصف المعدل</label>
              <input
                value={editItem.description}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ ...styles.formGrid, marginTop: "10px" }}>
            <div style={styles.fieldBox}>
              <label style={styles.label}>الملاحظات</label>
              <input
                value={editItem.notes}
                onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "flex-start" }}>
            <Button variant="success" onClick={updateTransaction}>💾 حفظ التعديلات</Button>
            <Button variant="secondary" onClick={() => setEditItem(null)}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* LEDGER RECORD LIST */}
      <h3 style={{ ...styles.sectionTitle, marginTop: "20px" }}>📒 دفتر المسيرات المالي للملف</h3>
      
      <div style={styles.ledgerContainer}>
        {sortedTransactions.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94a3b8", margin: 0, padding: "20px" }}>لا توجد أي معاملات مالية مقيدة لهذه القضية حتى الآن.</p>
        ) : (
          sortedTransactions.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.ledgerRow,
                background: item.type === "income" ? "#f0fdf4" : "#fff5f5",
                borderRight: item.type === "income" ? "4px solid #16a34a" : "4px solid #dc2626",
              }}
            >
              <div style={styles.ledgerInfo}>
                <span style={styles.ledgerIcon}>{item.type === "income" ? "💰 دخل" : "💸 مصروف"}</span>
                <strong style={{ fontSize: "15px", color: item.type === "income" ? "#15803d" : "#b91c1c" }}>
                  {Number(item.amount).toLocaleString()} ج.م
                </strong>
                <span style={styles.ledgerDivider}>|</span>
                <span style={styles.ledgerDesc}>{item.description}</span>
                {item.notes && <span style={styles.ledgerNotes}>({item.notes})</span>}
              </div>

              {canAddFinance && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditItem({ ...item })} style={styles.actionBtn} title="تعديل">✏️</button>
                  <button onClick={() => deleteTransaction(item.id)} style={{ ...styles.actionBtn, color: "#dc2626" }} title="حذف">🗑️</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================= MODERNIZED FINANCE COMPREHENSIVE STYLES ================= */
const styles = {
  page: { padding: "20px", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma", direction: "rtl" },
  centerText: { textAlign: "center", padding: "40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { margin: 0, fontSize: "22px", color: "#1e293b" },
  subtitle: { margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" },
  summaryGrid: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" },
  summaryCard: { flex: 1, minWidth: "220px", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  summaryLabel: { fontSize: "13px", fontWeight: "600" },
  summaryValue: { fontSize: "20px", fontWeight: "bold", fontFamily: "sans-serif" },
  card: { background: "#fff", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "15px" },
  sectionTitle: { margin: "0 0 15px 0", fontSize: "16px", color: "#475569", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" },
  formGrid: { display: "flex", gap: "12px", flexWrap: "wrap" },
  fieldBox: { flex: 1, minWidth: "180px", display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  select: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", background: "#fff", fontSize: "13px" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px" },
  ledgerContainer: { background: "#fff", padding: "14px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  ledgerRow: { padding: "12px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  ledgerInfo: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  ledgerIcon: { fontSize: "12px", fontWeight: "bold", background: "rgba(255,255,255,0.6)", padding: "2px 6px", borderRadius: "4px" },
  ledgerDivider: { color: "#cbd5e1" },
  ledgerDesc: { fontSize: "14px", color: "#334155" },
  ledgerNotes: { fontSize: "12px", color: "#64748b", fontStyle: "italic" },
  actionBtn: { border: "none", background: "#fff", padding: "5px 8px", borderRadius: "6px", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "background 0.2s" }
};