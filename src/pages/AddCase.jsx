import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, query, where,
  serverTimestamp, setDoc, doc, updateDoc, Timestamp,
} from "firebase/firestore";
import { CASE_STATUS, CASE_TYPE_LIST } from "../constants/caseStatus";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { Button, Input, Card, Section } from "../components/ui";
import {
  colors, spacing, radius, shadows, transitions, typography,
  card as cardStyle, button as btnStyle, input as inputStyle,
  infoBox, iconBox, sectionTitle, page,
} from "../styles/design-system";
import { Landmark, Users, Calendar, FileText, ChevronRight, ChevronDown, Plus, Trash2, X } from "lucide-react";

const TABS = [
  { key: "case", label: "بيانات القضية", icon: Landmark },
  { key: "parties", label: "الأطراف", icon: Users },
  { key: "sessions", label: "الجلسات", icon: Calendar },
  { key: "subject", label: "موضوع الدعوى", icon: FileText },
];

const LITIGATION_DEGREES = [
  { value: "first_instance", label: "⚖️ أول درجة — ابتدائي", order: 1 },
  { value: "partial",        label: "⚖️ أول درجة — جزئي",   order: 1 },
  { value: "appeal",         label: "🏛️ استئناف",            order: 2 },
  { value: "cassation",      label: "⚡ نقض",                order: 3 },
  { value: "retrial",        label: "🔄 التماس إعادة نظر",    order: 4 },
  { value: "execution",      label: "🔨 تنفيذ",              order: 5 },
];

const PREVIOUS_LEVEL_TYPES = [
  { value: "first_instance", label: "⚖️ أول درجة — ابتدائي" },
  { value: "partial",        label: "⚖️ أول درجة — جزئي" },
  { value: "appeal",         label: "🏛️ استئناف" },
  { value: "cassation",      label: "⚡ نقض" },
  { value: "retrial",        label: "🔄 التماس إعادة نظر" },
];

function generatePreviousLevels(currentDegreeValue) {
  const current = LITIGATION_DEGREES.find(d => d.value === currentDegreeValue);
  if (!current || current.order <= 1) return [];
  const lowerLevels = LITIGATION_DEGREES
    .filter(d => d.order < current.order)
    .reduce((acc, d) => {
      if (!acc.find(item => item.order === d.order)) acc.push(d);
      return acc;
    }, []);
  return lowerLevels.map(d => ({
    id: crypto.randomUUID(),
    levelType: d.value,
    court: "", caseNumber: "", caseYear: "", circuit: "",
    judgmentDate: "", judgmentResult: "",
  }));
}

export default function AddCase() {
  const { userData } = useAuth();
  const [tab, setTab] = useState("case");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [showInlineClientForm, setShowInlineClientForm] = useState(false);
  const [inlineClientLoading, setInlineClientLoading] = useState(false);

  const [form, setForm] = useState({
    caseName: "", caseType: "", caseSubject: "",
    litigationDegree: "first_instance", status: CASE_STATUS.ACTIVE,
    secretary: "", clients: [], opponents: [], sessions: [],
    currentLevel: { court: "", caseNumber: "", caseYear: "", circuit: "", filingDate: "" },
    previousLevels: [],
  });

  const [inlineClientForm, setInlineClientForm] = useState({
    fullName: "", nationalId: "", address: "", phone1: "", phone2: "",
    powerType: "رسمي عام قضايا", customPowerType: "", powerNumber: "",
    powerLetter: "", powerYear: "", powerOffice: "",
  });

  const isBlocked = userData?.officeStatus === "suspended";
  const isAdvancedLevel = ["appeal", "cassation", "retrial", "execution"].includes(form.litigationDegree);
  const currentOrder = LITIGATION_DEGREES.find(d => d.value === form.litigationDegree)?.order || 1;

  // ✅ المراحل السابقة تُضاف يدوياً فقط — لا توليد تلقائي

  // Load clients
  useEffect(() => {
    if (!userData?.officeId) return;
    getDocs(query(collection(db, "clientProfiles"), where("officeId", "==", userData.officeId)))
      .then(snap => setClients(snap.docs.map(d => ({ id: d.id, fullName: d.data().fullName || "", nationalId: d.data().nationalId || "" }))))
      .catch(console.error);
  }, [userData]);

  if (!userData) return <p style={{ padding: 20 }}>جاري التحميل...</p>;

  // ─── Handlers ───
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleCurrentLevelChange = e => setForm(p => ({ ...p, currentLevel: { ...p.currentLevel, [e.target.name]: e.target.value } }));

  const addPreviousLevel = () => {
    const usedOrders = form.previousLevels.map(l => LITIGATION_DEGREES.find(d => d.value === l.levelType)?.order || 1);
    const available = LITIGATION_DEGREES.filter(d => d.order < currentOrder && !usedOrders.includes(d.order)).sort((a, b) => a.order - b.order);
    if (available.length === 0) {
      alert("لا يمكن إضافة المزيد من الدرجات السابقة لهذه القضية.");
      return;
    }
    const defaultType = available[0]?.value || "first_instance";
    setForm(p => ({ ...p, previousLevels: [...p.previousLevels, { id: crypto.randomUUID(), levelType: defaultType, court: "", caseNumber: "", caseYear: "", circuit: "", judgmentDate: "", judgmentResult: "" }] }));
  };
  const removePreviousLevel = i => setForm(p => ({ ...p, previousLevels: p.previousLevels.filter((_, idx) => idx !== i) }));
  const updatePreviousLevel = (i, field, value) => setForm(p => ({ ...p, previousLevels: p.previousLevels.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const addClient = id => setForm(p => p.clients.some(c => c.id === id) ? p : { ...p, clients: [...p.clients, { id, clientRole: "مدعي" }] });
  const updateClientRole = (id, role) => setForm(p => ({ ...p, clients: p.clients.map(c => c.id === id ? { ...c, clientRole: role } : c) }));
  const removeClient = id => setForm(p => ({ ...p, clients: p.clients.filter(c => c.id !== id) }));

  const addOpponent = () => setForm(p => ({ ...p, opponents: [...p.opponents, { id: Date.now(), name: "", caseRole: "مدعى عليه", address: "" }] }));
  const updateOpponent = (id, field, value) => setForm(p => ({ ...p, opponents: p.opponents.map(o => o.id === id ? { ...o, [field]: value } : o) }));
  const removeOpponent = id => setForm(p => ({ ...p, opponents: p.opponents.filter(o => o.id !== id) }));

  const addSession = () => setForm(p => ({ ...p, sessions: [...p.sessions, { id: Date.now(), nextSessionDate: "", decision: "", notes: "", levelId: "current" }] }));
  const updateSession = (id, field, value) => setForm(p => ({ ...p, sessions: p.sessions.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  const removeSession = id => setForm(p => ({ ...p, sessions: p.sessions.filter(s => s.id !== id) }));

  const handleInlineClientChange = e => setInlineClientForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSaveInlineClient = async e => {
    e.preventDefault();
    if (!userData?.officeId) return alert("لا يوجد مكتب مرتبط.");
    if (!inlineClientForm.fullName.trim()) return alert("يرجى إدخال الاسم.");
    const finalPowerType = inlineClientForm.powerType === "other" ? inlineClientForm.customPowerType.trim() : inlineClientForm.powerType;
    try {
      setInlineClientLoading(true);
      const clientId = crypto.randomUUID();
      await setDoc(doc(db, "clientProfiles", clientId), {
        uid: clientId, fullName: inlineClientForm.fullName.trim(), nationalId: inlineClientForm.nationalId.trim(),
        address: inlineClientForm.address.trim(), phone1: inlineClientForm.phone1.trim(), phone2: inlineClientForm.phone2.trim(),
        powerOfAttorney: { type: finalPowerType || "غير محدد", number: inlineClientForm.powerNumber.trim(), letter: inlineClientForm.powerLetter.trim(), year: inlineClientForm.powerYear.trim(), office: inlineClientForm.powerOffice.trim() },
        officeId: userData.officeId, createdAt: serverTimestamp(), createdBy: userData?.uid || null,
      });
      setClients(p => [...p, { id: clientId, fullName: inlineClientForm.fullName.trim(), nationalId: inlineClientForm.nationalId.trim() }]);
      setForm(p => ({ ...p, clients: [...p.clients, { id: clientId, clientRole: "مدعي" }] }));
      setInlineClientForm({ fullName: "", nationalId: "", address: "", phone1: "", phone2: "", powerType: "رسمي عام قضايا", customPowerType: "", powerNumber: "", powerLetter: "", powerYear: "", powerOffice: "" });
      setShowInlineClientForm(false); setSearch("");
      alert("✔ تم حفظ الموكل وإضافته للقضية.");
    } catch (err) { alert("❌ " + err.message); }
    finally { setInlineClientLoading(false); }
  };

  const handleNext = () => {
    if (tab === "case" && (!form.currentLevel.caseNumber || !form.currentLevel.caseYear || !form.currentLevel.court)) {
      alert("⚠️ يرجى ملء بيانات المرحلة الحالية قبل الانتقال.");
      return;
    }
    const idx = TABS.findIndex(t => t.key === tab);
    if (idx < TABS.length - 1) setTab(TABS[idx + 1].key);
  };
  const handlePrev = () => {
    const idx = TABS.findIndex(t => t.key === tab);
    if (idx > 0) setTab(TABS[idx - 1].key);
  };

  const handleSubmit = async () => {
    if (isBlocked) return alert("🚫 لا يمكن الحفظ، هذا المكتب موقوف.");
    setLoading(true);
    try {
      const curr = form.currentLevel;
      const caseDocRef = await addDoc(collection(db, "cases"), {
        caseName: form.caseName, caseType: form.caseType, caseSubject: form.caseSubject,
        status: form.status, secretary: form.secretary,
        clients: form.clients, opponents: form.opponents, sessions: form.sessions,
        officeId: userData.officeId, createdBy: userData.uid,
        currentLevel: form.litigationDegree, currentStatus: "new", activeLevelId: null,
        totalSessions: 0, totalExpenses: 0,
        caseNumber: curr.caseNumber || "", caseYear: curr.caseYear || "",
        court: curr.court || "", circuit: curr.circuit || "", caseSerial: curr.caseNumber || "",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });

      let order = 1;
      const prevLevelRefs = [];
      // ✅ إنشاء المراحل السابقة اللي المستخدم ضافها يدوياً فقط
      if (form.previousLevels.length > 0) {
        const sorted = [...form.previousLevels].sort((a, b) => {
          const oa = LITIGATION_DEGREES.find(d => d.value === a.levelType)?.order || 1;
          const ob = LITIGATION_DEGREES.find(d => d.value === b.levelType)?.order || 1;
          return oa - ob;
        });
        for (const prev of sorted) {
          if (prev.court && prev.caseNumber) {
            const ref = await addDoc(collection(db, "litigation_levels"), {
              caseId: caseDocRef.id, levelType: prev.levelType || "first_instance",
              court: prev.court, circuit: prev.circuit || "", caseNumber: prev.caseNumber,
              caseYear: parseInt(prev.caseYear) || new Date().getFullYear(),
              status: "closed", isActive: false, isCompleted: true, order,
              sessionCount: 0, filingDate: null,
              judgmentDate: prev.judgmentDate ? Timestamp.fromDate(new Date(prev.judgmentDate)) : null,
              judgmentResult: prev.judgmentResult || null,
              completionDate: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            });
            prevLevelRefs.push({ id: ref.id, formId: prev.id });
            order++;
          }
        }
      }

      const currentRef = await addDoc(collection(db, "litigation_levels"), {
        caseId: caseDocRef.id, levelType: form.litigationDegree,
        court: curr.court, circuit: curr.circuit || "", caseNumber: curr.caseNumber,
        caseYear: parseInt(curr.caseYear) || new Date().getFullYear(),
        status: "new", isActive: true, isCompleted: false, order,
        sessionCount: 0, filingDate: curr.filingDate ? Timestamp.fromDate(new Date(curr.filingDate)) : null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });

      // Build map: form level.id → Firestore doc id
      const levelIdMap = { "current": currentRef.id };
      prevLevelRefs.forEach(ref => {
        levelIdMap[ref.formId] = ref.id;
      });

      const sessionsWithLevelId = form.sessions.map(s => {
        // s.levelId is either "current" or the form level's UUID
        const assignedLevelId = levelIdMap[s.levelId] || currentRef.id;
        return { ...s, levelId: assignedLevelId, caseId: caseDocRef.id, createdAt: new Date().toISOString() };
      });

      await updateDoc(doc(db, "cases", caseDocRef.id), {
        activeLevelId: currentRef.id, sessions: sessionsWithLevelId,
      });

      alert("✔ تم حفظ القضية ودرجات التقاضي بنجاح");
      setForm({ caseName: "", caseType: "", caseSubject: "", litigationDegree: "first_instance", status: CASE_STATUS.ACTIVE, secretary: "", clients: [], opponents: [], sessions: [], currentLevel: { court: "", caseNumber: "", caseYear: "", circuit: "", filingDate: "" }, previousLevels: [] });
      setTab("case"); setSearch("");
    } catch (err) { alert("❌ " + err.message); }
    finally { setLoading(false); }
  };

  const filteredClients = search.length < 1 ? [] : clients.filter(c => `${c.fullName} ${c.nationalId}`.toLowerCase().includes(search.toLowerCase()));

  // ─── Render ───
  return (
    <div style={{ ...page, paddingBottom: 80 }}>
      <h2 style={{ ...sectionTitle, marginBottom: spacing.lg }}>➕ إضافة قضية جديدة</h2>
      {isBlocked && <div style={styles.blocked}>🚫 هذا المكتب موقوف</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(t => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              ...styles.tab,
              ...(active ? styles.activeTab : {}),
            }}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* CASE TAB */}
      {tab === "case" && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
            <div style={{ position: "relative" }}>
              <select 
                name="caseType" 
                value={form.caseType} 
                onChange={handleChange} 
                style={{ 
                  ...inputStyle, 
                  padding: `${spacing.md} ${spacing.lg}`,
                  paddingLeft: 44,
                  appearance: "none",
                  WebkitAppearance: "none",
                  background: colors.bg.card,
                  border: `1px solid ${colors.accent.blue.main}40`,
                  color: colors.accent.blue.light,
                  fontWeight: typography.weight.semibold,
                  fontSize: typography.sizes.md,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <option value="" style={{ background: colors.bg.card, color: colors.text.muted }}>اختر نوع الدعوى...</option>
                {CASE_TYPE_LIST.map(t => (
                  <option key={t.value} value={t.value} style={{ background: colors.bg.card, color: colors.text.primary }}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
              <FileText 
                size={20} 
                color={colors.accent.blue.light} 
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
              />
              <ChevronDown 
                size={18} 
                color={colors.accent.blue.light} 
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
              />
            </div>
            <div style={{ position: "relative" }}>
              <select 
                name="litigationDegree" 
                value={form.litigationDegree} 
                onChange={handleChange} 
                style={{ 
                  ...inputStyle, 
                  padding: `${spacing.md} ${spacing.lg}`,
                  paddingLeft: 44,
                  appearance: "none",
                  WebkitAppearance: "none",
                  background: colors.bg.card,
                  border: `1px solid ${colors.accent.amber.main}40`,
                  color: colors.accent.amber.light,
                  fontWeight: typography.weight.semibold,
                  fontSize: typography.sizes.md,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {LITIGATION_DEGREES.map(d => (
                  <option key={d.value} value={d.value} style={{ background: colors.bg.card, color: colors.text.primary }}>
                    {d.label}
                  </option>
                ))}
              </select>
              <Landmark 
                size={20} 
                color={colors.accent.amber.light} 
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
              />
              <ChevronDown 
                size={18} 
                color={colors.accent.amber.light} 
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
              />
            </div>
          </div>

          {/* Current Level */}
          <Card variant="elevated" style={{ borderColor: colors.accent.blue.main }}>
            <h4 style={{ margin: `0 0 ${spacing.lg} 0`, color: colors.accent.blue.light, fontSize: typography.sizes.md }}>
              <Landmark size={18} style={{ marginLeft: 8 }} />
              {LITIGATION_DEGREES.find(d => d.value === form.litigationDegree)?.label} — الدرجة الحالية
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
              <Input name="caseNumber" placeholder="رقم القضية *" value={form.currentLevel.caseNumber} onChange={handleCurrentLevelChange} />
              <Input name="caseYear" placeholder="السنة *" value={form.currentLevel.caseYear} onChange={handleCurrentLevelChange} />
              <Input name="court" placeholder="المحكمة *" value={form.currentLevel.court} onChange={handleCurrentLevelChange} />
              <Input name="circuit" placeholder="الدائرة / الشعبة" value={form.currentLevel.circuit} onChange={handleCurrentLevelChange} />
            </div>
            <div style={{ marginTop: spacing.lg }}>
              <Input type="date" name="filingDate" label="تاريخ الرفع" value={form.currentLevel.filingDate} onChange={handleCurrentLevelChange} />
            </div>
          </Card>

          {/* Previous Levels */}
          {isAdvancedLevel && (
            <Card variant="elevated" style={{ borderColor: colors.accent.amber.main, background: `${colors.accent.amber.main}08` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
                <h4 style={{ margin: 0, color: colors.accent.amber.light, fontSize: typography.sizes.md }}>
                  ⏮️ درجات التقاضي السابقة
                </h4>
                <Button variant="primary" size="sm" color={colors.accent.amber.main} onClick={addPreviousLevel} icon={Plus}>
                  إضافة درجة
                </Button>
              </div>

              {form.previousLevels.length === 0 && (
                <p style={{ color: colors.text.muted, fontSize: typography.sizes.sm }}>
                  لا توجد درجات سابقة. اضغط "إضافة درجة" لإضافة مراحل تقاضي سابقة.
                </p>
              )}

              {form.previousLevels.map((level, idx) => {
                const meta = LITIGATION_DEGREES.find(d => d.value === level.levelType);
                return (
                  <div key={level.id} style={{ ...cardStyle, marginBottom: spacing.md, border: `1px solid ${colors.accent.amber.main}30` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                      <span style={{ fontWeight: typography.weight.bold, color: colors.accent.amber.light, fontSize: typography.sizes.sm }}>
                        📌 الدرجة #{idx + 1}: {meta?.label || level.levelType}
                      </span>
                      <Button variant="ghost" size="sm" color={colors.accent.red.main} onClick={() => removePreviousLevel(idx)} icon={Trash2}>
                        حذف
                      </Button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
                      <select value={level.levelType} onChange={e => updatePreviousLevel(idx, "levelType", e.target.value)} style={{ ...inputStyle, padding: spacing.md }}>
                        {PREVIOUS_LEVEL_TYPES.filter(t => (LITIGATION_DEGREES.find(d => d.value === t.value)?.order || 1) < currentOrder).map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <Input placeholder="المحكمة *" value={level.court} onChange={e => updatePreviousLevel(idx, "court", e.target.value)} />
                      <Input placeholder="رقم القضية *" value={level.caseNumber} onChange={e => updatePreviousLevel(idx, "caseNumber", e.target.value)} />
                      <Input placeholder="السنة" value={level.caseYear} onChange={e => updatePreviousLevel(idx, "caseYear", e.target.value)} />
                      <Input placeholder="الدائرة" value={level.circuit} onChange={e => updatePreviousLevel(idx, "circuit", e.target.value)} />
                      <Input type="date" label="تاريخ الحكم" value={level.judgmentDate} onChange={e => updatePreviousLevel(idx, "judgmentDate", e.target.value)} />
                    </div>
                    <div style={{ marginTop: spacing.md }}>
                      <select value={level.judgmentResult} onChange={e => updatePreviousLevel(idx, "judgmentResult", e.target.value)} style={{ ...inputStyle, padding: spacing.md }}>
                        <option value="">نتيجة الحكم...</option>
                        <option value="accepted">قبول (لصالح الموكل)</option>
                        <option value="rejected">رفض (ضد الموكل)</option>
                        <option value="partially_accepted">قبول جزئي</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          <Input name="secretary" placeholder="اسم السكرتير" value={form.secretary} onChange={handleChange} />
        </div>
      )}

      {/* PARTIES TAB */}
      {tab === "parties" && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <Section title="الموكلون" icon={Users} iconColor={colors.accent.green.light} defaultOpen={true}>
            <Input placeholder="ابحث بالاسم أو الرقم القومي..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: spacing.md }} />

            {filteredClients.length > 0 && (
              <div style={{ ...cardStyle, maxHeight: 220, overflowY: "auto", marginBottom: spacing.md }}>
                {filteredClients.map(c => {
                  const added = form.clients.some(x => x.id === c.id);
                  return (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${spacing.sm} 0`, borderBottom: `1px solid ${colors.border.default}` }}>
                      <span style={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
                        {c.fullName || "—"} <span style={{ color: colors.text.muted, fontSize: typography.sizes.xs }}>({c.nationalId || "—"})</span>
                      </span>
                      <Button variant={added ? "ghost" : "success"} size="sm" disabled={added} onClick={() => addClient(c.id)}>
                        {added ? "✔ مضاف" : "إضافة"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {search.length >= 1 && filteredClients.length === 0 && !showInlineClientForm && (
              <div style={{ ...cardStyle, textAlign: "center", padding: spacing.xl, background: `${colors.accent.amber.main}08` }}>
                <p style={{ color: colors.text.muted, marginBottom: spacing.md }}>⚠️ الموكل "{search}" غير موجود</p>
                <Button variant="primary" onClick={() => { setInlineClientForm(p => ({ ...p, fullName: search })); setShowInlineClientForm(true); }}>
                  ➕ إضافة موكل جديد
                </Button>
              </div>
            )}

            {showInlineClientForm && (
              <Card style={{ marginTop: spacing.md, borderColor: colors.accent.blue.main }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
                  <h4 style={{ margin: 0, color: colors.text.primary }}>📝 تأسيس ملف موكل جديد</h4>
                  <Button variant="ghost" size="sm" color={colors.accent.red.main} onClick={() => setShowInlineClientForm(false)} icon={X}>
                    إلغاء
                  </Button>
                </div>
                <form onSubmit={handleSaveInlineClient}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: spacing.lg, marginBottom: spacing.lg }}>
                    <Input name="fullName" label="الاسم الرباعي *" required value={inlineClientForm.fullName} onChange={handleInlineClientChange} />
                    <Input name="nationalId" label="الرقم القومي" maxLength={14} value={inlineClientForm.nationalId} onChange={handleInlineClientChange} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: spacing.lg, marginBottom: spacing.lg }}>
                    <Input name="address" label="العنوان" value={inlineClientForm.address} onChange={handleInlineClientChange} />
                    <Input name="phone1" label="الهاتف 1" value={inlineClientForm.phone1} onChange={handleInlineClientChange} />
                    <Input name="phone2" label="الهاتف 2" value={inlineClientForm.phone2} onChange={handleInlineClientChange} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.5fr", gap: spacing.lg, marginBottom: spacing.lg, alignItems: "end" }}>
                    <div>
                      <label style={{ fontSize: typography.sizes.sm, color: colors.text.muted, marginBottom: spacing.xs, display: "block" }}>نوع التوكيل</label>
                      <select name="powerType" value={inlineClientForm.powerType} onChange={handleInlineClientChange} style={{ ...inputStyle, padding: spacing.md }}>
                        <option value="رسمي عام قضايا">⚖️ رسمي عام قضايا</option>
                        <option value="رسمي عام في القضايا والإدارة">🏢 رسمي عام قضايا وإدارة</option>
                        <option value="توكيل خاص بالمرور">🚗 توكيل خاص (مرور)</option>
                        <option value="توكيل خاص بقضية محددة">📌 توكيل خاص بقضية</option>
                        <option value="رسمي خاص بالبيع والنفس">💰 رسمي خاص (بيع ونفس)</option>
                        <option value="other">✍️ نوع آخر...</option>
                      </select>
                    </div>
                    {inlineClientForm.powerType === "other" && <Input name="customPowerType" label="نوع التوكيل يدوياً *" required value={inlineClientForm.customPowerType} onChange={handleInlineClientChange} />}
                    <Input name="powerNumber" label="رقم التوكيل" value={inlineClientForm.powerNumber} onChange={handleInlineClientChange} />
                    <Input name="powerLetter" label="حرف" value={inlineClientForm.powerLetter} onChange={handleInlineClientChange} />
                    <Input name="powerYear" label="سنة" maxLength={4} value={inlineClientForm.powerYear} onChange={handleInlineClientChange} />
                    <Input name="powerOffice" label="مكتب التوثيق" value={inlineClientForm.powerOffice} onChange={handleInlineClientChange} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" variant="success" disabled={inlineClientLoading}>
                      {inlineClientLoading ? "جاري الحفظ..." : "👤 حفظ الموكل"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div style={{ marginTop: spacing.lg }}>
              {form.clients.length === 0 ? (
                <p style={{ color: colors.text.muted }}>لم يتم اختيار موكلين.</p>
              ) : (
                form.clients.map(sc => {
                  const c = clients.find(x => x.id === sc.id);
                  return (
                    <div key={sc.id} style={{ ...infoBox, marginBottom: spacing.sm, background: colors.accent.blue.bg }}>
                      <div style={iconBox(colors.accent.blue.light)}>⚖️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: typography.weight.bold, color: colors.text.primary }}>{c?.fullName || "—"}</div>
                      </div>
                      <select value={sc.clientRole} onChange={e => updateClientRole(sc.id, e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
                        <option value="مدعي">مدعي</option>
                        <option value="مدعى عليه">مدعى عليه</option>
                        <option value="مستأنف">مستأنف</option>
                        <option value="مستأنف ضده">مستأنف ضده</option>
                        <option value="طاعن">طاعن</option>
                        <option value="مطعون ضده">مطعون ضده</option>
                        <option value="متهم">متهم</option>
                        <option value="مجني عليه">مجني عليه</option>
                        <option value="مدعي بالحق المدني">مدعي بالحق المدني</option>
                        <option value="خصم متدخل">خصم متدخل</option>
                      </select>
                      <Button variant="ghost" size="sm" color={colors.accent.red.main} onClick={() => removeClient(sc.id)} icon={Trash2} />
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          <Section title="الخصوم" icon={Users} iconColor={colors.accent.red.light} defaultOpen={true}>
            <Button variant="secondary" size="sm" onClick={addOpponent} icon={Plus}>إضافة خصم</Button>
            <div style={{ marginTop: spacing.lg, display: "flex", flexDirection: "column", gap: spacing.md }}>
              {form.opponents.map((o, idx) => (
                <Card key={o.id} variant="compact" style={{ borderColor: `${colors.accent.red.main}20` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                    <strong style={{ color: colors.text.primary }}>الخصم #{idx + 1}</strong>
                    <Button variant="ghost" size="sm" color={colors.accent.red.main} onClick={() => removeOpponent(o.id)} icon={Trash2} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg, marginBottom: spacing.md }}>
                    <Input placeholder="اسم الخصم" value={o.name} onChange={e => updateOpponent(o.id, "name", e.target.value)} />
                    <select value={o.caseRole} onChange={e => updateOpponent(o.id, "caseRole", e.target.value)} style={{ ...inputStyle, padding: spacing.md }}>
                      <option value="مدعى عليه">مدعى عليه</option>
                      <option value="مدعي">مدعي</option>
                      <option value="مستأنف ضده">مستأنف ضده</option>
                      <option value="مستأنف">مستأنف</option>
                      <option value="مطعون ضده">مطعون ضده</option>
                      <option value="طاعن">طاعن</option>
                      <option value="متهم">متهم</option>
                      <option value="مجني عليه">مجني عليه</option>
                    </select>
                  </div>
                  <Input placeholder="محل الإقامة / العنوان" value={o.address} onChange={e => updateOpponent(o.id, "address", e.target.value)} />
                </Card>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* SESSIONS TAB */}
      {tab === "sessions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ ...sectionTitle, fontSize: typography.sizes.lg }}>📅 جدولة الجلسات</h3>
            <Button variant="primary" size="sm" onClick={addSession} icon={Plus}>إضافة جلسة</Button>
          </div>

          {form.sessions.length === 0 ? (
            <Card style={{ textAlign: "center", padding: spacing["3xl"], color: colors.text.muted }}>
              لا توجد جلسات مسجلة.
            </Card>
          ) : (
            form.sessions.map((s, idx) => (
              <Card key={s.id} variant="compact">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
                  <strong style={{ color: colors.text.primary }}>جلسة #{idx + 1}</strong>
                  <Button variant="ghost" size="sm" color={colors.accent.red.main} onClick={() => removeSession(s.id)} icon={Trash2} />
                </div>

                <div style={{ marginBottom: spacing.md }}>
                  <label style={{ fontSize: typography.sizes.sm, color: colors.text.muted, display: "block", marginBottom: spacing.xs }}>المرحلة:</label>
                  <select value={s.levelId || "current"} onChange={e => updateSession(s.id, "levelId", e.target.value)} style={{ ...inputStyle, padding: spacing.md, maxWidth: 400 }}>
                    <option value="current">📋 {LITIGATION_DEGREES.find(d => d.value === form.litigationDegree)?.label} (الحالية)</option>
                    {form.previousLevels.map((pl) => {
                      const pm = LITIGATION_DEGREES.find(d => d.value === pl.levelType);
                      return <option key={pl.id} value={pl.id}>⏮️ {pm?.label || pl.levelType} — {pl.court || "غير محدد"}</option>;
                    })}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.lg }}>
                  <Input type="date" label="تاريخ الجلسة" value={s.nextSessionDate} onChange={e => updateSession(s.id, "nextSessionDate", e.target.value)} />
                  <Input placeholder="القرار / الإجراء" value={s.decision} onChange={e => updateSession(s.id, "decision", e.target.value)} />
                </div>
                <div style={{ marginTop: spacing.md }}>
                  <Input as="textarea" placeholder="ملحوظات..." value={s.notes} onChange={e => updateSession(s.id, "notes", e.target.value)} style={{ minHeight: 80 }} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* SUBJECT TAB */}
      {tab === "subject" && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <Input name="caseName" label="عنوان القضية" placeholder="عنوان القضية" value={form.caseName} onChange={handleChange} style={{ fontWeight: typography.weight.bold }} />
          <div>
            <label style={{ fontSize: typography.sizes.sm, color: colors.text.muted, display: "block", marginBottom: spacing.xs }}>موضوع الدعوى</label>
            <textarea
              name="caseSubject"
              placeholder="اكتب تفاصيل ووقائع الدعوى..."
              value={form.caseSubject}
              onChange={handleChange}
              style={{ ...inputStyle, minHeight: 150, resize: "vertical" }}
            />
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div style={styles.actionBar}>
        {tab !== "case" && (
          <Button variant="secondary" onClick={handlePrev}>
            <ChevronRight size={16} /> السابق
          </Button>
        )}
        {tab !== "subject" ? (
          <Button variant="primary" onClick={handleNext} style={{ marginRight: "auto" }}>
            التالي <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
          </Button>
        ) : (
          <Button variant="success" onClick={handleSubmit} disabled={loading || isBlocked} style={{ marginRight: "auto" }}>
            {loading ? "جاري الحفظ..." : "💾 حفظ القضية"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES (مختصرة جداً بفضل Design System)
// ═══════════════════════════════════════════════════════════════
const styles = {
  tabs: {
    display: "flex",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderBottom: `1px solid ${colors.border.default}`,
    paddingBottom: spacing.md,
    flexWrap: "wrap",
  },
  tab: {
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.bg.card,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color: colors.text.muted,
    fontSize: typography.sizes.base,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    transition: transitions.default,
    fontFamily: typography.family,
  },
  activeTab: {
    background: colors.accent.blue.bg,
    color: colors.accent.blue.light,
    border: `1px solid ${colors.accent.blue.main}30`,
    fontWeight: typography.weight.bold,
  },
  blocked: {
    background: colors.accent.red.bg,
    color: colors.accent.red.light,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    fontWeight: typography.weight.bold,
    border: `1px solid ${colors.accent.red.main}30`,
  },
  actionBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: colors.bg.card,
    borderTop: `1px solid ${colors.border.default}`,
    padding: `${spacing.md} ${spacing.lg}`,
    display: "flex",
    justifyContent: "space-between",
    boxShadow: shadows.md,
    direction: "rtl",
    zIndex: 100,
  },
};