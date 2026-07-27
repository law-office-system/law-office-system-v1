import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { CASE_STATUS } from "../constants/caseStatus";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

const TABS_ORDER = ["case", "parties", "sessions", "subject"];

export default function AddCase() {
  const { userData } = useAuth();

  const [tab, setTab] = useState("case");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    caseSerial: "",
    caseYear: "",
    caseType: "",
    court: "",
    department: "",
    litigationDegree: "ابتدائي",
    stage: "",
    secretary: "",
    status: CASE_STATUS.ACTIVE,
    caseSubject: "", 
    clients: [], // ستصبح مصفوفة من الكائنات تحتوي على المعرف والصفة القانونية
    opponents: [],
    sessions: [],
  });

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  const isBlocked = userData?.officeStatus === "suspended";

  // ================= LOAD CLIENTS =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const fetchClients = async () => {
      try {
        const q = query(
          collection(db, "clientProfiles"),
          where("officeId", "==", userData.officeId)
        );
        const snap = await getDocs(q);
        setClients(
          snap.docs.map((d) => ({
            id: d.id,
            fullName: d.data().fullName || "",
            nationalId: d.data().nationalId || "",
          }))
        );
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    fetchClients();
  }, [userData]);

  if (!userData) {
    return <p style={{ padding: 20 }}>جاري التحميل...</p>;
  }

  // ================= FORM HANDLERS =================
  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  // ================= NAVIGATION HANDLERS =================
  const handleNext = () => {
    if (tab === "case" && (!form.caseSerial || !form.caseYear || !form.court)) {
      alert("⚠️ يرجى ملء البيانات الأساسية أولاً (الرقم، السنة، المحكمة) قبل الانتقال.");
      return;
    }
    const currentIndex = TABS_ORDER.indexOf(tab);
    if (currentIndex < TABS_ORDER.length - 1) {
      setTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(tab);
    if (currentIndex > 0) {
      setTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  // ================= CLIENTS MANAGEMENT =================
  const addClient = (id) => {
    setForm((p) => {
      const exists = p.clients.some((c) => c.id === id);
      if (exists) return p;
      // ندرج الموكل مع صفة افتراضية "مدعي" قابلة للتعديل
      return {
        ...p,
        clients: [...p.clients, { id, clientRole: "مدعي" }],
      };
    });
  };

  const updateClientRole = (id, roleValue) => {
    setForm((p) => ({
      ...p,
      clients: p.clients.map((c) =>
        c.id === id ? { ...c, clientRole: roleValue } : c
      ),
    }));
  };

  const removeClient = (id) => {
    setForm((p) => ({
      ...p,
      clients: p.clients.filter((c) => c.id !== id),
    }));
  };

  // ================= OPPONENTS MANAGEMENT =================
  const addOpponent = () => {
    setForm((p) => ({
      ...p,
      opponents: [...p.opponents, { id: Date.now(), name: "", caseRole: "مدعى عليه", address: "" }],
    }));
  };

  const updateOpponent = (id, field, value) => {
    setForm((p) => ({
      ...p,
      opponents: p.opponents.map((o) =>
        o.id === id ? { ...o, [field]: value } : o
      ),
    }));
  };

  const removeOpponent = (id) => {
    setForm((p) => ({
      ...p,
      opponents: p.opponents.filter((o) => o.id !== id),
    }));
  };

  // ================= SESSIONS MANAGEMENT =================
  const addSession = () => {
    setForm((p) => ({
      ...p,
      sessions: [
        ...p.sessions,
        {
          id: Date.now(),
          nextSessionDate: "",
          decision: "",        
          notes: "",           
        },
      ],
    }));
  };

  const updateSession = (id, field, value) => {
    setForm((p) => ({
      ...p,
      sessions: p.sessions.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeSession = (id) => {
    setForm((p) => ({
      ...p,
      sessions: p.sessions.filter((s) => s.id !== id),
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (isBlocked) {
      alert("🚫 لا يمكن الحفظ، هذا المكتب موقوف حالياً.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "cases"), {
        ...form,
        officeId: userData.officeId,
        createdBy: userData.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("✔ تم حفظ القضية بنجاح بنظام المكتب وتوزيعها بالأجندة");

      setForm({
        caseSerial: "",
        caseYear: "",
        caseType: "",
        court: "",
        department: "",
        litigationDegree: "ابتدائي",
        stage: "",
        secretary: "",
        status: CASE_STATUS.ACTIVE,
        caseSubject: "", 
        clients: [],
        opponents: [],
        sessions: [],
      });
      setTab("case");
      setSearch("");
    } catch (error) {
      console.error("Error adding case:", error);
      alert("❌ حدث خطأ أثناء الحفظ، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients =
    search.length < 1
      ? []
      : clients.filter((c) =>
          `${c.fullName} ${c.nationalId}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );

  return (
    <div style={styles.page}>
      <h2>➕ إضافة قضية جديدة</h2>

      {isBlocked && <div style={styles.blocked}>🚫 هذا المكتب موقوف</div>}

      <div style={styles.tabs}>
        <div style={tab === "case" ? styles.activeTab : styles.tab}>⚖️ 1. بيانات القضية</div>
        <div style={tab === "parties" ? styles.activeTab : styles.tab}>👥 2. الأطراف والخصوم</div>
        <div style={tab === "sessions" ? styles.activeTab : styles.tab}>📅 3. أجندة الجلسات</div>
        <div style={tab === "subject" ? styles.activeTab : styles.tab}>📝 4. موضوع الدعوى</div>
      </div>

      {/* CASE DETAILS TAB */}
      {tab === "case" && (
        <div style={styles.section}>
          <div style={styles.formGroup}>
            <input style={styles.input} name="caseSerial" placeholder="رقم القضية *" onChange={handleChange} value={form.caseSerial} />
            <input style={styles.input} name="caseYear" placeholder="السنة *" onChange={handleChange} value={form.caseYear} />
          </div>
          
          <div style={styles.formGroup}>
            <input style={styles.input} name="caseType" placeholder="نوع الدعوى" onChange={handleChange} value={form.caseType} />
            <input style={styles.input} name="court" placeholder="المحكمة *" onChange={handleChange} value={form.court} />
          </div>

          <div style={styles.formGroup}>
            <input style={styles.input} name="department" placeholder="الدائرة" onChange={handleChange} value={form.department} />
            <input style={styles.input} name="secretary" placeholder="اسم السكرتير" onChange={handleChange} value={form.secretary} />
          </div>

          <div style={styles.formGroup}>
            <select style={styles.input} name="litigationDegree" onChange={handleChange} value={form.litigationDegree}>
              <option value="جزئي">جزئي</option>
              <option value="ابتدائي">ابتدائي</option>
              <option value="استئناف">استئناف</option>
              <option value="نقض">نقض</option>
            </select>
            <input style={styles.input} name="stage" placeholder="مرحلة القضية الحالية" onChange={handleChange} value={form.stage} />
          </div>
        </div>
      )}

      {/* PARTIES TAB */}
      {tab === "parties" && (
        <div style={styles.section}>
          <h3 style={styles.subTitle}>👤 الموكلون وصفاتهم القانونية</h3>
          <input
            placeholder="ابحث عن الموكل بالاسم أو الرقم القومي لإضافته..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.inputFull}
          />

          {filteredClients.length > 0 && (
            <div style={styles.searchResults}>
              {filteredClients.map((c) => {
                const isAdded = form.clients.some((x) => x.id === c.id);
                return (
                  <div key={c.id} style={styles.searchRow}>
                    <span>{c.fullName} ({c.nationalId})</span>
                    <button 
                      style={isAdded ? styles.disabledBtn : styles.addBtn} 
                      disabled={isAdded} 
                      onClick={() => addClient(c.id)}
                    >
                      {isAdded ? "✔ مضاف" : "إضافة للدعوى"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <h4 style={{marginTop: 15}}>الموكلون المختارون في الدعوى الحالية:</h4>
          {form.clients.length === 0 ? <p style={{color: '#666', fontSize: 14}}>لم يتم اختيار موكلين بعد.</p> : (
            form.clients.map((selectedClient) => {
              const c = clients.find((x) => x.id === selectedClient.id);
              return (
                <div key={selectedClient.id} style={styles.selectedPartyCard}>
                  <div style={{display:'flex', gap: 15, alignItems:'center', flex: 1, flexWrap:'wrap'}}>
                    <span style={{fontWeight:'600'}}>⚖️ {c?.fullName}</span>
                    <label style={{fontSize: 13, display:'flex', alignItems:'center', gap: 5}}>
                      الصفة القانونية:
                      <select 
                        style={styles.selectSmall} 
                        value={selectedClient.clientRole} 
                        onChange={(e) => updateClientRole(selectedClient.id, e.target.value)}
                      >
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
                    </label>
                  </div>
                  <button style={styles.deleteLink} onClick={() => removeClient(selectedClient.id)}>إلغاء الربط</button>
                </div>
              );
            })
          )}

          <hr style={styles.hr} />

          <h3 style={styles.subTitle}>⚔️ الخصوم (بيانات الطرف الآخر وعناوينهم)</h3>
          <button style={styles.secondaryBtn} onClick={addOpponent}>➕ إضافة خصم جديد</button>

          {form.opponents.map((o, idx) => (
            <div key={o.id} style={styles.opponentCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <strong>الخصم #{idx + 1}</strong>
                <button style={styles.dangerLink} onClick={() => removeOpponent(o.id)}>حذف الخصم</button>
              </div>
              <div style={styles.formGroup}>
                <input
                  style={styles.input}
                  placeholder="اسم الخصم بالكامل"
                  value={o.name}
                  onChange={(e) => updateOpponent(o.id, "name", e.target.value)}
                />
                <select 
                  style={styles.input} 
                  value={o.caseRole} 
                  onChange={(e) => updateOpponent(o.id, "caseRole", e.target.value)}
                >
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
              <div style={{width: '100%'}}>
                <input
                  style={styles.inputFull}
                  placeholder="محل إقامته / موطنه المختار لإرسال الإعلانات والتكليفات *"
                  value={o.address}
                  onChange={(e) => updateOpponent(o.id, "address", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SESSIONS TAB */}
      {tab === "sessions" && (
        <div style={styles.section}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={styles.subTitle}>📅 جدولة جلسات القضية</h3>
            <button style={styles.secondaryBtn} onClick={addSession}>➕ إضافة جلسة جديدة</button>
          </div>

          <div style={styles.sessionsBox}>
            {form.sessions.length === 0 ? <p style={{textAlign:'center', color:'#999', padding:20}}>لا توجد جلسات مضافة بعد لهذه القضية.</p> : (
              form.sessions.map((s, idx) => (
                <div key={s.id} style={styles.card}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <strong>جلسة مرتقبة #{idx + 1}</strong>
                    <button style={styles.dangerLink} onClick={() => removeSession(s.id)}>حذف الجلسة</button>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>تاريخ الجلسة المقبلة:
                      <input style={styles.inputDate} type="date" value={s.nextSessionDate} onChange={(e) => updateSession(s.id, "nextSessionDate", e.target.value)} />
                    </label>
                  </div>

                  <input style={styles.input} placeholder="قرار المحكمة أو الإجراء المطلوب في هذه الجلسة" value={s.decision} onChange={(e) => updateSession(s.id, "decision", e.target.value)} />
                  <textarea style={styles.textareaSmall} placeholder="ملحوظات حول الجلسة..." value={s.notes} onChange={(e) => updateSession(s.id, "notes", e.target.value)} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CASE SUBJECT TAB */}
      {tab === "subject" && (
        <div style={styles.section}>
          <h3 style={styles.subTitle}>📝 موضوع الدعوى (ملخص وقائع العريضة والطلبات)</h3>
          <textarea 
            style={styles.textareaMain} 
            name="caseSubject" 
            placeholder="اكتب هنا تفاصيل ووقائع الدعوى أو ملخص لما تم في صحيفة الدعوى لتسهيل مراجعته من أي مستخدم للمكتب..." 
            value={form.caseSubject} 
            onChange={handleChange} 
          />
        </div>
      )}

      {/* شريط الإجراءات الثابت السفلي */}
      <div style={styles.actionBar}>
        {tab !== "case" && (
          <button onClick={handlePrev} style={styles.prevBtn}>
            ⬅ السابق
          </button>
        )}

        {tab !== "subject" ? (
          <button onClick={handleNext} style={styles.nextBtn}>
            التالي ➡
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading || isBlocked} style={styles.saveBtn}>
            {loading ? "جاري حفظ الملف..." : "💾 حفظ القضية وإدراجها بالنظام"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "20px 20px 80px 20px", direction: "rtl", fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif" },
  tabs: { display: "flex", gap: 8, marginBottom: 20, borderBottom: "2px solid #eee", paddingBottom: 10 },
  tab: { padding: "10px 15px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 6, color: "#666" },
  activeTab: { padding: "10px 15px", background: "#eef6ff", color: "#007bff", border: "1px solid #007bff", borderRadius: 6, fontWeight: "bold" },
  section: { display: "flex", flexDirection: "column", gap: 15, background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  formGroup: { display: "flex", gap: 15, flexWrap: "wrap", width: "100%" },
  row: { display: "flex", gap: 10, alignItems: "center", width: "100%" },
  subTitle: { margin: "0 0 10px 0", color: "#333" },
  label: { display: "flex", flexDirection: "column", gap: 5, fontSize: 13, flex: 1 },
  input: { padding: 10, border: "1px solid #ccc", borderRadius: 4, flex: 1, minWidth: "200px" },
  selectSmall: { padding: 6, border: "1px solid #ccc", borderRadius: 4, background: "#fff" },
  inputDate: { padding: 8, border: "1px solid #ccc", borderRadius: 4, width: "100%" },
  inputFull: { padding: 10, border: "1px solid #ccc", borderRadius: 4, width: "100%", boxSizing: "border-box" },
  textareaSmall: { padding: 10, border: "1px solid #ccc", borderRadius: 4, minHeight: 60, fontFamily: 'inherit' },
  textareaMain: { padding: 15, border: "1px solid #ccc", borderRadius: 4, minHeight: 150, fontFamily: 'inherit' },
  searchResults: { border: "1px solid #ddd", borderRadius: 4, background: "#fafafa", padding: 10, maxHeight: 150, overflowY: "auto" },
  searchRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #eee" },
  selectedPartyCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eef6ff", padding: "10px 15px", borderRadius: 6, marginBottom: 5, border: "1px solid #cfe2ff" },
  opponentCard: { border: "1px solid #f8d7da", padding: 15, borderRadius: 6, display: "flex", flexDirection: "column", gap: 10, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  addBtn: { background: "#28a745", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer" },
  disabledBtn: { background: "#ccc", color: "#666", border: "none", padding: "4px 10px", borderRadius: 4 },
  secondaryBtn: { background: "#6c757d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 4, cursor: "pointer", width: "fit-content" },
  dangerBtn: { background: "#dc3545", color: "#fff", border: "none", padding: "10px", borderRadius: 4, cursor: "pointer" },
  deleteLink: { background: "none", border: "none", color: "red", cursor: "pointer", textDecoration: "underline" },
  dangerLink: { background: "none", border: "none", color: "#dc3545", cursor: "pointer", fontWeight: "bold" },
  hr: { border: "0", borderTop: "1px solid #eee", margin: "20px 0" },
  blocked: { background: "#ffe5e5", color: "red", padding: 12, marginBottom: 15, borderRadius: 4, fontWeight: "bold", border: "1px solid #ffa3a3" },
  sessionsBox: { maxHeight: 400, overflowY: "auto", border: "1px solid #ddd", padding: 15, borderRadius: 8, background: "#fcfcfc" },
  card: { border: "1px solid #e0e0e0", padding: 15, marginBottom: 15, borderRadius: 6, display: "flex", flexDirection: "column", gap: 10, background: "#fff" },
  actionBar: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #ddd", padding: "12px 20px", display: "flex", justifyContent: "space-between", boxShadow: "0 -2px 10px rgba(0,0,0,0.05)", direction: "rtl" },
  nextBtn: { padding: "10px 20px", background: "#007bff", color: "#fff", border: "none", borderRadius: 5, fontSize: 15, fontWeight: "bold", cursor: "pointer", marginRight: "auto" },
  prevBtn: { padding: "10px 20px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 5, fontSize: 15, fontWeight: "bold", cursor: "pointer" },
  saveBtn: { padding: "12px 24px", background: "#28a745", color: "#fff", border: "none", borderRadius: 5, fontSize: 16, fontWeight: "bold", cursor: "pointer", marginRight: "auto" },
};