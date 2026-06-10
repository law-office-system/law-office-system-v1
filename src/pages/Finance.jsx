import { useEffect, useState, useMemo } from "react";
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
import Button from "../components/ui/Button";

export default function Finance() {
  const { userData } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [casesMap, setCasesMap] = useState({});
  const [clientsMap, setClientsMap] = useState({});

  const [filterType, setFilterType] = useState("all");
  const [filterScope, setFilterScope] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    type: "income",
    amount: "",
    description: "",
    scope: "office",
    caseId: "",
  });

  const canAddTransaction = userData?.role === "admin" || userData?.role === "staff";

  // ================= LOAD CLIENT PROFILES MAP (🛡️ TO RESOLVE CLIENT NAMES IN DROPDOWN) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "clientProfiles"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const map = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        map[doc.id] = data.fullName || data.name || "موكل غير معروف";
      });
      setClientsMap(map);
    }, (err) => console.error("Error fetching client profiles map:", err));

    return () => unsub();
  }, [userData]);

  // ================= LOAD CASES (MULTI-TENANT SAFE) =================
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

        // 🛡️ دعم قراءة الموكلين سواء بالطريقة القديمة (نص) أو البنية الجديدة (كائن/معرف)
        let resolvedClientName = data.clientName || data.client || "";
        
        if (!resolvedClientName && Array.isArray(data.clients) && data.clients.length > 0) {
          const firstClient = data.clients[0];
          const clientId = typeof firstClient === "object" ? firstClient.id : firstClient;
          resolvedClientName = clientsMap[clientId] || "موكل مسجل";
          if (data.clients.length > 1) {
            resolvedClientName += ` (+${data.clients.length - 1} آخرين)`;
          }
        }

        map[doc.id] = {
          caseNumber: data.caseSerial || data.caseNumber || "-",
          caseYear: data.caseYear || "",
          clientName: resolvedClientName || "غير محدد",
        };
      });

      setCasesMap(map);
    }, (err) => console.error("Error tracking cases for finance:", err));

    return () => unsub();
  }, [userData, clientsMap]);

  // ================= LOAD TRANSACTIONS (MULTI-TENANT CONTROL WITH METADATA FIXED) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "transactions"),
      where("officeId", "==", userData.officeId),
      orderBy("createdAt", "desc")
    );

    // 🔥 تضمين خيار الاستماع للمتغيرات المحلية الفورية لضمان تحديث الدفتر في نفس اللحظة
    const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          // حماية للتحديث الفوري: إذا كان وقت السيرفر لم يرجع بعد، نضع وقت الجهاز مؤقتاً لئلا يختفي القيد
          createdAt: docData.createdAt || new Date(),
        };
      });

      setTransactions(data);
    }, (err) => {
      console.error("Firestore ordering error or empty collection:", err);
    });

    return () => unsub();
  }, [userData]);

  // ================= ADD TRANSACTION =================
  const addTransaction = async () => {
    if (!canAddTransaction) return alert("عفواً، ليس لديك صلاحية التدوين المالي.");

    const amount = Number(form.amount);

    if (!form.amount || isNaN(amount) || amount <= 0) {
      return alert("يرجى إدخال مبلغ مالي صحيح أكبر من الصفر.");
    }

    if (!form.description.trim()) return alert("يرجى كتابة وصف أو بيان الحركة المالية.");

    if (form.scope === "case" && !form.caseId) {
      return alert("يرجى اختيار ملف القضية المرتبطة بهذه الحركة المالية.");
    }

    try {
      const payload = {
        type: form.type,
        amount,
        description: form.description.trim(),
        scope: form.scope,
        caseId: form.scope === "case" ? form.caseId : null,
        caseNumber: form.scope === "case" ? (casesMap[form.caseId]?.caseNumber || "") : "",

        officeId: userData.officeId, // حماية الخزينة المنفصلة للمكتب الحالي

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

    } catch (err) {
      console.error("Error posting global transaction:", err);
      alert("حدث خطأ أثناء حفظ المعاملة: " + err.message);
    }
  };

  // ================= NORMALIZATION =================
  const normalizeScope = (value) => {
    const s = (value || "").toString().toLowerCase().trim();
    if (!s) return "office";
    if (s === "مكتب" || s === "office") return "office";
    if (s === "قضية" || s === "case") return "case";
    return s;
  };

  // ================= FILTER & SAFE SORT TRANSACTIONS (OPTIMIZED WITH useMemo) =================
  const filteredTransactions = useMemo(() => {
    const result = transactions.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchScope = filterScope === "all" || normalizeScope(t.scope) === filterScope;

      const text = search.toLowerCase().trim();
      const matchSearch =
        (t.description || "").toLowerCase().includes(text) ||
        String(t.amount).includes(text) ||
        (t.caseNumber && String(t.caseNumber).includes(text));

      return matchType && matchScope && matchSearch;
    });

    // فرز محلي إضافي صارم لضمان هبوط القيد الجديد في أول الدفتر فورا دون انتظار السيرفر
    return result.sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime;
    });
  }, [transactions, filterType, filterScope, search]);

  // ================= CALCULATIONS (useMemo for optimal rendering) =================
  const { totalIncome, totalExpenses, profit } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") inc += amt;
      if (t.type === "expense") exp += amt;
    });
    return {
      totalIncome: inc,
      totalExpenses: exp,
      profit: inc - exp
    };
  }, [filteredTransactions]);

  // ================= LOADING & SECURITY CHECKS =================
  if (!userData) return <div style={styles.centerText}><p>جاري التحقق من الهوية...</p></div>;

  if (userData.role === "client") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#dc2626", fontWeight: "bold" }}>
        🚫 أمن النظام: حسابات الموكلين غير مصرح لها بالدخول إلى الخزينة العامة للمكتب.
      </div>
    );
  }

  return (
    <div style={styles.page}>
      
      {/* TITLE */}
      <div style={styles.headerCard}>
        <h2 style={styles.pageTitle}>💰 الحسابات الختامية وخزينة المكتب العامة</h2>
        <p style={styles.pageSubtitle}>عرض مالي شامل لجميع التحصيلات، الرسوم، ومصروفات القضايا الجارية.</p>
      </div>

      {/* SUMMARY */}
      <div style={styles.summary}>
        <div style={styles.card("#ecfdf5", "#10b981")}>
          <span style={styles.cardLabel}>💰 إجمالي الإيرادات</span>
          <b style={styles.cardValue}>{totalIncome.toLocaleString()} ج.م</b>
        </div>

        <div style={styles.card("#fef2f2", "#ef4444")}>
          <span style={styles.cardLabel}>💸 إجمالي المصروفات</span>
          <b style={styles.cardValue}>{totalExpenses.toLocaleString()} ج.م</b>
        </div>

        <div style={styles.card(profit >= 0 ? "#f0fdf4" : "#fff5f5", profit >= 0 ? "#22c55e" : "#f43f5e")}>
          <span style={styles.cardLabel}>📊 صافي الدخل الحلي</span>
          <b style={styles.cardValue}>{profit.toLocaleString()} ج.م</b>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={styles.filterBar}>
        <input
          placeholder="بحث سريع بالوصف أو رقم القضية المقيدة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...styles.input, flex: 2 }}
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.select}
        >
          <option value="all">🔍 جميع المعاملات (دخل/مصرف)</option>
          <option value="income">🟢 قيود الإيرادات والدخل فقط</option>
          <option value="expense">🔴 قيود المصروفات والرسوم فقط</option>
        </select>

        <select
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value)}
          style={styles.select}
        >
          <option value="all">🌐 النطاق العام للدفتر</option>
          <option value="office">🏢 مصروفات تشغيل المكتب</option>
          <option value="case">⚖️ ميزانيات القضايا المنفردة</option>
        </select>
      </div>

      {/* ENTRY FORM */}
      {canAddTransaction && (
        <div style={styles.formBox}>
          <h3 style={styles.sectionTitle}>➕ قيد معاملة مالية جديدة بالدفتر المركزي</h3>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>طبيعة الحركة</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={styles.selectInput}
              >
                <option value="income">🟢 إيراد / تحصيل أتعاب</option>
                <option value="expense">🔴 مصروف / سداد رسوم</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>النطاق المالي</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value, caseId: "" })}
                style={styles.selectInput}
              >
                <option value="office">🏢 خاص بالمكتب (إداري عام)</option>
                <option value="case">⚖️ خاص بملف قضية محددة</option>
              </select>
            </div>

            {form.scope === "case" && (
              <div style={{ ...styles.field, flex: 2 }}>
                <label style={styles.label}>ربط بالقضية</label>
                <select
                  value={form.caseId}
                  onChange={(e) => setForm({ ...form, caseId: e.target.value })}
                  style={styles.selectInput}
                >
                  <option value="">اختر القضية من السجل الحالي</option>
                  {Object.entries(casesMap).map(([id, c]) => (
                    <option key={id} value={id}>
                      ⚖️ ق رقم {c.caseNumber} - لـ ({c.clientName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>المبلغ النقدى</label>
              <input
                placeholder="0.00 ج.م"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={styles.textInput}
              />
            </div>
          </div>

          <div style={{ ...styles.row, marginTop: "12px" }}>
            <div style={{ ...styles.field, flex: 3 }}>
              <label style={styles.label}>بيان الحركة والسبب بالتفصيل</label>
              <input
                placeholder="اكتب هنا التفاصيل (مثل: دفعة أولى من أتعاب النقض، رسوم تصوير مستندات...)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={styles.textInput}
              />
            </div>

            <div style={{ ...styles.field, flex: 1, justifyContent: "flex-end" }}>
              <Button variant="primary" onClick={addTransaction} style={styles.addBtn}>
                ➕ قيد في الحسابات
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION LEDGER LIST */}
      <h3 style={styles.sectionTitle}>📒 دفتر حركة الخزينة المتطابق</h3>

      <div style={styles.ledgerContainer}>
        {filteredTransactions.length === 0 ? (
          <p style={styles.noData}>لا توجد قيود مالية مقيدة تطابق خيارات الفرز والبحث المحددة.</p>
        ) : (
          filteredTransactions.map((t) => (
            <div key={t.id} style={styles.item(t.type)}>
              <div style={styles.itemRight}>
                <span style={styles.badge(t.type)}>{t.type === "income" ? "💵 تحصيل" : "💸 مخرج"}</span>
                <strong style={styles.amountText(t.type)}>{Number(t.amount).toLocaleString()} ج.م</strong>
                <span style={styles.divider}>|</span>
                <span style={styles.descText}>{t.description}</span>
              </div>
              
              <span style={styles.scopeBadge(t.scope)}>
                {normalizeScope(t.scope) === "case"
                  ? `⚖️ قضية: ${casesMap[t.caseId]?.caseNumber || "ملف محذوف"}`
                  : "🏢 مصاريف عمومية"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================= COMPREHENSIVE LUXURY STYLES (FIXED) ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  centerText: { textAlign: "center", padding: "40px" },
  headerCard: { background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  pageTitle: { margin: "0 0 4px 0", fontSize: "20px", color: "#1e293b" },
  pageSubtitle: { margin: 0, fontSize: "13px", color: "#64748b" },
  summary: { display: "flex", gap: 12, marginBottom: 15, flexWrap: "wrap" },
  
  card: (bg, borderRightColor) => ({ 
    flex: 1, 
    minWidth: "200px", 
    padding: 15, 
    background: bg, 
    borderRadius: 12, 
    textAlign: "center", 
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", 
    display: "flex", 
    flexDirection: "column", 
    gap: "4px",
    borderRight: `5px solid ${borderRightColor}`
  }),
  
  cardLabel: { fontSize: "13px", color: "#475569", fontWeight: "600" },
  cardValue: { fontSize: "18px", fontFamily: "sans-serif", fontWeight: "bold" },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", boxSizing: "border-box" },
  select: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff", flex: 1, minWidth: "150px" },
  formBox: { background: "#fff", padding: 16, borderRadius: 12, marginBottom: 15, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { margin: "0 0 15px 0", fontSize: "15px", color: "#475569", fontWeight: "600" },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  field: { flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  selectInput: { padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff" },
  textInput: { padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px" },
  addBtn: { width: "100%", fontWeight: "600", padding: "10px" },
  ledgerContainer: { background: "#fff", padding: "12px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  noData: { textAlign: "center", color: "#94a3b8", margin: 0, padding: "20px" },
  item: (type) => ({ padding: "12px", marginBottom: "8px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: type === "income" ? "#f0fdf4" : "#fff5f5", borderRight: type === "income" ? "4px solid #16a34a" : "4px solid #dc2626" }),
  itemRight: { display: "flex", alignItems: "center", gap: "10px" },
  badge: (type) => ({ fontSize: "11px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", background: type === "income" ? "#bbf7d0" : "#fecaca", color: type === "income" ? "#15803d" : "#991b1b" }),
  amountText: (type) => ({ fontSize: "14px", color: type === "income" ? "#15803d" : "#b91c1c", fontFamily: "sans-serif" }),
  divider: { color: "#cbd5e1" },
  descText: { fontSize: "13.5px", color: "#334155" },
  scopeBadge: (scope) => ({ fontSize: "12px", background: "rgba(255,255,255,0.7)", padding: "3px 8px", borderRadius: "6px", color: "#475569", border: "1px solid #e2e8f0" })
};