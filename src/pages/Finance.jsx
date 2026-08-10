import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import Button from "../components/ui/Button";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function Finance() {
  const { userData } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [casesMap, setCasesMap] = useState({});
  const [clientsMap, setClientsMap] = useState({});

  const [filterType, setFilterType] = useState("all");
  const [filterScope, setFilterScope] = useState("all");
  const [search, setSearch] = useState("");

  // ======== NEW: Date Filtering State ========
  const [dateFilterMode, setDateFilterMode] = useState("month"); // "all" | "day" | "week" | "month" | "year"
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD format
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear().toString();
  });

  const [form, setForm] = useState({
    type: "income",
    amount: "",
    description: "",
    scope: "office",
    caseId: "",
  });

  const canAddTransaction = userData?.role === "admin" || userData?.role === "staff";

  // ================= LOAD CLIENT PROFILES MAP =================
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

  // ================= LOAD TRANSACTIONS (MULTI-TENANT CONTROL) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    // 🔥 Fallback: بدون orderBy لتجنب مشاكل الـ index المفقود
    // المعاملات هتتفرز محلياً بعدين
    const q = query(
      collection(db, "transactions"),
      where("officeId", "==", userData.officeId)
    );

    const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          // حماية: إذا كان وقت السيرفر لم يرجع بعد، نضع وقت الجهاز مؤقتاً
          createdAt: docData.createdAt || new Date(),
        };
      });

      setTransactions(data);
    }, (err) => {
      console.error("Firestore transactions error:", err);
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

        officeId: userData.officeId,

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

  // ================= HELPER: Extract Date from Timestamp =================
  const getTransactionDate = (t) => {
    if (!t.createdAt) return new Date(0);
    if (t.createdAt.seconds) {
      return new Date(t.createdAt.seconds * 1000);
    }
    if (t.createdAt instanceof Date) {
      return t.createdAt;
    }
    return new Date(t.createdAt);
  };

  // ================= HELPER: Format Date for Display =================
  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "—";
    const d = dateObj;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} — ${hours}:${minutes}`;
  };

  const formatDateShort = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "—";
    const d = dateObj;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // ================= NORMALIZATION =================
  const normalizeScope = (value) => {
    const s = (value || "").toString().toLowerCase().trim();
    if (!s) return "office";
    if (s === "مكتب" || s === "office") return "office";
    if (s === "قضية" || s === "case") return "case";
    return s;
  };

  // ================= DATE FILTER LOGIC =================
  const isDateInFilter = (transactionDate) => {
    if (dateFilterMode === "all") return true;

    const tYear = transactionDate.getFullYear();
    const tMonth = transactionDate.getMonth();
    const tDay = transactionDate.getDate();

    switch (dateFilterMode) {
      case "day": {
        const [y, m, d] = selectedDate.split("-").map(Number);
        return tYear === y && tMonth === m - 1 && tDay === d;
      }
      case "week": {
        const [y, m, d] = selectedDate.split("-").map(Number);
        const selected = new Date(y, m - 1, d);
        const dayOfWeek = selected.getDay();
        const startOfWeek = new Date(selected);
        startOfWeek.setDate(selected.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
      }
      case "month": {
        const [y, m] = selectedMonth.split("-").map(Number);
        return tYear === y && tMonth === m - 1;
      }
      case "year": {
        return tYear === Number(selectedYear);
      }
      default:
        return true;
    }
  };

  // ================= FILTER & SORT TRANSACTIONS =================
  const filteredTransactions = useMemo(() => {
    const result = transactions.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchScope = filterScope === "all" || normalizeScope(t.scope) === filterScope;

      const tDate = getTransactionDate(t);
      const matchDate = isDateInFilter(tDate);

      const text = search.toLowerCase().trim();
      const matchSearch =
        text === "" ||
        (t.description || "").toLowerCase().includes(text) ||
        String(t.amount).includes(text) ||
        (t.caseNumber && String(t.caseNumber).includes(text));

      return matchType && matchScope && matchDate && matchSearch;
    });

    // فرز تنازلي حسب التاريخ
    return result.sort((a, b) => {
      const aDate = getTransactionDate(a);
      const bDate = getTransactionDate(b);
      return bDate.getTime() - aDate.getTime();
    });
  }, [transactions, filterType, filterScope, search, dateFilterMode, selectedDate, selectedMonth, selectedYear]);

  // ================= CALCULATIONS =================
  const { totalIncome, totalExpenses, profit, transactionCount } = useMemo(() => {
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
      profit: inc - exp,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // ================= NAVIGATE MONTHS =================
  const goToPrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  };

  // ================= LOADING & SECURITY =================
  if (!userData) return <div style={styles.centerText}><p>جاري التحقق من الهوية...</p></div>;

  if (userData.role === "client") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#dc2626", fontWeight: "bold" }}>
        🚫 أمن النظام: حسابات الموكلين غير مصرح لها بالدخول إلى الخزينة العامة للمكتب.
      </div>
    );
  }

  // ================= RENDER DATE FILTER CONTROLS =================
  const renderDateFilterControls = () => {
    switch (dateFilterMode) {
      case "day":
        return (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          />
        );
      case "week":
        return (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          />
        );
      case "month":
        return (
          <div style={styles.monthNavigator}>
            <button onClick={goToPrevMonth} style={styles.navArrow}>◀</button>
            <span style={styles.monthLabel}>
              {selectedMonth.split("-")[1]} / {selectedMonth.split("-")[0]}
            </span>
            <button onClick={goToNextMonth} style={styles.navArrow}>▶</button>
            <button onClick={goToCurrentMonth} style={styles.todayBtn}>اليوم</button>
          </div>
        );
      case "year":
        return (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={styles.yearSelect}
          >
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - 5 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        );
      default:
        return null;
    }
  };

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
          <span style={styles.cardLabel}>📊 صافي الدخل الحالي</span>
          <b style={styles.cardValue}>{profit.toLocaleString()} ج.م</b>
        </div>

        <div style={styles.card("#eff6ff", "#3b82f6")}>
          <span style={styles.cardLabel}>📋 عدد المعاملات</span>
          <b style={styles.cardValue}>{transactionCount.toLocaleString()}</b>
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

      {/* ======== NEW: DATE FILTER BAR ======== */}
      <div style={styles.dateFilterBar}>
        <label style={styles.dateFilterLabel}>🗓️ تصفية حسب الفترة:</label>
        <select
          value={dateFilterMode}
          onChange={(e) => setDateFilterMode(e.target.value)}
          style={styles.dateFilterSelect}
        >
          <option value="all">📋 الكل</option>
          <option value="day">📅 يوم محدد</option>
          <option value="week">🗓️ أسبوع محدد</option>
          <option value="month">📆 شهر محدد</option>
          <option value="year">📊 سنة محددة</option>
        </select>

        {renderDateFilterControls()}

        <span style={styles.dateFilterHint}>
          {dateFilterMode === "month" && `عرض: ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`}
          {dateFilterMode === "year" && `عرض: ${selectedYear}`}
          {dateFilterMode === "day" && `عرض: ${formatDateShort(new Date(selectedDate))}`}
          {dateFilterMode === "week" && `عرض: أسبوع ${formatDateShort(new Date(selectedDate))}`}
          {dateFilterMode === "all" && "عرض: جميع الفترات"}
        </span>
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
      <h3 style={styles.sectionTitle}>
        📒 دفتر حركة الخزينة المتطابق
        <span style={styles.ledgerCount}>({filteredTransactions.length} معاملة)</span>
      </h3>

      <div style={styles.ledgerContainer}>
        {filteredTransactions.length === 0 ? (
          <p style={styles.noData}>
            لا توجد قيود مالية مقيدة تطابق خيارات الفرز والبحث المحددة.
          </p>
        ) : (
          filteredTransactions.map((t) => {
            const tDate = getTransactionDate(t);
            return (
              <div key={t.id} style={styles.item(t.type)}>
                <div style={styles.itemRight}>
                  <span style={styles.badge(t.type)}>
                    {t.type === "income" ? "💵 تحصيل" : "💸 مخرج"}
                  </span>
                  <strong style={styles.amountText(t.type)}>
                    {Number(t.amount).toLocaleString()} ج.م
                  </strong>
                  <span style={styles.divider}>|</span>
                  <span style={styles.descText}>{t.description}</span>
                </div>

                <div style={styles.itemMiddle}>
                  {/* ======== NEW: DATE DISPLAY ======== */}
                  <span style={styles.dateBadge}>
                    📅 {formatDate(tDate)}
                  </span>
                </div>

                <span style={styles.scopeBadge(t.scope)}>
                  {normalizeScope(t.scope) === "case"
                    ? `⚖️ قضية: ${casesMap[t.caseId]?.caseNumber || "ملف محذوف"}`
                    : "🏢 مصاريف عمومية"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ================= COMPREHENSIVE LUXURY STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  centerText: { textAlign: "center", padding: "40px" },
  headerCard: { background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  pageTitle: { margin: "0 0 4px 0", fontSize: "20px", color: "#1e293b" },
  pageSubtitle: { margin: 0, fontSize: "13px", color: "#334155", fontWeight: 500 },
  summary: { display: "flex", gap: 12, marginBottom: 15, flexWrap: "wrap" },

  card: (bg, borderRightColor) => ({
    flex: 1,
    minWidth: "180px",
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

  cardLabel: { fontSize: "13px", color: "#1e293b", fontWeight: "700" },
  cardValue: { fontSize: "18px", fontFamily: "sans-serif", fontWeight: "bold", color: "#0f172a" },

  // Filter Bar
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #94a3b8", outline: "none", fontSize: "13px", boxSizing: "border-box", color: "#1e293b", fontWeight: 500 },
  select: { padding: "10px", borderRadius: "8px", border: "1px solid #94a3b8", outline: "none", fontSize: "13px", background: "#fff", flex: 1, minWidth: "150px", color: "#1e293b", fontWeight: 500 },

  // ======== NEW: Date Filter Bar Styles ========
  dateFilterBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    background: "#fff",
    padding: "12px 16px",
    borderRadius: "12px",
    marginBottom: 15,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
  },
  dateFilterLabel: { fontSize: "13px", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap" },
  dateFilterSelect: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "13px",
    background: "#fff",
    minWidth: "140px",
  },
  dateInput: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "13px",
    fontFamily: "inherit",
    background: "#fff",
  },
  monthNavigator: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f1f5f9",
    padding: "4px 12px",
    borderRadius: "8px",
  },
  navArrow: {
    border: "none",
    background: "transparent",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
    color: "#475569",
    transition: "background 0.2s",
  },
  monthLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
    minWidth: "80px",
    textAlign: "center",
  },
  todayBtn: {
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "8px",
  },
  yearSelect: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "13px",
    background: "#fff",
    minWidth: "100px",
  },
  dateFilterHint: {
    fontSize: "12px",
    color: "#475569",
    marginRight: "auto",
    background: "#e2e8f0",
    padding: "4px 10px",
    borderRadius: "6px",
    fontWeight: 600,
  },

  // Form
  formBox: { background: "#fff", padding: 16, borderRadius: 12, marginBottom: 15, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { margin: "0 0 15px 0", fontSize: "16px", color: "#1e293b", fontWeight: "700" },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  field: { flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "12px", fontWeight: "700", color: "#374151" },
  selectInput: { padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff" },
  textInput: { padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px" },
  addBtn: { width: "100%", fontWeight: "600", padding: "10px" },

  // Ledger
  ledgerContainer: { background: "#fff", padding: "12px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  ledgerCount: { fontSize: "13px", color: "#475569", fontWeight: "600", marginRight: "8px" },
  noData: { textAlign: "center", color: "#64748b", margin: 0, padding: "20px", fontWeight: 500 },

  item: (type) => ({
    padding: "12px",
    marginBottom: "8px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    background: type === "income" ? "#f0fdf4" : "#fff5f5",
    borderRight: type === "income" ? "4px solid #16a34a" : "4px solid #dc2626"
  }),

  itemRight: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  itemMiddle: { display: "flex", alignItems: "center", marginRight: "auto", marginLeft: "12px" },

  badge: (type) => ({
    fontSize: "11px",
    fontWeight: "bold",
    padding: "2px 6px",
    borderRadius: "4px",
    background: type === "income" ? "#bbf7d0" : "#fecaca",
    color: type === "income" ? "#15803d" : "#991b1b"
  }),

  amountText: (type) => ({ fontSize: "14px", color: type === "income" ? "#15803d" : "#b91c1c", fontFamily: "sans-serif" }),
  divider: { color: "#cbd5e1" },
  descText: { fontSize: "14px", color: "#1e293b", fontWeight: 500 },

  // ======== NEW: Date Badge Style ========
  dateBadge: {
    fontSize: "12px",
    color: "#374151",
    background: "#e2e8f0",
    padding: "3px 10px",
    borderRadius: "6px",
    fontFamily: "monospace",
    direction: "ltr",
    display: "inline-block",
    fontWeight: 600,
  },

  scopeBadge: (scope) => ({
    fontSize: "12px",
    background: "#f8fafc",
    padding: "3px 8px",
    borderRadius: "6px",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    fontWeight: 600,
  })
};