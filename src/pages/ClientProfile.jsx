import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp
} from "firebase/firestore";
import { uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { storage } from "../firebaseStorage";
import { useTheme } from "../context/ThemeContext.jsx";
import DocumentUploader from "../components/documents/DocumentUploader";
import DocumentCard from "../components/documents/DocumentCard";
import { getDocuments, deleteDocument } from "../services/documents";
import { FileArchive, X, FileText } from "lucide-react";

export default function ClientProfile() {
  const { theme } = useTheme();
  const { colors } = theme;
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
  const [previewDoc, setPreviewDoc] = useState(null);
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
    const fetchClientAndCases = async () => {
      if (!userData?.officeId) return;
      try {
        const ref = doc(db, "clientProfiles", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.officeId !== userData.officeId) {
            alert("عفواً، لا تملك صلاحية الوصول لملف هذا الموكل.");
            return navigate("/clients");
          }
          setClient(data);
          const standardTypes = ["رسمي عام قضايا", "رسمي عام في القضايا والإدارة", "توكيل خاص بالمرور", "توكيل خاص بقضية محددة", "رسمي خاص بالبيع والنفس"];
          const isCustom = data.powerOfAttorney?.type && !standardTypes.includes(data.powerOfAttorney.type);
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
          const casesRef = collection(db, "cases");
          const q = query(casesRef, where("officeId", "==", userData.officeId));
          const casesSnap = await getDocs(q);
          const loadedCases = [];
          const caseIds = [];
          casesSnap.forEach((docSnap) => {
            const caseData = docSnap.data();
            const caseClients = caseData.clients || [];
            const isLinked = caseClients.some((clientItem) => {
              const clientId = typeof clientItem === "object" ? clientItem.id : clientItem;
              return clientId === id;
            });
            if (isLinked) {
              const clientEntry = caseClients.find((clientItem) => {
                const clientId = typeof clientItem === "object" ? clientItem.id : clientItem;
                return clientId === id;
              });
              const clientRole = typeof clientEntry === "object" ? (clientEntry.clientRole || "غير محدد") : "غير محدد";
              loadedCases.push({ id: docSnap.id, ...caseData, _clientRole: clientRole });
              caseIds.push(docSnap.id);
            }
          });
          setClientCases(loadedCases);
          if (caseIds.length > 0) {
            const transRef = collection(db, "transactions");
            const transQ = query(transRef, where("officeId", "==", userData.officeId));
            const transSnap = await getDocs(transQ);
            const loadedTrans = [];
            transSnap.forEach((docSnap) => {
              const t = docSnap.data();
              if (caseIds.includes(t.caseId) || t.clientId === id) {
                loadedTrans.push({ id: docSnap.id, ...t });
              }
            });
            setClientTransactions(loadedTrans);
          } else {
            const transRef = collection(db, "transactions");
            const transQ = query(transRef, where("officeId", "==", userData.officeId));
            const transSnap = await getDocs(transQ);
            const loadedTrans = [];
            transSnap.forEach((docSnap) => {
              const t = docSnap.data();
              if (t.clientId === id) loadedTrans.push({ id: docSnap.id, ...t });
            });
            setClientTransactions(loadedTrans);
          }
        } else {
          alert("ملف الموكل غير موجود بالمنظومة.");
          navigate("/clients");
        }
      } catch (error) {
        console.error("Error fetching client dashboard:", error);
      } finally {
        setLoadingCases(false);
        setLoadingFinance(false);
      }
    };
    fetchClientAndCases();
  }, [id, userData, navigate]);

  const loadClientDocuments = useCallback(async () => {
    if (!userData?.officeId || !id) return;
    setLoadingDocs(true);
    try {
      // 1. Fetch documents directly linked to this client
      const clientDocs = await getDocuments(userData.officeId, { clientId: id });

      // 2. Fetch documents linked to any of this client's cases
      const caseIds = clientCases.map(c => c.id);
      let caseDocs = [];
      if (caseIds.length > 0) {
        const allOfficeDocs = await getDocuments(userData.officeId);
        caseDocs = allOfficeDocs.filter(d => d.caseId && caseIds.includes(d.caseId));
      }

      // 3. Merge and deduplicate by id
      const merged = [...clientDocs];
      const existingIds = new Set(clientDocs.map(d => d.id));
      caseDocs.forEach(d => {
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
      await updateDoc(doc(db, "documents", docId), {
        caseId: newCaseId,
        caseTitle: caseInfo?.caseNumber || caseInfo?.caseSerial || caseInfo?.title || null,
        caseYear: caseInfo?.caseYear || null,
        updatedAt: serverTimestamp(),
      });
      setClientDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                caseId: newCaseId,
                caseTitle: caseInfo?.caseNumber || caseInfo?.caseSerial || caseInfo?.title || null,
                caseYear: caseInfo?.caseYear || null,
              }
            : d
        )
      );
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
    let inc = 0, exp = 0;
    clientTransactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") inc += amt;
      if (t.type === "expense") exp += amt;
    });
    return { totalIncome: inc, totalExpenses: exp, netBalance: inc - exp };
  }, [clientTransactions]);

  const sortedTransactions = useMemo(() => {
    return [...clientTransactions].sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return bTime - aTime;
    });
  }, [clientTransactions]);

  const getTransactionDate = (t) => {
    if (!t.createdAt) return null;
    if (t.createdAt.seconds) return new Date(t.createdAt.seconds * 1000);
    if (t.createdAt instanceof Date) return t.createdAt;
    return new Date(t.createdAt);
  };

  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "—";
    const d = dateObj;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleAllocation = async () => {
    if (!allocForm.caseId) return alert("يرجى اختيار القضية.");
    if (!allocForm.amount || isNaN(allocForm.amount) || Number(allocForm.amount) <= 0) return alert("يرجى إدخال مبلغ صحيح.");
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
      setClientTransactions((prev) => [{ id: docRef.id, ...payload, createdAt: new Date() }, ...prev]);
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
    const finalPowerType = form.powerType === "other" ? form.customPowerType.trim() : form.powerType;
    try {
      const ref = doc(db, "clientProfiles", id);
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
      await updateDoc(ref, updatedData);
      setClient((prev) => ({ ...prev, ...updatedData }));
      alert("تم تحديث السجل المركزي للموكل بنجاح ✅");
      setEditMode(false);
    } catch (error) {
      console.error("Update client error:", error);
      alert("حدث خطأ أثناء حفظ التحديثات.");
    }
  };

  if (!client) {
    return <div style={styles.centerText}><p>جاري استدعاء ملف الموكل وتدقيق الصلاحيات...</p></div>;
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
          <div style={{ display: "flex", gap: "8px" }}>
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
                <div style={styles.tableRow}><div style={styles.tableLabel}>الرقم القومي:</div><div style={{...styles.tableValue, fontFamily: 'monospace'}}>{client.nationalId || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>العنوان:</div><div style={styles.tableValue}>{client.address || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>رقم الهاتف 1:</div><div style={styles.tableValue}>{client.phone1 || "—"}</div></div>
                <div style={styles.tableRow}><div style={styles.tableLabel}>رقم الهاتف 2:</div><div style={styles.tableValue}>{client.phone2 || "—"}</div></div>
              </div>
              <div style={{ margin: "25px 0 15px 0" }}></div>
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
                <p style={{ color: "#64748b", fontSize: "13px" }}>جاري جلب القضايا...</p>
              ) : clientCases.length === 0 ? (
                <div style={styles.noDataBox}>لا توجد قضايا مقيدة باسم هذا الموكل حالياً بالسيستم.</div>
              ) : (
                <div style={styles.casesList}>
                  {clientCases.map((c) => (
                    <div key={c.id} style={styles.caseItem} onClick={() => navigate(`/case/${c.id}`)}>
                      <div style={{ flex: 1 }}>
                        <strong style={styles.caseTitle}>⚖️ قضية رقم: {c.caseNumber || c.caseSerial || "بدون رقم"} / {c.caseYear || "—"}</strong>
                        <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "4px" }}>🏢 {c.court || c.courtName || "المحكمة غير محددة"}</div>
                        <p style={styles.caseSubtitle}>
                          نوع الدعوى: {c.caseType || "غير محدد"}
                          <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
                          صفته: <span style={{ color: "#2563eb", fontWeight: 600 }}>{c._clientRole}</span>
                          <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
                          الحالة: <span style={{ color: c.status === 'ACTIVE' ? '#16a34a' : c.status === 'CLOSED' ? '#64748b' : '#d97706', fontWeight: 600 }}>{c.status === 'ACTIVE' ? 'نشطة' : c.status === 'CLOSED' ? 'مغلقة' : (c.status || 'غير محدد')}</span>
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
              <div style={{ ...styles.financeSummaryCard, background: "#ecfdf5", borderRight: "5px solid #10b981" }}>
                <span style={{ ...styles.financeSummaryLabel, color: "#065f46" }}>💰 إجمالي المقبوضات (دخل)</span>
                <span style={{ ...styles.financeSummaryValue, color: "#047857" }}>{totalIncome.toLocaleString()} ج.م</span>
              </div>
              <div style={{ ...styles.financeSummaryCard, background: "#fef2f2", borderRight: "5px solid #ef4444" }}>
                <span style={{ ...styles.financeSummaryLabel, color: "#991b1b" }}>💸 إجمالي المصروفات (منفق)</span>
                <span style={{ ...styles.financeSummaryValue, color: "#b91c1c" }}>{totalExpenses.toLocaleString()} ج.م</span>
              </div>
              <div style={{ ...styles.financeSummaryCard, background: netBalance >= 0 ? "#f0fdf4" : "#fff5f5", borderRight: netBalance >= 0 ? "5px solid #22c55e" : "5px solid #f43f5e" }}>
                <span style={{ ...styles.financeSummaryLabel, color: netBalance >= 0 ? "#166534" : "#991b1b" }}>📊 الرصيد الصافي الحالي</span>
                <span style={{ ...styles.financeSummaryValue, color: netBalance >= 0 ? "#15803d" : "#be123c" }}>{netBalance.toLocaleString()} ج.م</span>
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
                  <input placeholder="0.00" value={allocForm.amount} onChange={(e) => setAllocForm({ ...allocForm, amount: e.target.value })} style={styles.allocInput} />
                </div>
              </div>
              <div style={{ ...styles.allocRow, marginTop: "10px" }}>
                <div style={{ ...styles.allocField, flex: 3 }}>
                  <label style={styles.allocLabel}>بيان التخصيص والسبب</label>
                  <input placeholder="مثال: دفعة أولى أتعاب قضية النقض، رسوم استئناف..." value={allocForm.description} onChange={(e) => setAllocForm({ ...allocForm, description: e.target.value })} style={styles.allocInput} />
                </div>
                <div style={{ ...styles.allocField, flex: 1, justifyContent: "flex-end" }}>
                  <Button variant="primary" onClick={handleAllocation} disabled={allocLoading} style={{ width: "100%", fontWeight: "600", padding: "10px" }}>
                    {allocLoading ? "⏳ جاري القيد..." : "📋 قيد التخصيص الآن"}
                  </Button>
                </div>
              </div>
            </div>

            <div style={styles.financeCard}>
              <h4 style={styles.financeSubTitle}>📒 دفتر المعاملات المالية المرتبطة بالموكل ({clientTransactions.length})</h4>
              {loadingFinance ? (
                <p style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "20px" }}>جاري جلب البيانات المالية...</p>
              ) : sortedTransactions.length === 0 ? (
                <div style={styles.noDataBox}>لا توجد معاملات مالية مقيدة لهذا الموكل حالياً.</div>
              ) : (
                <div style={styles.transList}>
                  {sortedTransactions.map((t) => {
                    const caseInfo = caseIdsMap[t.caseId];
                    const tDate = getTransactionDate(t);
                    return (
                      <div key={t.id} style={{ ...styles.transItem, background: t.type === "income" ? "#f0fdf4" : "#fff5f5", borderRight: t.type === "income" ? "4px solid #16a34a" : "4px solid #dc2626" }}>
                        <div style={styles.transMain}>
                          <span style={{ ...styles.transBadge, background: t.type === "income" ? "#bbf7d0" : "#fecaca", color: t.type === "income" ? "#15803d" : "#991b1b" }}>{t.type === "income" ? "💰 دخل" : "💸 مصروف"}</span>
                          <strong style={{ fontSize: "15px", color: t.type === "income" ? "#15803d" : "#b91c1c", fontFamily: "sans-serif" }}>{Number(t.amount).toLocaleString()} ج.م</strong>
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

          {/* ═══════════════════════════════════════════════════════════════
              📁 DOCUMENTS SECTION — Using DocumentUploader & DocumentCard
              ═══════════════════════════════════════════════════════════════ */}
          <div style={{
            background: colors.bg.card,
            border: `1px solid ${colors.border.default}`,
            borderRadius: 16,
            padding: 20,
            marginTop: 10,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 16, borderBottom: `1px solid ${colors.border.default}`, paddingBottom: 10,
              flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44,
                  background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
                  borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px ${colors.accent.blue.main}30`,
                }}>
                  <FileArchive size={22} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 16, fontWeight: 700 }}>
                    المستندات والملفات
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: colors.text.muted, fontSize: 13 }}>
                    {clientDocuments.length} مستند{clientDocuments.length !== 1 ? 'ات' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocUploader(!showDocUploader)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: '8px 16px', background: colors.accent.blue.dark,
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {showDocUploader ? <X size={14} /> : <FileText size={14} />}
                {showDocUploader ? "إلغاء" : "رفع مستند"}
              </button>
            </div>

            {showDocUploader && (
              <div style={{ marginBottom: 20 }}>
                <DocumentUploader
                  clientId={id}
                  onUpload={handleDocUploadComplete}
                  onClose={() => setShowDocUploader(false)}
                />
              </div>
            )}

            {loadingDocs ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 150, color: colors.text.muted,
              }}>
                <div style={{
                  width: 28, height: 28,
                  border: `3px solid ${colors.accent.blue.bg}`,
                  borderTopColor: colors.accent.blue.dark,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }} />
              </div>
            ) : clientDocuments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: colors.text.muted }}>
                <FileArchive size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px 0' }}>لا توجد مستندات مرتبطة بهذا الموكل</p>
                <p style={{ fontSize: 13, margin: 0 }}>ابدأ برفع أول مستند</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 14,
              }}>
                {clientDocuments.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <DocumentCard
                      doc={doc}
                      onDelete={handleDocDelete}
                      onPreview={setSelectedDoc}
                    />
                    {/* 🔗 Link to Case Dropdown */}
                    {!doc.caseId && clientCases.length > 0 && (
                      <div style={{
                        padding: '8px 12px',
                        background: colors.bg.hover,
                        borderRadius: 10,
                        border: `1px solid ${colors.border.default}`,
                      }}>
                        <select
                          value=""
                          onChange={(e) => handleLinkDocToCase(doc.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: `1px solid ${colors.border.default}`,
                            background: colors.bg.card,
                            color: colors.text.primary,
                            fontSize: 12,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
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
                    {/* ✅ Already linked indicator */}
                    {doc.caseId && (
                      <div style={{
                        padding: '6px 12px',
                        background: `${colors.accent.blue.main}10`,
                        borderRadius: 10,
                        border: `1px solid ${colors.accent.blue.main}20`,
                        fontSize: 12,
                        color: colors.accent.blue.light,
                        textAlign: 'center',
                      }}>
                        ⚖️ مرتبط بقضية: {doc.caseTitle || clientCases.find(c => c.id === doc.caseId)?.caseSerial || doc.caseId}
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
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          📁 DOCUMENT PREVIEW MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {selectedDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={() => setSelectedDoc(null)}>
          <div
            style={{
              background: colors.bg.card, borderRadius: 20,
              maxWidth: '90vw', maxHeight: '90vh', width: '100%',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              border: `1px solid ${colors.border.default}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${colors.border.default}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 16 }}>
                {selectedDoc.name || selectedDoc.fileName}
              </h3>
              <button onClick={() => setSelectedDoc(null)}
                style={{ background: 'none', border: 'none', color: colors.text.muted, cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {selectedDoc.fileType?.startsWith('image/') ? (
                <img src={selectedDoc.downloadURL} alt={selectedDoc.fileName}
                  style={{ maxWidth: '100%', borderRadius: 12 }} />
              ) : selectedDoc.fileType === 'application/pdf' ? (
                <iframe src={selectedDoc.downloadURL}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 12 }}
                  title={selectedDoc.fileName} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <FileText size={64} color={colors.text.muted} />
                  <p style={{ color: colors.text.muted, marginTop: 16 }}>
                    لا يمكن معاينة هذا النوع من الملفات
                  </p>
                  <a href={selectedDoc.downloadURL} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      marginTop: 16, padding: '10px 20px',
                      background: colors.accent.blue.dark, color: 'white',
                      borderRadius: 12, textDecoration: 'none', fontWeight: 600,
                    }}>
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

const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  centerText: { textAlign: "center", padding: "50px", color: "#64748b" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" },
  backBtn: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1" },
  editBtn: { background: "#2c3e50" },
  saveBtn: { background: "#16a34a" },
  cancelBtn: { background: "#64748b", color: "#fff" },
  gridContainer: { display: "flex", gap: "20px", flexWrap: "wrap", width: "100%", marginBottom: "20px" },
  infoCard: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: "1.2", minWidth: "300px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", height: "fit-content" },
  casesCard: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: "1.2", minWidth: "300px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", height: "fit-content" },
  cardHeader: { borderBottom: "2px solid #f1f5f9", paddingBottom: "10px", marginBottom: "15px" },
  clientTitle: { margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" },
  profileTable: { display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" },
  tableRow: { display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff" },
  tableLabel: { width: "110px", background: "#f8fafc", padding: "10px 12px", fontSize: "12.5px", fontWeight: "600", color: "#475569", borderLeft: "1px solid #e2e8f0", flexShrink: 0 },
  tableValue: { padding: "10px 12px", fontSize: "13px", color: "#1e293b", flex: 1, wordBreak: "break-word" },
  badge: { fontSize: "11px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" },
  divider: { border: "none", borderTop: "1px dashed #e2e8f0", margin: "20px 0" },
  sectionTitle: { margin: "0 0 15px 0", fontSize: "15px", color: "#1e293b", fontWeight: "600" },
  subSectionTitle: { margin: "0 0 8px 0", fontSize: "13px", color: "#475569", fontWeight: "600", borderRight: "3px solid #2c3e50", paddingRight: "6px" },
  noDataBox: { padding: "30px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", fontSize: "13px" },
  casesList: { display: "flex", flexDirection: "column", gap: "10px" },
  caseItem: { padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#fff", transition: "transform 0.2s, box-shadow 0.2s" },
  caseTitle: { fontSize: "14px", color: "#1e293b", fontWeight: "600" },
  caseSubtitle: { margin: "6px 0 0 0", fontSize: "11.5px", color: "#64748b" },
  arrowIcon: { fontSize: "12px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" },
  financeSection: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", marginTop: "10px" },
  financeTitle: { margin: "0 0 18px 0", fontSize: "16px", color: "#1e293b", fontWeight: "700", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" },
  financeSummaryGrid: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" },
  financeSummaryCard: { flex: 1, minWidth: "200px", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  financeSummaryLabel: { fontSize: "13px", fontWeight: "600" },
  financeSummaryValue: { fontSize: "20px", fontWeight: "bold", fontFamily: "sans-serif" },
  allocCard: { background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "16px" },
  allocTitle: { margin: "0 0 12px 0", fontSize: "14px", color: "#475569", fontWeight: "600" },
  allocRow: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" },
  allocField: { flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "5px" },
  allocLabel: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  allocSelect: { padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff", width: "100%", boxSizing: "border-box" },
  allocInput: { padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", width: "100%", boxSizing: "border-box" },
  financeCard: { background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" },
  financeSubTitle: { margin: "0 0 12px 0", fontSize: "14px", color: "#475569", fontWeight: "600" },
  transList: { display: "flex", flexDirection: "column", gap: "8px" },
  transItem: { padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  transMain: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 },
  transBadge: { fontSize: "11px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px" },
  transDivider: { color: "#cbd5e1" },
  transDesc: { fontSize: "14px", color: "#1e293b", fontWeight: 500 },
  transNotes: { fontSize: "12px", color: "#64748b", fontStyle: "italic" },
  transMeta: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  transCaseLink: { fontSize: "12px", background: "#eff6ff", color: "#2563eb", padding: "3px 8px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", border: "1px solid #bfdbfe" },
  transScopeBadge: { fontSize: "12px", background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "6px", fontWeight: "600" },
  transDate: { fontSize: "12px", color: "#64748b", fontFamily: "monospace", background: "#e2e8f0", padding: "3px 8px", borderRadius: "6px" },
  formBox: { background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", width: "100%" },
  row: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "15px", alignItems: "flex-end" },
  field: { flex: 1, minWidth: "160px", display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  textInput: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", width: "100%", boxSizing: "border-box" },
  selectInput: { padding: "9.5px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#fff", width: "100%", boxSizing: "border-box" },

};