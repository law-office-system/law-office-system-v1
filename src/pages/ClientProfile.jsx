import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp
} from "firebase/firestore";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { useTheme } from "../context/ThemeContext.jsx";
import DocumentUploader from "../components/documents/DocumentUploader";
import DocumentCard from "../components/documents/DocumentCard";
import { getDocuments } from "../services/documents";
import { FileArchive, X, FileText } from "lucide-react";

const createStyles = (theme) => {
  const { colors } = theme;
  const { bg, border, text } = colors;
  const accent = colors.accent;
  const card = { background: bg.card, color: text.primary, border: `1px solid ${border.default}`, borderRadius: 12, padding: 20 };
  const field = { display: "flex", flexDirection: "column", gap: 5, minWidth: 160 };
  const input = { padding: 10, borderRadius: 8, border: `1px solid ${border.default}`, outline: "none", fontSize: 13, width: "100%", boxSizing: "border-box", background: bg.input, color: text.primary, fontFamily: "inherit" };
  const label = { fontSize: 12, fontWeight: 600, color: text.secondary };
  const title = { margin: 0, color: text.primary, fontWeight: 600 };

  return {
    page: { padding: 20, direction: "rtl", background: bg.page, color: text.primary, minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
    centerText: { textAlign: "center", padding: 50, color: text.muted, background: bg.page, minHeight: "100vh" },
    topBar: { display: "flex", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 },
    backBtn: { ...theme.button.secondary },
    editBtn: { ...theme.button.primary }, saveBtn: { ...theme.button.primary },
    cancelBtn: { ...theme.button.secondary },
    gridContainer: { display: "flex", gap: 20, flexWrap: "wrap", width: "100%", marginBottom: 20 },
    infoCard: { ...card, flex: "1.2", minWidth: 300, height: "fit-content" },
    casesCard: { ...card, flex: "1.2", minWidth: 300, height: "fit-content" },
    cardHeader: { borderBottom: `1px solid ${border.default}`, paddingBottom: 10, marginBottom: 15 },
    clientTitle: { ...title, fontSize: 16, fontWeight: 700 },
    profileTable: { display: "flex", flexDirection: "column", border: `1px solid ${border.default}`, borderRadius: 8, overflow: "hidden" },
    tableRow: { display: "flex", borderBottom: `1px solid ${border.default}`, background: bg.card },
    tableLabel: { width: 110, background: bg.hover, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, color: text.secondary, borderLeft: `1px solid ${border.default}`, flexShrink: 0 },
    tableValue: { padding: "10px 12px", fontSize: 13, color: text.primary, flex: 1, wordBreak: "break-word" },
    badge: { fontSize: 11, background: accent.bg, color: accent.main, border: `1px solid ${border.default}`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 },
    divider: { border: "none", borderTop: `1px dashed ${border.default}`, margin: "20px 0" },
    sectionTitle: { ...title, marginBottom: 15, fontSize: 15 },
    subSectionTitle: { ...title, marginBottom: 8, fontSize: 13, color: text.secondary, borderRight: `3px solid ${accent.main}`, paddingRight: 6 },
    noDataBox: { padding: 30, textAlign: "center", color: text.muted, background: bg.hover, borderRadius: 8, border: `1px dashed ${border.default}`, fontSize: 13 },
    casesList: { display: "flex", flexDirection: "column", gap: 10 },
    caseItem: { padding: 14, border: `1px solid ${border.default}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: bg.card, color: text.primary, transition: "transform 0.2s, box-shadow 0.2s" },
    caseTitle: { fontSize: 14, color: text.primary, fontWeight: 600 },
    caseSubtitle: { margin: "6px 0 0", fontSize: 11.5, color: text.muted },
    arrowIcon: { fontSize: 12, background: bg.hover, padding: "4px 8px", borderRadius: 6, color: text.secondary, fontWeight: 600 },
    financeSection: { ...card, marginTop: 10 },
    financeTitle: { ...title, marginBottom: 18, fontSize: 16, fontWeight: 700, borderBottom: `1px solid ${border.default}`, paddingBottom: 10 },
    financeSummaryGrid: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 },
    financeSummaryCard: { flex: 1, minWidth: 200, padding: 16, borderRadius: 10, display: "flex", flexDirection: "column", gap: 4, border: `1px solid ${border.default}` },
    financeSummaryLabel: { fontSize: 13, fontWeight: 600 }, financeSummaryValue: { fontSize: 20, fontWeight: 700, fontFamily: "sans-serif" },
    allocCard: { background: bg.hover, color: text.primary, padding: 16, borderRadius: 10, border: `1px solid ${border.default}`, marginBottom: 16 },
    allocTitle: { ...title, marginBottom: 12, fontSize: 14 },
    allocRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
    allocField: { ...field }, allocLabel: label,
    allocSelect: { ...theme.input, width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
    allocInput: { ...theme.input, width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
    financeCard: { background: bg.hover, color: text.primary, padding: 16, borderRadius: 10, border: `1px solid ${border.default}` },
    financeSubTitle: { ...title, marginBottom: 12, fontSize: 14 },
    transList: { display: "flex", flexDirection: "column", gap: 8 },
    transItem: { padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, border: `1px solid ${border.default}`, background: bg.card },
    transMain: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 },
    transBadge: { fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 },
    transDivider: { color: text.muted }, transDesc: { fontSize: 14, color: text.primary, fontWeight: 500 },
    transNotes: { fontSize: 12, color: text.muted, fontStyle: "italic" },
    transMeta: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    transCaseLink: { fontSize: 12, background: accent.bg, color: accent.main, padding: "3px 8px", borderRadius: 6, fontWeight: 600, cursor: "pointer", border: `1px solid ${border.default}` },
    transScopeBadge: { fontSize: 12, background: bg.hover, color: text.secondary, padding: "3px 8px", borderRadius: 6, border: `1px solid ${border.default}` },
    transDate: { fontSize: 12, color: text.secondary, fontFamily: "monospace", background: bg.hover, padding: "3px 8px", borderRadius: 6 },
    formBox: { ...card, width: "100%", boxSizing: "border-box" },
    row: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 15, alignItems: "flex-end" },
    field: { ...field }, label,
    textInput: { ...input }, selectInput: { ...theme.input, width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
  };
};

export default function ClientProfile() {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [client, setClient] = useState(null);
  const [clientCases, setClientCases] = useState([]);
  const [clientTransactions, setClientTransactions] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [allocForm, setAllocForm] = useState({
    caseId: "",
    type: "income",
    amount: "",
    description: "",
  });
  const [allocLoading, setAllocLoading] = useState(false);

  const [clientDocuments, setClientDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showDocUploader, setShowDocUploader] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    phone1: "",
    phone2: "",
    powerType: "رسمي عام قضايا",
    customPowerType: "",
    powerNumber: "",
    powerLetter: "",
    powerYear: "",
    powerOffice: "",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchClientAndCases = async () => {
      if (!userData?.officeId || !id) {
        setLoadingCases(false);
        setLoadingFinance(false);
        return;
      }

      setLoadingCases(true);
      setLoadingFinance(true);

      try {
        const ref = doc(db, "clientProfiles", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert("ملف الموكل غير موجود بالمنظومة.");
          navigate("/clients");
          return;
        }

        const data = snap.data();
        if (data.officeId !== userData.officeId) {
          alert("عفواً، لا تملك صلاحية الوصول لملف هذا الموكل.");
          navigate("/clients");
          return;
        }

        if (cancelled) return;

        setClient(data);

        const standardTypes = [
          "رسمي عام قضايا",
          "رسمي عام في القضايا والإدارة",
          "توكيل خاص بالمرور",
          "توكيل خاص بقضية محددة",
          "رسمي خاص بالبيع والنفس",
        ];
        const isCustom = data.powerOfAttorney?.type &&
          !standardTypes.includes(data.powerOfAttorney.type);

        setForm({
          fullName: data.fullName || "",
          nationalId: data.nationalId || "",
          address: data.address || "",
          phone1: data.phone1 || "",
          phone2: data.phone2 || "",
          powerType: isCustom ? "other" : (data.powerOfAttorney?.type || "رسمي عام قضايا"),
          customPowerType: isCustom ? data.powerOfAttorney.type : "",
          powerNumber: data.powerOfAttorney?.number || "",
          powerLetter: data.powerOfAttorney?.letter || "",
          powerYear: data.powerOfAttorney?.year || "",
          powerOffice: data.powerOfAttorney?.office || "",
        });

        const casesSnap = await getDocs(query(
          collection(db, "cases"),
          where("officeId", "==", userData.officeId)
        ));

        const loadedCases = [];
        const caseIds = [];

        casesSnap.forEach((caseSnap) => {
          const caseData = caseSnap.data();
          const caseClients = caseData.clients || [];
          const clientEntry = caseClients.find((item) => {
            const clientId = typeof item === "object" ? item.id : item;
            return clientId === id;
          });

          if (clientEntry !== undefined) {
            const clientRole = typeof clientEntry === "object"
              ? (clientEntry.clientRole || "غير محدد")
              : "غير محدد";
            loadedCases.push({ id: caseSnap.id, ...caseData, _clientRole: clientRole });
            caseIds.push(caseSnap.id);
          }
        });

        if (cancelled) return;
        setClientCases(loadedCases);

        const transSnap = await getDocs(query(
          collection(db, "transactions"),
          where("officeId", "==", userData.officeId)
        ));
        const loadedTrans = [];

        transSnap.forEach((transSnapDoc) => {
          const t = transSnapDoc.data();
          if (caseIds.includes(t.caseId) || t.clientId === id) {
            loadedTrans.push({ id: transSnapDoc.id, ...t });
          }
        });

        if (!cancelled) setClientTransactions(loadedTrans);
      } catch (error) {
        console.error("Error fetching client dashboard:", error);
      } finally {
        if (!cancelled) {
          setLoadingCases(false);
          setLoadingFinance(false);
        }
      }
    };

    fetchClientAndCases();
    return () => { cancelled = true; };
  }, [id, userData?.officeId, navigate]);

  const loadClientDocuments = useCallback(async () => {
    if (!userData?.officeId || !id) return;

    setLoadingDocs(true);
    try {
      const clientDocs = await getDocuments(userData.officeId, { clientId: id });
      const caseIds = clientCases.map((c) => c.id);
      let caseDocs = [];

      if (caseIds.length > 0) {
        const allOfficeDocs = await getDocuments(userData.officeId);
        caseDocs = allOfficeDocs.filter((d) => d.caseId && caseIds.includes(d.caseId));
      }

      const merged = [...clientDocs];
      const existingIds = new Set(clientDocs.map((d) => d.id));

      caseDocs.forEach((d) => {
        if (!existingIds.has(d.id)) {
          merged.push(d);
          existingIds.add(d.id);
        }
      });

      setClientDocuments(merged);
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  }, [userData?.officeId, id, clientCases]);

  useEffect(() => {
    loadClientDocuments();
  }, [loadClientDocuments]);

  const handleDocUploadComplete = () => {
    setShowDocUploader(false);
    loadClientDocuments();
  };

  const handleDocDelete = (docId) => {
    setClientDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleLinkDocToCase = async (docId, newCaseId) => {
    if (!newCaseId) return;

    try {
      const caseInfo = clientCases.find((c) => c.id === newCaseId);
      const caseTitle = caseInfo?.caseNumber || caseInfo?.caseSerial || caseInfo?.title || null;
      const caseYear = caseInfo?.caseYear || null;

      await updateDoc(doc(db, "documents", docId), {
        caseId: newCaseId,
        caseTitle,
        caseYear,
        updatedAt: serverTimestamp(),
      });

      setClientDocuments((prev) => prev.map((d) =>
        d.id === docId ? { ...d, caseId: newCaseId, caseTitle, caseYear } : d
      ));
    } catch (err) {
      console.error("Error linking document to case:", err);
      alert("فشل ربط المستند بالقضية: " + err.message);
    }
  };

  const caseIdsMap = useMemo(() => {
    const map = {};
    clientCases.forEach((c) => { map[c.id] = c; });
    return map;
  }, [clientCases]);

  const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    clientTransactions.forEach((t) => {
      const amount = Number(t.amount || 0);
      if (t.type === "income") inc += amount;
      if (t.type === "expense") exp += amount;
    });
    return { totalIncome: inc, totalExpenses: exp, netBalance: inc - exp };
  }, [clientTransactions]);

  const sortedTransactions = useMemo(() => (
    [...clientTransactions].sort((a, b) => {
      const aTime = a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime = b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime;
    })
  ), [clientTransactions]);

  const getTransactionDate = (t) => {
    if (!t.createdAt) return null;
    if (t.createdAt.seconds) return new Date(t.createdAt.seconds * 1000);
    if (t.createdAt instanceof Date) return t.createdAt;
    return new Date(t.createdAt);
  };

  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "—";
    return `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`;
  };

  const handleAllocation = async () => {
    if (!allocForm.caseId) return alert("يرجى اختيار القضية.");
    if (!allocForm.amount || isNaN(allocForm.amount) || Number(allocForm.amount) <= 0) {
      return alert("يرجى إدخال مبلغ صحيح.");
    }
    if (!allocForm.description.trim()) return alert("يرجى كتابة وصف للتخصيص.");

    setAllocLoading(true);
    try {
      const caseInfo = caseIdsMap[allocForm.caseId];
      const payload = {
        type: allocForm.type,
        amount: Number(allocForm.amount),
        description: allocForm.description.trim(),
        scope: "case",
        caseId: allocForm.caseId,
        caseNumber: caseInfo?.caseSerial || caseInfo?.caseNumber || "",
        clientId: id,
        clientName: client?.fullName || "",
        officeId: userData.officeId,
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || "unknown",
      };

      const docRef = await addDoc(collection(db, "transactions"), payload);
      setClientTransactions((prev) => [
        { id: docRef.id, ...payload, createdAt: new Date() },
        ...prev,
      ]);
      setAllocForm({ caseId: "", type: "income", amount: "", description: "" });
      alert("تم تخصيص المبلغ للقضية بنجاح ✅");
    } catch (err) {
      console.error("Allocation error:", err);
      alert("حدث خطأ أثناء التخصيص: " + err.message);
    } finally {
      setAllocLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.fullName.trim()) return alert("الاسم الرباعي حقل إلزامي.");

    const finalPowerType = form.powerType === "other"
      ? form.customPowerType.trim()
      : form.powerType;

    try {
      const updatedData = {
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        address: form.address.trim(),
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim(),
        powerOfAttorney: {
          type: finalPowerType || "غير محدد",
          number: form.powerNumber.trim(),
          letter: form.powerLetter.trim(),
          year: form.powerYear.trim(),
          office: form.powerOffice.trim(),
        },
      };

      await updateDoc(doc(db, "clientProfiles", id), updatedData);
      setClient((prev) => ({ ...prev, ...updatedData }));
      alert("تم تحديث السجل المركزي للموكل بنجاح ✅");
      setEditMode(false);
    } catch (error) {
      console.error("Update client error:", error);
      alert("حدث خطأ أثناء حفظ التحديثات.");
    }
  };

  if (!client) {
    return (
      <div style={styles.centerText}>
        <p>جاري استدعاء ملف الموكل وتدقيق الصلاحيات...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <Button variant="secondary" onClick={() => navigate("/clients")} style={styles.backBtn}>
          🔀 عودة لسجل الموكلين
        </Button>

        {!editMode ? (
          <Button variant="primary" onClick={() => setEditMode(true)} style={styles.editBtn}>
            ✏️ تعديل بيانات الملف
          </Button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" onClick={handleSave} style={styles.saveBtn}>
              💾 حفظ التغييرات
            </Button>
            <Button variant="secondary" onClick={() => setEditMode(false)} style={styles.cancelBtn}>
              ❌ إلغاء
            </Button>
          </div>
        )}
      </div>

      {!editMode ? (
        <>
          <div style={styles.gridContainer}>
            <div style={styles.infoCard}>
              <div style={styles.cardHeader}>
                <h2 style={styles.clientTitle}>👤 ملف الموكل: {client.fullName}</h2>
              </div>

              <h3 style={styles.subSectionTitle}>📋 البيانات الشخصية وبيانات الاتصال</h3>
              <div style={styles.profileTable}>
                <div style={styles.tableRow}><div style={styles.tableLabel}>الاسم الكامل:</div><div style={styles.tableValue}><strong>{client.fullName || "—"}</strong></div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>الرقم القومي:</div><div style={{ ...styles.tableValue, fontFamily: "monospace" }}>{client.nationalId || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>العنوان:</div><div style={styles.tableValue}>{client.address || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>رقم الهاتف 1:</div><div style={styles.tableValue}>{client.phone1 || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>رقم الهاتف 2:</div><div style={styles.tableValue}>{client.phone2 || "—"}</div></div>
              </div>

              <div style={{ margin: "25px 0 15px" }} />
              <h3 style={styles.subSectionTitle}>📄 بيانات التوكيل القضائي</h3>
              <div style={styles.profileTable}>
                <div style={styles.tableRow}><div style={styles.tableLabel}>طبيعة التوكيل:</div><div style={styles.tableValue}><span style={styles.badge}>{client.powerOfAttorney?.type || "غير محدد"}</span></div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>رقم التوكيل:</div><div style={styles.tableValue}>{client.powerOfAttorney?.number || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>حرف التوكيل:</div><div style={styles.tableValue}>{client.powerOfAttorney?.letter || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>سنة التوثيق:</div><div style={styles.tableValue}>{client.powerOfAttorney?.year || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>مكتب التوثيق:</div><div style={styles.tableValue}>{client.powerOfAttorney?.office || "—"}</div></div>
              </div>
            </div>

            <div style={styles.casesCard}>
              <h3 style={styles.sectionTitle}>📁 ملف القضايا والنزاعات المرتبطة ({clientCases.length})</h3>
              {loadingCases ? (
                <p style={{ color: "var(--theme-text-muted)", fontSize: 13 }}>جاري جلب القضايا...</p>
              ) : clientCases.length === 0 ? (
                <div style={styles.noDataBox}>لا توجد قضايا مقيدة باسم هذا الموكل حالياً بالسيستم.</div>
              ) : (
                <div style={styles.casesList}>
                  {clientCases.map((c) => (
                    <div key={c.id} style={styles.caseItem} onClick={() => navigate(`/case/${c.id}`)}>
                      <div style={{ flex: 1 }}>
                        <strong style={styles.caseTitle}>⚖️ قضية رقم: {c.caseNumber || c.caseSerial || "بدون رقم"} / {c.caseYear || "—"}</strong>
                        <div style={{ fontSize: 12.5, color: "var(--theme-text-secondary)", marginTop: 4 }}>
                          🏢 {c.court || c.courtName || "المحكمة غير محددة"}
                        </div>
                        <p style={styles.caseSubtitle}>
                          نوع الدعوى: {c.caseType || "غير محدد"}
                          <span style={{ margin: "0 8px", color: "var(--theme-text-muted)" }}>|</span>
                          صفته: <span style={{ color: "var(--theme-accent-main)", fontWeight: 600 }}>{c._clientRole}</span>
                          <span style={{ margin: "0 8px", color: "var(--theme-text-muted)" }}>|</span>
                          الحالة: <span style={{
                            color: c.status === "ACTIVE" ? "#16a34a" : c.status === "CLOSED" ? "var(--theme-text-muted)" : "#d97706",
                            fontWeight: 600,
                          }}>{c.status === "ACTIVE" ? "نشطة" : c.status === "CLOSED" ? "مغلقة" : (c.status || "غير محدد")}</span>
                        </p>
                      </div>
                      <span style={styles.arrowIcon}>👁️ عرض</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={styles.financeSection}>
            <h3 style={styles.financeTitle}>💰 الحسابات المالية والخزينة الخاصة بالموكل</h3>
            <div style={styles.financeSummaryGrid}>
              <div style={{ ...styles.financeSummaryCard, background: "var(--theme-bg-card)", borderRight: "5px solid #10b981" }}>
                <span style={{ ...styles.financeSummaryLabel, color: "#10b981" }}>💰 إجمالي المقبوضات (دخل)</span>
                <span style={{ ...styles.financeSummaryValue, color: "#10b981" }}>{totalIncome.toLocaleString()} ج.م</span>
              </div>
              <div style={{ ...styles.financeSummaryCard, background: "var(--theme-bg-card)", borderRight: "5px solid #ef4444" }}>
                <span style={{ ...styles.financeSummaryLabel, color: "#ef4444" }}>💸 إجمالي المصروفات (منفق)</span>
                <span style={{ ...styles.financeSummaryValue, color: "#ef4444" }}>{totalExpenses.toLocaleString()} ج.م</span>
              </div>
              <div style={{
                ...styles.financeSummaryCard,
                background: "var(--theme-bg-card)",
                borderRight: `5px solid ${netBalance >= 0 ? "#22c55e" : "#f43f5e"}`,
              }}>
                <span style={{ ...styles.financeSummaryLabel, color: netBalance >= 0 ? "#22c55e" : "#f43f5e" }}>📊 الرصيد الصافي الحالي</span>
                <span style={{ ...styles.financeSummaryValue, color: netBalance >= 0 ? "#22c55e" : "#f43f5e" }}>{netBalance.toLocaleString()} ج.م</span>
              </div>
            </div>

            <div style={styles.allocCard}>
              <h4 style={styles.allocTitle}>➕ تخصيص مبلغ مالي من رصيد الموكل لقضية محددة</h4>
              <div style={styles.allocRow}>
                <div style={{ ...styles.allocField, flex: 2 }}>
                  <label style={styles.allocLabel}>القضية المستفيدة</label>
                  <select value={allocForm.caseId} onChange={(e) => setAllocForm({ ...allocForm, caseId: e.target.value })} style={styles.allocSelect}>
                    <option value="">اختر من قضايا هذا الموكل...</option>
                    {clientCases.map((c) => (
                      <option key={c.id} value={c.id}>⚖️ ق رقم {c.caseSerial || c.caseNumber || "—"} / {c.caseYear || "—"} — {c.court || "غير محدد"}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.allocField}>
                  <label style={styles.allocLabel}>نوع الحركة</label>
                  <select value={allocForm.type} onChange={(e) => setAllocForm({ ...allocForm, type: e.target.value })} style={styles.allocSelect}>
                    <option value="income">🟢 تحصيل / دفعة من الموكل</option>
                    <option value="expense">🔴 صرف / رد لمبلغ للموكل</option>
                  </select>
                </div>
                <div style={styles.allocField}>
                  <label style={styles.allocLabel}>المبلغ (ج.م)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={allocForm.amount} onChange={(e) => setAllocForm({ ...allocForm, amount: e.target.value })} style={styles.allocInput} />
                </div>
              </div>
              <div style={{ ...styles.allocRow, marginTop: 10 }}>
                <div style={{ ...styles.allocField, flex: 3 }}>
                  <label style={styles.allocLabel}>بيان التخصيص والسبب</label>
                  <input placeholder="مثال: دفعة أولى أتعاب قضية النقض، رسوم استئناف..." value={allocForm.description} onChange={(e) => setAllocForm({ ...allocForm, description: e.target.value })} style={styles.allocInput} />
                </div>
                <div style={{ ...styles.allocField, flex: 1, justifyContent: "flex-end" }}>
                  <Button variant="primary" onClick={handleAllocation} disabled={allocLoading} style={{ width: "100%", fontWeight: 600, padding: 10 }}>
                    {allocLoading ? "⏳ جاري القيد..." : "📋 قيد التخصيص الآن"}
                  </Button>
                </div>
              </div>
            </div>

            <div style={styles.financeCard}>
              <h4 style={styles.financeSubTitle}>📒 دفتر المعاملات المالية المرتبطة بالموكل ({clientTransactions.length})</h4>
              {loadingFinance ? (
                <p style={{ color: "var(--theme-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>جاري جلب البيانات المالية...</p>
              ) : sortedTransactions.length === 0 ? (
                <div style={styles.noDataBox}>لا توجد معاملات مالية مقيدة لهذا الموكل حالياً.</div>
              ) : (
                <div style={styles.transList}>
                  {sortedTransactions.map((t) => {
                    const caseInfo = caseIdsMap[t.caseId];
                    const tDate = getTransactionDate(t);
                    const isIncome = t.type === "income";
                    const semanticColor = isIncome ? "#16a34a" : "#dc2626";

                    return (
                      <div key={t.id} style={{
                        ...styles.transItem,
                        borderRight: `4px solid ${semanticColor}`,
                      }}>
                        <div style={styles.transMain}>
                          <span style={{
                            ...styles.transBadge,
                            background: isIncome ? "rgba(22,163,74,0.14)" : "rgba(220,38,38,0.14)",
                            color: semanticColor,
                          }}>{isIncome ? "💰 دخل" : "💸 مصروف"}</span>
                          <strong style={{ fontSize: 15, color: semanticColor, fontFamily: "sans-serif" }}>{Number(t.amount).toLocaleString()} ج.م</strong>
                          <span style={styles.transDivider}>|</span>
                          <span style={styles.transDesc}>{t.description || "—"}</span>
                          {t.notes && <span style={styles.transNotes}>({t.notes})</span>}
                        </div>
                        <div style={styles.transMeta}>
                          {caseInfo && <span style={styles.transCaseLink} onClick={() => navigate(`/case/${t.caseId}`)}>⚖️ قضية {caseInfo.caseSerial || caseInfo.caseNumber || "—"}</span>}
                          {t.scope === "client" && !t.caseId && <span style={styles.transScopeBadge}>👤 حساب عام</span>}
                          <span style={styles.transDate}>📅 {formatDate(tDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: colors.bg.card,
            border: `1px solid ${colors.border.default}`,
            borderRadius: 16,
            padding: 20,
            marginTop: 10,
            color: colors.text.primary,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 16, borderBottom: `1px solid ${colors.border.default}`, paddingBottom: 10,
              flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44,
                  background: "var(--theme-accent-main)",
                  borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px ${colors.accent[theme.accentId]?.main || colors.accent.blue.main}30`,
                }}>
                  <FileArchive size={22} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 16, fontWeight: 700 }}>
                    المستندات والملفات
                  </h3>
                  <p style={{ margin: "4px 0 0", color: colors.text.muted, fontSize: 13 }}>
                    {clientDocuments.length} مستند{clientDocuments.length !== 1 ? "ات" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocUploader(!showDocUploader)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", background: "var(--theme-accent-main)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {showDocUploader ? <X size={14} /> : <FileText size={14} />}
                {showDocUploader ? "إلغاء" : "رفع مستند"}
              </button>
            </div>

            {showDocUploader && (
              <div style={{ marginBottom: 20 }}>
                <DocumentUploader clientId={id} onUpload={handleDocUploadComplete} onClose={() => setShowDocUploader(false)} />
              </div>
            )}

            {loadingDocs ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150, color: colors.text.muted }}>
                <div style={{
                  width: 28, height: 28,
                  border: `3px solid var(--theme-accent-bg)`,
                  borderTopColor: "var(--theme-accent-main)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }} />
              </div>
            ) : clientDocuments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: colors.text.muted }}>
                <FileArchive size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>لا توجد مستندات مرتبطة بهذا الموكل</p>
                <p style={{ fontSize: 13, margin: 0 }}>ابدأ برفع أول مستند</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {clientDocuments.map((document) => (
                  <div key={document.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <DocumentCard doc={document} onDelete={handleDocDelete} onPreview={setSelectedDoc} />
                    {!document.caseId && clientCases.length > 0 && (
                      <div style={{
                        padding: "8px 12px", background: colors.bg.hover,
                        borderRadius: 10, border: `1px solid ${colors.border.default}`,
                      }}>
                        <select
                          value=""
                          onChange={(e) => handleLinkDocToCase(document.id, e.target.value)}
                          style={{
                            width: "100%", padding: "6px 10px", borderRadius: 8,
                            border: `1px solid ${colors.border.default}`,
                            background: colors.bg.card, color: colors.text.primary,
                            fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                          }}
                        >
                          <option value="">🔗 ربط بقضية...</option>
                          {clientCases.map((c) => (
                            <option key={c.id} value={c.id}>
                              ⚖️ ق {c.caseSerial || c.caseNumber || "—"} / {c.caseYear || "—"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {document.caseId && (
                      <div style={{
                        padding: "6px 12px",
                        background: "var(--theme-accent-bg)",
                        borderRadius: 10,
                        border: `1px solid ${colors.border.default}`,
                        fontSize: 12,
                        color: "var(--theme-accent-main)",
                        textAlign: "center",
                      }}>
                        ⚖️ مرتبط بقضية: {document.caseTitle || clientCases.find((c) => c.id === document.caseId)?.caseSerial || document.caseId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <form style={styles.formBox} onSubmit={handleSave}>
          <h3 style={styles.sectionTitle}>📋 تعديل بيانات ملف الموكل</h3>
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 2 }}>
              <label style={styles.label}>الاسم الرباعي الكامل *</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} style={styles.textInput} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>الرقم القومي (14 رقم)</label>
              <input name="nationalId" maxLength={14} value={form.nationalId} onChange={handleChange} style={styles.textInput} />
            </div>
          </div>
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 2 }}>
              <label style={styles.label}>العنوان ومحل الإقامة</label>
              <input name="address" value={form.address} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>رقم الهاتف 1</label>
              <input name="phone1" value={form.phone1} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>رقم الهاتف 2</label>
              <input name="phone2" value={form.phone2} onChange={handleChange} style={styles.textInput} />
            </div>
          </div>
          <hr style={styles.divider} />
          <h3 style={styles.sectionTitle}>📄 تحديث بيانات التوكيل القضائي</h3>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>نوع التوكيل</label>
              <select name="powerType" value={form.powerType} onChange={handleChange} style={styles.selectInput}>
                <option value="رسمي عام قضايا">⚖️ رسمي عام قضايا</option>
                <option value="رسمي عام في القضايا والإدارة">🏢 رسمي عام قضايا وإدارة</option>
                <option value="توكيل خاص بالمرور">🚗 توكيل خاص (مرور)</option>
                <option value="توكيل خاص بقضية محددة">📌 توكيل خاص بقضية</option>
                <option value="رسمي خاص بالبيع والنفس">💰 رسمي خاص (بيع ونفس)</option>
                <option value="other">✍️ نوع آخر (كتابة يدوية)...</option>
              </select>
            </div>
            {form.powerType === "other" && (
              <div style={styles.field}>
                <label style={styles.label}>اكتب نوع التوكيل يدوياً *</label>
                <input name="customPowerType" value={form.customPowerType} onChange={handleChange} style={styles.textInput} required />
              </div>
            )}
            <div style={styles.field}>
              <label style={styles.label}>رقم التوكيل</label>
              <input name="powerNumber" value={form.powerNumber} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>حرف التوكيل</label>
              <input name="powerLetter" value={form.powerLetter} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>السنة</label>
              <input name="powerYear" maxLength={4} value={form.powerYear} onChange={handleChange} style={styles.textInput} />
            </div>
            <div style={{ ...styles.field, flex: 1.5 }}>
              <label style={styles.label}>مكتب التوثيق</label>
              <input name="powerOffice" value={form.powerOffice} onChange={handleChange} style={styles.textInput} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="submit" variant="primary" style={styles.saveBtn}>💾 حفظ التغييرات</Button>
            <Button type="button" variant="secondary" onClick={() => setEditMode(false)} style={styles.cancelBtn}>إلغاء</Button>
          </div>
        </form>
      )}

      {selectedDoc && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div
            style={{
              background: colors.bg.card, borderRadius: 20,
              maxWidth: "90vw", maxHeight: "90vh", width: "100%",
              overflow: "hidden", display: "flex", flexDirection: "column",
              border: `1px solid ${colors.border.default}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "16px 20px", borderBottom: `1px solid ${colors.border.default}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 16 }}>
                {selectedDoc.name || selectedDoc.fileName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                style={{ background: "none", border: "none", color: colors.text.muted, cursor: "pointer", padding: 4 }}
                aria-label="إغلاق المعاينة"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
              {selectedDoc.fileType?.startsWith("image/") ? (
                <img src={selectedDoc.downloadURL} alt={selectedDoc.fileName} style={{ maxWidth: "100%", borderRadius: 12 }} />
              ) : selectedDoc.fileType === "application/pdf" ? (
                <iframe src={selectedDoc.downloadURL} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 12 }} title={selectedDoc.fileName} />
              ) : (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <FileText size={64} color={colors.text.muted} />
                  <p style={{ color: colors.text.muted, marginTop: 16 }}>لا يمكن معاينة هذا النوع من الملفات</p>
                  <a
                    href={selectedDoc.downloadURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      marginTop: 16, padding: "10px 20px",
                      background: "var(--theme-accent-main)", color: "#fff",
                      borderRadius: 12, textDecoration: "none", fontWeight: 600,
                    }}
                  >
                    تحميل الملف
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
